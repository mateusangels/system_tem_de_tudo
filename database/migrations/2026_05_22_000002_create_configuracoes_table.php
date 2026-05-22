<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabela de configurações chave/valor.
     * Usada para guardar:
     *  - dados da loja (nome fantasia, cnpj, endereço, logo)
     *  - PIX do desenvolvedor (chave + QR Code em base64) para mensalidade
     *  - parâmetros gerais (valor mensalidade, dias trial, etc)
     */
    public function up(): void
    {
        Schema::create('configuracoes', function (Blueprint $table) {
            $table->string('chave', 80)->primary();
            $table->text('valor')->nullable();
            $table->string('grupo', 40)->default('geral'); // loja, pix_dev, sistema
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracoes');
    }
};
