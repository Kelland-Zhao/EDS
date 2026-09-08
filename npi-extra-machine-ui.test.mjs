// NPI 机台自增表单 — 前端纯函数测试（从 NPI_TaskModal-js.html 提取，不依赖 jQuery / GAS 全局）
// 运行：node --test npi-extra-machine-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_TaskModal-js.html 中提取函数定义，单独 eval
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

function tryExtract(src, name) {
  try { return extractFunction(src, name); } catch (e) { return null; }
}

const html = fs.readFileSync(new URL('./NPI_TaskModal-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(html, 'machineMissingFromList_'));
(0, eval)(extractFunction(html, 'distinctMachineModels_'));
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'machineModelOptions_')
  || 'function machineModelOptions_(){ throw new Error("machineModelOptions_ not found in NPI_TaskModal-js.html"); }');

// 机台清单项结构（与 loadNPIWorkcenterList 返回一致）：{id, text, model=Workcenter D列原始机型, displayModel=工艺卡机型/中间层}
const LIST = [
  { id: 'S1HS0001', text: 'S1HS0001', model: 'HS', displayModel: 'HIM' },
  { id: 'S1DP0001', text: 'S1DP0001', model: 'DP', displayModel: 'DP-MID' },
  { id: 'S9ZZ0001', text: 'S9ZZ0001', model: 'HS', displayModel: 'HIM' },
  { id: 'E0EN0001', text: 'E0EN0001', model: 'ENG', displayModel: '' }, // 无中间层 → 回退原始机型
  { id: 'E0EN0002', text: 'E0EN0002', model: '', displayModel: '' },    // 全空 → 跳过
];

test('machineMissingFromList_: 空机台号 → 不缺失', () => {
  assert.equal(machineMissingFromList_('', LIST), false);
  assert.equal(machineMissingFromList_(null, LIST), false);
});

test('machineMissingFromList_: 清单含该机台 → 不缺失', () => {
  assert.equal(machineMissingFromList_('S1HS0001', LIST), false);
  assert.equal(machineMissingFromList_('S9ZZ0001', LIST), false);
});

test('machineMissingFromList_: 清单不含 → 缺失', () => {
  assert.equal(machineMissingFromList_('S5XX0001', LIST), true);
});

test('machineMissingFromList_: 空清单 → 非空机台号缺失', () => {
  assert.equal(machineMissingFromList_('S5XX0001', []), true);
});

test('distinctMachineModels_: 取工艺卡机型（中间层），去重、排序、跳过空值，无中间层回退原始机型', () => {
  assert.deepEqual(distinctMachineModels_(LIST), ['DP-MID', 'ENG', 'HIM']);
});

test('distinctMachineModels_: 空清单 → 空数组', () => {
  assert.deepEqual(distinctMachineModels_([]), []);
});

test('distinctMachineModels_: 不修改原清单', () => {
  const before = JSON.stringify(LIST);
  distinctMachineModels_(LIST);
  assert.equal(JSON.stringify(LIST), before);
});

// ===== machineModelOptions_（机型下拉数据源） =====

test('machineModelOptions_: 有 MachineMap 中间层清单 → 原样使用，不再回退原始机型', () => {
  assert.deepEqual(machineModelOptions_(['3AX', '6AX', 'HIM'], LIST), ['3AX', '6AX', 'HIM']);
});

test('machineModelOptions_: 中间层清单空/缺失 → 回退 distinctMachineModels_', () => {
  assert.deepEqual(machineModelOptions_([], LIST), ['DP-MID', 'ENG', 'HIM']);
  assert.deepEqual(machineModelOptions_(null, LIST), ['DP-MID', 'ENG', 'HIM']);
  assert.deepEqual(machineModelOptions_(undefined, []), []);
});

test('machineModelOptions_: 不修改入参清单', () => {
  const models = ['3AX', 'HIM'];
  const before = JSON.stringify(models);
  machineModelOptions_(models, LIST);
  assert.equal(JSON.stringify(models), before);
});
