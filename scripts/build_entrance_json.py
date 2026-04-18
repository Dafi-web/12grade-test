#!/usr/bin/env python3
"""
OCR exam PDF sections and emit JSON files compatible with models/Exam.js

Usage:
  python3 scripts/build_entrance_json.py --pdf PATH --out PATH \\
    --year 2015 --stream social --course Mathematics --pages 2-23

Requires: pip install pymupdf rapidocr-onnxruntime onnxruntime
"""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile

import fitz
from rapidocr_onnxruntime import RapidOCR


def parse_pages(spec: str) -> list[int]:
    """'2-23' or '5,8,10-15' -> 1-based page numbers."""
    out: list[int] = []
    for part in spec.replace(" ", "").split(","):
        if "-" in part:
            a, b = part.split("-", 1)
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return sorted(set(out))


def ocr_pages(pdf_path: str, pages_1based: list[int], zoom: float, ocr: RapidOCR) -> str:
    doc = fitz.open(pdf_path)
    chunks: list[str] = []
    for p in pages_1based:
        idx = p - 1
        if idx < 0 or idx >= len(doc):
            continue
        page = doc[idx]
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(pix.tobytes("png"))
            tmp = f.name
        result, _ = ocr(tmp)
        os.unlink(tmp)
        lines = [x[1] for x in result] if result else []
        chunks.append(f"\n\n--- PAGE {p} ---\n")
        chunks.append("\n".join(lines))
    return "".join(chunks)


def scrub_headers(ocr_text: str) -> str:
    t = ocr_text
    t = re.sub(r"(?i)click and join[^\n]*", " ", t)
    t = re.sub(r"(?i)bringing excellence[^\n]*", " ", t)
    t = re.sub(r"(?i)fana education[^\n]*", " ", t)
    t = re.sub(r"(?i)page \d+ of \d+", " ", t)
    t = re.sub(r"--- PAGE \d+ ---", " ", t)
    t = re.sub(r"(?i)booklet\s*code[:\s]*[\dA-Z]+", " ", t)
    t = re.sub(r"(?i)subject\s*code[:\s]*[\dO]{1,2}", " ", t)
    t = re.sub(r"(?i)mathematics for social science[^\n]*", " ", t)
    t = re.sub(r"(?i)eaes/[^\n]*", " ", t)
    t = re.sub(r"\r", "", t)
    return t


def split_questions(ocr_text: str) -> list[dict]:
    """
    Split on lines that look like exam item numbers 'N. ' (N usually 1-120).
    Then parse first A/B/C/D block as choices.
    """
    text = scrub_headers(ocr_text)
    # Normalize newlines; keep single blank between merged chunks
    lines = [ln.strip() for ln in text.split("\n")]
    text = "\n".join(lines)

    # Find all "start of question" positions: line begins with optional space + digits + dot + space
    starts: list[tuple[int, int, int]] = []
    for m in re.finditer(r"(?m)^\s*(\d{1,3})\.\s+", text):
        n = int(m.group(1))
        if 1 <= n <= 130:
            starts.append((m.start(), m.end(), n))
    if not starts:
        return []

    blocks: list[tuple[int, str]] = []
    for i, (s0, s1, num) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        body = text[s1:end].strip()
        blocks.append((num, body))

    # De-duplicate by number: keep longest if duplicate keys (column headers)
    by_num: dict[int, str] = {}
    for num, body in blocks:
        if num not in by_num or len(body) > len(by_num[num]):
            by_num[num] = body

    questions: list[dict] = []
    for num in sorted(by_num.keys()):
        body = by_num[num]
        opts = {"A": "", "B": "", "C": "", "D": ""}
        # First occurrence of choice letter at line start (or after newline)
        mm = re.search(r"(?m)^\s*([A-D])[\.\)]\s*.*$", body)
        if not mm:
            questions.append(
                {
                    "number": num,
                    "text": body[:4500].strip(),
                    "choices": dict(opts),
                }
            )
            continue
        stem = body[: mm.start()].strip()
        rest = body[mm.start() :]
        cur: str | None = None
        buf: list[str] = []

        def flush() -> None:
            nonlocal cur, buf
            if cur is not None:
                opts[cur] = " ".join(buf).strip()
            buf = []
            cur = None

        for line in rest.split("\n"):
            line = line.strip()
            if not line:
                continue
            km = re.match(r"^([A-D])[\.\)]\s*(.*)$", line)
            if km:
                if cur:
                    opts[cur] = " ".join(buf).strip()
                cur = km.group(1)
                buf = [km.group(2)] if km.group(2) else []
            elif cur:
                buf.append(line)
        if cur:
            opts[cur] = " ".join(buf).strip()

        # strip trailing garbage from last option (next question leaked)
        for k in list(opts.keys()):
            if not opts[k]:
                continue
            nk = re.search(r"(?m)^\s*\d{1,3}\.\s+", opts[k])
            if nk:
                opts[k] = opts[k][: nk.start()].strip()

        stem = stem[:4500]
        for k in opts:
            opts[k] = (opts[k] or "")[:2000]
        questions.append({"number": num, "text": stem, "choices": opts})

    return questions


