#!/usr/bin/env python3
"""Stamps a new version on the site so browsers fetch fresh files.

Usage: python3 scripts/stamp_version.py   (run before every publish)

Phones can keep using old copies of the site's files for a while after an
update. This gives every file a new address (…?v=VERSION) so they don't:

  * index.html: the stylesheet and app.js get ?v=VERSION, and an import map
    gives every module in js/ the same ?v=VERSION.
  * js/config.js: VERSION is used when fetching the question data files.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
version = datetime.now(timezone.utc).strftime('%Y%m%d%H%M')

# index.html
index = ROOT / 'index.html'
html = index.read_text()
html = re.sub(r'href="css/style\.css(\?v=[^"]*)?"', f'href="css/style.css?v={version}"', html)
html = re.sub(r'src="js/app\.js(\?v=[^"]*)?"', f'src="js/app.js?v={version}"', html)
modules = sorted(p.name for p in (ROOT / 'js').glob('*.js'))
imports = {f'./js/{m}': f'./js/{m}?v={version}' for m in modules}
block = ('<script type="importmap">\n  '
         + json.dumps({'imports': imports}, indent=2).replace('\n', '\n  ')
         + '\n  </script>')
if '<script type="importmap">' in html:
    html = re.sub(r'<script type="importmap">.*?</script>', block, html, flags=re.S)
else:
    html = html.replace('</head>', f'  {block}\n</head>')
index.write_text(html)

# js/config.js
config = ROOT / 'js' / 'config.js'
text = config.read_text()
line = f"export const VERSION = '{version}'; // set by scripts/stamp_version.py"
if 'export const VERSION' in text:
    text = re.sub(r"export const VERSION = '[^']*';.*", line, text)
else:
    text = line + '\n\n' + text
config.write_text(text)

print(f'Stamped version {version} on index.html ({len(modules)} modules) and js/config.js')
