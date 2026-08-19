# 保养主数据管理页（A 阶段）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Excel 草稿管理的保养主数据做成网页版管理页（CRUD + 草稿导入 + 筛选搜索 + 复制 + 变更记录 + 确认流转）。

**Architecture:** 沿用现有 GAS 页面模式——Code.js 增加后端函数（读正式表 / 批量保存+日志 / 审核确认 / 草稿导入 / 日志查询），新增 `PM_MasterData.html` + `PM_MasterData-js.html` 页面（Bootstrap5 + DataTables + Select2 + SweetAlert2 双语提示），在 doGet 注册路由并在 Navigation 加入口。纯逻辑（频率换算、导入映射、字段差异）提取为纯函数用 Node 做 TDD（测试放 /tmp/equ-pm-tests，不进 GAS 项目）。

**Tech Stack:** Google Apps Script（Code.js）、Bootstrap 5.3.1、DataTables 1.13.6、Select2 4.0.13、SweetAlert2、Node 22（仅测试）。

**Spec:** `docs/superpowers/specs/2026-08-19-pm-master-data-web-design.md`

## Global Constraints

- 正式表电子表格 ID：`1Iw0-TEvX0m7kIBLSmIpAkF8Z4B6Ri_nQRrmrcfPNlEQ`（用户已建，空表；sheet 由后端首次运行自动创建）
- 草稿表 ID：`1KxudsNbAs6w8S110Cqi3bYtVvqycrzokxGbudrHg5-8`（sheet 名 `MasterData`，A1:O81 数据）
- userID 表 ID：`1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM`（sheet 名 `userID`，数据从第 3 行起；审核权限列 = **BM 列（第 65 列）**，第 1 行 `EDS`、第 2 行 `PM策略审核`、人员行 `Y/N`）
- 正式表 MasterData 20 列表头（前 15 列与草稿同名）：
  `['工序','Machine Type','PM Frequency','单次停机时间/ h','PM Description','RBM保养间隔时间','RBM保养提醒间隔时间','强制保养频率/ Month','策略 / Strategy','TasklistName','是否创工单','工单类型','是否计入AEM','备注','是否确认','主数据ID','确认人','确认时间','最后修改人','最后修改时间']`
- 变更日志 sheet 名 `变更日志`，表头：`['时间','工号','姓名','动作','主数据ID','字段','旧值','新值']`；动作取值：新增/修改/删除/确认/取消确认/导入
- 确认状态取值：`未确认` / `已确认`（导入行一律 `未确认`）
- 频率→月数换算表（自动换算 H 列，H 列可手改）：半年=6、年=12、三年=36、双年=24、五年=60、季=3、季度=3、月=1、双月=2、周=0.25、双周=0.5、三周=0.75、五周=1.25、0.5周=0.125；无法识别返回 null
- 页面双语提示用现有 `swalTitle(cn,en)` / `swalHtml(cn,en)` helper 模式（每个 -js 文件头部自行定义）
- Git commit 一律 V 格式中文描述，如 `V20260819.03_保养主数据_频率换算纯函数`
- 不做（YAGNI）：差异比对导入、其他列自动计算、历史回滚、任务生成联动（C）、看板图表（B）
- 测试文件统一放 `/tmp/equ-pm-tests/`，绝不放进仓库（clasp 会推送）

---

### Task 1: 频率→月数换算纯函数（TDD）

**Files:**
- Create: `PM_MasterData-js.html`（新页面 JS 文件，先只放本函数；后续任务继续扩展此文件）
- Test: `/tmp/equ-pm-tests/test-freq-to-months.js`

**Interfaces:**
- Consumes: 无
- Produces: `convertFrequencyToMonths(freqText) -> number|null`，供 Task 9 前端 H 列自动换算使用

- [ ] **Step 1: 写失败测试**

创建 `/tmp/equ-pm-tests/test-freq-to-months.js`（复制此前测试的大括号提取模式，从 `PM_MasterData-js.html` 提取 `convertFrequencyToMonths`，注意该文件是 `<script>...</script>` 包裹，需先 `replace(/<\/?script[^>]*>/gi, '')`）：

```js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const FILE = '/Users/kelland/gas-projects/EQU-Digital-System/PM_MasterData-js.html';
let src = fs.readFileSync(FILE, 'utf8');
src = src.replace(/<\/?script[^>]*>/gi, '');

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

const fnSrc = extractFunction(src, 'convertFrequencyToMonths');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnSrc, sandbox);
const fn = sandbox.convertFrequencyToMonths;
assert.strictEqual(typeof fn, 'function');

const cases = [
  ['半年', 6], ['年', 12], ['三年', 36], ['双年', 24], ['五年', 60],
  ['季', 3], ['季度', 3], ['月', 1], ['双月', 2], ['周', 0.25],
  ['双周', 0.5], ['三周', 0.75], ['五周', 1.25], ['0.5周', 0.125],
  ['  半年  ', 6],                 // 前后空白可识别
  ['每周', null], ['', null], ['随便写的', null]
];
let failed = 0;
for (const [input, expected] of cases) {
  const got = fn(input);
  try { assert.strictEqual(got, expected, `input="${input}"`); console.log(`PASS  ${input} -> ${got}`); }
  catch (e) { failed++; console.log(`FAIL  ${input} -> ${got}，期望 ${expected}`); }
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/equ-pm-tests/test-freq-to-months.js`
Expected: 报错 `function convertFrequencyToMonths not found in source`

- [ ] **Step 3: 最小实现**

创建 `PM_MasterData-js.html`：

```html
<script>
  // 频率文本 → 月数换算；无法识别返回 null（调用方留空并标黄提醒）
  function convertFrequencyToMonths(freqText) {
    if (freqText === undefined || freqText === null) return null;
    let s = String(freqText).trim();
    const MAP = [
      ["半年", 6], ["三年", 36], ["双年", 24], ["五年", 60], ["季度", 3],
      ["双月", 2], ["双周", 0.5], ["三周", 0.75], ["五周", 1.25], ["0.5周", 0.125],
      ["年", 12], ["季", 3], ["月", 1], ["周", 0.25]
    ];
    for (let i = 0; i < MAP.length; i++) {
      if (s.includes(MAP[i][0])) return MAP[i][1];
    }
    return null;
  }
</script>
```

（注意 `季度` 必须在 `季` 之前、长词在短词之前，`0.5周` 在 `周` 之前，否则子串误匹配。）

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/equ-pm-tests/test-freq-to-months.js`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add PM_MasterData-js.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.03_保养主数据_频率换算纯函数

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 导入行映射纯函数（TDD）

**Files:**
- Modify: `Code.js`（新增 `buildMasterRecordFromDraft` 与常量块）
- Test: `/tmp/equ-pm-tests/test-master-record-mapping.js`

**Interfaces:**
- Consumes: 无
- Produces: `buildMasterRecordFromDraft(draftRow, masterId) -> Array(20)`，供 Task 7 导入使用。draftRow 为草稿 15 列数组；masterId 为 `PM-MD-0001` 格式字符串；返回正式表 20 列数组（前 15 列映射草稿，`是否确认`=`未确认`，`主数据ID`=masterId，其余附加列空串）

- [ ] **Step 1: 写失败测试**

创建 `/tmp/equ-pm-tests/test-master-record-mapping.js`（从 Code.js 提取函数，Code.js 无 script 标签，直接 brace-match 提取）：

```js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const FILE = '/Users/kelland/gas-projects/EQU-Digital-System/Code.js';
const src = fs.readFileSync(FILE, 'utf8');
function extractFunction(source, fnName) { /* 同 Task 1 的 brace-match 实现 */ }
const fnSrc = extractFunction(src, 'buildMasterRecordFromDraft');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnSrc, sandbox);
const fn = sandbox.buildMasterRecordFromDraft;
assert.strictEqual(typeof fn, 'function');

