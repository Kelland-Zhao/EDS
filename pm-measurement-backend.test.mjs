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

test('0 是有效数值，正常/284abc 不是', () => {
  assert.equal(pmNumericValue_('0'), 0);
  assert.equal(pmNumericValue_('正常'), null);
  assert.equal(pmNumericValue_('284abc'), null);
});

test('任一点超限即不合格', () => {
  const task = {
    'Measurement Points': 'S1,S2',
    'Measurement Unit': 'kN',
    Logic: 'Out_of_range',
    'LL Limited': '100',
    'HH Limited': '130',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 145 }],
  };
  assert.equal(pmInspectionResult_(task), '不合格');
});

test('με 模式合计取平均', () => {
  assert.equal(pmAggregate_([100, 120], 'με'), 110);
  assert.equal(pmAggregate_([100, 120], 'kN'), 220);
});

test('新配置缺 S3 时后端报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }, { point: 'S4', value: 127 }],
  }]);
  assert.ok(errors.some((e) => e.field === 'S3'));
});

test('超限且 note 为空时报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1',
    'Point Labels': 'S1=操作侧',
    'Measurement Unit': 'kN',
    Logic: 'Out_of_range', 'LL Limited': '100', 'HH Limited': '130',
    measurements: [{ point: 'S1', value: 145 }],
    note: '',
  }]);
  assert.ok(errors.some((e) => e.field === 'Note'));
});

test('结果计算写入 Total 与 inspectionResult', () => {
  const tasks = [{
    'Measurement Points': 'S1,S2', 'Measurement Unit': 'με',
    measurements: [{ point: 'S1', value: 100 }, { point: 'S2', value: 120 }],
    Logic: 'HighAlarm_Max', 'LL Limited': '', 'HH Limited': '200',
  }];
  pmPrepareMeasurementResults_(tasks);
  assert.equal(tasks[0].measurementTotal, 110);
  assert.equal(tasks[0].inspectionResult, '合格');
});

test('测量单位与配置不一致时报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1', 'Point Labels': 'S1=操作侧', 'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125, unit: '吨力' }],
  }]);
  assert.ok(errors.some((e) => e.field === 'Measurement Unit'));
});

// ===== Final review 修复项 =====

test('空字符串 Task Status 不构成状态冲突', () => {
  assert.deepEqual(pmTaskDoneState_({ taskStatus: true, 'Task Status': '' }), { done: true, conflict: false });
  assert.deepEqual(pmTaskDoneState_({ taskStatus: true, 'Task Status': false }), { done: true, conflict: true });
});

test('HighAlarm 缺 HH 或 LowAlarm 缺 LL 时待判定', () => {
  assert.equal(pmPointOutOfLimit_('HighAlarm_Max', 125, 100, ''), null);
  assert.equal(pmPointOutOfLimit_('LowAlarm_Max', 145, '', 130), null);
  assert.equal(pmPointOutOfLimit_('', 145, '', 130), null);
  assert.equal(pmPointOutOfLimit_('HighAlarm_Max', 145, '', 130), true);
  assert.equal(pmPointOutOfLimit_('HighAlarm_Max', 125, '', 130), false);
});

test('PdM=否 的有配置任务不要求测量', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'T-1', 'PdM?': '否/ No', taskStatus: true,
    'Measurement Points': 'S1', 'Point Labels': 'S1=操作侧', 'Measurement Unit': 'kN',
    measurements: [],
  }]);
  assert.deepEqual(errors, []);
});

test('End 任务明细 JSON 损坏时拒绝写入', () => {
  setupFakePmSheet();
  const res = saveData_tasklist({
    'PM No.': 'PM-001', 'SheetName': 'IM-TB1', Status: 'End',
    '任务明细': '{not-json', EndDate: '2026-11-16', EndTime: '10:00',
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, 'MEASUREMENT_VALIDATION');
  assert.deepEqual(ws.writes, []);
});

test('End 任务明细为空数组时拒绝写入', () => {
  setupFakePmSheet();
  const res = saveData_tasklist({
    'PM No.': 'PM-001', 'SheetName': 'IM-TB1', Status: 'End',
    '任务明细': '[]', EndDate: '2026-11-16', EndTime: '10:00',
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, 'MEASUREMENT_VALIDATION');
  assert.deepEqual(ws.writes, []);
});

test('测点解析兼容中文逗号', () => {
  assert.deepEqual(pmParsePoints_('S1，S2,S3').map((p) => p.code), ['S1', 'S2', 'S3']);
});
