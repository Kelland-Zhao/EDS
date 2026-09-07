// NPI MachineMap 同卡去重修复 — pushDisplaySpecUnique_ / normalizeDuplicateCardKeys_ 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 背景：HT160/HT250/HT250 W 多行原始机型映射同一中间层 HIM + 同一卡 HIM，
//       聚合后 3 条相同规格 → 前端渲染 3 块 HIM（NPI-20260905-0001 三块 HIM 根因）
// 运行：node --test npi-machine-map-dedupe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从源文件中提取函数定义，单独 eval（不依赖 GAS / jQuery 全局）
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

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(extractFunction(code, 'pushDisplaySpecUnique_'));

const jsHtml = fs.readFileSync(new URL('./NPI_ProcessRecord-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(jsHtml, 'normalizeDuplicateCardKeys_'));

// ===== pushDisplaySpecUnique_（服务端 byDisplay 聚合去重） =====

test('空列表 push 正常追加', () => {
  const list = [];
  pushDisplaySpecUnique_(list, { card: 'HIM', count: 1, order: 1 });
  assert.deepEqual(list, [{ card: 'HIM', count: 1, order: 1 }]);
});

test('同卡重复规格跳过，保留先出现行', () => {
  const list = [];
  pushDisplaySpecUnique_(list, { card: 'HIM', count: 1, order: 1 }); // HT160
  pushDisplaySpecUnique_(list, { card: 'HIM', count: 1, order: 1 }); // HT250
  pushDisplaySpecUnique_(list, { card: 'HIM', count: 1, order: 1 }); // HT250 W
  assert.equal(list.length, 1);
  assert.deepEqual(list[0], { card: 'HIM', count: 1, order: 1 });
});

test('同卡不同卡数也跳过，保留先出现行的 count', () => {
  const list = [];
  pushDisplaySpecUnique_(list, { card: 'VIM', count: 3, order: 2 });
  pushDisplaySpecUnique_(list, { card: 'VIM', count: 1, order: 2 });
  assert.equal(list.length, 1);
  assert.equal(list[0].count, 3);
});

test('不同卡都保留（6AX 多卡组合不受影响）', () => {
  const list = [];
  pushDisplaySpecUnique_(list, { card: 'HIM', count: 1, order: 1 });
  pushDisplaySpecUnique_(list, { card: 'VIM', count: 3, order: 2 });
  pushDisplaySpecUnique_(list, { card: '6AX自动化', count: 1, order: 3 });
  assert.deepEqual(list.map(s => s.card), ['HIM', 'VIM', '6AX自动化']);
});

// ===== normalizeDuplicateCardKeys_（前端历史记录键去前缀回填） =====

const dupRef = { display: 'HIM', cards: [{ card: 'HIM', count: 1 }, { card: 'HIM', count: 1 }, { card: 'HIM', count: 1 }] };
const multiRef = { display: '6AX', cards: [{ card: 'HIM', count: 1 }, { card: 'VIM', count: 3 }] };

test('重复同卡组合 + 单卡渲染 → 键去 1_ 前缀，无前缀键不变', () => {
  const obj = { productInfo_9: 'X', '1_him_barrel_temp_一段': '215', '1_remarks_122': '备注' };
  const out = normalizeDuplicateCardKeys_(obj, dupRef, 1);
  assert.deepEqual(out, { productInfo_9: 'X', him_barrel_temp_一段: '215', remarks_122: '备注' });
});

test('真多卡组合（不同卡）不动', () => {
  const obj = { '1_him_x': '1', '2_vim_y': '2' };
  assert.deepEqual(normalizeDuplicateCardKeys_(obj, multiRef, 2), obj);
});

test('多卡渲染（composeLen>1）不动', () => {
  const obj = { '1_him_x': '1' };
  assert.deepEqual(normalizeDuplicateCardKeys_(obj, dupRef, 2), obj);
});

test('无 templateRef / 单卡记录不动', () => {
  const obj = { him_x: '1' };
  assert.deepEqual(normalizeDuplicateCardKeys_(obj, null, 1), obj);
  assert.deepEqual(normalizeDuplicateCardKeys_(obj, { cards: [{ card: 'HIM', count: 1 }] }, 1), obj);
});

test('非对象入参原样返回，不修改入参对象', () => {
  assert.equal(normalizeDuplicateCardKeys_(null, dupRef, 1), null);
  const obj = { '1_him_x': '1' };
  normalizeDuplicateCardKeys_(obj, dupRef, 1);
  assert.deepEqual(obj, { '1_him_x': '1' });
});

test('去前缀后与原键冲突时保留去前缀值（后覆盖）', () => {
  const obj = { him_x: 'old', '1_him_x': 'new' };
  assert.deepEqual(normalizeDuplicateCardKeys_(obj, dupRef, 1), { him_x: 'new' });
});
