<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona controle de quitação pra vendas no fiado (crediário simples).
     * Quando metodo_pagamento='fiado', a venda fica em aberto até quitado_em ser preenchido.
     */
    public function up(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->date('vencimento_fiado')->nullable();
            $table->timestamp('quitado_em')->nullable();
            $table->string('forma_quitacao', 20)->nullable();   // pix, dinheiro, etc
            $table->index(['metodo_pagamento', 'quitado_em']);
        });
    }

    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->dropIndex(['metodo_pagamento', 'quitado_em']);
            $table->dropColumn(['vencimento_fiado', 'quitado_em', 'forma_quitacao']);
        });
    }
};