// 草稿第 4 行（真实数据）：含 #VALUE! 的 H 列
const draftRow = ['IM', '6AX', '半年', '32', '6AX 半年度保养', '3212', '2872', '#VALUE!', 'RBM', '[6AX,HIM,VIM,ADEC,热流道]', 'Y', 'PM10', 'Y', '', 'TRUE'];
const rec = fn(draftRow, 'PM-MD-0001');
assert.strictEqual(rec.length, 20);
assert.strictEqual(rec[0], 'IM');                 // 工序
assert.strictEqual(rec[1], '6AX');                // Machine Type
assert.strictEqual(rec[4], '6AX 半年度保养');      // PM Description
assert.strictEqual(rec[7], '');                   // #VALUE! → 空串
assert.strictEqual(rec[9], '[6AX,HIM,VIM,ADEC,热流道]');
assert.strictEqual(rec[14], '未确认');             // 导入一律未确认
assert.strictEqual(rec[15], 'PM-MD-0001');        // 主数据ID
assert.strictEqual(rec[16], '');                  // 确认人
assert.strictEqual(rec[19], '');                  // 最后修改时间
console.log('PASS  all mapping assertions');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/equ-pm-tests/test-master-record-mapping.js`
Expected: `function buildMasterRecordFromDraft not found in source`

- [ ] **Step 3: 最小实现**

在 `Code.js` 的 `buildRowObject` 函数之后追加（2 空格缩进、双引号风格与文件一致）：

```js
// 保养主数据：常量（A 阶段）
var PM_MASTER_SS_ID = "1Iw0-TEvX0m7kIBLSmIpAkF8Z4B6Ri_nQRrmrcfPNlEQ";
var PM_MASTER_SHEET_NAME = "MasterData";
var PM_MASTER_AUDIT_SHEET_NAME = "变更日志";
var PM_MASTER_DRAFT_SS_ID = "1KxudsNbAs6w8S110Cqi3bYtVvqycrzokxGbudrHg5-8";
var PM_MASTER_USERID_SS_ID = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
var PM_MASTER_AUDIT_COL = 65; // userID BM 列：第1行 EDS，第2行 PM策略审核，人员行 Y/N
var PM_MASTER_HEADERS = [
  "工序", "Machine Type", "PM Frequency", "单次停机时间/ h", "PM Description",
  "RBM保养间隔时间", "RBM保养提醒间隔时间", "强制保养频率/ Month", "策略 / Strategy", "TasklistName",
  "是否创工单", "工单类型", "是否计入AEM", "备注", "是否确认",
  "主数据ID", "确认人", "确认时间", "最后修改人", "最后修改时间"
];
var PM_MASTER_AUDIT_HEADERS = ["时间", "工号", "姓名", "动作", "主数据ID", "字段", "旧值", "新值"];

