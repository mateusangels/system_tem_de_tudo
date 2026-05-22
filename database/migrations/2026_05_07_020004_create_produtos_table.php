<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produtos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('codigo_barras', 50)->default('');
            $table->string('codigo_interno', 50)->nullable()->default('');
            $table->string('referencia_fabricante', 80)->nullable();
            $table->string('descricao');
            $table->decimal('preco_custo', 18, 2)->default(0);
            $table->decimal('preco_venda', 18, 2)->default(0);
            $table->decimal('preco_atacado', 18, 2)->default(0);
            $table->integer('qtd_minima_atacado')->default(0);
            // unidade: UN, M, M2, M3, KG, SC (saco), BARRA, ROLO, CX (caixa), LATA, PCT (pacote), GL (galão), L
            $table->string('unidade', 10)->default('UN');
            $table->boolean('ativo')->default(true);
            $table->string('categoria', 100)->nullable()->default('');
            $table->string('marca', 100)->nullable()->default('');
            // Localização física na loja (ex: "Corredor B / Prat. 3", "Pátio", "Galpão 2")
            $table->string('localizacao', 120)->nullable();
            $table->integer('estoque_minimo')->default(0);
            $table->decimal('estoque_atual', 15, 3)->default(0);
            $table->boolean('movimenta_estoque')->default(true);
            // Observação interna (ex: "vende avulso ou por caixa fechada 24un")
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index('codigo_barras');
            $table->index('descricao');
            $table->index('categoria');
            $table->index('marca');
            $table->index('codigo_interno');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
