// 测试计划状态轮转乐观更新 — applyLocalStatus_ 前端纯函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-dashboard-status-optimistic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) return null;
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
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(extractFunction(html, 'applyLocalStatus_')
  || 'function applyLocalStatus_(){ throw new Error("applyLocalStatus_ not found in NPI_Dashboard-js.html"); }');

const TASKS = [
  { taskID: 'NPI-1', status: '待确认 Pending', machineNo: 'H1', planDate: '2026-09-09' },
  { taskID: 'NPI-2', status: '执行中 In Progress', machineNo: 'H2', planDate: '2026-09-08' },
];

test('applyLocalStatus_: 命中任务的状态被替换，其余字段保留', () => {
  const out = applyLocalStatus_(TASKS, 'NPI-1', '已排期 Scheduled');
  assert.equal(out[0].status, '已排期 Scheduled');
  assert.deepEqual(
    { taskID: out[0].taskID, machineNo: out[0].machineNo, planDate: out[0].planDate },
    { taskID: 'NPI-1', machineNo: 'H1', planDate: '2026-09-09' }
  );
  assert.equal(out[1].status, '执行中 In Progress');
});

test('applyLocalStatus_: 未命中任务 → 所有任务原样返回', () => {
  const out = applyLocalStatus_(TASKS, 'NPI-999', '已取消 Cancelled');
  assert.deepEqual(out.map(t => t.status), ['待确认 Pending', '执行中 In Progress']);
});

test('applyLocalStatus_: 纯函数，不修改入参数组', () => {
  const before = JSON.stringify(TASKS);
  applyLocalStatus_(TASKS, 'NPI-1', '已完成 Completed');
  assert.equal(JSON.stringify(TASKS), before);
});

test('applyLocalStatus_: 空/未定义入参安全返回空数组', () => {
  assert.deepEqual(applyLocalStatus_(null, 'NPI-1', '已完成 Completed'), []);
  assert.deepEqual(applyLocalStatus_([], 'NPI-1', '已完成 Completed'), []);
});
