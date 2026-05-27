#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate PDF from 故障报告操作手册.md with embedded images and mermaid diagrams."""

import markdown
import base64
import os
import subprocess
import re
import sys
import urllib.request

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MD_PATH    = os.path.join(SCRIPT_DIR, '故障报告操作手册.md')
HTML_PATH  = os.path.join(SCRIPT_DIR, '故障报告操作手册.html')
PDF_PATH   = os.path.join(SCRIPT_DIR, '故障报告操作手册.pdf')
MERMAID_CACHE = os.path.join(SCRIPT_DIR, '_mermaid.min.js')

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.7;
    color: #212529;
    background: #fff;
}
.document {
    max-width: 900px;
    margin: 0 auto;
    padding: 30px 40px;
}
h1 { font-size: 22px; color: #E60012; border-bottom: 3px solid #E60012; padding-bottom: 8px; margin: 24px 0 16px; }
h2 { font-size: 17px; color: #E60012; border-left: 4px solid #E60012; padding-left: 10px; margin: 22px 0 12px; page-break-after: avoid; }
h3 { font-size: 14px; color: #333; margin: 18px 0 8px; font-weight: 700; page-break-after: avoid; }
h4 { font-size: 13px; color: #555; margin: 14px 0 6px; font-weight: 700; }
p  { margin: 8px 0; }
ul, ol { margin: 8px 0 8px 24px; }
li { margin: 3px 0; }
blockquote {
    border-left: 3px solid #E60012;
    background: #fff8f8;
    padding: 8px 14px;
    margin: 10px 0;
    color: #444;
    font-size: 12px;
}
blockquote p { margin: 3px 0; }
blockquote img {
    max-width: 100%;
    display: block;
    margin: 8px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
}
em { color: #555; font-size: 11px; }
table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12px;
    page-break-inside: avoid;
}
thead tr th {
    background: #E60012;
    color: #fff;
    padding: 7px 10px;
    text-align: center;
    font-weight: 600;
    border: 1px solid #c0000f;
}
tbody tr:nth-child(even) { background: #fff5f5; }
tbody tr:hover { background: #ffe8e8; }
tbody td {
    padding: 6px 10px;
    border: 1px solid #e0e0e0;
    vertical-align: top;
}
code {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
    font-family: Consolas, "Courier New", monospace;
}
pre {
    background: #f8f8f8;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
}
pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 11px;
    line-height: 1.5;
}
.mermaid {
    text-align: center;
    margin: 16px 0;
    padding: 10px;
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 4px;
    page-break-inside: avoid;
}
hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
strong { color: #222; }
a { color: #E60012; text-decoration: none; }
.toc { background: #fff8f8; border: 1px solid #fdd; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; }
@media print {
    .document { padding: 0; max-width: 100%; }
    h1, h2 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
    img { page-break-inside: avoid; }
}
"""


def get_mermaid_script():
    """Return inline mermaid.js or CDN tag."""
    if not os.path.exists(MERMAID_CACHE):
        print("Downloading mermaid.js (one-time)...")
        try:
            url = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
            urllib.request.urlretrieve(url, MERMAID_CACHE)
            print(f"  Saved to {MERMAID_CACHE}")
        except Exception as e:
            print(f"  Warning: Download failed ({e}), using CDN fallback")
            return '<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>'
    with open(MERMAID_CACHE, 'r', encoding='utf-8', errors='replace') as f:
        js = f.read()
    return f'<script>{js}</script>'


def extract_mermaid(md_text):
    """Replace ```mermaid blocks with placeholders, return (text, [code...])."""
    blocks = []
    def _replace(m):
        blocks.append(m.group(1).strip())
        return f'\n\nMERMAID_PLACEHOLDER_{len(blocks)-1}\n\n'
    return re.sub(r'```mermaid\r?\n(.*?)\r?\n```', _replace, md_text, flags=re.DOTALL), blocks


def restore_mermaid(html, blocks):
    for i, code in enumerate(blocks):
        div = f'<div class="mermaid">\n{code}\n</div>'
        ph = f'MERMAID_PLACEHOLDER_{i}'
        html = html.replace(f'<p>{ph}</p>', div)
        html = html.replace(ph, div)
    return html


def embed_images(html, base_dir):
    def _replace(m):
        src = m.group(1)
        if src.startswith(('http', 'data:')):
            return m.group(0)
        path = os.path.join(base_dir, src)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
            ext = os.path.splitext(src)[1].lower().lstrip('.')
            mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp'}.get(ext, 'image/png')
            return f'src="data:{mime};base64,{b64}"'
        print(f"  Warning: image not found: {path}")
        return m.group(0)
    return re.sub(r'src="([^"]*)"', _replace, html)


def main():
    print(f"Reading {MD_PATH}")
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    processed_md, mermaid_blocks = extract_mermaid(md_text)
    print(f"  Found {len(mermaid_blocks)} mermaid diagram(s)")

    conv = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc'])
    html_body = conv.convert(processed_md)
    html_body = restore_mermaid(html_body, mermaid_blocks)

    print("Embedding images...")
    html_body = embed_images(html_body, SCRIPT_DIR)

    mermaid_script = get_mermaid_script()

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>EDS 故障报告操作手册</title>
{mermaid_script}
<style>{CSS}</style>
</head>
<body>
<div class="document">
{html_body}
</div>
<script>
mermaid.initialize({{ startOnLoad: true, theme: 'default', securityLevel: 'loose' }});
</script>
</body>
</html>"""

    with open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"HTML saved: {HTML_PATH}")

    file_url = 'file:///' + HTML_PATH.replace('\\', '/')
    cmd = [
        CHROME,
        '--headless', '--disable-gpu',
        f'--print-to-pdf={PDF_PATH}',
        '--no-margins',
        '--virtual-time-budget=15000',
        '--run-all-compositor-stages-before-draw',
        '--no-sandbox',
        '--allow-file-access-from-files',
        file_url
    ]
    print("Generating PDF via Chrome headless...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)

    if os.path.exists(PDF_PATH):
        size = os.path.getsize(PDF_PATH)
        print(f"Done! PDF: {PDF_PATH}  ({size:,} bytes)")
    else:
        print("PDF generation failed.")
        print(result.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
