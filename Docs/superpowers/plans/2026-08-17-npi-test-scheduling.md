# NPI 测试计划（Phase 2A）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增测试计划页（NPI_Dashboard），实现任务状态流转、周列表视图、机台冲突提示、草稿表一次性导入，并打通与工艺参数页的跳转联动。

**Architecture:** GAS Web App 单体架构。新建 1 个页面（HTML + JS 一对文件），Code.js 追加状态机/导入后端函数；复用 NPI_TestTasks 表（不改列结构）与现有 loadNPITestTaskList。无新数据表。

**Tech Stack:** Google Apps Script, Bootstrap 5.3.1, jQuery 3.6.4, Select2 4.0.13, SweetAlert2。前端筛选/分组/冲突检测在客户端做（数据量百级）。

**Spec:** `docs/superpowers/specs/2026-08-17-npi-test-scheduling-design.md`

## Global Constraints

- 表头双语格式：`中文<br>English`（不用 `/`）；Navbar 标题例外：`中文 / English`
- 任务状态存储值为双语字符串：`待确认 Pending` / `已排期 Scheduled` / `执行中 In Progress` / `已完成 Completed` / `已取消 Cancelled`
- 周定义与草稿表一致：**周五起始**，WK01 = 2026/1/2（当年第一个周五）；年初第一个周五之前的日期归上一年最后一周
- Git commit 格式：`VYYYYMMDD.XX_中文描述`（当天日期与序号按仓库惯例），并附 `Co-Authored-By: Claude <noreply@anthropic.com>`
- 后端新函数必须 `Route.path` 注册（沿用 Code.js 惯例）；前端经 `google.script.run` 调用
- 测试方式（本仓库无测试框架）：一次性 Node 脚本放在 `/tmp/`，从真实源文件提取函数源码用 `vm` 运行断言（本会话既有模式）；前端 DOM 交互靠语法检查 + dev 实测
- 每个 Task 完成后 `clasp push` 推送 GAS（不部署生产，不提交 GitHub——由用户在全部完成后统一决定）
- 草稿表日期列是 Date 对象：**服务端必须 `Utilities.formatDate` 转 `yyyy-MM-dd` 字符串后再返回 JSON**（Date 对象经 google.script.run 会静默出错）

---

### Task 1: 状态机纯函数 + 后端状态流转 updateNPITaskStatus

**Files:**
- Modify: `Code.js`（NPI 区块，`loadNPIProcessRecordHistory` 附近）
- Test: `/tmp/npi-status-test.js`（新建）

**Interfaces:**
- Consumes: `NPI_SS_ID` 常量（已存在）、`Session.getScriptTimeZone()`
- Produces:
  - `isValidNPIStatusTransition_(fromStatus, toStatus) → boolean`
  - `updateNPITaskStatus(taskID, newStatus) → JSON字符串 {success, message}`（注册 Route.path("updateNPITaskStatus", ...)）

- [ ] **Step 1: 写失败测试**

创建 `/tmp/npi-status-test.js`：

```javascript
// 一次性测试：Code.js 状态机纯函数
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const src = fs.readFileSync('/Users/kelland/gas-projects/EQU-Digital-System/Code.js', 'utf8');
const marker = 'function isValidNPIStatusTransition_';
const idx = src.indexOf(marker);
assert.ok(idx >= 0, 'FAIL: function isValidNPIStatusTransition_ not found (feature missing)');
let depth = 0, i = src.indexOf('{', idx);
for (; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) break; }
}
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src.slice(idx, i + 1), sandbox);
const fn = sandbox.isValidNPIStatusTransition_;

assert.strictEqual(fn('待确认 Pending', '已排期 Scheduled'), true);
assert.strictEqual(fn('待确认 Pending', '已取消 Cancelled'), true);
assert.strictEqual(fn('待确认 Pending', '已完成 Completed'), false); // 不可跳级
assert.strictEqual(fn('已排期 Scheduled', '执行中 In Progress'), true);
assert.strictEqual(fn('已排期 Scheduled', '已取消 Cancelled'), true);
assert.strictEqual(fn('执行中 In Progress', '已完成 Completed'), true);
assert.strictEqual(fn('执行中 In Progress', '已取消 Cancelled'), true);
assert.strictEqual(fn('已完成 Completed', '已取消 Cancelled'), false); // 终态不可取消
assert.strictEqual(fn('已取消 Cancelled', '执行中 In Progress'), false);
assert.strictEqual(fn('', '已排期 Scheduled'), false);
console.log('ALL PASS');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/npi-status-test.js`
Expected: FAIL with "function isValidNPIStatusTransition_ not found"

- [ ] **Step 3: 最小实现**

在 `Code.js` NPI 区块追加（`loadNPIProcessRecordHistory` 函数之前）：

