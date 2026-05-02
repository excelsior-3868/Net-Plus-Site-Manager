#!/bin/bash
# =============================================================================
#  NetPlus Manager — Docker Deployment (Environment-Driven)
#  Usage: bash deploy.sh
# =============================================================================

set -e

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
REPO_URL="https://github.com/excelsior-3868/Net-Plus-Site-Manager.git"
APP_DIR="/var/www/netplus"

# Database Defaults
DB_NAME="NetPlusSiteManager"
DB_USER="postgres"
DB_PASSWORD="S@bin@29935"

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}━━━  $1  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ─── PREREQUISITES CHECK ──────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# ─── COLLECT CONFIG ───────────────────────────────────────────────────────────
header "Configuration"

read -rp "  Enter VM IP or domain (e.g. 1.2.3.4): " APP_DOMAIN
[ -z "$APP_DOMAIN" ] && error "Domain/IP cannot be empty."

# ─── STEP 1: CLONE / UPDATE REPO ─────────────────────────────────────────────
header "Step 1 — Update Repository"
if [ -d "$APP_DIR/.git" ]; then
    log "Updating existing repository..."
    git -C "$APP_DIR" pull origin main
else
    log "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
fi

# ─── STEP 2: SETUP .env ───────────────────────────────────────────────────────
header "Step 2 — Configure Environment"
cat > "$APP_DIR/.env" <<EOF
APP_DOMAIN=${APP_DOMAIN}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
success ".env file generated with all DB configurations"

# ─── STEP 3: DEPLOY WITH DOCKER COMPOSE ───────────────────────────────────────
header "Step 3 — Deploying Containers"
cd "$APP_DIR"

if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

$COMPOSE_CMD down || true
$COMPOSE_CMD up -d --build

success "Containers are starting..."

# ─── STEP 4: FIREWALL ─────────────────────────────────────────────────────────
header "Step 4 — Firewall Configuration"
if command -v ufw &>/dev/null; then
    ufw allow 8081/tcp 2>/dev/null || true
    ufw allow 5432/tcp 2>/dev/null || true
    success "UFW ports 8081 and 5432 opened"
fi

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
header "Deployment Complete"
echo -e "  🌐  NetPlus URL:    ${CYAN}http://${APP_DOMAIN}:8081${NC}"
echo -e "  🐘  Postgres DB:    ${CYAN}${DB_NAME}${NC}"
echo -e "  👤  DB Username:    ${CYAN}${DB_USER}${NC}"
echo -e "  🔑  DB Password:    ${CYAN}${DB_PASSWORD}${NC}"
echo -e "  📡  DBeaver Access: ${CYAN}${APP_DOMAIN}:5432${NC}"
echo ""
log "Check logs with:  docker logs -f netplus-manager"
echo ""
