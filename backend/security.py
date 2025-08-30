import os
import secrets
from flask import request, session, abort

ADMIN_HEADER = "X-Admin-Key"
CSRF_HEADER = "X-CSRF-Token"
SESSION_CSRF_KEY = "_csrf_token"

def require_admin():
    admin_key = os.environ.get("ADMIN_API_KEY")
    provided = request.headers.get(ADMIN_HEADER)
    if not admin_key or provided != admin_key:
        abort(403)

def issue_csrf():
    token = secrets.token_urlsafe(32)
    session[SESSION_CSRF_KEY] = token
    return token

def verify_csrf():
    token = request.headers.get(CSRF_HEADER)
    expected = session.get(SESSION_CSRF_KEY)
    if not token or not expected or token != expected:
        abort(403)
