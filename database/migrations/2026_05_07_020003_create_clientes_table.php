<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('codigo_interno', 50)->default('');
            $table->string('nome');
            $table->string('cpf', 20)->nullable()->default('');
            $table->string('telefone', 50)->nullable()->default('');
            $table->string('status', 20)->default('ativo');
            $table->decimal('limite_credito', 18, 2)->default(0);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('nome');
            $table->index('cpf');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
