#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Deploy do Tem de Tudo na Hostinger (ou qualquer servidor Linux)
#
# Hospedagem compartilhada (CloudLinux/CageFS) não habilita as mesmas
# extensões no CLI do PHP que estão ativas no FPM. Esse script detecta
# quais extensões precisam ser carregadas via -d extension=... e monta
# uma variável $PHP com todas elas.
#
# Uso na primeira instalação:
#   git clone https://github.com/mateusangels/system_tem_de_tudo.git .
#   cp .env.production.example .env
#   nano .env                   # ajuste se necessário
#   bash deploy.sh --seed
#
# Uso em deploys seguintes:
#   bash deploy.sh
# ────────────────────────────────────────────────────────────────
set -e

echo "=== Tem de Tudo · Deploy ==="
echo

# ────────────────────────────────────────────────
# Detecta extensões PHP que precisam ser carregadas via -d
# ────────────────────────────────────────────────
NEEDED_EXTS="pdo pdo_mysql mysqli dom mbstring bcmath fileinfo gd"
EXT_PATHS=(
  "/opt/alt/php83/usr/lib64/php/modules"
  "/opt/alt/php82/usr/lib64/php/modules"
  "/opt/cpanel/ea-php83/root/usr/lib64/php/modules"
  "/usr/lib64/php/modules"
)

PHP_DASH_D=""
for ext in $NEEDED_EXTS; do
  if ! php -m 2>/dev/null | grep -qiE "^${ext}$"; then
    for dir in "${EXT_PATHS[@]}"; do
      if [ -f "$dir/${ext}.so" ]; then
        PHP_DASH_D="$PHP_DASH_D -d extension=$dir/${ext}.so"
        break
      fi
    done
  fi
done

# PHP "decorado" com extensões — usado em TODOS os comandos artisan
PHP="php $PHP_DASH_D"

if [ -n "$PHP_DASH_D" ]; then
  echo "▸ Carregando extensões PHP extras (CLI compartilhado)"
fi

# ────────────────────────────────────────────────
# 1. Atualiza código
# ────────────────────────────────────────────────
if [ -d .git ]; then
  echo "▸ git pull"
  git pull --rebase
fi

# ────────────────────────────────────────────────
# 2. Dependências PHP (vendor/ commitado tem prioridade)
# ────────────────────────────────────────────────
if [ -d vendor ] && [ -f vendor/autoload.php ]; then
  echo "▸ vendor/ encontrado — pulando composer install"
elif command -v composer >/dev/null 2>&1; then
  echo "▸ composer install"
  composer install --no-dev --optimize-autoloader --no-interaction
else
  echo "✗ Nem vendor/ nem composer disponível."
  exit 1
fi

# ────────────────────────────────────────────────
# 3. Build frontend (public/build/ commitado tem prioridade)
# ────────────────────────────────────────────────
if [ -d public/build ] && [ -f public/build/manifest.json ]; then
  echo "▸ public/build/ encontrado — pulando npm"
elif command -v npm >/dev/null 2>&1; then
  echo "▸ npm ci + build"
  npm ci --no-fund --no-audit
  npm run build
else
  echo "✗ Nem public/build/ nem npm disponível."
  exit 1
fi

# ────────────────────────────────────────────────
# 4. APP_KEY (gera se não tiver)
# ────────────────────────────────────────────────
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
  echo "▸ APP_KEY: gerando manualmente"
  CHAVE="base64:$($PHP -r 'echo base64_encode(random_bytes(32));')"
  # Substitui APP_KEY= ou adiciona se não tiver
  if grep -q "^APP_KEY=" .env; then
    sed -i "s|^APP_KEY=.*|APP_KEY=$CHAVE|" .env
  else
    echo "APP_KEY=$CHAVE" >> .env
  fi
fi

# ────────────────────────────────────────────────
# 5. Migrations
# ────────────────────────────────────────────────
echo "▸ artisan migrate --force"
$PHP artisan migrate --force

# ────────────────────────────────────────────────
# 6. Seed só na primeira instalação
# ────────────────────────────────────────────────
if [ "$1" = "--seed" ]; then
  echo "▸ artisan db:seed --force"
  $PHP artisan db:seed --force
fi

# ────────────────────────────────────────────────
# 7. Link de storage
# ────────────────────────────────────────────────
if [ ! -L public/storage ]; then
  echo "▸ artisan storage:link"
  $PHP artisan storage:link || true
fi

# ────────────────────────────────────────────────
# 8. Caches de produção
# ────────────────────────────────────────────────
echo "▸ otimizações de produção"
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache

# ────────────────────────────────────────────────
# 9. Permissões
# ────────────────────────────────────────────────
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo
echo "✅ Deploy concluído!"
URL=$(grep ^APP_URL .env 2>/dev/null | cut -d= -f2- | tr -d '"')
echo "Acesse: $URL"
