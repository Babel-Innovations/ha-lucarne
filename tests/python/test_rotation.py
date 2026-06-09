"""Unit tests for rotation.py pure helpers."""
from __future__ import annotations

import json

from custom_components.lucarne_family.rotation import (
    next_owner,
    parse_owners,
    sanitize_owners,
    serialize_owners,
)


class TestSerializeOwners:
    def test_roundtrip(self) -> None:
        owners = ["alice", "bob", "cara"]
        assert parse_owners(serialize_owners(owners)) == owners

    def test_empty_list(self) -> None:
        assert serialize_owners([]) == "[]"
        assert parse_owners(serialize_owners([])) == []


class TestParseOwners:
    def test_empty_string_returns_empty_list(self) -> None:
        assert parse_owners("") == []

    def test_valid_json_array(self) -> None:
        assert parse_owners('["alice", "bob"]') == ["alice", "bob"]

    def test_malformed_json_returns_empty_list(self) -> None:
        assert parse_owners("not-json{{{") == []

    def test_non_array_json_returns_empty_list(self) -> None:
        # JSON object instead of array
        assert parse_owners('{"alice": 1}') == []

    def test_coerces_non_strings_to_str(self) -> None:
        raw = json.dumps([1, 2])
        assert parse_owners(raw) == ["1", "2"]


class TestSanitizeOwners:
    def test_drops_unknown_slugs(self) -> None:
        assert sanitize_owners(["alice", "ghost", "bob"], {"alice", "bob"}) == [
            "alice",
            "bob",
        ]

    def test_drops_duplicates_preserving_order(self) -> None:
        assert sanitize_owners(
            ["alice", "bob", "alice", "cara"], {"alice", "bob", "cara"}
        ) == ["alice", "bob", "cara"]

    def test_preserves_order(self) -> None:
        assert sanitize_owners(["cara", "alice", "bob"], {"alice", "bob", "cara"}) == [
            "cara",
            "alice",
            "bob",
        ]

    def test_empty_input(self) -> None:
        assert sanitize_owners([], {"alice", "bob"}) == []

    def test_all_unknown(self) -> None:
        assert sanitize_owners(["ghost", "zombie"], {"alice", "bob"}) == []

    def test_empty_known_slugs(self) -> None:
        assert sanitize_owners(["alice"], set()) == []


class TestNextOwner:
    def test_cycles_abc(self) -> None:
        owners = ["alice", "bob", "cara"]
        known = {"alice", "bob", "cara"}
        assert next_owner(owners, "alice", known) == "bob"
        assert next_owner(owners, "bob", known) == "cara"
        assert next_owner(owners, "cara", known) == "alice"

    def test_wraps_from_last_to_first(self) -> None:
        owners = ["alice", "bob", "cara"]
        known = {"alice", "bob", "cara"}
        assert next_owner(owners, "cara", known) == "alice"

    def test_skips_removed_middle_owner(self) -> None:
        # bob removed from family; alice→cara directly
        owners = ["alice", "bob", "cara"]
        known = {"alice", "cara"}
        assert next_owner(owners, "alice", known) == "cara"

    def test_current_was_removed_returns_first_remaining(self) -> None:
        owners = ["alice", "bob", "cara"]
        known = {"bob", "cara"}  # alice removed
        assert next_owner(owners, "alice", known) == "bob"

    def test_single_owner_always_returns_that_owner(self) -> None:
        owners = ["alice", "bob"]
        known = {"alice"}  # bob removed, only alice left
        assert next_owner(owners, "alice", known) == "alice"

    def test_empty_owners_returns_none(self) -> None:
        assert next_owner([], "alice", {"alice"}) is None

    def test_sanitized_empty_returns_none(self) -> None:
        # All owners removed from family
        owners = ["alice", "bob"]
        known = {"cara"}  # neither alice nor bob in family
        assert next_owner(owners, "alice", known) is None

    def test_current_not_in_list_at_all_returns_first(self) -> None:
        owners = ["bob", "cara"]
        known = {"bob", "cara"}
        assert next_owner(owners, "alice", known) == "bob"
