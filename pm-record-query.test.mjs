// 保养记录查询 — 前端纯函数测试（从 PM_RecordQuery-js.html 提取，不依赖 jQuery / GAS 全局）
// 运行：node --test pm-record-query.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 PM_RecordQuery-js.html 中提取函数定义，单独 eval
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

const html = fs.readFileSync(new URL('./PM_RecordQuery-js.html', import.meta.url), 'utf8');
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'pmRecordFilter_')
  || 'function pmRecordFilter_(){ throw new Error("pmRecordFilter_ not found in PM_RecordQuery-js.html"); }');

// 构造测试行
function row(workcenter, planDate) {
  return { 'Workcenter': workcenter, 'Plan PM Date': planDate };
}

test('多选机台：同时命中多个所选机台，未选中的被排除', () => {
  const rows = [row('M1', '2026-01-05'), row('M2', '2026-01-06'), row('M3', '2026-01-07')];
  const out = pmRecordFilter_(rows, ['M1', 'M2'], 'Workcenter', 'Plan PM Date', '', '');
  assert.deepEqual(out.map(r => r['Workcenter']), ['M1', 'M2']);
});

test('未选机台：返回空数组（由调用方提示必选）', () => {
  const rows = [row('M1', '2026-01-05')];
  assert.deepEqual(pmRecordFilter_(rows, [], 'Workcenter', 'Plan PM Date', '', ''), []);
  assert.deepEqual(pmRecordFilter_(rows, null, 'Workcenter', 'Plan PM Date', '', ''), []);
});

test('机台值与选项宽松相等（数值机台号匹配字符串选项）', () => {
  const rows = [{ 'Workcenter': 123, 'Plan PM Date': '2026-01-05' }];
  const out = pmRecordFilter_(rows, ['123'], 'Workcenter', 'Plan PM Date', '', '');
  assert.equal(out.length, 1);
});

test('日期范围与机台多选组合过滤', () => {
  const rows = [
    row('M1', '2026-01-05'),
    row('M1', '2026-03-10'),
    row('M2', '2026-02-15'),
    row('M2', '2026-06-01'),
  ];
  const out = pmRecordFilter_(rows, ['M1', 'M2'], 'Workcenter', 'Plan PM Date', '2026-02-01', '2026-05-31');
  assert.deepEqual(out.map(r => r['Plan PM Date']), ['2026-03-10', '2026-02-15']);
});

test('缺机台列值或缺计划日期的行被排除', () => {
  const rows = [
    { 'Workcenter': '', 'Plan PM Date': '2026-01-05' },
    { 'Workcenter': 'M1', 'Plan PM Date': '' },
  ];
  const out = pmRecordFilter_(rows, ['M1'], 'Workcenter', 'Plan PM Date', '2026-01-01', '');
  assert.deepEqual(out, []);
});
