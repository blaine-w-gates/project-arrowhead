import os
import types
import time
import sys
from pathlib import Path

import pytest


class FakeGitHubClient:
    def __init__(self):
        self.dispatched = []
        self.status_calls = 0
        self.latest = {
            "status": "completed",
            "conclusion": "success",
            "html_url": "https://github.com/example/run/1",
            "id": 1,
            "updated_at": "2025-01-01T00:00:00Z",
        }

    def dispatch_workflow(self, workflow_file: str, ref: str = "main"):
        self.dispatched.append((workflow_file, ref))

    def get_latest_run(self, workflow_file: str):
        self.status_calls += 1
        return dict(self.latest)


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-admin")
    # Avoid accidental use of real network by ensuring server token is absent in tests
    monkeypatch.delenv("GITHUB_SERVER_TOKEN", raising=False)
    yield


@pytest.fixture()
def app_client(monkeypatch):
    # Import app and patch get_github_client to return our singleton fake
    import importlib
    # Ensure project root is on sys.path for `import app`
    project_root = str(Path(__file__).resolve().parent.parent)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    app_module = importlib.import_module("app")

    fake = FakeGitHubClient()
    monkeypatch.setattr(app_module, "get_github_client", lambda: fake)

    client = app_module.app.test_client()
    return types.SimpleNamespace(client=client, app_module=app_module, fake=fake)


def test_csrf_and_dispatch_seed(app_client):
    c = app_client.client

    # Issue CSRF
    resp = c.post("/api/admin/csrf", headers={"X-Admin-Key": "test-admin"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    csrf = data["csrfToken"]

    # Dispatch seed (main default)
    resp = c.post(
        "/api/admin/workflows/seed/run",
        headers={
            "X-Admin-Key": "test-admin",
            "X-CSRF-Token": csrf,
            "Content-Type": "application/json",
        },
        json={},
    )
    assert resp.status_code == 202
    body = resp.get_json()
    assert body["ok"] is True
    assert body["name"] == "seed"
    assert body["ref"] == "main"

    # Verify fake recorded dispatch
    assert app_client.fake.dispatched == [("seed-blog.yml", "main")]


def test_status_caching_within_ttl(app_client, monkeypatch):
    c = app_client.client

    # First call should fetch from fake
    resp1 = c.get("/api/admin/workflows/audit/status", headers={"X-Admin-Key": "test-admin"})
    assert resp1.status_code == 200
    body1 = resp1.get_json()
    assert body1["ok"] is True
    assert body1["name"] == "audit"
    assert body1["cached"] is False

    # Second call within TTL should be served from cache
    resp2 = c.get("/api/admin/workflows/audit/status", headers={"X-Admin-Key": "test-admin"})
    assert resp2.status_code == 200
    body2 = resp2.get_json()
    assert body2["cached"] is True

    # Only one status fetch should have happened
    assert app_client.fake.status_calls == 1


def test_unknown_workflow_returns_400(app_client):
    c = app_client.client
    resp = c.get("/api/admin/workflows/unknown/status", headers={"X-Admin-Key": "test-admin"})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["ok"] is False
    assert "Unknown workflow" in body["error"]


def test_requires_admin_headers(app_client):
    c = app_client.client
    # Missing admin key on CSRF
    resp = c.post("/api/admin/csrf")
    assert resp.status_code == 403

    # Missing admin key on status
    resp = c.get("/api/admin/workflows/seed/status")
    assert resp.status_code == 403
