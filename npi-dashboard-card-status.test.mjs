// 测试计划工艺卡状态徽章 — cardStatusBadge_ 前端函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-dashboard-card-status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_Dashboard-js.html 中提取 cardStatusBadge_ 函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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
(0, eval)(extractFunction(html, 'cardStatusBadge_'));

test('草稿 → 灰色徽章含 Draft', () => {
  const b = cardStatusBadge_('草稿');
  assert.ok(b.indexOf('bg-secondary') >= 0);
  assert.ok(b.indexOf('Draft') >= 0);
});

test('已提交 → 蓝色徽章含 Submitted', () => {
  const b = cardStatusBadge_('已提交');
  assert.ok(b.indexOf('bg-primary') >= 0);
  assert.ok(b.indexOf('Submitted') >= 0);
});

test('已转正 → 绿色徽章含 Promoted', () => {
  const b = cardStatusBadge_('已转正');
  assert.ok(b.indexOf('bg-success') >= 0);
  assert.ok(b.indexOf('Promoted') >= 0);
});

test('未知/空状态返回空字符串', () => {
  assert.equal(cardStatusBadge_(''), '');
  assert.equal(cardStatusBadge_('不存在'), '');
  assert.equal(cardStatusBadge_(null), '');
  assert.equal(cardStatusBadge_(undefined), '');
});

test('徽章文案中上英下（<br> 分隔）', () => {
  const b = cardStatusBadge_('已提交');
  const m = /已提交<br><small>Submitted<\/small>/.test(b);
  assert.ok(m);
});
