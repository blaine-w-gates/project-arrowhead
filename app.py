import os
from flask import Flask, send_from_directory, request
from pathlib import Path

# Create the app
app = Flask(__name__, static_folder='.', static_url_path='')

# Configure the app
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

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

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors by serving index.html for SPA behavior"""
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=5000, debug=True)