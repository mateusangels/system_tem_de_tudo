<?php

namespace App\Http\Controllers;

use App\Models\MovimentacaoEstoque;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstoqueController extends Controller
{
    /**
     * Lista de movimentações filtradas.
     */
    public function movimentacoes(Request $request): JsonResponse
    {
        $q = MovimentacaoEstoque::with('produto:id,descricao,codigo_barras,unidade');

        if ($produtoId = $request->get('produto_id')) {
            $q->where('produto_id', $produtoId);
        }
        if ($tipo = $request->get('tipo')) {
            $q->where('tipo', $tipo);
        }
        if ($de = $request->get('de')) {
            $q->where('created_at', '>=', $de);
        }
        if ($ate = $request->get('ate')) {
            $q->where('created_at', '<=', $ate);
        }

        $perPage = (int) ($request->get('per_page', 50));
        return response()->json($q->orderByDesc('created_at')->paginate($perPage));
    }

    /**
     * Ajuste manual de estoque (inventário, perda, ajuste positivo).
     */
    public function ajustar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'produto_id' => ['required', 'uuid', 'exists:produtos,id'],
            'tipo' => ['required', 'in:entrada,saida,ajuste'],
            'motivo' => ['required', 'in:inventario,perda,devolucao,ajuste_manual'],
            'quantidade' => ['required', 'numeric', 'min:0.001'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ]);

        $mov = DB::transaction(function () use ($data, $request) {
            $produto = Produto::lockForUpdate()->findOrFail($data['produto_id']);
            $antes = (float) $produto->estoque_atual;

            $depois = $data['tipo'] === 'entrada'
                ? $antes + (float) $data['quantidade']
                : ($data['tipo'] === 'saida'
                    ? $antes - (float) $data['quantidade']
                    : (float) $data['quantidade']); // ajuste = define valor absoluto

            $produto->update(['estoque_atual' => $depois]);

            return MovimentacaoEstoque::create([
                'produto_id' => $produto->id,
                'tipo' => $data['tipo'],
                'motivo' => $data['motivo'],
                'quantidade' => (float) $data['quantidade'],
                'estoque_antes' => $antes,
                'estoque_depois' => $depois,
                'user_id' => $request->user()->id,
                'observacao' => $data['observacao'] ?? null,
            ]);
        });

        return response()->json(['movimentacao' => $mov], 201);
    }

    /**
     * Resumo do estoque: total, abaixo do mínimo, valor em custo.
     */
    public function resumo(): JsonResponse
    {
        $total = Produto::where('ativo', true)->count();
        $baixo = Produto::where('ativo', true)
            ->whereRaw('estoque_atual <= estoque_minimo')
            ->where('movimenta_estoque', true)
            ->count();

        $valorCusto = (float) Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->select(DB::raw('SUM(estoque_atual * preco_custo) AS v'))
            ->value('v');

        $valorVenda = (float) Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->select(DB::raw('SUM(estoque_atual * preco_venda) AS v'))
            ->value('v');

        return response()->json([
            'total_produtos' => $total,
            'abaixo_minimo' => $baixo,
            'valor_em_estoque_custo' => $valorCusto,
            'valor_em_estoque_venda' => $valorVenda,
            'margem_potencial' => $valorVenda - $valorCusto,
        ]);
    }

    /**
     * Produtos abaixo do estoque mínimo (alerta de reposição).
     */
    public function ruptura(): JsonResponse
    {
        $produtos = Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->whereRaw('estoque_atual <= estoque_minimo')
            ->orderBy('estoque_atual')
            ->get(['id', 'codigo_barras', 'descricao', 'unidade', 'marca', 'localizacao', 'estoque_atual', 'estoque_minimo']);

        return response()->json(['produtos' => $produtos]);
    }
}
