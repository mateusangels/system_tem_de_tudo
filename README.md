# Tem de Tudo — Sistema de Gestão

Sistema ERP para loja de **material de construção, hidráulica e elétrica**.
Stack: **Laravel 11 + React 18 + Vite + Tailwind + SQLite/MySQL**.

---

## Funcionalidades

- **PDV (Frente de Caixa)** — venda rápida com leitor de código de barras, multi-unidade (UN, M, M², BARRA, ROLO, KG, SC, CX, LATA), multipagamento (dinheiro, débito, crédito, PIX), cupom não fiscal, controle de caixa (abertura/fechamento), funciona offline.
- **Produtos** — cadastro com SKU, referência do fabricante, marca, categoria, **localização física na loja** (corredor/prateleira), preço varejo + atacado, estoque mínimo.
- **Estoque** — movimentações (entrada/saída/ajuste), inventário, alerta de ruptura, valor em estoque.
- **Vendas** — histórico, reimpressão de cupom, cancelamento (admin).
- **Compras** — pedidos a fornecedores, recebimento entra automaticamente no estoque.
- **Clientes** — cadastro CPF/CNPJ, limite de crediário, histórico.
- **Financeiro** — entradas, ticket médio, recebimentos por forma de pagamento.
- **Relatórios** — vendas por operador, produtos mais vendidos, evolução mensal.
- **Mensalidade** — cobrança mensal do sistema (admin cobra do dono da loja). Dono vê QR Code PIX; admin marca como pago e a licença é estendida +30 dias.

**O que NÃO tem (por escopo):** emissão de NF-e/NFC-e, CFOP, ICMS, NCM, manifestação SEFAZ. Apenas cupom não fiscal.

---

## Trial e mensalidade

- Ao criar a conta do dono, define-se `trial_inicio = now()` e `trial_fim = now() + 7 dias`.
- Durante o trial todas as telas operacionais ficam liberadas.
- No fim do trial, sem licença ativa, o sistema bloqueia tudo exceto a tela **Mensalidade**, onde ele vê:
  - QR Code PIX do administrador (configurável em `/admin/configuracoes`)
  - Valor mensal (padrão R$ 180,00, configurável)
  - Botão pra copiar PIX
  - Histórico de mensalidades
- O admin entra em `/admin/pagamentos`, marca a mensalidade como paga e a licença avança +30 dias automaticamente.

---

## Usuários iniciais (após `php artisan migrate --seed`)

| Papel               | E-mail                              | Senha       | Observação                       |
| ------------------- | ----------------------------------- | ----------- | -------------------------------- |
| **Admin (Mateus)**  | `mateus@temdetudo.com.br`           | `admin123`  | Acesso total, sem trial.         |
| **Dono da loja**    | `lojista@temdetudo.com.br`          | `mudar123`  | Trial de 7 dias começa no seed.  |

**Mude essas senhas após o primeiro login.**

---

## Setup local

```bash
# 1. Dependências
composer install
npm install

# 2. Banco (SQLite local — já configurado no .env)
touch database/database.sqlite
php artisan key:generate
php artisan migrate --seed

# 3. Buildar o frontend (gera public/build/)
npm run build

# 4. Subir o servidor Laravel — serve API + frontend buildado
php artisan serve
```

Abra http://localhost:8000 — entra na tela de login do TEM DE TUDO.

### Como rodar em modo desenvolvimento (com hot reload)

Se for editar código React e quiser ver mudanças sem rebuild:

```bash
# Terminal 1: API Laravel
php artisan serve            # http://localhost:8000

# Terminal 2: Vite dev server (hot reload)
npm run dev                  # http://localhost:5173
```

Abra http://localhost:5173 — Vite faz proxy automaticamente pra API em 8000.

### Importante sobre VITE_API_URL

No `.env`, mantenha `VITE_API_URL=""` (vazio) — o frontend usa `/api` relativo,
funcionando em qualquer ambiente (localhost, IP da rede, domínio em produção).
Só configure se a API estiver em domínio diferente do frontend.

**Lembre de rodar `npm run build` após mudar variáveis VITE_*.**

---

## Deploy na Hostinger

### Pré-requisito

1. **Criar banco MySQL** no hPanel:
   - Bancos de Dados → Gerenciamento → "Criar novo banco"
   - Anota: nome do banco, nome do usuário, senha
2. **SSH habilitado** no hPanel → Avançado → Acesso SSH

### Primeira instalação (manual, via SSH)

