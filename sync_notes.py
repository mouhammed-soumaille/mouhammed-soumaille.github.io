#!/usr/bin/env python3
"""
Copy your latest lecture notes from ~/Uni into the website, and record when each was last updated.

Run from the website folder whenever you've updated notes:
    python3 sync_notes.py

It only copies a PDF if the one in ~/Uni is newer, and writes the dates to data/notes_updated.yaml
(the Notes page shows "Updated ..." from that file).
To add a course: add a line to COURSES below, and an entry in data/notes.yaml.
"""
import datetime, os, shutil

UNI = os.environ.get("NOTES_SRC", os.path.expanduser("~/Uni"))   # where your course folders live
COURSES = {                    # folder in ~/Uni  ->  file name on the website
    "EECE 635": "eece635-notes.pdf",
    "MATH 330": "math330-notes.pdf",
    "MATH 305": "math305-notes.pdf",
    "MATH 214": "math214-notes.pdf",
    "MATH 223": "math223-notes.pdf",
    "MATH 210": "math210-notes.pdf",
}

here = os.path.dirname(os.path.abspath(__file__))
dates = {}
for folder, name in COURSES.items():
    src = os.path.join(UNI, folder, "Notes.pdf")
    dst = os.path.join(here, "static", "notes", name)
    if not os.path.exists(src):
        print(f"skip   {folder}: {src} not found")
        if os.path.exists(dst):
            dates[name] = datetime.date.fromtimestamp(os.path.getmtime(dst)).isoformat()
        continue
    src_time = os.path.getmtime(src)
    if not os.path.exists(dst) or src_time > os.path.getmtime(dst) + 1:
        shutil.copy2(src, dst)          # copy2 keeps the original modification time
        print(f"copied {folder} -> static/notes/{name}")
    else:
        print(f"ok     {folder} is up to date")
    dates[name] = datetime.date.fromtimestamp(src_time).isoformat()

with open(os.path.join(here, "data", "notes_updated.yaml"), "w") as f:
    f.write("# Written by sync_notes.py -- don't edit by hand.\n")
    for name, d in sorted(dates.items()):
        f.write(f'{name}: "{d}"\n')
print("wrote data/notes_updated.yaml")
