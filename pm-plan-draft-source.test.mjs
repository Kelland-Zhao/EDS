// 保养计划数据源切换：app 直接读草稿表【PmPlan工序年度主计划】/ PmPlanNew
// 覆盖：列映射、四个过滤条件、数据源选择、读取异常回退、三个消费函数
// 运行：node --test pm-plan-draft-source.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');

// ===== GAS stub =====
let fakeSS = {};

function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    getDataRange: () => ({
      getValues: () => rows.map(r => r.slice()),
      getDisplayValues: () => rows.map(r => r.map(c => (c == null ? '' : String(c)))),
    }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const src = rows[r - 1 + i] || [];
          const line = [];
          for (let j = 0; j < nc; j++) line.push(src[c - 1 + j] ?? '');
          out.push(line);
        }
        return out;
      },
      getDisplayValues: function () { return this.getValues().map(line => line.map(v => String(v ?? ''))); },
    }),
  };
}

const idFromUrl = url => String(url).split('/d/')[1]?.split('/')[0] || '';

globalThis.SpreadsheetApp = {
  openById: id => ({ getSheetByName: n => fakeSS[id]?.[n] ?? null }),
  openByUrl: url => ({ getSheetByName: n => fakeSS[idFromUrl(url)]?.[n] ?? null }),
  getActiveSpreadsheet: () => ({ getSheetByName: () => null }),
};
globalThis.Session = {
  getActiveUser: () => ({ getEmail: () => 'test@colpal.com' }),
  getScriptTimeZone: () => 'Asia/Shanghai',
};
globalThis.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };

function ymdInTz(d, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => (fmt === 'yyyy-MM-dd' ? ymdInTz(d, tz) : 'CACHEKEY'),
  formatString: (fmt, ...args) => {
    let i = 0;
    return String(fmt).replace(/%0?(\d*)d/g, (m, w) => String(args[i++]).padStart(Number(w) || 0, '0'));
  },
};

// 目标函数尚不存在时给出「尚未实现」的明确失败，而不是加载报错
for (const name of ['normalizePMPlanDraftRows_', 'getPMPlanRows_']) {
  if (!code.includes(`function ${name}(`)) {
    globalThis[name] = () => { throw new Error(`${name} 尚未实现`); };
  }
}
(0, eval)(code);

// ===== 夹具 =====
const DRAFT_ID = '1_atn1Q6bR2mIBN_Q6nl01Fmc3o3FGJJfY92C7xQrCsA';
const DRAFT_SHEET = 'PmPlanNew';
const DB_ID = '1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4';
const USER_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';
const PLAN_HEADERS = ['月份', '日历周次', '车间', '工序', '开始日期', '状态', 'AEM#', '保养时间', '保养类型', '机型', '类别', '设备类型1', '设备类型2', '自动化类型'];
const DRAFT_HEADER = new Array(23).fill('');

const DRAFT_COL = {
  月份: 0, 计划周次: 1, 班别: 2, 星期: 3, 领班: 4, Sponsor: 5, 日历周次: 6, 周次: 7,
  车间: 8, Process: 9, 开始日期: 10, 开始时间: 11, 'AEM #': 12, 保养时间: 13, 保养类型: 14,
  机型: 15, 类别: 16, 设备类型1: 17, 设备类型2: 18, 自动化类型: 19, 保养备注: 20, 状态: 21, 'SNP Remark': 22,
};

function draftRow(fields) {
  const r = new Array(23).fill('');
  Object.entries(fields).forEach(([k, v]) => { r[DRAFT_COL[k]] = v; });
  return r;
}

function basePlanRow(aem) {
  return ['202601', '2026W02', 'TB1', 'INJ', '2026-01-05', '', aem, 8, '模具保养', 'Mod', 'PM', 'HIM', 'NA', 'NA'];
}

const today = ymdInTz(new Date(), 'Asia/Shanghai');
const baseDraft = {
  月份: '202601', 日历周次: '2026W02', 车间: 'TB1', Process: 'INJ', 开始日期: today,
  'AEM #': 'DRAFT01', 保养时间: 8, 保养类型: '模具保养', 机型: 'Mod', 类别: 'PM',
  设备类型1: 'HIM', 设备类型2: 'NA', 自动化类型: 'NA', 状态: '',
};

// ===== ① 列映射 =====
test('草稿行按固定索引映射成现表 14 列', () => {
  const r = draftRow({
    月份: '202601', 日历周次: '2026W02', 车间: 'TB1', Process: 'INJ', 开始日期: '2026-01-05',
    'AEM #': 'M1IM0001', 保养时间: 32, 保养类型: '模具保养', 机型: 'Mod', 类别: 'PM',
    设备类型1: 'HIM', 设备类型2: 'NA', 自动化类型: 'NA', 状态: '',
  });
  const out = globalThis.normalizePMPlanDraftRows_([r]);
  assert.deepEqual(out, [['202601', '2026W02', 'TB1', 'INJ', '2026-01-05', '', 'M1IM0001', 32, '模具保养', 'Mod', 'PM', 'HIM', 'NA', 'NA']]);
});

