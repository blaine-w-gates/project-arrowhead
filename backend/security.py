import os
import secrets
from typing import Tuple, Optional
from flask import Request, session

# Environment: ADMIN_API_KEY must be set in the server environment


def require_admin(request: Request) -> Tuple[bool, Optional[str]]:
    """Validate the admin key present in X-Admin-Key header.

    Returns (ok, error).
    """
    admin_api_key = os.environ.get("ADMIN_API_KEY")
    if not admin_api_key:
        return False, "Server misconfigured: ADMIN_API_KEY is not set"

    header_key = request.headers.get("X-Admin-Key")
    if not header_key:
        return False, "Missing X-Admin-Key"

    if header_key != admin_api_key:
        return False, "Invalid admin key"

    return True, None


def issue_csrf() -> str:
    """Create a CSRF token and store it in the Flask session."""
    token = secrets.token_urlsafe(32)
    session["csrf_token"] = token
    return token


def verify_csrf(request: Request) -> Tuple[bool, Optional[str]]:
    """Verify the X-CSRF-Token header matches the token in session.

    Returns (ok, error).
    """
    expected = session.get("csrf_token")
    if not expected:
        return False, "Missing CSRF token in session"

    got = request.headers.get("X-CSRF-Token")
    if not got:
        return False, "Missing X-CSRF-Token"

    if got != expected:
        return False, "Invalid CSRF token"

    return True, None
