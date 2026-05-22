<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasUuids;

    protected $table = 'clientes';

    protected $fillable = [
        'id', 'codigo_interno', 'nome', 'cpf', 'telefone',
        'status', 'limite_credito', 'created_by',
    ];

    protected $casts = [
        'limite_credito' => 'decimal:2',
    ];

    public function vendas()
    {
        return $this->hasMany(Venda::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
