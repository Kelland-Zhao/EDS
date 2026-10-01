// 注塑机台主数据维护页测试
// 运行：node --test inj-machine-master.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

const MM_WC_SS_ID = '12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM';
const MM_TASKLIST_SS_ID = '1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U';
const MM_USERID_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';

// ===== GAS stub =====
let fakeSS = {};

function fakeSheet(rows, maxRows) {
  const sheet = {
    _rows: rows,
    _maxRows: maxRows || Math.max(rows.length, 1000),
    _setValuesCalls: 0,
    _failSetValuesAt: 0,
    getLastRow: () => sheet._rows.length,
    getLastColumn: () => sheet._rows.reduce((m, r) => Math.max(m, r.length), 0),
    getMaxRows: () => sheet._maxRows,
    insertRowsAfter: (after, n) => { sheet._maxRows += n; },
    getDataRange: () => ({ getValues: () => sheet._rows.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => {
      if (r + nr - 1 > sheet._maxRows) throw new Error('The coordinates or dimensions of the range are invalid.');
      return {
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
          sheet._setValuesCalls++;
          if (sheet._failSetValuesAt && sheet._setValuesCalls === sheet._failSetValuesAt) {
            throw new Error('模拟写入失败');
          }
          for (let i = 0; i < vals.length; i++) {
            const ri = r - 1 + i;
            while (sheet._rows.length <= ri) sheet._rows.push([]);
            const line = sheet._rows[ri].slice();
            for (let j = 0; j < vals[i].length; j++) line[c - 1 + j] = vals[i][j];
            sheet._rows[ri] = line;
          }
        },
        setValue: (v) => { sheet.getRange(r, c, 1, 1).setValues([[v]]); },
      };
    },
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
// 忠实模拟 GAS 的 Utilities.formatDate（按 yyyy-MM-dd HH:mm:ss 输出），
// 之前写死成固定串，导致"时间列是 Date 对象"这类问题测不出来
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => {
    if (!(d instanceof Date)) return String(d);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },
};
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
  assert.ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(audit[1][0]), '时间应为 yyyy-MM-dd HH:mm:ss，实际: ' + audit[1][0]);
  assert.deepEqual(audit[1].slice(1), ['33012', '李华', 'V1FTA463', '机型', '3AX', '6AX']);
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

// ===== Final review 修复：I2 写入合并与失败可追溯、M5 审计表扩行 =====
test('保存：连续改动行合并为一次 setValues 写入', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'M1', 机型: '3AX' }),
      wcRow({ Workcenter: 'M2', 机型: '3AX' }),
      wcRow({ Workcenter: 'M3', 机型: '3AX' }),
    ],
    typeOptions: [['机型'], ['3AX']],
  });
  fakeSS[MM_WC_SS_ID].Workcenter._setValuesCalls = 0;
  const r = globalThis.save_MachineMasterData([
    { 机台号: 'M1', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
    { 机台号: 'M2', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
    { 机台号: 'M3', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
  ], '33012', '李华');
  assert.equal(r.ok, true);
  assert.equal(r.applied.length, 3);
  assert.equal(fakeSS[MM_WC_SS_ID].Workcenter._setValuesCalls, 1, '连续 3 行应合并为 1 次写入');
  const wcRows = fakeSS[MM_WC_SS_ID].Workcenter._rows;
  assert.equal(wcRows[1][12], '6AX');
  assert.equal(wcRows[3][12], '6AX');
});

test('保存：不连续改动行各写一次，不合并且不误写中间行', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'M1', 机型: '3AX' }),
      wcRow({ Workcenter: 'M2', 机型: '3AX' }),
      wcRow({ Workcenter: 'M3', 机型: '3AX' }),
    ],
    typeOptions: [['机型'], ['3AX']],
  });
  fakeSS[MM_WC_SS_ID].Workcenter._setValuesCalls = 0;
  const r = globalThis.save_MachineMasterData([
    { 机台号: 'M1', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
    { 机台号: 'M3', 字段: '机型', 旧值: '3AX', 新值: '5AX' },
  ], '33012', '李华');
  assert.equal(r.ok, true);
  assert.equal(fakeSS[MM_WC_SS_ID].Workcenter._setValuesCalls, 2, 'M1 与 M3 不连续 → 两次写入');
  const wcRows = fakeSS[MM_WC_SS_ID].Workcenter._rows;
  assert.equal(wcRows[1][12], '6AX');
  assert.equal(wcRows[2][12], '3AX', '中间行 M2 不能被带上');
  assert.equal(wcRows[3][12], '5AX');
});

