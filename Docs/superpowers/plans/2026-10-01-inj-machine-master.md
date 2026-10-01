# 注塑机台主数据维护页实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 EDS 页面「注塑机台主数据维护」，让设备部在网页上编辑「11 - 注塑计划机台」Workcenter 表的 M–T 列（机型/设备类型1/设备类型2/自动化类型/责任人/备份责任人/工艺免检/点检免检），批量保存并写变更日志。

**Architecture:** 沿用现有 GAS 页面模式——Code.js 增加后端函数（读 Workcenter + 三类枚举来源、字段级冲突校验后写回 M–T、写/读变更日志），新增 `INJ_MachineMaster.html` + `INJ_MachineMaster-js.html`（Bootstrap5 + DataTables + Select2 + SweetAlert2 双语），doGet 注册路由，Navigation 加卡片+弹窗入口。纯逻辑（枚举过滤、行定位、冲突校验）提取为纯函数用 Node TDD（测试文件 `inj-machine-master.test.mjs` 放仓库根，`.claspignore` 已排除 `*.test.mjs`，不会被推送 GAS）。

**Tech Stack:** Google Apps Script（Code.js）、Bootstrap 5.3.1、DataTables 1.13.6、Select2 4.0.13、SweetAlert2、Node 22（仅测试）。

**Spec:** `Docs/superpowers/specs/2026-10-01-inj-machine-master-design.md`

## Global Constraints

- Workcenter 表电子表格 ID：`12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM`，sheet 名 `Workcenter`，A1:T1 表头共 20 列，数据 329 行
- 20 列表头顺序（一字不差）：`['Workcenter','Machine Type','机器性能','New Formed Cell','HIM/Auto','VIM-1','VIM-2','VIM-3','VIM-4','Final Machine Type','是否主设备','设备编号','机型','设备类型1','设备类型2','自动化类型','责任人','备份责任人','工艺无需检查Y/N','点检无需检查Y/N']`
- 可编辑列（8 列，0-based 12–19）：`['机型','设备类型1','设备类型2','自动化类型','责任人','备份责任人','工艺无需检查Y/N','点检无需检查Y/N']`；A–L 列**只读，任何写入路径都不得触碰**
- 只改不增不删：不新增行、不删除行
- 枚举来源：
  - 机型 ← 11 表新 sheet `机型选项`（A1=`机型`，A2 起为值）
  - 设备类型1 / 设备类型2 / 自动化类型 ← 表 `1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U` 的 `Tasklist_history`，取 O 列(0-based 14)=`IM` 且 M 列(0-based 12) 含「生效」的 A 列(0-based 0) MachineType 去重
  - 责任人 / 备份责任人 ← 表 `1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM` 的 `userID`，取 O 列(0-based 14)=`INJ` 且 P 列(0-based 15)=`IDL` 的 B 列(0-based 1) NAME 去重；数据从第 3 行（0-based index 2）起，第 1 行为分类行、第 2 行为表头行
  - 工艺/点检免检 ← 复选框：勾选写 `Y`，未勾选写空字符串 `""`
- 变更日志 sheet 名 `变更日志`（同在 11 表），表头：`['时间','工号','姓名','机台号','字段','旧值','新值']`；时间格式 `Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss")`（与 PM 主数据一致）
- 保存必须做字段级冲突校验（现值 != 提交旧值则跳过该字段并回报），且只按行写 M–T 8 列区间
- `google.script.run` 入参 5 万字符上限：前端改动超过 300 条时分批提交
- 页面双语提示沿用现有 `swalTitle(cn,en)` / `swalHtml(cn,en)` helper 模式（每个 -js 文件头部自行定义）
- Git commit 一律 V 格式中文描述：`V20261001.XX_注塑机台主数据_<改动>`
- 测试运行命令：`node --test inj-machine-master.test.mjs`（全套回归：`node --test *.test.mjs`）
- 不做（YAGNI）：新增/删除机台行、编辑 A–L、审批流转、行级锁定、历史回滚、往表里写 data validation、邮件通知、定时触发器

## Review Focus

- **别人同时在 Google Sheets 里改了同一个单元格** —— 保存必须跳过该字段并明确提示，绝不能静默覆盖（Task 2 冲突校验测试 + Task 8 冲突提示）
- **A–L 列被误写** —— 页面只读列在表格里可能正被其他人编辑；写入路径必须只覆盖 M–T 区间（Task 4 断言 A–L 未被改动）
- **枚举源为空或读不到**（Tasklist_history 全被"取代"、userID 没填工序、机型选项 sheet 被清空）—— 下拉要仍能显示机台当前值，不能让用户看到空白格后一保存就清空（Task 7 createdRow 的"当前值兜底 option" + 黄条提示）
- **同一机台号在表中出现重复行** —— 加载时告警、保存只写首行（Task 2 行定位 + Task 3 dupWorkcenters）
- **免检列取消勾选必须写空字符串**（不是 `N`、不是 `FALSE`）—— 下游按 `=== 'Y'` 判断（Task 2 测试 + Task 8 收集逻辑）

---

### Task 1: 枚举过滤纯函数（TDD）

**Files:**
- Modify: `Code.js`（在文件末尾 `// ===== 注塑机台主数据维护 =====` 区块内新增，Task 3/4 继续在此区块扩展）
- Create: `inj-machine-master.test.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `filterMachineTypesFromTasklist_(data) -> string[]` — `data` 为 Tasklist_history 的 `getDataRange().getValues()`（含表头行）
  - `filterINJIDLNames_(data) -> string[]` — `data` 为 userID sheet 的 `getDataRange().getValues()`（含前两行分类/表头）

- [ ] **Step 1: 写失败测试**

创建 `inj-machine-master.test.mjs`（GAS stub 完整照抄 `workcenter-19col.test.mjs` 的 fakeSheet 模式，但 `getRange` 需额外支持 `setValues` 落库、`appendRow` 追加）：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: FAIL — `TypeError: globalThis.filterMachineTypesFromTasklist_ is not a function`（`Code.js` 尚未定义）

- [ ] **Step 3: 写最小实现**

在 `Code.js` 末尾追加：

```js
// ===== 注塑机台主数据维护（INJ Machine Master）=====
// 数据源：11 表 Workcenter（20 列，A 列机台号为主键），只维护 M–T 8 列
var MM_WC_SS_ID = "12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM";
var MM_WC_SHEET_NAME = "Workcenter";
var MM_TYPE_OPTION_SHEET_NAME = "机型选项";
var MM_AUDIT_SHEET_NAME = "变更日志";
var MM_TASKLIST_SS_ID = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
var MM_TASKLIST_SHEET_NAME = "Tasklist_history";
var MM_USERID_SS_ID = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
var MM_USERID_SHEET_NAME = "userID";
var MM_EDIT_HEADERS = ["机型", "设备类型1", "设备类型2", "自动化类型", "责任人", "备份责任人", "工艺无需检查Y/N", "点检无需检查Y/N"];
var MM_AUDIT_HEADERS = ["时间", "工号", "姓名", "机台号", "字段", "旧值", "新值"];

// Tasklist_history 行（含表头）→ Process=IM 且 Status 含「生效」的 MachineType 去重列表
// 列位：A=MachineType(0)、M=Status(12)、O=Process(14)
function filterMachineTypesFromTasklist_(data) {
  var out = [];
  var seen = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    if (String(row[14] || "").trim() !== "IM") continue;
    if (String(row[12] || "").trim().indexOf("生效") === -1) continue;
    var mt = String(row[0] || "").trim();
    if (!mt || seen[mt]) continue;
    seen[mt] = true;
    out.push(mt);
  }
  return out;
}

