// INJ SDM 待办事项预计完成日期 — Node 内置 test runner 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test inj-sdm-todo-date.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

// ===== GAS 全局 stub（仅测试用） =====
// 与 Code.js 顶层常量保持一致
const USER_PERMISSION_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';
const INJ_SDM_SS_ID = '1mOG7PAJX7AdPioJJdSJAmgxjOt2S2NGTIV6SVLtkrH8';

const fakeSS = {};
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getRange: (r, c, nr, nc) => {
      const getValues = () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc));
      const setValues = (vals) => {
        for (let i = 0; i < vals.length; i++) {
          if (!rows[r - 1 + i]) rows[r - 1 + i] = [];
          for (let j = 0; j < vals[i].length; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j];
        }
      };
      return {
        getValues,
        setValues,
        getValue: () => (rows[r - 1] || [])[c - 1] ?? '',
        setValue: (v) => { if (!rows[r - 1]) rows[r - 1] = []; rows[r - 1][c - 1] = v; },
      };
    },
    getDataRange: () => ({ getValues: () => rows }),
  };
}
globalThis.SpreadsheetApp = {
  openById: (id) => ({ getSheetByName: (n) => fakeSS[id]?.[n] ?? null }),
};
const pad = n => String(n).padStart(2, '0');
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => {
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return fmt.startsWith('yyyy-MM-dd HH') ? ymd + ' 10:00:00' : ymd;
  },
  getUuid: () => 'uuid-test-1234',
};
globalThis.Session = {
  getScriptTimeZone: () => 'Asia/Hong_Kong',
  getActiveUser: () => ({ getEmail: () => 'test@colpal.com' }),
};
globalThis.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };

// ===== 数据构造 helpers =====
// 权限表：loop 从 i=2 开始；[1]=姓名 [9]=邮箱 [14]=工序 [59](BH)=管理员
function permissionRows() {
  const admin = [];
  admin[1] = '测试员';
  admin[9] = 'test@colpal.com';
  admin[14] = 'INJ';
  admin[59] = '管理员';
  return [['表头'], [], admin];
}
// MasterData 行（16 列）：[0]reportId [1]reportDate [2]dataStart [3]dataEnd [4]itemId
// [5]category [6]workshop [7]machineNo [8]description [9]ownerNames [10]ownersJSON
// [11]createdAt [12]updatedAt [13]status [14]editHistory [15]expectedCompletionDate
function sdmRow({ reportId, reportDate, itemId, category, description, owners, status, expected }) {
  const row = [];
  row[0] = reportId; row[1] = reportDate; row[2] = reportDate; row[3] = reportDate;
  row[4] = itemId; row[5] = category; row[6] = ''; row[7] = '';
  row[8] = description || '';
  row[9] = owners.join('、'); row[10] = JSON.stringify(owners);
  row[11] = '2026-09-01 08:00:00'; row[12] = '2026-09-01 08:00:00';
  row[13] = status; row[14] = '[]'; row[15] = expected || '';
  return row;
}
function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== 1. validateINJSDMPayload_ 待办日期校验 =====
test('validateINJSDMPayload_ 校验待办预计完成日期格式', () => {
  const base = { reportDate: '2026-09-07', dataStartDate: '2026-09-06', dataEndDate: '2026-09-06', major: [], outstanding: [], communication: [], todo: [], historyUpdates: [] };
  // 有效日期通过
  assert.doesNotThrow(() => globalThis.validateINJSDMPayload_({ ...base, todo: [{ description: '写报告', expectedCompletionDate: '2026-09-10' }] }));
  // 日期可选（缺省通过）
  assert.doesNotThrow(() => globalThis.validateINJSDMPayload_({ ...base, todo: [{ description: '写报告' }] }));
  // 非法格式抛错
  assert.throws(() => globalThis.validateINJSDMPayload_({ ...base, todo: [{ description: '写报告', expectedCompletionDate: '2026/09/10' }] }), /Expected completion date is invalid/);
});

