"""Exercise the public HTTP interface against an isolated temporary database."""
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

with tempfile.TemporaryDirectory() as tmp, socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    proc = subprocess.Popen([sys.executable,str(Path(__file__).with_name("leaderboard.py"))],
        env={**os.environ,"PORT":str(port),"BOARD_DB":str(Path(tmp)/"test.db")})
    try:
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def api(path,data=None,expected=200):
            req=urllib.request.Request(f"http://127.0.0.1:{port}/api/"+path,
                data=json.dumps(data).encode() if data is not None else None,headers={"Content-Type":"application/json"})
            try: response=client.open(req)
            except urllib.error.HTTPError as error: response=error
            with response:
                assert response.status==expected,(response.status,path)
                return json.load(response)
        board="board?world=city&mode=easy"
        for attempt in range(50):
            try: api(board); break
            except urllib.error.URLError: time.sleep(.1)
        creds=api("register",{"name":"Player_7"})
        api("register",{"name":"player_7"},409)
        for score in (100,50):
            ticket=api("start",{"world":"city","mode":"easy"})["ticket"]
            api("finish",{"ticket":ticket,"score":score})
            api("finish",{"ticket":ticket,"score":score})
            api("finish",{"ticket":ticket,"score":score+1},409)
        assert api(board)["top"]==[{"name":"Player_7","score":100}]
        assert len(api(board)["recent"])==2
        assert not api(board.replace("easy","hard"))["top"]
        assert not api(board.replace("city","garden"))["top"]
        api("logout",{})
        assert not api(board)["recent"]
        api("start",{"world":"city","mode":"easy"},401)
        api("login",{"name":"player_7","code":"wrong"},401)
        api("login",{"name":"player_7","code":creds["code"]})
        assert len(api(board)["recent"])==2
        print("HTTP leaderboard checks passed")
    finally:
        proc.terminate()
        proc.wait()
