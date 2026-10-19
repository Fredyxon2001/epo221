"""Create separate public PDF variants adding only the document title metadata.
Originals are never overwritten. Content/structure invariance is checked before writing.
"""
from __future__ import annotations
import hashlib
import io
import json
import pathlib
import re
import sys
import subprocess
from pypdf import PdfReader, PdfWriter

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUBLIC = (ROOT / "public" / "descargas").resolve()
MANIFEST = ROOT / "src" / "lib" / "public-derived-documents.json"

def pdf_path(web_path: str) -> pathlib.Path:
    if not re.fullmatch(r"/descargas/[a-z0-9-]+\.pdf", web_path):
        raise ValueError("Public derivative path")
    resolved = (ROOT / "public" / web_path.lstrip("/")).resolve()
    if resolved.parent != PUBLIC:
        raise ValueError("Public derivative boundary")
    return resolved

def canonical(value, seen=None):
    if seen is None:
        seen = {}
    if hasattr(value, "get_object"):
        value = value.get_object()
    if isinstance(value, (dict, list)):
        identity = id(value)
        if identity in seen:
            return ["cycle", seen[identity]]
        seen[identity] = len(seen)
    if isinstance(value, dict):
        # Parent links can reach the entire page tree; separately compare page content.
        return {str(k): canonical(v, seen) for k, v in sorted(value.items()) if str(k) not in ["/Parent", "/P", "/Pg"]}
    if isinstance(value, list):
        return [canonical(v, seen) for v in value]
    if isinstance(value, bytes):
        return {"bytes": hashlib.sha256(value).hexdigest()}
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)

def invariant(reader: PdfReader) -> dict:
    root = reader.trailer["/Root"]
    return {
        "pageCount": len(reader.pages),
        "language": str(root.get("/Lang", "")),
        "markInfo": canonical(root.get("/MarkInfo")),
        "tags": canonical(root.get("/StructTreeRoot")),
        "fields": canonical(reader.get_fields() or {}),
        "pages": [{
            "mediaBox": list(page.mediabox),
            "cropBox": list(page.cropbox),
            "rotation": page.rotation,
            "text": page.extract_text() or "",
            "content": hashlib.sha256(page.get_contents().get_data() if page.get_contents() else b"").hexdigest(),
            "annotations": canonical(page.get("/Annots", []))
        } for page in reader.pages]
    }

def make_variant(original: bytes, title: str) -> bytes:
    reader = PdfReader(io.BytesIO(original), strict=True)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.add_metadata({"/Title": title})
    output = io.BytesIO()
    writer.write(output)
    derived = output.getvalue()
    reopened = PdfReader(io.BytesIO(derived), strict=True)
    if reopened.metadata.get("/Title") != title or invariant(reader) != invariant(reopened):
        raise ValueError("Derivative changed content or structure")
    return derived

def main() -> None:
    if sys.argv[1:] != ["--create"]:
        raise ValueError("Requires --create")
    entries = json.loads(MANIFEST.read_text(encoding="utf8"))
    if len(entries) != 4:
        raise ValueError("Exact historical manifest required")
    results = []
    for entry in entries:
        source = pdf_path(entry["source"])
        destination = pdf_path(entry["download"])
        if source == destination or not destination.name.endswith("-titulo-v2.pdf"):
            raise ValueError("Never overwrite source")
        before = source.read_bytes()
        derived = make_variant(before, entry["title"])
        if destination.exists() and destination.read_bytes() != derived:
            raise ValueError("Existing derivative differs")
        # Node writes reliably on Windows OneDrive; Python pathlib can fail despite an existing parent.
        subprocess.run(["node", "-e", "const fs=require('node:fs');const p=process.argv[1];const b=fs.readFileSync(0);if(fs.existsSync(p)){if(!fs.readFileSync(p).equals(b))process.exit(1);}else fs.writeFileSync(p,b);if(!fs.readFileSync(p).equals(b))process.exit(1);", str(destination)],
                       input=derived, check=True, timeout=15, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if source.read_bytes() != before or destination.read_bytes() != derived:
            raise ValueError("Readback mismatch")
        results.append({"source": source.name, "derived": destination.name,
            "sourceSha256": hashlib.sha256(before).hexdigest(),
            "derivedSha256": hashlib.sha256(derived).hexdigest(),
            "pagesTextContentAnnotationsTagsUnchanged": True})
    print(json.dumps({"schema": 1, "derived": results}, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Public derivative creation failed; originals preserved. No document content logged.", file=sys.stderr)
        raise SystemExit(1)
