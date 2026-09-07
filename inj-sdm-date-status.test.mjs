// INJ SDM 日期状态可视化 — dateStatusClass 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test inj-sdm-date-status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 INJ_SDM_Summary-js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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
(0, eval)(extractFunction(html, 'dateStatusClass'));

test('无日期返回空字符串', () => {
  assert.equal(dateStatusClass('', '2026-09-07'), '');
  assert.equal(dateStatusClass(null, '2026-09-07'), '');
  assert.equal(dateStatusClass(undefined, '2026-09-07'), '');
});

test('早于今天返回 overdue', () => {
  assert.equal(dateStatusClass('2026-09-06', '2026-09-07'), 'overdue');
  assert.equal(dateStatusClass('2026-08-31', '2026-09-01'), 'overdue'); // 跨月边界
  assert.equal(dateStatusClass('2026-01-01', '2026-09-07'), 'overdue');
});

test('等于今天返回 today', () => {
  assert.equal(dateStatusClass('2026-09-07', '2026-09-07'), 'today');
});

test('晚于今天返回 future', () => {
  assert.equal(dateStatusClass('2026-09-08', '2026-09-07'), 'future');
  assert.equal(dateStatusClass('2026-10-01', '2026-09-30'), 'future'); // 跨月边界
  assert.equal(dateStatusClass('2026-12-31', '2026-09-07'), 'future');
});
