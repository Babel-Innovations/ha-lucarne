#!/bin/bash

# Creates a GitHub *pre-release* for ha-lucarne so a tester can install an
# unreleased commit through HACS's "show beta versions" channel.
#
# Unlike scripts/create-release.sh, this bumps NOTHING: no package.json /
# manifest.json edit, no CHANGELOG entry, no commit, and no branch push. The
# only ref it creates is the release tag, pinned to an already-pushed commit.
#
# The tag (v<next-version>-pre-<YYYYmmdd-HHMM>) names the version this build is
# currently heading *for*, derived from the conventional commits behind it by
# scripts/lib/version.sh — the same code create-release.sh uses. Tagging the
# version already in package.json would be wrong twice over: it labels the build
# a pre-release of something that already shipped, and semver ranks
# "1.4.3-pre-..." *below* the stable 1.4.3 a tester already has installed.
# "1.5.0-pre-..." sorts where it belongs — above 1.4.3, below the eventual 1.5.0.
#
# It is a moving target, not a promise: a later feat: raises the base from 1.4.4
# to 1.5.0, and on a docs-only tree the patch fallback derives a version
# create-release.sh will decline to cut at all. What normally holds is the
# ordering — above the installed stable, below the stable release that
# supersedes it — and that holds only while the commits behind the tag stay in
# history. Drop a breaking: commit out of history (rebase, reset, force-push)
# after cutting v2.0.0-pre-... and the next stable is 1.5.0, which the stale tag
# now outranks; delete-prerelease.sh clears it. A `git revert` does NOT do this:
# it appends a "Revert ..." commit while leaving the original in range, so the
# derivation still sees the breaking: and still says major.
#
# The suffix still lives on the *tag* alone, so no semver parser working on the
# stored version ever sees it. That parse is now next_version() in
# scripts/lib/version.sh; it used to sit inline in create-release.sh, where
# `IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"` against a stored
# "1.5.0-beta.1" made a patch bump die with "0-beta.1: syntax error: invalid
# arithmetic operator" and a minor bump *silently* produce 1.6.0, skipping 1.5.0
# entirely. next_version() now rejects any non-bare X.Y.Z before that parse runs,
# but writing a pre-release string into package.json/manifest.json is still never
# right here.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Conventional-commit version derivation, shared with create-release.sh so this
# tag and the stable release that follows it agree on which version is next.
# shellcheck source=scripts/lib/version.sh
. "${REPO_DIR}/scripts/lib/version.sh"

# The card bundles ship committed inside the integration and HACS pulls repo
# source at the tag (hacs.json sets no zip_release), so — exactly as in
# create-release.sh — the pre-release carries no uploaded assets. There are two,
# one per Home Assistant frontend channel; scripts/lib/bundles.sh
# says which and why, and is shared with create-release.sh and
# deploy-integration.sh so the list cannot drift. Shipping only one leaves half
# the devices with no cards at all (issue #101), so both are gated here.
# shellcheck source=scripts/lib/bundles.sh
. "${REPO_DIR}/scripts/lib/bundles.sh"
MANIFEST="custom_components/lucarne_family/manifest.json"

# Pre-releases are cut from main. A tag on a PR branch points at a commit a
# force-push can drop from branch history; once delete-prerelease.sh cleans the
# tag up that commit becomes unreachable, leaving the tester on a build nobody
# can reproduce.
RELEASE_BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_error()   { echo -e "${RED}Error: $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_info()    { echo -e "${YELLOW}ℹ $1${NC}"; }

usage() {
    cat <<'USAGE'
Usage: scripts/create-prerelease.sh [options]

Tags the current (already-pushed) commit as a GitHub pre-release. Bumps no
version, writes no changelog, creates no commit.

Options:
  -m, --message TEXT   One-line "what to test" blurb shown in the release notes.
      --allow-branch   Permit cutting from a branch other than main (its commit
                       can be dropped from branch history by a force-push).
  -y, --yes            Skip the confirmation prompt.
  -h, --help           Show this help.
USAGE
}

# ============================================================================
# 0. ARGUMENTS
# ============================================================================

PURPOSE=""
ALLOW_BRANCH=0
ASSUME_YES=0

while [ $# -gt 0 ]; do
    case "$1" in
        -m|--message)
            [ $# -ge 2 ] || { log_error "$1 requires a value"; exit 1; }
            PURPOSE="$2"
            shift 2
            ;;
        --allow-branch) ALLOW_BRANCH=1; shift ;;
        -y|--yes)       ASSUME_YES=1;   shift ;;
        -h|--help)      usage; exit 0 ;;
        *) log_error "Unknown argument: $1"; echo ""; usage; exit 1 ;;
    esac
