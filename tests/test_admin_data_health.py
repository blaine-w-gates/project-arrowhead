import io
import json
import sys
from datetime import datetime
from pathlib import Path
import types
import zipfile

import pytest


class FakeGitHubClient:
    def __init__(self):
        self.artifacts = {"artifacts": []}
        self.zip_by_id = {}
        self.list_calls = 0

    def list_artifacts(self, per_page: int = 50):
        self.list_calls += 1
        return self.artifacts

    def download_artifact_zip(self, artifact_id: int) -> bytes:
        return self.zip_by_id[int(artifact_id)]


def make_zip_with_audit(audit_dict: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("seed-audit.json", json.dumps(audit_dict))
    return buf.getvalue()


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-admin")
    # Avoid accidental network usage
    monkeypatch.delenv("GITHUB_SERVER_TOKEN", raising=False)
    yield


@pytest.fixture()
def app_client(monkeypatch):
    import importlib

    project_root = str(Path(__file__).resolve().parent.parent)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    app_module = importlib.import_module("app")

    fake = FakeGitHubClient()
    monkeypatch.setattr(app_module, "get_github_client", lambda: fake)

    client = app_module.app.test_client()
    return types.SimpleNamespace(client=client, app_module=app_module, fake=fake)


def test_requires_admin_headers(app_client):
    c = app_client.client
    resp = c.get("/api/admin/data-health")
    assert resp.status_code == 403


def test_404_when_no_seed_audit_artifact(app_client):
    c = app_client.client
    fake = app_client.fake
    # Only non-matching or expired artifacts
    fake.artifacts = {
        "artifacts": [
            {"id": 1, "name": "other-artifact", "expired": False},
            {"id": 2, "name": "seed-audit", "expired": True},
        ]
    }

    resp = c.get("/api/admin/data-health", headers={"X-Admin-Key": "test-admin"})
    assert resp.status_code == 404
    body = resp.get_json()
    assert body["ok"] is False


def test_success_and_caching(app_client):
    c = app_client.client
    fake = app_client.fake

    # Newest artifact should be chosen
    fake.artifacts = {
        "artifacts": [
            {
                "id": 100,
                "name": "seed-audit-older",
                "expired": False,
                "created_at": "2025-08-29T10:00:00Z",
                "workflow_run": {"id": 111},
            },
            {
                "id": 101,
                "name": "seed-audit-latest",
                "expired": False,
                "created_at": "2025-08-29T12:00:00Z",
                "workflow_run": {"id": 222},
            },
        ]
    }

    audit = {
        "counts": {"fs": 10, "db": 10},
        "drift": {"onlyA": [], "onlyB": []},
        "timestamp": "2025-08-29T12:01:00Z",
    }
    fake.zip_by_id[101] = make_zip_with_audit(audit)

    # First call pulls from GitHubClient
    resp1 = c.get("/api/admin/data-health", headers={"X-Admin-Key": "test-admin"})
    assert resp1.status_code == 200
    body1 = resp1.get_json()
    assert body1["ok"] is True
    assert body1["drift_ok"] is True
    assert body1["counts"] == {"fs": 10, "db": 10}
    assert body1["drift"] == {"only_fs": [], "only_db": []}
    assert body1["cached"] is False
    assert body1["cache_ttl_seconds"] >= 1
    assert body1["run"]["id"] == 222
    assert body1["run"]["url"] and body1["run"]["url"].startswith("https://github.com/")

    # Second call should be served from cache within TTL
    resp2 = c.get("/api/admin/data-health", headers={"X-Admin-Key": "test-admin"})
    assert resp2.status_code == 200
    body2 = resp2.get_json()
    assert body2["cached"] is True
    # Only one call to list_artifacts should have happened
    assert fake.list_calls == 1
