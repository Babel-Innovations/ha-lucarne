#!/bin/bash

# Creates a GitHub release for ha-lucarne with automatic semantic versioning
# based on conventional commits since the last `bump:` commit — or, in a repo
# that has none, since the newest stable tag. See scripts/lib/version.sh.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Conventional-commit version derivation, shared with create-prerelease.sh so a
# pre-release tag and the stable release that follows it can never disagree
# about which version is next.
# shellcheck source=scripts/lib/version.sh
. "${REPO_DIR}/scripts/lib/version.sh"

# The card bundle ships inside the integration (HACS pulls the repo at the tag),
# so it is committed, not uploaded as a release asset.
BUNDLE="custom_components/lucarne_family/frontend/ha-lucarne.js"

# HACS/HA report the integration version from manifest.json's "version" key, so it
# must track package.json. npm version only bumps package.json; we sync this too.
MANIFEST="custom_components/lucarne_family/manifest.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_error()   { echo -e "${RED}Error: $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_info()    { echo -e "${YELLOW}ℹ $1${NC}"; }

# ----------------------------------------------------------------------------
# Branch-protection helpers
#
# This script pushes the bump commit + tag directly to the release branch. If
# that branch has "required status checks" protection, a direct push of a fresh
# commit is rejected (the new commit hasn't passed checks yet). We temporarily
# clear the required contexts around the push and restore them via an EXIT trap,
# so protection is always re-applied — even on failure or Ctrl-C. Restore uses
# PATCH (never DELETE), so the resource always exists and restore can't 404.
# ----------------------------------------------------------------------------

PROTECTION_BRANCH=""
PROTECTION_SAVED=""
PROTECTION_LIFTED=0

restore_protection() {
    [ "$PROTECTION_LIFTED" -eq 1 ] || return 0
    [ -n "$PROTECTION_SAVED" ] && [ -f "$PROTECTION_SAVED" ] || return 0
    log_info "Restoring required status checks on ${PROTECTION_BRANCH}..."
    if gh api -X PATCH \
        "repos/${REPO_SLUG}/branches/${PROTECTION_BRANCH}/protection/required_status_checks" \
        --input "$PROTECTION_SAVED" >/dev/null 2>&1; then
        log_success "Branch protection restored"
        PROTECTION_LIFTED=0
        rm -f "$PROTECTION_SAVED"
    else
        log_error "FAILED to restore branch protection on ${PROTECTION_BRANCH}!"
        log_error "Re-apply it manually; saved config is at: ${PROTECTION_SAVED}"
    fi
}
trap restore_protection EXIT

# lift_protection <branch>: prompt, then clear required status-check contexts so
# the release commit/tag can be pushed directly. No-op (returns 0) if the branch
# has no required status checks.
lift_protection() {
    local branch="$1"
    PROTECTION_BRANCH="$branch"

    # Save strict + the app-pinned `checks` array. `checks` is the superset of
    # the legacy `contexts` list (each entry carries context + app_id), so
    # PATCHing it back faithfully restores both plain and app-pinned required
    # checks. We deliberately omit `contexts` to avoid sending two overlapping
    # representations in the restore body.
    local saved
    saved=$(gh api "repos/${REPO_SLUG}/branches/${branch}/protection/required_status_checks" \
        --jq '{strict: .strict, checks: .checks}' 2>/dev/null || echo "")
    if [ -z "$saved" ]; then
        log_info "No required status checks on '${branch}' — no protection lift needed."
        return 0
    fi

    echo ""
    log_info "Branch '${branch}' has required status checks that block direct pushes."
    echo "  They must be lifted briefly to push the release commit + tag, then"
    echo "  re-applied immediately afterward (automatic, via an exit trap)."
    # `|| reply=""` keeps `set -e` from aborting the script when stdin is not a
    # TTY (CI/piped): EOF then takes the explicit decline path below.
    local reply=""
    read -r -p "Temporarily lift branch protection on '${branch}' to release? [y/N] " reply || reply=""
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
        log_error "Aborted (declined or non-interactive). Nothing pushed; protection untouched."
        exit 1
    fi

    PROTECTION_SAVED=$(mktemp)
    echo "$saved" > "$PROTECTION_SAVED"
    if echo '{"strict": false, "contexts": []}' | gh api -X PATCH \
        "repos/${REPO_SLUG}/branches/${branch}/protection/required_status_checks" \
        --input - >/dev/null 2>&1; then
        PROTECTION_LIFTED=1
        log_success "Branch protection lifted (will auto-restore on exit)"
    else
        log_error "Failed to lift branch protection. Are you a repo admin?"
        rm -f "$PROTECTION_SAVED"
        PROTECTION_SAVED=""
        exit 1
    fi
}

