import os
import io
import json
import zipfile
from flask import Flask, send_from_directory, request, jsonify, make_response
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

# Data Health cache (separate TTL)
DATA_HEALTH_CACHE = None
DATA_HEALTH_TTL_SECONDS = 60

def _now_utc():
    return datetime.now(timezone.utc)


def get_github_client():
    """Factory to create a GitHubClient. Patched in tests."""
    return GitHubClient()


def _maybe_add_cors(resp):
    """Add CORS headers for approved SPA origins (bridge architecture)."""
    try:
        origin = request.headers.get("Origin")
        if not origin:
            return resp
        allowed = os.environ.get("ADMIN_CORS_ORIGINS")
        # Default allowlist: production domain and preview subdomains
        default_allowed = [
            "https://project-arrowhead.pages.dev",
        ]
        allowed_list = [s.strip() for s in (allowed.split(",") if allowed else default_allowed) if s.strip()]

        def origin_allowed(o: str) -> bool:
            if o in allowed_list:
                return True
            # Cloudflare Pages preview pattern: https://<id>--project-arrowhead.pages.dev
            return o.endswith("--project-arrowhead.pages.dev")

        if origin_allowed(origin):
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = ", ".join(filter(None, [resp.headers.get("Vary"), "Origin"]))
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Headers"] = "X-Admin-Key, Content-Type"
            resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    finally:
        return resp

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


# --- Admin: Data Health ---
def _select_seed_audit_artifact(artifacts: list[dict]) -> dict | None:
    candidates = []
    for a in artifacts or []:
        name = (a.get("name") or "").strip()
        if a.get("expired"):
            continue
        if name == "seed-audit" or name.startswith("seed-audit-"):
            candidates.append(a)
    if not candidates:
        return None

    def parse_dt(s: str | None) -> datetime:
        if not s:
            return datetime.min.replace(tzinfo=timezone.utc)
        # GitHub returns ISO8601 with Z
        try:
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            return datetime.fromisoformat(s)
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    candidates.sort(key=lambda x: parse_dt(x.get("created_at")), reverse=True)
    return candidates[0]


def _build_run_info(artifact: dict) -> dict | None:
    wr = artifact.get("workflow_run") or {}
    run_id = wr.get("id")
    if not run_id:
        return None
    owner = os.environ.get("GITHUB_OWNER")
    repo = os.environ.get("GITHUB_REPO")
    if not (owner and repo):
        full = os.environ.get("GITHUB_REPOSITORY", "/")
        if "/" in full:
            owner, repo = full.split("/", 1)
    url = (
        f"https://github.com/{owner}/{repo}/actions/runs/{run_id}"
        if owner and repo
        else f"https://github.com/actions/runs/{run_id}"
    )
    return {"id": run_id, "url": url}


@app.route('/api/admin/data-health', methods=['GET', 'OPTIONS'])
def api_admin_data_health():
    # Preflight CORS
    if request.method == 'OPTIONS':
        resp = make_response("", 204)
        return _maybe_add_cors(resp)

    ok, err = require_admin(request)
    if not ok:
        resp = jsonify({"ok": False, "error": err})
        resp.status_code = 403
        return _maybe_add_cors(resp)

    # Cache check
    global DATA_HEALTH_CACHE
    if DATA_HEALTH_CACHE:
        fetched_at = DATA_HEALTH_CACHE.get("fetched_at")
        if fetched_at and (_now_utc() - fetched_at) < timedelta(seconds=DATA_HEALTH_TTL_SECONDS):
            payload = dict(DATA_HEALTH_CACHE["data"])
            payload["cached"] = True
            resp = jsonify(payload)
            return _maybe_add_cors(resp)

    # Fetch latest artifact and parse seed-audit.json
    try:
        client = get_github_client()
        listing = client.list_artifacts(per_page=50)
        artifacts = listing.get("artifacts") or []
        artifact = _select_seed_audit_artifact(artifacts)
        if not artifact:
            resp = jsonify({"ok": False, "error": "No seed-audit artifact found"})
            resp.status_code = 404
            return _maybe_add_cors(resp)

        zip_bytes = client.download_artifact_zip(int(artifact["id"]))
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            # Find seed-audit.json anywhere in the archive
            member_name = None
            for name in zf.namelist():
                if name.endswith("seed-audit.json"):
                    member_name = name
                    break
            if not member_name:
                raise RuntimeError("seed-audit.json not found in artifact")
            with zf.open(member_name) as f:
                audit = json.loads(f.read().decode("utf-8"))

        counts = audit.get("counts") or {}
        fs_count = counts.get("fs")
        db_count = counts.get("db")
        drift = audit.get("drift") or {}
        only_fs = drift.get("onlyA") or drift.get("only_fs") or []
        only_db = drift.get("onlyB") or drift.get("only_db") or []

        drift_ok = (
            (fs_count is not None and db_count is not None and fs_count == db_count)
            and len(only_fs) == 0
            and len(only_db) == 0
        )

        run = _build_run_info(artifact)

        data = {
            "ok": True,
            "drift_ok": drift_ok,
            "counts": {"fs": fs_count, "db": db_count},
            "drift": {"only_fs": only_fs, "only_db": only_db},
            "timestamp": audit.get("timestamp"),
            "run": run,
            "artifact": {
                "id": artifact.get("id"),
                "name": artifact.get("name"),
                "expired": artifact.get("expired"),
                "size_in_bytes": artifact.get("size_in_bytes"),
                "created_at": artifact.get("created_at"),
                "expires_at": artifact.get("expires_at"),
            },
            "cached": False,
            "fetched_at": _now_utc().isoformat(),
            "cache_ttl_seconds": DATA_HEALTH_TTL_SECONDS,
        }

        DATA_HEALTH_CACHE = {"data": data, "fetched_at": _now_utc()}
        resp = jsonify(data)
        return _maybe_add_cors(resp)
    except Exception as e:
        resp = jsonify({"ok": False, "error": str(e)})
        resp.status_code = 502
        return _maybe_add_cors(resp)


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