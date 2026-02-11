import os
from app import app

if __name__ == '__main__':
    # For local development
    debug_mode = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true")
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
