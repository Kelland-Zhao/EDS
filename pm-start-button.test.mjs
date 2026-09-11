// 开始保养按钮状态 — 前端纯函数测试（从 PM_Task-js_1.0.html 提取，不依赖 jQuery / GAS 全局）
// 运行：node --test pm-start-button.test.mjs
//
// 背景（bug 20260911E0EN0004）：记录状态为"人员已分配"（未开始保养）时，
// PM_Plan 跟进进入 PM_Task 页面级 Ongoing 分支，pmRenderRecordTasks_ 曾把开始保养按钮禁用，
// 导致无法点击"开始保养"。修复后由本纯函数按记录自身状态判断。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 PM_Task-js_1.0.html 中提取函数定义，单独 eval
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

const html = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)((() => {
  try { return extractFunction(html, 'pmStartButtonState_'); }
  catch (e) {
    return 'function pmStartButtonState_(){ throw new Error("pmStartButtonState_ not found in PM_Task-js_1.0.html"); }';
  }
})());

test('人员已分配（页面级Ongoing，未开始）：允许点击开始保养，表格保持只读', () => {
  const s = pmStartButtonState_(true, '人员已分配 / Personnel Assigned');
  assert.equal(s.canStart, true);
  assert.equal(s.tableEditable, false);
});

test('已添加临时任务（页面级Ongoing，未开始）：允许点击开始保养，表格保持只读', () => {
  const s = pmStartButtonState_(true, '已添加临时任务 / Added Temporary Task');
  assert.equal(s.canStart, true);
  assert.equal(s.tableEditable, false);
});

test('进行中（页面级Ongoing，已开始）：禁止重复开始，表格可编辑', () => {
  const s = pmStartButtonState_(true, '进行中/ Ongoing');
  assert.equal(s.canStart, false);
  assert.equal(s.tableEditable, true);
});

test('英文 Ongoing 记录（已开始）：同样禁止重复开始', () => {
  const s = pmStartButtonState_(true, 'Ongoing');
  assert.equal(s.canStart, false);
  assert.equal(s.tableEditable, true);
});

test('已完成（页面级Done，只读跟进）：禁止开始，表格只读', () => {
  const s = pmStartButtonState_(false, '已完成/ Done');
  assert.equal(s.canStart, false);
  assert.equal(s.tableEditable, false);
});

test('页面级Done优先：记录残留"进行中"也不允许开始', () => {
  const s = pmStartButtonState_(false, '进行中/ Ongoing');
  assert.equal(s.canStart, false);
  assert.equal(s.tableEditable, false);
});

test('记录状态缺失（异常数据）：按未开始处理，与旧逻辑一致允许开始', () => {
  const s = pmStartButtonState_(true, '');
  assert.equal(s.canStart, true);
  assert.equal(s.tableEditable, false);
});
