<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class VendaItem extends Model
{
    use HasUuids;

    protected $table = 'venda_itens';

    public $timestamps = false;

    protected $fillable = [
        'id', 'venda_id', 'produto_id', 'codigo_barras', 'descricao',
        'quantidade', 'unidade', 'valor_unitario', 'desconto',
        'valor_total', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'quantidade' => 'decimal:3',
        'valor_unitario' => 'decimal:2',
        'desconto' => 'decimal:2',
        'valor_total' => 'decimal:2',
    ];

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }
}
