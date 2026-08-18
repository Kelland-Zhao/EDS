// 留言板标签 — Node 内置 test runner 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test msgboard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

const ALL_TAGS = ['安全 / EHS', '质量 / Quality', '新品 & 新设备/自动化 / NPI & New Equip./Auto', 'FP&R / SM & 5S'];

// ===== 1. normalizeTags =====
test('normalizeTags 空名单返回错误', () => {
  const r = globalThis.normalizeTags([]);
  assert.equal(r.ok, false);
  assert.ok(r.message.includes('标签'));
});

test('normalizeTags 全是空白返回错误', () => {
  const r = globalThis.normalizeTags(['   ', '']);
  assert.equal(r.ok, false);
});

test('normalizeTags 去空白并去重，保持顺序', () => {
  const r = globalThis.normalizeTags(['安全 / EHS', ' 安全 / EHS ', '质量 / Quality']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, ['安全 / EHS', '质量 / Quality']);
});

test('normalizeTags 拒绝不在合法清单中的标签', () => {
  const r = globalThis.normalizeTags(['随便写的标签']);
  assert.equal(r.ok, false);
  assert.ok(r.message.includes('无效'));
});

test('normalizeTags 接受全部4个合法标签', () => {
  const r = globalThis.normalizeTags(ALL_TAGS);
  assert.equal(r.ok, true);
  assert.equal(r.value.length, 4);
});

// ===== 2. parseTagsFromCell =====
test('parseTagsFromCell 顿号拆分并去空白', () => {
  assert.deepEqual(globalThis.parseTagsFromCell('安全 / EHS、质量 / Quality'), ['安全 / EHS', '质量 / Quality']);
  assert.deepEqual(globalThis.parseTagsFromCell(' 安全 / EHS 、 质量 / Quality '), ['安全 / EHS', '质量 / Quality']);
});

test('parseTagsFromCell 空值返回空数组（历史留言兼容）', () => {
  assert.deepEqual(globalThis.parseTagsFromCell(''), []);
  assert.deepEqual(globalThis.parseTagsFromCell(null), []);
  assert.deepEqual(globalThis.parseTagsFromCell(undefined), []);
});

test('parseTagsFromCell 单标签返回单元素数组', () => {
  assert.deepEqual(globalThis.parseTagsFromCell('FP&R / SM & 5S'), ['FP&R / SM & 5S']);
});
