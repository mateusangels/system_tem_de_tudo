<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mensalidade do SISTEMA (cobrança que o desenvolvedor faz do dono da loja).
     * NÃO confundir com Fiado/Crediário do cliente final da loja.
     *
     * Lançamento mensal: ao fim do trial, é gerado o primeiro registro.
     * Quando o admin (dev) confirma recebimento, marca paga_em + status=pago
     * e a licenca_ate do usuário avança 30 dias.
     */
    public function up(): void
    {
        Schema::create('mensalidades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('valor', 18, 2)->default(180.00);
            $table->date('referencia');         // mês a que se refere (1º dia do mês)
            $table->date('vencimento');
            $table->date('paga_em')->nullable();
            // pendente | pago | atrasado | cancelada
            $table->string('status', 20)->default('pendente');
            $table->string('forma_pagamento', 30)->nullable(); // pix, transferencia, dinheiro
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('vencimento');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mensalidades');
    }
};
