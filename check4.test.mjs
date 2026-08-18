// Check 4 组长代提 — Node 内置 test runner 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test check4.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

// ===== GAS 全局 stub（仅测试用） =====
const TASK_SS_ID = "1UBg1Ake18cFp6gj0jKRX1Y9GJ0VL1pY5aXK-UoCeAY0";
const IM_SCHEDULING_SS_ID = "1dyS5C7r4pqYIeRT0p1zYzngt0EDCYR4hsswurAsEBYg";
const USER_PERMISSION_SS_ID = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";

const fakeSS = {};
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
      getValue: () => (rows[r - 1] || [])[c - 1] ?? '',
      setValue: () => {},
    }),
    getDataRange: () => ({ getValues: () => rows }),
  };
}
globalThis.SpreadsheetApp = {
  openById: (id) => ({ getSheetByName: (n) => fakeSS[id]?.[n] ?? null }),
};
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => (fmt === 'yyyy-MM-dd' ? '2026-08-18' : '12:00:00'),
};
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };

// ===== 1. filterRosterByProcessWorkshop =====
test('filterRosterByProcessWorkshop 按车间过滤，工序 INJ/IM 视为等价', () => {
  const roster = [
    { name: '张三', sapID: '90001', process: 'IM', workshop: 'TB1', attendanceStatus: '在岗' },
    { name: '李四', sapID: '90002', process: 'INJ', workshop: 'TB1', attendanceStatus: '在岗' },
    { name: '王五', sapID: '90003', process: 'IM', workshop: 'TB2', attendanceStatus: '在岗' },
    { name: '赵六', sapID: '90004', process: 'TF', workshop: 'TB1', attendanceStatus: '在岗' },
  ];
  const result = globalThis.filterRosterByProcessWorkshop(roster, 'IM', 'TB1');
  assert.deepEqual(result.map(r => r.name), ['张三', '李四']);
  const resultInj = globalThis.filterRosterByProcessWorkshop(roster, 'INJ', 'TB1');
  assert.deepEqual(resultInj.map(r => r.name), ['张三', '李四']);
});

test('filterRosterByProcessWorkshop 只保留在岗或状态为空的人', () => {
  const roster = [
    { name: '张三', sapID: '90001', process: 'IM', workshop: 'TB1', attendanceStatus: '在岗' },
    { name: '李四', sapID: '90002', process: 'IM', workshop: 'TB1', attendanceStatus: '' },
    { name: '王五', sapID: '90003', process: 'IM', workshop: 'TB1', attendanceStatus: '请假' },
  ];
  const result = globalThis.filterRosterByProcessWorkshop(roster, 'IM', 'TB1');
  assert.deepEqual(result.map(r => r.name), ['张三', '李四']);
});

test('filterRosterByProcessWorkshop 无工序字段的数据（IM排班源）仅注塑可见，空工序请求不过滤', () => {
  const roster = [
    { name: '张三', sapID: '90001', workshop: 'TB1', attendanceStatus: '在岗' },
  ];
  // 请求注塑 → 保留
  assert.equal(globalThis.filterRosterByProcessWorkshop(roster, 'IM', 'TB1').length, 1);
  // 请求植磨毛 → 不保留（排班数据是注塑的）
  assert.equal(globalThis.filterRosterByProcessWorkshop(roster, 'TF', 'TB1').length, 0);
  // 请求工序为空 → 只按车间过滤
  assert.equal(globalThis.filterRosterByProcessWorkshop(roster, '', 'TB1').length, 1);
});

