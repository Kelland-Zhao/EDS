// 测试计划导入阻止 — 前端纯函数测试（从 NPI_Dashboard-js.html 提取，不依赖 jQuery / GAS 全局）
// 覆盖：草稿表状态为「满产」「模具不在线」的行禁止导入
// 背景：这两类行导入后初始状态被 mapTestPlanStatus_ 归成「待确认 Pending」，
//       与正常新建任务无法区分，业务要求源头拦掉
// 运行：node --test npi-import-block.test.mjs
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
(0, eval)(tryExtract(html, 'isImportBlocked_')
  || 'function isImportBlocked_(){ throw new Error("isImportBlocked_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'importCounts_')
  || 'function importCounts_(){ throw new Error("importCounts_ not found in NPI_Dashboard-js.html"); }');

test('isImportBlocked_: 满产 → 阻止导入', () => {
  assert.equal(isImportBlocked_('满产'), true);
});

test('isImportBlocked_: 模具不在线 → 阻止导入', () => {
  assert.equal(isImportBlocked_('模具不在线'), true);
});

test('isImportBlocked_: 可导入的草稿状态 → 不阻止', () => {
  ['已完成', '延期', '取消', '正在进行', '未完成'].forEach((s) => {
    assert.equal(isImportBlocked_(s), false, `${s} 不应被阻止`);
  });
});

test('isImportBlocked_: 空状态 → 不阻止（草稿表存在完成状态空白的行）', () => {
  ['', '   ', null, undefined].forEach((s) => {
    assert.equal(isImportBlocked_(s), false, `${JSON.stringify(s)} 不应被阻止`);
  });
});

test('isImportBlocked_: 人工维护的表常见前后空格 → 仍能识别', () => {
  assert.equal(isImportBlocked_(' 满产 '), true);
  assert.equal(isImportBlocked_('\t模具不在线\n'), true);
});

test('importCounts_: 全部可导入 → 无非导入项', () => {
  const list = [{ draftStatus: '延期' }, { draftStatus: '未完成' }, { draftStatus: '' }];
  assert.deepEqual(importCounts_(list), { actionable: 3, blocked: 0 });
});

test('importCounts_: 被拦行不计入可导入数', () => {
  const list = [{ draftStatus: '延期' }, { draftStatus: '满产' }, { draftStatus: '模具不在线' }];
  assert.deepEqual(importCounts_(list), { actionable: 1, blocked: 2 });
});

test('importCounts_: 已导入行两个口径都不计（已导入优先于被拦）', () => {
  const list = [{ draftStatus: '延期', imported: true }, { draftStatus: '满产', imported: true }, { draftStatus: '满产' }];
  assert.deepEqual(importCounts_(list), { actionable: 0, blocked: 1 });
});

test('importCounts_: 空清单 → 全为 0', () => {
  assert.deepEqual(importCounts_([]), { actionable: 0, blocked: 0 });
  assert.deepEqual(importCounts_(null), { actionable: 0, blocked: 0 });
});
