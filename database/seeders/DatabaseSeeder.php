<?php

namespace Database\Seeders;

use App\Models\Configuracao;
use App\Models\Mensalidade;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // ───────────────────────────────────────────────
            // 1) ADMIN — Mateus (desenvolvedor)
            // ───────────────────────────────────────────────
            $admin = User::firstOrCreate(
                ['email' => 'mateus@temdetudo.com.br'],
                [
                    'name' => 'Mateus Angels',
                    'password' => Hash::make('admin123'),
                    'licenca_ativa' => true,
                    // 2037 é o limite do TIMESTAMP MySQL. Como admin nunca precisa
                    // de licença na prática (isAdmin sempre tem podeAcessar=true),
                    // qualquer data futura serve. Uso 2037 pra ficar dentro do limite.
                    'licenca_ate' => '2037-12-31 23:59:59',
                ]
            );
            Profile::firstOrCreate(['user_id' => $admin->id], [
                'nome' => 'Mateus Angels',
                'email' => $admin->email,
                'telefone' => '',
                'cargo' => 'Administrador',
                'pin' => '3011',
            ]);
            UserRole::firstOrCreate(['user_id' => $admin->id, 'role' => 'admin']);

            // ───────────────────────────────────────────────
            // 2) DONO DA LOJA — cliente do sistema, com trial de 7 dias
            //    começando hoje. Após o trial precisa pagar R$ 180/mês.
            // ───────────────────────────────────────────────
            $diasTrial = (int) env('TRIAL_DIAS', 7);

            $dono = User::firstOrCreate(
                ['email' => 'lojista@temdetudo.com.br'],
                [
                    'name' => 'Dono da Loja',
                    'password' => Hash::make('mudar123'),
                    'trial_inicio' => now(),
                    'trial_fim' => now()->addDays($diasTrial),
                    'licenca_ativa' => false,
                ]
            );
            Profile::firstOrCreate(['user_id' => $dono->id], [
                'nome' => 'Dono da Loja',
                'email' => $dono->email,
                'telefone' => '',
                'cargo' => 'Proprietário',
                'pin' => '',
            ]);
            UserRole::firstOrCreate(['user_id' => $dono->id, 'role' => 'funcionario']);

            // Cria a primeira mensalidade pendente, vencendo no fim do trial
            Mensalidade::firstOrCreate(
                ['user_id' => $dono->id, 'referencia' => now()->startOfMonth()->toDateString()],
                [
                    'valor' => (float) env('MENSALIDADE_VALOR', 180.00),
                    'vencimento' => now()->addDays($diasTrial)->toDateString(),
                    'status' => 'pendente',
                ]
            );

            // ───────────────────────────────────────────────
            // 3) Configurações padrão
            // ───────────────────────────────────────────────
            // Dados do PIX do desenvolvedor (Mateus dos Anjos)
            $qrPath = database_path('seeders/qrcode-base64.txt');
            $qrBase64 = file_exists($qrPath) ? trim(file_get_contents($qrPath)) : '';

            Configuracao::set('pix_chave', '61998221210', 'pix_dev');
            Configuracao::set('pix_titular', 'Mateus dos Anjos', 'pix_dev');
            Configuracao::set('pix_cidade', 'Brasília/DF', 'pix_dev');
            Configuracao::set('pix_copia_cola', '', 'pix_dev');
            Configuracao::set('pix_qr_base64', $qrBase64 ? 'data:image/png;base64,' . $qrBase64 : '', 'pix_dev');
            Configuracao::set('valor_mensalidade', (string) env('MENSALIDADE_VALOR', 180), 'pix_dev');
            Configuracao::set('whatsapp_suporte', '5561998221210', 'pix_dev');
            Configuracao::set('dev_nome', 'Mateus dos Anjos', 'pix_dev');

            // Dados da loja
            Configuracao::set('loja_nome', 'Tem de Tudo', 'loja');
            Configuracao::set('loja_subtitulo', 'Material · Hidráulica · Elétrica', 'loja');
            Configuracao::set('loja_endereco', '', 'loja');
            Configuracao::set('loja_cidade', '', 'loja');
            Configuracao::set('loja_telefone', '', 'loja');
            Configuracao::set('loja_cnpj', '', 'loja');
        });

        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('  TEM DE TUDO — usuários criados');
        $this->command->info('========================================');
        $this->command->info('  Admin (Mateus):');
        $this->command->info('    email:  mateus@temdetudo.com.br');
        $this->command->info('    senha:  admin123');
        $this->command->info('');
        $this->command->info('  Dono da loja (trial 7 dias):');
        $this->command->info('    email:  lojista@temdetudo.com.br');
        $this->command->info('    senha:  mudar123');
        $this->command->info('    trial até: ' . now()->addDays((int) env('TRIAL_DIAS', 7))->format('d/m/Y H:i'));
        $this->command->info('========================================');
        $this->command->info('');
    }
}
