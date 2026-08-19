// 故障记录校验报告 — Node 内置 test runner 测试（.mjs，clasp 不会推送到 GAS）
// 运行：node --test fault_validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ===== 最小 jQuery stub（仅覆盖脚本顶层与 computeMissingFields 用到的链式调用） =====
const chainable = () => new Proxy(function () {}, {
  get: (t, prop) => {
    if (prop === 'toArray') return () => [];
    if (prop === 'is') return () => false;
    if (prop === 'val') return () => '';
    if (prop === 'trim') return () => '';
    return chainable();
  },
  apply: () => chainable(),
});
globalThis.$ = chainable();
globalThis.jQuery = globalThis.$;
globalThis.document = {};
globalThis.sessionStorage = { getItem: () => '' };
globalThis.Swal = { fire: () => {} };
globalThis.google = { script: { run: { withSuccessHandler: () => ({ withFailureHandler: () => ({}) }) } } };
globalThis.console = console;

// 加载前端脚本（顶层 ready/click/on 由 stub 吞掉，不执行初始化）
const code = fs.readFileSync(new URL('./Fault_Record_1.0-js.html', import.meta.url), 'utf8');
const script = code.match(/<script>([\s\S]*)<\/script>/)[1];
(0, eval)(script);

const FIELD_KEYS = ['workcenter', 'workshop', 'shift', 'owner', 'errorCode', 'Status', 'MaintenanceDuration', 'Description', 'DirectCause', 'SuggestedAction'];

function fullFieldValues() {
  return {
    workcenter: 'E0EN0008', workshop: 'TB1', shift: 'A班', owner: '张三',
    errorCode: 'V_ML11', Status: '已解决/ Solved', MaintenanceDuration: '30',
    Description: '故障描述', DirectCause: '原因', SuggestedAction: '措施',
  };
}
function oneYesItem(overrides = {}) {
  return Object.assign({ label: '设备维修/ Equipment Maintenance?', checked: true, descValues: ['更换气缸'] }, overrides);
}

// ===== computeMissingFields =====
test('全部填完且勾选项有描述 → 返回空数组', () => {
  const r = globalThis.computeMissingFields(fullFieldValues(), [oneYesItem()]);
  assert.deepEqual(r, []);
});

test('缺失固定字段 → 列出对应双语标签', () => {
  const vals = fullFieldValues();
  vals.DirectCause = '';
  vals.Status = '';
  const r = globalThis.computeMissingFields(vals, [oneYesItem()]);
  assert.ok(r.some(m => m.includes('直接原因')));
  assert.ok(r.some(m => m.includes('状态')));
  assert.equal(r.length, 2);
});

test('勾选「是」但描述为空 → 列出处理项名称', () => {
  const r = globalThis.computeMissingFields(fullFieldValues(), [oneYesItem({ descValues: [''] })]);
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('设备维修'));
});

test('一个「是」都没勾 → 提示至少一项', () => {
  const r = globalThis.computeMissingFields(fullFieldValues(), [oneYesItem({ checked: false, descValues: [''] })]);
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('至少'));
});

test('未勾选的项即使描述为空也不报缺失', () => {
  const r = globalThis.computeMissingFields(fullFieldValues(), [oneYesItem({ checked: false, descValues: [''] }), oneYesItem()]);
  assert.deepEqual(r, []);
});

test('跟从项双输入框任一为空 → 报缺失', () => {
  const r = globalThis.computeMissingFields(fullFieldValues(), [
    { label: '是否有热流道跟从/ Follow the Hot Runner?', checked: true, descValues: ['12', ''] },
  ]);
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('热流道'));
});

test('多项同时缺失 → 全部列出', () => {
  const vals = fullFieldValues();
  vals.SuggestedAction = '';
  vals.MaintenanceDuration = '';
  const r = globalThis.computeMissingFields(vals, [
    oneYesItem({ descValues: [''] }),
    { label: '工艺调整/ Process Adjustment?', checked: true, descValues: [''] },
  ]);
  assert.equal(r.length, 4);
});