// 草稿行(15列) → 正式表记录(20列)；导入一律"未确认"，#VALUE! 等公式错误置空
function buildMasterRecordFromDraft(draftRow, masterId) {
  let rec = [];
  for (let i = 0; i < 20; i++) rec.push("");
  for (let i = 0; i < 15; i++) {
    let v = draftRow[i];
    if (v !== undefined && v !== null && String(v).includes("#VALUE!")) v = "";
    rec[i] = v === undefined || v === null ? "" : v;
  }
  rec[14] = "未确认"; // 是否确认
  rec[15] = masterId; // 主数据ID
  return rec;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/equ-pm-tests/test-master-record-mapping.js && node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: PASS + SYNTAX OK

- [ ] **Step 5: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.04_保养主数据_常量与导入映射纯函数

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 后端 sheet 自动创建与读取（get_PM_MasterData）

**Files:**
- Modify: `Code.js`

**Interfaces:**
- Consumes: Task 2 常量（PM_MASTER_SS_ID / PM_MASTER_HEADERS / PM_MASTER_AUDIT_HEADERS）
- Produces:
  - `getPM_MasterSheet(ss) -> Sheet`（找不到则创建并写入 20 列表头）
  - `getPM_MasterAuditSheet(ss) -> Sheet`（找不到则创建并写入 8 列表头）
  - `get_PM_MasterData() -> {headers: string[], rows: Object[]}`（rows 用现有 `buildRowObject` 转换，键为表头名）

- [ ] **Step 1: 实现**（在 Code.js 的 `buildMasterRecordFromDraft` 之后追加）

```js
function getPM_MasterSheet(ss) {
  let ws = ss.getSheetByName(PM_MASTER_SHEET_NAME);
  if (!ws) {
    ws = ss.insertSheet(PM_MASTER_SHEET_NAME);
    ws.getRange(1, 1, 1, PM_MASTER_HEADERS.length).setValues([PM_MASTER_HEADERS]);
  }
  return ws;
}

function getPM_MasterAuditSheet(ss) {
  let ws = ss.getSheetByName(PM_MASTER_AUDIT_SHEET_NAME);
  if (!ws) {
    ws = ss.insertSheet(PM_MASTER_AUDIT_SHEET_NAME);
    ws.getRange(1, 1, 1, PM_MASTER_AUDIT_HEADERS.length).setValues([PM_MASTER_AUDIT_HEADERS]);
  }
  return ws;
}

function get_PM_MasterData() {
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_SS_ID);
    let ws = getPM_MasterSheet(ss);
    let lastRow = ws.getLastRow();
    let rows = [];
    if (lastRow >= 2) {
      let head = ws.getRange(1, 1, 1, PM_MASTER_HEADERS.length).getValues()[0];
      let data = ws.getRange(2, 1, lastRow - 1, PM_MASTER_HEADERS.length).getValues();
      rows = data.map(function (row) { return buildRowObject(head, row); });
    }
    return { headers: PM_MASTER_HEADERS, rows: rows };
  } catch (e) {
    return { headers: PM_MASTER_HEADERS, rows: [], error: e.toString() };
  }
}
```

- [ ] **Step 2: 语法检查**

Run: `node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: SYNTAX OK

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.05_保养主数据_sheet自动创建与读取

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 字段差异纯函数（TDD）+ 变更日志写入 helper

**Files:**
- Modify: `Code.js`
- Test: `/tmp/equ-pm-tests/test-field-diffs.js`

**Interfaces:**
- Consumes: Task 3 `getPM_MasterSheet` / `getPM_MasterAuditSheet`
- Produces:
  - `computeFieldDiffs(oldRow, newRow) -> [{field, oldValue, newValue}, ...]`（纯函数，键取两个对象键的并集，值用 `String(v ?? "")` 归一后不同才记录）
  - `appendPM_MasterAuditLog(ss, userCode, userName, action, masterId, field, oldValue, newValue)`（内部取当前时间 `yyyy-MM-dd HH:mm:ss` Asia/Shanghai，appendRow）

- [ ] **Step 1: 写失败测试**

创建 `/tmp/equ-pm-tests/test-field-diffs.js`（从 Code.js 提取 `computeFieldDiffs`）：

```js
// 提取模式同 Task 1
const fn = sandbox.computeFieldDiffs;
assert.strictEqual(typeof fn, 'function');

const oldRow = { 工序: 'IM', 'Machine Type': 'FCS', 备注: '' };
const newRow = { 工序: 'IM', 'Machine Type': 'AFT', 备注: '新增备注' };
const diffs = fn(oldRow, newRow);
assert.strictEqual(diffs.length, 2);
assert.deepStrictEqual(diffs[0], { field: 'Machine Type', oldValue: 'FCS', newValue: 'AFT' });
assert.deepStrictEqual(diffs[1], { field: '备注', oldValue: '', newValue: '新增备注' });

// 仅新键（新增场景 oldRow 为空对象）也要产出差异
const diffs2 = fn({}, { 工序: 'PK' });
assert.deepStrictEqual(diffs2, [{ field: '工序', oldValue: '', newValue: 'PK' }]);

// 无变化 → 空数组
assert.deepStrictEqual(fn({ 工序: 'IM' }, { 工序: 'IM' }), []);

// 数值与字符串 1 == '1' 视为无变化（String 归一）
assert.deepStrictEqual(fn({ a: 1 }, { a: '1' }), []);
console.log('PASS  all diff assertions');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/equ-pm-tests/test-field-diffs.js`
Expected: `function computeFieldDiffs not found in source`

- [ ] **Step 3: 最小实现**（Code.js 追加）

```js
// 对比两行（表头名为键的对象），返回变化的字段列表（值统一 String 归一）
function computeFieldDiffs(oldRow, newRow) {
  let diffs = [];
  let keys = {};
  Object.keys(oldRow).forEach(function (k) { keys[k] = true; });
  Object.keys(newRow).forEach(function (k) { keys[k] = true; });
  Object.keys(keys).forEach(function (k) {
    let ov = String(oldRow[k] === undefined || oldRow[k] === null ? "" : oldRow[k]);
    let nv = String(newRow[k] === undefined || newRow[k] === null ? "" : newRow[k]);
    if (ov !== nv) diffs.push({ field: k, oldValue: ov, newValue: nv });
  });
  return diffs;
}

function appendPM_MasterAuditLog(ss, userCode, userName, action, masterId, field, oldValue, newValue) {
  let ws = getPM_MasterAuditSheet(ss);
  let now = Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
  ws.appendRow([now, userCode || "", userName || "", action, masterId || "", field || "", oldValue || "", newValue || ""]);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/equ-pm-tests/test-field-diffs.js && node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: PASS + SYNTAX OK

- [ ] **Step 5: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.06_保养主数据_字段差异与变更日志helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: save_PM_MasterData 批量保存

**Files:**
- Modify: `Code.js`

**Interfaces:**
- Consumes: Task 3/4 的 helper
- Produces: `save_PM_MasterData(changes, userCode, userName) -> {ok: boolean, message: string}`；changes 为数组，元素 `{主数据ID: string|'', isNew: boolean, deleted: boolean, row: Object}`

- [ ] **Step 1: 实现**（Code.js 追加）

```js
function save_PM_MasterData(changes, userCode, userName) {
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_SS_ID);
    let ws = getPM_MasterSheet(ss);
    let lastRow = ws.getLastRow();
    let data = lastRow >= 2
      ? ws.getRange(2, 1, lastRow - 1, PM_MASTER_HEADERS.length).getValues()
      : [];
    let head = PM_MASTER_HEADERS;

    // 现有行索引：主数据ID(第16列, index 15) → 行号(从2起)
    let idToRow = {};
    for (let i = 0; i < data.length; i++) {
      let id = String(data[i][15] || "");
      if (id) idToRow[id] = i + 2;
    }

    let nextIdNum = 1;
    Object.keys(idToRow).forEach(function (id) {
      let m = String(id).match(/^PM-MD-(\d+)$/);
      if (m && parseInt(m[1], 10) >= nextIdNum) nextIdNum = parseInt(m[1], 10) + 1;
    });

    changes.forEach(function (ch) {
      let masterId = ch["主数据ID"] || "";
      if (ch.deleted) {
        if (idToRow[masterId]) {
          ws.deleteRow(idToRow[masterId]);
          delete idToRow[masterId];
          appendPM_MasterAuditLog(ss, userCode, userName, "删除", masterId, "", "", "");
        }
        return;
      }
      let rowArr = head.map(function (h) {
        let v = ch.row[h];
        return v === undefined || v === null ? "" : v;
      });
      if (!masterId || !idToRow[masterId]) {
        // 新增
        masterId = "PM-MD-" + String(nextIdNum).padStart(4, "0");
        nextIdNum++;
        rowArr[15] = masterId;
        rowArr[14] = "未确认";
        rowArr[18] = userName || "";
        rowArr[19] = Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
        ws.appendRow(rowArr);
        appendPM_MasterAuditLog(ss, userCode, userName, "新增", masterId, "", "", "");
      } else {
        // 修改：先对比差异写日志，再整行写回
        let oldObj = buildRowObject(head, data[idToRow[masterId] - 2]);
        let diffs = computeFieldDiffs(oldObj, ch.row);
        rowArr[15] = masterId;
        rowArr[16] = oldObj["确认人"] || "";
        rowArr[17] = oldObj["确认时间"] || "";
        rowArr[14] = oldObj["是否确认"] || "未确认";
        rowArr[18] = userName || "";
        rowArr[19] = Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
        ws.getRange(idToRow[masterId], 1, 1, head.length).setValues([rowArr]);
        diffs.forEach(function (d) {
          appendPM_MasterAuditLog(ss, userCode, userName, "修改", masterId, d.field, d.oldValue, d.newValue);
        });
      }
    });
    return { ok: true, message: "保存成功" };
  } catch (e) {
    return { ok: false, message: e.toString() };
  }
}
```

- [ ] **Step 2: 语法检查**

Run: `node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: SYNTAX OK

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.07_保养主数据_批量保存与变更日志

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 审核权限校验 + confirm_PM_MasterData

**Files:**
- Modify: `Code.js`

**Interfaces:**
- Consumes: Task 3 helper、PM_MASTER_USERID_SS_ID / PM_MASTER_AUDIT_COL
- Produces:
  - `verifyPM_MasterAuditor(code, name, pwd) -> {ok, name}`（读 userID 表第 3 行起 A..BM 共 65 列 `getDisplayValues()`，匹配 `row[0]===code && row[1]===name && row[2]===pwd && String(row[64]).trim()==='Y'`）
  - `confirm_PM_MasterData(ids, code, name, pwd, action) -> {ok, message}`（ids 为字符串数组，action 取值 `'confirm'`/`'unconfirm'`；经 verify 后对每个 ID 置 确认人=`code/name`、确认时间、是否确认=`已确认`或`未确认`，写"确认"/"取消确认"日志；verify 失败直接返回错误，不落任何数据）

- [ ] **Step 1: 实现**（Code.js 追加）

```js
function verifyPM_MasterAuditor(code, name, pwd) {
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_USERID_SS_ID);
    let ws = ss.getSheetByName("userID");
    let rows = ws.getRange(3, 1, ws.getLastRow() - 2, PM_MASTER_AUDIT_COL).getDisplayValues();
    for (let i = 0; i < rows.length; i++) {
      let r = rows[i];
      if (String(r[0] || "").trim() === String(code || "").trim() &&
          String(r[1] || "").trim() === String(name || "").trim() &&
          String(r[2] || "").trim() === String(pwd || "").trim() &&
          String(r[64] || "").trim() === "Y") {
        return { ok: true, name: r[1] };
      }
    }
    return { ok: false, name: "" };
  } catch (e) {
    return { ok: false, name: "", error: e.toString() };
  }
}

