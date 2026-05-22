<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Configuracao extends Model
{
    protected $table = 'configuracoes';
    protected $primaryKey = 'chave';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['chave', 'valor', 'grupo'];

    public static function get(string $chave, ?string $default = null): ?string
    {
        $cfg = static::find($chave);
        return $cfg ? $cfg->valor : $default;
    }

    public static function set(string $chave, ?string $valor, string $grupo = 'geral'): void
    {
        static::updateOrCreate(
            ['chave' => $chave],
            ['valor' => $valor, 'grupo' => $grupo]
        );
    }

    public static function porGrupo(string $grupo): array
    {
        return static::where('grupo', $grupo)->pluck('valor', 'chave')->toArray();
    }
}
