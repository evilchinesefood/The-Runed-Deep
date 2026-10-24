import fcntl, hashlib, json, os, shutil, socket, subprocess, tempfile, time, unittest, urllib.request, urllib.error
from pathlib import Path

class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        cls.prepare()
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]
        cls.url = f"http://127.0.0.1:{port}/api.php"
        cls.log = open(cls.root / "server.log", "w+")
        cls.proc = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", str(cls.root)], stdout=cls.log, stderr=cls.log)
        for _ in range(100):
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.1): break
            except OSError: time.sleep(.02)
        else: raise RuntimeError("PHP test server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate(); cls.proc.wait(timeout=5); cls.log.close(); cls.temp.cleanup()

    def req(self, query="", body=None, token=None, raw=None):
        headers = {}
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        if data is not None: headers["Content-Type"] = "application/json"
        if token is not None: headers["Authorization"] = "Bearer " + token
        req = urllib.request.Request(self.url + query, data=data, headers=headers)
        try: r = urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as e: r=e
        with r:
            content=r.read().decode()
            try: content=json.loads(content)
            except ValueError: pass
            return r.status, content

    @classmethod
    def prepare(cls):
        shutil.copy(Path(__file__).resolve().parents[1] / "public/api/save.php", cls.root / "api.php")

    def setUp(self):
        for name in ["saves", "ratelimit"]:
            shutil.rmtree(self.root / name, ignore_errors=True)
            (self.root / name).mkdir()
        self.save = json.dumps({"hero":{"name":"Test"},"currentFloor":1})
        self.token = "a" * 32
        (self.root / "saves/ABCDE.dat").write_text(json.dumps({"hero":{"name":"Legacy"},"currentFloor":1}))

    def write(self, code, token=None):
        return self.req(body={"code":code,"token":token or self.token,"data":self.save})

    def age_allocations(self):
        markers = list((self.root / "saves").glob("*.owner"))
        self.assertTrue(markers, "New allocations must retain durable ownership metadata")
        for marker in markers:
            data = json.loads(marker.read_text())
            data["created"] = int(time.time()) - 90000
            marker.write_text(json.dumps(data))

    def fill_global_capacity(self):
        # Only disposable fixture storage is populated. Existing production saves
        # and the real application's runtime directories are never opened.
        for index in range(500 - len(list((self.root / "saves").glob("*.dat")))):
            (self.root / "saves" / f"fixture-{index}.dat").write_text(self.save)

    def test_new_allocations_have_durable_daily_limit(self):
        for code in ["FGHJK", "MNPQR", "STUVW"]:
            self.assertEqual(self.write(code)[0], 200)
        # Normal hourly-rate cleanup must not erase the allocation budget.
        shutil.rmtree(self.root / "ratelimit")
        self.assertEqual(self.write("XYZ23")[0], 429)
        self.assertFalse((self.root / "saves/XYZ23.dat").exists())
        self.assertEqual(self.write("FGHJK")[0], 200)

    def test_active_allocation_limit_survives_daily_window(self):
        for code in ["FGHJK", "MNPQR", "STUVW"]:
            self.assertEqual(self.write(code)[0], 200)
        self.age_allocations()
        for code in ["XYZ23", "45678", "9ABCD"]:
            self.assertEqual(self.write(code)[0], 200)
        self.age_allocations()
        self.assertEqual(self.write("EFGHJ")[0], 429)
        self.assertEqual(self.write("FGHJK")[0], 200)
        self.assertEqual(len(list((self.root / "saves").glob("*.dat"))), 7)
        self.fill_global_capacity()
        self.assertEqual(self.write("FGHJK")[0], 200)
        self.assertEqual(len(list((self.root / "saves").glob("*.dat"))), 500)

    def test_stale_allocations_stop_counting_without_deleting_old_saves(self):
        for code in ["FGHJK", "MNPQR", "STUVW"]:
            self.assertEqual(self.write(code)[0], 200)
        self.age_allocations()
        for code in ["XYZ23", "45678", "9ABCD"]:
            self.assertEqual(self.write(code)[0], 200)
        self.age_allocations()
        for file in (self.root / "saves").glob("*.dat"):
            os.utime(file, (1, 1))
        self.assertEqual(self.write("EFGHJ")[0], 200)
        self.assertEqual(len(list((self.root / "saves").glob("*.dat"))), 8)
        self.assertEqual(self.req("?code=FGHJK", token=self.token)[0], 200)

    def test_collision_and_wrong_token_do_not_use_allocation_budget(self):
        self.assertEqual(self.write("ABCDE")[0], 409)
        self.assertEqual(self.write("FGHJK")[0], 200)
        self.assertEqual(self.write("FGHJK", "b" * 32)[0], 403)
        for code in ["MNPQR", "STUVW"]:
            self.assertEqual(self.write(code)[0], 200)
        self.assertEqual(self.write("XYZ23")[0], 429)

    def test_unmarked_existing_saves_are_grandfathered_at_global_capacity(self):
        (self.root / "saves/FGHJK.dat").write_text(self.save)
        (self.root / "saves/FGHJK.auth").write_text(hashlib.sha256(self.token.encode()).hexdigest())
        self.fill_global_capacity()
        self.assertEqual(self.write("FGHJK")[0], 200)
        self.assertFalse((self.root / "saves/FGHJK.owner").exists())
        self.assertEqual(self.req("?code=ABCDE")[0], 200)
        self.assertEqual(self.write("MNPQR")[0], 507)
        self.assertEqual(len(list((self.root / "saves").glob("*.dat"))), 500)

    def test_owner_metadata_is_private_and_not_a_raw_ip(self):
        self.assertEqual(self.write("FGHJK")[0], 200)
        marker = self.root / "saves/FGHJK.owner"
        self.assertTrue(marker.exists())
        metadata = json.loads(marker.read_text())
        salt = self.root / "saves/.allocation.salt"
        self.assertTrue(salt.exists())
        self.assertRegex(metadata["owner"], r"^[a-f0-9]{64}$")
        self.assertNotIn("127.0.0.1", marker.read_text())
        for file in [marker, salt]:
            self.assertEqual(file.stat().st_mode & 0o077, 0)

    def test_invalid_ownership_metadata_fails_closed_only_for_allocations(self):
        self.assertEqual(self.write("FGHJK")[0], 200)
        (self.root / "saves/FGHJK.owner").write_text("invalid")
        self.assertEqual(self.write("MNPQR")[0], 503)
        self.assertFalse((self.root / "saves/MNPQR.dat").exists())
        self.assertEqual(self.write("FGHJK")[0], 200)

    def test_missing_owner_salt_cannot_reset_allocation_budget(self):
        self.assertEqual(self.write("FGHJK")[0], 200)
        salt = self.root / "saves/.allocation.salt"
        self.assertTrue(salt.exists())
        salt.unlink()
        self.assertEqual(self.write("MNPQR")[0], 503)
        self.assertEqual(self.write("FGHJK")[0], 200)

    def test_write_lock_contention_does_not_change_saves(self):
        with (self.root / "saves/.write.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(self.write("FGHJK")[0], 503)
        self.assertFalse((self.root / "saves/FGHJK.dat").exists())
        self.assertEqual(self.write("FGHJK")[0], 200)

    def test_authorization_and_migration(self):
        save=json.dumps({"hero":{"name":"Test"},"currentFloor":1})
        token="a"*32
        self.assertEqual(self.req("?code=ABCDE")[0],200)
        self.assertEqual(self.req(body={"code":"ABCDE","token":token,"data":save})[0],409)
        self.assertEqual(json.loads((self.root/"saves/ABCDE.dat").read_text())["hero"]["name"],"Legacy")
        self.assertEqual(self.req(body={"code":"FGHJK","data":save})[0],403)
        self.assertEqual(self.req(body={"code":"FGHJK","token":token,"data":save})[0],200)
        self.assertEqual(self.req("?code=FGHJK")[0],403)
        self.assertEqual(self.req("?code=FGHJK",token="b"*32)[0],403)
        self.assertEqual(self.req("?code=FGHJK",token=token)[0],200)
        changed=json.dumps({"hero":{"name":"Updated"},"currentFloor":2})
        self.assertEqual(self.req(body={"code":"FGHJK","token":"b"*32,"data":changed})[0],403)
        self.assertEqual(self.req("?code=FGHJK",token=token)[1]["currentFloor"],1)
        self.assertEqual(self.req(body={"code":"FGHJK","token":token,"data":changed})[0],200)
        self.assertEqual(self.req("?code=FGHJK",token=token)[1]["currentFloor"],2)
        self.assertEqual(self.req("?code=../ABCDE")[0],400)
        self.assertEqual(self.req(raw=b"x"*1100001)[0],413)
        self.assertEqual((self.root/"saves/FGHJK.dat").stat().st_mode&0o077,0)
        self.assertNotIn(token,(self.root/"saves/FGHJK.auth").read_text())

    def test_browser_client_roundtrip(self):
        module=(Path(__file__).resolve().parents[1]/"src/core/CloudSave.ts").as_uri()
        script="""
import assert from 'node:assert/strict';
globalThis.location={hostname:'dev.jdayers.com'};
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const realFetch=globalThis.fetch;const urls=[];
globalThis.fetch=(url,init)=>{urls.push(url);return realFetch(BASE+String(url).replace('/rd/api/save.php',''),init)};
const cloud=await import(MODULE);
cloud.setCloudCode(1,'ABCDE');
assert.equal(await cloud.pushSave('ABCDE',JSON.stringify({hero:{name:'Migrated'},currentFloor:3})),true);
const recovery=cloud.getCloudCode(1);assert.equal(recovery.length,38);assert.notEqual(recovery,'ABCDE');
assert.equal(JSON.parse(await cloud.pullSave(recovery)).hero.name,'Migrated');
assert.equal(urls.some(u=>u.includes(recovery.split('-')[1])),false);
assert.equal(cloud.isCloudCode(recovery.toUpperCase()),true);
console.log('Client recovery-code migration and roundtrip passed');
""".replace('BASE',json.dumps(self.url)).replace('MODULE',json.dumps(module))
        loader=str(Path(__file__).resolve().parent/'TypeScriptLoader.mjs')
        p=subprocess.run(['node','--import',loader,'--input-type=module','-e',script],capture_output=True,text=True,timeout=20)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)

if __name__ == "__main__": unittest.main()
