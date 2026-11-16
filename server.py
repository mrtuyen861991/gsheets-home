import http.server
import socketserver
import json
import os
import sys
import time
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', 4000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(DIRECTORY, 'public')
DATA_FILE = os.path.join(DIRECTORY, 'data.json')
START_TIME = time.time()

default_data = {
    "todos": [
        {"id": "1", "title": "Khởi tạo máy chủ Node.js/Python trên cổng 4000", "completed": True, "createdAt": "2026-11-16T10:00:00Z"},
        {"id": "2", "title": "Xây dựng giao diện React với Tailwind CSS", "completed": True, "createdAt": "2026-11-16T10:00:00Z"},
        {"id": "3", "title": "Kết nối REST API giữa React và Backend", "completed": True, "createdAt": "2026-11-16T10:00:00Z"},
        {"id": "4", "title": "Thử nghiệm tính năng Todo & Ghi chú tương tác", "completed": False, "createdAt": "2026-11-16T10:00:00Z"}
    ],
    "notes": [
        {"id": "1", "title": "Chào mừng bạn!", "content": "Đây là ứng dụng web full-stack đơn giản trên cổng 4000.", "color": "blue", "createdAt": "2026-11-16T10:00:00Z"}
    ]
}

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return default_data

def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving data: {e}")

db = load_data()

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def send_json(self, status_code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path

        if path == '/api/status':
            uptime = int(time.time() - START_TIME)
            return self.send_json(200, {
                "status": "online",
                "port": PORT,
                "uptimeSeconds": uptime,
                "uptimeFormatted": f"{uptime // 60}m {uptime % 60}s",
                "nodeVersion": "Node.js/Python Runtime",
                "platform": sys.platform,
                "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ')
            })
        elif path == '/api/todos':
            return self.send_json(200, db['todos'])
        elif path == '/api/notes':
            return self.send_json(200, db['notes'])

        # Static files
        rel_path = 'index.html' if path == '/' else path.lstrip('/')
        file_path = os.path.join(PUBLIC_DIR, rel_path)
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(PUBLIC_DIR, 'index.html')

        ext = os.path.splitext(file_path)[1].lower()
        content_type = MIME_TYPES.get(ext, 'application/octet-stream')

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error: {e}")

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            parsed = json.loads(body)
        except Exception:
            return self.send_json(400, {"error": "Invalid JSON"})

        if path == '/api/todos':
            title = parsed.get('title', '').strip()
            if not title:
                return self.send_json(400, {"error": "Title required"})
            new_todo = {
                "id": str(int(time.time() * 1000)),
                "title": title,
                "completed": False,
                "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }
            db['todos'].insert(0, new_todo)
            save_data(db)
            return self.send_json(201, new_todo)
        elif path == '/api/notes':
            title = parsed.get('title', '').strip()
            if not title:
                return self.send_json(400, {"error": "Title required"})
            new_note = {
                "id": str(int(time.time() * 1000)),
                "title": title,
                "content": parsed.get('content', '').strip(),
                "color": parsed.get('color', 'blue'),
                "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }
            db['notes'].insert(0, new_note)
            save_data(db)
            return self.send_json(201, new_note)

        return self.send_json(404, {"error": "Endpoint not found"})

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    with ThreadedHTTPServer(('0.0.0.0', PORT), RequestHandler) as httpd:
        print(f"🚀 Server is running at http://localhost:{PORT}")
        httpd.serve_forever()