```javascript
// 任务状态机：合法迁移表（存储值为双语字符串）
var NPI_STATUS_FLOW = {
  '待确认 Pending': ['已排期 Scheduled', '已取消 Cancelled'],
  '已排期 Scheduled': ['执行中 In Progress', '已取消 Cancelled'],
  '执行中 In Progress': ['已完成 Completed', '已取消 Cancelled'],
  '已完成 Completed': [],
  '已取消 Cancelled': []
};

// 校验状态迁移是否合法
function isValidNPIStatusTransition_(fromStatus, toStatus) {
  var allowed = NPI_STATUS_FLOW[fromStatus];
  return !!allowed && allowed.indexOf(toStatus) >= 0;
}

// 任务状态流转：状态机校验 + 写状态列（第3列）+ 更新 updatedAt（第18列）
function updateNPITaskStatus(taskID, newStatus) {
  try {
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_TestTasks");
    if (!ws) return JSON.stringify({ success: false, message: "Sheet not found" });
    var data = ws.getDataRange().getValues();
    var rowIdx = -1, fromStatus = '';
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === taskID) {
        rowIdx = i + 1;
        fromStatus = String(data[i][2] || '').trim();
        break;
      }
    }
    if (rowIdx < 0) return JSON.stringify({ success: false, message: "任务未找到 / Task not found" });
    if (!isValidNPIStatusTransition_(fromStatus, newStatus)) {
      return JSON.stringify({ success: false, message: "状态流转不合法 / Invalid status transition" });
    }
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.getRange(rowIdx, 3).setValue(newStatus);
    ws.getRange(rowIdx, 18).setValue(now);
    return JSON.stringify({ success: true, message: "状态已更新 / Status updated" });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

在 `doGet` 路由区追加一行：

```javascript
  Route.path("updateNPITaskStatus", updateNPITaskStatus);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/npi-status-test.js`
Expected: ALL PASS

- [ ] **Step 5: 语法检查并推送**

Run:
```bash
node --check Code.js && cd /Users/kelland/gas-projects/EQU-Digital-System && clasp push
```
Expected: 无语法错误，clasp push 成功（再跑一次应显示 "Script is already up to date."）

- [ ] **Step 6: Commit**

```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
git add Code.js
git commit -m "VYYYYMMDD.XX_NPI任务状态机与状态流转后端" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```
（日期/序号按仓库惯例）

---

### Task 2: 草稿表导入（映射/去重纯函数 + 候选读取 + 批量导入）

**Files:**
- Modify: `Code.js`（NPI 区块 + 顶部常量区 + doGet 路由区）
- Test: `/tmp/npi-import-test.js`（新建）

**Interfaces:**
- Consumes: Task 1 无依赖；复用 `isValidWorkcenterModel_`（已存在）、`getSapToNameMap_`（已存在）、`NPI_SS_ID`、`NPI_WORKCENTER_SS_ID`
- Produces:
  - `mapTestPlanStatus_(draftStatus) → string`（NPI 双语状态值，未知状态归待确认）
  - `taskImportKey_(productName, moldNo, machineNo, dateStr) → string`（四元组去重键）
  - `loadTestPlanImportCandidates() → JSON {success, data:[{rowIndex, date, productName, moldNo, machineNo, remark, status, imported}]}`
  - `importTestPlanRows(rowsJSON, operatorSAPID) → JSON {success, imported, skipped, message}`

- [ ] **Step 1: 写失败测试**

创建 `/tmp/npi-import-test.js`：

```javascript
// 一次性测试：Code.js 导入映射与去重键
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const src = fs.readFileSync('/Users/kelland/gas-projects/EQU-Digital-System/Code.js', 'utf8');
function extract(name) {
  const marker = 'function ' + name;
  const idx = src.indexOf(marker);
  assert.ok(idx >= 0, 'FAIL: function ' + name + ' not found (feature missing)');
  let depth = 0, i = src.indexOf('{', idx);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(idx, i + 1);
}
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extract('mapTestPlanStatus_') + '\n' + extract('taskImportKey_'), sandbox);
const map = sandbox.mapTestPlanStatus_;
const key = sandbox.taskImportKey_;

// 状态映射（草稿表7态 → NPI五态）
assert.strictEqual(map('已完成'), '已完成 Completed');
assert.strictEqual(map('正在进行'), '执行中 In Progress');
assert.strictEqual(map('延期'), '已排期 Scheduled');
assert.strictEqual(map('未完成'), '已排期 Scheduled');
assert.strictEqual(map('满产'), '待确认 Pending');
assert.strictEqual(map('模具不在线'), '待确认 Pending');
assert.strictEqual(map('取消'), '已取消 Cancelled');
assert.strictEqual(map('未知状态'), '待确认 Pending'); // 未知归待确认
assert.strictEqual(map(''), '待确认 Pending');

// 四元组去重键：trim + || 连接
assert.strictEqual(key(' A ', 'M1', 'H1', '2026-08-17'), 'A||M1||H1||2026-08-17');
assert.strictEqual(key('', '', '', ''), '||||');
assert.notStrictEqual(key('A', 'M1', 'H1', '2026-08-17'), key('A', 'M1', 'H1', '2026-08-18'));
console.log('ALL PASS');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/npi-import-test.js`
Expected: FAIL with "function mapTestPlanStatus_ not found"

- [ ] **Step 3: 最小实现**

在 `Code.js` 顶部常量区（`BOM_FOLDER_ID` 行后）追加：

```javascript
const TEST_PLAN_SS_ID = "17ys3UDFWjhfaPnk0TErqqeU0FnMP7nsRoRsTmlmm2fg"; // 2026 Test Plan 草稿表
const TEST_PLAN_IM_SHEET = "注塑测试";
```

在 NPI 区块追加：

```javascript
// 草稿表状态 → NPI 状态（未知状态归待确认）
function mapTestPlanStatus_(draftStatus) {
  var map = {
    '已完成': '已完成 Completed',
    '正在进行': '执行中 In Progress',
    '延期': '已排期 Scheduled',
    '未完成': '已排期 Scheduled',
    '满产': '待确认 Pending',
    '模具不在线': '待确认 Pending',
    '取消': '已取消 Cancelled'
  };
  return map[draftStatus] || '待确认 Pending';
}

// 导入去重键：产品+模具+机台+日期 四元组
function taskImportKey_(productName, moldNo, machineNo, dateStr) {
  return [String(productName || '').trim(), String(moldNo || '').trim(), String(machineNo || '').trim(), String(dateStr || '').trim()].join('||');
}

