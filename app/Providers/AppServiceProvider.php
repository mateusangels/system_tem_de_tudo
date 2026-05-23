<?php

namespace App\Providers;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Regra: CPF com dígitos verificadores válidos. Aceita string vazia/null (use 'required' separado).
        Validator::extend('cpf_valido', function ($attribute, $value, $parameters, $validator) {
            if ($value === null || $value === '') return true;
            return self::cpfValido((string) $value);
        }, 'O CPF informado não é válido.');

        // Regra: CNPJ com dígitos verificadores válidos. Aceita string vazia/null.
        Validator::extend('cnpj_valido', function ($attribute, $value, $parameters, $validator) {
            if ($value === null || $value === '') return true;
            return self::cnpjValido((string) $value);
        }, 'O CNPJ informado não é válido.');
    }

    private static function cpfValido(string $cpf): bool
    {
        $cpf = preg_replace('/\D/', '', $cpf);
        if (strlen($cpf) !== 11) return false;
        // Rejeita sequências repetidas (000.000.000-00, 111.111.111-11, etc)
        if (preg_match('/^(\d)\1{10}$/', $cpf)) return false;

        for ($t = 9; $t < 11; $t++) {
            $d = 0;
            for ($c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) return false;
        }
        return true;
    }

    private static function cnpjValido(string $cnpj): bool
    {
        $cnpj = preg_replace('/\D/', '', $cnpj);
        if (strlen($cnpj) !== 14) return false;
        if (preg_match('/^(\d)\1{13}$/', $cnpj)) return false;

        $tamanhos = [12, 13];
        $multipladores = [
            12 => [5,4,3,2,9,8,7,6,5,4,3,2],
            13 => [6,5,4,3,2,9,8,7,6,5,4,3,2],
        ];

        foreach ($tamanhos as $tamanho) {
            $soma = 0;
            for ($i = 0; $i < $tamanho; $i++) {
                $soma += (int) $cnpj[$i] * $multipladores[$tamanho][$i];
            }
            $resto = $soma % 11;
            $dv = $resto < 2 ? 0 : 11 - $resto;
            if ((int) $cnpj[$tamanho] !== $dv) return false;
        }
        return true;
    }
}
