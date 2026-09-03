"""Tests for models.py."""
from __future__ import annotations

from datetime import UTC, datetime

from custom_components.lucarne_family.models import Member, RoutinePreset, RoutineTemplate


def _make_member() -> Member:
    return Member(
        slug="anna",
        name="Anna",
        color="#f5c89c",
        avatar="🧒",
        created_at=datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC),
        preset="school-age",
        todo_entity_id="todo.anna",
        streak_counter_id="counter.anna_streak",
    )


def test_routine_template_round_trip() -> None:
    rt = RoutineTemplate(summary="Brush teeth", icon="🪥", recurrence="FREQ=DAILY")
    restored = RoutineTemplate.from_dict(rt.to_dict())
    assert restored == rt


def test_routine_preset_round_trip() -> None:
    rt = RoutineTemplate(summary="Brush teeth", icon="🪥", recurrence="FREQ=DAILY")
    preset = RoutinePreset(slug="school-age", display_name="School-age kid", routines=[rt])
    restored = RoutinePreset.from_dict(preset.to_dict())
    assert restored == preset


def test_routine_preset_empty_routines() -> None:
    preset = RoutinePreset(slug="adult-none", display_name="Adult (none)", routines=[])
    restored = RoutinePreset.from_dict(preset.to_dict())
    assert restored.routines == []


def test_member_round_trip() -> None:
    member = _make_member()
    restored = Member.from_dict(member.to_dict())
    assert restored == member


def test_member_round_trip_no_avatar() -> None:
    member = Member(
        slug="ben",
        name="Ben",
        color="#abc123",
        avatar=None,
        created_at=datetime(2024, 3, 1, 0, 0, 0, tzinfo=UTC),
        preset="toddler",
    )
    restored = Member.from_dict(member.to_dict())
    assert restored.avatar is None
    assert restored.todo_entity_id == ""
    assert restored.streak_counter_id == ""


def test_member_preserves_all_fields() -> None:
    member = _make_member()
    d = member.to_dict()
    assert d["slug"] == "anna"
    assert d["name"] == "Anna"
    assert d["color"] == "#f5c89c"
    assert d["avatar"] == "🧒"
    assert d["preset"] == "school-age"
    assert d["todo_entity_id"] == "todo.anna"
    assert d["streak_counter_id"] == "counter.anna_streak"


def test_member_apple_list_defaults_blank_and_round_trips() -> None:
    member = _make_member()
    assert member.apple_list == ""
    assert Member.from_dict(member.to_dict()).apple_list == ""

    synced = Member.from_dict({**member.to_dict(), "apple_list": "Anna"})
    assert synced.apple_list == "Anna"
    assert synced.to_dict()["apple_list"] == "Anna"


def test_member_from_dict_tolerates_pre_bridge_data() -> None:
    """Entries written before the bridge field existed load with a blank list."""
    data = _make_member().to_dict()
    del data["apple_list"]
    assert Member.from_dict(data).apple_list == ""