// userID 行（含前两行分类/表头）→ 工序=INJ 且 职位=IDL 的姓名去重列表
// 列位：B=NAME(1)、O=工序(14)、P=职位(15)；数据从第 3 行（index 2）起
function filterINJIDLNames_(data) {
  var out = [];
  var seen = {};
  for (var i = 2; i < data.length; i++) {
    var row = data[i] || [];
    if (String(row[14] || "").trim() !== "INJ") continue;
    if (String(row[15] || "").trim() !== "IDL") continue;
    var name = String(row[1] || "").trim();
    if (!name || seen[name]) continue;
    seen[name] = true;
    out.push(name);
  }
  return out;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: PASS（2 tests）

- [ ] **Step 5: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Code.js inj-machine-master.test.mjs
git commit -m "V20261001.02_注塑机台主数据_枚举过滤纯函数"
```

---

### Task 2: 行定位与冲突校验纯函数（TDD）

**Files:**
- Modify: `Code.js`（`// ===== 注塑机台主数据维护 =====` 区块内追加）
- Modify: `inj-machine-master.test.mjs`

**Interfaces:**
- Consumes: `MM_EDIT_HEADERS`（Task 1）、`workcenterHeaderIndex_`（Code.js 已有，15236 行）
- Produces:
  - `locateWorkcenterRows_(data) -> { [机台号]: { rowIndex: number, dup: boolean } }` — `rowIndex` 为 1-based sheet 行号；`data` 含表头行
  - `applyMachineMasterChanges_(block, changes) -> { nextBlock, applied, conflicts }`
    - `block`: `Array<Array>`，每行 = `[Workcenter, 机型, 设备类型1, 设备类型2, 自动化类型, 责任人, 备份责任人, 工艺无需检查Y/N, 点检无需检查Y/N]`（9 元素）
    - `changes`: `Array<{机台号, 字段, 旧值, 新值}>`
    - `applied`: `Array<{机台号, 字段, 旧值, 新值, rowIdx}>`，`rowIdx` 为 `block` 内 0-based 行下标
    - `conflicts`: `Array<{机台号, 字段, 旧值, 新值, 现值, 原因}>`，`原因` 取 `"已被他人修改"` 或 `"未找到机台"`

- [ ] **Step 1: 写失败测试**

在 `inj-machine-master.test.mjs` 末尾追加：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: FAIL — `TypeError: globalThis.locateWorkcenterRows_ is not a function`

- [ ] **Step 3: 写最小实现**

在 `Code.js` 的注塑机台主数据区块内追加：

```js
// Workcenter 行（含表头）→ { 机台号: { rowIndex: 1-based 行号, dup: 是否重复出现 } }
// 重复机台号保留首行（与 applyMachineMasterChanges_ 取首行一致）
function locateWorkcenterRows_(data) {
  var cols = workcenterHeaderIndex_(data[0] || []);
  var index = {};
  if (cols["Workcenter"] === undefined) return index;
  for (var i = 1; i < data.length; i++) {
    var wc = String((data[i] || [])[cols["Workcenter"]] || "").trim();
    if (!wc) continue;
    if (index[wc]) { index[wc].dup = true; continue; }
    index[wc] = { rowIndex: i + 1, dup: false };
  }
  return index;
}

// 字段级冲突校验：把 changes 应用到 block（每行 = [Workcenter, ...MM_EDIT_HEADERS]）
// 现值 != 提交旧值 → 跳过该字段并记冲突（他人已改）；返回新块、已应用清单、冲突清单
function applyMachineMasterChanges_(block, changes) {
  var wcToIdx = {};
  for (var i = 0; i < block.length; i++) {
    var wc = String((block[i] || [])[0] || "").trim();
    if (wc && wcToIdx[wc] === undefined) wcToIdx[wc] = i; // 重复机台号取首行
  }
  var nextBlock = block.map(function (r) { return r.slice(); });
  var applied = [];
  var conflicts = [];
  (changes || []).forEach(function (ch) {
    var field = String(ch["字段"] || "");
    var wc = String(ch["机台号"] || "").trim();
    var oldVal = ch["旧值"] === undefined || ch["旧值"] === null ? "" : String(ch["旧值"]);
    var newVal = ch["新值"] === undefined || ch["新值"] === null ? "" : String(ch["新值"]);
    var pos = MM_EDIT_HEADERS.indexOf(field);
    if (pos === -1 || wcToIdx[wc] === undefined) {
      conflicts.push({ 机台号: wc, 字段: field, 旧值: oldVal, 新值: newVal, 现值: "", 原因: "未找到机台" });
      return;
    }
    var idx = wcToIdx[wc];
    var col = pos + 1; // 第 0 列是 Workcenter
    var current = nextBlock[idx][col] === undefined || nextBlock[idx][col] === null ? "" : String(nextBlock[idx][col]);
    if (current !== oldVal) {
      conflicts.push({ 机台号: wc, 字段: field, 旧值: oldVal, 新值: newVal, 现值: current, 原因: "已被他人修改" });
      return;
    }
    nextBlock[idx][col] = newVal;
    applied.push({ 机台号: wc, 字段: field, 旧值: oldVal, 新值: newVal, rowIdx: idx });
  });
  return { nextBlock: nextBlock, applied: applied, conflicts: conflicts };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 5: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Code.js inj-machine-master.test.mjs
git commit -m "V20261001.03_注塑机台主数据_行定位与冲突校验纯函数"
```

---

### Task 3: 后端读取 `get_MachineMasterData` + sheet 保障（TDD）

**Files:**
- Modify: `Code.js`（注塑机台主数据区块内追加）
- Modify: `inj-machine-master.test.mjs`

**Interfaces:**
- Consumes: `MM_*` 常量、`filterMachineTypesFromTasklist_`、`filterINJIDLNames_`、`workcenterHeaderIndex_`
- Produces:
  - `getMM_TypeOptionSheet_(ss) -> Sheet` — 缺则建，A1 写 `机型`
  - `getMM_AuditSheet_(ss) -> Sheet` — 缺则建，写 `MM_AUDIT_HEADERS`
  - `getMM_TypeOptions_(wcData, cols) -> string[]` — 读 `机型选项` A2 起；为空时用 Workcenter M 列去重值回填
  - `getMM_DeviceTypeOptions_() -> string[]`
  - `getMM_OwnerOptions_() -> string[]`
  - `get_MachineMasterData() -> { headers, rows, editHeaders, typeOptions, deviceTypeOptions, ownerOptions, dupWorkcenters } | { error }`
    - `rows`: `Array<object>`，键为 20 个表头名，值一律 `String`，另含 `__rowIndex`（1-based sheet 行号）

- [ ] **Step 1: 写失败测试**

在 `inj-machine-master.test.mjs` 末尾追加：

```js
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
      wcRow({ Workcenter: 'V1FTA463', 机型: '3AX', 设备类型1: 'VIM', 责任人: '王玉峰', 工艺无需检查Y/N: 'Y' }),
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: FAIL — `TypeError: globalThis.get_MachineMasterData is not a function`

- [ ] **Step 3: 写最小实现**

在 `Code.js` 注塑机台主数据区块内追加：

```js
function getMM_TypeOptionSheet_(ss) {
  var ws = ss.getSheetByName(MM_TYPE_OPTION_SHEET_NAME);
  if (!ws) {
    ws = ss.insertSheet(MM_TYPE_OPTION_SHEET_NAME);
    ws.getRange(1, 1).setValue("机型");
  }
  return ws;
}

function getMM_AuditSheet_(ss) {
  var ws = ss.getSheetByName(MM_AUDIT_SHEET_NAME);
  if (!ws) {
    ws = ss.insertSheet(MM_AUDIT_SHEET_NAME);
    ws.getRange(1, 1, 1, MM_AUDIT_HEADERS.length).setValues([MM_AUDIT_HEADERS]);
  }
  return ws;
}

// 机型枚举：读「机型选项」A2 起；为空则用 Workcenter 当前 M 列去重值预填后返回
function getMM_TypeOptions_(wcData, cols) {
  var out = [];
  var seen = {};
  try {
    var ss = SpreadsheetApp.openById(MM_WC_SS_ID);
    var ws = getMM_TypeOptionSheet_(ss);
    var lastRow = ws.getLastRow();
    if (lastRow >= 2) {
      ws.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
        var v = String(r[0] || "").trim();
        if (v && !seen[v]) { seen[v] = true; out.push(v); }
      });
    }
    if (out.length === 0 && wcData && cols && cols["机型"] !== undefined) {
      var seed = [];
      for (var i = 1; i < wcData.length; i++) {
        var v = String((wcData[i] || [])[cols["机型"]] || "").trim();
        if (v && !seen[v]) { seen[v] = true; seed.push(v); out.push(v); }
      }
      if (seed.length > 0) {
        ws.getRange(2, 1, seed.length, 1).setValues(seed.map(function (x) { return [x]; }));
      }
    }
  } catch (e) {
    console.warn("机型枚举读取失败：" + e.toString());
  }
  return out;
}

