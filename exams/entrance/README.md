# Entrance exam extracts (2014 & 2015)

Source PDFs are scanned images. Text was recovered with OCR (RapidOCR); a few symbols or diagram-dependent stems may need a visual check against the original booklet.

## How booklets map to app “courses”

Your app lists courses separately for **natural** and **social** streams. The national booklets use **subject codes** on each page. Approximate mapping observed in these PDFs:

### Social stream (`All Social Subjects` booklets)

| Subject code | Course (use this name in the app) |
|-------------|-----------------------------------|
| 10 | Mathematics |
| 03 | Aptitude |
| 07 | Geography |
| 08 | History |
| 01 / later booklet codes (e.g. 325) | English |

Civics, Economics, Business, and ICT may appear under other codes or in different booklet editions; if a section is missing from a given PDF, only the subjects present in that file are extracted.

### Natural stream (`All Natural Subjects` booklets)

Codes can differ by **year**. Always read the banner on page 2 of each section.

**2015 Natural (booklet in your folder):**

| Subject code | Course |
|-------------|--------|
| 02 | **Mathematics** (65 items, 3 h) |
| 04 | Physics |
| 05 | Chemistry |
| 06 | Biology |
| 03 | Aptitude |
| 01 | English |

**2014 Natural:** confirm titles from the PDF (codes are similar but section order may differ).

Always use the printed section title (e.g. “MATHEMATICS FOR NATURAL SCIENCE”, “PHYSICS”) to resolve ambiguous codes between years.

## File layout

- `entrance/<year>/<stream>/<Course>.md` — questions numbered 1, 2, … with **Solution** blocks.

Natural and social content are kept in separate folders so courses are not mixed.
