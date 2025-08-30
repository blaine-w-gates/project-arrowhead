import os
from flask import Flask, send_from_directory, request, jsonify
from pathlib import Path
from datetime import datetime, timezone, timedelta

from backend.security import require_admin, issue_csrf, verify_csrf
from backend.github_client import GitHubClient

# Create the app
app = Flask(__name__, static_folder='.', static_url_path='')

# Configure the app
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# --- Sprint 2: Control Panel (Workflows) ---
# Hardcoded whitelist of admin workflows
WORKFLOW_MAP = {
    "verify-rls": "apply-rls.yml",
    "seed": "seed-blog.yml",
    "audit": "seed-audit.yml",
}

# Simple in-memory cache for status lookups
WORKFLOW_STATUS_CACHE = {}
WORKFLOW_STATUS_TTL_SECONDS = 20


def _now_utc():
    return datetime.now(timezone.utc)


def get_github_client():
    """Factory to create a GitHubClient. Patched in tests."""
    return GitHubClient()

@app.route('/')
def index():
    """Serve the main index.html file"""
    response = send_from_directory('.', 'index.html')
    # Add no-cache headers for development
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (HTML, CSS, JS, etc.)"""
    # Security check - prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        return "Invalid file path", 400
    
    try:
        response = send_from_directory('.', filename)
        # Add no-cache headers for development
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except FileNotFoundError:
        # For SPA-like behavior, serve index.html for non-existent routes
        # that don't have file extensions
        if '.' not in Path(filename).name:
            response = send_from_directory('.', 'index.html')
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        return "File not found", 404


# --- Admin: CSRF ---
@app.route('/api/admin/csrf', methods=['POST'])
def api_admin_csrf():
    ok, err = require_admin(request)
    if not ok:
        return jsonify({"ok": False, "error": err}), 403
    token = issue_csrf()
    return jsonify({"ok": True, "csrfToken": token})


# --- Admin: Workflows ---
def _validate_workflow_name(name: str):
    wf = WORKFLOW_MAP.get(name)
    if not wf:
        return None, jsonify({"ok": False, "error": "Unknown workflow name"}), 400
    return wf, None, None


@app.route('/api/admin/workflows/<name>/run', methods=['POST'])
def api_admin_workflow_run(name):
    ok, err = require_admin(request)
    if not ok:
        return jsonify({"ok": False, "error": err}), 403

    ok_csrf, err_csrf = verify_csrf(request)
    if not ok_csrf:
        return jsonify({"ok": False, "error": err_csrf}), 403

    workflow_file, resp, code = _validate_workflow_name(name)
    if not workflow_file:
        return resp, code

    try:
        client = get_github_client()
        client.dispatch_workflow(workflow_file, ref="main")
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    # Invalidate cache so next status fetch refreshes
    WORKFLOW_STATUS_CACHE.pop(name, None)

    return (
        jsonify({
            "ok": True,
            "name": name,
            "ref": "main",
            "dispatchedAt": _now_utc().isoformat(),
        }),
        202,
    )


@app.route('/api/admin/workflows/<name>/status', methods=['GET'])
def api_admin_workflow_status(name):
    ok, err = require_admin(request)
    if not ok:
        return jsonify({"ok": False, "error": err}), 403

    workflow_file, resp, code = _validate_workflow_name(name)
    if not workflow_file:
        return resp, code

    # Serve from cache if fresh
    cache = WORKFLOW_STATUS_CACHE.get(name)
    if cache:
        fetched_at = cache.get("fetched_at")
        if fetched_at and (_now_utc() - fetched_at) < timedelta(seconds=WORKFLOW_STATUS_TTL_SECONDS):
            payload = dict(cache["data"])
            payload["cached"] = True
            return jsonify(payload)

    try:
        client = get_github_client()
        latest = client.get_latest_run(workflow_file)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    data = {
        "ok": True,
        "name": name,
        "status": latest.get("status"),
        "conclusion": latest.get("conclusion"),
        "html_url": latest.get("html_url"),
        "run_id": latest.get("id"),
        "updated_at": latest.get("updated_at"),
        "cached": False,
    }
    WORKFLOW_STATUS_CACHE[name] = {"data": data, "fetched_at": _now_utc()}
    return jsonify(data)

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors by serving index.html for SPA behavior"""
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=5000, debug=True)