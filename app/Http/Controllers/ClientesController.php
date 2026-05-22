<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Cliente::query();

        if ($search = $request->query('search')) {
            $q->where(function ($w) use ($search) {
                $w->where('nome', 'like', "%{$search}%")
                    ->orWhere('cpf', 'like', "%{$search}%")
                    ->orWhere('telefone', 'like', "%{$search}%")
                    ->orWhere('codigo_interno', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        $q->orderBy('nome');

        $perPage = (int) ($request->query('per_page') ?: 50);

        return response()->json($q->paginate($perPage));
    }

    public function show(string $id): JsonResponse
    {
        $cliente = Cliente::with([
            'vendas' => fn ($q) => $q->latest()->limit(50),
            'vendas.itens',
        ])->findOrFail($id);

        return response()->json($cliente);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo_interno' => ['nullable', 'string', 'max:50'],
            'nome' => ['required', 'string', 'max:255'],
            'cpf' => ['nullable', 'string', 'max:20'],
            'telefone' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:ativo,inadimplente,inativo,bloqueado'],
            'limite_credito' => ['nullable', 'numeric', 'min:0'],
        ]);

        $data['created_by'] = $request->user()->id;
        $cliente = Cliente::create($data);

        return response()->json($cliente, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        $data = $request->validate([
            'codigo_interno' => ['nullable', 'string', 'max:50'],
            'nome' => ['sometimes', 'string', 'max:255'],
            'cpf' => ['nullable', 'string', 'max:20'],
            'telefone' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:ativo,inadimplente,inativo,bloqueado'],
            'limite_credito' => ['nullable', 'numeric', 'min:0'],
        ]);

        $cliente->update($data);

        return response()->json($cliente);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin pode deletar clientes.'], 403);
        }

        Cliente::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
