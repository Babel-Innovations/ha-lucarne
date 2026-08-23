"""async_setup serves both frontend artifacts and registers only the loader (#101)."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from homeassistant.components.frontend import DATA_THEMES
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.core import HomeAssistant

import custom_components.lucarne_family as lucarne
from custom_components.lucarne_family.const import (
    FRONTEND_URL,
    LOADER_URL,
    THEME_FILE,
    THEME_NAME,
)


def test_bundle_committed() -> None:
    """The built card bundle must be committed — HACS ships it, it does not build."""
    bundle = Path(lucarne.__file__).parent / "frontend" / "ha-lucarne.js"
    assert bundle.is_file(), f"missing committed bundle at {bundle}"
    assert bundle.stat().st_size > 0


def test_loader_committed() -> None:
    """Same for the loader shim, and it must stay small enough to be trustworthy.

    It is the only thing that can report a bundle which fails to parse (#101), so
    it has to be simple enough that it cannot plausibly fail the same way. If it
    ever grows past a few kB it has started importing something it should not.
    """
    loader = Path(lucarne.__file__).parent / "frontend" / "ha-lucarne-loader.js"
    assert loader.is_file(), f"missing committed loader at {loader}"
    assert 0 < loader.stat().st_size < 16 * 1024, "loader grew unexpectedly large"


def test_theme_bundled() -> None:
    """The theme must live inside the package — HACS only ships custom_components/."""
    theme = Path(lucarne.__file__).parent / THEME_FILE
    assert theme.is_file(), f"missing bundled theme at {theme}"
    parsed = lucarne._load_theme(theme)
    assert THEME_NAME in parsed, f"{THEME_NAME!r} key absent from {theme}"
    assert isinstance(parsed[THEME_NAME], dict) and parsed[THEME_NAME]


async def test_async_setup_registers_frontend(hass: HomeAssistant) -> None:
    """async_setup serves both artifacts and registers only the loader as an ES module."""
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch.object(lucarne, "add_extra_js_url") as mock_add_js:
        assert await lucarne.async_setup(hass, {}) is True

    # Both files served as static paths, each pointing at a real file on disk.
    hass.http.async_register_static_paths.assert_awaited_once()
    (configs,) = hass.http.async_register_static_paths.await_args.args
    served = {c.url_path: c.path for c in configs}
    assert served.keys() == {FRONTEND_URL, LOADER_URL}
    assert served[FRONTEND_URL].endswith("frontend/ha-lucarne.js")
    assert served[LOADER_URL].endswith("frontend/ha-lucarne-loader.js")
    assert all(Path(p).is_file() for p in served.values())

    # ONLY the loader is auto-loaded as a frontend module. Registering the bundle
    # here too is the #101 bug: index.html imports extra module URLs from a script
    # block that runs BEFORE frontend_es5/app.js, which does
    # `Object.defineProperty(window, "customElements", {value: new CustomElementRegistry})`
    # and discards every element defined up to that point. The loader exists to
    # delay the import until after that swap, and it cannot do that if Home
    # Assistant is also importing the bundle directly.
    registered = [call.args[1] for call in mock_add_js.call_args_list]
    assert len(registered) == 1, f"only the loader may be a frontend module, got {registered}"
    registered_url = registered[0]
    assert registered_url.startswith(f"{LOADER_URL}?v=")
    assert not any(url.split("?", 1)[0] == FRONTEND_URL for url in registered), (
        "the bundle must not be registered directly — it would evaluate before the "
        "es5 registry swap and lose every registration (#101)"
    )

    # The query carries a content hash of the bundle appended to the version, so
    # the URL changes whenever the card is rebuilt (cache-busts without a bump).
    query = registered_url.split("?v=", 1)[1]
    version, _, digest = query.rpartition(".")
    assert version, "version segment present before the hash"
    assert len(digest) == 8 and all(c in "0123456789abcdef" for c in digest), (
        f"expected an 8-char hex bundle hash, got {digest!r}"
    )


async def test_bundle_is_served_but_not_auto_imported(hass: HomeAssistant) -> None:
    """The bundle must be reachable, and must not be a frontend module.

    Both halves matter. Serving it keeps the loader able to import it by a URL
    relative to its own. Not registering it is the #101 fix: Home Assistant renders
    extra module URLs in a script block that runs before frontend_es5/app.js
    replaces window.customElements, so a directly-imported bundle registers all 31
    elements into a registry that is then thrown away — define() returning cleanly
    and every card showing "Custom element doesn't exist".
    """
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with patch.object(lucarne, "add_extra_js_url") as mock_add_js:
        assert await lucarne.async_setup(hass, {}) is True

    (configs,) = hass.http.async_register_static_paths.await_args.args
    assert FRONTEND_URL in {c.url_path for c in configs}, "bundle must still be served"

    imported = [call.args[1].split("?", 1)[0] for call in mock_add_js.call_args_list]
    assert imported == [LOADER_URL]


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


def test_bundle_digest_covers_every_artifact(tmp_path: Path) -> None:
    """A loader-only edit must change the query, or devices cache it forever.

    Both URLs are served with a 31-day Cache-Control and share a single ?v=
    string. If the digest only tracked ha-lucarne.js, iterating on the loader —
    the common case while debugging #101, since the loader is the instrument and
    the bundle is what is under test — would emit an identical URL and the iPad
    and the Frame TV would keep running the old loader indefinitely.
    """
    bundle = tmp_path / "ha-lucarne.js"
    loader = tmp_path / "ha-lucarne-loader.js"
    bundle.write_text("bundle")
    loader.write_text("loader-v1")

    before = lucarne._bundle_digest(bundle, loader)
    loader.write_text("loader-v2")
    after = lucarne._bundle_digest(bundle, loader)

    assert before != after, "a loader-only change left the cache-buster unchanged"
    assert lucarne._bundle_digest(bundle, loader) == after  # stable per content


def test_bundle_digest_missing_second_artifact(tmp_path: Path) -> None:
    """A missing loader degrades to the same sentinel rather than raising."""
    bundle = tmp_path / "ha-lucarne.js"
    bundle.write_text("bundle")
    assert lucarne._bundle_digest(bundle, tmp_path / "nope.js") == "0"
