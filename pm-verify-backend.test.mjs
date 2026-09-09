// PM任务验证 — 后端 GAS 函数测试（PM_Task_Verify sheet 创建/追加/读取）
// 运行：node --test pm-verify-backend.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis

// ===== GAS 全局 stub（仅测试用）=====
const PM_TASK_VERIFY_SS_ID = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4"; // 与 Code.js 常量一致
const PM_TASK_VERIFY_SHEET_NAME = "PM_Task_Verify";
const PM_TASK_VERIFY_HEADER = ["PM No.", "Workcenter", "Task No", "Task Description", "Resource",
  "Verify Result", "Fail Reason", "Verifier ID", "Verifier Name", "Verify Time"];

const fakeSS = {};
function fakeSheet(rows) {
  const sheet = {
    rows,
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] ? rows[0].length : 0),
    getRange(r, c, nr, nc) {
      return {
        getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
        getValue: () => (rows[r - 1] || [])[c - 1] ?? '',
        setValues(vals) {
          vals.forEach((rowVals, i) => {
            const targetRow = r - 1 + i;
            if (!rows[targetRow]) rows[targetRow] = [];
            rowVals.forEach((v, j) => { rows[targetRow][c - 1 + j] = v; });
          });
        },
        setValue(v) {
          if (!rows[r - 1]) rows[r - 1] = [];
          rows[r - 1][c - 1] = v;
        },
        setFontWeight() { return sheet; },
        setBackground() { return sheet; },
        setFontColor() { return sheet; },
      };
    },
    getDataRange: () => ({ getValues: () => rows }),
    appendRow: (vals) => { rows.push([...vals]); },
  };
  return sheet;
}
globalThis.SpreadsheetApp = {
  openById: (id) => ({
    getSheetByName: (n) => fakeSS[id]?.[n] ?? null,
    insertSheet: (n) => {
      const s = fakeSheet([]);
      (fakeSS[id] = fakeSS[id] || {})[n] = s;
      return s;
    },
  }),
};
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => '2026-09-09 10:00:00', // 确定性时间戳
};
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };

// 未实现时以描述性错误失败，保证「失败」而非「加载报错」变红
for (const fn of ['getPMTaskVerifications', 'savePMTaskVerification']) {
  if (typeof globalThis[fn] !== 'function') {
    globalThis[fn] = function () { throw new Error(`${fn} not found in Code.js`); };
  }
}

beforeEach(() => { delete fakeSS[PM_TASK_VERIFY_SS_ID]; });

const VALID_PASS = {
  'PM No.': 'PM-001', 'Workcenter': 'A12', 'Task No': 'T1',
  'Task Description': '清洁', 'Resource': '操作员',
  'Verify Result': '合格', 'Fail Reason': '',
  'Verifier ID': '90001', 'Verifier Name': '张三',
};

// ===== 1. sheet 创建 =====
test('savePMTaskVerification 首次调用自动创建 PM_Task_Verify sheet 并写入表头', () => {
  savePMTaskVerification(VALID_PASS);
  const ws = fakeSS[PM_TASK_VERIFY_SS_ID]?.[PM_TASK_VERIFY_SHEET_NAME];
  assert.ok(ws, 'PM_Task_Verify sheet 应被创建');
  assert.deepEqual(ws.rows[0], PM_TASK_VERIFY_HEADER);
});

// ===== 2. 保存记录 =====
test('savePMTaskVerification 合格记录追加成功，验证时间为服务器时间', () => {
  const r = JSON.parse(savePMTaskVerification(VALID_PASS));
  assert.ok(Array.isArray(r), '应返回记录数组');
  assert.equal(r.length, 1);
  const rec = r[0];
  assert.equal(rec['PM No.'], 'PM-001');
  assert.equal(rec['Task No'], 'T1');
  assert.equal(rec['Verify Result'], '合格');
  assert.equal(rec['Verifier ID'], '90001');
  assert.equal(rec['Verifier Name'], '张三');
  assert.equal(rec['Verify Time'], '2026-09-09 10:00:00');
  const ws = fakeSS[PM_TASK_VERIFY_SS_ID][PM_TASK_VERIFY_SHEET_NAME];
  assert.equal(ws.rows.length, 2, '表头 + 1 条数据');
  assert.deepEqual(ws.rows[1].slice(0, 9), [
    'PM-001', 'A12', 'T1', '清洁', '操作员', '合格', '', '90001', '张三',
  ]);
});

