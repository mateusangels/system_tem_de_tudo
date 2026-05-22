<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Venda extends Model
{
    use HasUuids;

    protected $table = 'vendas';

    public $timestamps = false;

    protected $fillable = [
        'id', 'numero_venda', 'cliente_id', 'operador_id',
        'subtotal', 'desconto_total', 'total', 'valor_pago', 'troco',
        'metodo_pagamento', 'status', 'tipo', 'created_at',
        'vencimento_fiado', 'quitado_em', 'forma_quitacao', 'valor_pago_fiado',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'desconto_total' => 'decimal:2',
        'total' => 'decimal:2',
        'valor_pago' => 'decimal:2',
        'troco' => 'decimal:2',
        'valor_pago_fiado' => 'decimal:2',
        'vencimento_fiado' => 'date',
        'quitado_em' => 'datetime',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function operador()
    {
        return $this->belongsTo(User::class, 'operador_id');
    }

    public function itens()
    {
        return $this->hasMany(VendaItem::class);
    }
}
