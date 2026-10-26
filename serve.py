from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class Server(ThreadingHTTPServer):
    allow_reuse_address = True

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def _rewrite_root(self):
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
