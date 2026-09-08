// NPI 测试计划机台自增（NPI_ExtraMachines）— Node 内置 test runner 测试
// 覆盖：loadNPIWorkcenterList 主表+自增表合并去重、addNPIExtraMachine 校验/查重/追加
// 运行：node --test npi-extra-machine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

const NPI_SS_ID = '1092k9V4BT-WhD9GPoF6sRQC2TtdZfdjeRe8pK6v1rmQ';
const NPI_WORKCENTER_SS_ID = '12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM';

// ===== GAS 全局 stub（仅测试用；fakeSS 内容在每个测试前重置） =====
let fakeSS = {};
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

function resetFakeSS() {
  Object.keys(fakeSS).forEach(k => delete fakeSS[k]);
}

globalThis.SpreadsheetApp = {
  openById: (id) => ({
    getSheetByName: (n) => fakeSS[id]?.[n] ?? null,
    insertSheet: (n) => {
      const s = fakeSheet([]);
      fakeSS[id] = fakeSS[id] || {};
      fakeSS[id][n] = s;
      return s;
    },
  }),
};
globalThis.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
globalThis.Utilities = {
  formatDate: (d, tz, fmt) => {
    if (d instanceof Date) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      if (fmt === 'yyyy-MM-dd') return d.getFullYear() + '-' + m + '-' + dd;
      if (fmt === 'yyyy-MM-dd HH:mm:ss') return d.getFullYear() + '-' + m + '-' + dd + ' 00:00:00';
    }
    return fmt;
  },
};
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };

// ===== 测试数据构造 =====
// Workcenter 主表列：A Workcenter, B Machine Type, C 机器性能, D Final Machine Type, E 是否主设备
const WC_HEADER = ['Workcenter', 'Machine Type', '机器性能', 'Final Machine Type', '是否主设备'];
function wcRow(id, d) { return pad(5, [id, '', '', d, 'Y']); }

function seedMaster() {
  fakeSS[NPI_WORKCENTER_SS_ID] = {
    Workcenter: fakeSheet([
      WC_HEADER,
      wcRow('S1HS0001', 'HS'),
      wcRow('S1DP0001', 'DP'),
      wcRow('E0EN0002', '闲置'), // D列含「闲置」→ 过滤
    ]),
  };
}

// NPI_ExtraMachines 列：A 机台编号 B 机型 C 添加人 D 添加时间
const EXTRA_HEADER = ['机台编号', '机型', '添加人', '添加时间'];
function extraRow(id, model) { return pad(4, [id, model, '张三|90001', '2026-09-08 10:00:00']); }

function seedMachineMap() {
  // NPI_MachineMap 列：A原始机型 B中间层 C工序 D卡 E卡数 F排序 G状态 H备注
  fakeSS[NPI_SS_ID] = fakeSS[NPI_SS_ID] || {};
  fakeSS[NPI_SS_ID]['NPI_MachineMap'] = fakeSheet([
    ['原始机型', '中间层', '工序', '卡', '卡数', '排序', '状态', '备注'],
    ['DP', 'DP-MID', 'IM', 'C1', 1, 1, '已确认', ''],
  ]);
  // NPI_Templates 列头（无已确认行即可满足 loadNPITemplateData 的表存在性检查）
  fakeSS[NPI_SS_ID]['NPI_Templates'] = fakeSheet([['卡', '工序', '区块', '区块EN', '字段CN', '字段EN', 'key', '类型', '单位', '下限', '上限', '检查部门', '预设值', '分段', '状态', '备注']]);
}

function loadMachines(pt) {
  return JSON.parse(globalThis.loadNPIWorkcenterList(pt || 'IM'));
}

// ===== loadNPIWorkcenterList 合并行为 =====
test('无自增表时仅返回主表有效机台（闲置过滤）', () => {
  resetFakeSS();
  seedMaster();
  const r = loadMachines('IM');
  assert.equal(r.success, true);
  assert.deepEqual(r.data.map(w => w.id), ['S1HS0001', 'S1DP0001']);
});

test('自增表合并：新机台追加到列表末尾（B列=工艺卡机型，映射为 displayModel）', () => {
  resetFakeSS();
  seedMaster();
  fakeSS[NPI_SS_ID] = {
    NPI_ExtraMachines: fakeSheet([EXTRA_HEADER, extraRow('S9ZZ0001', 'ZZ')]),
  };
  const r = loadMachines('IM');
  assert.deepEqual(r.data.map(w => w.id), ['S1HS0001', 'S1DP0001', 'S9ZZ0001']);
  const extra = r.data.find(w => w.id === 'S9ZZ0001');
  assert.equal(extra.displayModel, 'ZZ');
  assert.equal(extra.model, ''); // 自增表无 Workcenter 原始机型列
});

