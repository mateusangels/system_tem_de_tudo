<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Compras (pedidos junto a fornecedores) e seus itens.
     * Quando uma compra muda pra status=recebida, gera entrada no estoque.
     */
    public function up(): void
    {
        Schema::create('fornecedores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nome');
            $table->string('cnpj', 20)->nullable();
            $table->string('telefone', 30)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('contato', 80)->nullable();
            $table->text('endereco')->nullable();
            $table->text('observacao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index('nome');
        });

        Schema::create('compras', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 20)->unique(); // #001234
            $table->foreignUuid('fornecedor_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            // rascunho, pedido_enviado, recebida, cancelada
            $table->string('status', 20)->default('rascunho');
            $table->date('data_pedido');
            $table->date('data_recebimento')->nullable();
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('frete', 18, 2)->default(0);
            $table->decimal('outros', 18, 2)->default(0);
            $table->decimal('desconto', 18, 2)->default(0);
            $table->decimal('total', 18, 2)->default(0);
            $table->text('observacao')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('data_pedido');
        });

        Schema::create('compra_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('compra_id')->constrained('compras')->cascadeOnDelete();
            $table->foreignUuid('produto_id')->constrained('produtos');
            $table->decimal('quantidade', 15, 3);
            $table->decimal('custo_unitario', 18, 2);
            $table->decimal('total', 18, 2);
            $table->timestamps();

            $table->index('compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compra_itens');
        Schema::dropIfExists('compras');
        Schema::dropIfExists('fornecedores');
    }
};
