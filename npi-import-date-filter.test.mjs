// 测试计划导入日期范围筛选 — filterImportCandidatesByDate 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-import-date-filter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取 filterImportCandidatesByDate 函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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

const html = fs.readFileSync(new URL('./NPI_Dashboard-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(html, 'filterImportCandidatesByDate'));

const list = [
  { date: '2026-09-01', productName: 'A' },
  { date: '2026-09-05', productName: 'B' },
  { date: '2026-09-10', productName: 'C' },
  { date: '', productName: 'D' },
  { date: null, productName: 'E' },
];

test('无筛选时返回全部（含空日期行）', () => {
  const out = filterImportCandidatesByDate(list, '', '');
  assert.equal(out.length, 5);
});

test('只填起始日期：保留 >= 起始的行', () => {
  const out = filterImportCandidatesByDate(list, '2026-09-05', '');
  assert.deepEqual(out.map(c => c.productName), ['B', 'C']);
});

test('只填结束日期：保留 <= 结束的行', () => {
  const out = filterImportCandidatesByDate(list, '', '2026-09-05');
  assert.deepEqual(out.map(c => c.productName), ['A', 'B']);
});

test('双边范围：保留区间内的行', () => {
  const out = filterImportCandidatesByDate(list, '2026-09-05', '2026-09-10');
  assert.deepEqual(out.map(c => c.productName), ['B', 'C']);
});

test('起始大于结束时自动交换', () => {
  const out = filterImportCandidatesByDate(list, '2026-09-10', '2026-09-05');
  assert.deepEqual(out.map(c => c.productName), ['B', 'C']);
});

test('筛选激活时空日期行被排除', () => {
  const out = filterImportCandidatesByDate(list, '2026-09-01', '');
  assert.deepEqual(out.map(c => c.productName), ['A', 'B', 'C']);
});

test('无匹配时返回空数组', () => {
  const out = filterImportCandidatesByDate(list, '2026-08-01', '2026-08-31');
  assert.deepEqual(out, []);
});

test('不修改原数组且返回新数组', () => {
  const out = filterImportCandidatesByDate(list, '2026-09-05', '');
  assert.equal(list.length, 5);
  assert.notEqual(out, list);
});
