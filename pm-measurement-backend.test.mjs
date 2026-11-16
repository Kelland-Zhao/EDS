// PM 测量记录 — 后端纯函数与保存校验测试
// 运行：node --test pm-measurement-backend.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

for (const fn of ['pmTaskDoneState_', 'pmTaskEndErrors_', 'pmPhotoSuccess_', 'pmIsPdMYes_']) {
  if (typeof globalThis[fn] !== 'function') {
    globalThis[fn] = function () { throw new Error(`${fn} not found in Code.js`); };
  }
}

test('旧工单 PdM 任务数值为空时结束校验报错', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' },
  ]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'Value');
});

test('旧工单没有 Measurement Points 时不做数字校验', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '125' },
  ]);
  assert.deepEqual(errors, []);
});

test('Photo Required=Y 且无成功照片时报错', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', taskStatus: true, 'Photo Required': 'Y', photos: [] },
  ]);
  assert.equal(errors[0].field, 'Photo');
});

test('未完成任务不要求数值或照片', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: false, 'Photo Required': 'Y' },
  ]);
  assert.deepEqual(errors, []);
});

test('taskStatus 与 Task Status 冲突时标记 conflict', () => {
  assert.deepEqual(pmTaskDoneState_({ taskStatus: true, 'Task Status': false }), { done: true, conflict: true });
  assert.deepEqual(pmTaskDoneState_({ 'Task Status': true }), { done: true, conflict: false });
});

let ws;
function setupFakePmSheet() {
  const rows = [
    ['PM No.', 'PmStatus', 'Notification', 'PM People', 'Plan PM Date', 'SatrtDate', 'StartTime', 'EndDate', 'EndTime', 'Workcenter', '任务明细', 'TaskCount', 'UncheckedTasks', 'UncheckedCount', 'NonEmptyNotesTasks', 'NonEmptyNotesCount'],
    ['PM-001', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const writes = [];
  ws = {
    values: rows,
    writes: writes,
    getName: function () { return 'PM_Records'; },
    getLastRow: function () { return rows.length; },
    getLastColumn: function () { return rows[0].length; },
    getRange: function (a, b, c, d) {
      return {
        getValues: function () { return rows.slice(a - 1, a - 1 + c).map(function (row) { return row.slice(b - 1, b - 1 + d); }); },
        getValue: function () { return (rows[a - 1] || [])[b - 1] || ''; },
        setValue: function (v) {
          writes.push([a, b, v]);
          if (!rows[a - 1]) rows[a - 1] = [];
          rows[a - 1][b - 1] = v;
        },
        setValues: function (matrix) {
          matrix.forEach(function (rowVals, i) {
            const r = a - 1 + i;
            if (!rows[r]) rows[r] = [];
            rowVals.forEach(function (v, j) { rows[r][b - 1 + j] = v; });
          });
        },
      };
    },
    appendRow: function (v) { rows.push(v.slice()); },
  };
  globalThis.SpreadsheetApp = {
    openById: function () {
      return { getSheetByName: function (name) { return name === 'PM_Records' ? ws : null; } };
    },
  };
}

test('End 有缺失测量时后端拒绝写入', () => {
  setupFakePmSheet();
  const res = saveData_tasklist({
    'PM No.': 'PM-001', 'SheetName': 'IM-TB1', Status: 'End',
    '任务明细': JSON.stringify([{ 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' }]),
    EndDate: '2026-11-16', EndTime: '10:00',
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, 'MEASUREMENT_VALIDATION');
  assert.deepEqual(ws.writes, []);
});
