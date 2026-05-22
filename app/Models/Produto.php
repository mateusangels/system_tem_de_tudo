<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Produto extends Model
{
    use HasUuids;

    protected $table = 'produtos';

    protected $fillable = [
        'id', 'codigo_barras', 'codigo_interno', 'referencia_fabricante', 'descricao',
        'preco_custo', 'preco_venda', 'preco_atacado', 'qtd_minima_atacado',
        'unidade', 'ativo', 'categoria', 'marca', 'localizacao',
        'estoque_minimo', 'estoque_atual', 'movimenta_estoque', 'observacao',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'movimenta_estoque' => 'boolean',
        'preco_custo' => 'decimal:2',
        'preco_venda' => 'decimal:2',
        'preco_atacado' => 'decimal:2',
        'estoque_atual' => 'decimal:3',
    ];

    public function vendaItens()
    {
        return $this->hasMany(VendaItem::class);
    }
}