// 设备类型枚举：Tasklist_history 中 Process=IM 且 Status 含「生效」的 MachineType
function getMM_DeviceTypeOptions_() {
  try {
    var ws = SpreadsheetApp.openById(MM_TASKLIST_SS_ID).getSheetByName(MM_TASKLIST_SHEET_NAME);
    if (!ws) return [];
    return filterMachineTypesFromTasklist_(ws.getDataRange().getValues());
  } catch (e) {
    console.warn("设备类型枚举读取失败：" + e.toString());
    return [];
  }
}

// 责任人枚举：userID 中 工序=INJ 且 职位=IDL 的姓名
function getMM_OwnerOptions_() {
  try {
    var ws = SpreadsheetApp.openById(MM_USERID_SS_ID).getSheetByName(MM_USERID_SHEET_NAME);
    if (!ws) return [];
    return filterINJIDLNames_(ws.getDataRange().getValues());
  } catch (e) {
    console.warn("责任人枚举读取失败：" + e.toString());
    return [];
  }
}

function get_MachineMasterData() {
  try {
    var ss = SpreadsheetApp.openById(MM_WC_SS_ID);
    var ws = ss.getSheetByName(MM_WC_SHEET_NAME);
    if (!ws) return { headers: [], rows: [], error: "Workcenter sheet 未找到" };
    var lastRow = ws.getLastRow();
    var lastCol = ws.getLastColumn();
    if (lastRow < 2) return { headers: [], rows: [], error: "Workcenter 无数据行" };

    var data = ws.getRange(1, 1, lastRow, lastCol).getValues();
    var head = (data[0] || []).map(function (h) { return String(h || "").trim(); });
    var cols = workcenterHeaderIndex_(head);
    var required = ["Workcenter"].concat(MM_EDIT_HEADERS);
    var missing = required.filter(function (n) { return cols[n] === undefined; });
    if (missing.length > 0) {
      return { headers: head, rows: [], error: "Workcenter 表头缺少字段: " + missing.join("、") };
    }

    var rows = [];
    var dupWorkcenters = [];
    var seenWc = {};
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < head.length; j++) {
        if (!head[j]) continue;
        var v = data[i][j];
        obj[head[j]] = v === undefined || v === null ? "" : String(v);
      }
      var wc = String(obj["Workcenter"] || "").trim();
      if (!wc) continue;
      if (seenWc[wc]) dupWorkcenters.push(wc);
      seenWc[wc] = true;
      obj["__rowIndex"] = i + 1;
      rows.push(obj);
    }

    return {
      headers: head,
      rows: rows,
      editHeaders: MM_EDIT_HEADERS,
      typeOptions: getMM_TypeOptions_(data, cols),
      deviceTypeOptions: getMM_DeviceTypeOptions_(),
      ownerOptions: getMM_OwnerOptions_(),
      dupWorkcenters: dupWorkcenters,
    };
  } catch (e) {
    return { headers: [], rows: [], error: e.toString() };
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: PASS（11 tests）

- [ ] **Step 5: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Code.js inj-machine-master.test.mjs
git commit -m "V20261001.04_注塑机台主数据_后端读取与机型选项保障"
```

---

### Task 4: 后端保存 `save_MachineMasterData` + 变更日志（TDD）

**Files:**
- Modify: `Code.js`（注塑机台主数据区块内追加）
- Modify: `inj-machine-master.test.mjs`

**Interfaces:**
- Consumes: `applyMachineMasterChanges_`、`locateWorkcenterRows_`、`getMM_AuditSheet_`、`MM_EDIT_HEADERS`、`MM_AUDIT_HEADERS`
- Produces:
  - `save_MachineMasterData(changes, userCode, userName) -> { ok: boolean, applied, conflicts } | { ok: false, message }`
  - `get_MachineMasterAuditLog(limit) -> { rows } | { rows: [], error }` — `rows` 倒序（最新在前），每行为 7 个表头名到值的对象
  - `appendMM_AuditLog_(ss, userCode, userName, applied)` — 一次性批量写日志

- [ ] **Step 1: 写失败测试**

在 `inj-machine-master.test.mjs` 末尾追加：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: FAIL — `TypeError: globalThis.save_MachineMasterData is not a function`

- [ ] **Step 3: 写最小实现**

在 `Code.js` 注塑机台主数据区块内追加：

```js
// 批量写变更日志（一次 setValues，附在最后一行之后）
function appendMM_AuditLog_(ss, userCode, userName, applied) {
  if (!applied || applied.length === 0) return;
  var ws = getMM_AuditSheet_(ss);
  var now = Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
  var rows = applied.map(function (a) {
    return [now, userCode || "", userName || "", a["机台号"] || "", a["字段"] || "", a["旧值"] || "", a["新值"] || ""];
  });
  ws.getRange(ws.getLastRow() + 1, 1, rows.length, MM_AUDIT_HEADERS.length).setValues(rows);
}

function save_MachineMasterData(changes, userCode, userName) {
  try {
    if (!changes || changes.length === 0) return { ok: true, applied: [], conflicts: [] };

    var ss = SpreadsheetApp.openById(MM_WC_SS_ID);
    var ws = ss.getSheetByName(MM_WC_SHEET_NAME);
    if (!ws) return { ok: false, message: "Workcenter sheet 未找到" };

    var lastRow = ws.getLastRow();
    var lastCol = ws.getLastColumn();
    if (lastRow < 2) return { ok: false, message: "Workcenter 无数据行" };
    var data = ws.getRange(1, 1, lastRow, lastCol).getValues();
    var cols = workcenterHeaderIndex_(data[0] || []);
    var required = ["Workcenter"].concat(MM_EDIT_HEADERS);
    var missing = required.filter(function (n) { return cols[n] === undefined; });
    if (missing.length > 0) {
      return { ok: false, message: "Workcenter 表头缺少字段: " + missing.join("、") };
    }

    // 可编辑列必须是连续区间，否则中止（防止误写到 A–L）
    var editStart0 = cols[MM_EDIT_HEADERS[0]];
    for (var k = 0; k < MM_EDIT_HEADERS.length; k++) {
      if (cols[MM_EDIT_HEADERS[k]] !== editStart0 + k) {
        return { ok: false, message: "Workcenter 可编辑列不在连续区间，已中止写入" };
      }
    }

    // 组装当前块：每行 = [Workcenter, ...8 个可编辑列]
    var block = [];
    for (var i = 1; i < data.length; i++) {
      var row = [String(data[i][cols["Workcenter"]] || "").trim()];
      for (var m = 0; m < MM_EDIT_HEADERS.length; m++) {
        var cv = data[i][cols[MM_EDIT_HEADERS[m]]];
        row.push(cv === undefined || cv === null ? "" : String(cv));
      }
      block.push(row);
    }

    var res = applyMachineMasterChanges_(block, changes);
    if (res.applied.length === 0) {
      return { ok: true, applied: [], conflicts: res.conflicts };
    }

    // 只对有应用改动的行写 M–T 8 列（绝不触碰 A–L）
    var changedRowIdx = {};
    res.applied.forEach(function (a) { changedRowIdx[a.rowIdx] = true; });
    Object.keys(changedRowIdx).forEach(function (idxStr) {
      var idx = parseInt(idxStr, 10);
      var rowValues = res.nextBlock[idx].slice(1); // 去掉 Workcenter 列
      ws.getRange(idx + 2, editStart0 + 1, 1, MM_EDIT_HEADERS.length).setValues([rowValues]);
    });

    appendMM_AuditLog_(ss, userCode, userName, res.applied);
    return { ok: true, applied: res.applied, conflicts: res.conflicts };
  } catch (e) {
    return { ok: false, message: e.toString() };
  }
}

function get_MachineMasterAuditLog(limit) {
  try {
    var ss = SpreadsheetApp.openById(MM_WC_SS_ID);
    var ws = getMM_AuditSheet_(ss);
    var lastRow = ws.getLastRow();
    if (lastRow < 2) return { rows: [] };
    var take = Math.min(limit || 200, lastRow - 1);
    var vals = ws.getRange(lastRow - take + 1, 1, take, MM_AUDIT_HEADERS.length).getValues();
    var rows = vals.map(function (r) {
      var o = {};
      for (var j = 0; j < MM_AUDIT_HEADERS.length; j++) {
        var v = r[j];
        o[MM_AUDIT_HEADERS[j]] = v === undefined || v === null ? "" : String(v);
      }
      return o;
    });
    rows.reverse(); // 最新在前
    return { rows: rows };
  } catch (e) {
    return { rows: [], error: e.toString() };
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test inj-machine-master.test.mjs`
Expected: PASS（16 tests）

- [ ] **Step 5: 运行全套回归 + 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
node --test *.test.mjs
git add Code.js inj-machine-master.test.mjs
git commit -m "V20261001.05_注塑机台主数据_保存冲突校验与变更日志"
```

Expected: 全套测试通过（基线 334 条 + 新增 16 条 = 350 条）

---

### Task 5: 路由与页面加载函数

**Files:**
- Modify: `Code.js`（`doGet` 路由注册区，`Route.path("PM_MasterData", ...)` 之后一行；以及 `loadPM_MasterData` 函数之后）

**Interfaces:**
- Consumes: `render()`、`getReleaseWebPage()`、`webIconUrl`（均为现有全局）
- Produces: `Route.path("INJ_MachineMaster", loadINJMachineMaster)`；`loadINJMachineMaster(intoWebUrl, intoWebLoginId, intoWebLoginName, intoWebLoginType)`

- [ ] **Step 1: 注册路由**

在 `Code.js` 找到这一行：

```js
  Route.path("PM_MasterData", loadPM_MasterData); // 保养主数据管理页
```

在其后插入：

```js
  Route.path("INJ_MachineMaster", loadINJMachineMaster); // 注塑机台主数据维护页
```

- [ ] **Step 2: 新增加载函数**

在 `Code.js` 找到 `loadPM_MasterData` 函数的结束（即 `loadHandover_1_0` 之前），插入：

```js
function loadINJMachineMaster(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  let webPage = getReleaseWebPage();
  return render("INJ_MachineMaster", {
    webPage: webPage,
    intoWebID: intoWebLoginId || "",
    intoWebName: intoWebLoginName || "",
    intoWebType: intoWebLoginType || "",
  })
    .setTitle("注塑机台主数据 | IM Machine Master Data")
    .setFaviconUrl(webIconUrl);
}
```

- [ ] **Step 3: 语法检查**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --check Code.js && node --test inj-machine-master.test.mjs`
Expected: `node --check` 无输出（通过）；测试仍全绿

- [ ] **Step 4: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Code.js
git commit -m "V20261001.06_注塑机台主数据_路由与加载函数"
```

---

### Task 6: 页面 HTML 骨架

**Files:**
- Create: `INJ_MachineMaster.html`

**Interfaces:**
- Consumes: `<?!=include(...) ?>` 现有库文件；模板变量 `intoWebID` / `intoWebName` / `intoWebType` / `webPage`
- Produces: DOM 契约供 Task 7 使用 —— `#tableMaster`（主表）、`#filterWorkcenter`、`#filterMachineType`、`#filterDeviceType`、`#filterOwner`、`#filterCheck`、`#btnSave`、`#btnRevert`、`#btnRefresh`、`#btnAuditLog`、`#dirtyCount`、`#dupWarn`、`#enumWarn`、`#auditLogModal`、`#tableAuditLog`、`#name`

- [ ] **Step 1: 创建页面**

创建 `INJ_MachineMaster.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <base target="_top">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <?!=include("Kez_Bootstrap@5.3.1_css");?>
    <?!=include("Kez_datatables@1.11.5_css");?>
    <?!=include("kez_Datatables_css");?>
    <?!=include("Kez_Select2@4.0.13_css");?>
    <?!=include("Kez_Select2-bootstrap_css");?>
    <?!=include("CSS");?>
    <?!=include("Compressor_js");?>
    <?!=include("Kez_sweetalert2_js");?>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

    <style>
        body { background: #f5f6f8; }

        .welcome-bar {
            background: #fff;
            border-left: 4px solid #E60012;
            padding: 10px 18px;
            margin: 12px 0 14px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .welcome-bar .greet { color: #333; font-size: 16px; }
        .welcome-bar .greet #name { color: #E60012; font-weight: 600; }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #6c757d;
            letter-spacing: 1px;
            margin: 18px 0 10px;
            border-left: 3px solid #E60012;
            padding-left: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
        }
        .section-title .toolbar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .section-title .toolbar .btn { font-size: 12px; padding: 4px 10px; }
        .section-title .toolbar .dirty-tip { font-size: 12px; color: #E60012; font-weight: 600; }

        .filter-bar {
            background: #fff;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .filter-bar .form-label { font-size: 12px; color: #6c757d; }

        .table-wrapper {
            background: #fff;
            border-radius: 0 0 8px 8px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        #tableMaster thead th, #tableAuditLog thead th {
            background-color: #E60012 !important;
            color: white !important;
            position: sticky;
            top: 0;
            z-index: 10;
            text-align: center !important;
            white-space: nowrap;
        }
        #tableMaster th, #tableMaster td, #tableAuditLog th, #tableAuditLog td {
            padding: 5px 6px;
        }
        #tableMaster td { text-align: center; vertical-align: middle; }
        /* A–L 只读列灰底 */
        #tableMaster td.readonly-cell { background: #f1f3f5; color: #495057; }
        /* 改动单元格黄底 */
        #tableMaster td.cell-dirty { background: #fff3cd !important; }
        #tableMaster td .cell-select { min-width: 92px; font-size: 12px; padding: 2px 6px; }
        #tableMaster td .cell-check { width: 16px; height: 16px; cursor: pointer; }

        #tableAuditLog td { font-size: 12px; }

        .select2-container--bootstrap .select2-selection--single {
            height: 28px;
            padding: 0 !important;
            font-size: 12px;
            border-color: #ced4da;
            display: flex;
            align-items: center;
        }
        .select2-container--bootstrap .select2-selection--single .select2-selection__rendered {
            line-height: 28px;
            padding: 0 22px 0 8px;
            color: #333;
            width: 100%;
        }
        .select2-container--bootstrap.select2-container--focus .select2-selection,
        .select2-container--bootstrap.select2-container--open .select2-selection {
            border-color: #E60012;
            box-shadow: 0 0 0 0.15rem rgba(230,0,18,0.15);
        }
        .select2-dropdown { border-color: #E60012; font-size: 12px; }
        .select2-results__option--highlighted[aria-selected],
        .select2-container--bootstrap .select2-results__option--highlighted[aria-selected] {
            background-color: #E60012 !important;
            color: white !important;
        }
    </style>
</head>

<body>
    <!-- 顶部 navbar -->
    <nav class="navbar navbar-expand-lg bg-nav">
        <div class="container-fluid">
            <span class="navbar-brand">
                <span class="title-cn">注塑机台主数据</span>
                <span class="title-en">IM Machine Master Data</span>
            </span>
            <span class="navbar-text text-white" style="font-size:13px;">EDS</span>
        </div>
    </nav>

    <div class="container-fluid">
        <!-- 欢迎条 -->
        <div class="welcome-bar">
            <div class="greet">你好，<span id="name"></span></div>
            <div class="perm-info">
                <span class="badge bg-secondary" id="userLevelBadge">编辑权限 / Edit</span>
            </div>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
            <div class="row g-2 align-items-end">
                <div class="col-6 col-md-3 col-lg-2">
                    <label class="form-label">机台号<br>Workcenter</label>
                    <input id="filterWorkcenter" class="form-control form-control-sm" placeholder="关键字">
                </div>
                <div class="col-6 col-md-3 col-lg-2">
                    <label class="form-label">机型<br>Machine Model</label>
                    <select id="filterMachineType" class="form-select form-select-sm"></select>
                </div>
                <div class="col-6 col-md-3 col-lg-2">
                    <label class="form-label">设备类型1<br>Device Type 1</label>
                    <select id="filterDeviceType" class="form-select form-select-sm"></select>
                </div>
                <div class="col-6 col-md-3 col-lg-2">
                    <label class="form-label">责任人<br>Owner</label>
                    <select id="filterOwner" class="form-select form-select-sm"></select>
                </div>
                <div class="col-6 col-md-3 col-lg-2">
                    <label class="form-label">免检状态<br>No-Check</label>
                    <select id="filterCheck" class="form-select form-select-sm">
                        <option value="">全部 / All</option>
                        <option value="craft">工艺免检 / Craft</option>
                        <option value="point">点检免检 / Point</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 分组：主数据表格 -->
        <div class="section-title">
            注塑机台主数据 / IM MACHINE MASTER
            <span class="toolbar">
                <span class="dirty-tip">待保存 <span id="dirtyCount">0</span> 项 / Pending</span>
                <button type="button" class="btn btn-primary" id="btnSave">保存<br>Save</button>
                <button type="button" class="btn btn-secondary" id="btnRevert">撤销更改<br>Revert</button>
                <button type="button" class="btn btn-secondary" id="btnRefresh">刷新<br>Refresh</button>
                <button type="button" class="btn btn-secondary" id="btnAuditLog">变更日志<br>Audit Log</button>
            </span>
        </div>
        <div class="alert alert-warning py-2 d-none" id="dupWarn" style="font-size:13px;"></div>
        <div class="alert alert-warning py-2 d-none" id="enumWarn" style="font-size:13px;"></div>
        <div class="table-wrapper">
            <table id="tableMaster" class="display bilingual-table" style="width:100%"></table>
        </div>
    </div>

    <!-- 变更日志弹窗 -->
    <div class="modal fade" id="auditLogModal" tabindex="-1" aria-labelledby="auditLogModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="auditLogModalLabel">变更日志 / Audit Log</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body modal-domain-daily">
                    <div class="row g-2 mb-2">
                        <div class="col-6 col-md-4">
                            <label class="form-label" style="font-size:12px;color:#6c757d;">机台号<br>Workcenter</label>
                            <input id="auditFilterWorkcenter" class="form-control form-control-sm" placeholder="关键字">
                        </div>
                    </div>
                    <table id="tableAuditLog" class="display bilingual-table" style="width:100%"></table>
                </div>
            </div>
        </div>
    </div>

<?!=include("Kez_jquery@3.6.4_js") ?>
<?!=include("Kez_datatables@1.13.6_js") ?>
<?!=include("Kez_bootstrap@5.3.1_js") ?>
<?!=include("Kez_select2@4.0.13_js") ?>
<?!=include("Kez_sweetalert2_js") ?>
<?!=include("INJ_MachineMaster-js");?>
</body>
</html>
```

- [ ] **Step 2: 创建空的 JS 占位文件**

创建 `INJ_MachineMaster-js.html`（Task 7/8 填充）：

```html
<script>
  // 注塑机台主数据维护页逻辑（Task 7/8 实现）
</script>
```

- [ ] **Step 3: 校验 include 名称与文件都存在**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && ls INJ_MachineMaster.html INJ_MachineMaster-js.html Kez_Bootstrap@5.3.1_css.html Kez_datatables@1.11.5_css.html kez_Datatables_css.html Kez_Select2@4.0.13_css.html Kez_Select2-bootstrap_css.html`
Expected: 7 个文件全部存在（`Kez_sweetalert2_js.html`、`Kez_jquery@3.6.4_js.html`、`Kez_datatables@1.13.6_js.html`、`Kez_bootstrap@5.3.1_js.html`、`Kez_select2@4.0.13_js.html` 见仓库根目录，已确认存在）

- [ ] **Step 4: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add INJ_MachineMaster.html INJ_MachineMaster-js.html
git commit -m "V20261001.07_注塑机台主数据_页面骨架"
```

---

### Task 7: 页面 JS —— 加载、渲染、筛选

**Files:**
- Modify: `INJ_MachineMaster-js.html`（整体替换 Task 6 的占位内容）

**Interfaces:**
- Consumes: 后端 `get_MachineMasterData()`（Task 3 的返回结构）；Task 6 的 DOM id 契约
- Produces（供 Task 8 使用）：
  - 全局 `masterRows`、`options`、`origMap`、`table`、`EDIT_FIELDS`、`CHECK_FIELDS`、`OWNER_FIELDS`、`EDIT_START`
  - `loadMachineMaster() -> Promise`
  - `renderTable()`
  - `initFilters()`
  - `escapeAttr(s)`

- [ ] **Step 1: 写页面 JS**

把 `INJ_MachineMaster-js.html` 整体替换为：

```html
<script>
  // 双语 Swal 提示 helper：中文在上，英文在下（小字号、灰色）
  const swalTitle = (cn, en) => `${cn}<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">${en}</span>`;
  const swalHtml = (cn, en) => `<div>${cn}<div style="font-size:0.85em;color:#888;margin-top:6px;line-height:1.4;">${en}</div></div>`;

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let global_ID = sessionStorage.getItem('ID') || '';
  let global_Name = sessionStorage.getItem('Name') || '';
  $('#name').text(global_Name);

  // A 列 Workcenter 在 0-based 12 之前为只读列
  const EDIT_START = 12;
  const EDIT_FIELDS = ['机型', '设备类型1', '设备类型2', '自动化类型', '责任人', '备份责任人', '工艺无需检查Y/N', '点检无需检查Y/N'];
  const CHECK_FIELDS = ['工艺无需检查Y/N', '点检无需检查Y/N'];
  const OWNER_FIELDS = ['责任人', '备份责任人'];
  const ALL_HEADERS = ['Workcenter', 'Machine Type', '机器性能', 'New Formed Cell', 'HIM/Auto', 'VIM-1', 'VIM-2', 'VIM-3', 'VIM-4', 'Final Machine Type', '是否主设备', '设备编号', '机型', '设备类型1', '设备类型2', '自动化类型', '责任人', '备份责任人', '工艺无需检查Y/N', '点检无需检查Y/N'];
  const TITLES = {
    'Workcenter': '机台号<br>Workcenter',
    'Machine Type': '机器类型<br>Machine Type',
    '机器性能': '机器性能<br>Performance',
    'New Formed Cell': '成型单元<br>New Formed Cell',
    'HIM/Auto': 'HIM/Auto',
    'Final Machine Type': '最终机型<br>Final Machine Type',
    '是否主设备': '主设备<br>Main',
    '设备编号': '设备编号<br>Equipment No.',
    '机型': '机型<br>Model',
    '设备类型1': '设备类型1<br>Device Type 1',
    '设备类型2': '设备类型2<br>Device Type 2',
    '自动化类型': '自动化类型<br>Automation',
    '责任人': '责任人<br>Owner',
    '备份责任人': '备份责任人<br>Backup Owner',
    '工艺无需检查Y/N': '工艺免检<br>Craft No-Check',
    '点检无需检查Y/N': '点检免检<br>Point No-Check'
  };

  let masterRows = [];
  let options = { '机型': [], '设备类型1': [], '设备类型2': [], '自动化类型': [], '责任人': [], '备份责任人': [] };
  let origMap = {};   // 机台号 → { 字段: 加载时原值 }
  let table = null;
  let dirtyCount = 0;

  function loadMachineMaster() {
    return new Promise((resolve, reject) => {
      google.script.run.withSuccessHandler(r => {
        if (!r || !r.rows || r.error) { reject(new Error((r && r.error) || '加载失败')); return; }
        masterRows = r.rows;
        options['机型'] = r.typeOptions || [];
        options['设备类型1'] = options['设备类型2'] = options['自动化类型'] = r.deviceTypeOptions || [];
        options['责任人'] = options['备份责任人'] = r.ownerOptions || [];
        origMap = {};
        masterRows.forEach(row => {
          const wc = String(row['Workcenter'] || '').trim();
          const o = {};
          EDIT_FIELDS.forEach(f => { o[f] = String(row[f] || ''); });
          origMap[wc] = o;
        });
        // 重复机台号 / 空枚举提醒
        const dups = r.dupWorkcenters || [];
        if (dups.length > 0) {
          $('#dupWarn').removeClass('d-none').html('Workcenter 表存在重复机台号：' + escapeAttr(dups.join('、')) + '。保存时只写首行。<br>Duplicate workcenters found; only the first row is written.');
        } else {
          $('#dupWarn').addClass('d-none');
        }
        const emptyEnums = [];
        if (!options['机型'].length) emptyEnums.push('机型选项');
        if (!options['设备类型1'].length) emptyEnums.push('Tasklist_history（设备类型）');
        if (!options['责任人'].length) emptyEnums.push('userID（责任人）');
        if (emptyEnums.length > 0) {
          $('#enumWarn').removeClass('d-none').html('以下枚举来源为空，下拉仅显示各机台当前值：' + escapeAttr(emptyEnums.join('、')) + '<br>Empty option sources: ' + escapeAttr(emptyEnums.join(', ')));
        } else {
          $('#enumWarn').addClass('d-none');
        }
        resolve();
      }).withFailureHandler(reject).get_MachineMasterData();
    });
  }

  function destroySelect2() {
    if (!$.fn.select2) return;
    $('#tableMaster .cell-select').each(function () {
      try { $(this).select2('destroy'); } catch (e) { /* 未初始化的元素忽略 */ }
    });
  }

  function renderTable() {
    destroySelect2();
    if (table) { table.destroy(); }
    const columns = ALL_HEADERS.map(h => ({ title: TITLES[h] || h, data: h, defaultContent: '' }));
    table = $('#tableMaster').DataTable({
      data: masterRows,
      columns: columns,
      order: [[0, 'asc']],
      pageLength: 25,
      scrollX: true,
      autoWidth: false,
      deferRender: false,
      createdRow: function (row, data) {
        $(row).attr('data-wc', String(data['Workcenter'] || '').trim());
        // 只读列灰底
        for (let i = 0; i < EDIT_START; i++) { $('td', row).eq(i).addClass('readonly-cell'); }
        // 可编辑列渲染控件
        EDIT_FIELDS.forEach((f, i) => {
          const $cell = $('td', row).eq(EDIT_START + i);
          const val = String(data[f] || '');
          if (CHECK_FIELDS.indexOf(f) >= 0) {
            $cell.html(`<input type="checkbox" class="cell-check" data-field="${f}"${val === 'Y' ? ' checked' : ''}>`);
            return;
          }
          const list = options[f] || [];
          const opts = ['<option value=""></option>'];
          list.forEach(o => opts.push(`<option${o === val ? ' selected' : ''}>${escapeAttr(o)}</option>`));
          // 当前值不在枚举源里时补一个，避免显示空白后被误存为空
          if (val && list.indexOf(val) < 0) opts.push(`<option selected>${escapeAttr(val)}</option>`);
          $cell.html(`<select class="form-select form-select-sm cell-select" data-field="${f}">${opts.join('')}</select>`);
        });
      },
      drawCallback: function () {
        // 责任人/备份责任人 Select2 增强；失败时原生下拉仍可用
        try {
          if ($.fn.select2) {
            $('#tableMaster .cell-select').filter(function () { return OWNER_FIELDS.indexOf($(this).data('field')) >= 0; })
              .select2({ dropdownParent: $('.table-wrapper'), width: '100%' });
          }
        } catch (e) { console.warn('Select2 初始化失败，退回原生下拉', e); }
      }
    });
    updateDirty();
  }

  function collectChanges() {
    const changes = [];
    if (!table) return changes;
    table.rows().every(function () {
      const $row = $(this.node());
      const wc = $row.attr('data-wc') || '';
      const orig = origMap[wc];
      if (!orig) return;
      EDIT_FIELDS.forEach(f => {
        const $el = $row.find(`[data-field="${f}"]`);
        if ($el.length === 0) return;
        const val = CHECK_FIELDS.indexOf(f) >= 0 ? ($el.prop('checked') ? 'Y' : '') : String($el.val() || '');
        const oldVal = String(orig[f] || '');
        if (val !== oldVal) {
          changes.push({ 机台号: wc, 字段: f, 旧值: oldVal, 新值: val });
          $el.closest('td').addClass('cell-dirty');
        } else {
          $el.closest('td').removeClass('cell-dirty');
        }
      });
    });
    return changes;
  }

  function updateDirty() {
    dirtyCount = collectChanges().length;
    $('#dirtyCount').text(dirtyCount);
    return dirtyCount;
  }

  function fillFilterSelect(sel, list) {
    const $s = $(sel);
    const cur = $s.val();
    $s.empty().append('<option value="">全部 / All</option>');
    list.forEach(v => $s.append(`<option value="${escapeAttr(v)}">${escapeAttr(v)}</option>`));
    if (cur) $s.val(cur);
  }

  let checkFilter = '';
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    if (settings.nTable.id !== 'tableMaster') return true;
    if (!checkFilter) return true;
    const row = settings.aoData[dataIndex]._aData || {};
    if (checkFilter === 'craft') return String(row['工艺无需检查Y/N'] || '') === 'Y';
    if (checkFilter === 'point') return String(row['点检无需检查Y/N'] || '') === 'Y';
    return true;
  });

  function initFilters() {
    fillFilterSelect('#filterMachineType', options['机型']);
    fillFilterSelect('#filterDeviceType', options['设备类型1']);
    fillFilterSelect('#filterOwner', options['责任人']);
    // 每次 reloadAll 后都会重新调用本函数，先解绑避免事件重复叠加
    $('#filterWorkcenter').off('keyup change').on('keyup change', function () {
      table.column(0).search(this.value).draw();
    });
    $('#filterMachineType').off('change').on('change', function () { table.column(12).search(this.value).draw(); });
    $('#filterDeviceType').off('change').on('change', function () { table.column(13).search(this.value).draw(); });
    $('#filterOwner').off('change').on('change', function () { table.column(16).search(this.value).draw(); });
    $('#filterCheck').off('change').on('change', function () { checkFilter = this.value; table.draw(); });
  }

  function reloadAll() {
    return loadMachineMaster().then(() => { renderTable(); initFilters(); });
  }

  $(document).ready(function () {
    Swal.fire({ title: swalTitle('加载中...', 'Loading...'), allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    reloadAll().then(() => Swal.close()).catch(e => {
      Swal.close();
      Swal.fire({ icon: 'error', title: swalTitle('加载失败', 'Load Failed'), html: swalHtml(String(e.message || e), '') });
    });
    $(document).on('change', '#tableMaster .cell-select, #tableMaster .cell-check', updateDirty);
  });
</script>
```

- [ ] **Step 2: 语法检查**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && sed 's/<\/?script[^>]*>//g' INJ_MachineMaster-js.html > /tmp/mm-js-check.js && node --check /tmp/mm-js-check.js`
Expected: 无输出（语法通过）

- [ ] **Step 3: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add INJ_MachineMaster-js.html
git commit -m "V20261001.08_注塑机台主数据_页面加载渲染与筛选"
```

---

### Task 8: 页面 JS —— 编辑、保存、冲突提示、日志弹窗、关页拦截

**Files:**
- Modify: `INJ_MachineMaster-js.html`（在 Task 7 的 `$(document).ready` 之前插入新函数，并在 ready 内绑定按钮）

**Interfaces:**
- Consumes: Task 7 的 `collectChanges()` / `updateDirty()` / `reloadAll()` / `origMap` / `dirtyCount`；后端 `save_MachineMasterData(changes, userCode, userName)`、`get_MachineMasterAuditLog(limit)`
- Produces: 页面交互闭环（保存 / 撤销 / 刷新 / 日志 / 关页拦截）

- [ ] **Step 1: 追加保存与日志代码**

在 `INJ_MachineMaster-js.html` 中 `function reloadAll()` 之后、`$(document).ready(...)` 之前插入：

```js
  const CHUNK_SIZE = 300; // google.script.run 入参 5 万字符上限保护

  function submitChanges(changes) {
    const batches = [];
    for (let i = 0; i < changes.length; i += CHUNK_SIZE) batches.push(changes.slice(i, i + CHUNK_SIZE));
    const applied = [];
    const conflicts = [];
    return batches.reduce((p, batch) => p.then(() => new Promise((resolve, reject) => {
      google.script.run.withSuccessHandler(r => {
        if (r && r.ok) {
          applied.push(...(r.applied || []));
          conflicts.push(...(r.conflicts || []));
          resolve();
        } else {
          reject(new Error((r && r.message) || '保存失败'));
        }
      }).withFailureHandler(reject).save_MachineMasterData(batch, global_ID, global_Name);
    })), Promise.resolve()).then(() => ({ applied: applied, conflicts: conflicts }));
  }

  function showConflicts(conflicts) {
    const shown = conflicts.slice(0, 10).map(c =>
      `<div style="font-size:12px;text-align:left;">${escapeAttr(c['机台号'])} · ${escapeAttr(c['字段'])}：表中现值「${escapeAttr(c['现值'])}」≠ 提交旧值「${escapeAttr(c['旧值'])}」（${escapeAttr(c['原因'])}）</div>`
    ).join('');
    const more = conflicts.length > 10 ? `<div style="font-size:12px;color:#888;">…另有 ${conflicts.length - 10} 条</div>` : '';
    Swal.fire({
      icon: 'warning',
      title: swalTitle('部分字段未保存', 'Some fields not saved'),
      html: `<div>以下字段已被他人修改或机台不存在，已跳过：</div>${shown}${more}`,
      confirmButtonText: '知道了 / OK'
    });
  }

  $('#btnSave').on('click', function () {
    const changes = collectChanges();
    if (changes.length === 0) {
      Swal.fire({ icon: 'info', title: swalTitle('没有需要保存的改动', 'No changes'), timer: 1200, showConfirmButton: false });
      return;
    }
    Swal.fire({
      title: swalTitle('保存 ' + changes.length + ' 项改动？', 'Save changes?'),
      html: swalHtml('将只写入 M–T 列（机型/设备类型/自动化类型/责任人/备份责任人/免检标记），A–L 列不受影响。', 'Only columns M–T will be written.'),
      icon: 'question', showCancelButton: true, confirmButtonText: '保存 / Save', cancelButtonText: '取消 / Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;
      Swal.fire({ title: swalTitle('保存中...', 'Saving...'), allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
      submitChanges(changes).then(res => {
        const conflicts = res.conflicts || [];
        return reloadAll().then(() => {
          if (conflicts.length > 0) { showConflicts(conflicts); return; }
          Swal.fire({ icon: 'success', title: swalTitle('已保存 ' + res.applied.length + ' 项', 'Saved'), timer: 1500, showConfirmButton: false });
        });
      }).catch(e => {
        Swal.close();
        Swal.fire({ icon: 'error', title: swalTitle('保存失败', 'Save Failed'), html: swalHtml('改动仍保留在页面上，可重试。' + String(e.message || e), 'Your changes are kept; please retry.') });
      });
    });
  });

  $('#btnRevert').on('click', function () {
    if (collectChanges().length === 0) {
      Swal.fire({ icon: 'info', title: swalTitle('没有需要撤销的改动', 'Nothing to revert'), timer: 1200, showConfirmButton: false });
      return;
    }
    Swal.fire({
      title: swalTitle('撤销所有未保存的改动？', 'Revert unsaved changes?'),
      icon: 'warning', showCancelButton: true, confirmButtonText: '撤销 / Revert', cancelButtonText: '取消 / Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;
      renderTable(); // 用 masterRows（加载时的数据）重绘，回到原值
      Swal.fire({ icon: 'success', title: swalTitle('已撤销', 'Reverted'), timer: 1000, showConfirmButton: false });
    });
  });

  $('#btnRefresh').on('click', function () {
    if (collectChanges().length > 0) {
      Swal.fire({
        title: swalTitle('有未保存的改动', 'Unsaved changes'),
        html: swalHtml('刷新会丢弃这些改动，确定继续？', 'Refresh will discard them. Continue?'),
        icon: 'warning', showCancelButton: true, confirmButtonText: '刷新 / Refresh', cancelButtonText: '取消 / Cancel'
      }).then(result => { if (result.isConfirmed) doRefresh(); });
      return;
    }
    doRefresh();
  });

  function doRefresh() {
    Swal.fire({ title: swalTitle('刷新中...', 'Refreshing...'), allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    reloadAll().then(() => Swal.close()).catch(e => {
      Swal.close();
      Swal.fire({ icon: 'error', title: swalTitle('刷新失败', 'Refresh Failed'), html: swalHtml(String(e.message || e), '') });
    });
  }

  let tableAuditLog = null;
  $('#btnAuditLog').on('click', function () {
    $('#auditLogModal').modal('show');
    google.script.run.withSuccessHandler(r => {
      const rows = (r && r.rows) || [];
      if (tableAuditLog) tableAuditLog.destroy();
      tableAuditLog = $('#tableAuditLog').DataTable({
        data: rows,
        columns: ['时间', '工号', '姓名', '机台号', '字段', '旧值', '新值'].map(h => ({ title: h, data: h, render: DataTable.render.text() })),
        order: [[0, 'desc']],
        pageLength: 15
      });
      $('#auditFilterWorkcenter').off('keyup change').on('keyup change', function () {
        tableAuditLog.column(3).search(this.value).draw();
      });
    }).withFailureHandler(e => {
      Swal.fire({ icon: 'error', title: swalTitle('日志加载失败', 'Audit Log Failed'), html: swalHtml(String(e.message || e), '') });
    }).get_MachineMasterAuditLog(200);
  });

  // 关页/刷新拦截：有未保存改动时提示
  window.addEventListener('beforeunload', function (e) {
    if (dirtyCount > 0) { e.preventDefault(); e.returnValue = ''; }
  });
```

- [ ] **Step 2: 语法检查**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && sed 's/<\/?script[^>]*>//g' INJ_MachineMaster-js.html > /tmp/mm-js-check.js && node --check /tmp/mm-js-check.js && node --test inj-machine-master.test.mjs`
Expected: `node --check` 无输出；测试全绿（16 tests）

- [ ] **Step 3: 提交**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add INJ_MachineMaster-js.html
git commit -m "V20261001.09_注塑机台主数据_保存冲突提示与变更日志弹窗"
```

---

### Task 9: 导航入口（卡片 + 弹窗 + 事件）

**Files:**
- Modify: `Navigation.html`（在「点检」卡片 `id="PonitCheck"` 所在 `div` 之前插入卡片；在 `pmModal` 之后插入弹窗）
- Modify: `Navigation_js.html`（在 `$('#PM_MasterData').click(...)` 处理器之后插入两个处理器）

**Interfaces:**
- Consumes: `siWebPage`、`id`、`name`、`process`、`workshop`（Navigation_js.html 顶部已从 sessionStorage 读取的局部变量）
- Produces: 页面入口 `?v=INJ_MachineMaster`

- [ ] **Step 1: 加入导航卡片**

在 `Navigation.html` 找到「点检」卡片块：

```html
      <div class="col-6 col-md-4 col-lg-3">
        <button type="button" class="nav-card" id="PonitCheck">
          <i class="bi bi-clipboard-check icon"></i>
          <div class="title-cn">点检</div>
          <div class="title-en">Inspection</div>
        </button>
      </div>
```

在其**之前**插入：

```html
      <div class="col-6 col-md-4 col-lg-3">
        <button type="button" class="nav-card" id="MasterData">
          <i class="bi bi-database-gear icon"></i>
          <div class="title-cn">主数据维护</div>
          <div class="title-en">Master Data</div>
        </button>
      </div>
```

- [ ] **Step 2: 加入弹窗**

在 `Navigation.html` 找到 `<!-- 保养/PM 弹出窗口 -->` 注释行，在其**之前**插入：

```html
  <!-- 主数据维护 弹出窗口 -->
  <div class="modal fade" id="masterDataModal" tabindex="-1" aria-labelledby="masterDataModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="masterDataModalLabel">主数据维护 / Master Data</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body modal-domain-daily">
          <div class="d-grid gap-2">
            <button class="modal-card-btn" type="button" id="INJ_MachineMaster">
              <i class="bi bi-cpu mc-icon"></i>
              <div class="mc-text">
                <div class="title-cn">注塑机台主数据</div>
                <div class="title-en">IM Machine Master Data</div>
              </div>
              <i class="bi bi-chevron-right mc-arrow"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: 绑定事件**

在 `Navigation_js.html` 的 `$('#PM_MasterData').click(() => { ... });` 处理器之后插入：

```js
    $('#MasterData').click(() => {
        $('#masterDataModal').modal('show');
    });

    $('#INJ_MachineMaster').click(() => {
        let url = siWebPage + '?v=INJ_MachineMaster'
            + '&ID=' + encodeURIComponent(id)
            + '&Name=' + encodeURIComponent(name)
            + '&Process=' + encodeURIComponent(process)
            + '&Workshop=' + encodeURIComponent(workshop);
        window.open(url);
        $('#masterDataModal').modal('hide');
    });
```

- [ ] **Step 4: 语法检查 + 提交**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && sed 's/<\/?script[^>]*>//g' Navigation_js.html > /tmp/nav-js-check.js && node --check /tmp/nav-js-check.js && grep -c 'id="MasterData"\|id="masterDataModal"\|id="INJ_MachineMaster"' Navigation.html`
Expected: `node --check` 无输出；grep 输出 `3`

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Navigation.html Navigation_js.html
git commit -m "V20261001.10_注塑机台主数据_导航主数据维护入口"
```

---

### Task 10: MCP 预建 sheet + 推送 GAS + 真表验证

**Files:**
- 无代码改动（生产表数据操作 + 部署验证）

**Interfaces:**
- Consumes: 全部前序任务
- Produces: 上线可用状态

- [ ] **Step 1: MCP 预建「机型选项」「变更日志」sheet**

用 MCP 工具对 `12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM`：
1. `add-sheet` 新建 sheet `机型选项`；`add-sheet` 新建 sheet `变更日志`
2. 读 `Workcenter!M2:M329`，去重（保序、跳过空值）得到机型列表
3. `update-cells` 写 `机型选项!A1:A{n+1}` = `[['机型'], ...机型去重值.map(v=>[v])]`
4. `update-cells` 写 `变更日志!A1:G1` = `[['时间','工号','姓名','机台号','字段','旧值','新值']]`
5. 回读两个 sheet 确认写入正确

- [ ] **Step 2: 推送 GAS**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && NODE_OPTIONS="--require /Users/kelland/gas-projects/ScheduledTask/proxy-bootstrap.cjs" clasp push -f`
（本机 clasp 需走代理 bootstrap；若该路径不存在，先 `ls /Users/kelland/gas-projects/ScheduledTask/proxy-bootstrap.cjs` 确认）
Expected: 输出包含 `INJ_MachineMaster.html`、`INJ_MachineMaster-js.html`、`Code.js`、`Navigation.html`、`Navigation_js.html`，且**不含** `*.test.mjs`

- [ ] **Step 3: 浏览器验证（需用户配合）**

打开生产 exec URL 的导航页 → 「主数据维护」卡片 → 弹窗「注塑机台主数据」，逐项确认：
1. 表格显示 329 行 × 20 列，A–L 灰底只读，M–T 为下拉/复选框
2. 机型下拉选项 = 机型选项 sheet 的值；设备类型1/2、自动化类型下拉有值；责任人/备份责任人下拉可搜索
3. 找一个机台改「责任人」→ 页脚"待保存"变 1、单元格黄底 → 保存 → 成功提示
4. **真表核对**：`Workcenter` 对应行的 Q 列已更新，且同行 A–L 列（尤其 L 列设备编号）与保存前一致
5. **日志核对**：`变更日志` sheet 新增一行，字段=责任人，旧值/新值正确
6. 免检复选框：勾选保存 → 单元格写 `Y`；取消勾选保存 → 单元格为空
7. 筛选：机台号关键字、机型、设备类型1、责任人、免检状态各自生效
8. 有未保存改动时点刷新/关标签页 → 出现拦截提示
9. 「变更日志」按钮 → 弹窗显示记录，机台号筛选生效

- [ ] **Step 4: 冲突分支验证（需用户配合）**

1. 页面加载后，直接在 Google Sheets 里改某机台的责任人为「测试值」并保存
2. 回到页面（不刷新），把该机台的责任人改成另一个值，保存
3. Expected: 弹出「部分字段未保存」，列出该机台责任人冲突（表中现值=测试值）；表格刷新后显示「测试值」；`变更日志` 无该条记录
4. 把 Sheets 里的「测试值」改回原值

- [ ] **Step 5: 全套测试回归 + 提交收尾**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && node --test *.test.mjs`
Expected: 全部通过（基线 334 条 + 新增 16 条 = 350 条）

若验证中发现需要修补的代码，修复后追加提交 `V20261001.XX_注塑机台主数据_<修补内容>`。

- [ ] **Step 6: 发布生产（需用户确认）**

Run: `cd /Users/kelland/gas-projects/EQU-Digital-System && NODE_OPTIONS="--require /Users/kelland/gas-projects/ScheduledTask/proxy-bootstrap.cjs" clasp deploy -i <现有 deploymentId> -d "注塑机台主数据维护页上线"`
（deploymentId 从 `.clasp.json` 的 `deploymentId` 读取；exec URL 保持不变）
Expected: 部署成功，用户在 exec URL 上确认功能可用

**注意**：Step 6 必须由用户明确确认后再执行。