// 导入候选：读草稿表「注塑测试」全部行，标记已导入（四元组去重）
function loadTestPlanImportCandidates() {
  try {
    var ws = SpreadsheetApp.openById(TEST_PLAN_SS_ID).getSheetByName(TEST_PLAN_IM_SHEET);
    if (!ws) return JSON.stringify({ success: false, message: '测试计划表不可访问 / Test plan sheet not accessible' });
    var data = ws.getDataRange().getValues();
    var tData = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_TestTasks").getDataRange().getValues();
    var existingKeys = {};
    for (var i = 1; i < tData.length; i++) {
      if (!String(tData[i][0] || '').trim()) continue;
      var d = tData[i][9] instanceof Date ? Utilities.formatDate(tData[i][9], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(tData[i][9] || '').trim();
      existingKeys[taskImportKey_(tData[i][3], tData[i][4], tData[i][5], d)] = true;
    }
    var candidates = [];
    for (var j = 1; j < data.length; j++) {
      var product = String(data[j][5] || '').trim();
      if (!product) continue;
      var dateStr = data[j][1] instanceof Date ? Utilities.formatDate(data[j][1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(data[j][1] || '').trim();
      var mold = String(data[j][7] || '').trim();
      var machine = String(data[j][11] || '').trim();
      candidates.push({
        rowIndex: j + 1,
        date: dateStr,
        productName: product,
        moldNo: mold,
        machineNo: machine,
        remark: String(data[j][6] || '').trim(),
        status: mapTestPlanStatus_(String(data[j][15] || '').trim()),
        imported: !!existingKeys[taskImportKey_(product, mold, machine, dateStr)]
      });
    }
    return JSON.stringify({ success: true, data: candidates });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

// 批量导入选中的草稿表行（客户端传候选对象数组；服务端再次四元组去重；机型由Workcenter带出）
function importTestPlanRows(rowsJSON, operatorSAPID) {
  try {
    var rows = typeof rowsJSON === 'string' ? JSON.parse(rowsJSON) : rowsJSON;
    if (!rows || !rows.length) return JSON.stringify({ success: true, imported: 0, skipped: 0, message: '无可导入行 / Nothing to import' });
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_TestTasks");
    if (!ws) return JSON.stringify({ success: false, message: 'Sheet not found' });
    var data = ws.getDataRange().getValues();
    var existingKeys = {};
    for (var i = 1; i < data.length; i++) {
      if (!String(data[i][0] || '').trim()) continue;
      var d = data[i][9] instanceof Date ? Utilities.formatDate(data[i][9], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(data[i][9] || '').trim();
      existingKeys[taskImportKey_(data[i][3], data[i][4], data[i][5], d)] = true;
    }
    var wcModel = {};
    try {
      var wcData = SpreadsheetApp.openById(NPI_WORKCENTER_SS_ID).getSheetByName('Workcenter').getDataRange().getValues();
      for (var w = 1; w < wcData.length; w++) {
        var model = String(wcData[w][3] || '').trim();
        if (!isValidWorkcenterModel_(model)) continue;
        wcModel[String(wcData[w][0] || '').trim()] = model;
      }
    } catch (e) {}
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var todayPrefix = 'NPI-' + dateStr.replace(/-/g, '');
    var todayCount = 0;
    for (var c = 1; c < data.length; c++) {
      if (String(data[c][0] || '').indexOf(todayPrefix) === 0) todayCount++;
    }
    var sapToName = getSapToNameMap_();
    var opName = sapToName[operatorSAPID] || '';
    var operatorId = opName ? opName + '|' + operatorSAPID : operatorSAPID;
    var imported = 0, skipped = 0;
    rows.forEach(function (r) {
      var key = taskImportKey_(r.productName, r.moldNo, r.machineNo, r.date);
      if (existingKeys[key]) { skipped++; return; }
      existingKeys[key] = true;
      todayCount++;
      var seq = ('000' + todayCount).slice(-4);
      var status = r.status || '待确认 Pending'; // 客户端候选已携带映射后的状态
      ws.appendRow([
        todayPrefix + '-' + seq,             // 0 任务ID
        '周计划 Weekly',                      // 1 来源
        status,                              // 2 状态
        String(r.productName || ''),         // 3 产品名称
        String(r.moldNo || ''),              // 4 模具编号
        String(r.machineNo || ''),           // 5 机台编号
        '',                                  // 6 物料（留空）
        '',                                  // 7 发起部门（Phase 2B 联动）
        operatorId,                          // 8 发起人（导入人）
        String(r.date || dateStr),           // 9 计划日期
        status === '待确认 Pending' ? '待确认 Pending' : '已确认 Confirmed', // 10 计划部确认
        '', '', '', '',                      // 11-14
        String(r.remark || ''),              // 15 备注
        now, now,                            // 16-17
        'IM',                                // 18 工序
        '',                                  // 19 SKU（留空）
        wcModel[String(r.machineNo || '').trim()] || '' // 20 机型
      ]);
      imported++;
    });
    return JSON.stringify({ success: true, imported: imported, skipped: skipped, message: '导入完成 / Import done' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

在 `doGet` 路由区追加两行：

```javascript
  Route.path("loadTestPlanImportCandidates", loadTestPlanImportCandidates);
  Route.path("importTestPlanRows", importTestPlanRows);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/npi-import-test.js`
Expected: ALL PASS

- [ ] **Step 5: 语法检查并推送**

Run:
```bash
node --check Code.js && cd /Users/kelland/gas-projects/EQU-Digital-System && clasp push
```
Expected: 无语法错误，clasp push 成功（再跑一次 "Script is already up to date."）

- [ ] **Step 6: Commit**

```bash
git add Code.js
git commit -m "VYYYYMMDD.XX_NPI草稿表导入后端" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 测试计划页（NPI_Dashboard.html + js + 路由/导航启用）

**Files:**
- Create: `NPI_Dashboard.html`
- Create: `NPI_Dashboard-js.html`
- Modify: `Code.js`（`loadNPIDashboard` 加载器 + `Route.path("NPI_Dashboard", ...)`）
- Modify: `Navigation.html`（启用「测试计划」按钮，替换 Coming Soon）
- Modify: `Navigation_js.html`（按钮点击跳转）
- Test: `/tmp/npi-dashboard-test.js`（新建）

**Interfaces:**
- Consumes: `loadNPITestTaskList`（已存在，返回字段见其实现：taskID/source/status/productName/moldNo/machineNo/material/reqPerson/planDate/processType/sku/machineModel）、`updateNPITaskStatus`（Task 1）、`loadTestPlanImportCandidates` / `importTestPlanRows`（Task 2）、页面渲染模板 `render(file, obj)` 与 `getReleaseWebPage()`、`webIconUrl`
- Produces:
  - `computeWeekInfo_(dateStr) → {key, start, end, label} | null`（周五起始周）
  - `findMachineConflicts_(tasks) → {taskID: [冲突的其它taskID]}`
  - 页面 `?v=NPI_Dashboard`

- [ ] **Step 1: 写失败测试**

创建 `/tmp/npi-dashboard-test.js`：

```javascript
// 一次性测试：NPI_Dashboard-js.html 纯函数（周计算 / 冲突检测）
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const FILE = '/Users/kelland/gas-projects/EQU-Digital-System/NPI_Dashboard-js.html';
const src = fs.readFileSync(FILE, 'utf8');
const script = src.replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, '');
function extract(name) {
  const marker = 'function ' + name;
  const idx = script.indexOf(marker);
  assert.ok(idx >= 0, 'FAIL: function ' + name + ' not found (feature missing)');
  let depth = 0, i = script.indexOf('{', idx);
  for (; i < script.length; i++) {
    if (script[i] === '{') depth++;
    else if (script[i] === '}') { depth--; if (depth === 0) break; }
  }
  return script.slice(idx, i + 1);
}
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extract('computeWeekInfo_') + '\n' + extract('findMachineConflicts_'), sandbox);
const week = sandbox.computeWeekInfo_;
const conflicts = sandbox.findMachineConflicts_;
const norm = a => JSON.parse(JSON.stringify(a));

// 周五起始周：WK01 = 2026/1/2（当年第一个周五）
assert.deepStrictEqual(norm(week('2026-01-02')), { key: 'WK01', start: '2026-01-02', end: '2026-01-08', label: 'WK01 2026-01-02~2026-01-08' });
// 2026-08-17（周一）属于 WK33（周五 8/14 起始）
assert.strictEqual(week('2026-08-17').key, 'WK33');
assert.strictEqual(week('2026-08-17').start, '2026-08-14');
assert.strictEqual(week('2026-08-17').end, '2026-08-20');
// 年底周四归 WK52
assert.strictEqual(week('2026-12-31').key, 'WK52');
// 新年前、第一个周五之前的日期归上一年最后一周：2027-01-01 是周五 → WK01
assert.strictEqual(week('2027-01-01').key, 'WK01');
// 非法日期
assert.strictEqual(week('not-a-date'), null);

// 冲突检测：同机台同天 ≥2 条活跃任务
const t1 = { taskID: 'NPI-1', machineNo: 'H1', planDate: '2026-08-17', status: '待确认 Pending' };
const t2 = { taskID: 'NPI-2', machineNo: 'H1', planDate: '2026-08-17', status: '已排期 Scheduled' };
const t3 = { taskID: 'NPI-3', machineNo: 'H1', planDate: '2026-08-17', status: '已完成 Completed' };
const t4 = { taskID: 'NPI-4', machineNo: 'H1', planDate: '2026-08-18', status: '待确认 Pending' };
assert.deepStrictEqual(norm(conflicts([t1, t2, t3, t4])), { 'NPI-1': ['NPI-2'], 'NPI-2': ['NPI-1'] });
assert.deepStrictEqual(norm(conflicts([t1, t4])), {}); // 不同天
assert.deepStrictEqual(norm(conflicts([t1, t3])), {}); // 一条已完成不算活跃
console.log('ALL PASS');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/npi-dashboard-test.js`
Expected: FAIL（文件不存在）— 先创建两个空文件占位（含 `<script></script>`），再运行确认 "not found" 失败。

- [ ] **Step 3: 创建 NPI_Dashboard.html**

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!=include("Kez_Bootstrap@5.3.1_css");?>
  <?!=include("Kez_Select2-bootstrap_css");?>
  <?!=include("CSS");?>
</head>
<body>
  <nav class="navbar navbar-dark bg-primary">
    <div class="container-fluid">
      <a class="navbar-brand" href="#" style="display:flex;align-items:center;gap:8px;">
        <img src="<?= webIconUrl || '' ?>" alt="" style="height:26px;">
        <span>测试计划 / Test Scheduling</span>
      </a>
      <div class="d-flex align-items-center gap-2 text-white" style="font-size:14px;">
        <span id="name"><?= intoWebName ?></span>
        <span id="userLevelBadge" class="badge bg-secondary">加载中... / Loading...</span>
      </div>
    </div>
  </nav>

  <div class="container-fluid py-3" style="max-width:1400px;">
    <div class="section-card">
      <div class="section-title">
        <span>测试计划<br><small style="font-weight:400;color:#888;">Test Scheduling</small></span>
        <div class="toolbar">
          <button class="btn btn-outline-primary" id="btnNewTask">
            <i class="bi bi-plus-circle"></i> 新建任务<br><small>New Task</small>
          </button>
          <button class="btn btn-outline-success" id="btnImport">
            <i class="bi bi-file-earmark-arrow-down"></i> 从测试计划导入<br><small>Import from Test Plan</small>
          </button>
        </div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-md-2"><label class="form-label-sm">周<br><small>Week</small></label><select id="weekFilter" class="form-select form-select-sm"></select></div>
        <div class="col-md-2"><label class="form-label-sm">状态<br><small>Status</small></label><select id="statusFilter" class="form-select form-select-sm">
          <option value="">全部 / All</option>
          <option value="待确认 Pending">待确认 Pending</option>
          <option value="已排期 Scheduled">已排期 Scheduled</option>
          <option value="执行中 In Progress">执行中 In Progress</option>
          <option value="已完成 Completed">已完成 Completed</option>
          <option value="已取消 Cancelled">已取消 Cancelled</option>
        </select></div>
        <div class="col-md-2"><label class="form-label-sm">机台<br><small>Machine</small></label><select id="machineFilter" class="form-select form-select-sm"></select></div>
        <div class="col-md-2"><label class="form-label-sm">来源<br><small>Source</small></label><select id="sourceFilter" class="form-select form-select-sm">
          <option value="">全部 / All</option>
          <option value="weekly">周计划 Weekly</option>
          <option value="urgent">紧急 Urgent</option>
        </select></div>
        <div class="col-md-2"><label class="form-label-sm">负责人<br><small>Requestor</small></label><select id="reqFilter" class="form-select form-select-sm"></select></div>
      </div>
      <div id="taskTableWrap"></div>
    </div>
  </div>

  <!-- 导入弹窗 -->
  <div class="modal fade" id="importModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">从测试计划导入 / Import from Test Plan</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
          <div class="mb-2 d-flex align-items-center gap-3" style="font-size:12px;">
            <label><input type="checkbox" id="importCheckAll" checked> 全选 / Check All</label>
            <span class="text-muted" id="importHint"></span>
          </div>
          <table class="table table-sm table-hover mb-0" id="importTable" style="font-size:12px;">
            <thead><tr>
              <th></th><th>日期<br><small>Date</small></th><th>产品名称<br><small>Product</small></th>
              <th>模具号<br><small>Mold</small></th><th>机台<br><small>Machine</small></th>
              <th>状态<br><small>Status</small></th><th>测试说明<br><small>Remark</small></th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">取消 / Cancel</button>
          <button type="button" class="btn btn-sm btn-primary" id="btnDoImport">导入 / Import</button>
        </div>
      </div>
    </div>
  </div>

  <?!=include("Kez_jquery@3.6.4_js") ?>
  <?!=include("Kez_bootstrap@5.3.1_js") ?>
  <?!=include("Kez_sweetalert2_js") ?>
  <?!=include("NPI_Dashboard-js") ?>
</body>
</html>
```

- [ ] **Step 4: 创建 NPI_Dashboard-js.html**

```html
<script>
// ============================================================
//  测试计划 JS / Test Scheduling JS
// ============================================================
var siWebPage = '<?!= webPage ?>';
var intoWebID = '<?!= intoWebID ?>';
var intoWebName = '<?!= intoWebName ?>';
var intoWebType = '<?!= intoWebType ?>';

const swalTitle = (cn, en) => `${cn}<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">${en}</span>`;
const swalHtml = (cn, en) => `<div>${cn}<div style="font-size:0.85em;color:#888;margin-top:6px;line-height:1.4;">${en}</div></div>`;
function parseResponse(raw) { return typeof raw === 'string' ? JSON.parse(raw) : raw; }

var allTasks = [];
var importCandidates = [];

var NPI_ACTIVE_STATUSES = ['待确认 Pending', '已排期 Scheduled', '执行中 In Progress'];
var STATUS_BADGE_CLASS = {
  '待确认 Pending': 'bg-secondary',
  '已排期 Scheduled': 'bg-primary',
  '执行中 In Progress': 'bg-warning text-dark',
  '已完成 Completed': 'bg-success',
  '已取消 Cancelled': 'bg-dark'
};

// 周五起始周（与草稿表一致：WK01=当年第一个周五）
function computeWeekInfo_(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  var d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var diff = (d.getDay() + 2) % 7; // 距上周五的天数
  var friday = new Date(d.getTime() - diff * 86400000);
  function firstFridayOf(year) {
    var s = new Date(year, 0, 1);
    return new Date(s.getTime() + ((5 - s.getDay() + 7) % 7) * 86400000);
  }
  var firstFriday = firstFridayOf(friday.getFullYear());
  var weekNum = Math.floor((friday - firstFriday) / (7 * 86400000)) + 1;
  if (weekNum < 1) {
    firstFriday = firstFridayOf(friday.getFullYear() - 1);
    weekNum = Math.floor((friday - firstFriday) / (7 * 86400000)) + 1;
  }
  var end = new Date(friday.getTime() + 6 * 86400000);
  function fmt(x) { return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  return { key: 'WK' + ('0' + weekNum).slice(-2), start: fmt(friday), end: fmt(end), label: 'WK' + ('0' + weekNum).slice(-2) + ' ' + fmt(friday) + '~' + fmt(end) };
}

// 机台冲突：同机台+同天 ≥2 条活跃任务 → {taskID: [冲突taskID...]}
function findMachineConflicts_(tasks) {
  var byKey = {};
  (tasks || []).forEach(function (t) {
    if (!t.machineNo || !t.planDate) return;
    if (NPI_ACTIVE_STATUSES.indexOf(t.status) < 0) return;
    var k = t.machineNo + '||' + t.planDate;
    (byKey[k] = byKey[k] || []).push(t.taskID);
  });
  var out = {};
  Object.keys(byKey).forEach(function (k) {
    var ids = byKey[k];
    if (ids.length >= 2) {
      ids.forEach(function (id) { out[id] = ids.filter(function (x) { return x !== id; }); });
    }
  });
  return out;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

$(document).ready(function () {
  var perm = sessionStorage.getItem('EDSTaskPermission') || '';
  var permLabels = { 'admin': '管理员 / Admin', 'supervisor': '主管 / Supervisor', 'employee': '员工 / Employee' };
  $('#userLevelBadge').removeClass('bg-secondary bg-danger bg-warning')
    .addClass(perm === 'admin' ? 'bg-danger' : (perm === 'supervisor' ? 'bg-warning text-dark' : 'bg-secondary'))
    .text(permLabels[perm] || ('员工 / Employee'));

  loadTasks();

  $('#weekFilter, #statusFilter, #machineFilter, #sourceFilter, #reqFilter').on('change', renderTable);
  $('#btnNewTask').on('click', function () { openProcessPage('new=1'); });
  $('#btnImport').on('click', openImportModal);
  $('#importCheckAll').on('change', function () {
    $('#importTable tbody input[type=checkbox]').prop('checked', $(this).prop('checked'));
  });
  $('#btnDoImport').on('click', doImport);
});

function openProcessPage(extraParam) {
  var url = siWebPage + '?v=NPI_ProcessRecord'
    + (extraParam ? '&' + extraParam : '')
    + '&ID=' + encodeURIComponent(sessionStorage.getItem('ID') || intoWebID || '')
    + '&Name=' + encodeURIComponent(sessionStorage.getItem('Name') || intoWebName || '')
    + '&Process=' + encodeURIComponent(sessionStorage.getItem('Process') || intoWebType || '');
  window.open(url, '_blank');
}

function loadTasks() {
  google.script.run
    .withSuccessHandler(function (result) {
      var r = parseResponse(result);
      allTasks = r.success ? r.data : [];
      buildFilters();
      renderTable();
    })
    .loadNPITestTaskList();
}

function buildFilters() {
  var machines = {}, requestors = {};
  allTasks.forEach(function (t) {
    if (t.machineNo) machines[t.machineNo] = true;
    if (t.reqPerson) requestors[t.reqPerson] = true;
  });
  var mSel = $('#machineFilter'), rSel = $('#reqFilter');
  mSel.empty().append('<option value="">全部机台 / All</option>');
  Object.keys(machines).sort().forEach(function (m) { mSel.append('<option value="' + m + '">' + m + '</option>'); });
  rSel.empty().append('<option value="">全部负责人 / All</option>');
  Object.keys(requestors).sort().forEach(function (r) { rSel.append('<option value="' + r + '">' + r + '</option>'); });
  // 周选项（含全部）
  var weeks = {};
  allTasks.forEach(function (t) {
    if (!t.planDate) return;
    var w = computeWeekInfo_(t.planDate);
    if (w) weeks[w.key] = w;
  });
  var wSel = $('#weekFilter');
  wSel.empty().append('<option value="">全部周 / All Weeks</option>');
  Object.keys(weeks).sort().reverse().forEach(function (k) { wSel.append('<option value="' + k + '">' + weeks[k].label + '</option>'); });
  var todayWeek = computeWeekInfo_(new Date().toISOString().split('T')[0]);
  if (todayWeek && weeks[todayWeek.key]) wSel.val(todayWeek.key);
}

function renderTable() {
  var weekKey = $('#weekFilter').val();
  var statusF = $('#statusFilter').val();
  var machineF = $('#machineFilter').val();
  var sourceF = $('#sourceFilter').val();
  var reqF = $('#reqFilter').val();
  var tasks = allTasks.filter(function (t) {
    if (weekKey && (!t.planDate || computeWeekInfo_(t.planDate).key !== weekKey)) return false;
    if (statusF && t.status !== statusF) return false;
    if (machineF && t.machineNo !== machineF) return false;
    if (sourceF) {
      var src = (t.source || '').toLowerCase();
      if (sourceF === 'urgent' && src.indexOf('urgent') < 0) return false;
      if (sourceF === 'weekly' && src.indexOf('urgent') >= 0) return false;
    }
    if (reqF && t.reqPerson !== reqF) return false;
    return true;
  });
  var conflicts = findMachineConflicts_(tasks);
  var byWeek = {};
  tasks.forEach(function (t) {
    var w = t.planDate ? computeWeekInfo_(t.planDate) : null;
    var k = w ? w.key : '未知周';
    (byWeek[k] = byWeek[k] || []).push(t);
  });
  var html = '';
  Object.keys(byWeek).sort().reverse().forEach(function (k) {
    var list = byWeek[k];
    var label = list[0] && list[0].planDate ? computeWeekInfo_(list[0].planDate).label : k;
    html += '<div class="week-group mb-3"><div class="week-group-title">' + escapeHtml(label) + '（' + list.length + '）</div>';
    html += '<table class="table table-sm table-hover mb-0" style="font-size:12px;"><thead><tr>' +
      '<th>任务号<br><small>Task ID</small></th><th>产品<br><small>Product</small></th><th>模具<br><small>Mold</small></th>' +
      '<th>机台(机型)<br><small>Machine(Model)</small></th><th>SKU<br><small>SKU</small></th><th>物料<br><small>Material</small></th>' +
      '<th>状态<br><small>Status</small></th><th>计划日期<br><small>Plan Date</small></th><th>负责人<br><small>Requestor</small></th>' +
      '<th>操作<br><small>Action</small></th></tr></thead><tbody>';
    list.sort(function (a, b) {
      var au = (a.source || '').indexOf('urgent') >= 0 ? 1 : 0;
      var bu = (b.source || '').indexOf('urgent') >= 0 ? 1 : 0;
      if (au !== bu) return bu - au; // 紧急置顶
      return String(a.planDate || '').localeCompare(String(b.planDate || ''));
    }).forEach(function (t) {
      var urgent = (t.source || '').indexOf('urgent') >= 0;
      var badge = STATUS_BADGE_CLASS[t.status] || 'bg-secondary';
      var conflict = conflicts[t.taskID];
      var machineCell = escapeHtml(t.machineNo) + (t.machineModel ? ' (' + escapeHtml(t.machineModel) + ')' : '');
      if (conflict) {
        machineCell += ' <span class="badge bg-warning text-dark" title="冲突: ' + escapeHtml(conflict.join(', ')) + '">冲突<br><small>Conflict</small></span>';
      }
      var actions = '';
      if (t.status === '待确认 Pending') actions += statusBtn(t.taskID, '已排期 Scheduled', '置已排期', 'Schedule') + statusBtn(t.taskID, '已取消 Cancelled', '取消', 'Cancel', 'outline-danger');
      if (t.status === '已排期 Scheduled') actions += statusBtn(t.taskID, '执行中 In Progress', '开始执行', 'Start') + statusBtn(t.taskID, '已取消 Cancelled', '取消', 'Cancel', 'outline-danger');
      if (t.status === '执行中 In Progress') actions += statusBtn(t.taskID, '已完成 Completed', '完成', 'Complete') + statusBtn(t.taskID, '已取消 Cancelled', '取消', 'Cancel', 'outline-danger');
      html += '<tr class="' + (urgent ? 'table-danger' : '') + '" style="cursor:pointer;" onclick="openProcessPage(\'taskID=' + encodeURIComponent(t.taskID) + '\')">' +
        '<td>' + escapeHtml(t.taskID) + (urgent ? ' <span class="badge bg-danger">紧急<br><small>Urgent</small></span>' : '') + '</td>' +
        '<td>' + escapeHtml(t.productName) + '</td><td>' + escapeHtml(t.moldNo) + '</td><td>' + machineCell + '</td>' +
        '<td>' + escapeHtml(t.sku) + '</td><td>' + escapeHtml(t.material) + '</td>' +
        '<td><span class="badge ' + badge + '">' + escapeHtml(t.status) + '</span></td>' +
        '<td>' + escapeHtml(t.planDate) + '</td><td>' + escapeHtml(t.reqPerson) + '</td>' +
        '<td onclick="event.stopPropagation();">' + actions + '</td></tr>';
    });
    html += '</tbody></table></div>';
  });
  if (!Object.keys(byWeek).length) html = '<div class="text-muted py-3 text-center">暂无任务 / No tasks</div>';
  $('#taskTableWrap').html(html);
}

function statusBtn(taskID, newStatus, cn, en, extra) {
  return '<button class="btn btn-sm btn-' + (extra || 'outline-secondary') + ' me-1" style="font-size:10px;" ' +
    'onclick="doStatusChange(\'' + encodeURIComponent(taskID) + '\', \'' + encodeURIComponent(newStatus) + '\')">' + cn + '<br><small>' + en + '</small></button>';
}

function doStatusChange(taskID, newStatus) {
  google.script.run
    .withSuccessHandler(function (raw) {
      var r = parseResponse(raw);
      if (r.success) {
        loadTasks();
      } else {
        Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(r.message || '更新失败', 'Failed') });
      }
    })
    .updateNPITaskStatus(taskID, newStatus);
}

function openImportModal() {
  Swal.fire({ title: swalTitle('加载候选行...', 'Loading candidates...'), allowOutsideClick: false, showConfirmButton: false });
  google.script.run
    .withSuccessHandler(function (raw) {
      Swal.close();
      var r = parseResponse(raw);
      if (!r.success) {
        Swal.fire({ icon: 'error', title: swalTitle('导入不可用', 'Import unavailable'), html: swalHtml(r.message || '', '') });
        return;
      }
      importCandidates = r.data || [];
      var html = '';
      importCandidates.forEach(function (c, idx) {
        html += '<tr class="' + (c.imported ? 'text-muted' : '') + '">' +
          '<td><input type="checkbox" data-idx="' + idx + '" ' + (c.imported ? 'disabled' : 'checked') + '></td>' +
          '<td>' + escapeHtml(c.date) + '</td><td>' + escapeHtml(c.productName) + '</td><td>' + escapeHtml(c.moldNo) + '</td>' +
          '<td>' + escapeHtml(c.machineNo) + '</td><td>' + escapeHtml(c.status) + '</td><td>' + escapeHtml(c.remark) + '</td></tr>';
      });
      $('#importTable tbody').html(html);
      $('#importCheckAll').prop('checked', true);
      var unimported = importCandidates.filter(function (c) { return !c.imported; }).length;
      $('#importHint').text('共 ' + importCandidates.length + ' 行，未导入 ' + unimported + ' 行（已导入行置灰跳过）');
      $('#importModal').modal('show');
    })
    .withFailureHandler(function () {
      Swal.close();
      Swal.fire({ icon: 'error', title: swalTitle('导入不可用', 'Import unavailable'), html: swalHtml('草稿表读取失败', 'Failed to read test plan sheet') });
    })
    .loadTestPlanImportCandidates();
}

function doImport() {
  var selected = [];
  $('#importTable tbody input[type=checkbox]:checked').each(function () {
    var idx = parseInt($(this).data('idx'), 10);
    if (!isNaN(idx) && importCandidates[idx]) selected.push(importCandidates[idx]);
  });
  if (!selected.length) { Swal.fire({ icon: 'warning', title: swalTitle('未选择', 'Nothing selected'), html: swalHtml('请勾选要导入的行', 'Please select rows to import') }); return; }
  Swal.fire({ title: swalTitle('确认导入', 'Confirm Import'), html: swalHtml('将导入 ' + selected.length + ' 条测试计划', 'Will import ' + selected.length + ' rows'), icon: 'warning', showCancelButton: true, confirmButtonText: '确认 / Confirm', cancelButtonText: '取消 / Cancel' })
    .then(function (r2) {
      if (!r2.isConfirmed) return;
      Swal.fire({ title: swalTitle('导入中...', 'Importing...'), allowOutsideClick: false, showConfirmButton: false });
      google.script.run
        .withSuccessHandler(function (raw) {
          Swal.close();
          var r = parseResponse(raw);
          if (r.success) {
            $('#importModal').modal('hide');
            Swal.fire({ icon: 'success', title: swalTitle('导入完成', 'Imported'), html: swalHtml('成功 ' + r.imported + ' 条，跳过已导入 ' + r.skipped + ' 条', 'Imported ' + r.imported + ', skipped ' + r.skipped), timer: 3000, showConfirmButton: false });
            loadTasks();
          } else {
            Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(r.message || '导入失败', 'Failed') });
          }
        })
        .withFailureHandler(function (err) {
          Swal.close();
          Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(err.message || String(err), 'Failed') });
        })
        .importTestPlanRows(JSON.stringify(selected), sessionStorage.getItem('ID') || '');
    });
}
</script>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node /tmp/npi-dashboard-test.js`
Expected: ALL PASS

- [ ] **Step 6: Code.js 加载器与路由**

在 `loadNPIProcessRecord` 函数后追加：

```javascript
function loadNPIDashboard(webPage, id, name, process) {
  var pageUrl = webPage || getReleaseWebPage();
  return render("NPI_Dashboard", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("测试计划 | Test Scheduling")
    .setFaviconUrl(webIconUrl);
}
```

在 `doGet` 路由区追加：

```javascript
  Route.path("NPI_Dashboard", loadNPIDashboard);
```

- [ ] **Step 7: 启用导航按钮**

`Navigation.html`：把「测试排期」的 disabled 按钮替换为：

```html
            <button class="modal-card-btn" type="button" id="NPI_Dashboard_Btn">
              <i class="bi bi-calendar-week mc-icon"></i>
              <div class="mc-text">
                <div class="title-cn">测试计划</div>
                <div class="title-en">Test Scheduling</div>
              </div>
              <i class="bi bi-chevron-right mc-arrow"></i>
            </button>
```

`Navigation_js.html`：在 `NPI_ProcessRecord_Btn` 绑定后追加：

```javascript
    $('#NPI_Dashboard_Btn').on('click', () => {
        let url = siWebPage + '?v=NPI_Dashboard'
            + '&ID=' + encodeURIComponent(id)
            + '&Name=' + encodeURIComponent(name)
            + '&Process=' + encodeURIComponent(process)
            + '&Workshop=' + encodeURIComponent(workshop);
        window.open(url);
        $('#npiModal').modal('hide');
    });
```

- [ ] **Step 8: 全部语法检查并推送**

Run:
```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
perl -0ne 'print $1 if /<script>(.*)<\/script>/s' NPI_Dashboard-js.html > /tmp/dash_check.js && node --check /tmp/dash_check.js
node --check Code.js
clasp push
```
Expected: 语法全过；clasp push 成功（再跑一次 "Script is already up to date."）

- [ ] **Step 9: Commit**

```bash
git add NPI_Dashboard.html NPI_Dashboard-js.html Code.js Navigation.html Navigation_js.html
git commit -m "VYYYYMMDD.XX_NPI测试计划页_周列表状态流转导入入口" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 工艺参数页 URL 参数联动（taskID 自动选中 / new=1 自动弹窗）

**Files:**
- Modify: `NPI_ProcessRecord-js.html`
- Test: `/tmp/npi-params-test.js`（新建）

**Interfaces:**
- Consumes: 现有 `loadTaskList(callback)`、`selectTask(taskID)`、`resetTaskModal()`、`#btnNewTask`
- Produces: `parsePageParams_(qs) → {参数名: 值}`

- [ ] **Step 1: 写失败测试**

创建 `/tmp/npi-params-test.js`：

```javascript
// 一次性测试：URL参数解析纯函数
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const FILE = '/Users/kelland/gas-projects/EQU-Digital-System/NPI_ProcessRecord-js.html';
const src = fs.readFileSync(FILE, 'utf8');
const script = src.replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, '');
const marker = 'function parsePageParams_';
const idx = script.indexOf(marker);
assert.ok(idx >= 0, 'FAIL: function parsePageParams_ not found (feature missing)');
let depth = 0, i = script.indexOf('{', idx);
for (; i < script.length; i++) {
  if (script[i] === '{') depth++;
  else if (script[i] === '}') { depth--; if (depth === 0) break; }
}
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(script.slice(idx, i + 1), sandbox);
const fn = sandbox.parsePageParams_;
assert.deepStrictEqual(JSON.parse(JSON.stringify(fn('?v=NPI_ProcessRecord&taskID=NPI-20260817-0001&new=1'))),
  { v: 'NPI_ProcessRecord', taskID: 'NPI-20260817-0001', new: '1' });
assert.deepStrictEqual(JSON.parse(JSON.stringify(fn('?new=1'))), { new: '1' });
assert.deepStrictEqual(JSON.parse(JSON.stringify(fn(''))), {});
assert.strictEqual(fn('?taskID=%E4%B8%AD%E6%96%87').taskID, '中文'); // decodeURIComponent
console.log('ALL PASS');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node /tmp/npi-params-test.js`
Expected: FAIL with "function parsePageParams_ not found"

- [ ] **Step 3: 最小实现**

在 `NPI_ProcessRecord-js.html` 中 `applyTaskPrefill` 函数之前追加：

```javascript
// URL参数解析：taskID / new
function parsePageParams_(qs) {
  var out = {};
  (qs || '').replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return;
    var p = kv.split('=');
    if (p[0]) out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
  });
  return out;
}

// 页面初始化时应用URL参数：taskID自动选中 / new=1自动打开新建弹窗
function applyUrlParams_() {
  var params = parsePageParams_(window.location.search);
  if (params.taskID) {
    if ($('#taskSelect option[value="' + params.taskID + '"]').length) {
      $('#taskSelect').val(params.taskID);
      selectTask(params.taskID);
    }
  } else if (params.new === '1') {
    $('#btnNewTask').trigger('click');
  }
}
```

修改 `document.ready` 中的初始加载调用，将：

```javascript
  loadTaskList();
```

改为：

```javascript
  loadTaskList(applyUrlParams_);
```

（`loadTaskList(callback)` 已有 callback 参数，加载完成后回调。）

- [ ] **Step 4: 运行测试确认通过**

Run: `node /tmp/npi-params-test.js`
Expected: ALL PASS

- [ ] **Step 5: 语法检查并推送**

Run:
```bash
cd /Users/kelland/gas-projects/EQU-Digital-System
perl -0ne 'print $1 if /<script>(.*)<\/script>/s' NPI_ProcessRecord-js.html > /tmp/pp_check.js && node --check /tmp/pp_check.js
clasp push
```
Expected: 语法通过；clasp push 成功（再跑一次 "Script is already up to date."）

- [ ] **Step 6: Commit**

```bash
git add NPI_ProcessRecord-js.html
git commit -m "VYYYYMMDD.XX_NPI工艺参数页支持taskID与new参数联动" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 全量验证（全部任务完成后，按 Spec 验证清单）

1. 导航 → 测试计划页，默认当前周，任务按周分组、紧急置顶
2. 状态流转四连击（待确认→已排期→执行中→已完成），按钮随状态变化；直接调已完成→取消被拒
3. 同机台同天两条未完成任务 → 两行机台单元格「冲突」黄标；完成一条后消失
4. 导入弹窗：列出草稿表行、已导入行置灰；导入后任务出现且状态按映射；再次打开已导入行置灰
5. 导入去重：同四元组再次导入被跳过并提示条数
6. 排期页点任务行 → 工艺参数页自动选中该任务；「新建任务」→ 工艺参数页自动弹窗
7. 草稿表不可访问时导入弹窗报错、页面其余功能正常
8. 全量测试脚本重跑：`node /tmp/npi-status-test.js /tmp/npi-import-test.js /tmp/npi-dashboard-test.js /tmp/npi-params-test.js /tmp/npi-bom-test.js /tmp/npi-prefill-test.js` 全部 ALL PASS

## 完成后

- 生产部署与 GitHub 推送由用户指示执行（deploy-gas / push-to-github 流程，需确认版本描述）
