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
