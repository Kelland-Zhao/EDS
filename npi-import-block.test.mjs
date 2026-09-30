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
(0, eval)(tryExtract(html, 'importBlockReasons_')
  || 'function importBlockReasons_(){ throw new Error("importBlockReasons_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'isImportBlocked_')
  || 'function isImportBlocked_(){ throw new Error("isImportBlocked_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'importCounts_')
  || 'function importCounts_(){ throw new Error("importCounts_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'importHintText_')
  || 'function importHintText_(){ throw new Error("importHintText_ not found in NPI_Dashboard-js.html"); }');
(0, eval)(tryExtract(html, 'filterImportCandidatesByBlocked_')
  || 'function filterImportCandidatesByBlocked_(){ throw new Error("filterImportCandidatesByBlocked_ not found in NPI_Dashboard-js.html"); }');

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

// ---- 机台列「满产」「已排满」拦截 ----
// 背景：计划部把「满产」写在测试机台列（而非完成状态列）表示机台排满无空；
// 这类行完成状态往往是「取消」，只查状态列会漏掉一半

test('isImportBlocked_: 机台列写「满产」→ 阻止导入（状态列是「取消」时同样拦）', () => {
  assert.equal(isImportBlocked_('取消', '满产'), true);
  assert.equal(isImportBlocked_('', '满产'), true);
});

test('isImportBlocked_: 机台列写「已排满」→ 阻止导入（语义等同于满产）', () => {
  assert.equal(isImportBlocked_('取消', '已排满'), true);
});

test('isImportBlocked_: 机台列含「满产」的变体写法 → 仍能识别', () => {
  assert.equal(isImportBlocked_('', ' 满产 '), true);
  assert.equal(isImportBlocked_('', '满产（停机）'), true);
});

test('isImportBlocked_: 正常机台号 → 不阻止', () => {
  ['H2FCS954', 'H1HTA660', 'H2HTA651 H2HTA652', 'M1IM0117 M1IM0122', '机台号待定', 'NA', ''].forEach((m) => {
    assert.equal(isImportBlocked_('延期', m), false, `${m} 不应被阻止`);
  });
});

test('isImportBlocked_: 机台列缺失（老载荷无该字段）→ 只按状态判定', () => {
  assert.equal(isImportBlocked_('满产', undefined), true);
  assert.equal(isImportBlocked_('延期', undefined), false);
});

test('importCounts_: 机台列满产的行计入 blocked', () => {
  const list = [
    { draftStatus: '延期', machineNo: 'H2FCS954' },
    { draftStatus: '取消', machineNo: '满产' },
    { draftStatus: '取消', machineNo: '已排满' }
  ];
  assert.deepEqual(importCounts_(list), { actionable: 1, blocked: 2 });
});

// ---- 原因明细（toast 用，单一规则来源）----

test('importBlockReasons_: 可导入 → 空数组', () => {
  assert.deepEqual(importBlockReasons_('延期', 'H2FCS954'), []);
  assert.deepEqual(importBlockReasons_('', ''), []);
});

test('importBlockReasons_: 状态列命中 → ["status"]', () => {
  assert.deepEqual(importBlockReasons_('满产', 'H2FCS954'), ['status']);
  assert.deepEqual(importBlockReasons_('模具不在线', ''), ['status']);
});

test('importBlockReasons_: 机台列命中 → ["machine"]', () => {
  assert.deepEqual(importBlockReasons_('取消', '满产'), ['machine']);
  assert.deepEqual(importBlockReasons_('取消', '已排满'), ['machine']);
});

test('importBlockReasons_: 两列同时命中 → 两项都报（toast 需说全）', () => {
  assert.deepEqual(importBlockReasons_('满产', '满产'), ['status', 'machine']);
});

// ---- 提示行文案 ----
// 回归背景：曾把「未导入」写成 actionable（已排除被拦行），
// 却又用「其中 N 行…」表述被拦行，导致 603 = 6 + 575 + 22 里凑不出 575 这个数

test('importHintText_: 未导入数 = 可导入 + 被拦（被拦行也在未导入里）', () => {
  const txt = importHintText_({ actionable: 575, blocked: 22 }, 603, 603);
  assert.match(txt, /共 603 行，未导入 597 行/);
  assert.match(txt, /其中 22 行/);
});

test('importHintText_: 无被拦行 → 不出现「其中」', () => {
  const txt = importHintText_({ actionable: 5, blocked: 0 }, 5, 5);
  assert.match(txt, /共 5 行，未导入 5 行/);
  assert.ok(txt.indexOf('其中') < 0, '不应出现「其中」');
});

test('importHintText_: 筛选后展示行数与原总数不同 → 带「筛选自」', () => {
  const txt = importHintText_({ actionable: 8, blocked: 2 }, 10, 603);
  assert.match(txt, /共 10 行（筛选自 603 行）/);
  assert.match(txt, /未导入 10 行/);
});

// ---- 「只看不可导入」开关 ----

test('filterImportCandidatesByBlocked_: 未开启 → 原样返回，不筛', () => {
  const list = [{ draftStatus: '延期', machineNo: 'H2FCS954' }, { draftStatus: '满产', machineNo: '' }];
  assert.deepEqual(filterImportCandidatesByBlocked_(list, false), list);
  assert.equal(filterImportCandidatesByBlocked_(list, false).length, 2);
});

test('filterImportCandidatesByBlocked_: 开启 → 只留被拦行', () => {
  const list = [
    { draftStatus: '延期', machineNo: 'H2FCS954' },
    { draftStatus: '满产', machineNo: '' },
    { draftStatus: '取消', machineNo: '满产' }
  ];
  const out = filterImportCandidatesByBlocked_(list, true);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((c) => c.draftStatus), ['满产', '取消']);
});

test('filterImportCandidatesByBlocked_: 已导入的被拦行不出现（没有待办）', () => {
  const list = [
    { draftStatus: '满产', machineNo: '', imported: true },
    { draftStatus: '满产', machineNo: '' }
  ];
  assert.equal(filterImportCandidatesByBlocked_(list, true).length, 1);
});

test('filterImportCandidatesByBlocked_: 无被拦行 / 空清单 → 空数组不报错', () => {
  assert.deepEqual(filterImportCandidatesByBlocked_([{ draftStatus: '延期', machineNo: 'H2FCS954' }], true), []);
  assert.deepEqual(filterImportCandidatesByBlocked_([], true), []);
  assert.deepEqual(filterImportCandidatesByBlocked_(null, true), []);
});
