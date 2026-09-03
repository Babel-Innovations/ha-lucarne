# lucarne-bridge (developer notes)

The user guide is [`docs/reminders-bridge.md`](../docs/reminders-bridge.md). This file
covers building and releasing the macOS CLI that lives in this directory.

```
Package.swift                       SwiftPM manifest; embeds Sources/lucarne-bridge/Info.plist via -sectcreate
Sources/lucarne-bridge/             the executable: ArgumentParser commands (install, sync, status, uninstall, logs)
Sources/LucarneBridgeCore/          everything testable: wire types, config/state files, EventKit adapter,
                                    HTTP transport, SyncEngine, launchd agent, pmset parsing
Tests/LucarneBridgeCoreTests/       XCTest suite with fake Reminders + HTTP transport
install.sh                          curl | sh installer (downloads the release zip, verifies sha256)
homebrew/lucarne-bridge.rb.tmpl     formula template rendered by the release workflow into the tap
```

## Build and test

```sh
cd bridge
swift build            # debug binary at .build/debug/lucarne-bridge
swift test
swift build -c release --arch arm64 --arch x86_64 --product lucarne-bridge
otool -s __TEXT __info_plist .build/apple/Products/Release/lucarne-bridge | head -3   # plist section present
```

Requires the Xcode Command Line Tools (Swift 5.9+). Build from inside `bridge/`: the
`-sectcreate` path in `Package.swift` is resolved against the working directory, so
`swift build --package-path bridge` from the repo root fails to link. The Info.plist is
embedded so EventKit finds `NSRemindersFullAccessUsageDescription`; without it macOS
terminates the process at the access request ("attempted to access privacy-sensitive data
without a usage description"). `CFBundleShortVersionString` is `0.0.0-dev` in the tree and stamped with
the release tag by CI, and `lucarne-bridge --version` reads it back.

### Trying a local build

A debug build works end to end, with one caveat: macOS keys the Reminders permission to
the binary's code signature, and every ad-hoc-signed build has a fresh one, so you get a
new permission prompt per build (`tccutil reset Reminders com.babel-innovations.lucarne-bridge`
clears stale grants). Run `install` from the built path — the launchd agent records the
absolute path of the binary you install from:

```sh
.build/debug/lucarne-bridge install http://homeassistant.local:8123/api/webhook/<id>
.build/debug/lucarne-bridge status
```

`LUCARNE_BRIDGE_HOME=/tmp/somewhere` relocates config.json / state.json (tests use it).

## Release

`.github/workflows/bridge-release.yml` runs on every published GitHub release — both
`scripts/create-release.sh` and `scripts/create-prerelease.sh` produce one — and:

1. checks out the tag, stamps the version into Info.plist, builds the universal binary;
2. if the signing secrets are present, imports the Developer ID certificate into a
   temporary keychain and signs with the hardened runtime. Without the secrets (forks,
   PRs from forks) it logs "unsigned build" and continues;
3. uploads `lucarne-bridge-<version>-macos-universal.zip` and its `.sha256` to the release;
4. with the same secrets present, submits the zip to Apple's notary service using the App
   Store Connect API key and polls for up to three hours (exhausting that fails the job
   like a rejection would). Upload comes first on purpose: a bare executable cannot be
   stapled, Gatekeeper fetches the ticket online, so the already-published zip becomes
   notarized the moment Apple accepts it — and Apple's queue can take well over 30 min on a
   team's first submission. A rejection fails the job (with `notarytool log` output) but
   leaves the signed asset in place;
5. for a stable release, renders `homebrew/lucarne-bridge.rb.tmpl` and pushes it to
   `Babel-Innovations/homebrew-lucarne` (`Formula/lucarne-bridge.rb`) over SSH with the deploy key.

Repository secrets it reads (all optional; signing needs the first six together):

| Secret | What |
|---|---|
| `MACOS_CERT_P12_BASE64` | Developer ID Application certificate + private key, `.p12`, base64 |
| `MACOS_CERT_PASSWORD` | password of that `.p12` |
| `APPLE_TEAM_ID` | 10-character team id (passed to `notarytool --team-id`) |
| `NOTARY_KEY_ID` | App Store Connect API key id |
| `NOTARY_ISSUER_ID` | App Store Connect issuer id |
| `NOTARY_KEY_P8_BASE64` | the API key `.p8`, base64 |
| `TAP_DEPLOY_KEY` | private half of a write-enabled deploy key on `homebrew-lucarne` (skip to leave the tap alone) |

`.github/workflows/bridge.yml` builds and tests the package on every PR that touches
`bridge/`.
