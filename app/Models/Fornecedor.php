<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Fornecedor extends Model
{
    use HasUuids;

    protected $table = 'fornecedores';

    protected $fillable = [
        'id', 'nome', 'cnpj', 'telefone', 'email',
        'contato', 'endereco', 'observacao', 'ativo',
    ];

    protected $casts = [
        'ativo' => 'boolean',
    ];

    public function compras()
    {
        return $this->hasMany(Compra::class);
    }
}
