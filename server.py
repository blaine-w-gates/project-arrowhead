#!/usr/bin/env python3
"""
Simple HTTP Server for Project Arrowhead
Serves static files for local development and testing
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 5000
HOST = '0.0.0.0'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with better error handling and logging"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        """Add custom headers for better development experience"""
        # Prevent caching during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        super().end_headers()
    
    def do_GET(self):
        """Handle GET requests with fallback to index.html for SPA behavior"""
        path = self.translate_path(self.path)
        
        # If the requested file doesn't exist and it's not an asset request,
        # serve index.html (for SPA routing simulation)
        if not os.path.exists(path) and not self.path.startswith('/static') and not '.' in os.path.basename(self.path):
            self.path = '/index.html'
        
        return super().do_GET()
    
    def log_message(self, format, *args):
        """Custom log format with timestamp"""
        import datetime
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

def check_required_files():
    """Check if required files exist"""
    required_files = [
        'index.html',
        'style.css',
        'main.js',
        'TaskListPage.html'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"Warning: Missing required files: {', '.join(missing_files)}")
        print("The application may not work correctly.")
        return False
    
    return True

def print_server_info():
    """Print server startup information"""
    print("=" * 60)
    print("Project Arrowhead - Development Server")
    print("=" * 60)
    print(f"Server running at: http://{HOST}:{PORT}")
    print(f"Local access: http://localhost:{PORT}")
    print(f"Serving files from: {os.getcwd()}")
    print()
    print("Available pages:")
    print(f"  • Homepage: http://localhost:{PORT}/")
    print(f"  • Task List: http://localhost:{PORT}/TaskListPage.html")
    print(f"  • Brainstorm: http://localhost:{PORT}/brainstorm_step1.html")
    print(f"  • Choose: http://localhost:{PORT}/choose_step1.html")
    print(f"  • Objectives: http://localhost:{PORT}/objectives_step1.html")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)

def main():
    """Main server function"""
    # Change to the directory containing this script
    os.chdir(Path(__file__).parent)
    
    # Check for required files
    check_required_files()
    
    # Create server
    try:
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            print_server_info()
            
            # Start serving
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Error: Port {PORT} is already in use.")
            print("Please stop any other servers running on this port or use a different port.")
            sys.exit(1)
        else:
            print(f"Error starting server: {e}")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("Server stopped by user")
        print("Thank you for using Project Arrowhead!")
        print("=" * 60)

if __name__ == "__main__":
    main()
