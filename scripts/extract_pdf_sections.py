#!/usr/bin/env python3
"""
OCR a scanned Ethiopian entrance-exam PDF and print per-page subject codes + text.

Dependencies:
  pip install pymupdf rapidocr-onnxruntime onnxruntime

Example:
  python3 extract_pdf_sections.py "/path/to/Entrance 2015, All Social Subjects.pdf" \\
    --out "../exams/raw/2015-social-pages.txt"
"""

from __future__ import annotations

import argparse
import os
import re
import tempfile

import fitz
from rapidocr_onnxruntime import RapidOCR


SUBJECT_RE = re.compile(r"SUBJECT\s*CODE[:\s._]*([0-9O]{1,2})", re.I)


def ocr_page(doc: fitz.Document, page_index: int, zoom: float, ocr: RapidOCR) -> tuple[str | None, str]:
    page = doc[page_index]
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(pix.tobytes("png"))
        tmp = f.name
    try:
        result, _ = ocr(tmp)
    finally:
        os.unlink(tmp)
    lines = [x[1] for x in result] if result else []
    text = "\n".join(lines)
    m = SUBJECT_RE.search(text)
    code = m.group(1).replace("O", "0") if m else None
    return code, text


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", help="Path to PDF")
    ap.add_argument("--out", help="Write full OCR dump to this file")
    ap.add_argument("--zoom", type=float, default=1.35, help="Render scale (higher = slower, better OCR)")
    ap.add_argument("--start", type=int, default=1, help="First page (1-based)")
    ap.add_argument("--end", type=int, default=0, help="Last page (1-based); 0 = last page")
    args = ap.parse_args()

    ocr = RapidOCR()
    doc = fitz.open(args.pdf)
    end = args.end or len(doc)
    start_idx = max(0, args.start - 1)
    end_idx = min(len(doc), end)

    summary_lines: list[str] = []
    chunks: list[str] = []

    for i in range(start_idx, end_idx):
        code, text = ocr_page(doc, i, args.zoom, ocr)
        summary_lines.append(f"p{i + 1:4d}  code={code or '?'}\n")
        chunks.append(f"\n\n===== PAGE {i + 1} =====\n")
        chunks.append(text)

    print("".join(summary_lines))
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write("".join(chunks))
        print(f"Wrote {args.out} ({sum(len(c) for c in chunks)} chars)")


if __name__ == "__main__":
    main()
