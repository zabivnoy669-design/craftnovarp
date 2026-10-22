from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def do_GET(self):
        if self.path == '/':
            self.path = '/home.html'
        super().do_GET()

ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