// ===== ② 过滤条件（复刻现 QUERY）=====
test('过滤：开始日期空 / AEM# 空 / 类别不含 PM / 状态取消 都被排除，PM 与 PM/AM 保留', () => {
  const rows = [
    draftRow(baseDraft),
    draftRow({ ...baseDraft, 开始日期: '' }),
    draftRow({ ...baseDraft, 'AEM #': '' }),
    draftRow({ ...baseDraft, 类别: 'AM', 'AEM #': 'A2' }),
    draftRow({ ...baseDraft, 类别: '#N/A', 'AEM #': 'A3' }),
    draftRow({ ...baseDraft, 状态: '取消', 'AEM #': 'A4' }),
    draftRow({ ...baseDraft, 类别: 'PM/AM', 'AEM #': 'M2' }),
  ];
  const out = globalThis.normalizePMPlanDraftRows_(rows);
  assert.deepEqual(out.map(r => r[6]), ['DRAFT01', 'M2']);
});

// ===== ③ 数据源选择 =====
test('getPMPlanRows_ 读草稿 PmPlanNew，而不是 Total PM Plan List', () => {
  fakeSS = {};
  fakeSS[DRAFT_ID] = { [DRAFT_SHEET]: fakeSheet([DRAFT_HEADER, draftRow(baseDraft)]) };
  fakeSS[DB_ID] = { 'Total PM Plan List': fakeSheet([PLAN_HEADERS, basePlanRow('DBONLY01')]) };

  const out = globalThis.getPMPlanRows_('display');

  assert.deepEqual(out.map(r => r[6]), ['DRAFT01']);
});

// ===== ④ 读取异常回退 =====
test('草稿表读取异常时回退到 Total PM Plan List', () => {
  fakeSS = {};
  fakeSS[DB_ID] = { 'Total PM Plan List': fakeSheet([PLAN_HEADERS, basePlanRow('DBONLY01')]) };

  const out = globalThis.getPMPlanRows_('display');

  assert.deepEqual(out.map(r => r[6]), ['DBONLY01']);
});

// ===== ⑤ 消费函数 =====
test('pmMasterplan 返回草稿来源的 JSON（表头 14 列顺序不变）', () => {
  fakeSS = {};
  fakeSS[DRAFT_ID] = { [DRAFT_SHEET]: fakeSheet([DRAFT_HEADER, draftRow(baseDraft)]) };

  const data = JSON.parse(globalThis.pmMasterplan());

  assert.equal(data.length, 1);
  assert.equal(data[0][6], 'DRAFT01');
  assert.equal(data[0][4], today);
});

test('loadPMTasksByDate 从草稿生成任务（首行数据也会被读到）', () => {
  fakeSS = {};
  fakeSS[DRAFT_ID] = { [DRAFT_SHEET]: fakeSheet([DRAFT_HEADER, draftRow(baseDraft)]) };
  fakeSS[DB_ID] = {
    'PM_Records': fakeSheet([new Array(14).fill('')]),
    'Total PM Plan List': fakeSheet([PLAN_HEADERS, basePlanRow('DBONLY01')]),
  };
  fakeSS[USER_ID] = { userID: fakeSheet([[], [], ['1001', '张三']]) };

  const tasks = globalThis.loadPMTasksByDate(today);

  assert.equal(tasks.length, 1);
  assert.ok(tasks[0].title.includes('DRAFT01'), '任务应来自草稿表');
});

test('raw 模式：Date 型开始日期在任务与周数据里都归一为 yyyy-MM-dd', () => {
  const dateObj = new Date(today + 'T00:00:00Z'); // 模拟 getValues() 返回的 Date
  fakeSS = {};
  fakeSS[DRAFT_ID] = { [DRAFT_SHEET]: fakeSheet([DRAFT_HEADER, draftRow({ ...baseDraft, 开始日期: dateObj })]) };
  fakeSS[DB_ID] = { 'PM_Records': fakeSheet([new Array(14).fill('')]) };
  fakeSS[USER_ID] = { userID: fakeSheet([[], [], ['1001', '张三']]) };

  const tasks = globalThis.loadPMTasksByDate(today);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].taskID, 'PM-DRAFT01-' + today.replace(/-/g, ''));

  const weekly = globalThis.getPlan_weekly();
  assert.equal(weekly.Content[0]['开始日期'], today);
});

test('getPlan_weekly 从草稿读取并按周范围过滤', () => {
  fakeSS = {};
  fakeSS[DRAFT_ID] = { [DRAFT_SHEET]: fakeSheet([DRAFT_HEADER, draftRow(baseDraft)]) };
  fakeSS[DB_ID] = { 'PM_Records': fakeSheet([new Array(14).fill('')]) };

  const res = globalThis.getPlan_weekly();

  assert.equal(res.Head[6], 'AEM#', '表头名需保持 AEM#（草稿是 AEM #）');
  assert.equal(res.Content.length, 1);
  assert.equal(res.Content[0]['AEM#'], 'DRAFT01');
});
