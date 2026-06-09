"""Verify services.yaml stays in sync with the Python voluptuous schemas."""
from __future__ import annotations

from pathlib import Path

import yaml

_SERVICES_YAML = (
    Path(__file__).parents[2] / "custom_components" / "lucarne_family" / "services.yaml"
)

# Service name → expected field names (public service key, not store key)
_EXPECTED_FIELDS: dict[str, set[str]] = {
    "add_task": {
        "member", "summary", "type", "recurrence", "icon",
        "due", "source", "assignee", "time_of_day",
        "rotation_owners", "current_owner",
    },
    "update_task_metadata": {
        "uid", "icon", "recurrence", "type", "assignee", "time_of_day",
        "rotation_owners", "current_owner",
    },
    "delete_task": {"uid"},
    "toggle_task": {"uid"},
    "upload_avatar": {"member", "image_data", "mime_type"},
    "set_member_avatar": {"member", "avatar"},
    # Phase 3 internal services — no user-supplied fields.
    "perform_daily_reset": set(),
    "evaluate_all_streaks": set(),
}


def test_services_yaml_exists() -> None:
    assert _SERVICES_YAML.exists(), f"services.yaml not found at {_SERVICES_YAML}"


def test_services_yaml_all_services_present() -> None:
    data = yaml.safe_load(_SERVICES_YAML.read_text())
    for service in _EXPECTED_FIELDS:
        assert service in data, f"Service {service!r} missing from services.yaml"


def test_services_yaml_all_fields_present() -> None:
    data = yaml.safe_load(_SERVICES_YAML.read_text())
    for service, expected in _EXPECTED_FIELDS.items():
        actual = set((data[service].get("fields") or {}).keys())
        missing = expected - actual
        assert not missing, f"{service}: missing fields in services.yaml: {missing}"


def test_services_yaml_voluptuous_schema_fields_match() -> None:
    """Verify that Python voluptuous schemas use the same field names as services.yaml."""
    from custom_components.lucarne_family.member_service import SET_MEMBER_AVATAR_SCHEMA
    from custom_components.lucarne_family.task_service import (
        ADD_TASK_SCHEMA,
        DELETE_TASK_SCHEMA,
        TOGGLE_TASK_SCHEMA,
        UPDATE_METADATA_SCHEMA,
    )

    def _keys(schema) -> set[str]:
        return {str(k) for k in schema.schema}

    schema_fields = {
        "add_task": _keys(ADD_TASK_SCHEMA),
        "update_task_metadata": _keys(UPDATE_METADATA_SCHEMA),
        "delete_task": _keys(DELETE_TASK_SCHEMA),
        "toggle_task": _keys(TOGGLE_TASK_SCHEMA),
        "set_member_avatar": _keys(SET_MEMBER_AVATAR_SCHEMA),
    }

    data = yaml.safe_load(_SERVICES_YAML.read_text())
    for service, py_fields in schema_fields.items():
        yaml_fields = set((data[service].get("fields") or {}).keys())
        missing_in_yaml = py_fields - yaml_fields
        missing_in_py = yaml_fields - py_fields
        assert not missing_in_yaml, f"{service}: Python fields not in yaml: {missing_in_yaml}"
        assert not missing_in_py, f"{service}: yaml fields not in Python schema: {missing_in_py}"
