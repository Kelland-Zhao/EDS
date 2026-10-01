// 注塑机台主数据维护页测试
// 运行：node --test inj-machine-master.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

const MM_WC_SS_ID = '12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM';
const MM_TASKLIST_SS_ID = '1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U';
const MM_USERID_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';

// ===== GAS stub =====
let fakeSS = {};

function fakeSheet(rows) {
  const sheet = {
    _rows: rows,
    getLastRow: () => sheet._rows.length,
    getLastColumn: () => sheet._rows.reduce((m, r) => Math.max(m, r.length), 0),
    getDataRange: () => ({ getValues: () => sheet._rows.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = sheet._rows[r - 1 + i] || [];
          const line = [];
          for (let j = 0; j < nc; j++) line.push(row[c - 1 + j] ?? '');
          out.push(line);
        }
        return out;
      },
      setValues: (vals) => {
        for (let i = 0; i < vals.length; i++) {
          const ri = r - 1 + i;
          while (sheet._rows.length <= ri) sheet._rows.push([]);
          const line = sheet._rows[ri].slice();
          for (let j = 0; j < vals[i].length; j++) line[c - 1 + j] = vals[i][j];
          sheet._rows[ri] = line;
        }
      },
      setValue: (v) => { sheet.getRange(r, c, 1, 1).setValues([[v]]); },
    }),
    appendRow: (row) => { sheet._rows.push(row.slice()); },
  };
  return sheet;
}

globalThis.SpreadsheetApp = {
  openById: id => {
    if (!fakeSS[id]) fakeSS[id] = {};
    const sheets = fakeSS[id];
    return {
      getSheetByName: name => sheets[name] ?? null,
      insertSheet: name => { sheets[name] = fakeSheet([[]]); return sheets[name]; },
    };
  },
};
globalThis.Utilities = { formatDate: () => '2026-10-01 12:00:00' };
globalThis.Session = { getActiveUser: () => ({ getEmail: () => 'test@colpal.com' }) };
globalThis.console = console;

// ===== 夹具：真实 20 列表头（取自生产表 A1:T1）=====
const WC_HEADERS = [
  'Workcenter', 'Machine Type', '机器性能', 'New Formed Cell',
  'HIM/Auto', 'VIM-1', 'VIM-2', 'VIM-3', 'VIM-4',
  'Final Machine Type', '是否主设备', '设备编号',
  '机型', '设备类型1', '设备类型2', '自动化类型',
  '责任人', '备份责任人', '工艺无需检查Y/N', '点检无需检查Y/N',
];

function wcRow(fields) {
  const r = new Array(WC_HEADERS.length).fill('');
  Object.entries(fields).forEach(([k, v]) => { r[WC_HEADERS.indexOf(k)] = v; });
  return r;
}

// ===== Task 1: 枚举过滤 =====
test('设备类型枚举：只取 Process=IM 且 Status 含「生效」的 MachineType，去重保序', () => {
  const data = [
    ['MachineType', '', '', '', '', '', '', '', '', '', '', '', 'Status', '', 'Process'],
    ['3AX', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'IM'],
    ['ZOR', '', '', '', '', '', '', '', '', '', '', '', '取代/ Replace', '', 'IM'],
    ['HA', '', '', '', '', '', '', '', '', '', '', '', '作废/ Void', '', 'IM'],
    ['PB', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'PK'],
    ['6AX', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'IM'],
    ['3AX', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'IM'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'IM'],
  ];
  assert.deepEqual(globalThis.filterMachineTypesFromTasklist_(data), ['3AX', '6AX']);
});

test('责任人枚举：只取 工序=INJ 且 职位=IDL 的姓名，去重保序，跳过空名', () => {
  const data = [
    [], // 第 1 行分类行
    [], // 第 2 行表头行
    ['', '张俊', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'IDL'],
    ['', '李九虎', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'S&C'],
    ['', '王友香', '', '', '', '', '', '', '', '', '', '', '', '', 'PK', 'IDL'],
    ['', '游臣', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'IDL'],
    ['', '张俊', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'IDL'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'IDL'],
  ];
  assert.deepEqual(globalThis.filterINJIDLNames_(data), ['张俊', '游臣']);
});

