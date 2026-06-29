from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os

PORT = 8000

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)

if __name__ == "__main__":
    with ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving on http://127.0.0.1:{PORT}")
        httpd.serve_forever()
