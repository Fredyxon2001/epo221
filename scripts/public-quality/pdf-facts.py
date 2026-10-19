"""Read-only facts for versioned public PDFs; never prints text, titles, authors or fields.
Use from the repository with a Python environment providing pypdf. No network or env files.
"""
from __future__ import annotations
import io
import json
import logging
import pathlib
import re
import sys
from pypdf import PdfReader

logging.getLogger("pypdf").setLevel(logging.CRITICAL)
PUBLIC_ROOT = pathlib.Path(__file__).resolve().parents[2] / "public" / "descargas"
MAX_BYTES = 4 * 1024 * 1024
MAX_PAGES = 100
MAX_TEXT = 1024 * 1024

def inspect_pdf(data: bytes) -> dict:
    if len(data) > MAX_BYTES or not data.startswith(b"%PDF-"):
        raise ValueError("PDF boundary")
    reader = PdfReader(io.BytesIO(data), strict=True)
    if reader.is_encrypted:
        return {"readable": False, "encrypted": True, "reviewNeeded": ["encrypted"]}
    count = len(reader.pages)
    if not 0 < count <= MAX_PAGES:
        raise ValueError("PDF page boundary")
    root = reader.trailer["/Root"]
    language = root.get("/Lang", "")
    language_present = isinstance(language, str) and bool(re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", language))
    title = (reader.metadata or {}).get("/Title", "")
    title_present = isinstance(title, str) and bool(title.strip())
    mark_info = root.get("/MarkInfo", {})
    if hasattr(mark_info, "get_object"):
        mark_info = mark_info.get_object()
    tagged = bool(mark_info.get("/Marked", False))
    structure = bool(root.get("/StructTreeRoot"))
    page_text = 0
    total_text = 0
    for page in reader.pages:
        # Extraction stays in memory. This does not validate reading order/alt text.
        text = page.extract_text() or ""
        total_text += len(text)
        if total_text > MAX_TEXT:
            raise ValueError("PDF extracted text boundary")
        if text.strip():
            page_text += 1
    review = []
    if not title_present:
        review.append("missing-document-title")
    if not language_present:
        review.append("missing-default-language")
    if not tagged or not structure:
        review.append("missing-tagged-structure")
    if page_text != count:
        review.append("pages-without-extractable-text")
    return {"readable": True, "encrypted": False, "pages": count,
            "titlePresent": title_present, "languagePresent": language_present,
            "tagged": tagged, "structureTreePresent": structure,
            "pagesWithExtractableText": page_text,
            "reviewNeeded": review}

def read_public_file(name: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.pdf", name):
        raise ValueError("Public PDF name")
    root = PUBLIC_ROOT.resolve(strict=True)
    file = (root / name).resolve(strict=True)
    if file.parent != root or not file.is_file() or file.stat().st_size > MAX_BYTES:
        raise ValueError("Public PDF path")
    data = file.read_bytes()
    return {"file": name, "bytes": len(data), **inspect_pdf(data)}

def main() -> int:
    names = sys.argv[1:] or sorted(p.name for p in PUBLIC_ROOT.glob("*.pdf"))
    if not names or len(names) > 16:
        raise ValueError("Public PDF count")
    facts = [read_public_file(name) for name in names]
    print(json.dumps({"schema": 1, "documents": facts,
        "scope": "Versioned public PDFs only; facts do not certify PDF/UA, WCAG, reading order, contrast or form usability. Originals unchanged."}, ensure_ascii=True, indent=2))
    return 0 if all(f["readable"] for f in facts) else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        # Parser diagnostics can contain document content. Never forward them.
        print("Public PDF facts unavailable or outside bounded scope.", file=sys.stderr)
        raise SystemExit(1)