test('自增表机型经 MachineMap 归一化为工艺卡机型（中间层）', () => {
  resetFakeSS();
  seedMaster();
  seedMachineMap();
  fakeSS[NPI_SS_ID]['NPI_ExtraMachines'] = fakeSheet([EXTRA_HEADER, extraRow('S9ZZ0001', 'DP')]);
  const r = loadMachines('IM');
  const extra = r.data.find(w => w.id === 'S9ZZ0001');
  assert.equal(extra.displayModel, 'DP-MID'); // B列原始值「DP」→ 中间层「DP-MID」
});

test('自增表与主表同机台号时主表优先，不重复', () => {
  resetFakeSS();
  seedMaster();
  fakeSS[NPI_SS_ID] = {
    // 同表既含全新机台又含与主表撞号的机台 → 撞号被去重，新机台正常合并
    NPI_ExtraMachines: fakeSheet([EXTRA_HEADER, extraRow('S1HS0001', '别的机型'), extraRow('S9ZZ0001', 'ZZ')]),
  };
  const r = loadMachines('IM');
  assert.deepEqual(r.data.map(w => w.id), ['S1HS0001', 'S1DP0001', 'S9ZZ0001']);
  assert.equal(r.data.find(w => w.id === 'S1HS0001').model, 'HS'); // 主表值
});

test('自增表机型含「闲置/报废」的机台不合并', () => {
  resetFakeSS();
  seedMaster();
  fakeSS[NPI_SS_ID] = {
    NPI_ExtraMachines: fakeSheet([EXTRA_HEADER, extraRow('S9ZZ0001', '闲置备用'), extraRow('S8AA0001', 'AA')]),
  };
  const r = loadMachines('IM');
  assert.deepEqual(r.data.map(w => w.id), ['S1HS0001', 'S1DP0001', 'S8AA0001']);
});

test('TF 工序不合并自增表（未配置清单工序维持现状）', () => {
  resetFakeSS();
  seedMaster();
  fakeSS[NPI_SS_ID] = {
    NPI_ExtraMachines: fakeSheet([EXTRA_HEADER, extraRow('S9ZZ0001', 'ZZ')]),
  };
  const r = loadMachines('TF');
  assert.equal(r.success, true);
  assert.deepEqual(r.data, []);
});

test('主表机型经 MachineMap 中间层映射 displayModel', () => {
  resetFakeSS();
  seedMaster();
  seedMachineMap();
  const r = loadMachines('IM');
  const dp = r.data.find(w => w.id === 'S1DP0001');
  assert.equal(dp.model, 'DP');
  assert.equal(dp.displayModel, 'DP-MID');
  const hs = r.data.find(w => w.id === 'S1HS0001');
  assert.equal(hs.displayModel, 'HS'); // 无映射时原值
});

// ===== 机型下拉数据源：MachineMap 已确认中间层按工序过滤 =====
test('buildMachineMapModelsByProcess_: 已确认行按工序分组去重排序，非已确认/空值跳过', () => {
  const rows = [
    ['原始机型', '中间层', '工序', '卡', '卡数', '排序', '状态', '备注'],
    ['ENG', 'FCS/ENG', 'IM', 'C1', 1, 1, '已确认', ''],
    ['FCS', 'FCS/ENG', 'IM', 'C1', 1, 1, '已确认', ''],
    ['HT160', 'HIM', 'IM', 'C2', 1, 1, '已确认', ''],
    ['HT250', 'HIM', 'IM', 'C2', 1, 1, '已确认', ''],
    ['DB', 'OMNI-DB', 'IM', 'C3', 1, 1, '已确认', ''],
    ['X', 'TF-X', 'TF', 'C4', 1, 1, '已确认', ''],
    ['Y', 'TF-Y', 'TF', 'C4', 1, 1, '草稿', ''],   // 非已确认 → 跳过
    ['Z', '', 'TF', 'C4', 1, 1, '已确认', ''],      // 中间层空 → 跳过
    ['W', 'PK-W', '', 'C5', 1, 1, '已确认', ''],    // 工序空 → 跳过
  ];
  const out = globalThis.buildMachineMapModelsByProcess_(rows);
  assert.deepEqual(out, { IM: ['FCS/ENG', 'HIM', 'OMNI-DB'], TF: ['TF-X'] });
});

