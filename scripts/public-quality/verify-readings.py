"""Read-only provenance check for the fixed historical reading inventory."""
from pathlib import Path
import importlib.util,json
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('readings',Path(__file__).with_name('derive-readings.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
expected=module.build();actual=json.loads((root/'src/lib/public-document-readings.json').read_text(encoding='utf8'))
assert actual==expected,'Reading content must match the exact versioned DOCX, not a summary or edited policy'
assert len(actual)==2 and sum(len(x['blocks']) for x in actual)==107
print('PASS two reading companions: 107 source paragraphs, order, text, exact DOCX hashes and fixed public inventory; no original files edited.')
