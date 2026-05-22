<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CompraItem extends Model
{
    use HasUuids;

    protected $table = 'compra_itens';

    protected $fillable = [
        'id', 'compra_id', 'produto_id', 'quantidade', 'custo_unitario', 'total',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'custo_unitario' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }
}
