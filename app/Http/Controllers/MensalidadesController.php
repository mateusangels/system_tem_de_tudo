<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\Mensalidade;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MensalidadesController extends Controller
{
    /**
     * Tela do DONO DA LOJA: lista de mensalidades dele, próxima a vencer,
     * dados do PIX do desenvolvedor e QR Code para pagar.
     */
    public function minha(Request $request): JsonResponse
    {
        $user = $request->user();

        $mensalidades = Mensalidade::where('user_id', $user->id)
            ->orderByDesc('referencia')
            ->get()
            ->map(fn (Mensalidade $m) => [
                'id' => $m->id,
                'valor' => (float) $m->valor,
                'referencia' => $m->referencia->format('Y-m-d'),
                'referencia_label' => $m->referencia->translatedFormat('F/Y'),
                'vencimento' => $m->vencimento->format('Y-m-d'),
                'paga_em' => $m->paga_em?->format('Y-m-d'),
                'status' => $m->status,
                'forma_pagamento' => $m->forma_pagamento,
                'observacao' => $m->observacao,
                'atrasada' => $m->estaAtrasada(),
            ]);

        $pixCfg = Configuracao::porGrupo('pix_dev');

        return response()->json([
            'usuario' => [
                'nome' => $user->name,
                'em_trial' => $user->emTrial(),
                'trial_expirado' => $user->trialExpirado(),
                'dias_restantes' => $user->diasRestantesTrial(),
                'trial_fim' => $user->trial_fim?->toIso8601String(),
                'licenca_ativa' => $user->licenca_ativa,
                'licenca_ate' => $user->licenca_ate?->toIso8601String(),
            ],
            'pix' => [
                'chave' => $pixCfg['pix_chave'] ?? null,
                'nome_titular' => $pixCfg['pix_titular'] ?? null,
                'cidade' => $pixCfg['pix_cidade'] ?? null,
                'qr_code_base64' => $pixCfg['pix_qr_base64'] ?? null,
                'copia_cola' => $pixCfg['pix_copia_cola'] ?? null,
                'valor_mensal' => (float) ($pixCfg['valor_mensalidade'] ?? env('MENSALIDADE_VALOR', 180)),
                'whatsapp_suporte' => $pixCfg['whatsapp_suporte'] ?? '5561998221210',
                'dev_nome' => $pixCfg['dev_nome'] ?? 'Mateus dos Anjos',
            ],
            'mensalidades' => $mensalidades,
        ]);
    }

    /**
     * Painel do ADMIN (Mateus): todas as mensalidades de todos os clientes.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }

        $status = $request->get('status'); // pendente, pago, atrasado, todos

        $q = Mensalidade::with('user:id,name,email,licenca_ativa,licenca_ate,trial_fim');

        if ($status && $status !== 'todos') {
            $q->where('status', $status);
        }

        $mensalidades = $q->orderByDesc('vencimento')->get()->map(function (Mensalidade $m) {
            return [
                'id' => $m->id,
                'valor' => (float) $m->valor,
                'referencia' => $m->referencia->format('Y-m-d'),
                'referencia_label' => $m->referencia->translatedFormat('F/Y'),
                'vencimento' => $m->vencimento->format('Y-m-d'),
                'paga_em' => $m->paga_em?->format('Y-m-d'),
                'status' => $m->status,
                'forma_pagamento' => $m->forma_pagamento,
                'observacao' => $m->observacao,
                'atrasada' => $m->estaAtrasada(),
                'cliente' => [
                    'id' => $m->user->id,
                    'nome' => $m->user->name,
                    'email' => $m->user->email,
                    'licenca_ativa' => $m->user->licenca_ativa,
                    'licenca_ate' => $m->user->licenca_ate?->toIso8601String(),
                ],
            ];
        });

        return response()->json(['mensalidades' => $mensalidades]);
    }

    /**
     * Admin marca uma mensalidade como paga.
     * Estende a licenca_ate do usuário pra +30 dias a partir do vencimento.
     */
    public function marcarPaga(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }

        $data = $request->validate([
            'forma_pagamento' => ['nullable', 'string', 'max:30'],
            'observacao' => ['nullable', 'string', 'max:500'],
            'paga_em' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($id, $data) {
            $m = Mensalidade::findOrFail($id);
            $m->update([
                'status' => 'pago',
                'paga_em' => $data['paga_em'] ?? now()->toDateString(),
                'forma_pagamento' => $data['forma_pagamento'] ?? 'pix',
                'observacao' => $data['observacao'] ?? $m->observacao,
            ]);

            // Estende licenca_ate em 30 dias a partir do MAIOR entre (licenca_ate atual, vencimento)
            $user = $m->user;
            $base = $user->licenca_ate && $user->licenca_ate->isFuture()
                ? $user->licenca_ate
                : $m->vencimento;

            $user->update([
                'licenca_ativa' => true,
                'licenca_ate' => $base->copy()->addDays(30),
            ]);
        });

        return response()->json(['ok' => true]);
    }

    /**
     * Admin gera a primeira (ou próxima) mensalidade para um cliente.
     */
    public function gerar(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }

        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'valor' => ['nullable', 'numeric', 'min:0'],
            'vencimento' => ['nullable', 'date'],
            'referencia' => ['nullable', 'date'],
        ]);

        $user = User::findOrFail($data['user_id']);

        $referencia = isset($data['referencia']) ? \Carbon\Carbon::parse($data['referencia'])->startOfMonth() : now()->startOfMonth();
        $vencimento = isset($data['vencimento']) ? \Carbon\Carbon::parse($data['vencimento']) : $referencia->copy()->addDays(5);

        $mensalidade = Mensalidade::create([
            'user_id' => $user->id,
            'valor' => $data['valor'] ?? env('MENSALIDADE_VALOR', 180),
            'referencia' => $referencia,
            'vencimento' => $vencimento,
            'status' => 'pendente',
        ]);

        return response()->json(['mensalidade' => $mensalidade], 201);
    }
}
