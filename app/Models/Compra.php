<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    use HasUuids;

    protected $table = 'compras';

    protected $fillable = [
        'id', 'numero', 'fornecedor_id', 'status', 'data_pedido', 'data_recebimento',
        'subtotal', 'frete', 'outros', 'desconto', 'total', 'observacao', 'user_id',
    ];

    protected $casts = [
        'data_pedido' => 'date',
        'data_recebimento' => 'date',
        'subtotal' => 'decimal:2',
        'frete' => 'decimal:2',
        'outros' => 'decimal:2',
        'desconto' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function fornecedor()
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function itens()
    {
        return $this->hasMany(CompraItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
