<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracoesController extends Controller
{
    /**
     * Lista configurações por grupo.
     *  grupo=loja      → dados da loja (qualquer usuário autenticado lê)
     *  grupo=pix_dev   → PIX do desenvolvedor (qualquer um lê pra ver no painel de mensalidade)
     *  grupo=sistema   → parâmetros (só admin)
     */
    public function porGrupo(Request $request, string $grupo): JsonResponse
    {
        if ($grupo === 'sistema' && ! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }

        return response()->json([
            'grupo' => $grupo,
            'config' => Configuracao::porGrupo($grupo),
        ]);
    }

    /**
     * Grava/atualiza configurações de um grupo.
     *  - grupo=pix_dev   → só admin
     *  - grupo=loja      → qualquer usuário autenticado (dono da própria loja)
     */
    public function salvar(Request $request, string $grupo): JsonResponse
    {
        if (in_array($grupo, ['pix_dev', 'sistema'], true) && ! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin pode editar este grupo.'], 403);
        }

        $data = $request->validate([
            'config' => ['required', 'array'],
        ]);

        foreach ($data['config'] as $chave => $valor) {
            Configuracao::set((string) $chave, $valor === null ? null : (string) $valor, $grupo);
        }

        return response()->json([
            'grupo' => $grupo,
            'config' => Configuracao::porGrupo($grupo),
        ]);
    }
}