function confirm_PM_MasterData(ids, code, name, pwd, action) {
  let v = verifyPM_MasterAuditor(code, name, pwd);
  if (!v.ok) return { ok: false, message: "审核权限验证失败，请检查工号/姓名/密码或审核权限" };
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_SS_ID);
    let ws = getPM_MasterSheet(ss);
    let lastRow = ws.getLastRow();
    if (lastRow < 2) return { ok: false, message: "正式表无数据" };
    let data = ws.getRange(2, 1, lastRow - 1, PM_MASTER_HEADERS.length).getValues();
    let now = Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
    let isConfirm = action !== "unconfirm";
    let newStatus = isConfirm ? "已确认" : "未确认";
    let oldStatus = isConfirm ? "未确认" : "已确认";
    ids.forEach(function (id) {
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][15]) === String(id)) {
          let rowNum = i + 2;
          ws.getRange(rowNum, 15).setValue(newStatus);             // O 是否确认
          ws.getRange(rowNum, 17).setValue(isConfirm ? code + "/" + name : ""); // Q 确认人
          ws.getRange(rowNum, 18).setValue(isConfirm ? now : "");  // R 确认时间
          appendPM_MasterAuditLog(ss, code, name, isConfirm ? "确认" : "取消确认", id, "是否确认", oldStatus, newStatus);
          break;
        }
      }
    });
    return { ok: true, message: isConfirm ? "确认成功" : "取消确认成功" };
  } catch (e) {
    return { ok: false, message: e.toString() };
  }
}
```

- [ ] **Step 2: 语法检查**

Run: `node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: SYNTAX OK

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.08_保养主数据_审核验证与确认流转

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: import_PM_MasterData 草稿导入

**Files:**
- Modify: `Code.js`

**Interfaces:**
- Consumes: Task 2 `buildMasterRecordFromDraft`、Task 3 helper、PM_MASTER_DRAFT_SS_ID
- Produces: `import_PM_MasterData(userCode, userName) -> {ok, message, count}`

- [ ] **Step 1: 实现**（Code.js 追加）

```js
function import_PM_MasterData(userCode, userName) {
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_SS_ID);
    let ws = getPM_MasterSheet(ss);
    if (ws.getLastRow() >= 2) {
      return { ok: false, message: "正式表非空，禁止重复导入（请先清空正式表）" };
    }
    let dss = SpreadsheetApp.openById(PM_MASTER_DRAFT_SS_ID);
    let dws = dss.getSheetByName("MasterData");
    if (!dws) return { ok: false, message: "草稿表 MasterData sheet 未找到" };
    let lastRow = dws.getLastRow();
    if (lastRow < 2) return { ok: false, message: "草稿表无数据" };
    let draft = dws.getRange(2, 1, lastRow - 1, 15).getValues();
    let rows = [];
    draft.forEach(function (r, idx) {
      // 全空行跳过
      if (r.every(function (c) { return c === "" || c === undefined || c === null; })) return;
      rows.push(buildMasterRecordFromDraft(r, "PM-MD-" + String(rows.length + 1).padStart(4, "0")));
    });
    if (rows.length === 0) return { ok: false, message: "草稿表无有效数据" };
    ws.getRange(2, 1, rows.length, 20).setValues(rows);
    appendPM_MasterAuditLog(ss, userCode, userName, "导入", "", "", "", "导入 " + rows.length + " 条");
    return { ok: true, message: "导入成功 " + rows.length + " 条", count: rows.length };
  } catch (e) {
    return { ok: false, message: e.toString() };
  }
}
```

- [ ] **Step 2: 语法检查**

Run: `node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`
Expected: SYNTAX OK

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.09_保养主数据_草稿导入

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: get_PM_MasterAuditLog + 路由注册 + 页面骨架

**Files:**
- Modify: `Code.js`（doGet 路由 + load 函数 + 日志查询）
- Create: `PM_MasterData.html`
- Modify: `PM_MasterData-js.html`（Task 1 已建，本任务不变）

**Interfaces:**
- Produces: `get_PM_MasterAuditLog() -> {rows: Object[]}`（读变更日志 sheet，新→旧排序）

- [ ] **Step 1: 实现 get_PM_MasterAuditLog**（Code.js 追加）

```js
function get_PM_MasterAuditLog() {
  try {
    let ss = SpreadsheetApp.openById(PM_MASTER_SS_ID);
    let ws = getPM_MasterAuditSheet(ss);
    let lastRow = ws.getLastRow();
    let rows = [];
    if (lastRow >= 2) {
      let head = PM_MASTER_AUDIT_HEADERS;
      let data = ws.getRange(2, 1, lastRow - 1, head.length).getDisplayValues();
      data.forEach(function (r) { rows.push(buildRowObject(head, r)); });
      rows.reverse(); // 新的在前
    }
    return { rows: rows };
  } catch (e) {
    return { rows: [], error: e.toString() };
  }
}
```

- [ ] **Step 2: 注册路由与 load 函数**（Code.js）

在 doGet 的 `Route.path("PM_ShiftFollowUp", loadPM_ShiftFollowUp);` 之后加一行：

```js
  Route.path("PM_MasterData", loadPM_MasterData); // 保养主数据管理页
```

在 `loadPM_Plan_new` 函数之后追加（签名与相邻 load 函数一致）：

```js
function loadPM_MasterData(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  let webPage = getReleaseWebPage();
  return render("PM_MasterData", {
    webPage: webPage,
    intoWebID: intoWebLoginId || "",
    intoWebName: intoWebLoginName || "",
    intoWebType: intoWebLoginType || "",
  })
    .setTitle("保养主数据 | PM Master Data")
    .setFaviconUrl(webIconUrl);
}
```

- [ ] **Step 3: 创建页面骨架 PM_MasterData.html**

