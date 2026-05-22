<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserRole;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'users:make-admin {emails* : Emails dos usuários a promover}';

    protected $description = 'Adiciona role admin para um ou mais usuários (idempotente)';

    public function handle(): int
    {
        $emails = $this->argument('emails');
        $ok = 0;
        $jaEra = 0;
        $naoAcharam = [];

        foreach ($emails as $email) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                $naoAcharam[] = $email;
                continue;
            }

            $existe = UserRole::where('user_id', $user->id)->where('role', 'admin')->exists();
            if ($existe) {
                $this->line("• {$email}: já era admin");
                $jaEra++;
                continue;
            }

            UserRole::create(['user_id' => $user->id, 'role' => 'admin']);
            $this->info("✓ {$email}: promovido a admin");
            $ok++;
        }

        foreach ($naoAcharam as $email) {
            $this->error("✗ {$email}: usuário não encontrado");
        }

        $this->newLine();
        $this->info("Resumo: {$ok} promovidos, {$jaEra} já eram, ".count($naoAcharam).' não encontrados');

        return count($naoAcharam) > 0 ? self::FAILURE : self::SUCCESS;
    }
}
