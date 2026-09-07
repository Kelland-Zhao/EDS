// NPI MachineMap 同卡去重修复 — pushDisplaySpecUnique_ / normalizeDuplicateCardKeys_ / normalizeMachineModelDisplay_ 测试
// 背景：HT160/HT250/HT250 W 多行原始机型映射同一中间层 HIM + 同一卡 HIM，
//       聚合后 3 条相同规格 → 前端渲染 3 块 HIM（NPI-20260905-0001 三块 HIM 根因）；
//       2026-08-25 中间层引入前保存的历史记录机型存的是原始机型（如 HT250），回显需归一化为中间层（HIM）
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
(0, eval)(extractFunction(jsHtml, 'normalizeMachineModelDisplay_'));

// 真实 NPI_MachineMap 的 byRaw（中间层映射）
const byRaw = {
  ENG: 'FCS/ENG', FCS: 'FCS/ENG',
  HT160: 'HIM', HT250: 'HIM', 'HT250 W': 'HIM',
  'H Auto': 'H Auto', 'H Auto S': 'H Auto',
  '6AX': '6AX', '3AX': '3AX', FT400: 'VIM', DB: 'OMNI-DB', DP: 'DP', HS: 'HS',
};
const machineMap = { byRaw };

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

// ===== normalizeMachineModelDisplay_（前端历史记录机型归一化） =====

test('HT250 → HIM（NPI-20260824-0001 真实场景）', () => {
  const obj = { productInfo_9: 'Darlie Lovely Bunny', productInfo_12: 'HT250' };
  assert.deepEqual(normalizeMachineModelDisplay_(obj, machineMap).productInfo_12, 'HIM');
});

test('ENG → FCS/ENG', () => {
  assert.equal(normalizeMachineModelDisplay_({ productInfo_12: 'ENG' }, machineMap).productInfo_12, 'FCS/ENG');
});

test('值与中间层相同（6AX→6AX）原样返回原对象', () => {
  const obj = { productInfo_12: '6AX', other: 1 };
  assert.equal(normalizeMachineModelDisplay_(obj, machineMap), obj);
});

test('byRaw 查不到的值原样返回原对象', () => {
  const obj = { productInfo_12: '100', other: 1 };
  assert.equal(normalizeMachineModelDisplay_(obj, machineMap), obj);
});

test('productInfo_12 缺失或空原样返回', () => {
  const obj1 = { other: 1 };
  assert.equal(normalizeMachineModelDisplay_(obj1, machineMap), obj1);
  const obj2 = { productInfo_12: '' };
  assert.equal(normalizeMachineModelDisplay_(obj2, machineMap), obj2);
});

test('非对象入参原样返回', () => {
  assert.equal(normalizeMachineModelDisplay_(null, machineMap), null);
  assert.equal(normalizeMachineModelDisplay_([1, 2], machineMap).length, 2);
});

test('不修改入参对象，其他键保持不变', () => {
  const obj = { productInfo_9: 'X', productInfo_12: 'HT250' };
  const out = normalizeMachineModelDisplay_(obj, machineMap);
  assert.notEqual(out, obj);
  assert.equal(obj.productInfo_12, 'HT250');
  assert.equal(out.productInfo_9, 'X');
});
