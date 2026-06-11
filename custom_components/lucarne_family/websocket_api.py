"""WebSocket API commands for the Lucarne Family integration."""
from __future__ import annotations

from typing import cast

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback

from .const import DOMAIN

_WS_REGISTERED_KEY = "__ws_registered__"

# Bus events the frontend cares about for live card refresh. Relayed to clients
# via the lucarne_family/subscribe command below instead of having each client
# subscribe to the bus directly.
LUCARNE_FRONTEND_EVENTS: tuple[str, ...] = (
    "lucarne_family_task_added",
    "lucarne_family_task_completed",
    "lucarne_family_task_deleted",
    "lucarne_family_task_metadata_updated",
    "lucarne_family_task_toggled",
    "lucarne_family_all_routines_done",
    "lucarne_family_member_updated",
    "lucarne_family_avatar_uploaded",
)


@websocket_api.websocket_command({vol.Required("type"): "lucarne_family/get_family"})  # type: ignore[attr-defined]
@websocket_api.async_response  # type: ignore[attr-defined]
async def ws_get_family(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # type: ignore[name-defined]
    msg: dict[str, object],
) -> None:
    """Return the full family state for cards to subscribe to."""
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = next(
        (v for k, v in domain_data.items() if isinstance(v, dict) and "store" in v),
        None,
    )
    if entry_data is None:
        connection.send_error(msg["id"], "not_found", "Lucarne Family integration not set up")
        return

    store = entry_data["store"]
    entry_id = next(
        k for k, v in domain_data.items() if isinstance(v, dict) and "store" in v
    )
    entry = hass.config_entries.async_get_entry(entry_id)

    members = [m.to_dict() for m in store.get_members()]
    tasks = await store.async_get_all_task_metadata()

    payload = {
        "members": members,
        "task_metadata": tasks,
        "reset_time": (
            (entry.options or entry.data).get("reset_time", "04:00") if entry else "04:00"
        ),
        "streak_check_time": (
            (entry.options or entry.data).get("streak_check_time", "21:00") if entry else "21:00"
        ),
        "household_entity_id": "todo.lucarne_household",
    }
    connection.send_result(msg["id"], payload)


@websocket_api.websocket_command({vol.Required("type"): "lucarne_family/subscribe"})  # type: ignore[attr-defined]
@callback
def ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,  # type: ignore[name-defined]
    msg: dict[str, object],
) -> None:
    """Relay lucarne_family_* bus events to the subscribing client.

    Non-admin clients (e.g. the always-on kiosk tablet) cannot use HA's
    ``subscribe_events`` on arbitrary bus events — the WS layer rejects each
    attempt with ``Unauthorized`` and logs a server-side error, which the cards'
    auto-resubscribe-on-reconnect turned into a steady error flood. This command
    is not admin-gated: it runs the bus listeners server-side and forwards each
    event to the client, so non-admin frontends still get realtime refresh.
    """

    @callback
    def _forward(event: Event) -> None:
        # Relay only the event name. The frontend treats any relayed event
        # purely as a "refresh" cue and never reads the payload, so forwarding
        # the full bus ``event.data`` to non-admin clients would expose data for
        # no benefit. See docs/events.md ("Frontend consumption").
        connection.send_message(
            websocket_api.event_message(  # type: ignore[attr-defined]
                cast(int, msg["id"]),
                {"event_type": event.event_type},
            )
        )

    unsubs = [
        hass.bus.async_listen(event_type, _forward) for event_type in LUCARNE_FRONTEND_EVENTS
    ]

    @callback
    def _unsubscribe() -> None:
        for unsub in unsubs:
            unsub()

    connection.subscriptions[msg["id"]] = _unsubscribe
    connection.send_result(msg["id"])


def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register WebSocket commands once per HA process."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(_WS_REGISTERED_KEY):
        return
    websocket_api.async_register_command(hass, ws_get_family)
    websocket_api.async_register_command(hass, ws_subscribe)
    domain_data[_WS_REGISTERED_KEY] = True
