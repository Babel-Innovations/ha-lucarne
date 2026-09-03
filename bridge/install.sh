#!/bin/sh
# Install lucarne-bridge from the latest GitHub release (or a given tag).
#
#   curl -fsSL https://raw.githubusercontent.com/Babel-Innovations/ha-lucarne/main/bridge/install.sh | sh
#   curl -fsSL .../install.sh | sh -s v1.6.0
#
# Downloads the universal binary, verifies its SHA-256 against the published
# checksum, and installs it to /usr/local/bin (or ~/.local/bin when that is
# not writable). Files fetched by curl carry no quarantine flag, so the
# notarized binary runs without a Gatekeeper detour.
set -eu

REPO="Babel-Innovations/ha-lucarne"
TAG="${1:-latest}"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "lucarne-bridge runs on macOS only (it reads Reminders through EventKit)." >&2
  exit 1
fi

if [ "$TAG" = "latest" ]; then
  TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)"
  if [ -z "$TAG" ]; then
    echo "Could not determine the latest release of $REPO." >&2
    exit 1
  fi
fi
VERSION="${TAG#v}"
ASSET="lucarne-bridge-${VERSION}-macos-universal.zip"
BASE="https://github.com/$REPO/releases/download/$TAG"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

echo "Downloading lucarne-bridge $VERSION…"
curl -fsSL -o "$ASSET" "$BASE/$ASSET"
curl -fsSL -o "$ASSET.sha256" "$BASE/$ASSET.sha256"
shasum -a 256 -c "$ASSET.sha256" >/dev/null
ditto -x -k "$ASSET" .
[ -x lucarne-bridge ] || { echo "The archive did not contain the lucarne-bridge binary." >&2; exit 1; }

DEST=/usr/local/bin
if [ ! -w "$DEST" ]; then
  DEST="$HOME/.local/bin"
  mkdir -p "$DEST"
fi
install -m 0755 lucarne-bridge "$DEST/lucarne-bridge"
echo "Installed $DEST/lucarne-bridge ($(uname -m))"

case ":$PATH:" in
  *":$DEST:"*) ;;
  *) echo "Note: $DEST is not on your PATH; run it as $DEST/lucarne-bridge or add the directory to PATH." ;;
esac

cat <<MSG

Next: in Home Assistant open Settings → Devices & services → Lucarne Family → Configure
→ Apple Reminders bridge, copy the install line shown there, and run it here, e.g.

  lucarne-bridge install http://homeassistant.local:8123/api/webhook/<id>

Approve the Reminders prompt when macOS shows it.
MSG
