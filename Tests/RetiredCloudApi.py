import hashlib, json, shutil, socket, subprocess, tempfile, time, unittest, urllib.request, urllib.error
from pathlib import Path


class RetiredCloudApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        shutil.copy(Path(__file__).resolve().parents[1] / "public/api/save.php", cls.root / "api.php")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        cls.url = f"http://127.0.0.1:{port}/api.php?code=ABCDE"
        cls.log = open(cls.root / "server.log", "w+")
        cls.proc = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", str(cls.root)], stdout=cls.log, stderr=cls.log)
        for _ in range(100):
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.1):
                    break
            except OSError:
                time.sleep(.02)
        else:
            raise RuntimeError("PHP fixture server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(timeout=5)
        cls.log.close()
        cls.temp.cleanup()

    def setUp(self):
        for name in ["saves", "ratelimit"]:
            shutil.rmtree(self.root / name, ignore_errors=True)

    def request(self, method, authenticated):
        data = json.dumps({"code": "ABCDE", "token": "a" * 32, "data": '{"hero":{"name":"Dummy"},"currentFloor":1}'}).encode() if method in ["POST", "PUT", "PATCH"] else None
        headers = {"Content-Type": "application/json"}
        if authenticated:
            headers["Authorization"] = "Bearer " + "a" * 32
        req = urllib.request.Request(self.url, data=data, method=method, headers=headers)
        try:
            response = urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            self.assertEqual(response.status, 410)
            self.assertIn("application/json", response.headers["Content-Type"])
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            body = response.read()
            if method != "HEAD":
                self.assertIn("retired", json.loads(body)["error"].lower())

    def test_all_methods_are_retired_without_creating_runtime_storage(self):
        for method in ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD"]:
            for authenticated in [False, True]:
                with self.subTest(method=method, authenticated=authenticated):
                    self.request(method, authenticated)
                    self.assertFalse((self.root / "saves").exists())
                    self.assertFalse((self.root / "ratelimit").exists())

    def test_all_methods_leave_existing_runtime_files_untouched(self):
        for name in ["saves", "ratelimit"]:
            (self.root / name).mkdir()
        fixtures = {
            "saves/ABCDE.dat": "private dummy save",
            "saves/ABCDE.auth": hashlib.sha256(("a" * 32).encode()).hexdigest(),
            "saves/ABCDE.owner": "private dummy owner",
            "saves/.allocation.salt": "private dummy salt",
            "ratelimit/counter.json": "[1]",
        }
        for path, value in fixtures.items():
            (self.root / path).write_text(value)
        def snapshot():
            return {str(file.relative_to(self.root)): (file.read_bytes(), file.stat().st_mtime_ns)
                    for directory in [self.root / "saves", self.root / "ratelimit"]
                    for file in directory.iterdir() if file.is_file()}
        before = snapshot()
        for method in ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD"]:
            for authenticated in [False, True]:
                with self.subTest(method=method, authenticated=authenticated):
                    self.request(method, authenticated)
                    self.assertEqual(snapshot(), before)


if __name__ == "__main__":
    unittest.main()