done

# ============================================================================
# 1. VALIDATION
# ============================================================================

log_info "Running validation checks..."

if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Install: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI. Run: gh auth login"
    exit 1
fi

# A dirty tree is fatal, never auto-committed: this repo requires every commit
# to go through the pre-commit review hook, and a generic "Pre-release: <date>"
# commit would route around it. Commit properly, then re-run.
if [ -n "$(git status --porcelain)" ]; then
    log_error "Working tree is dirty. Commit (via the normal PR flow) or stash before cutting a pre-release."
    git status --short
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "$RELEASE_BRANCH" ]; then
    if [ "$ALLOW_BRANCH" -eq 1 ]; then
        log_info "On '${BRANCH}', not '${RELEASE_BRANCH}' — continuing because --allow-branch was passed."
        log_info "If '${BRANCH}' is later force-pushed, this tag will point at a commit dropped from branch history."
    else
        log_error "On branch '${BRANCH}'. Pre-releases are cut from '${RELEASE_BRANCH}'."
        echo "  Merge first, or pass --allow-branch if you accept an orphanable tag."
        exit 1
    fi
fi

# HACS clones the tag from GitHub, so the commit has to exist there. Requiring
# exact equality with the remote branch also stops us tagging a local commit
# that CI has never seen.
log_info "Checking ${BRANCH} is in sync with origin..."
git fetch origin "$BRANCH" --quiet
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "origin/${BRANCH}")
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    log_error "HEAD does not match origin/${BRANCH}."
    echo "  local:  ${LOCAL_SHA}"
    echo "  origin: ${REMOTE_SHA}"
    echo "  Pull or push so the tagged commit exists on GitHub, then re-run."
    exit 1
fi

for bundle in "${BUNDLES[@]}"; do
    if [ ! -f "$bundle" ]; then
        log_error "$bundle not found. Run 'npm run build' first."
        exit 1
    fi
done

# Resolve the target repo from git's origin remote and pin every gh call with
# --repo. gh honours $GH_REPO over local repository inference, so a stray export
# would otherwise publish this pre-release into a different repository. Kept
# symmetric with delete-prerelease.sh, where the same exposure risks data loss.
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$ORIGIN_URL" ]; then
    log_error "No 'origin' remote found — cannot determine the target repository."
    exit 1
fi
# Keep the HOST in the slug, not just OWNER/REPO. gh accepts
# --repo [HOST/]OWNER/REPO and falls back to $GH_HOST when the host is omitted,
# so a bare OWNER/REPO would leave the same redirect hole $GH_REPO opened.
REPO=$(printf '%s' "$ORIGIN_URL" | sed -E '
    s#^git@([^:]+):#\1/#;
    s#^ssh://(git@)?([^/]+)/#\2/#;
    s#^https?://([^/@]+@)?([^/]+)/#\2/#;
    s#\.git$##')
if ! printf '%s' "$REPO" | grep -qE '^[^/]+/[^/]+/[^/]+$'; then
    log_error "Could not parse a host/owner/name repo from origin URL: ${ORIGIN_URL}"
    exit 1
fi

log_success "All validation checks passed"

# ============================================================================
# 2. DERIVE TAG (version derived, but written nowhere but the tag)
# ============================================================================

VERSION=$(node -p "require('./package.json').version")
MANIFEST_VERSION=$(node -p "require('./${MANIFEST}').version")
if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
    log_error "Version mismatch: package.json is ${VERSION}, ${MANIFEST} is ${MANIFEST_VERSION}."
    echo "  create-release.sh keeps these in sync; fix them before cutting a pre-release."
    exit 1
fi

# The tag names the version this build is heading *for*, not the one it was cut
# from. derive_bump_type falls back to "patch" when nothing release-worthy has
# landed, so a docs- or refactor-only tree still gets a tag that outranks the
# installed stable — cutting one for device testing is a legitimate reason to
# run this script, unlike create-release.sh which stops there.
# Assigned on separate lines so `set -e` sees each exit status: nested inside
# one substitution, a git failure in commits_since_last_bump would be discarded
# and silently derive a patch bump.
RELEASE_COMMITS=$(commits_since_last_bump)
BUMP_TYPE=$(derive_bump_type "$RELEASE_COMMITS")
NEXT_VERSION=$(next_version "$VERSION" "$BUMP_TYPE")

DATE_TIME=$(date +"%Y%m%d-%H%M")
TAG_NAME="v${NEXT_VERSION}-pre-${DATE_TIME}"

if gh release view "$TAG_NAME" --repo "$REPO" &> /dev/null; then
    log_error "Release ${TAG_NAME} already exists. Wait a minute and re-run (tags are minute-stamped)."
    exit 1
fi

# A tag with no release is not covered by the check above, and GitHub ignores
# target_commitish when the tag already exists — so --target below would be
# silently dropped and the release would land on the old commit.
# Fail closed: --exit-code returns 2 for "no match" but 128 for network/auth
# failures, so anything other than 0 or 2 must abort rather than be read as
# "tag absent".
TAG_LOOKUP=0
git ls-remote --tags --exit-code origin "refs/tags/${TAG_NAME}" >/dev/null 2>&1 || TAG_LOOKUP=$?
case "$TAG_LOOKUP" in
    0)
        log_error "Tag ${TAG_NAME} already exists on origin without a release."
        echo "  --target is ignored for an existing tag, so the release would be cut"
        echo "  from whatever commit that tag points at. Delete the stale tag, or"
        echo "  wait a minute and re-run (tags are minute-stamped)."
        exit 1
        ;;
    2) : ;;  # no such tag — the expected path
    *)
        log_error "Could not check origin for tag ${TAG_NAME} (git ls-remote exit ${TAG_LOOKUP})."
        echo "  Refusing to continue: an unverified tag could silently redirect --target."
        exit 1
        ;;
