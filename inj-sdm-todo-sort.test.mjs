// INJ SDM 待办事项日期排序 — sortTodoByDate 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test inj-sdm-todo-sort.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 INJ_SDM_Summary-js.html 中提取 sortTodoByDate 函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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

const html = fs.readFileSync(new URL('./INJ_SDM_Summary-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(html, 'sortTodoByDate'));

test('有日期按升序排列，无日期排最下面', () => {
  const items = [
    { expectedCompletionDate: '2026-09-20' },
    { expectedCompletionDate: '' },
    { expectedCompletionDate: '2026-09-10' },
    { expectedCompletionDate: null },
  ];
  const sorted = sortTodoByDate(items);
  assert.deepEqual(
    sorted.map(i => i.expectedCompletionDate),
    ['2026-09-10', '2026-09-20', '', null]
  );
});

test('全部无日期时保持原顺序（稳定）', () => {
  const items = [
    { expectedCompletionDate: '', desc: 'A' },
    { expectedCompletionDate: undefined, desc: 'B' },
    { expectedCompletionDate: null, desc: 'C' },
  ];
  const sorted = sortTodoByDate(items);
  assert.deepEqual(sorted.map(i => i.desc), ['A', 'B', 'C']);
});

test('字符串日期按字典序升序（yyyy-MM-dd 格式）', () => {
  const items = [
    { expectedCompletionDate: '2026-10-01' },
    { expectedCompletionDate: '2026-09-30' },
    { expectedCompletionDate: '2026-09-05' },
  ];
  const sorted = sortTodoByDate(items);
  assert.deepEqual(
    sorted.map(i => i.expectedCompletionDate),
    ['2026-09-05', '2026-09-30', '2026-10-01']
  );
});

test('不修改原数组，空/未传入参安全', () => {
  const items = [
    { expectedCompletionDate: '2026-09-10' },
    { expectedCompletionDate: '' },
  ];
  const snapshot = JSON.stringify(items);
  sortTodoByDate(items);
  assert.equal(JSON.stringify(items), snapshot);
  assert.deepEqual(sortTodoByDate(), []);
  assert.deepEqual(sortTodoByDate(null), []);
});
