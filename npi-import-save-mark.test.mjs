// 测试计划导入保存标记 — 前端纯函数测试（从 NPI_Dashboard-js.html 提取，不依赖 jQuery / GAS 全局）
// 覆盖：导入保存成功后的「已导入」标记决策（仅导入模式保存成功才标记，取消不标记）
// 回归背景：乐观标记曾放在「点击导入」时，取消保存后再次打开出现「已导入→导入」闪变
// 运行：node --test npi-import-save-mark.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in source`);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`${name} braces not balanced`);
}

function tryExtract(src, name) {
  try { return extractFunction(src, name); } catch (e) { return null; }
}

const html = fs.readFileSync(new URL('./NPI_Dashboard-js.html', import.meta.url), 'utf8');
(0, eval)(tryExtract(html, 'applyImportSavedMark_')
  || 'function applyImportSavedMark_(){ throw new Error("applyImportSavedMark_ not found in NPI_Dashboard-js.html"); }');

test('applyImportSavedMark_: 导入模式保存成功 → 标记候选已导入并返回', () => {
  const pending = { productName: 'A', imported: false };
  const out = applyImportSavedMark_(pending, true);
  assert.equal(pending.imported, true);
  assert.equal(out, pending);
});

test('applyImportSavedMark_: 非导入模式（普通新建/编辑保存）→ 不标记', () => {
  const pending = { productName: 'A', imported: false };
  const out = applyImportSavedMark_(pending, false);
  assert.equal(pending.imported, false);
  assert.equal(out, null);
});

test('applyImportSavedMark_: 导入模式但无待定候选 → 返回 null 不报错', () => {
  assert.equal(applyImportSavedMark_(null, true), null);
  assert.equal(applyImportSavedMark_(undefined, true), null);
});