# ============================================================================
# 1. VALIDATION
# ============================================================================

log_info "Running validation checks..."

if [ -n "$(git status --porcelain)" ]; then
    log_error "Working tree is dirty. Commit or stash changes before creating a release."
    git status --short
    exit 1
fi

if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Install: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI. Run: gh auth login"
    exit 1
fi

# Used by the branch-protection helpers (and restore trap) below.
REPO_SLUG=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

if [ ! -f "$BUNDLE" ]; then
    log_error "$BUNDLE not found. Run 'npm run build' first."
    exit 1
fi

log_success "All validation checks passed"

# ============================================================================
# 2. DETERMINE VERSION BUMP
# ============================================================================

log_info "Calculating version bump..."

CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")

# The subjects are needed twice over: to pick the bump type here, and to build
# the changelog entry in step 3 below.
FILTERED_COMMITS=$(commits_since_last_bump)

# Unlike create-prerelease.sh — which tags a build for device testing and so has
# to produce a version even for a docs-only tree — a stable release with nothing
# release-worthy behind it is a no-op.
if [ -z "$FILTERED_COMMITS" ]; then
    log_info "Nothing to release (no commits since last version)"
    exit 0
fi

BUMP_TYPE=$(derive_bump_type "$FILTERED_COMMITS")
NEW_VERSION=$(next_version "$CURRENT_VERSION" "$BUMP_TYPE")

log_success "Version: $CURRENT_VERSION → $NEW_VERSION (bump type: $BUMP_TYPE)"

# ============================================================================
# 3. GENERATE CHANGELOG ENTRY
# ============================================================================

log_info "Generating changelog entry..."

CHANGELOG_DATE=$(date +"%Y-%m-%d")
CHANGELOG_ENTRY="## v${NEW_VERSION} — ${CHANGELOG_DATE}"