test('保存：中途写入失败时，已写入的行仍要记变更日志', () => {
  setupMM({
    rows: [
      wcRow({ Workcenter: 'M1', 机型: '3AX' }),
      wcRow({ Workcenter: 'M2', 机型: '3AX' }),
      wcRow({ Workcenter: 'M3', 机型: '3AX' }),
    ],
    typeOptions: [['机型'], ['3AX']],
  });
  fakeSS[MM_WC_SS_ID].Workcenter._failSetValuesAt = 2; // 第二次写入（M3）抛错
  const r = globalThis.save_MachineMasterData([
    { 机台号: 'M1', 字段: '机型', 旧值: '3AX', 新值: '6AX' },
    { 机台号: 'M3', 字段: '机型', 旧值: '3AX', 新值: '5AX' },
  ], '33012', '李华');
  assert.equal(r.ok, false, '部分失败必须如实返回失败');
  const audit = fakeSS[MM_WC_SS_ID]['变更日志']._rows;
  assert.equal(audit.length, 2, '表头 + 已写入的 1 条日志');
  assert.deepEqual(audit[1].slice(3), ['M1', '机型', '3AX', '6AX'], '已写入的行必须留下日志');
  assert.equal(fakeSS[MM_WC_SS_ID].Workcenter._rows[1][12], '6AX', '已写入的单元格确实落库');
});

test('变更日志：sheet 行数写满时自动扩行，不丢日志', () => {
  fakeSS = {};
  fakeSS[MM_WC_SS_ID] = {
    '变更日志': fakeSheet([
      ['时间', '工号', '姓名', '机台号', '字段', '旧值', '新值'],
      ['2026-10-01 10:00:00', '1', '甲', 'M1', '机型', 'A', 'B'],
    ], 2), // 只有 2 行容量，正好写满
  };
  const ss = {
    getSheetByName: n => fakeSS[MM_WC_SS_ID][n] ?? null,
    insertSheet: n => { fakeSS[MM_WC_SS_ID][n] = fakeSheet([[]]); return fakeSS[MM_WC_SS_ID][n]; },
  };
  globalThis.appendMM_AuditLog_(ss, '33012', '李华', [
    { 机台号: 'M2', 字段: '机型', 旧值: 'A', 新值: 'C' },
  ]);
  const audit = fakeSS[MM_WC_SS_ID]['变更日志']._rows;
  assert.equal(audit.length, 3, '扩行后日志落库');
  assert.equal(audit[2][3], 'M2');
  assert.ok(fakeSS[MM_WC_SS_ID]['变更日志']._maxRows >= 3, 'sheet 容量已扩');
});