```bash
# 1. Conecta no servidor (porta + usuário + IP vêm do hPanel)
ssh -p 65002 u831912804@147.93.38.39

# 2. Vai pra pasta pública do domínio
cd domains/seu-dominio.com.br/public_html
# OU se for subdomínio:
cd domains/dominio-principal.com.br/public_html/subdominio

# 3. Clona o repositório
git clone https://github.com/mateusangels/system_tem_de_tudo.git .

# 4. Configura o .env
cp .env.production.example .env
nano .env            # ajuste DB_DATABASE / DB_USERNAME / DB_PASSWORD / APP_URL

# 5. Roda o deploy automatizado (com --seed na primeira vez)
bash deploy.sh --seed
```

O `deploy.sh` faz tudo: `composer install --no-dev`, `npm ci`, `npm run build`,
`key:generate`, `migrate`, `storage:link`, caches de produção e ajusta permissões.

### Document root

Como o `git clone . ` colocou os arquivos direto em `public_html`, vai ter um
`public/` dentro. Duas opções:

**Opção A — apontar `Document Root` pra `public/`** (preferível, pelo hPanel):
hPanel → Domínios → Avançado → Document Root → `public_html/public`

**Opção B — manter Document Root em `public_html`** e mover só o conteúdo:
```bash
mv public/* public/.* ./
# E ajustar public/index.php pra subir um nível nas paths require
```

(A opção A é mais limpa e não quebra atualizações futuras.)

### Atualizações depois do primeiro deploy

```bash
ssh -p 65002 u831912804@147.93.38.39
cd domains/seu-dominio.com.br/public_html
bash deploy.sh        # SEM --seed (preserva os dados existentes)
```

### Primeiro acesso

1. Acessa o domínio configurado
2. Login admin: `mateus@temdetudo.com.br` / `admin123` → **mude a senha em Perfil**
3. `/admin/configuracoes` → cadastra chave PIX real, QR Code e copia/cola
4. Cria a conta do dono da loja em "Usuários" (ou só passa a senha do `lojista@temdetudo.com.br`)
5. Trial de 7 dias começa contando a partir da criação do usuário

---

## Arquitetura

```
app/
  Http/Controllers/
    AuthController              auth + Sanctum
    DashboardController         resumos e KPIs
    ProdutosController          CRUD + import XLSX
    VendasController            PDV (vendas finalizadas)
    ClientesController          clientes da loja
    EstoqueController           movimentações, ruptura, ajuste
    ComprasController           pedidos + recebimento
    MensalidadesController      cobrança do sistema (admin + minha)
    ConfiguracoesController     chave/valor (pix_dev, loja, sistema)
    RelatoriosController        relatórios completos

  Models/
    User (com trial + licença)
    Profile, UserRole
    Cliente, Produto, Venda, VendaItem
    MovimentacaoEstoque
    Compra, CompraItem, Fornecedor
    Mensalidade, Configuracao

resources/js/
  pages/
    Dashboard, PDV, Produtos, Vendas, Estoque, Compras,
    Clientes, Financeiro, Relatorios, Configuracoes,
    Mensalidade           ← dono vê QR Code do PIX
    AdminPagamentos       ← admin marca pago
    AdminConfiguracoes    ← admin cadastra dados do PIX
    Login, Perfil
```

---

## Trial / Licença — como funciona internamente

- Coluna `trial_fim` em `users`: enquanto `now() < trial_fim`, `emTrial()` retorna `true`.
- Coluna `licenca_ate` em `users`: quando o admin marca uma mensalidade como paga, vira `licenca_ate = max(licenca_ate atual, vencimento) + 30 dias` e `licenca_ativa = true`.
- O frontend recebe `licenca.pode_acessar` em cada `/auth/me`. Se `false`, as rotas operacionais redirecionam pra `/mensalidade`.
- O `AppHeader` mostra um banner durante o trial ("X dias restantes") e em vermelho quando expirado, com link direto pra `/mensalidade`.

---

## Customizações comuns

- **Mudar valor da mensalidade:** Painel admin → Config. PIX → campo "Valor mensalidade". Ou via `.env`: `MENSALIDADE_VALOR`.
- **Mudar dias de trial:** `TRIAL_DIAS` no `.env` (só afeta novos usuários).
- **Mudar cores:** `resources/js/index.css` — variáveis `--primary` (amarelo), `--background`, `--foreground`.
- **Mudar logo:** `public/logo-tdt.svg`.

---

Sistema desenvolvido por **Mateus Angels** — 2026.
