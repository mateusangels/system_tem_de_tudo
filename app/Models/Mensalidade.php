<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Mensalidade extends Model
{
    use HasUuids;

    protected $table = 'mensalidades';

    protected $fillable = [
        'id', 'user_id', 'valor', 'referencia', 'vencimento',
        'paga_em', 'status', 'forma_pagamento', 'observacao',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'referencia' => 'date',
        'vencimento' => 'date',
        'paga_em' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function estaAtrasada(): bool
    {
        if ($this->status !== 'pendente') return false;
        return now()->startOfDay()->gt($this->vencimento);
    }
}
