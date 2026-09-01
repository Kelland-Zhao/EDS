// 新建任务 负责人/协作人 下拉兜底逻辑 — Node 内置 test runner 测试
// 运行：node --test staff_select_fallback.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

// ===== GAS 全局 stub（仅测试用） =====
const TASK_SS_ID = '1UBg1Ake18cFp6gj0jKRX1Y9GJ0VL1pY5aXK-UoCeAY0';
const USER_PERMISSION_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';
const IM_SCHEDULING_SS_ID = '1dyS5C7r4pqYIeRT0p1zYzngt0EDCYR4hsswurAsEBYg';

const fakeSS = {};
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] || []).length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
      getValue: () => (rows[r - 1] || [])[c - 1] ?? '',
      setValue: () => {},
    }),
    getDataRange: () => ({ getValues: () => rows }),
  };
}
function pad(len, arr) { while (arr.length < len) arr.push(''); return arr; }

// 有状态缓存 stub：记录 put 调用
const cacheLog = [];
globalThis.CacheService = {
  getScriptCache: () => ({
    get: () => null,
    put: (k, v) => { cacheLog.push({ key: k, value: v }); },
  }),
};
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => {
    if (!(d instanceof Date)) return fmt;
    if (fmt === 'yyyyMMdd') return '20260901';
    if (fmt === 'yyyy-MM-dd') return '2026-09-01';
    return fmt;
  },
  formatString: (fmt, ...args) => {
    let i = 0;
    return String(fmt).replace(/%0(\d+)d/g, (_, w) => String(args[i++]).padStart(parseInt(w, 10), '0'));
  },
};
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };
globalThis.SpreadsheetApp = {
  openById: (id) => ({ getSheetByName: (n) => fakeSS[id]?.[n] ?? null }),
};

// AttendanceSync 行：[日期, SAPID, 姓名, 工序, 班别, 车间, 班次, 工时, 出勤状态, 来源, 同步时间]
function attRow(date, sapID, name, status) {
  return [date, sapID, name, 'INJ', 'A', 'TB1', '早班', 7.5, status || '在岗', 'E&E考勤记录', ''];
}
// MasterData 行：[日期班次, 车间, 开机数, 姓名, 安排工时]
function imRow(dateShift, workshop, name) {
  return [dateShift, workshop, 50, name, 7.5];
}

function resetFakes() {
  Object.keys(fakeSS).forEach(k => { delete fakeSS[k]; });
  cacheLog.length = 0;
}

function selectUsers(dateStr) {
  return JSON.parse(globalThis.loadTodayStaffForSelect(dateStr));
}

// ===== 1. 当天无数据 → 兜底 AttendanceSync 最新可用日期 =====
test('当天两数据源均无数据时，兜底返回 AttendanceSync 最新日期人员', () => {
  resetFakes();
  fakeSS[TASK_SS_ID] = {
    'AttendanceSync': fakeSheet([
      pad(11, ['日期']),
      // 旧版无日期行（应被跳过）
      ['', '67920', '潘金桂', 'INJ', 'D', 'ALL', '早班', 0, '休息', '', ''],
      attRow('2026-08-30', '90005', '王五', '在岗'),
      attRow('2026-08-31', '90001', '张三', '在岗'),
      attRow('2026-08-31', '90002', '李四', '在岗'),
    ]),
  };
  fakeSS[IM_SCHEDULING_SS_ID] = {
    'MasterData': fakeSheet([
      pad(5, ['日期班次']),
      imRow('2026.08.31_2早', 'TB1', '毛建'),
    ]),
  };
  fakeSS[USER_PERMISSION_SS_ID] = {
    'userID': fakeSheet([pad(64, ['工号']), pad(64, ['']), pad(64, ['90001', '张三'])]),
  };
  const users = selectUsers('2026-09-01');
  assert.deepEqual(users.map(u => u.id).sort(), ['张三|90001', '李四|90002'].sort());
  assert.ok(users.every(u => u.text.includes('TB1')), '带车间后缀');
});

// ===== 2. 兜底日期不晚于请求日（未来日期数据不可用） =====
test('兜底只取不晚于请求日的最新日期，未来数据被排除', () => {
  resetFakes();
  fakeSS[TASK_SS_ID] = {
    'AttendanceSync': fakeSheet([
      pad(11, ['日期']),
      attRow('2026-08-31', '90001', '张三', '在岗'),
      attRow('2026-09-02', '90002', '李四', '在岗'), // 未来日期
    ]),
  };
  fakeSS[IM_SCHEDULING_SS_ID] = { 'MasterData': fakeSheet([pad(5, ['日期班次'])]) };
  fakeSS[USER_PERMISSION_SS_ID] = { 'userID': fakeSheet([pad(64, ['工号']), pad(64, [''])]) };
  const users = selectUsers('2026-09-01');
  assert.deepEqual(users.map(u => u.id), ['张三|90001']);
});

// ===== 3. 所有出勤数据源全空 → userID 全量人员 =====
test('出勤数据源全空时，兜底返回 userID 全量人员', () => {
  resetFakes();
  fakeSS[TASK_SS_ID] = { 'AttendanceSync': fakeSheet([pad(11, ['日期'])]) };
  fakeSS[IM_SCHEDULING_SS_ID] = { 'MasterData': fakeSheet([pad(5, ['日期班次'])]) };
  fakeSS[USER_PERMISSION_SS_ID] = {
    'userID': fakeSheet([
      pad(64, ['工号', '姓名']),
      pad(64, ['', '']),
      pad(64, ['90001', '张三']),
      pad(64, ['90002', '李四']),
    ]),
  };
  const users = selectUsers('2026-09-01');
  assert.deepEqual(users.map(u => u.id).sort(), ['李四|90002', '张三|90001'].sort());
});

// ===== 4. 有当天数据时正常返回并写缓存 =====
test('当天有 AttendanceSync 数据时正常返回且写入缓存', () => {
  resetFakes();
  fakeSS[TASK_SS_ID] = {
    'AttendanceSync': fakeSheet([
      pad(11, ['日期']),
      attRow('2026-09-01', '90001', '张三', '在岗'),
    ]),
  };
  fakeSS[IM_SCHEDULING_SS_ID] = { 'MasterData': fakeSheet([pad(5, ['日期班次'])]) };
  fakeSS[USER_PERMISSION_SS_ID] = { 'userID': fakeSheet([pad(64, ['工号']), pad(64, [''])]) };
  const users = selectUsers('2026-09-01');
  assert.deepEqual(users.map(u => u.id), ['张三|90001']);
  assert.equal(cacheLog.length, 1, '有结果时写缓存');
  assert.ok(cacheLog[0].key.includes('StaffSelect'), '缓存键为 StaffSelect 系列');
});

// ===== 5. 完全无人员数据 → 返回空数组且不写缓存 =====
test('完全无人员数据时返回空数组，且空结果不写缓存', () => {
  resetFakes();
  fakeSS[TASK_SS_ID] = { 'AttendanceSync': fakeSheet([pad(11, ['日期'])]) };
  fakeSS[IM_SCHEDULING_SS_ID] = { 'MasterData': fakeSheet([pad(5, ['日期班次'])]) };
  fakeSS[USER_PERMISSION_SS_ID] = { 'userID': fakeSheet([pad(64, ['工号']), pad(64, [''])]) };
  const users = selectUsers('2026-09-01');
  assert.deepEqual(users, []);
  assert.equal(cacheLog.length, 0, '空结果不写缓存，数据出现后立即可用');
});