esac

COMMIT_SHORT=$(git rev-parse --short HEAD)
COMMIT_SUBJECT=$(git log -1 --pretty=%s)

# ============================================================================
# 3. BUILD + GATES
# ============================================================================

log_info "Building ${BUNDLES[*]}..."
npm run build

# Budget is per bundle, not summed: a browser downloads one of the two, never
# both, so the ceiling that matters is the bigger single file.
for bundle in "${BUNDLES[@]}"; do
    if [ ! -f "$bundle" ]; then
        log_error "Build failed — $bundle not created"
        exit 1
    fi

    BUNDLE_SIZE=$(wc -c < "$bundle")
    BUNDLE_SIZE_KIB=$((BUNDLE_SIZE / 1024))
    # Compared in bytes, not floored KiB: `$((BUNDLE_SIZE / 1024)) -gt 400` would let
    # anything up to 410,623 bytes through a nominal 400 KiB ceiling.
    if [ "$BUNDLE_SIZE" -gt $((400 * 1024)) ]; then
        log_error "$bundle is ${BUNDLE_SIZE} bytes (${BUNDLE_SIZE_KIB} KiB), over the 400 KiB limit"
        exit 1
    fi
    log_success "Build complete: $bundle (${BUNDLE_SIZE_KIB} KiB)"
done

# The whole point of a pre-release here is device verification, so these gates
# matter more than anywhere else: a beta could otherwise ship the exact bug it was
# cut to verify (#101). Both of that issue's failure modes are covered — a bundle
# that only parses as ES2022, and one the legacy frontend cannot load at all — and
# neither is visible on the machine cutting the tag.
log_info "Verifying the shipped bundles parse and load..."
if ! GUARD_OUTPUT=$(node --import tsx --test 'tests/build/*.test.ts' 2>&1); then
    log_error "Bundle guards failed:"
    echo "$GUARD_OUTPUT" >&2
    log_error "A syntax failure means build.target in vite.config.ts; a registration"
    log_error "failure means the iife format or the define guard. Fix, then rebuild."
    exit 1
fi
log_success "Bundle guards verified"

# Nothing is committed by this script, so HACS ships the bundle bytes already in
# the tagged commit. If a fresh build differs from them, a committed bundle is
# stale and the tester would get the old cards while every local check passed.
# Either one going stale is enough: which of the two it is decides whether the
# modern or the legacy devices get the old cards.
if [ -n "$(git status --porcelain)" ]; then
    log_error "Rebuilding changed tracked files — a committed bundle is stale."
    git status --short
    echo ""
    echo "  Commit the rebuilt bundles through the normal PR flow, then re-run."
    exit 1
fi
log_success "Committed bundles match a fresh build"

# ============================================================================
# 4. RELEASE NOTES
# ============================================================================

