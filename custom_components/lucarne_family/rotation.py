"""Pure rotation-math helpers for the Lucarne Family rotating task type.

No HA imports, no I/O — these functions are trivially unit-testable.
"""
from __future__ import annotations

import json
import logging

_LOGGER = logging.getLogger(__name__)


def serialize_owners(owners: list[str]) -> str:
    """Return the owners list as a JSON string for storage."""
    return json.dumps(owners)


def parse_owners(raw: str) -> list[str]:
    """Parse a stored owners JSON string; return [] on empty or malformed input."""
    if not raw:
        return []
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return [str(s) for s in result]
        return []
    except (json.JSONDecodeError, ValueError):
        _LOGGER.debug("rotation.parse_owners: malformed JSON %r; returning []", raw)
        return []


def sanitize_owners(owners: list[str], known_slugs: set[str]) -> list[str]:
    """Drop unknown slugs and duplicates, preserving order."""
    seen: set[str] = set()
    result: list[str] = []
    for slug in owners:
        if slug in known_slugs and slug not in seen:
            seen.add(slug)
            result.append(slug)
    return result


def next_owner(owners: list[str], current: str, known_slugs: set[str]) -> str | None:
    """Compute the next owner after `current`, sanitizing against known_slugs.

    - Returns None if the sanitized list is empty.
    - If current is no longer in the sanitized list, returns the first owner.
    - Otherwise advances cyclically (wraps from last to first).
    """
    valid = sanitize_owners(owners, known_slugs)
    if not valid:
        return None
    if current not in valid:
        return valid[0]
    idx = valid.index(current)
    return valid[(idx + 1) % len(valid)]
