<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Produto;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function resumo(Request $request): JsonResponse
    {
        $hoje = now()->startOfDay();
        $inicioMes = now()->startOfMonth();

        return response()->json([
            'clientes_total' => Cliente::count(),
            'clientes_ativos' => Cliente::where('status', 'ativo')->count(),
            'produtos_total' => Produto::where('ativo', true)->count(),
            'produtos_estoque_baixo' => Produto::where('ativo', true)
                ->where('movimenta_estoque', true)
                ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
                ->count(),
            'vendas_hoje_quantidade' => Venda::where('created_at', '>=', $hoje)
                ->where('status', 'finalizada')->count(),
            'vendas_hoje_total' => (float) Venda::where('created_at', '>=', $hoje)
                ->where('status', 'finalizada')->sum('total'),
            'vendas_mes_total' => (float) Venda::where('created_at', '>=', $inicioMes)
                ->where('status', 'finalizada')->sum('total'),
        ]);
    }

    public function vendasPorDia(Request $request): JsonResponse
    {
        $dias = (int) ($request->query('dias') ?: 30);
        $inicio = now()->subDays($dias)->startOfDay();

        $rows = Venda::where('created_at', '>=', $inicio)
            ->where('status', 'finalizada')
            ->selectRaw("DATE(created_at) as dia, COUNT(*) as total_vendas, SUM(total) as valor_total")
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        return response()->json($rows);
    }

    public function completo(Request $request): JsonResponse
    {
        $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date', 'after_or_equal:start'],
        ]);

        $start = $this->parsePeriodo($request->query('start'), now()->startOfMonth());
        $end = $this->parsePeriodo($request->query('end'), now()->endOfMonth(), true);

        $vendasBase = fn () => Venda::where('vendas.status', 'finalizada')
            ->whereBetween('vendas.created_at', [$start, $end]);

        $totalVendas = (float) $vendasBase()->sum('vendas.total');
        $qtdVendas = (int) $vendasBase()->count();
        $ticketMedio = $qtdVendas > 0 ? $totalVendas / $qtdVendas : 0;
        $produtosBaixo = Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->count();
        $valorEstoque = (float) Produto::where('ativo', true)
            ->where('movimenta_estoque', true)
            ->select(DB::raw('SUM(estoque_atual * preco_custo) AS v'))
            ->value('v');

        // Vendas por funcionário
        $vendasPorFuncionario = $vendasBase()
            ->leftJoin('profiles', 'vendas.operador_id', '=', 'profiles.user_id')
            ->selectRaw("COALESCE(profiles.nome, 'Desconhecido') as nome, SUM(vendas.total) as total, COUNT(*) as qtd")
            ->groupBy('profiles.nome', 'vendas.operador_id')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'nome' => $r->nome,
                'total' => (float) $r->total,
                'qtd' => (int) $r->qtd,
            ])
            ->values();

        // Vendas por método
        $vendasPorMetodo = $vendasBase()
            ->selectRaw('vendas.metodo_pagamento as metodo_pagamento, SUM(vendas.total) as total')
            ->groupBy('vendas.metodo_pagamento')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'metodo' => strtoupper($r->metodo_pagamento ?: 'dinheiro'),
                'total' => (float) $r->total,
            ])
            ->values();

        // Produtos mais vendidos no período
        $maisVendidos = DB::table('venda_itens')
            ->join('vendas', 'venda_itens.venda_id', '=', 'vendas.id')
            ->whereBetween('vendas.created_at', [$start, $end])
            ->where('vendas.status', 'finalizada')
            ->selectRaw('venda_itens.descricao as nome, SUM(venda_itens.quantidade) as qtd, SUM(venda_itens.valor_total) as total')
            ->groupBy('venda_itens.descricao')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'nome' => $r->nome,
                'qtd' => (float) $r->qtd,
                'total' => (float) $r->total,
            ])
            ->values();

        // Evolução mensal (6 meses)
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

        return response()->json([
            'totais' => [
                'vendas_total' => $totalVendas,
                'qtd_vendas' => $qtdVendas,
                'ticket_medio' => $ticketMedio,
                'produtos_baixo' => $produtosBaixo,
                'valor_estoque' => $valorEstoque,
            ],
            'vendas_por_funcionario' => $vendasPorFuncionario,
            'vendas_por_metodo' => $vendasPorMetodo,
            'mais_vendidos' => $maisVendidos,
            'evolucao_mensal' => $evolucao,
            'periodo' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
        ]);
    }

    private function parsePeriodo(?string $iso, Carbon $default, bool $endOfDay = false): Carbon
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
