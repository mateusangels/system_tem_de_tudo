<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Produto;
use App\Models\Venda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class VendasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Venda::query()
            ->with([
                'cliente:id,nome,telefone,cpf',
                'operador:id,name',
                'itens:id,venda_id,descricao,quantidade,unidade,valor_unitario,valor_total',
            ]);

        if ($from = $request->query('from')) {
            $q->where('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->where('created_at', '<=', $to);
        }
        if ($cliente = $request->query('cliente_id')) {
            $q->where('cliente_id', $cliente);
        }
        if ($operador = $request->query('operador_id')) {
            $q->where('operador_id', $operador);
        }
        if ($metodo = $request->query('metodo_pagamento')) {
            $q->where('metodo_pagamento', $metodo);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        $q->latest('created_at');

        $perPage = (int) ($request->query('per_page') ?: 50);

        return response()->json($q->paginate($perPage));
    }

    public function show(string $id): JsonResponse
    {
        $venda = Venda::with([
            'cliente',
            'operador:id,name',
            'itens.produto:id,descricao,codigo_barras',
        ])->findOrFail($id);

        return response()->json($venda);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cliente_id' => ['nullable', 'uuid', 'exists:clientes,id'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'desconto_total' => ['nullable', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'valor_pago' => ['required', 'numeric', 'min:0'],
            'troco' => ['nullable', 'numeric', 'min:0'],
            'metodo_pagamento' => ['required', 'string', 'max:20'],
            'tipo' => ['nullable', 'string', 'in:normal,pdv,balcao,fiado'],
            'vencimento_fiado' => ['nullable', 'date'],
            // Valor entregue NA HORA quando a venda é fiada (adiantamento).
            // Se preenchido, já entra como pagamento parcial.
            'valor_pago_fiado' => ['nullable', 'numeric', 'min:0'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['nullable', 'uuid'],
            'itens.*.codigo_barras' => ['nullable', 'string', 'max:50'],
            'itens.*.descricao' => ['required', 'string'],
            'itens.*.quantidade' => ['required', 'numeric', 'min:0.001'],
            'itens.*.unidade' => ['nullable', 'string', 'max:10'],
            'itens.*.valor_unitario' => ['required', 'numeric', 'min:0'],
            'itens.*.desconto' => ['nullable', 'numeric', 'min:0'],
            'itens.*.valor_total' => ['required', 'numeric', 'min:0'],
        ]);

        // Venda fiada exige cliente identificado
        if ($data['metodo_pagamento'] === 'fiado' && empty($data['cliente_id'])) {
            return response()->json([
                'message' => 'Venda no fiado precisa de cliente identificado.',
            ], 422);
        }

        // Pagamento em dinheiro tem que cobrir o total (exceto fiado).
        // Pra débito/crédito/PIX, valor_pago = total (sem troco).
        if ($data['metodo_pagamento'] !== 'fiado') {
            $valorPago = (float) $data['valor_pago'];
            $totalVenda = (float) $data['total'];
            if ($valorPago + 0.01 < $totalVenda) {
                $falta = number_format($totalVenda - $valorPago, 2, ',', '.');
                return response()->json([
                    'message' => "Valor recebido insuficiente. Falta R$ {$falta}.",
                ], 422);
            }
        }

        $permitirNegativo = Configuracao::get('permitir_estoque_negativo', '0') === '1';

        try {
            $venda = DB::transaction(function () use ($data, $request, $permitirNegativo) {
                // === VALIDAÇÃO DE ESTOQUE (com lock pra evitar race condition) ===
                // Agrupa quantidades por produto_id pra o caso do mesmo produto vir em
                // múltiplos itens (ex: produto KG com 2 pesos diferentes).
                $consumoPorProduto = [];
                foreach ($data['itens'] as $item) {
                    if (! empty($item['produto_id'])) {
                        $pid = $item['produto_id'];
                        $consumoPorProduto[$pid] = ($consumoPorProduto[$pid] ?? 0) + (float) $item['quantidade'];
                    }
                }

                if (! empty($consumoPorProduto) && ! $permitirNegativo) {
                    // Lock pra evitar 2 vendas simultâneas consumirem além do disponível.
                    $produtos = Produto::whereIn('id', array_keys($consumoPorProduto))
                        ->where('movimenta_estoque', true)
                        ->lockForUpdate()
                        ->get(['id', 'descricao', 'estoque_atual', 'unidade']);

                    foreach ($produtos as $p) {
                        $consumo = $consumoPorProduto[$p->id] ?? 0;
                        $disponivel = (float) $p->estoque_atual;
                        if ($consumo > $disponivel + 0.001) {
                            $disp = rtrim(rtrim(number_format($disponivel, 3, ',', '.'), '0'), ',');
                            throw ValidationException::withMessages([
                                'estoque' => ["Estoque insuficiente para \"{$p->descricao}\". Disponível: {$disp} {$p->unidade}."],
                            ]);
                        }
                    }
                }

                $proximoNumero = ((int) Venda::max('numero_venda')) + 1;
                $isFiado = $data['metodo_pagamento'] === 'fiado';

                // Adiantamento (valor entregue na hora) só faz sentido pra fiado.
                // Limitado ao total da venda — não permite pagar mais do que deve.
                $adiantamento = $isFiado ? min((float) ($data['valor_pago_fiado'] ?? 0), (float) $data['total']) : 0;
                $quitouNaHora = $isFiado && $adiantamento >= (float) $data['total'] - 0.01;

                $venda = Venda::create([
                    'numero_venda' => $proximoNumero,
                    'cliente_id' => $data['cliente_id'] ?? null,
                    'operador_id' => $request->user()->id,
                    'subtotal' => $data['subtotal'],
                    'desconto_total' => $data['desconto_total'] ?? 0,
                    'total' => $data['total'],
                    'valor_pago' => $data['valor_pago'],
                    'troco' => $data['troco'] ?? 0,
                    'metodo_pagamento' => $data['metodo_pagamento'],
                    'status' => 'finalizada',
                    'tipo' => $data['tipo'] ?? 'pdv',
                    'vencimento_fiado' => $isFiado
                        ? ($data['vencimento_fiado'] ?? now()->addDays(30)->toDateString())
                        : null,
                    'valor_pago_fiado' => $adiantamento,
                    'quitado_em' => $quitouNaHora ? now() : null,
                    'forma_quitacao' => $quitouNaHora ? 'dinheiro' : null,
                    // Forçamos created_at = hora local (app.timezone). Por padrão o SQLite
                    // useCurrent() salva UTC, o que causaria deslocamento de +3h ao mostrar.
                    'created_at' => now(),
                ]);

                $agora = now();
                foreach ($data['itens'] as $item) {
                    // Normaliza defaults pra colunas NOT NULL com default no banco.
                    // Se o frontend mandar null, o INSERT viola constraint em MySQL strict mode.
                    $itemSeguro = array_merge([
                        'codigo_barras' => '',
                        'unidade' => 'UN',
                        'desconto' => 0,
                        'produto_id' => null,
                    ], $item);
                    $itemSeguro['codigo_barras'] = $itemSeguro['codigo_barras'] ?? '';
                    $itemSeguro['unidade'] = $itemSeguro['unidade'] ?? 'UN';
                    $itemSeguro['desconto'] = $itemSeguro['desconto'] ?? 0;
                    // VendaItem tem $timestamps=false e migration usa useCurrent(); seto
                    // explícito pra evitar surpresa de MySQL strict mode.
                    $itemSeguro['created_at'] = $agora;

                    $venda->itens()->create($itemSeguro);

                    if (! empty($itemSeguro['produto_id'])) {
                        Produto::where('id', $itemSeguro['produto_id'])
                            ->where('movimenta_estoque', true)
                            ->decrement('estoque_atual', $itemSeguro['quantidade']);
                    }
                }

                return $venda;
            });

            return response()->json($venda->load('itens'), 201);
        } catch (ValidationException $ve) {
            // 422 dedicado pra erros de regra de negócio (estoque insuficiente, etc).
            return response()->json([
                'message' => $ve->validator->errors()->first(),
                'errors' => $ve->errors(),
            ], 422);
        } catch (Throwable $e) {
            // Log estruturado pra debugar 500 em produção sem expor stack ao cliente.
            Log::error('VendasController@store falhou', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'payload_summary' => [
                    'metodo' => $data['metodo_pagamento'] ?? null,
                    'total' => $data['total'] ?? null,
                    'qtd_itens' => is_array($data['itens'] ?? null) ? count($data['itens']) : 0,
                ],
            ]);
            return response()->json([
                'message' => 'Erro ao salvar a venda: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function proximoNumero(): JsonResponse
    {
        $proximo = ((int) Venda::max('numero_venda')) + 1;

        return response()->json(['numero' => $proximo]);
    }

    public function removerDuplicatas(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin pode remover duplicatas.'], 403);
        }

        $idsParaDeletar = [];

        $vendas = Venda::where('status', 'finalizada')
            ->orderBy('numero_venda')
            ->get(['id', 'numero_venda', 'total', 'metodo_pagamento', 'cliente_id', 'created_at']);

        $usados = [];
        foreach ($vendas as $i => $a) {
            if (isset($usados[$a->id])) {
                continue;
            }
            for ($j = $i + 1; $j < $vendas->count(); $j++) {
                $b = $vendas[$j];
                if (isset($usados[$b->id])) {
                    continue;
                }
                $diffSec = abs($a->created_at->diffInSeconds($b->created_at));
                if ((float) $a->total === (float) $b->total
                    && $a->metodo_pagamento === $b->metodo_pagamento
                    && ($a->cliente_id ?: null) === ($b->cliente_id ?: null)
                    && $diffSec <= 120) {
                    $idsParaDeletar[] = $b->id;
                    $usados[$b->id] = true;
                }
            }
        }

        if (empty($idsParaDeletar)) {
            return response()->json(['removidas' => 0]);
        }

        DB::transaction(function () use ($idsParaDeletar) {
            \App\Models\VendaItem::whereIn('venda_id', $idsParaDeletar)->delete();
            Venda::whereIn('id', $idsParaDeletar)->delete();
        });

        return response()->json(['removidas' => count($idsParaDeletar)]);
    }

    /**
     * Registra um pagamento de fiado — pode ser PARCIAL ou total.
     * Acumula em valor_pago_fiado. Quando valor_pago_fiado >= total, marca quitado_em.
     *
     * Sem o parâmetro `valor`, considera quitação total (paga tudo que falta).
     */
    public function quitarFiado(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'valor' => ['nullable', 'numeric', 'min:0.01'],
            'forma_quitacao' => ['nullable', 'string', 'max:20'],
            'quitado_em' => ['nullable', 'date'],
        ]);

        $venda = Venda::findOrFail($id);
        if ($venda->metodo_pagamento !== 'fiado') {
            return response()->json(['message' => 'Essa venda não é fiada.'], 422);
        }
        if ($venda->quitado_em) {
            return response()->json(['message' => 'Essa venda já foi quitada.'], 422);
        }

        $jaPago = (float) $venda->valor_pago_fiado;
        $restante = (float) $venda->total - $jaPago;
        $valorAgora = isset($data['valor']) ? (float) $data['valor'] : $restante;

        if ($valorAgora <= 0) {
            return response()->json(['message' => 'Valor inválido.'], 422);
        }
        if ($valorAgora > $restante + 0.01) {
            return response()->json([
                'message' => 'Valor maior que o saldo devedor. Saldo: R$ ' . number_format($restante, 2, ',', '.'),
            ], 422);
        }

        $novoTotal = $jaPago + $valorAgora;
        $quitouAgora = $novoTotal >= (float) $venda->total - 0.01;

        $venda->update([
            'valor_pago_fiado' => $novoTotal,
            'quitado_em' => $quitouAgora ? ($data['quitado_em'] ?? now()) : null,
            'forma_quitacao' => $quitouAgora ? ($data['forma_quitacao'] ?? 'dinheiro') : $venda->forma_quitacao,
        ]);

        return response()->json([
            'ok' => true,
            'quitada' => $quitouAgora,
            'valor_pago_fiado' => $novoTotal,
            'saldo_restante' => max(0, (float) $venda->total - $novoTotal),
            'venda' => $venda->fresh(),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin pode cancelar vendas.'], 403);
        }

        $venda = Venda::with('itens')->findOrFail($id);

        DB::transaction(function () use ($venda) {
            foreach ($venda->itens as $item) {
                if ($item->produto_id) {
                    \App\Models\Produto::where('id', $item->produto_id)
                        ->where('movimenta_estoque', true)
                        ->increment('estoque_atual', $item->quantidade);
                }
            }
            $venda->update(['status' => 'cancelada']);
        });

        return response()->json(['ok' => true]);
    }
}