test('savePMTaskVerification 不合格必填原因，有原因则记录', () => {
  const failPayload = { ...VALID_PASS, 'Verify Result': '不合格', 'Fail Reason': '未清洁干净', 'Verifier ID': '90002', 'Verifier Name': '李四' };
  const r = JSON.parse(savePMTaskVerification(failPayload));
  assert.equal(r[r.length - 1]['Fail Reason'], '未清洁干净');
});

test('savePMTaskVerification 不合格无原因 → 返回错误对象', () => {
  const failPayload = { ...VALID_PASS, 'Verify Result': '不合格', 'Fail Reason': '' };
  const r = JSON.parse(savePMTaskVerification(failPayload));
  assert.equal(r.success, false);
  assert.ok(r.message);
});

test('savePMTaskVerification 非法验证结果 → 返回错误对象', () => {
  const bad = { ...VALID_PASS, 'Verify Result': '随便' };
  const r = JSON.parse(savePMTaskVerification(bad));
  assert.equal(r.success, false);
});

test('savePMTaskVerification 缺少 PM No. 或 Task No → 返回错误对象', () => {
  const noPmNo = { ...VALID_PASS, 'PM No.': '  ' };
  assert.equal(JSON.parse(savePMTaskVerification(noPmNo)).success, false);
  const noTaskNo = { ...VALID_PASS, 'Task No': '' };
  assert.equal(JSON.parse(savePMTaskVerification(noTaskNo)).success, false);
});

test('savePMTaskVerification 追加式记录：两次保存不覆盖表头，逐条追加', () => {
  savePMTaskVerification(VALID_PASS);
  const ws = fakeSS[PM_TASK_VERIFY_SS_ID][PM_TASK_VERIFY_SHEET_NAME];
  const before = ws.rows.length;
  savePMTaskVerification({ ...VALID_PASS, 'Task No': 'T2' });
  assert.equal(ws.rows.length, before + 1);
  assert.deepEqual(ws.rows[0], PM_TASK_VERIFY_HEADER, '表头不被重复写入');
});

// ===== 3. 读取过滤 =====
test('getPMTaskVerifications 只返回指定 PM No. 的记录', () => {
  savePMTaskVerification(VALID_PASS); // PM-001
  savePMTaskVerification({ ...VALID_PASS, 'PM No.': 'PM-002', 'Task No': 'T9' });
  const r = JSON.parse(getPMTaskVerifications('PM-001'));
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  assert.ok(r.every(rec => rec['PM No.'] === 'PM-001'));
});

test('getPMTaskVerifications 无记录 → 空数组', () => {
  const r = JSON.parse(getPMTaskVerifications('PM-XXX'));
  assert.deepEqual(r, []);
});

test('getPMTaskVerifications 返回顺序与追加顺序一致（最新在后）', () => {
  savePMTaskVerification(VALID_PASS); // 合格
  savePMTaskVerification({ ...VALID_PASS, 'Verify Result': '不合格', 'Fail Reason': '重验', 'Verifier Name': '李四' });
  const r = JSON.parse(getPMTaskVerifications('PM-001'));
  assert.equal(r[r.length - 1]['Verify Result'], '不合格');
  assert.equal(r[r.length - 1]['Verifier Name'], '李四');
});

test('getPMTaskVerifications 首次调用在 sheet 不存在时也会创建（空结果不报错）', () => {
  const r = JSON.parse(getPMTaskVerifications('PM-001'));
  assert.deepEqual(r, []);
  const ws = fakeSS[PM_TASK_VERIFY_SS_ID][PM_TASK_VERIFY_SHEET_NAME];
  assert.ok(ws, '读取时也应确保 sheet 存在');
  assert.deepEqual(ws.rows[0], PM_TASK_VERIFY_HEADER);
});
