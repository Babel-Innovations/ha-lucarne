"""async_setup serves and auto-registers the bundled card frontend."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from homeassistant.components.frontend import DATA_THEMES
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.core import HomeAssistant

import custom_components.lucarne_family as lucarne
from custom_components.lucarne_family.const import (
    FRONTEND_LEGACY_URL,
    FRONTEND_URL,
    THEME_FILE,
    THEME_NAME,
)

# (public URL, filename, registered on the legacy es5 channel?)
BUNDLES = (
    (FRONTEND_URL, "ha-lucarne.js", False),
    (FRONTEND_LEGACY_URL, "ha-lucarne-legacy.js", True),
)


def test_bundles_committed() -> None:
    """Both card bundles must be committed — HACS ships them, it does not build."""
    frontend = Path(lucarne.__file__).parent / "frontend"
    for _url, filename, _es5 in BUNDLES:
        bundle = frontend / filename
        assert bundle.is_file(), f"missing committed bundle at {bundle}"
        assert bundle.stat().st_size > 0


def test_theme_bundled() -> None:
    """The theme must live inside the package — HACS only ships custom_components/."""
    theme = Path(lucarne.__file__).parent / THEME_FILE
    assert theme.is_file(), f"missing bundled theme at {theme}"
    parsed = lucarne._load_theme(theme)
    assert THEME_NAME in parsed, f"{THEME_NAME!r} key absent from {theme}"
    assert isinstance(parsed[THEME_NAME], dict) and parsed[THEME_NAME]


async def test_async_setup_registers_frontend(hass: HomeAssistant) -> None:
    """Both bundles are served and registered, each on its own frontend channel.

    Home Assistant runs extra *module* URLs only on the modern frontend and extra
    *es5* URLs only on the legacy one, and a browser gets exactly one of the two.
    Registering just the module URL is what left iPadOS 15 and Tizen 6.5 with no
    Lucarne JS at all in issue #101, so the es5 registration is asserted here as
    hard as the module one.
    """
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch.object(lucarne, "add_extra_js_url") as mock_add_js:
        assert await lucarne.async_setup(hass, {}) is True

    # Both served as static paths, in one registration call, each pointing at the
    # real file on disk.
    hass.http.async_register_static_paths.assert_awaited_once()
    (configs,) = hass.http.async_register_static_paths.await_args.args
    served = {c.url_path: c.path for c in configs}
    assert set(served) == {url for url, _f, _e in BUNDLES}
    for url, filename, _es5 in BUNDLES:
        assert served[url].endswith(f"frontend/{filename}")
        assert Path(served[url]).is_file()

    # Auto-loaded with a ?v=<version>.<bundle-hash> cache-buster, on the right
    # channel: es5=False -> extra_module_url, es5=True -> extra_js_es5.
    assert mock_add_js.call_count == len(BUNDLES)
    registered = {
        call.args[1]: call.kwargs.get("es5", False)
        for call in mock_add_js.call_args_list
    }

    digests = set()
    for url, _filename, es5 in BUNDLES:
        matches = [u for u in registered if u.startswith(f"{url}?v=")]
        assert len(matches) == 1, f"expected exactly one registration for {url}, got {matches}"
        registered_url = matches[0]
        assert registered[registered_url] is es5, (
            f"{url} must be registered with es5={es5}; "
            "the legacy frontend never imports extra_module_url entries"
        )

        # The query carries a content hash of that bundle appended to the version,
        # so the URL changes whenever the card is rebuilt (cache-busts without a bump).
        query = registered_url.split("?v=", 1)[1]
        version, _, digest = query.rpartition(".")
        assert version, "version segment present before the hash"
        assert len(digest) == 8 and all(c in "0123456789abcdef" for c in digest), (
            f"expected an 8-char hex bundle hash, got {digest!r}"
        )
        digests.add(digest)

    # Each URL is hashed from its own file, not once from a shared one — otherwise
    # rebuilding only the legacy bundle would not bust its cache.
    assert len(digests) == len(BUNDLES), "each bundle must carry its own content hash"


async def test_async_setup_registers_theme(hass: HomeAssistant) -> None:
    """async_setup injects the bundled theme into the frontend theme registry."""
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    events = []
    hass.bus.async_listen(EVENT_THEMES_UPDATED, lambda evt: events.append(evt))

    with patch.object(lucarne, "add_extra_js_url"):
        assert await lucarne.async_setup(hass, {}) is True
    await hass.async_block_till_done()

    # The theme is registered under its name with a non-empty token mapping...
    assert THEME_NAME in hass.data[DATA_THEMES]
    tokens = hass.data[DATA_THEMES][THEME_NAME]
    assert isinstance(tokens, dict) and "primary-color" in tokens

    # ...and the frontend is told to refresh so it shows up without a restart.
    assert events, "expected EVENT_THEMES_UPDATED to fire"


async def test_register_theme_missing_file_is_noop(hass: HomeAssistant) -> None:
    """A missing/corrupt theme file must not register anything or raise."""
    with patch.object(lucarne, "_load_theme", return_value={}):
        await lucarne._async_register_theme(hass)
    assert THEME_NAME not in hass.data.get(DATA_THEMES, {})


async def test_register_theme_rejects_invalid_tokens(hass: HomeAssistant) -> None:
    """A non-mapping or empty token value must not be injected into DATA_THEMES."""
    for bad in ({THEME_NAME: "not-a-mapping"}, {THEME_NAME: {}}, {THEME_NAME: None}):
        hass.data.pop(DATA_THEMES, None)
        with patch.object(lucarne, "_load_theme", return_value=bad):
            await lucarne._async_register_theme(hass)
        assert THEME_NAME not in hass.data.get(DATA_THEMES, {})


async def test_register_theme_preserves_user_theme(hass: HomeAssistant) -> None:
    """A user-defined theme under the same name must not be clobbered."""
    user_theme = {"primary-color": "#123456"}
    hass.data[DATA_THEMES] = {THEME_NAME: user_theme}

    events = []
    hass.bus.async_listen(EVENT_THEMES_UPDATED, lambda evt: events.append(evt))

    bundled = {THEME_NAME: {"primary-color": "#abcdef"}}
    with patch.object(lucarne, "_load_theme", return_value=bundled):
        await lucarne._async_register_theme(hass)
    await hass.async_block_till_done()

    # Existing theme untouched, and no needless refresh fired.
    assert hass.data[DATA_THEMES][THEME_NAME] is user_theme
    assert not events


def test_bundle_digest_changes_with_content(tmp_path: Path) -> None:
    """The cache-bust hash differs for different bundle contents (stable per content)."""
    a = tmp_path / "a.js"
    b = tmp_path / "b.js"
    a.write_text("console.log(1)")
    b.write_text("console.log(2)")
    assert lucarne._bundle_digest(a) == lucarne._bundle_digest(a)  # stable
    assert lucarne._bundle_digest(a) != lucarne._bundle_digest(b)  # content-sensitive


def test_bundle_digest_missing_file(tmp_path: Path) -> None:
    """A missing bundle degrades to a sentinel instead of raising during setup."""
    assert lucarne._bundle_digest(tmp_path / "nope.js") == "0"
