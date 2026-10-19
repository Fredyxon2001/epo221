"""Verify separate PDF variants, originals and rendering. Read-only, no output PDF."""
import argparse
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import shutil
import sys
import subprocess
import tempfile
from pypdf import PdfReader

sys.dont_write_bytecode = True

here = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("derive_public_pdfs", here / "derive-pdfs.py")
derive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(derive)

def verify(render: bool = False):
    entries = json.loads(derive.MANIFEST.read_text(encoding="utf8"))
    receipt = json.loads((here / "derived-pdfs-proof.json").read_text(encoding="utf8"))
    renderer = os.environ.get("PUBLIC_QUALITY_PDFTOPPM") or shutil.which("pdftoppm")
    if render and not renderer:
        raise ValueError("Renderer unavailable; do not claim visual parity")
    page_pairs = 0
    for entry, known in zip(entries, receipt["derived"], strict=True):
        source = derive.pdf_path(entry["source"])
        variant = derive.pdf_path(entry["download"])
        original = source.read_bytes()
        derived = variant.read_bytes()
        assert hashlib.sha256(original).hexdigest() == known["sourceSha256"]
        assert hashlib.sha256(derived).hexdigest() == known["derivedSha256"]
        a = PdfReader(io.BytesIO(original), strict=True)
        b = PdfReader(io.BytesIO(derived), strict=True)
        assert b.metadata.get("/Title") == entry["title"]
        assert derive.invariant(a) == derive.invariant(b)
        if render:
            with tempfile.TemporaryDirectory(prefix="epo-public-pdf-verify-") as temp:
                temp = pathlib.Path(temp)
                for label, path in [("original", source), ("derived", variant)]:
                    subprocess.run([renderer, "-r", "100", "-png", str(path), str(temp / label)],
                        check=True, timeout=45, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                originals = sorted(temp.glob("original-*.png"))
                variants = sorted(temp.glob("derived-*.png"))
                assert len(originals) == len(variants) == len(a.pages)
                # Same renderer/resolution and exact PNG bytes: no visible page changes.
                for original_png, variant_png in zip(originals, variants, strict=True):
                    assert original_png.read_bytes() == variant_png.read_bytes()
                    page_pairs += 1
    return {"variants": len(entries), "originalsUnchanged": True,
        "pagesTextContentStreamsAnnotationsFieldsLanguageTagsUnchanged": True,
        "renderedPagePairs": page_pairs, "exactRenderParity": render,
        "notCertification": "Manual reading order, form UX, screen reader and PDF/UA/WCAG review remain separate."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.render), indent=2))
    except Exception:
        print("Public PDF variant verification failed without exposing document content.")
        raise SystemExit(1)
