<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
        'trial_inicio',
        'trial_fim',
        'licenca_ativa',
        'licenca_ate',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'trial_inicio' => 'datetime',
            'trial_fim' => 'datetime',
            'licenca_ate' => 'datetime',
            'licenca_ativa' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    public function roles()
    {
        return $this->hasMany(UserRole::class);
    }

    public function mensalidades()
    {
        return $this->hasMany(Mensalidade::class);
    }

    public function isAdmin(): bool
    {
        return $this->roles()->where('role', 'admin')->exists();
    }

    /** Está em período de trial (e ainda não expirou)? */
    public function emTrial(): bool
    {
        if (!$this->trial_fim) return false;
        return now()->lt($this->trial_fim);
    }

    /** Trial existiu e expirou */
    public function trialExpirado(): bool
    {
        if (!$this->trial_fim) return false;
        return now()->gte($this->trial_fim);
    }

    /** Dias restantes de trial (0 se expirado ou sem trial) */
    public function diasRestantesTrial(): int
    {
        if (!$this->emTrial()) return 0;
        return (int) max(0, ceil(now()->diffInDays($this->trial_fim, false)));
    }

    /** Licença ativa cobrindo o momento atual? */
    public function temLicencaAtiva(): bool
    {
        if (!$this->licenca_ativa) return false;
        if (!$this->licenca_ate) return false;
        return now()->lte($this->licenca_ate);
    }

    /** Pode usar o sistema? Admin sempre pode; dono precisa de trial OU licença */
    public function podeAcessar(): bool
    {
        if ($this->isAdmin()) return true;
        return $this->emTrial() || $this->temLicencaAtiva();
    }
}
