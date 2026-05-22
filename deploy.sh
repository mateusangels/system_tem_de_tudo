#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Deploy do Tem de Tudo na Hostinger (ou qualquer servidor Linux)
#
# Uso na primeira instalação:
#   git clone https://github.com/mateusangels/system_tem_de_tudo.git
#   cd system_tem_de_tudo
#   cp .env.production.example .env
#   nano .env       # ajuste APP_KEY (gere abaixo) e confira o DB
#   bash deploy.sh
#
# Uso em deploys seguintes (após git push):
#   bash deploy.sh
# ────────────────────────────────────────────────────────────────
set -e

echo "=== Tem de Tudo · Deploy ==="
echo

# 1. Atualiza código se for repo git já existente
if [ -d .git ]; then
  echo "▸ git pull"
  git pull --rebase
fi

# 2. Dependências PHP (sem devDeps em produção)
echo "▸ composer install"
composer install --no-dev --optimize-autoloader --no-interaction

# 3. Dependências JS + build do frontend
echo "▸ npm ci"
npm ci --no-fund --no-audit
echo "▸ npm run build"
npm run build

# 4. Gera APP_KEY se ainda não tiver
if ! grep -q "^APP_KEY=base64:" .env; then
  echo "▸ php artisan key:generate"
  php artisan key:generate --force
fi

# 5. Migrations (preserva dados existentes)
echo "▸ php artisan migrate --force"
php artisan migrate --force

# 6. Roda seed da primeira vez (cria admin Mateus + dono lojista)
if [ "$1" = "--seed" ]; then
  echo "▸ php artisan db:seed --force  (primeira instalação)"
  php artisan db:seed --force
fi

# 7. Storage simbólico (uploads, logos custom etc)
if [ ! -L public/storage ]; then
  echo "▸ php artisan storage:link"
  php artisan storage:link
fi

# 8. Caches de produção (config + rotas + views)
echo "▸ otimizações de produção"
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 9. Permissões
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo
echo "✅ Deploy concluído!"
echo
echo "Acesse: $(grep ^APP_URL .env | cut -d= -f2-)"
