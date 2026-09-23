import json, os, shutil, socket, subprocess, tempfile, time, unittest, urllib.request, urllib.error
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
        (cls.root / "saves").mkdir()
        (cls.root / "saves/ABCDE.dat").write_text(json.dumps({"hero":{"name":"Legacy"},"currentFloor":1}))

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
        p=subprocess.run(['node','--input-type=module','-e',script],capture_output=True,text=True,timeout=20)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)

if __name__ == "__main__": unittest.main()
