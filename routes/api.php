<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientesController;
use App\Http\Controllers\ComprasController;
use App\Http\Controllers\ConfiguracoesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EstoqueController;
use App\Http\Controllers\MensalidadesController;
use App\Http\Controllers\ProdutosController;
use App\Http\Controllers\RelatoriosController;
use App\Http\Controllers\VendasController;
use Illuminate\Support\Facades\Route;

// Público
Route::post('/auth/login', [AuthController::class, 'login']);

// Autenticado (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::get('/auth/users', [AuthController::class, 'listUsers']);
    Route::post('/auth/users', [AuthController::class, 'createUser']);
    Route::delete('/auth/users/{id}', [AuthController::class, 'deleteUser']);

    // Dashboard
    Route::get('/dashboard/resumo', [DashboardController::class, 'resumo']);
    Route::get('/dashboard/vendas-por-dia', [DashboardController::class, 'vendasPorDia']);
    Route::get('/dashboard/completo', [DashboardController::class, 'completo']);

    // Clientes (clientes da LOJA, não usuários do sistema)
    Route::apiResource('clientes', ClientesController::class);

    // Produtos
    Route::get('/produtos/buscar/{codigo}', [ProdutosController::class, 'buscarPorCodigo']);
    Route::post('/produtos/import', [ProdutosController::class, 'importBulk']);
    Route::apiResource('produtos', ProdutosController::class);

    // Estoque
    Route::get('/estoque/movimentacoes', [EstoqueController::class, 'movimentacoes']);
    Route::post('/estoque/ajustar', [EstoqueController::class, 'ajustar']);
    Route::get('/estoque/resumo', [EstoqueController::class, 'resumo']);
    Route::get('/estoque/ruptura', [EstoqueController::class, 'ruptura']);
    Route::get('/estoque/negativos', [EstoqueController::class, 'negativos']);

    // Vendas (PDV)
    Route::get('/vendas/proximo-numero', [VendasController::class, 'proximoNumero']);
    Route::post('/vendas/remover-duplicatas', [VendasController::class, 'removerDuplicatas']);
    Route::post('/vendas/{id}/quitar-fiado', [VendasController::class, 'quitarFiado']);
    Route::apiResource('vendas', VendasController::class)->except(['update']);

    // Compras
    Route::get('/compras/fornecedores', [ComprasController::class, 'fornecedores']);
    Route::post('/compras/fornecedores', [ComprasController::class, 'storeFornecedor']);
    Route::post('/compras/{id}/receber', [ComprasController::class, 'receber']);
    Route::apiResource('compras', ComprasController::class)->only(['index', 'show', 'store']);

    // Mensalidade do SISTEMA (dev cobra do dono da loja)
    Route::get('/mensalidades/minha', [MensalidadesController::class, 'minha']);
    Route::get('/mensalidades', [MensalidadesController::class, 'index']);
    Route::post('/mensalidades/gerar', [MensalidadesController::class, 'gerar']);
    Route::post('/mensalidades/{id}/marcar-paga', [MensalidadesController::class, 'marcarPaga']);

    // Configurações chave/valor (grupos: loja, pix_dev, sistema)
    Route::get('/configuracoes/{grupo}', [ConfiguracoesController::class, 'porGrupo']);
    Route::post('/configuracoes/{grupo}', [ConfiguracoesController::class, 'salvar']);

    // Relatórios
    Route::get('/relatorios/completo', [RelatoriosController::class, 'completo']);
});
