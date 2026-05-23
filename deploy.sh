#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Deploy do Tem de Tudo na Hostinger (ou qualquer servidor Linux)
#
# Hospedagem compartilhada (Hostinger) NÃO tem node/npm. Por isso o
# public/build/ é commitado no repo (build feito localmente) e esse
# script pula a etapa npm se não encontrar o binário.
#
# Uso na primeira instalação:
#   git clone https://github.com/mateusangels/system_tem_de_tudo.git .
#   cp .env.production.example .env
#   nano .env                # ajuste se necessário
#   bash deploy.sh --seed
#
# Uso em deploys seguintes:
#   bash deploy.sh
# ────────────────────────────────────────────────────────────────
set -e

echo "=== Tem de Tudo · Deploy ==="
echo

# 1. Atualiza código se for repo git existente
if [ -d .git ]; then
  echo "▸ git pull"
  git pull --rebase
fi

# 2. Dependências PHP
# Prioriza vendor/ commitado (Hostinger compartilhada quebra composer por falta de phar).
# Só roda composer install se NÃO houver vendor/.
if [ -d vendor ] && [ -f vendor/autoload.php ]; then
  echo "▸ vendor/ encontrado — pulando composer install"
elif command -v composer >/dev/null 2>&1; then
  echo "▸ composer install"
  composer install --no-dev --optimize-autoloader --no-interaction
else
  echo "✗ Nem vendor/ nem composer disponível. Faça composer install local e commite vendor/."
  exit 1
fi

# 3. Build do frontend (só se tiver node — caso contrário usa o build commitado)
if command -v npm >/dev/null 2>&1; then
  echo "▸ npm ci + build"
  npm ci --no-fund --no-audit
  npm run build
elif [ -d public/build ]; then
  echo "▸ npm indisponível — usando public/build/ commitado no repo"
else
  echo "✗ npm não encontrado e public/build/ não existe."
  echo "  Build local com 'npm run build' e commite a pasta public/build."
  exit 1
fi

# 4. Gera APP_KEY se ainda não tiver
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
  echo "▸ php artisan key:generate"
  php artisan key:generate --force
fi

# 5. Migrations
echo "▸ php artisan migrate --force"
php artisan migrate --force

# 6. Seed só na primeira instalação
if [ "$1" = "--seed" ]; then
  echo "▸ php artisan db:seed --force  (primeira instalação)"
  php artisan db:seed --force
fi

# 7. Link de storage (uploads)
if [ ! -L public/storage ]; then
  echo "▸ php artisan storage:link"
  php artisan storage:link || true
fi

# 8. Caches de produção
echo "▸ otimizações de produção"
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 9. Permissões (silencioso — pode falhar em ambiente compartilhado)
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo
echo "✅ Deploy concluído!"
URL=$(grep ^APP_URL .env 2>/dev/null | cut -d= -f2- | tr -d '"')
echo "Acesse: $URL"
