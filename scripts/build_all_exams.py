#!/usr/bin/env python3
"""
Batch-build data/exams/<year>/<stream>/<Course>.json — one PDF per year/stream (duplicates skipped).

Run from project root:  python3 scripts/build_all_exams.py
"""
from __future__ import annotations

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "/Users/dawitabrhaweldegebriel/Library/Application Support/Cursor/User/workspaceStorage/0c670c78b13f397a7c0cd16267e36100/pdfs"

PDF = {
    ("2015", "social"): f"{BASE}/d63f52a3-2f68-448b-a90b-56013ae52b61/Entrance 2015, All Social Subjects_260418_145932.pdf",
    ("2014", "social"): f"{BASE}/8744e255-b4ed-43b4-bd7e-fbaace3ef010/Entrance 2014, All Social Subjects_260418_150030(pdfgear.com)(pdfgear.com).pdf",
    ("2015", "natural"): f"{BASE}/83c945b2-b2b0-45de-b53e-645824174bdf/Entrance 2015, All Natural Subjects_260418_150006(pdfgear.com).pdf",
    ("2014", "natural"): f"{BASE}/4d2b44b6-450b-4272-ac58-a004a79586f5/Entrance 2014, All Natural Subjects_260418_150103(pdfgear.com).pdf",
}

JOBS = [
    # 2015 Social
    ("2015", "social", "Mathematics", "2-23", "1-65", 1.55),
    ("2015", "social", "Aptitude", "24-38", "1-60", 1.5),
    ("2015", "social", "Geography", "39-60", "1-50", 1.5),
    ("2015", "social", "History", "61-80", "1-50", 1.5),
    ("2015", "social", "English", "81-109", "1-100", 1.45),
    # 2014 Social (booklet order)
    ("2014", "social", "History", "2-28", "1-60", 1.5),
    ("2014", "social", "English", "29-52", "1-60", 1.45),
    ("2014", "social", "Geography", "53-80", "1-50", 1.5),
    ("2014", "social", "Economics", "81-96", "1-40", 1.5),
    ("2014", "social", "Aptitude", "97-108", "1-40", 1.5),
    ("2014", "social", "Mathematics", "109-129", "1-65", 1.55),
    # 2015 Natural
    ("2015", "natural", "Mathematics", "2-18", "1-65", 1.55),
    ("2015", "natural", "Physics", "19-36", "1-55", 1.5),
    ("2015", "natural", "Chemistry", "37-57", "1-55", 1.5),
    ("2015", "natural", "Biology", "58-81", "1-55", 1.5),
    ("2015", "natural", "Aptitude", "82-96", "1-60", 1.5),
    ("2015", "natural", "English", "97-120", "1-80", 1.45),
    # 2014 Natural — Physics appears in two bands with Aptitude between (65–76)
    ("2014", "natural", "Biology", "2-20", "1-55", 1.5),
    ("2014", "natural", "Mathematics", "21-40", "1-65", 1.55),
    ("2014", "natural", "Physics", "41-64,77-92", "1-80", 1.5),
    ("2014", "natural", "Aptitude", "65-76", "1-40", 1.5),
    ("2014", "natural", "Chemistry", "93-108", "1-55", 1.5),
    ("2014", "natural", "English", "109-134", "1-100", 1.45),
]


def main() -> None:
    script = os.path.join(ROOT, "scripts", "build_entrance_json.py")
    for year, stream, course, pages, fill, zoom in JOBS:
        pdf = PDF[(year, stream)]
        out = os.path.join(ROOT, "data", "exams", year, stream, f"{course}.json")
        cmd = [
            sys.executable,
            script,
            "--pdf",
            pdf,
            "--out",
            out,
            "--year",
            year,
            "--stream",
            stream,
            "--course",
            course,
            "--pages",
            pages,
            "--zoom",
            str(zoom),
            "--fill-range",
            fill,
        ]
        print("RUN", course, year, stream, pages, flush=True)
        subprocess.check_call(cmd)


if __name__ == "__main__":
    main()