// ===== Task 2: 行定位与冲突校验 =====
test('行定位：机台号 → 1-based 行号，重复机台号保留首行并标 dup', () => {
  const data = [
    ['Workcenter', '机型'],
    ['V1FTA463', '3AX'],
    ['V1FTA563', 'VIM'],
    ['V1FTA463', 'DB'],
  ];
  const idx = globalThis.locateWorkcenterRows_(data);
  assert.equal(idx['V1FTA463'].rowIndex, 2);
  assert.equal(idx['V1FTA463'].dup, true);
  assert.equal(idx['V1FTA563'].rowIndex, 3);
  assert.equal(idx['V1FTA563'].dup, false);
});

test('冲突校验：现值等于旧值才应用，被他人改过则记冲突且不改块内容', () => {
  const block = [
    ['V1FTA463', '3AX', 'VIM', 'NA', 'V3AX', '王玉峰', '曹海基', '', ''],
    ['V1FTA564', 'VIM', 'VIM', 'NA', 'NA', '王玉峰', '曹海基', 'Y', 'Y'],
  ];
  const changes = [
    { 机台号: 'V1FTA463', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
    { 机台号: 'V1FTA564', 字段: '责任人', 旧值: '张三', 新值: '李四' },
    { 机台号: 'V1FTA999', 字段: '机型', 旧值: 'DB', 新值: 'HS' },
  ];
  const res = globalThis.applyMachineMasterChanges_(block, changes);
  assert.equal(res.nextBlock[0][1], '6AX');
  assert.equal(res.nextBlock[1][5], '王玉峰', '冲突字段不能被写');
  assert.deepEqual(res.applied.map(a => [a.机台号, a.字段, a.新值, a.rowIdx]), [['V1FTA463', '机型', '6AX', 0]]);
  assert.equal(res.conflicts.length, 2);
  assert.equal(res.conflicts[0].现值, '王玉峰');
  assert.equal(res.conflicts[0].原因, '已被他人修改');
  assert.equal(res.conflicts[1].原因, '未找到机台');
  assert.equal(block[0][1], '3AX', '原块不能被就地修改');
});

test('冲突校验：免检列取消勾选写空字符串，勾选写 Y', () => {
  const block = [['V1FTA464', '3AX', 'VIM', 'NA', 'V3AX', '王玉峰', '曹海基', 'Y', '']];
  const res = globalThis.applyMachineMasterChanges_(block, [
    { 机台号: 'V1FTA464', 字段: '工艺无需检查Y/N', 旧值: 'Y', 新值: '' },
    { 机台号: 'V1FTA464', 字段: '点检无需检查Y/N', 旧值: '', 新值: 'Y' },
  ]);
  assert.equal(res.nextBlock[0][7], '');
  assert.equal(res.nextBlock[0][8], 'Y');
  assert.equal(res.applied.length, 2);
  assert.deepEqual(res.conflicts, []);
});

test('冲突校验：未知字段名进冲突清单，不写块', () => {
  const block = [['V1FTA464', '3AX', 'VIM', 'NA', 'V3AX', '王玉峰', '曹海基', '', '']];
  const res = globalThis.applyMachineMasterChanges_(block, [
    { 机台号: 'V1FTA464', 字段: '设备编号', 旧值: '10127969', 新值: 'X' },
  ]);
  assert.equal(res.applied.length, 0);
  assert.equal(res.conflicts.length, 1);
  assert.equal(res.nextBlock[0][2], 'VIM', '设备类型1 未被触碰');
});

// ===== Task 3: 读取主数据 =====
function setupMM(opts) {
  opts = opts || {};
  fakeSS = {};
  fakeSS[MM_WC_SS_ID] = {
    Workcenter: fakeSheet([opts.headers || WC_HEADERS].concat(opts.rows || [])),
  };
  if (opts.typeOptions) fakeSS[MM_WC_SS_ID]['机型选项'] = fakeSheet(opts.typeOptions);
  if (opts.tasklist) fakeSS[MM_TASKLIST_SS_ID] = { Tasklist_history: fakeSheet(opts.tasklist) };
  if (opts.userid) fakeSS[MM_USERID_SS_ID] = { userID: fakeSheet(opts.userid) };
}

const TL_HEADERS = ['MachineType', '', '', '', '', '', '', '', '', '', '', '', 'Status', '', 'Process'];
const UID_ROWS = [[], [], ['', '张俊', '', '', '', '', '', '', '', '', '', '', '', '', 'INJ', 'IDL']];

test('读取主数据：返回 20 列 String 行 + 可编辑列清单 + 三类枚举', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'V1FTA463', 机型: '3AX', 设备类型1: 'VIM', 责任人: '王玉峰', '工艺无需检查Y/N': 'Y' }),
      wcRow({ Workcenter: 'V1FTA564', 机型: 'VIM' }),
    ],
    typeOptions: [['机型'], ['3AX'], ['VIM']],
    tasklist: [TL_HEADERS, ['3AX', '', '', '', '', '', '', '', '', '', '', '', '生效/ Effective', '', 'IM']],
    userid: UID_ROWS,
  });
  const r = globalThis.get_MachineMasterData();
  assert.equal(r.error, undefined);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0]['Workcenter'], 'V1FTA463');
  assert.equal(r.rows[0]['__rowIndex'], 2);
  assert.equal(r.rows[0]['工艺无需检查Y/N'], 'Y');
  assert.deepEqual(r.editHeaders, ['机型', '设备类型1', '设备类型2', '自动化类型', '责任人', '备份责任人', '工艺无需检查Y/N', '点检无需检查Y/N']);
  assert.deepEqual(r.typeOptions, ['3AX', 'VIM']);
  assert.deepEqual(r.deviceTypeOptions, ['3AX']);
  assert.deepEqual(r.ownerOptions, ['张俊']);
  assert.deepEqual(r.dupWorkcenters, []);
});

