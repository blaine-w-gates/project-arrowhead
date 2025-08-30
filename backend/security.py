import os
import secrets
from flask import request, session, abort

ADMIN_HEADER = 'X-Admin-Key'
CSRF_HEADER = 'X-CSRF-Token'


def require_admin() -> None:
    """Abort if the request does not present the correct admin key.
    The expected key is read from ADMIN_API_KEY environment variable.
    """
    expected = os.environ.get('ADMIN_API_KEY')
    if not expected:
        abort(500, description='Server misconfigured: missing ADMIN_API_KEY')
    provided = request.headers.get(ADMIN_HEADER)
    if not provided or provided != expected:
        abort(403, description='Forbidden: admin key missing or invalid')


def issue_csrf() -> str:
    """Create (or reuse) a CSRF token bound to the session and return it."""
    token = session.get('csrf_token')
    if not token:
        token = secrets.token_urlsafe(32)
        session['csrf_token'] = token
    return token


def verify_csrf() -> None:
    """Abort if CSRF header does not match the session token."""
    header = request.headers.get(CSRF_HEADER)
    token = session.get('csrf_token')
    if not token or not header or header != token:
        abort(403, description='Forbidden: bad CSRF token')
