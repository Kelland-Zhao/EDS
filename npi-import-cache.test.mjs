// 测试计划导入缓存秒开 — 前端纯函数测试（从 NPI_Dashboard-js.html 提取，不依赖 jQuery / GAS 全局）
// 覆盖：缓存就绪判断、候选按日期降序排序（返回新数组不改入参）
// 运行：node --test npi-import-cache.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'importCacheReady_')
  || 'function importCacheReady_(){ throw new Error("importCacheReady_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'sortImportCandidatesByDateDesc_')
  || 'function sortImportCandidatesByDateDesc_(){ throw new Error("sortImportCandidatesByDateDesc_ not found in NPI_Dashboard-js.html"); }');

// ===== importCacheReady_（缓存就绪判断：快路径决策） =====

test('importCacheReady_: 未加载（null/undefined）→ 未就绪', () => {
  assert.equal(importCacheReady_(null), false);
  assert.equal(importCacheReady_(undefined), false);
});

test('importCacheReady_: 已加载（含空清单）→ 就绪', () => {
  assert.equal(importCacheReady_([]), true);
  assert.equal(importCacheReady_([{ date: '2026-09-01' }]), true);
});

// ===== sortImportCandidatesByDateDesc_（候选按日期降序） =====

const list = [
  { date: '2026-09-05', productName: 'B' },
  { date: '', productName: 'D' },
  { date: '2026-09-10', productName: 'C' },
  { date: '2026-09-01', productName: 'A' },
  { date: null, productName: 'E' },
];

test('sortImportCandidatesByDateDesc_: 按日期降序（新→旧）', () => {
  const out = sortImportCandidatesByDateDesc_(list);
  assert.deepEqual(out.map(c => c.productName), ['C', 'B', 'A', 'D', 'E']);
});

test('sortImportCandidatesByDateDesc_: 空日期行排最后', () => {
  const out = sortImportCandidatesByDateDesc_(list);
  const nonEmpty = out.filter(c => String(c.date || '').trim());
  assert.deepEqual(nonEmpty.map(c => c.productName), ['C', 'B', 'A']);
  assert.deepEqual(out.slice(-2).map(c => c.productName), ['D', 'E']);
});

test('sortImportCandidatesByDateDesc_: 不修改原数组且返回新数组', () => {
  const before = JSON.stringify(list);
  const out = sortImportCandidatesByDateDesc_(list);
  assert.equal(JSON.stringify(list), before);
  assert.notEqual(out, list);
});

test('sortImportCandidatesByDateDesc_: 空/缺失清单 → 空数组', () => {
  assert.deepEqual(sortImportCandidatesByDateDesc_([]), []);
  assert.deepEqual(sortImportCandidatesByDateDesc_(null), []);
});