test('读取主数据：机型选项 sheet 缺失时自动创建，并用 M 列去重值预填', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'M1', 机型: '3AX' }),
      wcRow({ Workcenter: 'M2', 机型: '6AX' }),
      wcRow({ Workcenter: 'M3', 机型: '3AX' }),
      wcRow({ Workcenter: 'M4', 机型: '' }),
    ],
  });
  const r = globalThis.get_MachineMasterData();
  assert.deepEqual(r.typeOptions, ['3AX', '6AX']);
  assert.deepEqual(fakeSS[MM_WC_SS_ID]['机型选项']._rows, [['机型'], ['3AX'], ['6AX']]);
});

test('读取主数据：重复机台号在 dupWorkcenters 里报出', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'V1FTA463', 机型: '3AX' }),
      wcRow({ Workcenter: 'V1FTA463', 机型: 'DB' }),
    ],
    typeOptions: [['机型'], ['3AX']],
  });
  const r = globalThis.get_MachineMasterData();
  assert.deepEqual(r.dupWorkcenters, ['V1FTA463']);
});

test('读取主数据：Workcenter 表头缺可编辑列 → 返回 error 不返回行', () => {
  const broken = WC_HEADERS.filter(h => h !== '责任人');
  setupMM({ headers: broken, rows: [wcRow({ Workcenter: 'M1' })] });
  const r = globalThis.get_MachineMasterData();
  assert.ok(r.error && r.error.indexOf('责任人') >= 0);
  assert.deepEqual(r.rows, []);
});

test('读取主数据：枚举源读不到时返回空数组而不是抛错', () => {
  setupMM({ rows: [wcRow({ Workcenter: 'M1', 机型: '3AX' })], typeOptions: [['机型'], ['3AX']] });
  const r = globalThis.get_MachineMasterData();
  assert.deepEqual(r.deviceTypeOptions, []);
  assert.deepEqual(r.ownerOptions, []);
});