参照 PM_Task_1.0.html 的 head/body 结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <base target="_top">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <?!=include("Kez_Bootstrap@5.3.1_css");?>
    <?!=include("Kez_datatables@1.13.6_css");?>
    <?!=include("Kez_Select2@4.0.13_css");?>
    <?!=include("Kez_Select2-bootstrap_css");?>
    <?!=include("CSS");?>
    <?!=include("Compressor_js");?>
    <?!=include("Kez_jquery@3.6.4_js");?>
    <?!=include("Kez_Bootstrap@5.3.1_js");?>
    <?!=include("Kez_datatables@1.13.6_js");?>
    <?!=include("Kez_select2@4.0.13_js");?>
    <?!=include("Kez_sweetalert2_js");?>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background: #f5f6f8; }
        .welcome-bar {
            background: #fff; border-left: 4px solid #E60012;
            padding: 10px 18px; margin: 12px 0 14px; border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex;
            justify-content: space-between; align-items: center;
        }
        .badge-confirmed { background: #198754; color: #fff; }
        .badge-unconfirmed { background: #6c757d; color: #fff; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="welcome-bar">
            <span><strong>保养主数据 | PM Master Data</strong>　欢迎，<span id="name"></span></span>
            <span>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btnAuditLog">变更日志<br>Audit Log</button>
                <button type="button" class="btn btn-outline-primary btn-sm" id="btnRefresh">刷新<br>Refresh</button>
            </span>
        </div>
        <div class="card mb-2">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-auto"><label class="mb-0">工序/Process</label>
                        <select id="filterProcess" class="form-select form-select-sm" multiple style="width:150px"></select>
                    </div>
                    <div class="col-auto"><label class="mb-0">策略/Strategy</label>
                        <select id="filterStrategy" class="form-select form-select-sm" multiple style="width:150px"></select>
                    </div>
                    <div class="col-auto"><label class="mb-0">确认状态</label>
                        <select id="filterConfirm" class="form-select form-select-sm" multiple style="width:150px"></select>
                    </div>
                    <div class="col-auto"><label class="mb-0">关键字</label>
                        <input id="filterKeyword" class="form-control form-control-sm" style="width:200px" placeholder="机型/描述">
                    </div>
                    <div class="col-auto ms-auto">
                        <button type="button" class="btn btn-success btn-sm" id="btnAdd">新增<br>Add</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" id="btnCopy">复制<br>Copy</button>
                        <button type="button" class="btn btn-outline-danger btn-sm" id="btnDelete">删除<br>Delete</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btnImport">导入草稿<br>Import</button>
                        <button type="button" class="btn btn-outline-success btn-sm" id="btnConfirm">确认(审核)<br>Confirm</button>
                        <button type="button" class="btn btn-outline-warning btn-sm" id="btnUnconfirm">取消确认<br>Unconfirm</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btnSave">保存<br>Save</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-body p-2">
                <table id="tableMaster" class="table table-sm table-bordered w-100" style="font-size:12px"></table>
            </div>
        </div>
    </div>
    <!-- 变更日志弹窗 -->
    <div class="modal fade" id="auditLogModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header"><h6 class="modal-title">变更日志 / Audit Log</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <table id="tableAuditLog" class="table table-sm table-bordered w-100" style="font-size:12px"></table>
                </div>
            </div>
        </div>
    </div>
    <?!=include("PM_MasterData-js");?>
</body>
</html>
```

- [ ] **Step 4: 语法检查**

Run: `node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js`；并确认 `PM_MasterData.html` 中 include 的文件名与仓库文件名完全一致
Expected: SYNTAX OK

- [ ] **Step 5: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Code.js PM_MasterData.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.10_保养主数据_日志查询路由与页面骨架

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 前端加载渲染与筛选（PM_MasterData-js.html）

**Files:**
- Modify: `PM_MasterData-js.html`（在 Task 1 的 `<script>` 块内追加，保留 convertFrequencyToMonths）

**Interfaces:**
- Consumes: `get_PM_MasterData()`、`convertFrequencyToMonths`（本文件）
- Produces: `renderMasterTable()`、`applyFilters()`、全局 `masterRows`（最新数据）、`tableMaster` DataTable 实例

- [ ] **Step 1: 实现**

在 `<script>` 内追加（风格对齐 PM_Task-js：2 空格缩进、双语 helper）：

```js
  // 双语 Swal 提示 helper：中文在上，英文在下
  const swalTitle = (cn, en) => `${cn}<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">${en}</span>`;
  const swalHtml = (cn, en) => `<div>${cn}<div style="font-size:0.85em;color:#888;margin-top:6px;line-height:1.4;">${en}</div></div>`;

  let global_Name = sessionStorage.getItem('Name') || '';
  let global_ID = sessionStorage.getItem('ID') || '';
  $('#name').text(global_Name);

  let masterRows = [];        // 后端原始行（键为表头名）
  let tableMaster = null;
  let unlockedIds = {};       // 解锁编辑的已确认行 ID 集合（本次会话）

  const PROCESS_OPTIONS = ['FA', 'IM', 'PK', 'TF', 'WH'];
  const STRATEGY_OPTIONS = ['TBM', 'RBM', 'CBM'];
  const WORKORDER_TYPE_OPTIONS = ['PM02', 'PM10', 'NA', 'ZPM4'];
  const SELECT_FIELDS = { '工序': PROCESS_OPTIONS, '策略 / Strategy': STRATEGY_OPTIONS, '工单类型': WORKORDER_TYPE_OPTIONS, '是否创工单': ['Y', 'N'], '是否计入AEM': ['Y', 'NA'] };

  function loadMasterData() {
    return new Promise((resolve, reject) => {
      google.script.run.withSuccessHandler((r) => {
        if (r && r.rows) { masterRows = r.rows; resolve(); }
        else reject(new Error(r && r.error ? r.error : '加载失败'));
      }).withFailureHandler(reject).get_PM_MasterData();
    });
  }

  // 频率变化 → 自动换算 H 列；识别不了标黄
  function autoFillH(row) {
    const months = convertFrequencyToMonths($(row).find('[data-field="PM Frequency"]').val());
    const $h = $(row).find('[data-field="强制保养频率/ Month"]');
    if (months !== null) { $h.val(months).removeClass('bg-warning'); }
    else { $h.addClass('bg-warning'); }
    return months;
  }

  function renderMasterTable() {
    const head = [
      { title: '状态<br>Status', render: (d, t, row) => (row['是否确认'] === '已确认'
          ? '<span class="badge badge-confirmed">已确认</span>'
          : '<span class="badge badge-unconfirmed">未确认</span>') },
      { title: '主数据ID', data: '主数据ID' },
      { title: '工序<br>Process', data: '工序' },
      { title: '机型<br>Machine Type', data: 'Machine Type' },
      { title: '频率<br>Frequency', data: 'PM Frequency' },
      { title: '强制频率/月', data: '强制保养频率/ Month' },
      { title: '策略<br>Strategy', data: '策略 / Strategy' },
      { title: '保养描述<br>PM Description', data: 'PM Description' },
      { title: '工单类型', data: '工单类型' },
      { title: '创工单', data: '是否创工单' },
      { title: '计入AEM', data: '是否计入AEM' },
      { title: 'RBM间隔', data: 'RBM保养间隔时间' },
      { title: 'RBM提醒', data: 'RBM保养提醒间隔时间' },
      { title: '停机/h', data: '单次停机时间/ h' },
      { title: '任务清单<br>Tasklist', data: 'TasklistName' },
      { title: '备注', data: '备注' },
      { title: '确认人', data: '确认人' },
      { title: '确认时间', data: '确认时间' }
    ];
    if (tableMaster) tableMaster.destroy();
    tableMaster = $('#tableMaster').DataTable({
      data: masterRows,
      columns: head,
      columnDefs: [
        { targets: [17], visible: false }
      ],
      order: [[1, 'asc']],
      pageLength: 25,
      scrollX: true,
      createdRow: function (row, data) {
        $(row).attr('data-id', data['主数据ID'] || '');
        // 行内编辑控件（Task 10 使用；先渲染占位）
        const fields = [
          ['工序', 'select'], ['Machine Type', 'text'], ['PM Frequency', 'text'],
          ['强制保养频率/ Month', 'text'], ['策略 / Strategy', 'select'],
          ['PM Description', 'text'], ['工单类型', 'select'], ['是否创工单', 'select'],
          ['是否计入AEM', 'select'], ['RBM保养间隔时间', 'text'], ['RBM保养提醒间隔时间', 'text'],
          ['单次停机时间/ h', 'text'], ['TasklistName', 'text'], ['备注', 'text']
        ];
        fields.forEach(([f, type], idx) => {
          const $cell = $('td', row).eq(idx + 2);
          const val = data[f] || '';
          if (type === 'select' && SELECT_FIELDS[f]) {
            const opts = ['<option value=""></option>'].concat(SELECT_FIELDS[f].map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`)).join('');
            $cell.html(`<select class="form-select form-select-sm cell-select" data-field="${f}">${opts}</select>`);
          } else {
            $cell.html(`<input type="text" class="form-control form-control-sm cell-input" data-field="${f}" value="${val}" placeholder="${f === 'PM Frequency' ? '如：半年' : ''}">`);
          }
        });
        applyRowLock(row, data);
      }
    });
    // 频率输入联动 H 列
    $('#tableMaster').on('change', '.cell-input[data-field="PM Frequency"]', function () {
      autoFillH($(this).closest('tr'));
    });
  }

  // 已确认且未解锁的行：编辑控件禁用
  function applyRowLock(row, data) {
    const locked = data['是否确认'] === '已确认' && !unlockedIds[data['主数据ID']];
    $(row).find('.cell-input, .cell-select').prop('disabled', locked);
  }

  function initFilters() {
    $('#filterProcess').empty().append(PROCESS_OPTIONS.map(o => `<option>${o}</option>`).join(''));
    $('#filterStrategy').empty().append(STRATEGY_OPTIONS.map(o => `<option>${o}</option>`).join(''));
    $('#filterConfirm').empty().append(['未确认', '已确认'].map(o => `<option>${o}</option>`).join(''));
    $('select[multiple]').select2({ theme: 'bootstrap', width: '100%' });
    $('#filterProcess, #filterStrategy, #filterConfirm, #filterKeyword').on('change keyup', applyFilters);
  }

  function applyFilters() {
    const procs = $('#filterProcess').val() || [];
    const strats = $('#filterStrategy').val() || [];
    const confirms = $('#filterConfirm').val() || [];
    const kw = String($('#filterKeyword').val() || '').trim().toLowerCase();
    tableMaster.rows().every(function () {
      const d = this.data();
      const ok = (procs.length === 0 || procs.indexOf(d['工序']) !== -1)
        && (strats.length === 0 || strats.indexOf(d['策略 / Strategy']) !== -1)
        && (confirms.length === 0 || confirms.indexOf(d['是否确认']) !== -1)
        && (kw === '' || (String(d['Machine Type'] || '') + ' ' + String(d['PM Description'] || '')).toLowerCase().indexOf(kw) !== -1);
      $(this.node()).toggle(ok);
    });
  }

  $(document).ready(async function () {
    initFilters();
    try {
      await loadMasterData();
      renderMasterTable();
    } catch (e) {
      Swal.fire({ icon: 'error', title: swalTitle('加载失败', 'Load Failed'), html: swalHtml(String(e.message || e), '') });
    }
    $('#btnRefresh').on('click', async function () {
      try { await loadMasterData(); renderMasterTable(); }
      catch (e) { Swal.fire({ icon: 'error', title: swalTitle('刷新失败', 'Refresh Failed'), html: swalHtml(String(e.message || e), '') }); }
    });
  });
```

- [ ] **Step 2: 语法检查与既有测试**

Run: `node --check /tmp/equ-pm-tests/pm-masterdata-script.js`（先执行 `node -e "const s=require('fs').readFileSync('/Users/kelland/gas-projects/EQU-Digital-System/PM_MasterData-js.html','utf8').replace(/<\/?script[^>]*>/gi,'');require('fs').writeFileSync('/tmp/equ-pm-tests/pm-masterdata-script.js',s)"` 生成）；再 `node /tmp/equ-pm-tests/test-freq-to-months.js` 确认 Task 1 测试仍通过
Expected: SYNTAX OK + 换算测试 PASS

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add PM_MasterData-js.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.11_保养主数据_前端加载渲染与筛选

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: 编辑 / 新增 / 复制 / 删除 / 保存

**Files:**
- Modify: `PM_MasterData-js.html`

**Interfaces:**
- Consumes: Task 9 的 `tableMaster` / `masterRows` / `renderMasterTable` / `loadMasterData`
- Produces: 前端收集 `changes` 数组并调用 `save_PM_MasterData(changes, global_ID, global_Name)`

- [ ] **Step 1: 实现**

在 Task 9 的 `$(document).ready` 之后追加（同时把 Task 9 里 `loadMasterData` 成功回调改为先清空 `deletedIds`，见下方注意）：

```js
  let deletedIds = []; // 本次会话中标记删除的主数据ID（保存后清空）

  // 从表格 DOM 收集一行当前编辑值（键为表头名）
  function collectRowFromDom($row) {
    const out = {};
    $row.find('.cell-input, .cell-select').each(function () {
      out[$(this).attr('data-field')] = $(this).val() || '';
    });
    return out;
  }

  // 收集整表变更：新增（无ID）/ 修改（对比 masterRows 原值）/ 删除（deletedIds）
  function collectChanges() {
    const changes = [];
    tableMaster.rows().every(function () {
      const $row = $(this.node());
      const id = $row.attr('data-id') || '';
      const domRow = collectRowFromDom($row);
      if (!id) {
        changes.push({ '主数据ID': '', isNew: true, deleted: false, row: domRow });
        return;
      }
      const orig = masterRows.find(r => r['主数据ID'] === id);
      if (!orig) return;
      // 关键字段对比（14 个可编辑字段）
      const FIELDS = ['工序', 'Machine Type', 'PM Frequency', '强制保养频率/ Month', '策略 / Strategy', 'PM Description', '工单类型', '是否创工单', '是否计入AEM', 'RBM保养间隔时间', 'RBM保养提醒间隔时间', '单次停机时间/ h', 'TasklistName', '备注'];
      const dirty = FIELDS.some(f => String(orig[f] || '') !== String(domRow[f] || ''));
      if (dirty) changes.push({ '主数据ID': id, isNew: false, deleted: false, row: domRow });
    });
    deletedIds.forEach(id => changes.push({ '主数据ID': id, isNew: false, deleted: true, row: {} }));
    return changes;
  }

  function collectSelectedIds() {
    const ids = [];
    tableMaster.$('tr.row-selected').each(function () {
      const id = $(this).attr('data-id');
      if (id) ids.push(id);
    });
    return ids;
  }

  $('#tableMaster').on('click', 'tbody tr', function () {
    $(this).toggleClass('row-selected');
  });

  $('#btnAdd').on('click', function () {
    const empty = {};
    ['工序','Machine Type','PM Frequency','强制保养频率/ Month','策略 / Strategy','PM Description','工单类型','是否创工单','是否计入AEM','RBM保养间隔时间','RBM保养提醒间隔时间','单次停机时间/ h','TasklistName','备注','是否确认','主数据ID'].forEach(k => empty[k] = '');
    empty['是否确认'] = '未确认';
    masterRows.push(empty);
    renderMasterTable();
    tableMaster.search('').draw();
  });

  $('#btnCopy').on('click', function () {
    const ids = collectSelectedIds();
    if (ids.length === 0) { Swal.fire({ icon: 'warning', title: swalTitle('请先选择行', 'Select a row first') }); return; }
    ids.forEach(id => {
      const src = masterRows.find(r => r['主数据ID'] === id);
      if (!src) return;
      const copy = Object.assign({}, src);
      copy['主数据ID'] = '';
      copy['是否确认'] = '未确认';
      copy['确认人'] = ''; copy['确认时间'] = '';
      masterRows.push(copy);
    });
    renderMasterTable();
  });

  $('#btnDelete').on('click', function () {
    const ids = collectSelectedIds();
    if (ids.length === 0) { Swal.fire({ icon: 'warning', title: swalTitle('请先选择行', 'Select a row first') }); return; }
    const lockedIds = ids.filter(id => {
      const r = masterRows.find(x => x['主数据ID'] === id);
      return r && r['是否确认'] === '已确认' && !unlockedIds[id];
    });
    if (lockedIds.length > 0) {
      Swal.fire({ icon: 'error', title: swalTitle('已确认行不可删除', 'Confirmed rows cannot be deleted'), html: swalHtml('请先取消确认。', 'Unconfirm first.') });
      return;
    }
    Swal.fire({
      title: swalTitle('确认删除？', 'Confirm delete?'),
      html: swalHtml(`将删除 ${ids.length} 行。`, `${ids.length} row(s) will be deleted.`),
      icon: 'warning', showCancelButton: true, confirmButtonText: '确认', cancelButtonText: '取消'
    }).then(result => {
      if (!result.isConfirmed) return;
      ids.forEach(id => { if (deletedIds.indexOf(id) === -1) deletedIds.push(id); });
      masterRows = masterRows.filter(r => ids.indexOf(r['主数据ID']) === -1);
      renderMasterTable();
    });
  });

  $('#btnSave').on('click', function () {
    const changes = collectChanges();
    if (changes.length === 0) { Swal.fire({ icon: 'info', title: swalTitle('没有改动', 'No changes') }); return; }
    Swal.fire({
      title: swalTitle('确认保存？', 'Confirm save?'),
      html: swalHtml(`共 ${changes.length} 项改动将写入正式表。`, `${changes.length} change(s) will be saved.`),
      icon: 'question', showCancelButton: true, confirmButtonText: '确认', cancelButtonText: '取消'
    }).then(result => {
      if (!result.isConfirmed) return;
      Swal.fire({ title: swalTitle('保存中', 'Saving...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      google.script.run.withSuccessHandler(async r => {
        if (r && r.ok) {
          deletedIds = [];
          await loadMasterData(); renderMasterTable();
          Swal.fire({ icon: 'success', title: swalTitle('保存成功', 'Saved') });
        } else {
          Swal.fire({ icon: 'error', title: swalTitle('保存失败', 'Save Failed'), html: swalHtml(String((r && r.message) || r), '') });
        }
      }).withFailureHandler(e => {
        Swal.fire({ icon: 'error', title: swalTitle('保存失败', 'Save Failed'), html: swalHtml(String(e.message || e), '') });
      }).save_PM_MasterData(changes, global_ID, global_Name);
    });
  });
```

**注意**：Task 9 中 `loadMasterData` 的成功回调需先清空删除标记（防止"删除→刷新→保存"时误删已恢复的行）：

```js
  function loadMasterData() {
    return new Promise((resolve, reject) => {
      google.script.run.withSuccessHandler((r) => {
        if (r && r.rows) { masterRows = r.rows; deletedIds = []; resolve(); }
        else reject(new Error(r && r.error ? r.error : '加载失败'));
      }).withFailureHandler(reject).get_PM_MasterData();
    });
  }
```

- [ ] **Step 2: 语法检查**

Run: 重新生成 `/tmp/equ-pm-tests/pm-masterdata-script.js` 并 `node --check`
Expected: SYNTAX OK

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add PM_MasterData-js.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.12_保养主数据_编辑新增复制删除与保存

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: 确认流转 + 审核弹窗 + 导入 + 变更日志页

**Files:**
- Modify: `PM_MasterData-js.html`

**Interfaces:**
- Consumes: Task 9/10 产物；后端 `confirm_PM_MasterData` / `import_PM_MasterData` / `get_PM_MasterAuditLog`
- Produces: 确认/取消确认/解锁/导入/日志弹窗的完整前端

- [ ] **Step 1: 实现**

在 Task 10 之后追加：

```js
  // 审核人验证弹窗（镜像 PM_Task 的 planner 弹窗样式）
  function auditPrompt(titleCn, titleEn) {
    return Swal.fire({
      title: swalTitle(titleCn, titleEn),
      html: `
        <div class="mb-2"><label>工号：</label><input type="text" id="auditCode" class="swal2-input" placeholder="请输入工号" autocomplete="off"></div>
        <div class="mb-2"><label>姓名：</label><input type="text" id="auditName" class="swal2-input" placeholder="请输入姓名" autocomplete="off"></div>
        <div class="mb-2"><label>密码：</label><input type="password" id="auditPwd" class="swal2-input" placeholder="请输入密码"></div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: '确认', cancelButtonText: '取消',
      preConfirm: () => {
        const code = document.getElementById('auditCode').value.trim();
        const name = document.getElementById('auditName').value.trim();
        const pwd = document.getElementById('auditPwd').value.trim();
        if (!code || !name || !pwd) { Swal.showValidationMessage('请完整填写工号、姓名和密码'); return false; }
        return { code, name, pwd };
      }
    });
  }

  function runConfirm(ids, action) {
    auditPrompt(action === 'confirm' ? '确认(审核)' : '取消确认', action === 'confirm' ? 'Confirm (Audit)' : 'Unconfirm')
      .then(result => {
        if (!result.isConfirmed) return;
        Swal.fire({ title: swalTitle('处理中', 'Processing...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        google.script.run.withSuccessHandler(async r => {
          if (r && r.ok) { await loadMasterData(); renderMasterTable(); Swal.fire({ icon: 'success', title: swalTitle('操作成功', 'Done') }); }
          else Swal.fire({ icon: 'error', title: swalTitle('操作失败', 'Failed'), html: swalHtml(String((r && r.message) || r), '') });
        }).withFailureHandler(e => Swal.fire({ icon: 'error', title: swalTitle('操作失败', 'Failed'), html: swalHtml(String(e.message || e), '') }))
          .confirm_PM_MasterData(ids, result.value.code, result.value.name, result.value.pwd, action);
      });
  }

  $('#btnConfirm').on('click', function () {
    const ids = collectSelectedIds();
    if (ids.length === 0) { Swal.fire({ icon: 'warning', title: swalTitle('请先选择行', 'Select a row first') }); return; }
    const confirmed = ids.filter(id => (masterRows.find(r => r['主数据ID'] === id) || {})['是否确认'] === '已确认');
    if (confirmed.length > 0) {
      Swal.fire({ icon: 'warning', title: swalTitle('包含已确认行', 'Contains confirmed rows'), html: swalHtml('已确认的行将被跳过。', 'Confirmed rows will be skipped.') });
    }
    const todo = ids.filter(id => (masterRows.find(r => r['主数据ID'] === id) || {})['是否确认'] !== '已确认');
    if (todo.length === 0) return;
    runConfirm(todo, 'confirm');
  });

  $('#btnUnconfirm').on('click', function () {
    const ids = collectSelectedIds();
    if (ids.length === 0) { Swal.fire({ icon: 'warning', title: swalTitle('请先选择行', 'Select a row first') }); return; }
    const todo = ids.filter(id => (masterRows.find(r => r['主数据ID'] === id) || {})['是否确认'] === '已确认');
    if (todo.length === 0) { Swal.fire({ icon: 'info', title: swalTitle('所选行均未确认', 'Nothing to unconfirm') }); return; }
    runConfirm(todo, 'unconfirm');
  });

  // 解锁已确认行（审核验证后本次会话可编辑，保存走后端差异日志）
  $('#tableMaster').on('click', 'tbody tr', function () {
    const id = $(this).attr('data-id');
    const r = masterRows.find(x => x['主数据ID'] === id);
    if (!r || r['是否确认'] !== '已确认' || unlockedIds[id]) return;
    // 已确认行点击时提示解锁
    if (!$(this).data('lockPrompted')) {
      $(this).data('lockPrompted', true);
      auditPrompt('解锁编辑', 'Unlock for editing').then(result => {
        if (result.isConfirmed) {
          google.script.run.withSuccessHandler(v => {
            if (v && v.ok) {
              unlockedIds[id] = true;
              const $row = tableMaster.$(`tr[data-id="${id}"]`);
              $row.find('.cell-input, .cell-select').prop('disabled', false);
            } else Swal.fire({ icon: 'error', title: swalTitle('验证失败', 'Verification Failed') });
          }).verifyPM_MasterAuditor(result.value.code, result.value.name, result.value.pwd);
        }
      });
    }
  });

  $('#btnImport').on('click', function () {
    Swal.fire({
      title: swalTitle('导入草稿？', 'Import draft?'),
      html: swalHtml('将把草稿表 MasterData 全部导入正式表（状态=未确认）。正式表非空时会被拒绝。', 'Import all draft rows as unconfirmed. Rejected if the master table is not empty.'),
      icon: 'question', showCancelButton: true, confirmButtonText: '确认', cancelButtonText: '取消'
    }).then(result => {
      if (!result.isConfirmed) return;
      Swal.fire({ title: swalTitle('导入中', 'Importing...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      google.script.run.withSuccessHandler(async r => {
        if (r && r.ok) { await loadMasterData(); renderMasterTable(); Swal.fire({ icon: 'success', title: swalTitle('导入成功', 'Imported'), html: swalHtml(String(r.message || ''), '') }); }
        else Swal.fire({ icon: 'error', title: swalTitle('导入失败', 'Import Failed'), html: swalHtml(String((r && r.message) || r), '') });
      }).withFailureHandler(e => Swal.fire({ icon: 'error', title: swalTitle('导入失败', 'Import Failed'), html: swalHtml(String(e.message || e), '') }))
        .import_PM_MasterData(global_ID, global_Name);
    });
  });

  let tableAuditLog = null;
  $('#btnAuditLog').on('click', function () {
    $('#auditLogModal').modal('show');
    google.script.run.withSuccessHandler(r => {
      const rows = (r && r.rows) || [];
      if (tableAuditLog) tableAuditLog.destroy();
      tableAuditLog = $('#tableAuditLog').DataTable({
        data: rows,
        columns: ['时间', '工号', '姓名', '动作', '主数据ID', '字段', '旧值', '新值'].map(h => ({ title: h, data: h })),
        order: [[0, 'desc']],
        pageLength: 15
      });
    }).get_PM_MasterAuditLog();
  });
```

- [ ] **Step 2: 语法检查 + 全部既有测试**

Run: 重新生成 `/tmp/equ-pm-tests/pm-masterdata-script.js` 并 `node --check`；`node /tmp/equ-pm-tests/test-freq-to-months.js`
Expected: SYNTAX OK + PASS

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add PM_MasterData-js.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.13_保养主数据_确认流转导入与日志页

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Navigation 入口 + 整体验证 + 推送

**Files:**
- Modify: `Navigation.html`（菜单按钮）、`Navigation_js.html`（点击跳转）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: Navigation 加入口**

在 `Navigation.html` 第 317 行 `<button class="modal-card-btn" type="button" id="PM_Plan">` 按钮块之后插入同结构按钮：

```html
            <button class="modal-card-btn" type="button" id="PM_MasterData">
              <i class="bi bi-database-gear mc-icon"></i>
              <div class="mc-text">
                <div class="title-cn">保养主数据</div>
                <div class="title-en">PM Master Data</div>
              </div>
              <i class="bi bi-chevron-right mc-arrow"></i>
            </button>
```

再在 `Navigation_js.html` 的 `$('#PM_Plan').click(...)` 块之后插入（沿用同文件的 id/name/process/workshop 变量与 URL 拼接风格）：

```js
    $('#PM_MasterData').click(() => {
        let url = siWebPage + '?v=PM_MasterData'
            + '&ID=' + encodeURIComponent(id)
            + '&Name=' + encodeURIComponent(name)
            + '&Process=' + encodeURIComponent(process)
            + '&Workshop=' + encodeURIComponent(workshop);
        window.open(url);
        $('#pmModal').modal('hide');
    });
```

- [ ] **Step 2: 全部验证**

Run:
```bash
node --check /Users/kelland/gas-projects/EQU-Digital-System/Code.js
node /tmp/equ-pm-tests/test-freq-to-months.js
node /tmp/equ-pm-tests/test-master-record-mapping.js
node /tmp/equ-pm-tests/test-field-diffs.js
git -C /Users/kelland/gas-projects/EQU-Digital-System status --porcelain
```
Expected: SYNTAX OK、3 个测试全 PASS、工作区仅含本次新增/修改文件（PM_MasterData.html、PM_MasterData-js.html、Navigation.html、Navigation_js.html、Code.js 及此前的 PM_Task/NPI 改动）

- [ ] **Step 3: Commit**

```bash
git -C /Users/kelland/gas-projects/EQU-Digital-System add Navigation.html Navigation_js.html
git -C /Users/kelland/gas-projects/EQU-Digital-System commit -m "V20260819.14_保养主数据_导航入口

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 4: 推送 GAS（需用户确认）**

向用户展示 `git status` 变更清单并确认后执行 `clasp push`。

- [ ] **Step 5: 浏览器验证清单（用户在 GAS 上验证）**

1. 导航进入"保养主数据"页面，正式表首次打开自动建 MasterData sheet（20 列表头）与变更日志 sheet
2. 点"导入草稿"→ 80 条导入、状态全部"未确认"、H 列 `#VALUE!` 行为空
3. 编辑频率"半年"→ H 列自动填 6；手改 H 列生效
4. 新增一行、复制一行、删除一行 → 保存 → 刷新后数据一致
5. 变更日志弹窗可见新增/修改/删除/导入记录
6. 勾选行点"确认(审核)"→ 用 BM 列=Y 的审核人通过 → 徽章变绿、确认人/时间写入；用无 Y 权限的账号验证失败
7. 已确认行编辑控件禁用；点行解锁（审核验证）后可编辑并保存
8. 正式表非空时再点"导入草稿"被拒绝
9. 部署生产（exec URL）前由用户确认（deploy-gas 流程）

- [ ] **Step 6: 汇报**

向用户汇总实现结果、测试证据（3 个 Node 测试通过 + node --check）、浏览器验证清单第 1-8 项结果，等待用户确认部署。
