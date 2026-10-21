"""Generate bounded reading companions from two versioned, already public DOCX files.
No files outside the fixed source inventory, no downloads, no institutional edits.
"""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[2]
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MC='{http://schemas.openxmlformats.org/markup-compatibility/2006}'
SOURCES=[('reglamento-escolar','Reglamento escolar'),('carta-compromiso','Carta compromiso')]
def build():
 result=[]
 for slug,title in SOURCES:
  source=ROOT/'public'/'descargas'/(slug+'.docx');data=source.read_bytes()
  if len(data)>4*1024*1024:raise ValueError('document limit')
  with ZipFile(source) as archive:
   info=archive.getinfo('word/document.xml')
   if info.file_size>4*1024*1024:raise ValueError('XML limit')
   document=ET.fromstring(archive.read(info))
   number_info=archive.getinfo('word/numbering.xml')
   if number_info.file_size>4*1024*1024:raise ValueError('numbering XML limit')
   numbering=ET.fromstring(archive.read(number_info))
   if numbering.findall('.//'+W+'lvlOverride'):raise ValueError('unsupported numbering override')
  parent={child:node for node in document.iter() for child in node}
  def excluded(node):
   while node in parent:
    node=parent[node]
    if node.tag in [MC+'Fallback',W+'del']:return True
   return False
  abstracts={x.get(W+'abstractNumId'):x for x in numbering.findall(W+'abstractNum')}
  definitions={}
  for n in numbering.findall(W+'num'):
   abstract=abstracts[n.find(W+'abstractNumId').get(W+'val')]
   level=abstract.find(W+'lvl')
   definitions[n.get(W+'numId')]=(level.find(W+'numFmt').get(W+'val'),int(level.find(W+'start').get(W+'val')))
  counters={}
  blocks=[]
  for p in document.iter(W+'p'):
   if excluded(p):continue
   runs=[]
   for node in p.iter(W+'t'):
    ancestor=parent.get(node)
    while ancestor is not None and ancestor.tag!=W+'p':ancestor=parent.get(ancestor)
    if ancestor is p and not excluded(node):runs.append(node.text or '')
   text=''.join(runs).strip()
   if not text:continue
   if len(text)>6000:raise ValueError('paragraph limit')
   kind='paragraph'
   if not blocks or text.startswith(('Artículo ','Articulo ')) or text in ['Estoy enterado (a) que:','Estoy de acuerdo:']:kind='heading'
   elif p.find(W+'pPr/'+W+'numPr') is not None:kind='item'
   block={'kind':kind,'text':text}
   num=p.find(W+'pPr/'+W+'numPr/'+W+'numId')
   if num is not None:
    level=p.find(W+'pPr/'+W+'numPr/'+W+'ilvl')
    if level is not None and level.get(W+'val')!='0':raise ValueError('unsupported nested numbering')
    number_id=num.get(W+'val');fmt,start=definitions[number_id]
    style={'bullet':'bullet','decimal':'1','upperRoman':'I','lowerLetter':'a'}[fmt]
    counters[number_id]=counters.get(number_id,start-1)+1
    block['listId']=number_id;block['listStyle']=style;block['listNumber']=counters[number_id]
   blocks.append(block)
  if not 5<len(blocks)<200:raise ValueError('block inventory')
  result.append({'slug':slug,'title':title,'sourceDocx':'/descargas/'+slug+'.docx','sourcePdf':'/descargas/'+slug+'.pdf','sourceSha256':hashlib.sha256(data).hexdigest(),'blocks':blocks})
 return result
if __name__=='__main__':
 payload=json.dumps(build(),ensure_ascii=False,indent=2)+'\n'
 # Reliable write on OneDrive; originals are never modified.
 subprocess.run(['node','-e',"require('node:fs').writeFileSync('src/lib/public-document-readings.json',require('node:fs').readFileSync(0))"],input=payload.encode(),cwd=ROOT,check=True)
 print('Generated two historical reading companions; original DOCX/PDF unchanged.')
