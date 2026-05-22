<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    use HasUuids;

    protected $fillable = [
        'id', 'user_id', 'nome', 'email', 'telefone',
        'cargo', 'pin', 'avatar_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
