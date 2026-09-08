// NPI 测试计划机台清单 — Node 内置 test runner 测试
// 覆盖：loadNPIWorkcenterList 主表过滤、MachineMap 中间层映射与按工序机型清单
// （机台临时添加已改为纯前端会话内实现，不再有后端自增写入）
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
      wcRow('H2FCS954', '报废'), // D列含「报废」→ 过滤
    ]),
  };
}

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

// ===== loadNPIWorkcenterList 主表行为 =====
test('仅返回主表有效机台（闲置/报废过滤）', () => {
  resetFakeSS();
  seedMaster();
  const r = loadMachines('IM');
  assert.equal(r.success, true);
  assert.deepEqual(r.data.map(w => w.id), ['S1HS0001', 'S1DP0001']);
});

test('TF 工序未配置清单 → 空清单', () => {
  resetFakeSS();
  seedMaster();
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
