<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Produto;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatoriosController extends Controller
{
    public function completo(Request $request): JsonResponse
    {
        $start = $this->parseTs($request->query('start'), now()->startOfMonth());
        $end = $this->parseTs($request->query('end'), now()->endOfMonth(), true);

        $vendasBase = fn () => Venda::where('vendas.status', 'finalizada')
            ->whereBetween('vendas.created_at', [$start, $end]);

        $totalVendas = (float) $vendasBase()->sum('vendas.total');
        $vendasCount = $vendasBase()->count();
        $ticketMedio = $vendasCount > 0 ? $totalVendas / $vendasCount : 0;

        // Vendas por funcionário
        $vendasPorFuncionario = $vendasBase()
            ->leftJoin('profiles', 'vendas.operador_id', '=', 'profiles.user_id')
            ->selectRaw("COALESCE(profiles.nome, 'Desconhecido') as nome, SUM(vendas.total) as total, COUNT(*) as qtd")
            ->groupBy('profiles.nome', 'vendas.operador_id')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['nome' => $r->nome, 'total' => (float) $r->total, 'qtd' => (int) $r->qtd])
            ->values();

        // Vendas por método
        $vendasPorMetodo = $vendasBase()
            ->selectRaw('vendas.metodo_pagamento as metodo_pagamento, SUM(vendas.total) as total')
            ->groupBy('vendas.metodo_pagamento')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['metodo' => strtoupper($r->metodo_pagamento ?: 'dinheiro'), 'total' => (float) $r->total])
            ->values();

        // Vendas por dia
        $vendasPorDia = $vendasBase()
            ->selectRaw("DATE(vendas.created_at) as dia, SUM(vendas.total) as vendas, COUNT(*) as qtd")
            ->groupBy('dia')
            ->orderBy('dia')
            ->get()
            ->map(fn ($r) => ['dia' => $r->dia, 'vendas' => (float) $r->vendas, 'qtd' => (int) $r->qtd])
            ->values();

        // Top produtos
        $topProdutos = DB::table('venda_itens')
            ->join('vendas', 'venda_itens.venda_id', '=', 'vendas.id')
            ->where('vendas.status', 'finalizada')
            ->whereBetween('vendas.created_at', [$start, $end])
            ->selectRaw('venda_itens.descricao as descricao, SUM(venda_itens.quantidade) as qtd, SUM(venda_itens.valor_total) as total')
            ->groupBy('venda_itens.descricao')
            ->orderByDesc('total')
            ->limit(15)
            ->get()
            ->map(fn ($r) => ['descricao' => $r->descricao, 'qtd' => (float) $r->qtd, 'total' => (float) $r->total])
            ->values();

        // Evolução mensal
        $evolucao = [];
        for ($i = 5; $i >= 0; $i--) {
            $mesInicio = now()->subMonths($i)->startOfMonth();
            $mesFim = now()->subMonths($i)->endOfMonth();
            $evolucao[] = [
                'month' => $this->labelMes($mesInicio),
                'vendas' => (float) Venda::where('status', 'finalizada')
                    ->whereBetween('created_at', [$mesInicio, $mesFim])->sum('total'),
                'qtd' => (int) Venda::where('status', 'finalizada')
                    ->whereBetween('created_at', [$mesInicio, $mesFim])->count(),
            ];
        }

        $clientesTotal = Cliente::count();
        $clientesAtivos = Cliente::where('status', 'ativo')->count();

        $produtosTotal = Produto::where('ativo', true)->count();
        $produtosBaixo = Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->count();

        return response()->json([
            'totais' => [
                'vendas_total' => $totalVendas,
                'vendas_count' => $vendasCount,
                'ticket_medio' => $ticketMedio,
            ],
            'vendas_por_funcionario' => $vendasPorFuncionario,
            'vendas_por_metodo' => $vendasPorMetodo,
            'vendas_por_dia' => $vendasPorDia,
            'top_produtos' => $topProdutos,
            'evolucao_mensal' => $evolucao,
            'clientes' => [
                'total' => $clientesTotal,
                'ativos' => $clientesAtivos,
            ],
            'produtos' => [
                'total' => $produtosTotal,
                'estoque_baixo' => $produtosBaixo,
            ],
            'periodo' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
        ]);
    }

    private function parseTs(?string $iso, Carbon $default, bool $endOfDay = false): Carbon
    {
        if (! $iso) {
            return $default;
        }
        try {
            $c = Carbon::parse($iso);
            return $endOfDay ? $c->endOfDay() : $c->startOfDay();
        } catch (\Throwable) {
            return $default;
        }
    }

    private function labelMes(Carbon $d): string
    {
        $meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return $meses[$d->month - 1].'/'.$d->format('y');
    }
}