test('loadNPITemplateData 暴露 modelsByProcess（已确认中间层按工序）', () => {
  resetFakeSS();
  seedMachineMap();
  const tpl = JSON.parse(globalThis.loadNPITemplateData());
  assert.deepEqual(tpl.data.machineMap.modelsByProcess, { IM: ['DP-MID'] });
});

test('loadNPIWorkcenterList 响应 machineMapModels 为当前工序的已确认中间层机型（INJ 回退 IM）', () => {
  resetFakeSS();
  seedMaster();
  seedMachineMap();
  const rIM = loadMachines('IM');
  assert.deepEqual(rIM.machineMapModels, ['DP-MID']);
  const rINJ = loadMachines('INJ');
  assert.deepEqual(rINJ.machineMapModels, ['DP-MID']);
});

// ===== addNPIExtraMachine =====
test('机台编号或机型为空 → 失败', () => {
  resetFakeSS();
  seedMaster();
  const r1 = JSON.parse(globalThis.addNPIExtraMachine('', 'HS', '90001'));
  assert.equal(r1.success, false);
  assert.match(r1.message, /机台编号|Machine No/);
  const r2 = JSON.parse(globalThis.addNPIExtraMachine('S9ZZ0001', '  ', '90001'));
  assert.equal(r2.success, false);
  assert.match(r2.message, /机型|Model/);
});

test('机台编号已在主表 → 失败', () => {
  resetFakeSS();
  seedMaster();
  const r = JSON.parse(globalThis.addNPIExtraMachine('S1HS0001', 'HS', '90001'));
  assert.equal(r.success, false);
  assert.match(r.message, /主数据表/);
  assert.equal(fakeSS[NPI_SS_ID]?.['NPI_ExtraMachines'], undefined, '不建表不写入');
});

test('主表存在但标记闲置/报废 → 不视为重复，走自增表新增（与清单过滤规则一致）', () => {
  resetFakeSS();
  fakeSS[NPI_WORKCENTER_SS_ID] = {
    Workcenter: fakeSheet([
      WC_HEADER,
      wcRow('S1HS0001', 'HS'),
      wcRow('H2FCS954', '报废'),
      wcRow('H1FCS955', '闲置'),
    ]),
  };
  const r1 = JSON.parse(globalThis.addNPIExtraMachine('H2FCS954', 'FCS/ENG', '90001'));
  assert.equal(r1.success, true);
  const r2 = JSON.parse(globalThis.addNPIExtraMachine('H1FCS955', 'FCS/ENG', '90001'));
  assert.equal(r2.success, true);
  // 随后 load 可见：清单过滤主表报废/闲置行，自增表合并出新机台
  const list = loadMachines('IM');
  assert.deepEqual(list.data.map(w => w.id), ['S1HS0001', 'H2FCS954', 'H1FCS955']);
});

test('机台编号已在自增表 → 失败', () => {
  resetFakeSS();
  seedMaster();
  fakeSS[NPI_SS_ID] = {
    NPI_ExtraMachines: fakeSheet([EXTRA_HEADER, extraRow('S9ZZ0001', 'ZZ')]),
  };
  const r = JSON.parse(globalThis.addNPIExtraMachine('S9ZZ0001', 'ZZ', '90001'));
  assert.equal(r.success, false);
  assert.match(r.message, /自增|extra/);
  assert.equal(fakeSS[NPI_SS_ID]['NPI_ExtraMachines'].getLastRow(), 2, '未追加新行');
});

test('新增成功：自动建表+表头+追加行，随后 load 可见', () => {
  resetFakeSS();
  seedMaster();
  const r = JSON.parse(globalThis.addNPIExtraMachine('S9ZZ0001', 'ZZ', '90001'));
  assert.equal(r.success, true);
  const sheet = fakeSS[NPI_SS_ID]?.['NPI_ExtraMachines'];
  assert.ok(sheet, '自动创建 NPI_ExtraMachines 表');
  const rows = sheet.getDataRange().getValues();
  assert.equal(rows[0][0], '机台编号', '表头已写入');
  assert.equal(rows[1][0], 'S9ZZ0001');
  assert.equal(rows[1][1], 'ZZ');
  const after = loadMachines('IM');
  assert.deepEqual(after.data.map(w => w.id), ['S1HS0001', 'S1DP0001', 'S9ZZ0001']);
});

test('新增成功后再次新增同机台号 → 失败（防重复）', () => {
  resetFakeSS();
  seedMaster();
  JSON.parse(globalThis.addNPIExtraMachine('S9ZZ0001', 'ZZ', '90001'));
  const r2 = JSON.parse(globalThis.addNPIExtraMachine('S9ZZ0001', 'ZZ', '90002'));
  assert.equal(r2.success, false);
});
