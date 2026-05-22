<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('numero_venda')->index();
            $table->foreignUuid('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignUuid('operador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('desconto_total', 18, 2)->default(0);
            $table->decimal('total', 18, 2)->default(0);
            $table->decimal('valor_pago', 18, 2)->default(0);
            $table->decimal('troco', 18, 2)->default(0);
            $table->string('metodo_pagamento', 20)->default('dinheiro');
            $table->string('status', 20)->default('finalizada');
            $table->string('tipo', 20)->default('normal');
            // NÃO usa useCurrent() — em SQLite o CURRENT_TIMESTAMP é UTC,
            // o que causaria descasamento com app.timezone (America/Sao_Paulo).
            // O controller seta created_at explicitamente com now().
            $table->timestamp('created_at')->nullable();

            $table->index('created_at');
            $table->index('status');
            $table->index(['cliente_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendas');
    }
};
