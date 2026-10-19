"""Data models for the Lucarne Family integration."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class RoutineTemplate:
    """A single routine template within a preset."""

    summary: str
    icon: str
    recurrence: str  # RRULE string
    time_of_day: str = "anytime"  # 'anytime' | 'morning' | 'afternoon' | 'night'

    def to_dict(self) -> dict[str, Any]:
        return {
            "summary": self.summary,
            "icon": self.icon,
            "recurrence": self.recurrence,
            "time_of_day": self.time_of_day,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RoutineTemplate:
        return cls(
            summary=data["summary"],
            icon=data["icon"],
            recurrence=data["recurrence"],
            time_of_day=data.get("time_of_day", "anytime"),
        )


@dataclass(frozen=True, slots=True)
class RoutinePreset:
    """A named set of routine templates."""

    slug: str
    display_name: str
    routines: list[RoutineTemplate] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "display_name": self.display_name,
            "routines": [r.to_dict() for r in self.routines],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RoutinePreset:
        return cls(
            slug=data["slug"],
            display_name=data["display_name"],
            routines=[RoutineTemplate.from_dict(r) for r in data.get("routines", [])],
        )


@dataclass(frozen=True, slots=True)
class Member:
    """A family member tracked by the integration."""

    slug: str
    name: str
    color: str
    avatar: str | None
    created_at: datetime
    preset: str
    todo_entity_id: str = ""
    streak_counter_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "color": self.color,
            "avatar": self.avatar,
            "created_at": self.created_at.isoformat(),
            "preset": self.preset,
            "todo_entity_id": self.todo_entity_id,
            "streak_counter_id": self.streak_counter_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Member:
        created_at = data["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        return cls(
            slug=data["slug"],
            name=data["name"],
            color=data["color"],
            avatar=data.get("avatar"),
            created_at=created_at,
            preset=data["preset"],
            todo_entity_id=data.get("todo_entity_id", ""),
            streak_counter_id=data.get("streak_counter_id", ""),
        )


@dataclass(frozen=True, slots=True)
class StreakRun:
    """A member's current streak: its length, first counted day, and whether today counted."""

    length: int
    run_start: date | None
    today_counted: bool
