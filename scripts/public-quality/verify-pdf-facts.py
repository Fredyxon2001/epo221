"""Synthetic in-memory PDFs plus the four public versioned documents; no output PDFs."""
import importlib.util
import io
import pathlib
import sys
from pypdf import PdfWriter

sys.dont_write_bytecode = True
from pypdf.generic import NameObject, DictionaryObject, BooleanObject, TextStringObject

spec = importlib.util.spec_from_file_location("public_pdf_facts", pathlib.Path(__file__).with_name("pdf-facts.py"))
facts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(facts)

def encoded(tagged=False, title=False, language=False, encrypted=False):
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    if title:
        writer.add_metadata({"/Title": "Synthetic title must not be printed"})
    if language:
        writer._root_object[NameObject("/Lang")] = TextStringObject("es-MX")
    if tagged:
        writer._root_object[NameObject("/MarkInfo")] = DictionaryObject({NameObject("/Marked"): BooleanObject(True)})
        writer._root_object[NameObject("/StructTreeRoot")] = DictionaryObject({NameObject("/Type"): NameObject("/StructTreeRoot")})
    if encrypted:
        writer.encrypt("synthetic-only")
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()

blank = facts.inspect_pdf(encoded())
assert blank["pagesWithExtractableText"] == 0
assert set(blank["reviewNeeded"]) == {"missing-document-title", "missing-default-language", "missing-tagged-structure", "pages-without-extractable-text"}
tagged = facts.inspect_pdf(encoded(tagged=True, title=True, language=True))
assert tagged["tagged"] and tagged["structureTreePresent"] and tagged["titlePresent"] and tagged["languagePresent"]
assert tagged["reviewNeeded"] == ["pages-without-extractable-text"]
assert facts.inspect_pdf(encoded(encrypted=True))["readable"] is False
for bad in [b"not-pdf", b"%PDF-" + b"x" * facts.MAX_BYTES]:
    try:
        facts.inspect_pdf(bad)
        raise AssertionError("Invalid/oversized PDF accepted")
    except ValueError:
        pass
for name in ["../private.pdf", "/tmp/private.pdf", "file.pdf?token=x", "file.pdf/other", "file.docx"]:
    try:
        facts.read_public_file(name)
        raise AssertionError("Outside public scope")
    except ValueError:
        pass
for name in ["carta-compromiso.pdf", "reglamento-escolar.pdf", "solicitud-inscripcion.pdf", "solicitud-reinscripcion.pdf"]:
    result = facts.read_public_file(name)
    assert result["readable"] and result["pages"] > 0
    assert "Synthetic title" not in str(result)
assert "Synthetic title" not in str(tagged)
print("PASS PDF facts: synthetic title/language/tags/blank/encryption/size/path boundaries; four public originals readable, no text or private metadata output.")
