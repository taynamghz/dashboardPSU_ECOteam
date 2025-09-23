#!/usr/bin/env python3
"""
Simple HTTP server to serve the dashboard and CSV data
Run this script and open http://localhost:8000 in your browser
"""

import http.server
import socketserver
import os
import urllib.parse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle CSV file requests
        if self.path.startswith('/csv/'):
            # Extract the file path from the URL
            file_path = urllib.parse.unquote(self.path[5:])  # Remove '/csv/' prefix
            
            print(f"Requested CSV file: {file_path}")  # Debug output
            
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                print(f"Successfully served CSV file: {file_path}")
            else:
                print(f"CSV file not found: {file_path}")
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'File not found: {file_path}'.encode())
        else:
            # Serve regular files
            super().do_GET()

if __name__ == "__main__":
    PORT = 8000
    
    # Change to the dashboard directory
    os.chdir('/Users/taynamghz./Documents/JM_dashboard')
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Open this URL in your browser to view the dashboard")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
