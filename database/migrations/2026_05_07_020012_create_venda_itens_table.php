<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venda_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('venda_id')->constrained('vendas')->cascadeOnDelete();
            $table->foreignUuid('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->string('codigo_barras', 50)->default('');
            $table->string('descricao');
            $table->decimal('quantidade', 15, 3)->default(1);
            $table->string('unidade', 10)->default('UN');
            $table->decimal('valor_unitario', 18, 2)->default(0);
            $table->decimal('desconto', 18, 2)->default(0);
            $table->decimal('valor_total', 18, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('venda_id');
            $table->index('produto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venda_itens');
    }
};
