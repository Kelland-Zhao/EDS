// 未达标故障手动导入 — Node 内置 test runner 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test failure-import.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

// 构造 Shift_Records 行（列索引：3=问题描述 7=维修时间 11=提交日期 19=是否需要填写故障报告）
function makeRow(overrides = {}) {
  const row = new Array(24).fill('');
  row[3] = overrides.problemDescription ?? '合模无动作';
  row[7] = overrides.repairTime ?? '30';
  row[11] = overrides.submitDate ?? '2026-06-01';
  row[19] = overrides.needFailureReport ?? '否';
  return row;
}

// ===== 1. parseRepairTimeMinutes =====
test('parseRepairTimeMinutes 纯分钟数', () => {
  assert.equal(globalThis.parseRepairTimeMinutes('120'), 120);
});

test('parseRepairTimeMinutes 小时+分钟格式', () => {
  assert.equal(globalThis.parseRepairTimeMinutes('2小时30分'), 150);
  assert.equal(globalThis.parseRepairTimeMinutes('1小时'), 60);
});

test('parseRepairTimeMinutes 无法解析时返回0', () => {
  assert.equal(globalThis.parseRepairTimeMinutes(''), 0);
  assert.equal(globalThis.parseRepairTimeMinutes('abc'), 0);
});

// ===== 2. classifyFaultRowForReport =====
test('classifyFaultRowForReport 达标行纳入且不标记未达标', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '240' }), 'IM');
  assert.deepEqual(r, { include: true, belowThreshold: false });
});

test('classifyFaultRowForReport 未达标且自动判否的行可导入', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '120', needFailureReport: '否' }), 'IM');
  assert.deepEqual(r, { include: true, belowThreshold: true });
});

test('classifyFaultRowForReport 未达标但T列为空的行可导入（历史遗留）', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '120', needFailureReport: '' }), 'IM');
  assert.deepEqual(r, { include: true, belowThreshold: true });
});

test('classifyFaultRowForReport 未达标且已导入(T=是)的行不重复出现', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '120', needFailureReport: '是' }), 'IM');
  assert.equal(r.include, false);
});

test('classifyFaultRowForReport 未达标且已人工确认不需要(T=否（已确认）)的行不出现', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '120', needFailureReport: '否（已确认）' }), 'IM');
  assert.equal(r.include, false);
});

test('classifyFaultRowForReport 维修时间无法解析的行不纳入', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: 'abc' }), 'IM');
  assert.equal(r.include, false);
});

test('classifyFaultRowForReport PK达标但提交日期早于2026-05-15的行排除（保持现状）', () => {
  const r = globalThis.classifyFaultRowForReport(
    makeRow({ repairTime: '100', submitDate: '2026-05-01', needFailureReport: '' }),
    'PK'
  );
  assert.equal(r.include, false);
});

test('classifyFaultRowForReport PK达标但含转规格的行排除（保持现状）', () => {
  const r = globalThis.classifyFaultRowForReport(
    makeRow({ repairTime: '100', problemDescription: '转规格', needFailureReport: '' }),
    'PK'
  );
  assert.equal(r.include, false);
});

test('classifyFaultRowForReport PK达标正常行纳入', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '100', needFailureReport: '' }), 'PK');
  assert.deepEqual(r, { include: true, belowThreshold: false });
});

test('classifyFaultRowForReport TF未达标行可导入', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({ repairTime: '90', needFailureReport: '否' }), 'TF');
  assert.deepEqual(r, { include: true, belowThreshold: true });
});

test('classifyFaultRowForReport 未知工序不纳入', () => {
  const r = globalThis.classifyFaultRowForReport(makeRow({}), 'XX');
  assert.equal(r.include, false);
});

// ===== 3. getNeedReportDisplayValue =====
test('getNeedReportDisplayValue 未达标且T列为空归一化为否（历史遗留行不混入默认列表）', () => {
  assert.equal(globalThis.getNeedReportDisplayValue('', true), '否');
});

test('getNeedReportDisplayValue 达标且T列为空保持空（正常待判定）', () => {
  assert.equal(globalThis.getNeedReportDisplayValue('', false), '');
});

test('getNeedReportDisplayValue 已有判定值原样保留', () => {
  assert.equal(globalThis.getNeedReportDisplayValue('是', true), '是');
  assert.equal(globalThis.getNeedReportDisplayValue('否（已确认）', true), '否（已确认）');
  assert.equal(globalThis.getNeedReportDisplayValue('否', true), '否');
});

// ===== 4. getNeedReportCellValue =====
test('getNeedReportCellValue 需要报告写是', () => {
  assert.equal(globalThis.getNeedReportCellValue(true, false), '是');
  assert.equal(globalThis.getNeedReportCellValue(true, true), '是');
});

test('getNeedReportCellValue 达标行不需要报告写否（保持现状）', () => {
  assert.equal(globalThis.getNeedReportCellValue(false, false), '否');
});

test('getNeedReportCellValue 未达标行不需要报告写否（已确认）', () => {
  assert.equal(globalThis.getNeedReportCellValue(false, true), '否（已确认）');
});
