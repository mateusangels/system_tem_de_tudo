<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Movimentações de estoque — auditoria de entradas e saídas.
     *  - entrada: compra, devolução de cliente, ajuste positivo
     *  - saida:   venda, perda, ajuste negativo
     *  - ajuste:  inventário manual
     */
    public function up(): void
    {
        Schema::create('movimentacoes_estoque', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('produto_id')->constrained('produtos')->cascadeOnDelete();
            // entrada, saida, ajuste
            $table->string('tipo', 20);
            // compra, venda, devolucao, perda, inventario, ajuste_manual
            $table->string('motivo', 40);
            $table->decimal('quantidade', 15, 3);
            $table->decimal('estoque_antes', 15, 3);
            $table->decimal('estoque_depois', 15, 3);
            $table->decimal('custo_unitario', 18, 2)->nullable();
            $table->uuid('referencia_id')->nullable(); // id da venda/compra
            $table->string('referencia_tipo', 20)->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index('produto_id');
            $table->index('tipo');
            $table->index(['referencia_tipo', 'referencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentacoes_estoque');
    }
};
