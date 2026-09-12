// NPI 工艺参数页 — 测试任务下拉纯函数测试（从 NPI_ProcessRecord-js.html 提取，不依赖 jQuery / GAS 全局）
// 运行：node --test npi-task-select.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_ProcessRecord-js.html 中提取函数定义，单独 eval
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

const html = fs.readFileSync(new URL('./NPI_ProcessRecord-js.html', import.meta.url), 'utf8');
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'sortTasksByPlanDateDesc_')
  || 'function sortTasksByPlanDateDesc_(){ throw new Error("sortTasksByPlanDateDesc_ not found in NPI_ProcessRecord-js.html"); }');
(0, eval)(tryExtract(html, 'taskOptionText_')
  || 'function taskOptionText_(){ throw new Error("taskOptionText_ not found in NPI_ProcessRecord-js.html"); }');

test('sortTasksByPlanDateDesc_ 按计划日期倒序排列', () => {
  const tasks = [
    { taskID: 'T1', planDate: '2026-09-01' },
    { taskID: 'T2', planDate: '2026-09-10' },
    { taskID: 'T3', planDate: '2026-08-15' },
  ];
  const sorted = sortTasksByPlanDateDesc_(tasks);
  assert.deepEqual(sorted.map(t => t.taskID), ['T2', 'T1', 'T3']);
});

test('sortTasksByPlanDateDesc_ 空日期沉底且保持原相对顺序', () => {
  const tasks = [
    { taskID: 'A', planDate: '' },
    { taskID: 'B', planDate: '2026-09-01' },
    { taskID: 'C', planDate: '' },
    { taskID: 'D', planDate: '2026-08-01' },
  ];
  const sorted = sortTasksByPlanDateDesc_(tasks);
  assert.deepEqual(sorted.map(t => t.taskID), ['B', 'D', 'A', 'C']);
});

test('sortTasksByPlanDateDesc_ 不修改原数组', () => {
  const tasks = [{ taskID: 'A', planDate: '2026-09-01' }, { taskID: 'B', planDate: '2026-08-01' }];
  const before = tasks.map(t => t.taskID).join(',');
  sortTasksByPlanDateDesc_(tasks);
  assert.equal(tasks.map(t => t.taskID).join(','), before);
});

test('taskOptionText_ 产品名与日期齐全时格式为 编号 | 产品 | 日期', () => {
  assert.equal(
    taskOptionText_({ taskID: 'NPI-001', productName: 'ABC', moldNo: 'M1', planDate: '2026-09-12' }),
    'NPI-001 | ABC | 2026-09-12'
  );
});

test('taskOptionText_ 无产品名回退模具号，无日期不加尾巴', () => {
  assert.equal(taskOptionText_({ taskID: 'NPI-002', productName: '', moldNo: 'M9', planDate: '' }), 'NPI-002 | M9');
  assert.equal(taskOptionText_({ taskID: 'NPI-003', productName: '', moldNo: '', planDate: '' }), 'NPI-003 | --');
});
