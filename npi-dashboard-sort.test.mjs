// 测试计划任务行排序 — sortTasksForTable_ 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-dashboard-sort.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取 sortTasksForTable_ 函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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
(0, eval)(extractFunction(html, 'sortTasksForTable_'));

test('紧急任务置顶', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-01' },
    { taskID: 'B', source: 'urgent', planDate: '2026-09-10' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['B', 'A']);
});

test('非紧急按计划日期升序', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-10' },
    { taskID: 'B', source: 'weekly', planDate: '2026-09-01' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['B', 'A']);
});

test('source 含 urgent 子串视为紧急', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-01' },
    { taskID: 'B', source: 'weekly_urgent', planDate: '2026-09-10' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['B', 'A']);
});

test('source 大小写敏感：大写 Urgent 不算紧急（现有行为）', () => {
  const list = [
    { taskID: 'A', source: 'Urgent', planDate: '2026-09-10' },
    { taskID: 'B', source: 'weekly', planDate: '2026-09-01' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['B', 'A']);
});

test('空计划日期排最前（与现有 localeCompare 行为一致）', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-01' },
    { taskID: 'B', source: 'weekly', planDate: '' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['B', 'A']);
});

test('同日期保持原顺序（稳定）', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-01' },
    { taskID: 'B', source: 'weekly', planDate: '2026-09-01' },
    { taskID: 'C', source: 'weekly', planDate: '2026-09-01' },
  ];
  assert.deepEqual(sortTasksForTable_(list).map(t => t.taskID), ['A', 'B', 'C']);
});

test('不修改入参数组，返回新数组', () => {
  const list = [
    { taskID: 'A', source: 'weekly', planDate: '2026-09-10' },
    { taskID: 'B', source: 'weekly', planDate: '2026-09-01' },
  ];
  const out = sortTasksForTable_(list);
  assert.notEqual(out, list);
  assert.deepEqual(list.map(t => t.taskID), ['A', 'B']);
});
