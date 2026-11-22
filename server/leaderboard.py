"""Same-origin Endless leaderboard. Run from the repository root with Python 3."""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from collections import deque
from contextlib import closing
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, urlsplit

DB = Path(os.environ.get("BOARD_DB", Path(__file__).resolve().parent / "records.sqlite3"))
WORLDS = {"city", "garden", "jungle"}
MODES = {"easy", "hard"}
attempts = {}
lock = Lock()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def initialize():
    with closing(sqlite3.connect(DB)) as db:
        db.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS players(name TEXT PRIMARY KEY COLLATE NOCASE, secret TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, name TEXT NOT NULL, expires INT NOT NULL);
        CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, name TEXT NOT NULL, world TEXT NOT NULL,
            mode TEXT NOT NULL, started INT NOT NULL, score INT, ended INT);
        CREATE INDEX IF NOT EXISTS rankings ON runs(world,mode,name,score);
        CREATE INDEX IF NOT EXISTS history ON runs(name,ended DESC);
        """)


class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def require(condition, status, message):
    if not condition:
        raise Problem(status, message)


def limited(client):
    now = time.monotonic()
    with lock:
        if len(attempts) > 2000:
            for key in list(attempts):
                if attempts[key][-1] < now - 600:
                    del attempts[key]
            require(len(attempts) <= 2000, 429, "Try again later.")
        times = attempts.setdefault(client, deque())
        while times and times[0] < now - 600:
            times.popleft()
        require(len(times) < 25, 429, "Too many attempts. Try again later.")
        times.append(now)


class BoardMixin:
    def board(self):
        cookie = None
        status = 200
        try:
            url = urlsplit(self.path)
            action = url.path.removeprefix("/api/")
            now = int(time.time())
            client = self.client_address[0]
            tunneled = client in ("127.0.0.1", "::1") and self.headers.get("X-Forwarded-Proto") == "https"
            if tunneled:
                client = self.headers.get("CF-Connecting-IP", client)
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            session = digest(cookies["runner"].value if "runner" in cookies else "")
            data = {}
            if self.command == "POST":
                require(tunneled or self.client_address[0] in ("127.0.0.1", "::1"), 403, "Open the HTTPS game to sign in.")
                require(self.headers.get_content_type() == "application/json", 415, "JSON required.")
                origin = self.headers.get("Origin")
                require(not origin or urlsplit(origin).netloc == self.headers.get("Host"), 403, "Origin mismatch.")
                length = int(self.headers.get("Content-Length", "0"))
                require(0 < length <= 2048, 400, "Invalid request.")
                data = json.loads(self.rfile.read(length))
                require(isinstance(data, dict), 400, "Invalid request.")
            with closing(sqlite3.connect(DB, timeout=5)) as db, db:
                db.row_factory = sqlite3.Row
                if self.command == "POST":
                    db.execute("BEGIN IMMEDIATE")
                user = db.execute("SELECT name FROM sessions WHERE token=? AND expires>?", (session, now)).fetchone()
                name = user["name"] if user else None
                if self.command == "GET" and action == "board":
                    q = parse_qs(url.query)
                    world, mode = q.get("world", [""])[0], q.get("mode", [""])[0]
                    require(world in WORLDS and mode in MODES, 400, "Unknown board.")
                    args = (world, mode)
                    top = db.execute("SELECT name,max(score) AS score FROM runs WHERE world=? AND mode=? AND score IS NOT NULL GROUP BY name ORDER BY score DESC,name COLLATE NOCASE LIMIT 20", args)
                    recent = db.execute("SELECT score,ended FROM runs WHERE world=? AND mode=? AND name=? AND ended IS NOT NULL ORDER BY ended DESC,rowid DESC LIMIT 10", (*args,name))
                    result = dict(name=name, top=list(map(dict,top)), recent=list(map(dict,recent)))
                elif self.command == "POST" and action in ("register","login"):
                    limited(client)
                    handle = data.get("name")
                    require(isinstance(handle,str) and re.fullmatch(r"[a-zA-Z0-9_]{3,20}",handle),400,"Use 3â€“20 letters, numbers or underscores.")
                    result = {}
                    if action == "register":
                        secret = secrets.token_urlsafe(18)
                        try:
                            db.execute("INSERT INTO players VALUES (?,?)",(handle,digest(secret)))
                        except sqlite3.IntegrityError:
                            raise Problem(409,"That player ID is taken.")
                        result["code"] = secret
                    else:
                        player = db.execute("SELECT * FROM players WHERE name=?",(handle,)).fetchone()
                        require(player and isinstance(data.get("code"),str) and hmac.compare_digest(player["secret"],digest(data["code"])),401,"Player ID or code did not match.")
                        handle = player["name"]
                    token = secrets.token_urlsafe(32)
                    db.execute("DELETE FROM sessions WHERE expires<=? OR token=?",(now,session))
                    db.execute("INSERT INTO sessions VALUES (?,?,?)",(digest(token),handle,now+2592000))
                    cookie = f"runner={token}; Max-Age=2592000"
                    result["name"] = handle
                elif self.command == "POST" and action == "logout":
                    db.execute("DELETE FROM sessions WHERE token=?",(session,))
                    cookie = "runner=; Max-Age=0"
                    result = {}
                elif self.command == "POST" and action in ("start","finish"):
                    require(name,401,"Sign in to record a run.")
                    if action == "start":
                        world,mode = data.get("world"),data.get("mode")
                        require(isinstance(world,str) and world in WORLDS and isinstance(mode,str) and mode in MODES,400,"Unknown board.")
                        ticket = secrets.token_urlsafe(18)
                        db.execute("DELETE FROM runs WHERE name=? AND score IS NULL AND started<?",(name,now-86400))
                        count = db.execute("SELECT count(*) FROM runs WHERE name=? AND started>?",(name,now-60)).fetchone()[0]
                        require(count < 30,429,"Too many runs. Try again in a minute.")
                        db.execute("INSERT INTO runs VALUES (?,?,?,?,?,NULL,NULL)",(ticket,name,world,mode,now))
                        result = {"ticket":ticket}
                    else:
                        ticket,score = data.get("ticket"),data.get("score")
                        require(isinstance(ticket,str) and type(score) is int,400,"Invalid result.")
                        row = db.execute("SELECT * FROM runs WHERE id=? AND name=?",(ticket,name)).fetchone()
                        require(row and 0<=score<=250*(now-row["started"]+3) and now-row["started"]<86400,400,"Run expired or invalid.")
                        require(row["score"] in (None,score),409,"Run already recorded.")
                        db.execute("UPDATE runs SET score=?,ended=? WHERE id=? AND score IS NULL",(score,now,ticket))
                        result = {"saved":True}
                else:
                    raise Problem(404,"Unknown request.")
        except Problem as error:
            status,result = error.status,{"error":error.message}
        except (ValueError,TypeError):
            status,result = 400,{"error":"Invalid request."}
        except sqlite3.Error:
            status,result = 503,{"error":"Records are temporarily unavailable."}
        body = json.dumps(result).encode()
        self.send_response(status)
        if cookie:
            self.send_header("Set-Cookie",cookie+"; Path=/api/; HttpOnly; SameSite=Strict"+("; Secure" if tunneled else ""))
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    initialize()
    class Handler(BoardMixin, SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/api/"):
                return self.board()
            return super().do_GET()
        do_POST = BoardMixin.board
    os.chdir(Path(__file__).resolve().parents[1]/"dist")
    ThreadingHTTPServer(("127.0.0.1",int(os.environ.get("PORT","4173"))),Handler).serve_forever()