// ===== Task 4: 保存与日志 =====
test('保存：只写 M–T 区间，A–L 保持不变，日志批量落库', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'V1FTA463', 'Machine Type': 'FT400', 设备编号: '10128837', 机型: '3AX', 责任人: '王玉峰' }),
      wcRow({ Workcenter: 'V1FTA564', 'Machine Type': 'FT400', 设备编号: '10127949', 机型: 'VIM' }),
    ],
    typeOptions: [['机型'], ['3AX']],
  });
  const r = globalThis.save_MachineMasterData(
    [{ 机台号: 'V1FTA463', 字段: '机型', 旧值: '3AX', 新值: '6AX' }],
    '33012', '李华'
  );
  assert.equal(r.ok, true);
  assert.equal(r.applied.length, 1);
  assert.deepEqual(r.conflicts, []);

  const wcRows = fakeSS[MM_WC_SS_ID].Workcenter._rows;
  assert.equal(wcRows[1][12], '6AX', 'M 列机型已更新');
  assert.equal(wcRows[1][1], 'FT400', 'B 列 Machine Type 未被触碰');
  assert.equal(wcRows[1][11], '10128837', 'L 列设备编号未被触碰');
  assert.equal(wcRows[2][12], 'VIM', '未改动的行保持原值');

  const audit = fakeSS[MM_WC_SS_ID]['变更日志']._rows;
  assert.deepEqual(audit[0], ['时间', '工号', '姓名', '机台号', '字段', '旧值', '新值']);
  assert.deepEqual(audit[1], ['2026-10-01 12:00:00', '33012', '李华', 'V1FTA463', '机型', '3AX', '6AX']);
});

test('保存：冲突字段跳过不写，返回冲突明细', () => {
  setupMM({
    rows: [wcRow({ Workcenter: 'V1FTA463', 机型: '3AX', 责任人: '王玉峰' })],
    typeOptions: [['机型'], ['3AX']],
  });
  const r = globalThis.save_MachineMasterData(
    [{ 机台号: 'V1FTA463', 字段: '责任人', 旧值: '旧人', 新值: '新人' }],
    '33012', '李华'
  );
  assert.equal(r.ok, true);
  assert.equal(r.applied.length, 0);
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].现值, '王玉峰');
  assert.equal(fakeSS[MM_WC_SS_ID].Workcenter._rows[1][16], '王玉峰', '冲突值没被写入');
  assert.equal(fakeSS[MM_WC_SS_ID]['变更日志'], undefined, '无应用改动时不建日志 sheet');
});

test('保存：空改动清单直接返回 ok，不读表', () => {
  fakeSS = {};
  const r = globalThis.save_MachineMasterData([], '33012', '李华');
  assert.deepEqual(r, { ok: true, applied: [], conflicts: [] });
});

test('保存：表头缺可编辑列 → ok=false 且不写任何单元格', () => {
  const broken = WC_HEADERS.filter(h => h !== '设备类型1');
  setupMM({ headers: broken, rows: [wcRow({ Workcenter: 'M1', 机型: '3AX' })] });
  const before = JSON.stringify(fakeSS[MM_WC_SS_ID].Workcenter._rows);
  const r = globalThis.save_MachineMasterData(
    [{ 机台号: 'M1', 字段: '机型', 旧值: '3AX', 新值: '6AX' }],
    '33012', '李华'
  );
  assert.equal(r.ok, false);
  assert.ok(r.message.indexOf('设备类型1') >= 0);
  assert.equal(JSON.stringify(fakeSS[MM_WC_SS_ID].Workcenter._rows), before);
});

test('读取变更日志：倒序返回，字段名取自表头', () => {
  fakeSS = {};
  fakeSS[MM_WC_SS_ID] = {
    '变更日志': fakeSheet([
      ['时间', '工号', '姓名', '机台号', '字段', '旧值', '新值'],
      ['2026-10-01 10:00:00', '33012', '李华', 'V1FTA463', '机型', '3AX', '6AX'],
      ['2026-10-01 11:00:00', '69063', '赵阳', 'V1FTA564', '责任人', '', '游臣'],
    ]),
  };
  const r = globalThis.get_MachineMasterAuditLog(200);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0]['时间'], '2026-10-01 11:00:00', '最新在前');
  assert.equal(r.rows[1]['字段'], '机型');
});
