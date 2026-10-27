from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class Server(ThreadingHTTPServer):
    allow_reuse_address = True

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def _rewrite_root(self):
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        if 'If-None-Match' in self.headers:
            del self.headers['If-None-Match']
        path, sep, query = self.path.partition('?')
        if path == '/':
            self.path = '/home.html' + (sep + query if sep else '')

    def do_GET(self):
        self._rewrite_root()
        super().do_GET()

    def do_HEAD(self):
        self._rewrite_root()
        super().do_HEAD()

Server(('0.0.0.0', 8080), Handler).serve_forever()
