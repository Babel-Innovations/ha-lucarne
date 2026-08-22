# shellcheck shell=bash
#
# Shared list of the committed card bundles. Sourced only — no shebang, matching
# scripts/lib/version.sh.
#
# There are two, because Home Assistant has two frontend channels and a browser
# loads exactly one of them: the ES module for the modern frontend, the IIFE for
# the legacy one that iPadOS 15 and Tizen 6.5 get (issue #101). Every script that
# checks, sizes, commits or deploys the bundles has to know about both — a script
# that silently knows about only one ships half the users a dashboard of
# "Configuration error" cards, which is exactly how #101 lasted as long as it did.
#
# Kept in a lib for the same reason as version.sh: three copies of this list would
# drift, and the failure that drift causes is invisible on every machine we build
# on (a developer browser always gets the ES module).
#
# Source it, then use "${BUNDLES[@]}" (repo-relative paths) or
# "${BUNDLE_FILENAMES[@]}" (basenames, for scripts working inside the package).

_BUNDLE_DIR="custom_components/lucarne_family/frontend"

BUNDLE_FILENAMES=(
    "ha-lucarne.js"          # ES module   -> extra_module_url, modern frontend
    "ha-lucarne-legacy.js"   # IIFE        -> extra_js_es5, legacy frontend
)

BUNDLES=()
for _bundle_filename in "${BUNDLE_FILENAMES[@]}"; do
    BUNDLES+=("${_BUNDLE_DIR}/${_bundle_filename}")
done
# Both temporaries are unset: this is sourced into scripts that run with `set -u`
# and define their own names, so it should leave exactly the two arrays behind.
unset _bundle_filename _BUNDLE_DIR
