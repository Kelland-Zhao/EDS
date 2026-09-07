// 测试计划任务最新工艺卡信息映射 — buildLatestCardInfoMap_ 后端纯函数测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test npi-latest-card.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 Code.js 中提取 buildLatestCardInfoMap_ 函数定义，单独 eval（不依赖 GAS 全局）
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
(0, eval)(extractFunction(code, 'buildLatestCardInfoMap_'));

// NPI_ProcessRecords 列序：[0]recordID [1]testTaskID [2]status [3]isLatest [8]cardNumber
const header = ['recordID', 'testTaskID', 'status', 'isLatest', 'fields', 'createdAt', 'updatedAt', 'createdBy', 'cardNumber', 'templateRef'];
const row = (tid, isLatest, card, status = '草稿') => ['PR-1', tid, status, isLatest, '', '', '', '', card, ''];

test('无数据行（仅表头）返回空映射', () => {
  assert.deepEqual(buildLatestCardInfoMap_([header]), {});
});

test('testTaskID 空行跳过', () => {
  const data = [header, row('', true, 'TEST-Parameter-IM-0001-00')];
  assert.deepEqual(buildLatestCardInfoMap_(data), {});
});

test('单记录 isLatest 取到卡号与状态（布尔 true 与字符串 TRUE 均可）', () => {
  assert.deepEqual(buildLatestCardInfoMap_([header, row('T1', true, 'TEST-Parameter-IM-0001-00')])['T1'],
    { cardNumber: 'TEST-Parameter-IM-0001-00', status: '草稿' });
  assert.deepEqual(buildLatestCardInfoMap_([header, row('T1', 'TRUE', 'TEST-Parameter-IM-0001-00', '已提交')])['T1'],
    { cardNumber: 'TEST-Parameter-IM-0001-00', status: '已提交' });
});

test('多条记录只取 isLatest=TRUE 的卡号与状态，旧记录 FALSE 被忽略', () => {
  const data = [
    header,
    row('T1', false, 'TEST-Parameter-IM-0001-00'),
    row('T1', true, 'TEST-Parameter-IM-0002-01', '已提交'),
    row('T2', true, 'TEST-Parameter-IM-0003-00', '已转正'),
  ];
  assert.deepEqual(buildLatestCardInfoMap_(data), {
    T1: { cardNumber: 'TEST-Parameter-IM-0002-01', status: '已提交' },
    T2: { cardNumber: 'TEST-Parameter-IM-0003-00', status: '已转正' },
  });
});

test('同一任务多条 TRUE 时最后一条胜出（卡号与状态同取该行）', () => {
  const data = [header, row('T1', true, 'TEST-Parameter-IM-0001-00'), row('T1', true, 'TEST-Parameter-IM-0002-00', '已提交')];
  assert.deepEqual(buildLatestCardInfoMap_(data)['T1'], { cardNumber: 'TEST-Parameter-IM-0002-00', status: '已提交' });
});

test('无 TRUE 行时防御性取该任务最后一行', () => {
  const data = [header, row('T1', false, 'TEST-Parameter-IM-0001-00'), row('T1', false, 'TEST-Parameter-IM-0002-00', '已提交')];
  assert.deepEqual(buildLatestCardInfoMap_(data)['T1'], { cardNumber: 'TEST-Parameter-IM-0002-00', status: '已提交' });
});

test('TRUE 行卡号空白时卡号为空字符串、状态仍取该行（不回退）', () => {
  const data = [header, row('T1', false, 'TEST-Parameter-IM-0001-00'), row('T1', true, '', '已提交')];
  assert.deepEqual(buildLatestCardInfoMap_(data)['T1'], { cardNumber: '', status: '已提交' });
});

test('不修改入参数组', () => {
  const data = [header, row('T1', true, 'TEST-Parameter-IM-0001-00')];
  buildLatestCardInfoMap_(data);
  assert.deepEqual(data, [header, row('T1', true, 'TEST-Parameter-IM-0001-00')]);
});
