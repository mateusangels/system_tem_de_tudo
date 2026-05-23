<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\CompraItem;
use App\Models\Fornecedor;
use App\Models\MovimentacaoEstoque;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComprasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Compra::with(['fornecedor:id,nome', 'user:id,name'])
            ->orderByDesc('data_pedido');

        if ($status = $request->get('status')) {
            $q->where('status', $status);
        }

        return response()->json($q->paginate((int) $request->get('per_page', 20)));
    }

    public function show(string $id): JsonResponse
    {
        $compra = Compra::with(['fornecedor', 'itens.produto:id,descricao,codigo_barras,unidade'])
            ->findOrFail($id);

        return response()->json(['compra' => $compra]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fornecedor_id' => ['nullable', 'uuid', 'exists:fornecedores,id'],
            'data_pedido' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:1000'],
            'frete' => ['nullable', 'numeric', 'min:0'],
            'outros' => ['nullable', 'numeric', 'min:0'],
            'desconto' => ['nullable', 'numeric', 'min:0'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', 'uuid', 'exists:produtos,id'],
            'itens.*.quantidade' => ['required', 'numeric', 'min:0.001'],
            'itens.*.custo_unitario' => ['required', 'numeric', 'min:0'],
        ]);

        $compra = DB::transaction(function () use ($data, $request) {
            $numero = '#' . str_pad((string)(Compra::count() + 1), 6, '0', STR_PAD_LEFT);

            $subtotal = 0;
            foreach ($data['itens'] as $it) {
                $subtotal += $it['quantidade'] * $it['custo_unitario'];
            }

            $compra = Compra::create([
                'numero' => $numero,
                'fornecedor_id' => $data['fornecedor_id'] ?? null,
                'status' => 'rascunho',
                'data_pedido' => $data['data_pedido'] ?? now()->toDateString(),
                'subtotal' => $subtotal,
                'frete' => $data['frete'] ?? 0,
                'outros' => $data['outros'] ?? 0,
                'desconto' => $data['desconto'] ?? 0,
                'total' => $subtotal + ($data['frete'] ?? 0) + ($data['outros'] ?? 0) - ($data['desconto'] ?? 0),
                'observacao' => $data['observacao'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            foreach ($data['itens'] as $it) {
                CompraItem::create([
                    'compra_id' => $compra->id,
                    'produto_id' => $it['produto_id'],
                    'quantidade' => $it['quantidade'],
                    'custo_unitario' => $it['custo_unitario'],
                    'total' => $it['quantidade'] * $it['custo_unitario'],
                ]);
            }

            return $compra;
        });

        return response()->json(['compra' => $compra->load('itens')], 201);
    }

    /**
     * Confirma recebimento da compra: entra no estoque dos produtos e
     * (opcional) atualiza o custo do produto pra refletir a última compra.
     */
    public function receber(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'atualizar_custo' => ['nullable', 'boolean'],
            'data_recebimento' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($id, $data, $request) {
            $compra = Compra::with('itens')->findOrFail($id);
            if ($compra->status === 'recebida') {
                abort(422, 'Compra já foi recebida.');
            }

            foreach ($compra->itens as $item) {
                $produto = Produto::lockForUpdate()->findOrFail($item->produto_id);
                $antes = (float) $produto->estoque_atual;
                $depois = $antes + (float) $item->quantidade;

                $produto->update([
                    'estoque_atual' => $depois,
                    'preco_custo' => $data['atualizar_custo'] ?? false ? $item->custo_unitario : $produto->preco_custo,
                ]);

                MovimentacaoEstoque::create([
                    'produto_id' => $produto->id,
                    'tipo' => 'entrada',
                    'motivo' => 'compra',
                    'quantidade' => $item->quantidade,
                    'estoque_antes' => $antes,
                    'estoque_depois' => $depois,
                    'custo_unitario' => $item->custo_unitario,
                    'referencia_id' => $compra->id,
                    'referencia_tipo' => 'compra',
                    'user_id' => $request->user()->id,
                ]);
            }

            $compra->update([
                'status' => 'recebida',
                'data_recebimento' => $data['data_recebimento'] ?? now()->toDateString(),
            ]);
        });

        return response()->json(['ok' => true]);
    }

    public function fornecedores(): JsonResponse
    {
        return response()->json([
            'fornecedores' => Fornecedor::where('ativo', true)->orderBy('nome')->get(),
        ]);
    }

    public function storeFornecedor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'cnpj' => ['nullable', 'string', 'max:20', 'cnpj_valido'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'contato' => ['nullable', 'string', 'max:80'],
            'endereco' => ['nullable', 'string'],
            'observacao' => ['nullable', 'string'],
        ]);

        $f = Fornecedor::create($data);
        return response()->json(['fornecedor' => $f], 201);
    }
}
