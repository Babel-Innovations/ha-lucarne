#!/bin/bash

# Deletes ha-lucarne pre-releases and their tags, so the HACS beta channel does
# not keep offering a test build after a stable release supersedes it.
#
# Only releases flagged prerelease=true are ever considered — every stable
# vX.Y.Z release cut by scripts/create-release.sh is invisible to this script.
#
# Usage: scripts/delete-prerelease.sh [--dry-run] [-y] [tag ...]
#   With no tags, targets every pre-release in the repo.

set -euo pipefail

# Anchor to this script's own repo before any gh call. `gh` resolves the target
# repository from the current directory, and this script deletes tags
# irreversibly (--cleanup-tag) — run by absolute path from a sibling checkout in
# this multi-repo tree, an unanchored version would enumerate and delete *that*
# repo's pre-releases. create-prerelease.sh anchors the same way.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_error()   { echo -e "${RED}Error: $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_info()    { echo -e "${YELLOW}ℹ $1${NC}"; }

# Bullet each line of a newline-delimited tag list.
bullet_list() { awk '{ print "  - " $0 }'; }

usage() {
    cat <<'USAGE'
Usage: scripts/delete-prerelease.sh [options] [tag ...]

Deletes pre-releases and their tags. Stable releases are never touched.
With no tag arguments, every pre-release in the repo is targeted.

Options:
  -n, --dry-run   List what would be deleted and exit without changing anything.
  -y, --yes       Skip the confirmation prompt.
  -h, --help      Show this help.
USAGE
}

DRY_RUN=0
ASSUME_YES=0
# Newline-delimited, not a bash array: macOS ships bash 3.2, where expanding an
# empty array under `set -u` is an "unbound variable" error. Git tag names
# cannot contain whitespace, so newline-delimiting them is lossless.
REQUESTED_TAGS=""

while [ $# -gt 0 ]; do
    case "$1" in
        -n|--dry-run) DRY_RUN=1;    shift ;;
        -y|--yes)     ASSUME_YES=1; shift ;;
        -h|--help)    usage; exit 0 ;;
        -*) log_error "Unknown option: $1"; echo ""; usage; exit 1 ;;
        # Reject rather than skip: silently dropping an empty argument would
        # leave REQUESTED_TAGS empty and fall through to "delete every
        # pre-release", widening a delete instead of narrowing it.
        *)  if [ -z "$1" ]; then
                log_error "Empty tag argument. Pass a pre-release tag, or no arguments to target all."
                exit 1
            fi
            REQUESTED_TAGS="${REQUESTED_TAGS}$1"$'\n'
            shift
            ;;
    esac
done

if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Install: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI. Run: gh auth login"
    exit 1
fi

# Resolve the target repo from git's origin remote and pin every gh call to it
# with --repo. The cwd anchor above is necessary but NOT sufficient: gh honours
# $GH_REPO over local repository inference, so a stray export in the environment
# would redirect `gh release delete --cleanup-tag` at another repository —
# irreversibly, and with -y there is no prompt to catch it. Deriving from git
# also means the banner below cannot agree with a wrong target.
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

echo "=========================================="
if [ "$DRY_RUN" -eq 1 ]; then
    echo "Delete Pre-Releases (DRY RUN)"
else
    echo "Delete Pre-Releases and Tags"
fi
echo "=========================================="
echo "Repository: ${REPO}"
echo ""

log_info "Fetching pre-releases..."
ALL_PRERELEASES=$(gh release list --repo "$REPO" --limit 1000 --json isPrerelease,tagName \
    -q '.[] | select(.isPrerelease==true) | .tagName')

if [ -z "$ALL_PRERELEASES" ]; then
    log_info "No pre-releases found. Nothing to do."
    exit 0
fi

# Narrow to the requested tags, rejecting anything that is not a pre-release —
# a typo must never fall through to deleting a stable release.
if [ -n "$REQUESTED_TAGS" ]; then
    TAGS=""
    while IFS= read -r TAG; do
        [ -n "$TAG" ] || continue
        if ! grep -qxF "$TAG" <<< "$ALL_PRERELEASES"; then
            log_error "'${TAG}' is not a pre-release in ${REPO}. Refusing to delete anything."
            echo "Known pre-releases:"
            bullet_list <<< "$ALL_PRERELEASES"
            exit 1
        fi
        # Drop duplicates: the second `gh release delete` of a tag fails because
        # the release is already gone, and set -e would abort the loop there,
        # silently leaving every later tag undeleted.
        if [ -n "$TAGS" ] && grep -qxF "$TAG" <<< "$TAGS"; then
            continue
        fi
        TAGS="${TAGS}${TAG}"$'\n'
    done <<< "$REQUESTED_TAGS"
    # Trailing newline is stripped by the command substitution.
    TAGS=$(printf '%s' "$TAGS")
else
    TAGS="$ALL_PRERELEASES"
fi

TAG_COUNT=$(grep -c . <<< "$TAGS")
echo "Pre-release(s) to be deleted (${TAG_COUNT}):"
bullet_list <<< "$TAGS"
echo ""

if [ "$DRY_RUN" -eq 1 ]; then
    log_info "Dry run complete. Nothing was deleted."
    echo "Re-run without --dry-run to delete these."
    exit 0
fi

if [ "$ASSUME_YES" -ne 1 ]; then
    # `|| REPLY=""` keeps set -e from aborting when stdin is not a TTY; EOF then
    # takes the decline path below.
    REPLY=""
    read -r -p "Delete these pre-releases and their tags? [y/N] " REPLY || REPLY=""
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "Cancelled. Nothing was deleted."
        exit 1
    fi
fi

echo ""
log_info "Deleting..."
DELETED_COUNT=0
FAILED_TAGS=""
while IFS= read -r TAG; do
    [ -n "$TAG" ] || continue
    echo "  ${TAG}"
    # Deleting the release alone already hides the build from HACS, which lists
    # published releases rather than bare tags. --cleanup-tag is hygiene: it
    # stops dangling tags accumulating, and keeps create-prerelease.sh's
    # minute-stamped names free to be reused.
    #
    # Collected rather than fatal: one tag failing (e.g. the release went but
    # --cleanup-tag did not) must not abort the batch and strand the tags after
    # it. Failures are reported together at the end and the exit code reflects
    # them.
    if gh release delete "$TAG" --repo "$REPO" --yes --cleanup-tag; then
        # Not ((DELETED_COUNT++)): that arithmetic returns exit status 1 on the
        # first increment (post-increment evaluates to 0), which set -e treats
        # as a failure and aborts the loop.
        DELETED_COUNT=$((DELETED_COUNT + 1))
    else
        FAILED_TAGS="${FAILED_TAGS}${TAG}"$'\n'
    fi
done <<< "$TAGS"

echo ""
log_success "Deleted ${DELETED_COUNT} pre-release(s) and tag(s)"

if [ -n "$FAILED_TAGS" ]; then
    echo ""
    log_error "Could not fully delete:"
    bullet_list <<< "$(printf '%s' "$FAILED_TAGS")"
    # --cleanup-tag removes the release first, then the tag, so the likely
    # failure leaves a tag whose release is already gone. Re-running cannot help:
    # this script enumerates from `gh release list`, which no longer returns it.
    # Print the command that does work instead.
    echo "If the release went but its tag did not, the tag is no longer listed by"
    echo "this script. Remove it directly:"
    while IFS= read -r FAILED_TAG; do
        [ -n "$FAILED_TAG" ] || continue
        echo "  git push origin \":refs/tags/${FAILED_TAG}\""
    done <<< "$(printf '%s' "$FAILED_TAGS")"
    exit 1
fi
