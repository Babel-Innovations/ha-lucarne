#!/usr/bin/env bash
# Deploy custom_components/lucarne_family/ to a running Home Assistant instance
# over SSH/rsync. Config comes from environment variables, sourced from .env at
# the project root if present (see .env.example).
#
# The card bundle ships inside the integration (custom_components/lucarne_family/
# frontend/ha-lucarne.js) and is imported by the loader shim registered on setup, so this script builds
# the frontend first and then rsyncs the whole integration. There is no separate
# card deploy or Lovelace-resource step.
#
# Usage:
#   ./scripts/deploy-integration.sh                  # build + rsync
#   ./scripts/deploy-integration.sh --skip-build     # rsync existing frontend/ as-is
#   ./scripts/deploy-integration.sh --dry-run        # show what would change, no transfer
#   HA_SSH_HOST=ha.lan ./scripts/deploy-integration.sh   # override per-invocation
#
# Required env vars (set in .env or your shell):
#   HA_SSH_HOST         SSH host or user@host (e.g. ha-vm or molant@ha-vm)
#   HA_INTEGRATION_PATH Remote install path, must end in /custom_components/lucarne_family
#                       (e.g. /homeassistant/custom_components/lucarne_family)
#
# After a successful deploy, HA must be restarted for the integration to reload.
# To restart, run:
#   ha_restart  (via the HA MCP tool)
# or from the HA UI: Settings → System → Restart

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -f "$ROOT_DIR/.env" ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    case "$key" in
      ''|\#*) continue ;;
    esac
    if [ -z "${!key:-}" ]; then
      value="${value%\"}"; value="${value#\"}"
      value="${value%\'}"; value="${value#\'}"
      export "$key=$value"
    fi
  done < "$ROOT_DIR/.env"
fi

DRY_RUN=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help)
      awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown flag: $arg${NC}" >&2
      exit 2
      ;;
  esac
done

: "${HA_SSH_HOST:?Set HA_SSH_HOST in .env (see .env.example)}"
: "${HA_INTEGRATION_PATH:?Set HA_INTEGRATION_PATH in .env (see .env.example)}"

# Guard: refuse to rsync --delete against a path that doesn't end in the
# integration's own directory. A typo like /homeassistant/custom_components
# would wipe every other custom integration on the remote.
case "$HA_INTEGRATION_PATH" in
  */custom_components/lucarne_family|*/custom_components/lucarne_family/) ;;
  *)
    echo -e "${RED}Refusing: HA_INTEGRATION_PATH must end in /custom_components/lucarne_family${NC}" >&2
    echo "  got: $HA_INTEGRATION_PATH" >&2
    echo "  this guard exists because rsync --delete would otherwise nuke whatever lives at the wrong path." >&2
    exit 2
    ;;
esac

SOURCE="$ROOT_DIR/custom_components/lucarne_family/"
if [ ! -d "$SOURCE" ]; then
  echo -e "${RED}Source not found: $SOURCE${NC}" >&2
  exit 1
fi

# Build the card bundle into the integration's frontend/ dir so the deployed
# integration carries the latest cards.
if [ "$SKIP_BUILD" = "0" ]; then
  echo "Building frontend bundle (npm run build)..."
  (cd "$ROOT_DIR" && npm run build)
fi
# Both artifacts, not just the bundle: async_setup registers a static path for
# each, and a deploy missing the loader silently loses the only thing that can
# report a bundle which fails to parse (#101).
for artifact in ha-lucarne.js ha-lucarne-loader.js; do
  if [ ! -f "$SOURCE/frontend/$artifact" ]; then
    echo -e "${RED}Missing $SOURCE/frontend/$artifact — run without --skip-build${NC}" >&2
    exit 1
  fi
done

echo -e "${GREEN}=========================================${NC}"
echo "Deploying custom_components/lucarne_family/ to ${HA_SSH_HOST}:${HA_INTEGRATION_PATH}"
if [ "$DRY_RUN" = "1" ]; then
  echo -e "  ${YELLOW}(dry run — no files will be transferred)${NC}"
fi
echo -e "${GREEN}=========================================${NC}"

RSYNC_ARGS=(-avz --delete --exclude='.DS_Store' --exclude='__pycache__/' --exclude='*.pyc')
if [ "$DRY_RUN" = "1" ]; then
  RSYNC_ARGS+=(--dry-run)
fi

rsync "${RSYNC_ARGS[@]}" \
  "$SOURCE" \
  "${HA_SSH_HOST}:${HA_INTEGRATION_PATH}/"

if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo -e "${YELLOW}Dry run complete — no files transferred.${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deploy complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "HA must be restarted for the integration to reload."
echo "To restart, ask Claude (with HA MCP) to run:"
echo "  ha_restart"
