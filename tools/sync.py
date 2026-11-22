#!/usr/bin/env python3
"""Salin events.json dan posts.json dari gowithdme.com ke data/ (cadangan jika situs induk tidak terjangkau)."""
import urllib.request, json, pathlib
BASE = "https://gowithdme.com/data/"
out = pathlib.Path(__file__).resolve().parent.parent / "data"
for name in ("events.json", "posts.json"):
    with urllib.request.urlopen(BASE + name, timeout=30) as r:
        data = json.load(r)
    (out / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(name, len(data))
