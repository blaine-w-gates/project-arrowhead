import json
import types
import os
import pytest

import app as app_module
from app import app as flask_app


@pytest.fixture()
def client(monkeypatch):
    # Ensure ADMIN_API_KEY present for tests
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin')
    # Use Flask testing mode
    flask_app.config.update(TESTING=True)
    with flask_app.test_client() as client:
        yield client


def test_csrf_requires_admin_header(client, monkeypatch):
    # Missing admin header -> 403
    r = client.post('/api/admin/csrf')
    assert r.status_code == 403

    # With correct admin header -> 200 and token returned
    r2 = client.post('/api/admin/csrf', headers={'X-Admin-Key': 'test-admin'})
    assert r2.status_code == 200
    data = r2.get_json()
    assert isinstance(data, dict)
    assert 'csrfToken' in data and isinstance(data['csrfToken'], str) and len(data['csrfToken']) > 0


def test_health_requires_admin_and_csrf(client, monkeypatch):
    # Prepare a fake GitHub client to avoid network and token requirements
    class FakeGitHubClient:
        def __init__(self, *args, **kwargs):
            pass
        def get_user(self):
            return ({'login': 'fake-user', 'id': 12345}, 'read:user')

    # Patch the GitHubClient symbol imported into the app module
    monkeypatch.setattr(app_module, 'GitHubClient', FakeGitHubClient)

    # 1) Missing admin header -> 403
    r1 = client.get('/api/admin/health/github')
    assert r1.status_code == 403

    # 2) With admin but no CSRF -> 403
    r2 = client.get('/api/admin/health/github', headers={'X-Admin-Key': 'test-admin'})
    assert r2.status_code == 403

    # 3) With admin + valid CSRF -> 200 ok True
    r_csrf = client.post('/api/admin/csrf', headers={'X-Admin-Key': 'test-admin'})
    token = r_csrf.get_json()['csrfToken']

    r3 = client.get('/api/admin/health/github', headers={
        'X-Admin-Key': 'test-admin',
        'X-CSRF-Token': token,
    })
    assert r3.status_code == 200
    data = r3.get_json()
    assert data['ok'] is True
    assert data['login'] == 'fake-user'
    assert data['id'] == 12345
    assert 'scopes' in data
