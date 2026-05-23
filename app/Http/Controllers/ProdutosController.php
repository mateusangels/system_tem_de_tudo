<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProdutosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Produto::query();

        if ($search = $request->query('search')) {
            $q->where(function ($w) use ($search) {
                $w->where('descricao', 'like', "%{$search}%")
                    ->orWhere('codigo_barras', 'like', "%{$search}%")
                    ->orWhere('codigo_interno', 'like', "%{$search}%")
                    ->orWhere('marca', 'like', "%{$search}%");
            });
        }

        if ($request->has('ativo')) {
            $q->where('ativo', filter_var($request->query('ativo'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($categoria = $request->query('categoria')) {
            $q->where('categoria', $categoria);
        }

        $q->orderByDesc('created_at');

        $perPage = (int) ($request->query('per_page') ?: 50);

        return response()->json($q->paginate($perPage));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Produto::findOrFail($id));
    }

    public function buscarPorCodigo(Request $request, string $codigo): JsonResponse
    {
        $q = Produto::where(function ($w) use ($codigo) {
            $w->where('codigo_barras', $codigo)
                ->orWhere('codigo_interno', $codigo);
        });

        // Por padrão, restringe a ativos (PDV). Frontend pode passar ?incluirInativos=1.
        if (! filter_var($request->query('incluirInativos'), FILTER_VALIDATE_BOOLEAN)) {
            $q->where('ativo', true);
        }

        $produto = $q->first();

        if (! $produto) {
            return response()->json(['message' => 'Produto não encontrado.'], 404);
        }

        return response()->json($produto);
    }

    public function importBulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'produtos' => ['required', 'array', 'min:1'],
            'produtos.*.descricao' => ['required', 'string', 'max:255'],
            'produtos.*.codigo_barras' => ['nullable', 'string', 'max:50'],
            'produtos.*.codigo_interno' => ['nullable', 'string', 'max:50'],
        ]);

        $produtos = $data['produtos'];

        // Indexar existentes por codigo_barras e por descricao (uppercase) pra match rápido.
        $existentes = Produto::select('id', 'codigo_barras', 'descricao')->get();
        $porBarras = [];
        $porDescricao = [];
        foreach ($existentes as $e) {
            if ($e->codigo_barras && trim($e->codigo_barras) !== '') {
                $porBarras[strtoupper(trim($e->codigo_barras))] = $e->id;
            }
            if ($e->descricao && trim($e->descricao) !== '') {
                $porDescricao[strtoupper(trim($e->descricao))] = $e->id;
            }
        }

        $atualizados = 0;
        $inseridos = 0;
        $erros = [];

        DB::beginTransaction();
        try {
            foreach ($produtos as $idx => $p) {
                $barrasKey = strtoupper(trim($p['codigo_barras'] ?? ''));
                $descKey = strtoupper(trim($p['descricao']));
                $idExistente = ($barrasKey !== '' && isset($porBarras[$barrasKey]))
                    ? $porBarras[$barrasKey]
                    : ($porDescricao[$descKey] ?? null);

                $payload = [
                    'codigo_barras' => $p['codigo_barras'] ?? '',
                    'codigo_interno' => $p['codigo_interno'] ?? '',
                    'referencia_fabricante' => $p['referencia_fabricante'] ?? null,
                    'descricao' => $p['descricao'],
                    'preco_custo' => (float) ($p['preco_custo'] ?? 0),
                    'preco_venda' => (float) ($p['preco_venda'] ?? 0),
                    'preco_atacado' => (float) ($p['preco_atacado'] ?? 0),
                    'qtd_minima_atacado' => (int) ($p['qtd_minima_atacado'] ?? 0),
                    'unidade' => $p['unidade'] ?? 'UN',
                    'ativo' => (bool) ($p['ativo'] ?? true),
                    'categoria' => $p['categoria'] ?? '',
                    'marca' => $p['marca'] ?? '',
                    'localizacao' => $p['localizacao'] ?? null,
                    'estoque_minimo' => (int) ($p['estoque_minimo'] ?? 0),
                    'estoque_atual' => (float) ($p['estoque_atual'] ?? 0),
                    'movimenta_estoque' => (bool) ($p['movimenta_estoque'] ?? true),
                    'observacao' => $p['observacao'] ?? null,
                ];

                if ($idExistente) {
                    Produto::where('id', $idExistente)->update($payload);
                    $atualizados++;
                } else {
                    Produto::create($payload);
                    $inseridos++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Falha na importação: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'inseridos' => $inseridos,
            'atualizados' => $atualizados,
            'erros' => $erros,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo_barras' => ['nullable', 'string', 'max:50'],
            'codigo_interno' => ['nullable', 'string', 'max:50'],
            'descricao' => ['required', 'string', 'max:255'],
            'preco_custo' => ['nullable', 'numeric', 'min:0'],
            'preco_venda' => ['required', 'numeric', 'min:0'],
            'preco_atacado' => ['nullable', 'numeric', 'min:0'],
            'qtd_minima_atacado' => ['nullable', 'integer', 'min:0'],
            'unidade' => ['nullable', 'string', 'max:10'],
            'ativo' => ['nullable', 'boolean'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'marca' => ['nullable', 'string', 'max:100'],
            'referencia_fabricante' => ['nullable', 'string', 'max:80'],
            'localizacao' => ['nullable', 'string', 'max:120'],
            'observacao' => ['nullable', 'string'],
            'estoque_minimo' => ['nullable', 'integer', 'min:0'],
            'estoque_atual' => ['nullable', 'numeric', 'min:0'],
            'movimenta_estoque' => ['nullable', 'boolean'],
        ]);

        // Colunas NOT NULL com default '' no banco — null explícito viola constraint
        $data['codigo_barras'] = $data['codigo_barras'] ?? '';
        $data['codigo_interno'] = $data['codigo_interno'] ?? '';
        $data['categoria'] = $data['categoria'] ?? '';
        $data['marca'] = $data['marca'] ?? '';
        $data['unidade'] = $data['unidade'] ?? 'UN';
        $data['preco_custo'] = $data['preco_custo'] ?? 0;
        $data['preco_atacado'] = $data['preco_atacado'] ?? 0;
        $data['qtd_minima_atacado'] = $data['qtd_minima_atacado'] ?? 0;
        $data['estoque_minimo'] = $data['estoque_minimo'] ?? 0;
        $data['estoque_atual'] = $data['estoque_atual'] ?? 0;
        $data['ativo'] = $data['ativo'] ?? true;
        $data['movimenta_estoque'] = $data['movimenta_estoque'] ?? true;

        $produto = Produto::create($data);

        return response()->json($produto, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $produto = Produto::findOrFail($id);

        $data = $request->validate([
            'codigo_barras' => ['nullable', 'string', 'max:50'],
            'codigo_interno' => ['nullable', 'string', 'max:50'],
            'descricao' => ['sometimes', 'string', 'max:255'],
            'preco_custo' => ['nullable', 'numeric', 'min:0'],
            'preco_venda' => ['sometimes', 'numeric', 'min:0'],
            'preco_atacado' => ['nullable', 'numeric', 'min:0'],
            'qtd_minima_atacado' => ['nullable', 'integer', 'min:0'],
            'unidade' => ['nullable', 'string', 'max:10'],
            'ativo' => ['nullable', 'boolean'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'marca' => ['nullable', 'string', 'max:100'],
            'referencia_fabricante' => ['nullable', 'string', 'max:80'],
            'localizacao' => ['nullable', 'string', 'max:120'],
            'observacao' => ['nullable', 'string'],
            'estoque_minimo' => ['nullable', 'integer', 'min:0'],
            'estoque_atual' => ['nullable', 'numeric', 'min:0'],
            'movimenta_estoque' => ['nullable', 'boolean'],
        ]);

        // Normaliza null em colunas NOT NULL
        foreach (['codigo_barras', 'codigo_interno', 'categoria', 'marca'] as $col) {
            if (array_key_exists($col, $data) && $data[$col] === null) {
                $data[$col] = '';
            }
        }

        $produto->update($data);

        return response()->json($produto);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        Produto::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