// ===== 2. buildHistoryUpdateValues_ 仅更新提供字段 =====
test('buildHistoryUpdateValues_ 仅日期更新不冲空描述与责任人', () => {
  const row = sdmRow({ reportId: 'RPT-H', reportDate: '2026-09-05', itemId: 'ITM-H1', category: 'TODO', description: '原描述', owners: ['测试员'], status: 'ACTIVE', expected: '2026-09-06' });
  const out = globalThis.buildHistoryUpdateValues_({ itemId: 'ITM-H1', expectedCompletionDate: '2026-09-15' }, row);
  assert.equal(out.description, '原描述');
  assert.equal(out.ownerNames, '测试员');
  assert.equal(out.ownersJSON, JSON.stringify(['测试员']));
  assert.equal(out.newDate, '2026-09-15');
});

test('buildHistoryUpdateValues_ 全字段更新', () => {
  const row = sdmRow({ reportId: 'RPT-H', reportDate: '2026-09-05', itemId: 'ITM-H1', category: 'TODO', description: '原描述', owners: ['测试员'], status: 'ACTIVE', expected: '2026-09-06' });
  const out = globalThis.buildHistoryUpdateValues_({ itemId: 'ITM-H1', description: '新描述', owners: ['张三'], expectedCompletionDate: '2026-09-20' }, row);
  assert.equal(out.description, '新描述');
  assert.equal(out.ownerNames, '张三');
  assert.equal(out.ownersJSON, JSON.stringify(['张三']));
  assert.equal(out.newDate, '2026-09-20');
});

// ===== 3. getINJSDMInitData 待办与历史待办带出日期 =====
test('getINJSDMInitData 待办与历史待办带出预计完成日期', () => {
  fakeSS[USER_PERMISSION_SS_ID] = { 'userID': fakeSheet(permissionRows()) };
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = dateStr(today);
  const yesterdayStr = dateStr(yesterday);
  fakeSS[INJ_SDM_SS_ID] = {
    'MasterData': fakeSheet([
      ['表头'], ['表头2'], // 数据从第 3 行开始
      sdmRow({ reportId: 'RPT-T', reportDate: todayStr, itemId: 'ITM-T1', category: 'TODO', description: '今日待办', owners: ['测试员'], status: 'ACTIVE', expected: '2026-09-10' }),
      sdmRow({ reportId: 'RPT-H', reportDate: yesterdayStr, itemId: 'ITM-H1', category: 'TODO', description: '历史待办', owners: ['测试员'], status: 'ACTIVE', expected: '2026-09-05' }),
    ]),
  };
  const result = JSON.parse(globalThis.getINJSDMInitData('测试员', 'test@colpal.com', todayStr, false));
  assert.ok(result.success, result.message);
  assert.ok(result.hasPermission, '应具有权限');
  assert.equal(result.todayReport.todo[0].expectedCompletionDate, '2026-09-10');
  assert.equal(result.historyTodoItems[0].expectedCompletionDate, '2026-09-05');
});

// ===== 4. saveINJSDMReport 历史待办仅更新日期 =====
test('saveINJSDMReport 历史待办仅更新日期不冲空描述', () => {
  fakeSS[USER_PERMISSION_SS_ID] = { 'userID': fakeSheet(permissionRows()) };
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = dateStr(today);
  const yesterdayStr = dateStr(yesterday);
  const master = fakeSheet([
    ['表头'], ['表头2'],
    sdmRow({ reportId: 'RPT-H', reportDate: yesterdayStr, itemId: 'ITM-H1', category: 'TODO', description: '原描述', owners: ['测试员'], status: 'ACTIVE', expected: '2026-09-05' }),
  ]);
  fakeSS[INJ_SDM_SS_ID] = { 'MasterData': master };

  const payload = {
    reportId: '', reportDate: todayStr, dataStartDate: yesterdayStr, dataEndDate: yesterdayStr,
    major: [{ workshop: 'TB1', machineNo: 'H1T1', description: '大故障A' }],
    outstanding: [], communication: [], todo: [],
    historyUpdates: [{ itemId: 'ITM-H1', expectedCompletionDate: '2026-09-15' }],
  };
  const result = JSON.parse(globalThis.saveINJSDMReport(payload, '测试员', 'test@colpal.com'));
  assert.ok(result.success, result.message);
  const updatedRow = master.getDataRange().getValues()[2];
  assert.equal(updatedRow[8], '原描述');
  assert.equal(updatedRow[9], '测试员');
  assert.equal(updatedRow[10], JSON.stringify(['测试员']));
  assert.equal(updatedRow[15], '2026-09-15');
});
