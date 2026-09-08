// ProjectTracking 更新弹窗里程碑排序 — sortMilestonesByPlannedStart 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test project-tracking-update-sort.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 ProjectTracking-js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
function tryExtract(src, name) {
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
  return null;
}

const html = fs.readFileSync(new URL('./ProjectTracking-js.html', import.meta.url), 'utf8');
// parseDate 的 M/D 无年份分支引用 today 全局
globalThis.today = new Date(2026, 8, 8);
(0, eval)(tryExtract(html, 'parseDate'));
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'sortMilestonesByPlannedStart')
  || 'function sortMilestonesByPlannedStart(){ throw new Error("sortMilestonesByPlannedStart not found in ProjectTracking-js.html"); }');

test('有「计划开始」的行按计划开始升序（不以计划完成为序）', () => {
  const items = [
    { name: 'A', plannedStart: '2026-09-20', planned: '2026-09-05' },
    { name: 'B', plannedStart: '2026-09-10', planned: '2026-09-30' },
    { name: 'C', plannedStart: '2026-09-15', planned: '2026-09-15' },
  ];
  const sorted = sortMilestonesByPlannedStart(items);
  assert.deepEqual(sorted.map(i => i.name), ['B', 'C', 'A']);
});

test('无「计划开始」的行沉底，其间按计划完成升序，全空保持原顺序', () => {
  const items = [
    { name: 'A', plannedStart: '2026-09-10', planned: '' },
    { name: 'B', plannedStart: '', planned: '2026-09-30' },
    { name: 'C', plannedStart: '', planned: '2026-09-05' },
    { name: 'D', plannedStart: '', planned: '' },
    { name: 'E', plannedStart: '', planned: 'NA' },
    { name: 'F', plannedStart: '2026-09-20', planned: '' },
  ];
  const sorted = sortMilestonesByPlannedStart(items);
  assert.deepEqual(sorted.map(i => i.name), ['A', 'F', 'C', 'B', 'D', 'E']);
});

test('「计划开始」为 NA / 空视为缺失', () => {
  const items = [
    { name: 'A', plannedStart: 'NA', planned: '2026-09-10' },
    { name: 'B', plannedStart: '2026-09-15', planned: '' },
    { name: 'C', plannedStart: null, planned: '2026-09-01' },
  ];
  const sorted = sortMilestonesByPlannedStart(items);
  assert.deepEqual(sorted.map(i => i.name), ['B', 'C', 'A']);
});

test('不修改原数组，空/未传参安全', () => {
  const items = [
    { name: 'A', plannedStart: '2026-09-10', planned: '' },
    { name: 'B', plannedStart: '', planned: '' },
  ];
  const snapshot = JSON.stringify(items);
  sortMilestonesByPlannedStart(items);
  assert.equal(JSON.stringify(items), snapshot);
  assert.deepEqual(sortMilestonesByPlannedStart(), []);
  assert.deepEqual(sortMilestonesByPlannedStart(null), []);
});
