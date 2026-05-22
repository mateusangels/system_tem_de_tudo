<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ImportSupabase extends Command
{
    protected $signature = 'import:supabase
                            {file : Caminho do backup.json gerado pelo sistema antigo}
                            {--fresh : Apaga as tabelas antes de importar (ideal pro cutover)}
                            {--password= : Senha padrão dos usuários criados (default: env IMPORT_DEFAULT_PASSWORD ou "trocarsenha")}';

    protected $description = 'Importa backup JSON do Supabase preservando UUIDs, valida contagens';

    public function handle(): int
    {
        $path = $this->argument('file');
        if (! is_file($path)) {
            $this->error("Arquivo não encontrado: {$path}");

            return self::FAILURE;
        }

        $this->info("Lendo {$path}...");
        $raw = file_get_contents($path);
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || empty($data['metadata']['table_order'])) {
            $this->error('JSON inválido ou sem metadata.table_order: '.json_last_error_msg());

            return self::FAILURE;
        }

        $tableOrder = $data['metadata']['table_order'];
        $stats = $data['stats'] ?? [];
        $tables = $data['tables'] ?? [];

        $this->line('Source: '.($data['metadata']['source'] ?? 'n/a'));
        $this->line('Exported: '.($data['metadata']['exported_at'] ?? 'n/a'));
        $this->line('Total: '.array_sum($stats).' registros em '.count($tableOrder).' tabelas');

        $defaultPassword = $this->option('password') ?: env('IMPORT_DEFAULT_PASSWORD', 'trocarsenha');
        $passwordHash = Hash::make($defaultPassword);

        try {
            DB::transaction(function () use ($tableOrder, $tables, $passwordHash) {
                if ($this->option('fresh')) {
                    $this->warn('--fresh ativo: limpando tabelas (DELETE)');
                    foreach (array_reverse($tableOrder) as $t) {
                        if (Schema::hasTable($t)) {
                            DB::table($t)->delete();
                        }
                    }
                    DB::table('profiles')->delete();
                    DB::table('user_roles')->delete();
                    DB::table('users')->delete();
                }

                foreach ($tableOrder as $table) {
                    $rows = $tables[$table] ?? [];
                    if (empty($rows)) {
                        $this->line("→ {$table}: 0 registros (vazio)");

                        continue;
                    }

                    if ($table === 'profiles') {
                        $this->importProfiles($rows, $passwordHash);

                        continue;
                    }

                    $columns = Schema::getColumnListing($table);
                    $normalized = array_map(fn ($r) => $this->normalizeRow($r, $columns), $rows);
                    $count = count($normalized);

                    foreach (array_chunk($normalized, 200) as $chunk) {
                        DB::table($table)->insert($chunk);
                    }
                    $this->line("→ {$table}: {$count} registros");
                }
            });
        } catch (\Throwable $e) {
            $this->error('Falha durante import (rollback aplicado): '.$e->getMessage());
            $this->line($e->getTraceAsString());

            return self::FAILURE;
        }

        $this->info('');
        $this->info('=== Validação de contagens ===');
        $allOk = true;
        foreach ($stats as $t => $expected) {
            if (! Schema::hasTable($t)) {
                continue;
            }
            $actual = DB::table($t)->count();
            $ok = (int) $actual === (int) $expected;
            $icon = $ok ? '✓' : '✗';
            $this->line(sprintf('%s %-25s %d / %d', $icon, $t, $actual, $expected));
            if (! $ok) {
                $allOk = false;
            }
        }
        $usersCount = DB::table('users')->count();
        $this->line(sprintf('  %-25s %d (criados a partir de profiles)', 'users', $usersCount));

        if (! $allOk) {
            $this->error('Import com inconsistências nas contagens.');

            return self::FAILURE;
        }

        $this->info('');
        $this->info('Import concluído com sucesso.');
        $this->warn("Senha padrão dos usuários: '{$defaultPassword}' — peça pra trocarem no primeiro login.");

        return self::SUCCESS;
    }

    protected function importProfiles(array $profiles, string $passwordHash): void
    {
        $userColumns = Schema::getColumnListing('users');
        $profileColumns = Schema::getColumnListing('profiles');

        $users = [];
        $profileRows = [];
        $seenEmails = [];

        foreach ($profiles as $p) {
            $createdAt = $this->parseTs($p['created_at'] ?? null) ?? now()->format('Y-m-d H:i:s');
            $updatedAt = $this->parseTs($p['updated_at'] ?? null) ?? $createdAt;

            $email = $p['email'] ?: ($p['user_id'].'@migrated.local');
            if (isset($seenEmails[$email])) {
                $email = $p['user_id'].'-'.$email;
            }
            $seenEmails[$email] = true;

            $userRow = $this->filterRow([
                'id' => $p['user_id'],
                'name' => $p['nome'] ?: $email,
                'email' => $email,
                'password' => $passwordHash,
                'created_at' => $createdAt,
                'updated_at' => $updatedAt,
            ], $userColumns);

            $users[] = $userRow;
            $profileRows[] = $this->normalizeRow($p, $profileColumns);
        }

        foreach (array_chunk($users, 200) as $chunk) {
            DB::table('users')->insert($chunk);
        }
        foreach (array_chunk($profileRows, 200) as $chunk) {
            DB::table('profiles')->insert($chunk);
        }
        $this->line('→ profiles: '.count($profileRows).' registros (+'.count($users).' users)');
    }

    protected function normalizeRow(array $row, array $allowedColumns): array
    {
        $allowed = array_flip($allowedColumns);
        $out = [];
        foreach ($row as $k => $v) {
            if (! isset($allowed[$k])) {
                continue;
            }
            $out[$k] = $this->normalizeValue($v);
        }

        return $out;
    }

    protected function filterRow(array $row, array $allowedColumns): array
    {
        $allowed = array_flip($allowedColumns);

        return array_intersect_key($row, $allowed);
    }

    protected function normalizeValue($v)
    {
        if (is_bool($v)) {
            return $v ? 1 : 0;
        }
        if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}T/', $v)) {
            return $this->parseTs($v);
        }

        return $v;
    }

    protected function parseTs(?string $iso): ?string
    {
        if ($iso === null || $iso === '') {
            return null;
        }
        try {
            return Carbon::parse($iso)->utc()->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }
}