// ===== 前端：S/T 免检复选框必须反映表里的存量 Y =====
// 页面 JS 无法在 Node 里整体执行，只抽取纯函数到 vm 沙箱验证（项目已有的 extractFunction 模式）
function extractFunction(source, fnName) {
  const sig = `function ${fnName}(`;
  const start = source.indexOf(sig);
  if (start === -1) throw new Error(`function ${fnName} not found in source`);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces while extracting ${fnName}`);
}

const pageJs = fs.readFileSync(new URL('./INJ_MachineMaster-js.html', import.meta.url), 'utf8')
  .replace(/<\/?script[^>]*>/gi, '');

// 惰性提取：函数不存在时让失败发生在测试内部，而不是模块加载期
function checkboxHtml_() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(pageJs, 'escapeAttr') + '\n' + extractFunction(pageJs, 'checkboxHtml_'), sandbox);
  return sandbox.checkboxHtml_.apply(null, arguments);
}

test('免检复选框：表里存量的 Y 必须渲染为勾选', () => {
  assert.ok(checkboxHtml_('工艺无需检查Y/N', 'Y').includes('checked'), '工艺免检 Y 未勾选');
  assert.ok(checkboxHtml_('点检无需检查Y/N', 'Y').includes('checked'), '点检免检 Y 未勾选');
});

test('免检复选框：空白渲染为未勾选', () => {
  assert.ok(!checkboxHtml_('工艺无需检查Y/N', '').includes('checked'));
  assert.ok(!checkboxHtml_('点检无需检查Y/N', null).includes('checked'));
  assert.ok(!checkboxHtml_('点检无需检查Y/N', undefined).includes('checked'));
});

test('免检复选框：非 Y 值不勾选，且带正确的 data-field', () => {
  assert.ok(!checkboxHtml_('点检无需检查Y/N', 'N').includes('checked'));
  assert.ok(!checkboxHtml_('点检无需检查Y/N', 'true').includes('checked'));
  assert.ok(checkboxHtml_('点检无需检查Y/N', 'Y').includes('data-field="点检无需检查Y/N"'));
});

test('前端确实用 checkboxHtml_ 渲染两列免检（接线守卫）', () => {
  assert.ok(/CHECK_FIELDS\.indexOf\(f\) >= 0[\s\S]{0,160}checkboxHtml_/.test(pageJs),
    'createdRow 里的免检分支必须调用 checkboxHtml_');
});

// ===== 分组列开关：CSS 隐藏序号必须与 ALL_HEADERS 里的分组列一一对应 =====
// 用 CSS 隐藏而非 DataTables column().visible()——后者会从 DOM 移除单元格，
// 使 createdRow 里按位置索引渲染控件的逻辑错位。CSS 隐藏依赖 nth-child 序号，
// 因此列顺序一旦调整，序号就会指错列 —— 这条测试锁住这个耦合。
const pageHtml = fs.readFileSync(new URL('./INJ_MachineMaster.html', import.meta.url), 'utf8');
const GROUP_COLS_EXPECTED = ['机器性能', 'HIM/Auto', 'VIM-1', 'VIM-2', 'VIM-3', 'VIM-4'];

test('分组列开关：ALL_HEADERS 中分组列的实际位置与 CSS 隐藏的 nth-child 序号一致', () => {
  const m = pageJs.match(/const ALL_HEADERS = \[([\s\S]*?)\];/);
  assert.ok(m, 'ALL_HEADERS 未找到');
  const headers = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  const actual = GROUP_COLS_EXPECTED.map(h => headers.indexOf(h) + 1); // nth-child 从 1 起
  assert.deepEqual(actual, [3, 5, 6, 7, 8, 9], '分组列在 ALL_HEADERS 中的位置变了，CSS 的 nth-child 需要同步改');
});

test('分组列开关：CSS 恰好隐藏这 6 个序号，且 th/td 都覆盖', () => {
  [3, 5, 6, 7, 8, 9].forEach(n => {
    assert.ok(pageHtml.includes(`#tableMaster.hide-group-cols th:nth-child(${n})`), `缺少 th:nth-child(${n}) 规则`);
    assert.ok(pageHtml.includes(`#tableMaster.hide-group-cols td:nth-child(${n})`), `缺少 td:nth-child(${n}) 规则`);
  });
  [1, 2, 4, 10, 12, 13, 20].forEach(n => {
    assert.ok(!pageHtml.includes(`nth-child(${n})`), `第 ${n} 列不该被隐藏`);
  });
});

test('分组列开关：用 CSS class 切换，不得改用 DataTables 列可见性 API', () => {
  assert.ok(/toggleClass\('hide-group-cols'/.test(pageJs), '开关必须切 hide-group-cols 类');
  assert.ok(!/\.column\([^)]*\)\.visible\(/.test(pageJs), '改用 column().visible() 会移除单元格导致控件错位');
});

test('分组列开关：状态存 sessionStorage，重绘后不回弹', () => {
  assert.ok(/sessionStorage\.(getItem|setItem)\('mmShowGroupCols'/.test(pageJs), '开关状态未持久化到会话');
});

// ===== 变更日志时间列：Sheets 会把写入的时间串当日期存，读回来是 Date 对象 =====
test('读取变更日志：时间列是 Date 对象时格式化为 yyyy-MM-dd HH:mm:ss', () => {
  fakeSS = {};
  fakeSS[MM_WC_SS_ID] = {
    '变更日志': fakeSheet([
      ['时间', '工号', '姓名', '机台号', '字段', '旧值', '新值'],
      // 表格把 "2026-10-01 21:37:03" 存成日期值，getValues() 读回来就是 Date
      [new Date(2026, 9, 1, 21, 37, 3), '69063', '赵阳', 'H1HTA953', '机型', '', '6AX'],
      // 少数行可能是纯文本（例如手工补录），保持原样
      ['2026-10-01 10:00:00', '33012', '李华', 'M1', '机型', 'A', 'B'],
    ]),
  };
  const r = globalThis.get_MachineMasterAuditLog(200);
  assert.equal(r.rows[1]['时间'], '2026-10-01 21:37:03', 'Date 对象未格式化');
  assert.equal(r.rows[0]['时间'], '2026-10-01 10:00:00', '文本时间应原样保留');
  assert.ok(!/GMT/.test(r.rows[1]['时间']), '不能出现 GMT 这种 Date.toString() 形式');
});
