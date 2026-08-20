# shellcheck shell=bash
#
# Conventional-commit version derivation, shared by scripts/create-release.sh
# and scripts/create-prerelease.sh.
#
# It lives here so that, for a given history, the two release paths cannot
# disagree about what the next version is. create-release.sh writes that number
# to package.json/manifest.json and cuts a stable tag from it; create-prerelease.sh
# puts the same number on a pre-release tag and writes nothing. (They still see
# different answers at different times — that is the point, the base moves as
# commits land. What must not happen is two answers for the same commits.)
#
# Source it with the repo root as $PWD (every function shells out to git):
#
#     . "$(dirname "${BASH_SOURCE[0]}")/lib/version.sh"
#
# Deliberately free of any log_* helper: the callers define their own with
# slightly different colours, and this file is sourced before them in one of
# them. Errors go to stderr and return non-zero, which `set -e` in a caller
# turns into an abort at the assignment site.

# commits_since_last_bump
#
# Echo the release-worthy commit subjects since the last version bump, one per
# line. Empty output is a valid answer (nothing release-worthy has landed), not
# an error — callers decide whether that is fatal. Returns non-zero only if git
# itself fails, which is never the same thing as an empty set.
#
# Lower bound is the newest `bump:` commit, falling back to the newest *stable*
# tag so the pre-`bump:`-convention v0.1.0 release commit is still handled.
commits_since_last_bump() {
    local last_bump last_tag all_tags stable_tag range commits

    # Not a git repo at all is a caller bug, not an empty commit set.
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        printf 'commits_since_last_bump: %s is not a git repository.\n' "$PWD" >&2
        return 1
    fi

    # An unborn HEAD is the only legitimately empty case: nothing is committed,
    # so nothing is release-worthy. Everything past this point must succeed.
    if ! git rev-parse --verify --quiet HEAD >/dev/null 2>&1; then
        return 0
    fi

    # Truncated history yields a truncated commit list, which silently derives
    # too low a bump rather than failing. Refuse to guess.
    if [ "$(git rev-parse --is-shallow-repository)" != "false" ]; then
        printf 'commits_since_last_bump: shallow repository — the commit range would be truncated.\n' >&2
        printf '  Run: git fetch --unshallow\n' >&2
        return 1
    fi

    # Both lookups are allowed to come back empty — a repo can predate the
    # `bump:` convention and carry no tags — but not to fail silently.
    last_bump=$(git log --grep="^bump:" --format="%H" -n 1) || return 1
    if [ -z "$last_bump" ]; then
        # Stable tags only. create-prerelease.sh publishes v<version>-pre-<stamp>
        # tags routinely, and letting one become the lower bound would drop the
        # very commits it was cut to test out of the next bump's range —
        # turning a `feat:` into a patch. -m1 rather than `| head -1`: a pipe
        # here would SIGPIPE the writer and trip `pipefail`.
        all_tags=$(git tag --list 'v*' --sort=-creatordate) || return 1
        stable_tag=$(grep -m1 -v -- '-pre-' <<< "$all_tags" || true)
        if [ -n "$stable_tag" ]; then
            last_tag=$(git rev-list -n 1 "$stable_tag") || return 1
            last_bump="$last_tag"
        fi
    fi

    if [ -z "$last_bump" ]; then
        range="HEAD"
    else
        range="${last_bump}..HEAD"
    fi

    # Fail loudly rather than returning an empty set: "$range is unreadable"
    # and "nothing has landed since the last release" mean opposite things, and
    # create-prerelease.sh would quietly turn the latter into a patch bump.
    if ! commits=$(git log "$range" --format="%s" --no-merges 2>&1); then
        printf 'commits_since_last_bump: git log %s failed: %s\n' "$range" "$commits" >&2
        return 1
    fi

    # bump:/misc: commits are bookkeeping, never release-worthy on their own.
    grep -vE "^(bump|misc)(\([^)]*\))?:" <<< "$commits" || true
}

# derive_bump_type <commit-subjects>
#
# Echo major | minor | patch for a newline-separated list of commit subjects.
# Empty input yields "patch": create-release.sh refuses to release an empty set
# before it ever gets here, while create-prerelease.sh needs *some* version to
# tag a docs-only device-test build with.
derive_bump_type() {
    local commits="${1-}"

    # Here-strings, not `printf ... | grep -q`: grep -q exits on the first match
    # and SIGPIPEs the writer, so under `set -o pipefail` a pipeline that DID
    # match reports failure once the subjects outgrow the 64 KiB pipe buffer.
    # Because these tests sit in an `if` condition, `set -e` cannot catch it —
    # a `breaking:` commit silently derives `patch` instead of `major`.
    if grep -qE "^(breaking|BREAKING CHANGE)(\([^)]*\))?:" <<< "$commits"; then
        printf 'major\n'
    elif grep -qE "^(feat|feature)(\([^)]*\))?:" <<< "$commits"; then
        printf 'minor\n'
    else
        printf 'patch\n'
    fi
}

# next_version <current-version> <bump-type>
#
# Echo the bumped X.Y.Z.
#
# <current-version> must be a bare X.Y.Z. Rejecting anything else is the point
# of this guard: against a stored "1.5.0-beta.1" the parse below would make a
# patch bump die with "0-beta.1: syntax error: invalid arithmetic operator" and
# a minor bump *silently* return 1.6.0, skipping 1.5.0 entirely. That is why
# pre-release suffixes live on the git tag alone and never reach package.json
# or manifest.json — see scripts/create-prerelease.sh.
next_version() {
    local current="${1-}" bump="${2-}"
    local major minor patch

    if ! printf '%s' "$current" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        printf 'next_version: "%s" is not a bare X.Y.Z version.\n' "$current" >&2
        printf '  Pre-release suffixes belong on the git tag, never in package.json/manifest.json.\n' >&2
        return 1
    fi

    IFS='.' read -r major minor patch <<< "$current"

    # 10# forces base 10 so a zero-padded part (1.08.0) cannot be read as octal.
    case "$bump" in
        major) printf '%s.0.0\n' "$((10#$major + 1))" ;;
        minor) printf '%s.%s.0\n' "$((10#$major))" "$((10#$minor + 1))" ;;
        patch) printf '%s.%s.%s\n' "$((10#$major))" "$((10#$minor))" "$((10#$patch + 1))" ;;
        *)
            printf 'next_version: unknown bump type: "%s" (expected major|minor|patch).\n' "$bump" >&2
            return 1
            ;;
    esac
}
