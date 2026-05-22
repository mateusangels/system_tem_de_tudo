<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MovimentacaoEstoque extends Model
{
    use HasUuids;

    protected $table = 'movimentacoes_estoque';

    protected $fillable = [
        'id', 'produto_id', 'tipo', 'motivo', 'quantidade',
        'estoque_antes', 'estoque_depois', 'custo_unitario',
        'referencia_id', 'referencia_tipo', 'user_id', 'observacao',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'estoque_antes' => 'decimal:3',
        'estoque_depois' => 'decimal:3',
        'custo_unitario' => 'decimal:2',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
