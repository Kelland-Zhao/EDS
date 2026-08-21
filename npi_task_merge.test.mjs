// NPI 测试任务 → EDS 任务安排合并（只读展示）— Node 内置 test runner 测试
// 运行：node --test npi_task_merge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

// ===== GAS 全局 stub（仅测试用） =====
const NPI_SS_ID = '1092k9V4BT-WhD9GPoF6sRQC2TtdZfdjeRe8pK6v1rmQ';
const TASK_SS_ID = '1UBg1Ake18cFp6gj0jKRX1Y9GJ0VL1pY5aXK-UoCeAY0';
const USER_PERMISSION_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';
const IM_SCHEDULING_SS_ID = '1dyS5C7r4pqYIeRT0p1zYzngt0EDCYR4hsswurAsEBYg';
const PM_DB_ID = '1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4';

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
    appendRow: (row) => { rows.push(row); },
  };
}
function pad(len, arr) { while (arr.length < len) arr.push(''); return arr; }

globalThis.SpreadsheetApp = {
  openById: (id) => ({ getSheetByName: (n) => fakeSS[id]?.[n] ?? null }),
};
globalThis.CacheService = {
  getScriptCache: () => ({ get: () => null, put: () => {} }),
};
// 日期 stub：真实日期运算（甘特 addDaysYMD_ 需要），"今天"固定为 2026-08-21
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => {
    if (!(d instanceof Date)) return fmt;
    if (fmt === 'yyyyMMddHH') return '2026082110';
    if (fmt === 'yyyy-MM-dd') {
      const now = new Date();
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
        return '2026-08-21'; // 固定"今天"，保证已超期断言确定性
      }
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + m + '-' + dd;
    }
    return fmt;
  },
  formatString: (fmt, ...args) => {
    let i = 0;
    return String(fmt).replace(/%0(\d+)d/g, (_, w) => String(args[i++]).padStart(parseInt(w, 10), '0'));
  },
};
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };

// ===== 测试数据 =====
// NPI_TestTasks 列（0-20）：taskID, source, status, productName, moldNo, machineNo,
//   material, reqDept, reqPerson, planDate, confirmStatus, 11-14空, remark, createdAt,
//   updatedAt, processType, sku, machineModel
function npiRow(row) {
  const base = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  row.forEach((v, i) => { base[i] = v; });
  return base;
}
const NPI_HEADER = npiRow(['任务ID', '来源', '状态', '产品', '模具', '机台', '物料', '需求部门', '负责人', '计划日期', '确认', '', '', '', '', '备注', '创建时间', '更新时间', '工序', 'SKU', '机型']);
const NPI_ROWS = [
  NPI_HEADER,
  // A: 执行中，pipe 负责人，今天
  npiRow(['NPI-20260821-0001', '周计划 Weekly', '执行中 In Progress', '产品X', 'M-01', 'E05', 'ABS', '注塑部', '张三|90001', '2026-08-21', '已确认 Confirmed', '', '', '', '', '备注A', '2026-08-21 08:00:00', '2026-08-21 08:00:00', 'IM', 'SKU-1', 'ModelA']),
  // B: 待确认 + 计划日期已过 → 已超期
  npiRow(['NPI-20260820-0001', '紧急 Urgent', '待确认 Pending', '产品Y', 'M-02', 'E06', '', '', '李四|90002', '2026-08-20', '待确认 Pending', '', '', '', '', '', '2026-08-20 08:00:00', '2026-08-20 08:00:00', 'INJ', '', '']),
  // C: 已排期 + 未来日期 + 裸工号负责人
  npiRow(['NPI-20260820-0002', '周计划 Weekly', '已排期 Scheduled', '产品Z', 'M-03', 'E07', '', '', '90003', '2026-08-22', '已确认 Confirmed', '', '', '', '', '', '2026-08-20 09:00:00', '2026-08-20 09:00:00', 'IM', '', '']),
  // D: 已完成，无负责人
  npiRow(['NPI-20260819-0001', '周计划 Weekly', '已完成 Completed', '产品W', 'M-04', 'E08', '', '', '', '2026-08-19', '已确认 Confirmed', '', '', '', '', '', '2026-08-19 08:00:00', '2026-08-19 08:00:00', 'IM', '', '']),
  // E: 已取消
  npiRow(['NPI-20260819-0002', '紧急 Urgent', '已取消 Cancelled', '产品V', 'M-05', 'E09', '', '', '', '2026-08-19', '已确认 Confirmed', '', '', '', '', '', '2026-08-19 08:00:00', '2026-08-19 08:00:00', 'IM', '', '']),
  // F: 空 taskID → 跳过
  npiRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']),
  // G: Date 对象计划日期，无负责人
  npiRow(['NPI-20260821-0002', '周计划 Weekly', '已排期 Scheduled', '产品U', 'M-06', 'E10', '', '', '', new Date(2026, 7, 21), '已确认 Confirmed', '', '', '', '', '', '2026-08-21 08:00:00', '2026-08-21 08:00:00', 'IM', '', '']),
];
fakeSS[NPI_SS_ID] = { 'NPI_TestTasks': fakeSheet(NPI_ROWS) };

