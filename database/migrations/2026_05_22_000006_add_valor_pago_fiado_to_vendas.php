<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * valor_pago_fiado acumula pagamentos parciais de uma venda fiada.
     * Quando valor_pago_fiado >= total, a venda é considerada quitada.
     */
    public function up(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->decimal('valor_pago_fiado', 18, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->dropColumn('valor_pago_fiado');
        });
    }
};
