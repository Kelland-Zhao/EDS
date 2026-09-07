// 测试计划行底色 class — taskRowClass_ 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-dashboard-row-class.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取 taskRowClass_ 函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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
(0, eval)(extractFunction(html, 'taskRowClass_'));

test('无工艺卡返回 table-danger', () => {
  assert.equal(taskRowClass_({ cardNumber: '' }), 'table-danger');
  assert.equal(taskRowClass_({ cardNumber: undefined }), 'table-danger');
});

test('有工艺卡且非紧急返回空字符串', () => {
  assert.equal(taskRowClass_({ cardNumber: 'TEST-Parameter-IM-0001-00', source: 'weekly' }), '');
});

test('紧急任务返回 table-danger（即使有工艺卡）', () => {
  assert.equal(taskRowClass_({ cardNumber: 'TEST-Parameter-IM-0001-00', source: 'urgent' }), 'table-danger');
});

test('紧急且无工艺卡返回 table-danger', () => {
  assert.equal(taskRowClass_({ cardNumber: '', source: 'urgent' }), 'table-danger');
});

test('source 含 urgent 子串（如 weekly_urgent）视为紧急', () => {
  assert.equal(taskRowClass_({ cardNumber: 'TEST-Parameter-IM-0001-00', source: 'weekly_urgent' }), 'table-danger');
});

test('source 大小写敏感：大写 Urgent 不视为紧急（现有行为）', () => {
  assert.equal(taskRowClass_({ cardNumber: 'TEST-Parameter-IM-0001-00', source: 'Urgent' }), '');
});