// userID 表（0=工号 1=姓名 13=车间 14=工序 63=内部组别）
const userRow = (sap, name, ws, proc, group) => pad(64, [sap, name, '', '', '', '', '', '', '', '', '', '', '', ws, proc, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', group]);
fakeSS[USER_PERMISSION_SS_ID] = {
  'userID': fakeSheet([
    pad(64, ['工号', '姓名']),
    pad(64, ['', '']),
    userRow('90001', '张三', 'TB1', 'IM', '测试组'),
    userRow('90002', '李四', 'TB1', 'IM', ''),
    userRow('90003', '王五', 'TB2', 'IM', '测试组'),
  ]),
};

fakeSS[TASK_SS_ID] = {
  'Tasks': fakeSheet([pad(15, ['ID'])]),
  'TaskMembers': fakeSheet([pad(7, ['ID'])]),
  'AttendanceSync': fakeSheet([pad(11, ['日期'])]),
};
fakeSS[IM_SCHEDULING_SS_ID] = { 'MasterData': fakeSheet([pad(5, ['日期班次'])]), };
fakeSS[PM_DB_ID] = {
  'Total PM Plan List': fakeSheet([pad(10, ['序号'])]),
  'PM_Records': fakeSheet([pad(24, ['PM No.'])]),
};

function loadNpiData() {
  const res = JSON.parse(globalThis.loadAllNPITasks(JSON.stringify({})));
  assert.equal(res.success, true);
  return res.data;
}

// ===== loadAllNPITasks 字段映射 =====
test('loadAllNPITasks 将 NPI 行映射为 EDS 任务格式', () => {
  const data = loadNpiData();
  const a = data.find(t => t.taskID === 'NPI-20260821-0001');
  assert.ok(a, '找到任务 A');
  assert.equal(a.title, 'NPI: E05 - 产品X');
  assert.equal(a.taskType, '测试');
  assert.equal(a.priority, '中');
  assert.equal(a.status, '进行中');
  assert.equal(a.planStartDate, '2026-08-21');
  assert.equal(a.dueDate, '2026-08-21');
  assert.equal(a.process, 'IM');
  assert.equal(a.createdBy, 'NPI Module');
  assert.deepEqual(a.owners, ['90001']);
  assert.deepEqual(a.ownerNames, ['张三']);
  assert.deepEqual(a.collaborators, []);
  assert.ok(a.description.includes('模具: M-01'), '描述含模具');
  assert.ok(a.description.includes('SKU: SKU-1'), '描述含 SKU');
  assert.ok(a.description.includes('备注: 备注A'), '描述含备注');
  assert.equal(a.remark, '备注A');
});

test('loadAllNPITasks NPI 状态映射为 EDS 状态', () => {
  const data = loadNpiData();
  const byId = Object.fromEntries(data.map(t => [t.taskID, t.status]));
  assert.equal(byId['NPI-20260821-0001'], '进行中');   // 执行中
  assert.equal(byId['NPI-20260820-0002'], '未开始');   // 已排期
  assert.equal(byId['NPI-20260819-0001'], '已完成');   // 已完成
  assert.equal(byId['NPI-20260819-0002'], '已取消');   // 已取消
});

test('loadAllNPITasks 未关闭且计划日期已过 → 已超期', () => {
  const data = loadNpiData();
  const b = data.find(t => t.taskID === 'NPI-20260820-0001');
  assert.equal(b.status, '已超期'); // 待确认 2026-08-20 < 今天 2026-08-21
  const c = data.find(t => t.taskID === 'NPI-20260820-0002');
  assert.equal(c.status, '未开始'); // 未来日期不超期
  const d = data.find(t => t.taskID === 'NPI-20260819-0001');
  assert.equal(d.status, '已完成'); // 已完成不改为超期
});

test('loadAllNPITasks 裸工号负责人解析姓名，空负责人无 owners', () => {
  const data = loadNpiData();
  const c = data.find(t => t.taskID === 'NPI-20260820-0002');
  assert.deepEqual(c.owners, ['90003']);
  assert.deepEqual(c.ownerNames, ['王五']);
  const d = data.find(t => t.taskID === 'NPI-20260819-0001');
  assert.deepEqual(d.owners, []);
  assert.deepEqual(d.ownerNames, []);
});

test('loadAllNPITasks 跳过空 taskID 行，Date 对象日期归一化', () => {
  const data = loadNpiData();
  assert.equal(data.length, 6); // 7 行数据 - 1 行空 taskID
  const g = data.find(t => t.taskID === 'NPI-20260821-0002');
  assert.ok(g, 'Date 行存在');
  assert.equal(g.planStartDate, '2026-08-21');
  assert.equal(g.status, '未开始'); // 今天不超期
});

// ===== 筛选 =====
test('loadAllNPITasks 工序筛选 INJ/IM 等价', () => {
  const inj = JSON.parse(globalThis.loadAllNPITasks(JSON.stringify({ process: 'INJ' })));
  const ids = inj.data.map(t => t.taskID);
  assert.ok(ids.includes('NPI-20260821-0001'), 'IM 任务计入 INJ');
  assert.ok(ids.includes('NPI-20260820-0001'), 'INJ 任务计入 INJ');
  const tf = JSON.parse(globalThis.loadAllNPITasks(JSON.stringify({ process: 'TF' })));
  assert.equal(tf.data.length, 0, 'TF 无任务');
});

test('loadAllNPITasks 状态与搜索筛选', () => {
  const overdue = JSON.parse(globalThis.loadAllNPITasks(JSON.stringify({ status: '已超期' })));
  assert.deepEqual(overdue.data.map(t => t.taskID), ['NPI-20260820-0001']);
  const search = JSON.parse(globalThis.loadAllNPITasks(JSON.stringify({ search: '产品Y' })));
  assert.deepEqual(search.data.map(t => t.taskID), ['NPI-20260820-0001']);
});

// ===== 合并入口 =====
test('loadAllTasksForList 合并 NPI 任务（PM/manual 为空时 merged=NPI）', () => {
  const res = JSON.parse(globalThis.loadAllTasksForList());
  assert.equal(res.success, true);
  assert.equal(res.npi.length, 6);
  assert.equal(res.merged.length, 6);
  assert.ok(res.merged.some(t => t.taskID === 'NPI-20260821-0001'));
});

test('loadAllTasksForListFast 合并 NPI 任务', () => {
  const res = JSON.parse(globalThis.loadAllTasksForListFast());
  assert.equal(res.success, true);
  assert.equal(res.merged.length, 6);
});

// ===== 今日工作台 =====
test('loadTodayDashboardData 包含 NPI 今日任务、超期任务与我的任务', () => {
  const res = JSON.parse(globalThis.loadTodayDashboardData('2026-08-21', '90001'));
  assert.equal(res.success, true);
  const todayIds = res.data.todayTasks.map(t => t.taskID);
  assert.ok(todayIds.includes('NPI-20260821-0001'), '今日任务含 E05 测试');
  assert.ok(todayIds.includes('NPI-20260821-0002'), 'Date 行计入今日');
  assert.ok(!todayIds.includes('NPI-20260820-0001'), '昨日截止不计入今日');
  const overdueIds = res.data.overdueTasks.map(t => t.taskID);
  assert.ok(overdueIds.includes('NPI-20260820-0001'), '超期列表含已超期 NPI 任务');
  const myIds = res.data.myTasks.map(t => t.taskID);
  assert.deepEqual(myIds, ['NPI-20260821-0001'], '我的任务=负责的 NPI 任务');
});

// ===== 我的任务 =====
test('loadMyTasks 按负责人匹配 NPI 任务', () => {
  const r1 = JSON.parse(globalThis.loadMyTasks('90001'));
  assert.deepEqual(r1.data.ownerTasks.map(t => t.taskID), ['NPI-20260821-0001']);
  const r3 = JSON.parse(globalThis.loadMyTasks('90003'));
  assert.deepEqual(r3.data.ownerTasks.map(t => t.taskID), ['NPI-20260820-0002']);
  const none = JSON.parse(globalThis.loadMyTasks('99999'));
  assert.equal(none.data.ownerTasks.length, 0);
  assert.equal(none.data.collaboratorTasks.length, 0);
});

// ===== 资源甘特图：未分配行 =====
test('loadResourceGanttData 无负责人/无内部组别的 NPI 任务进入测试组未分配行', () => {
  const res = JSON.parse(globalThis.loadResourceGanttData('2026-08-18', 7));
  assert.equal(res.success, true);
  const testGroup = res.data.groups.find(g => g.key === 'test');
  assert.ok(testGroup, '存在测试组');
  const people = Object.fromEntries(testGroup.people.map(p => [p.sapID, p]));
  assert.ok(people['90001'], '张三在测试组');
  assert.equal(people['90001'].tasks.length, 1);
  assert.ok(people['90003'], '王五在测试组');
  assert.equal(people['90003'].tasks.length, 1);
  assert.ok(people['unassigned'], '存在未分配行');
  assert.equal(people['unassigned'].name, '未分配 / Unassigned');
  // 未分配：李四(无内部组别) + D(无负责人) + G(无负责人) = 3
  assert.equal(people['unassigned'].tasks.length, 3);
  const unassignedIds = people['unassigned'].tasks.map(t => t.taskID).sort();
  assert.deepEqual(unassignedIds, ['NPI-20260819-0001', 'NPI-20260820-0001', 'NPI-20260821-0002'].sort());
});
