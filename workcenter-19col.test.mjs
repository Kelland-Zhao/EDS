// Workcenter 表 11 列 → 19 列结构重构后的列定位测试
// 覆盖三处读取点：NPI 机台下拉、点检 RBM(NFC) 映射、设备编号
// 运行：node --test workcenter-19col.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

const WC_SS_ID = '12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM';

// ===== GAS stub =====
let fakeSS = {};

function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()), getDisplayValues: () => rows.map(r => r.map(c => String(c ?? ''))) }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = rows[r - 1 + i] || [];
          const line = [];
          for (let j = 0; j < nc; j++) line.push(row[c - 1 + j] ?? '');
          out.push(line);
        }
        return out;
      },
      getDisplayValues: function () { return this.getValues().map(line => line.map(v => String(v ?? ''))); },
      setValue: () => {},
      setValues: () => {},
    }),
  };
}

globalThis.SpreadsheetApp = {
  openById: id => ({
    getSheetByName: name => fakeSS[id]?.[name] ?? null,
    insertSheet: name => fakeSheet([[]]),
  }),
  getActiveSpreadsheet: () => ({ getSheetByName: () => null }),
};
globalThis.Session = { getActiveUser: () => ({ getEmail: () => 'test@colpal.com' }) };
globalThis.console = console;

// ===== 夹具：重构后的 19 列 Workcenter 表 =====
const WC_HEADERS = [
  'Workcenter', 'Machine Type', '机器性能', 'New Formed Cell',
  'HIM/Auto', 'VIM-1', 'VIM-2', 'VIM-3', 'VIM-4',
  'Final Machine Type', '是否主设备', '设备编号',
  '机型', '设备类型1', '设备类型2', '自动化类型',
  '责任人', '备份责任人', '无需检查Y/N',
];

function wcRow(fields) {
  const r = new Array(WC_HEADERS.length).fill('');
  Object.entries(fields).forEach(([k, v]) => { r[WC_HEADERS.indexOf(k)] = v; });
  return r;
}

function setup(rows) {
  fakeSS = {};
  fakeSS[WC_SS_ID] = { Workcenter: fakeSheet([WC_HEADERS, ...rows]) };
}

// ===== ① NPI 机台下拉 =====
test('NPI 机台下拉：model 取自 J 列 Final Machine Type', () => {
  setup([
    wcRow({ 'Workcenter': 'M1', 'Final Machine Type': 'HIM', 'New Formed Cell': 'DP' }),
  ]);

  const res = JSON.parse(globalThis.loadNPIWorkcenterList('INJ'));

  assert.equal(res.success, true);
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].id, 'M1');
  assert.equal(res.data[0].model, 'HIM', '按旧结构读 D 列的话这里会是 DP');
});

test('NPI 机台下拉：Final Machine Type=NA 的退役机台被排除', () => {
  setup([
    wcRow({ 'Workcenter': 'M1', 'Final Machine Type': 'NA' }),
    wcRow({ 'Workcenter': 'M2', 'Final Machine Type': 'HIM' }),
  ]);

  const res = JSON.parse(globalThis.loadNPIWorkcenterList('INJ'));

  assert.deepEqual(res.data.map(d => d.id), ['M2'], 'NA 不该出现在下拉里');
});

test('NPI 机台下拉：机型为闲置/报废的机台被排除', () => {
  setup([
    wcRow({ 'Workcenter': 'M1', 'Final Machine Type': '报废' }),
    wcRow({ 'Workcenter': 'M2', 'Final Machine Type': 'HIM' }),
  ]);

  const res = JSON.parse(globalThis.loadNPIWorkcenterList('INJ'));

  assert.deepEqual(res.data.map(d => d.id), ['M2']);
});

// ===== ② 点检 RBM(NFC) 映射 =====
test('点检 RBM 映射：NFC 取自 D 列，同一 NFC 归集多台机台', () => {
  const data = [
    WC_HEADERS,
    wcRow({ 'Workcenter': 'M1', 'New Formed Cell': 'NFC1', '是否主设备': 'NFC9' }),
    wcRow({ 'Workcenter': 'M2', 'New Formed Cell': 'NFC1' }),
  ];

  const res = globalThis.buildWorkcenterNfcMap_(data);

  assert.deepEqual(res.map['NFC1'], ['M1', 'M2'], '按旧结构读 K 列的话这里只会拿到 NFC9 那一组');
  assert.equal(res.map['NFC9'], undefined);
  assert.deepEqual(res.missing, []);
});

test('点检 RBM 映射：表头缺少 New Formed Cell → 返回空并报缺失，不读错列', () => {
  const broken = WC_HEADERS.filter(h => h !== 'New Formed Cell');
  const data = [
    broken,
    wcRow({ 'Workcenter': 'M1' }),
  ];

  const res = globalThis.buildWorkcenterNfcMap_(data);

  assert.deepEqual(Object.keys(res.map), []);
  assert.deepEqual(res.missing, ['New Formed Cell']);
});

// ===== ④ 故障报告机台号下拉 =====
test('故障报告机台号下拉：读 11 表 Workcenter，排除 NA 退役机台', () => {
  setup([
    wcRow({ 'Workcenter': 'M1', 'Final Machine Type': 'HIM' }),
    wcRow({ 'Workcenter': 'M2', 'Final Machine Type': 'NA' }),
    wcRow({ 'Workcenter': 'M3', 'Final Machine Type': '6AX' }),
  ]);

  const res = JSON.parse(globalThis.getMachineNumbers());

  assert.deepEqual(res, ['M1', 'M3'], 'M2 是退役机台，不该出现在下拉里');
});

// ===== ③ 设备编号 =====
test('设备编号：取自 L 列，不再读 F 列', () => {
  setup([
    wcRow({ 'Workcenter': 'M1', '设备编号': 'EQ-1', 'VIM-1': 'V1' }),
    wcRow({ 'Workcenter': 'M2', '设备编号': '' }),
  ]);

  const res = JSON.parse(globalThis.get_Equipment_No_in_EAM());

  assert.deepEqual(res, [{ Workcenter: 'M1', Equipment: 'EQ-1' }], '按旧结构读 F 列的话这里会是 V1');
});

test('设备编号：表中无数据行时返回 JSON 字符串，前端可直接 JSON.parse', () => {
  fakeSS = {};
  fakeSS[WC_SS_ID] = { Workcenter: fakeSheet([]) };

  const raw = globalThis.get_Equipment_No_in_EAM();

  assert.equal(typeof raw, 'string', '返回数组的话前端 JSON.parse 会抛错');
  assert.deepEqual(JSON.parse(raw), []);
});

test('设备编号：表头缺少 设备编号 → 返回空数组，不读错列', () => {
  const broken = WC_HEADERS.filter(h => h !== '设备编号');
  fakeSS = {};
  fakeSS[WC_SS_ID] = { Workcenter: fakeSheet([broken, wcRow({ 'Workcenter': 'M1' })]) };

  const res = JSON.parse(globalThis.get_Equipment_No_in_EAM());

  assert.deepEqual(res, []);
});