// ===== 2. buildSafety4SubmitRow =====
test('buildSafety4SubmitRow 构建10列行，J列为去重后的组员名单', () => {
  const checkData = {
    process: 'IM', workshop: 'TB1',
    checks: [
      { status: '正常', details: '' }, { status: '正常', details: '' },
      { status: '正常', details: '' }, { status: '异常', details: '工具缺失' },
    ],
    submitter: '陈组长',
    askedMembers: ['张三', ' 李四 ', '张三'],
  };
  const built = globalThis.buildSafety4SubmitRow(checkData, '2026-08-18', '08:30:00');
  assert.equal(built.ok, true);
  assert.equal(built.row.length, 10);
  assert.equal(built.row[0], 'IM');
  assert.equal(built.row[6], '陈组长');
  assert.equal(built.row[7], '2026-08-18');
  assert.equal(built.row[8], '08:30:00');
  assert.equal(built.row[9], '张三、李四');
  assert.ok(built.row[4].includes('【具体细节 / Specific Details】'));
});

test('buildSafety4SubmitRow 组员名单为空时返回错误', () => {
  const checkData = {
    process: 'IM', workshop: 'TB1',
    checks: [
      { status: '正常', details: '' }, { status: '正常', details: '' },
      { status: '正常', details: '' }, { status: '正常', details: '' },
    ],
    submitter: '陈组长',
    askedMembers: [],
  };
  const built = globalThis.buildSafety4SubmitRow(checkData, '2026-08-18', '08:30:00');
  assert.equal(built.ok, false);
  assert.ok(built.message.includes('组员'));
});

test('buildSafety4SubmitRow 全是空白名单视为空', () => {
  const checkData = {
    process: 'IM', workshop: 'TB1',
    checks: [
      { status: '正常', details: '' }, { status: '正常', details: '' },
      { status: '正常', details: '' }, { status: '正常', details: '' },
    ],
    submitter: '陈组长',
    askedMembers: ['   ', ''],
  };
  const built = globalThis.buildSafety4SubmitRow(checkData, '2026-08-18', '08:30:00');
  assert.equal(built.ok, false);
});

// ===== 3. getTodayRoster =====
function attendanceRows() {
  // 列：0日期 1sapID 2姓名 3工序 4team 5车间 6班次 7工时 8出勤状态 9-10杂项
  return [
    ['表头行，不会被读取'],
    ['2026-08-18', '90001', '张三', 'IM', 'A', 'TB1', '早班', 8, '在岗', '', ''],
    ['2026-08-18', '90002', '李四', 'IM', 'B', 'TB1', '早班', 8, '请假', '', ''],
    ['2026-08-18', '90003', '王五', 'IM', '', 'TB2', '早班', 8, '', '', ''],
    ['2026-08-18', '90004', '赵六', 'TF', '', 'TB1', '早班', 8, '在岗', '', ''],
    ['2026-08-18', '90005', '孙七', 'INJ', '', 'TB1', '早班', 8, '在岗', '', ''],
  ];
}

test('getTodayRoster 走 AttendanceSync 数据源并按工序车间过滤', () => {
  fakeSS[TASK_SS_ID] = { AttendanceSync: fakeSheet(attendanceRows()) };
  const result = globalThis.getTodayRoster('IM', 'TB1');
  assert.equal(result.success, true);
  assert.equal(result.source, 'AttendanceSync');
  assert.deepEqual(result.data.map(r => r.name), ['张三', '孙七']);
});

test('getTodayRoster AttendanceSync 无数据时降级到 IM 排班', () => {
  fakeSS[TASK_SS_ID] = { AttendanceSync: fakeSheet([['表头行']]) };
  fakeSS[IM_SCHEDULING_SS_ID] = {
    MasterData: fakeSheet([
      ['表头行'],
      ['2026.08.18_2早', 'TB1', '', '张三', '8'],
      ['2026.08.18_1夜', 'TB2', '', '李四', '10'],
    ]),
  };
  fakeSS[USER_PERMISSION_SS_ID] = {
    userID: fakeSheet([
      ['表头'], ['表头2'],
      ['90001', '张三'], ['90002', '李四'],
    ]),
  };
  const result = globalThis.getTodayRoster('IM', 'TB1');
  assert.equal(result.success, true);
  assert.equal(result.source, 'IM');
  assert.deepEqual(result.data.map(r => r.name), ['张三']);
  assert.equal(result.data[0].sapID, '90001');
});