WHAT_TO_TEST="${PURPOSE:-Verify this build on the target devices before a stable release is cut.}"

NOTES="⚠️ **Pre-release for device testing — not a stable release.**

${WHAT_TO_TEST}

| | |
|---|---|
| Commit | \`${COMMIT_SHORT}\` on \`${BRANCH}\` |
| Subject | ${COMMIT_SUBJECT} |
| Built | $(date +"%Y-%m-%d %H:%M:%S %Z") |

### Install through HACS

1. HACS → **Integrations** → **Lucarne Family** → ⋮ → **Redownload**
2. Enable **Show beta versions**
3. Select \`${TAG_NAME}\` and download
4. **Restart Home Assistant**
5. **Reload the page.** The integration serves the card bundle at a
   content-hashed URL (\`?v=<version>.<digest>\`), so changed bundle bytes produce
   a new URL and bust the cache on their own — no hard refresh needed.
6. **On iPad, also force-quit the Companion app.** The HA app shell is
   service-worker cached; a backgrounded app can keep serving the old shell.

If the cards still look unchanged after that, clear Safari website data for the
HA host as a last resort — it signs the device out of Home Assistant.

### Home Assistant will still report ${VERSION}

The tag names the version this build is heading for (**${NEXT_VERSION}**), but a
pre-release bumps nothing on disk. So Home Assistant's integration page reads
**${VERSION}** out of \`manifest.json\` while HACS shows the tag
\`${TAG_NAME}\`. That mismatch is expected — the tag identifies the build.

**${NEXT_VERSION} is where this build is currently headed, not a commitment.**
It is derived from the commits behind this tag, and more commits can raise it
before a stable release is cut. What it buys you is the sort order: this tag
ranks above the ${VERSION} you have installed, so HACS offers it as an upgrade,
and below the stable release that eventually supersedes it.

Delete with \`scripts/delete-prerelease.sh\` once a stable release supersedes it."

# ============================================================================
# 5. CONFIRM AND CREATE
# ============================================================================

echo ""
echo "=========================================="
echo "Creating GitHub Pre-Release"
echo "=========================================="
echo "Repo:     ${REPO}"
echo "Tag:      ${TAG_NAME}"
echo "Target:   ${BRANCH} @ ${COMMIT_SHORT}"
echo "Subject:  ${COMMIT_SUBJECT}"
echo "Tag ver:  ${NEXT_VERSION} (derived from commits since last bump: ${BUMP_TYPE})"
echo "Stored:   ${VERSION} in package.json + manifest.json (unchanged — no bump, no commit, no branch push)"
echo "Assets:   none (HACS pulls repo source at the tag)"
echo ""

if [ "$ASSUME_YES" -ne 1 ]; then
    # `|| REPLY=""` keeps set -e from aborting when stdin is not a TTY; EOF then
    # takes the decline path below.
    REPLY=""
    read -r -p "Create pre-release? [y/N] " REPLY || REPLY=""
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "Cancelled. Nothing was tagged or published."
        exit 1
    fi
fi

log_info "Pushing tag ${TAG_NAME}..."
# Push the tag ourselves, pinned to the SHA verified above, instead of letting
# gh create it via --target. A non-forcing ref push fails atomically if the tag
# already exists, which closes the window the earlier ls-remote check can only
# narrow: GitHub ignores target_commitish for an existing tag, so --target would
# be silently dropped and the release cut from the wrong commit.
if ! git push origin "${LOCAL_SHA}:refs/tags/${TAG_NAME}"; then
    log_error "Could not push tag ${TAG_NAME} — it may have just been created elsewhere."
    log_error "Nothing was published."
    exit 1
fi

log_info "Creating pre-release..."
# --verify-tag makes gh use the tag just pushed rather than creating its own.
if ! gh release create "$TAG_NAME" \
    --repo "$REPO" \
    --verify-tag \
    --prerelease \
    --title "${TAG_NAME} — pre-release" \
    --notes "$NOTES"; then
    # The tag is already on origin at this point; drop it so a re-run starts
    # clean and no dangling tag points at an unpublished build.
    log_error "Release creation failed — removing the tag that was just pushed."
    git push origin ":refs/tags/${TAG_NAME}" \
        || log_error "Could not remove tag ${TAG_NAME}; delete it manually."
    exit 1
fi

log_success "Pre-release created!"
REPO_URL=$(gh repo view "$REPO" --json url -q '.url')
echo ""
echo "Release: ${REPO_URL}/releases/tag/${TAG_NAME}"