def fill_missing(
    questions: list[dict],
    lo: int,
    hi: int,
) -> list[dict]:
    byn = {q["number"]: q for q in questions if isinstance(q.get("number"), int)}
    out: list[dict] = []
    for n in range(lo, hi + 1):
        if n in byn:
            out.append(byn[n])
        else:
            out.append(
                {
                    "number": n,
                    "text": f"[Question {n} — stem not captured cleanly by OCR; open the original PDF and type this item in admin.]",
                    "choices": {"A": "—", "B": "—", "C": "—", "D": "—"},
                }
            )
    return out


def to_exam_json(
    grade: str,
    exam_type: str,
    year: str,
    stream: str,
    course: str,
    questions: list[dict],
) -> dict:
    questions = sorted(questions, key=lambda x: int(x.get("number") or 0))
    out_q = []
    for q in questions:
        ch = q.get("choices") or {}
        a, b, c, d = ch.get("A", ""), ch.get("B", ""), ch.get("C", ""), ch.get("D", "")
        if not any([a, b, c, d]):
            # pad from raw
            a = b = c = d = "(see scan — choices not parsed)"
        out_q.append(
            {
                "number": q.get("number"),
                "text": (q.get("text") or "(no stem)")[:5000],
                "choices": {
                    "A": a or "(empty)",
                    "B": b or "(empty)",
                    "C": c or "(empty)",
                    "D": d or "(empty)",
                },
                "correct": "A",
                "solution": "Official answer not verified in this import. Confirm with NEAEA key; replace after verification.",
            }
        )
    return {
        "grade": grade,
        "examType": exam_type,
        "year": year,
        "stream": stream,
        "course": course,
        "questions": out_q,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--year", required=True)
    ap.add_argument("--stream", required=True, choices=["natural", "social"])
    ap.add_argument("--course", required=True)
    ap.add_argument("--pages", required=True, help="e.g. 2-23")
    ap.add_argument("--zoom", type=float, default=1.65)
    ap.add_argument(
        "--fill-range",
        default="",
        help="e.g. 1-65 to insert placeholders for numbers OCR skipped",
    )
    args = ap.parse_args()

    pages = parse_pages(args.pages)
    ocr = RapidOCR()
    raw = ocr_pages(args.pdf, pages, args.zoom, ocr)
    qs = split_questions(raw)
    if args.fill_range:
        a, b = args.fill_range.split("-", 1)
        qs = fill_missing(qs, int(a), int(b))
    exam = to_exam_json("12", "entrance", args.year, args.stream, args.course, qs)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(exam, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(exam['questions'])} questions to {args.out}")


if __name__ == "__main__":
    main()