BREAKING=$(echo "$FILTERED_COMMITS" | grep -E "^(breaking|BREAKING CHANGE)(\([^)]*\))?:" || echo "")
if [ -n "$BREAKING" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Breaking Changes:**"
    while IFS= read -r c; do
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- $(echo "$c" | sed -E 's/^(breaking|BREAKING CHANGE)(\([^)]*\))?:\s*//')"
    done <<< "$BREAKING"
fi

FEATURES=$(echo "$FILTERED_COMMITS" | grep -E "^(feat|feature)(\([^)]*\))?:" || echo "")
if [ -n "$FEATURES" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Features:**"
    while IFS= read -r c; do
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- $(echo "$c" | sed -E 's/^(feat|feature)(\([^)]*\))?:\s*//')"
    done <<< "$FEATURES"
fi

FIXES=$(echo "$FILTERED_COMMITS" | grep -E "^(fix|bugfix)(\([^)]*\))?:" || echo "")
if [ -n "$FIXES" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Fixes:**"
    while IFS= read -r c; do
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- $(echo "$c" | sed -E 's/^(fix|bugfix)(\([^)]*\))?:\s*//')"
    done <<< "$FIXES"
fi

# Abort if no release-worthy content was generated (docs/chore/refactor-only commits
# should not produce a silent empty release).
if [ -z "$BREAKING" ] && [ -z "$FEATURES" ] && [ -z "$FIXES" ]; then
    log_info "No breaking changes, features, or fixes found — nothing release-worthy. Skipping."
    exit 0
fi

# ============================================================================
# 4. UPDATE FILES
# ============================================================================

log_info "Updating files..."

npm version --no-git-tag-version "$NEW_VERSION" --allow-same-version

# Sync manifest.json's "version" to match. Surgical line replace (via temp file,
# portable across BSD/GNU sed) so the rest of the manifest is untouched.
if ! grep -qE '"version": *"[^"]+"' "$MANIFEST"; then
    log_error "No \"version\" key found in $MANIFEST — cannot sync manifest version."
    exit 1
fi
sed -E "s/(\"version\": *\")[^\"]+(\")/\1${NEW_VERSION}\2/" "$MANIFEST" > "${MANIFEST}.tmp"
mv "${MANIFEST}.tmp" "$MANIFEST"
log_success "manifest.json version → $NEW_VERSION"

# Insert the new entry below the "# Changelog" H1, preserving the header.
CHANGELOG_TEMP=$(mktemp)
# Emit the H1 header line (first line of CHANGELOG.md) and its trailing blank line.
head -n 1 CHANGELOG.md >> "$CHANGELOG_TEMP"
echo "" >> "$CHANGELOG_TEMP"
# Emit the new entry.
echo "$CHANGELOG_ENTRY" >> "$CHANGELOG_TEMP"
echo "" >> "$CHANGELOG_TEMP"
# Emit the rest of the existing changelog (skip the H1 line already written above).
tail -n +2 CHANGELOG.md >> "$CHANGELOG_TEMP"
mv "$CHANGELOG_TEMP" CHANGELOG.md

log_success "Files updated"

# ============================================================================
# 5. BUILD
# ============================================================================

log_info "Building $BUNDLE..."
npm run build

if [ ! -f "$BUNDLE" ]; then
    log_error "Build failed — $BUNDLE not created"
    exit 1
fi

BUNDLE_SIZE=$(wc -c < "$BUNDLE")
BUNDLE_SIZE_KIB=$((BUNDLE_SIZE / 1024))
# Budget is on the raw bundle, measured in KiB like BUNDLE_SIZE_KIB above:
# ~367 KiB / ~83 KiB gzipped since build.target was pinned to the ES2020 browser
# floor in #101 (the pin costs ~7 KiB). That leaves ~33 KiB against the 400 limit.
if [ "$BUNDLE_SIZE_KIB" -gt 400 ]; then
    log_error "Bundle size ${BUNDLE_SIZE_KIB} KiB exceeds 400 KiB limit"
    exit 1
fi
log_success "Build complete (${BUNDLE_SIZE_KIB} KiB)"

# The release path commits and pushes these exact bytes, so it needs the same
# browser-floor gate CI applies — a bundle that parses only as ES2022 bricks every
# card on iPadOS 15 / Tizen 6.5 with no recoverable error (issue #101).
log_info "Verifying bundle parses at the supported browser floor..."
if ! GUARD_OUTPUT=$(node --import tsx --test tests/build/bundle-syntax.test.ts 2>&1); then
    log_error "Bundle syntax floor check failed:"
    # Surface acorn's line/column and the offending construct — without this the
    # operator only sees a generic failure and has to re-run the test by hand.
    echo "$GUARD_OUTPUT" >&2
    log_error "Check that build.target is still set in vite.config.ts, then rebuild."
    exit 1
fi
log_success "Bundle syntax floor verified"

# ============================================================================
# 6. COMMIT AND PUSH
# ============================================================================

log_info "Committing changes..."

git add package.json package-lock.json "$MANIFEST" CHANGELOG.md "$BUNDLE"
git commit -m "bump: v${NEW_VERSION}"

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Lift required status checks if they'd block this direct push; the EXIT trap
# restores them. This covers both the branch push here and the tag push below.
lift_protection "$BRANCH"

git push origin "$BRANCH"

log_success "Changes committed and pushed"

# ============================================================================
# 7. CREATE GITHUB RELEASE
# ============================================================================

log_info "Creating GitHub release..."

# Create and push an annotated tag pinned to the bump commit before gh release
# create runs, so the release tag targets the correct commit rather than the
# default-branch HEAD (which gh would use if no matching tag exists yet).
git tag -a "v${NEW_VERSION}" -m "v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"

# No asset uploads: the bundle ships inside the integration and HACS pulls the
# repo at this tag, so the release is just the tag + notes.
gh release create "v${NEW_VERSION}" \
    --verify-tag \
    --title "v${NEW_VERSION}" \
    --notes "$CHANGELOG_ENTRY"

log_success "Release created!"
REPO_URL=$(gh repo view --json url -q '.url')
echo ""
echo "Release: ${REPO_URL}/releases/tag/v${NEW_VERSION}"
