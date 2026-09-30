# NPI 新品测试工艺参数记录 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of NPI Test Management — the process parameter recording page (`NPI_ProcessRecord`) with task creation, accordion form, draft/submit workflow, and version history.

**Architecture:** Follows existing EDS pattern — GAS Web App with `NPI_ProcessRecord.html` (UI) + `NPI_ProcessRecord-js.html` (JS logic), backend functions in Code.js, data stored in Google Sheets (EDS_NPI_Data spreadsheet). Navigation card with modal for sub-pages.

**Tech Stack:** Google Apps Script, Bootstrap 5.3.1, jQuery, SweetAlert2, Select2

**Design Spec:** [2026-07-24-npi-test-management-design.md](../specs/2026-07-24-npi-test-management-design.md)

## Global Constraints

- **所有表头/标签中英双语**: 表头 `中文<br>English`，Navbar `中文 / English`，按钮 `中文<br><small>English</small>`
- **Sheet 列头中英双语**: 已写入（见 spec）
- **数据 key 纯英文**: JSON 字段名、Sheet 列索引使用英文驼峰命名
- **前端 helper**: `swalTitle(cn, en)` / `swalHtml(cn, en)` 全局提示双语化
- **Commit 格式**: `VYYYYMMDD.XX_中文描述`
- **NPI Spreadsheet ID**: `1092k9V4BT-WhD9GPoF6sRQC2TtdZfdjeRe8pK6v1rmQ` (EDS_NPI_Data)
- **Sheet 名称**: `NPI_TestTasks`, `NPI_ProcessRecords`, `NPI_Samples` (已创建，列头已写入)
- **UI 规范**: 严格遵循 `Docs/UI规范.md` — navbar 骨架、welcome-bar、section-title、双语格式、SweetAlert2 helper、响应式 col-6 col-md-4 col-lg-3
- **模板字段**: 通过 MCP 读取注塑/注胶产品工艺卡通用模板，动态生成表单结构，不显示占位符

---

### Task 1: Backend — Route + Load Function + CRUD

**Files:**
- Modify: `Code.js` (add route, load function, and 4 backend functions)

**Interfaces:**
- Consumes: Nothing (first task)
- Produces:
  - `loadNPIProcessRecord(webPage, id, name, process)` — GAS route handler
  - `createNPITestTask(taskDataJSON, operatorSAPID)` → `{success, taskID, message}`
  - `loadNPITestTaskList()` → `{success, data: [{taskID, productName, ...}]}`
  - `saveNPIProcessRecord(recordJSON)` → `{success, recordID, message}`
  - `submitNPIProcessRecord(recordID)` → `{success, message}`
  - `loadNPIProcessRecord(testTaskID)` → `{success, data: {...record fields}}`
  - `loadNPIProcessRecordHistory(testTaskID)` → `{success, data: [version1, version2, ...]}`

- [ ] **Step 1: Add Route registration**

In `Code.js`, after line 155 (last route), add:

```javascript
Route.path("NPI_ProcessRecord", loadNPIProcessRecord);
```

- [ ] **Step 2: Add load function**

In `Code.js`, after the last load function (around line 1355+), add:

```javascript
function loadNPIProcessRecord(webPage, id, name, process) {
  var pageUrl = webPage || getReleaseWebPage();
  return render("NPI_ProcessRecord", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("新品测试工艺参数 | NPI Process Record")
    .setFaviconUrl(webIconUrl);
}
```

- [ ] **Step 3: Add NPI_SS_ID constant**

At the top of Code.js where other SS IDs are defined, add:

```javascript
var NPI_SS_ID = "1092k9V4BT-WhD9GPoF6sRQC2TtdZfdjeRe8pK6v1rmQ";
```

- [ ] **Step 4: Add createNPITestTask function**

```javascript
function createNPITestTask(taskDataJSON, operatorSAPID) {
  try {
    var taskData = typeof taskDataJSON === 'string' ? JSON.parse(taskDataJSON) : taskDataJSON;
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_TestTasks");
    if (!ws) return JSON.stringify({ success: false, message: "Sheet not found" });
    
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    // Count today's tasks for sequence number
    var data = ws.getDataRange().getValues();
    var todayCount = 0;
    for (var i = 1; i < data.length; i++) {
      var tid = String(data[i][0] || '');
      if (tid.indexOf('NPI-' + dateStr.replace(/-/g, '')) === 0) todayCount++;
    }
    var seq = ('000' + (todayCount + 1)).slice(-4);
    var taskID = 'NPI-' + dateStr.replace(/-/g, '') + '-' + seq;
    
    ws.appendRow([
      taskID,
      taskData.source || 'urgent',
      '待确认',
      taskData.productName || '',
      taskData.moldNo || '',
      taskData.machineNo || '',
      taskData.material || '',
      taskData.reqDept || '',
      taskData.reqPerson || operatorSAPID,
      taskData.planDate || dateStr,
      '待确认',
      '',
      taskData.tester || '',
      '',
      '',
      taskData.remark || '',
      now,
      now
    ]);
    
    return JSON.stringify({ success: true, taskID: taskID, message: "任务已创建 / Task created" });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 5: Add loadNPITestTaskList function**

```javascript
function loadNPITestTaskList() {
  try {
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_TestTasks");
    if (!ws) return JSON.stringify({ success: true, data: [] });
    var data = ws.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      if (!String(data[i][0] || '').trim()) continue;
      result.push({
        taskID: String(data[i][0] || ''),
        source: String(data[i][1] || ''),
        status: String(data[i][2] || ''),
        productName: String(data[i][3] || ''),
        moldNo: String(data[i][4] || ''),
        machineNo: String(data[i][5] || ''),
        material: String(data[i][6] || ''),
        reqDept: String(data[i][7] || ''),
        reqPerson: String(data[i][8] || ''),
        planDate: data[i][9] instanceof Date ? Utilities.formatDate(data[i][9], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(data[i][9] || ''),
        confirmStatus: String(data[i][10] || ''),
        confirmBy: String(data[i][11] || ''),
        tester: String(data[i][12] || ''),
        actualStart: data[i][13] instanceof Date ? Utilities.formatDate(data[i][13], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(data[i][13] || ''),
        actualEnd: data[i][14] instanceof Date ? Utilities.formatDate(data[i][14], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(data[i][14] || ''),
        remark: String(data[i][15] || ''),
        createdAt: String(data[i][16] || ''),
        updatedAt: String(data[i][17] || '')
      });
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 6: Add saveNPIProcessRecord function**

```javascript
function saveNPIProcessRecord(recordJSON) {
  try {
    var record = typeof recordJSON === 'string' ? JSON.parse(recordJSON) : recordJSON;
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_ProcessRecords");
    if (!ws) return JSON.stringify({ success: false, message: "Sheet not found" });
    
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // Check if updating existing record
    var data = ws.getDataRange().getValues();
    var rowIndex = -1;
    if (record.recordID) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === record.recordID) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    if (rowIndex > 0) {
      // Update existing (draft only)
      for (var j = 0; j < record.fields.length; j++) {
        ws.getRange(rowIndex, j + 4).setValue(record.fields[j] || data[rowIndex - 1][j + 3]);
      }
      ws.getRange(rowIndex, 6).setValue(now); // updatedAt (col 6, 1-indexed)
    } else {
      // New record
      var recordID = 'NPI-PR-' + dateStr.replace(/-/g, '') + '-' + ('000' + (Date.now() % 10000)).slice(-4);
      var row = [recordID, record.testTaskID || '', '草稿', true];
      // Append 196 template fields (empty strings for now)
      for (var k = 0; k < 196; k++) {
        row.push(record.fields && record.fields[k] ? record.fields[k] : '');
      }
      row.push(now, now, record.operatorSAPID || '');
      ws.appendRow(row);
      record.recordID = recordID;
    }
    
    return JSON.stringify({ success: true, recordID: record.recordID || '', message: "已保存 / Saved" });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 7: Add submitNPIProcessRecord function**

```javascript
function submitNPIProcessRecord(recordID) {
  try {
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_ProcessRecords");
    if (!ws) return JSON.stringify({ success: false, message: "Sheet not found" });
    var data = ws.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === recordID) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex < 0) return JSON.stringify({ success: false, message: "记录未找到 / Record not found" });
    
    ws.getRange(rowIndex, 3).setValue('已提交'); // status
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.getRange(rowIndex, 6).setValue(now); // updatedAt
    
    return JSON.stringify({ success: true, message: "已提交 / Submitted" });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 8: Add loadNPIProcessRecord function**

```javascript
function loadNPIProcessRecord(testTaskID) {
  try {
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_ProcessRecords");
    if (!ws) return JSON.stringify({ success: false, data: null });
    var data = ws.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1] || '').trim() === testTaskID && String(data[i][3] || '').trim() === 'true') {
        var row = data[i];
        var fields = [];
        for (var j = 4; j < 200; j++) {
          fields.push(row[j] !== undefined ? String(row[j] || '') : '');
        }
        return JSON.stringify({
          success: true, data: {
            recordID: String(row[0] || ''),
            testTaskID: String(row[1] || ''),
            status: String(row[2] || ''),
            isLatest: String(row[3] || '') === 'true',
            fields: fields,
            createdAt: String(row[200] || ''),
            updatedAt: String(row[201] || ''),
            createdBy: String(row[202] || '')
          }
        });
      }
    }
    return JSON.stringify({ success: true, data: null }); // No record yet
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 9: Add loadNPIProcessRecordHistory function**

```javascript
function loadNPIProcessRecordHistory(testTaskID) {
  try {
    var ws = SpreadsheetApp.openById(NPI_SS_ID).getSheetByName("NPI_ProcessRecords");
    if (!ws) return JSON.stringify({ success: true, data: [] });
    var data = ws.getDataRange().getValues();
    var result = [];
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1] || '').trim() === testTaskID) {
        result.push({
          recordID: String(data[i][0] || ''),
          status: String(data[i][2] || ''),
          isLatest: String(data[i][3] || '') === 'true',
          createdAt: String(data[i][200] || ''),
          updatedAt: String(data[i][201] || ''),
          createdBy: String(data[i][202] || '')
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 10: Push and commit**

```bash
git add Code.js
git commit -m "V20260724.02_NPI工艺参数后端路由和CRUD函数"
```

---

### Task 2: Frontend — NPI_ProcessRecord Page

**Files:**
- Create: `NPI_ProcessRecord.html`
- Create: `NPI_ProcessRecord-js.html`

**Interfaces:**
- Consumes: Backend functions from Task 1
- Produces: Full working page accessible at `?v=NPI_ProcessRecord`

- [ ] **Step 1: Create NPI_ProcessRecord.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <base target="_top">
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <?!=include("Kez_Bootstrap@5.3.1_css");?>
  <?!=include("kez_Datatables_css");?>
  <?!=include("Kez_Select2@4.0.13_css");?>
  <?!=include("CSS");?>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    html,body { margin:0; padding:0; } body { background:#f5f6f8; color:#333; }
    .welcome-bar { background:#fff; border-left:4px solid #E60012; padding:10px 18px; margin:12px 0 16px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.04); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
    .section-card { background:#fff; border-radius:8px; padding:16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
    .section-title { font-size:14px; font-weight:700; color:#333; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #E60012; }
    .accordion-button { font-size:13px; font-weight:600; padding:8px 12px; }
    .accordion-button:not(.collapsed) { background:#fff3f3; color:#E60012; }
    .accordion-body { padding:12px; }
    .form-label-sm { font-size:11px; font-weight:600; color:#495057; margin-bottom:2px; }
    .form-control-sm, .form-select-sm { font-size:12px; padding:4px 8px; }
    .version-list-item { padding:8px 12px; border-bottom:1px solid #eee; cursor:pointer; font-size:12px; display:flex; justify-content:space-between; align-items:center; }
    .version-list-item:hover { background:#f8f9fa; }
    .version-list-item.active { background:#fff3f3; border-left:3px solid #E60012; }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg bg-nav">
    <div class="container-fluid">
      <a class="navbar-brand" style="display:flex;align-items:center;gap:12px;text-decoration:none;">
        <img src="data:image/svg+xml;base64,..." width="40" height="40">
        <div>
          <span style="font-size:xx-large;font-weight:bold;">新品测试工艺参数</span><br>
          <span style="font-size:14px;font-weight:400;opacity:0.85;">NPI Process Record</span>
        </div>
      </a>
      <div class="d-flex align-items-center gap-3">
        <span id="userLevelBadge" class="badge bg-secondary">--</span>
        <span id="userName" class="text-white fw-bold">--</span>
        <a class="btn btn-sm btn-outline-primary" href="#" id="btnBackDashboard">
          <i class="bi bi-arrow-left"></i> 返回 / Back
        </a>
      </div>
    </div>
  </nav>

  <div class="container-fluid px-3">
    <!-- Welcome bar -->
    <div class="welcome-bar">
      <div><span id="name" style="color:#E60012;font-weight:600;"></span>，记录新品测试工艺参数 / Record NPI Test Process Parameters</div>
    </div>

    <!-- Task Selector -->
    <div class="section-card">
      <div class="section-title">测试任务<br><small style="font-weight:400;color:#888;">Test Task</small></div>
      <div class="row align-items-end g-2">
        <div class="col-md-5">
          <label class="form-label-sm">选择任务<br><small>Select Task</small></label>
          <select id="taskSelect" class="form-select form-select-sm">
            <option value="">-- 选择或新建 / Select or Create --</option>
          </select>
        </div>
        <div class="col-md-3">
          <button class="btn btn-sm btn-outline-primary w-100" id="btnNewTask">
            <i class="bi bi-plus-lg"></i> 新建任务<br><small>New Task</small>
          </button>
        </div>
        <div class="col-md-4" id="taskInfo" style="font-size:11px;color:#6c757d;"></div>
      </div>
    </div>

    <!-- New Task Modal -->
    <div class="modal fade" id="newTaskModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">新建测试任务<br><small style="font-weight:400;font-size:12px;color:#888;">New Test Task</small></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label-sm">产品名称<br><small>Product Name</small></label>
                <input type="text" class="form-control form-control-sm" id="newProductName">
              </div>
              <div class="col-6">
                <label class="form-label-sm">模具编号<br><small>Mold No.</small></label>
                <input type="text" class="form-control form-control-sm" id="newMoldNo">
              </div>
              <div class="col-6">
                <label class="form-label-sm">机台编号<br><small>Machine No.</small></label>
                <input type="text" class="form-control form-control-sm" id="newMachineNo">
              </div>
              <div class="col-6">
                <label class="form-label-sm">物料<br><small>Material</small></label>
                <input type="text" class="form-control form-control-sm" id="newMaterial">
              </div>
              <div class="col-6">
                <label class="form-label-sm">来源<br><small>Source</small></label>
                <select class="form-select form-select-sm" id="newSource">
                  <option value="weekly">周计划<br><small>Weekly</small></option>
                  <option value="urgent">紧急<br><small>Urgent</small></option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label-sm">计划日期<br><small>Plan Date</small></label>
                <input type="date" class="form-control form-control-sm" id="newPlanDate">
              </div>
              <div class="col-12">
                <label class="form-label-sm">备注<br><small>Remark</small></label>
                <input type="text" class="form-control form-control-sm" id="newRemark">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">取消 / Cancel</button>
            <button type="button" class="btn btn-sm btn-primary" id="btnCreateTask">创建 / Create</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Process Parameter Form (Accordion) -->
    <div class="section-card" id="paramFormCard" style="display:none;">
      <div class="section-title">工艺参数<br><small style="font-weight:400;color:#888;">Process Parameters</small></div>
      <div class="accordion" id="paramAccordion">
        <!-- Accordion sections will be rendered dynamically from template structure -->
      </div>
      <div class="mt-3 d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" id="btnSaveDraft">
          <i class="bi bi-save"></i> 保存草稿<br><small>Save Draft</small>
        </button>
        <button class="btn btn-sm btn-primary" id="btnSubmit">
          <i class="bi bi-check-lg"></i> 提交<br><small>Submit</small>
        </button>
        <span id="saveStatus" style="font-size:11px;color:#198754;line-height:2.5;margin-left:8px;"></span>
      </div>
    </div>

    <!-- Version History -->
    <div class="section-card" id="historyCard" style="display:none;">
      <div class="section-title">版本历史<br><small style="font-weight:400;color:#888;">Version History</small></div>
      <div id="historyList"></div>
    </div>
  </div>

  <?!=include("NPI_ProcessRecord-js") ?>
  <?!=include("Kez_jquery@3.6.4_js") ?>
  <?!=include("Kez_bootstrap@5.3.1_js") ?>
  <?!=include("Kez_Select2@4.0.13_js") ?>
  <?!=include("Kez_sweetalert2_js");?>
</body>
</html>
```

- [ ] **Step 2: Create NPI_ProcessRecord-js.html**

```html
<script>
// ============================================================
//  新品测试工艺参数 JS / NPI Process Record JS
// ============================================================
const swalTitle = (cn, en) => `${cn}<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">${en}</span>`;
const swalHtml = (cn, en) => `<div>${cn}<div style="font-size:0.85em;color:#888;margin-top:6px;line-height:1.4;">${en}</div></div>`;

let currentTask = null;
let currentRecord = null;
let allTasks = [];

// Template section structure (mapped from 196-column template)
// Each section has a title and column range [start, end]
const TEMPLATE_SECTIONS = [
  { id: 'productInfo', title: '产品信息<br><small>Product Info</small>', cols: [0, 20] },
  { id: 'barrel', title: '炮筒模块<br><small>Barrel Module</small>', cols: [21, 60] },
  { id: 'hotRunner', title: '热流道模块<br><small>Hot Runner</small>', cols: [61, 80] },
  { id: 'injection', title: '注射模块<br><small>Injection Module</small>', cols: [81, 110] },
  { id: 'holding', title: '保压模块<br><small>Holding Pressure</small>', cols: [111, 130] },
  { id: 'cooling', title: '冷却模块<br><small>Cooling Module</small>', cols: [131, 150] },
  { id: 'ejection', title: '顶出模块<br><small>Ejection Module</small>', cols: [151, 170] },
  { id: 'other', title: '其他参数<br><small>Other Parameters</small>', cols: [171, 195] }
];

$(document).ready(function () {
  $('#userName').text(sessionStorage.getItem('Name') || '--');
  $('#name').text(sessionStorage.getItem('Name') || '--');
  var perm = sessionStorage.getItem('EDSTaskPermission') || '';
  var permLabels = { 'admin': '管理员 / Admin', 'supervisor': '主管 / Supervisor', 'employee': '员工 / Employee' };
  var badgeClass = perm === 'admin' ? 'bg-danger' : (perm === 'supervisor' ? 'bg-warning text-dark' : 'bg-secondary');
  $('#userLevelBadge').removeClass('bg-secondary').addClass(badgeClass).text(permLabels[perm] || '');

  $('#btnBackDashboard').on('click', function (e) {
    e.preventDefault();
    var siWebPage = sessionStorage.getItem('siWebPage') || '';
    window.open(siWebPage + '?v=Navigation'
      + '&ID=' + encodeURIComponent(sessionStorage.getItem('ID') || '')
      + '&Name=' + encodeURIComponent(sessionStorage.getItem('Name') || '')
      + '&Process=' + encodeURIComponent(sessionStorage.getItem('Process') || '')
      + '&Workshop=' + encodeURIComponent(sessionStorage.getItem('Workshop') || ''));
  });

  // Load task list
  loadTaskList();

  // Task select change
  $('#taskSelect').on('change', function () {
    var tid = $(this).val();
    if (tid) { selectTask(tid); } else { clearForm(); }
  });

  // New task button
  $('#btnNewTask').on('click', function () {
    $('#newPlanDate').val(new Date().toISOString().split('T')[0]);
    $('#newTaskModal').modal('show');
  });

  // Create task
  $('#btnCreateTask').on('click', function () {
    var taskData = {
      source: $('#newSource').val(),
      productName: $('#newProductName').val().trim(),
      moldNo: $('#newMoldNo').val().trim(),
      machineNo: $('#newMachineNo').val().trim(),
      material: $('#newMaterial').val().trim(),
      planDate: $('#newPlanDate').val(),
      remark: $('#newRemark').val().trim()
    };
    if (!taskData.productName && !taskData.moldNo) {
      Swal.fire({ icon: 'warning', title: swalTitle('提示', 'Info'), html: swalHtml('请至少填写产品名称或模具编号', 'Please fill at least product name or mold no.') });
      return;
    }
    Swal.fire({ title: swalTitle('创建中...', 'Creating...'), allowOutsideClick: false, showConfirmButton: false, didOpen: function () { Swal.showLoading(); } });
    google.script.run
      .withSuccessHandler(function (result) {
        Swal.close();
        var r = JSON.parse(result || '{}');
        if (r.success) {
          $('#newTaskModal').modal('hide');
          loadTaskList(function () {
            $('#taskSelect').val(r.taskID);
            selectTask(r.taskID);
          });
        } else {
          Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(r.message, '') });
        }
      })
      .createNPITestTask(JSON.stringify(taskData), sessionStorage.getItem('ID') || '');
  });

  // Save draft
  $('#btnSaveDraft').on('click', saveRecord);

  // Submit
  $('#btnSubmit').on('click', function () {
    if (!currentRecord || !currentRecord.recordID) {
      Swal.fire({ icon: 'warning', title: swalTitle('提示', 'Info'), html: swalHtml('请先保存草稿', 'Please save draft first') });
      return;
    }
    Swal.fire({
      title: swalTitle('确认提交', 'Confirm Submit'),
      html: swalHtml('提交后不可修改，确认提交？', 'Cannot modify after submit. Confirm?'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确认 / Confirm',
      cancelButtonText: '取消 / Cancel'
    }).then(function (r) {
      if (!r.isConfirmed) return;
      Swal.fire({ title: swalTitle('提交中...', 'Submitting...'), allowOutsideClick: false, showConfirmButton: false, didOpen: function () { Swal.showLoading(); } });
      google.script.run
        .withSuccessHandler(function (result) {
          Swal.close();
          var res = JSON.parse(result || '{}');
          if (res.success) {
            $('#saveStatus').text('已提交 / Submitted');
            $('#btnSaveDraft, #btnSubmit').prop('disabled', true);
            loadHistory(currentTask.taskID);
          } else {
            Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(res.message, '') });
          }
        })
        .submitNPIProcessRecord(currentRecord.recordID);
    });
  });

  // Render accordion from template sections
  renderAccordion();
});

function loadTaskList(callback) {
  google.script.run
    .withSuccessHandler(function (result) {
      var r = JSON.parse(result || '{}');
      allTasks = r.success ? r.data : [];
      var html = '<option value="">-- 选择或新建 / Select or Create --</option>';
      allTasks.forEach(function (t) {
        var label = t.taskID + ' | ' + (t.productName || t.moldNo || '--');
        html += '<option value="' + t.taskID + '">' + label + '</option>';
      });
      $('#taskSelect').html(html);
      if (callback) callback();
    })
    .loadNPITestTaskList();
}

function selectTask(taskID) {
  currentTask = allTasks.find(function (t) { return t.taskID === taskID; });
  if (!currentTask) return;
  
  var info = [];
  if (currentTask.productName) info.push(currentTask.productName);
  if (currentTask.moldNo) info.push('模具: ' + currentTask.moldNo);
  if (currentTask.machineNo) info.push('机台: ' + currentTask.machineNo);
  if (currentTask.status) info.push('状态: ' + currentTask.status);
  $('#taskInfo').html(info.join(' &nbsp;|&nbsp; '));
  $('#paramFormCard, #historyCard').show();

  // Load existing record
  google.script.run
    .withSuccessHandler(function (result) {
      var r = JSON.parse(result || '{}');
      currentRecord = r.success ? r.data : null;
      if (currentRecord) {
        fillFormFields(currentRecord.fields);
        var isSubmitted = currentRecord.status === '已提交';
        $('#btnSaveDraft, #btnSubmit').prop('disabled', isSubmitted);
        $('#saveStatus').text(isSubmitted ? '已提交 / Submitted' : '草稿 / Draft');
      } else {
        clearFormFields();
        $('#btnSaveDraft, #btnSubmit').prop('disabled', false);
        $('#saveStatus').text('新记录 / New Record');
      }
      loadHistory(taskID);
    })
    .loadNPIProcessRecord(taskID);
}

function renderAccordion() {
  var html = '';
  TEMPLATE_SECTIONS.forEach(function (sec, idx) {
    var isFirst = idx === 0;
    html += '<div class="accordion-item">';
    html += '<h2 class="accordion-header">';
    html += '<button class="accordion-button' + (isFirst ? '' : ' collapsed') + '" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_' + sec.id + '">' + sec.title + '</button>';
    html += '</h2>';
    html += '<div id="collapse_' + sec.id + '" class="accordion-collapse collapse' + (isFirst ? ' show' : '') + '" data-bs-parent="#paramAccordion">';
    html += '<div class="accordion-body">';
    html += '<div class="row g-2">';
    for (var c = sec.cols[0]; c <= sec.cols[1]; c++) {
      html += '<div class="col-6 col-md-3 col-lg-2">';
      html += '<label class="form-label-sm">字段 ' + (c + 1) + '<br><small>Field ' + (c + 1) + '</small></label>';
      html += '<input type="text" class="form-control form-control-sm param-field" data-col="' + c + '" placeholder="">';
      html += '</div>';
    }
    html += '</div></div></div></div>';
  });
  $('#paramAccordion').html(html);
}

function fillFormFields(fields) {
  $('.param-field').each(function () {
    var col = parseInt($(this).data('col'));
    $(this).val(fields && fields[col] ? fields[col] : '');
  });
}

function clearFormFields() {
  $('.param-field').val('');
}

function collectFormFields() {
  var fields = [];
  $('.param-field').each(function () {
    var col = parseInt($(this).data('col'));
    fields[col] = $(this).val();
  });
  // Fill gaps with empty strings
  for (var i = 0; i < 196; i++) {
    if (fields[i] === undefined) fields[i] = '';
  }
  return fields;
}

function saveRecord() {
  if (!currentTask) {
    Swal.fire({ icon: 'warning', title: swalTitle('提示', 'Info'), html: swalHtml('请先选择测试任务', 'Please select a test task first') });
    return;
  }
  var recordData = {
    recordID: currentRecord ? currentRecord.recordID : null,
    testTaskID: currentTask.taskID,
    fields: collectFormFields(),
    operatorSAPID: sessionStorage.getItem('ID') || ''
  };
  Swal.fire({ title: swalTitle('保存中...', 'Saving...'), allowOutsideClick: false, showConfirmButton: false, didOpen: function () { Swal.showLoading(); } });
  google.script.run
    .withSuccessHandler(function (result) {
      Swal.close();
      var r = JSON.parse(result || '{}');
      if (r.success) {
        if (r.recordID) currentRecord = { recordID: r.recordID, status: '草稿', fields: recordData.fields };
        $('#saveStatus').text('已保存 / Saved @ ' + new Date().toLocaleTimeString());
        loadHistory(currentTask.taskID);
      } else {
        Swal.fire({ icon: 'error', title: swalTitle('错误', 'Error'), html: swalHtml(r.message, '') });
      }
    })
    .saveNPIProcessRecord(JSON.stringify(recordData));
}

function loadHistory(testTaskID) {
  google.script.run
    .withSuccessHandler(function (result) {
      var r = JSON.parse(result || '{}');
      var versions = r.success ? r.data : [];
      var html = '';
      versions.forEach(function (v) {
        var isActive = currentRecord && currentRecord.recordID === v.recordID;
        var statusBadge = v.status === '已提交'
          ? '<span style="color:#198754;font-weight:700;">已提交 / Submitted</span>'
          : '<span style="color:#fd7e14;">草稿 / Draft</span>';
        var latestBadge = v.isLatest ? ' <span class="badge bg-primary" style="font-size:9px;">最新 Latest</span>' : '';
        html += '<div class="version-list-item' + (isActive ? ' active' : '') + '" onclick="viewVersion(\'' + v.recordID + '\')">';
        html += '<span>' + v.recordID + latestBadge + '</span>';
        html += '<span>' + statusBadge + '</span>';
        html += '<span style="color:#adb5bd;">' + (v.updatedAt || v.createdAt || '') + '</span>';
        html += '</div>';
      });
      $('#historyList').html(html || '<div style="color:#adb5bd;font-size:12px;padding:12px;">暂无记录 / No records</div>');
    })
    .loadNPIProcessRecordHistory(testTaskID);
}

function viewVersion(recordID) {
  // Load a specific version for viewing (future enhancement)
  Swal.fire({ icon: 'info', title: swalTitle('版本详情', 'Version Detail'), html: swalHtml('版本查看功能待完善<br>Record ID: ' + recordID, 'Version detail coming soon') });
}

function clearForm() {
  currentTask = null;
  currentRecord = null;
  $('#taskInfo').html('');
  $('#paramFormCard, #historyCard').hide();
  clearFormFields();
}
</script>
```

- [ ] **Step 3: Push and commit**

```bash
git add NPI_ProcessRecord.html NPI_ProcessRecord-js.html
git commit -m "V20260724.03_NPI工艺参数记录页面创建"
```

---

### Task 3: Navigation — NPI Card + Modal

**Files:**
- Modify: `Navigation.html` (add card + modal)
- Modify: `Navigation_js.html` (add modal handlers)

- [ ] **Step 1: Add NPI card in Navigation.html**

After the EDSTaskCardWrap block (after line 219), add:

```html
<!-- NPI 新品测试 -->
<div class="col-6 col-md-4 col-lg-3">
  <button type="button" class="nav-card" id="NPITestArrangement">
    <i class="bi bi-box-seam icon"></i>
    <div class="title-cn">新品测试</div>
    <div class="title-en">NPI Test</div>
  </button>
</div>
```

- [ ] **Step 2: Add NPI modal in Navigation.html**

After the last existing modal (e.g., after `#taskModal` or `#moldModal`), add:

```html
<!-- NPI Test Modal -->
<div class="modal fade" id="npiModal" tabindex="-1" aria-labelledby="npiModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="npiModalLabel">新品测试 / NPI Test</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body modal-domain-daily">
        <button class="modal-card-btn" type="button" id="NPI_ProcessRecord_Btn">
          <i class="bi bi-clipboard-data mc-icon"></i>
          <div class="mc-text">
            <div class="title-cn">工艺参数记录</div>
            <div class="title-en">Process Record</div>
          </div>
          <i class="bi bi-chevron-right mc-arrow"></i>
        </button>
        <button class="modal-card-btn" type="button" disabled>
          <i class="bi bi-calendar-week mc-icon"></i>
          <div class="mc-text">
            <div class="title-cn">测试排期</div>
            <div class="title-en">Test Scheduling</div>
          </div>
          <span class="badge bg-secondary" style="font-size:9px;">即将推出<br>Coming Soon</span>
        </button>
        <button class="modal-card-btn" type="button" disabled>
          <i class="bi bi-box2 mc-icon"></i>
          <div class="mc-text">
            <div class="title-cn">样品管理</div>
            <div class="title-en">Sample Management</div>
          </div>
          <span class="badge bg-secondary" style="font-size:9px;">即将推出<br>Coming Soon</span>
        </button>
        <button class="modal-card-btn" type="button" disabled>
          <i class="bi bi-file-earmark-text mc-icon"></i>
          <div class="mc-text">
            <div class="title-cn">测试报告</div>
            <div class="title-en">Test Report</div>
          </div>
          <span class="badge bg-secondary" style="font-size:9px;">即将推出<br>Coming Soon</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

**Note:** The modal-header title uses `中文 / English` format (Navbar 例外规则 per CLAUDE.md).

- [ ] **Step 3: Add JS handlers in Navigation_js.html**

In Navigation_js.html, add:

```javascript
// NPI Test card → modal
$('#NPITestArrangement').on('click', () => {
    $('#npiModal').modal('show');
});

// NPI Process Record button → navigate
$('#NPI_ProcessRecord_Btn').on('click', () => {
    let url = siWebPage + '?v=NPI_ProcessRecord'
        + '&ID=' + encodeURIComponent(id)
        + '&Name=' + encodeURIComponent(name)
        + '&Process=' + encodeURIComponent(process)
        + '&Workshop=' + encodeURIComponent(workshop);
    window.open(url);
    $('#npiModal').modal('hide');
});
```

The Navigation.js already has `id`, `name`, `process`, `workshop`, `siWebPage` in scope from the existing `$(document).ready` closure.

- [ ] **Step 4: Push and commit**

```bash
git add Navigation.html Navigation_js.html
git commit -m "V20260724.04_导航添加NPI新品测试卡片和子页面入口"
```

---

### Task 4: Verify End-to-End

- [ ] **Step 1: Push all files to GAS**

```bash
clasp push
```

- [ ] **Step 2: Test via Dev URL**

Open Dev URL with `?v=NPI_ProcessRecord` and verify:

1. Page loads, navbar shows "新品测试工艺参数 / NPI Process Record" ✅
2. Click "新建任务" → modal appears → fill product/mold → create → task appears in dropdown ✅
3. Select task → accordion form appears with 8 sections ✅
4. Fill some fields → "保存草稿" → success toast → history list shows version ✅
5. "提交" → confirm dialog → status becomes "已提交" → buttons disabled ✅
6. "返回/Back" button → navigates to Navigation page ✅
7. Navigation page → "新品测试" card appears in 日常作业 section ✅
8. Click NPI card → modal with 4 buttons (1 active, 3 disabled) ✅
9. Click "工艺参数记录" → opens NPI_ProcessRecord in new tab ✅

- [ ] **Step 3: Commit**

```bash
git commit -m "V20260724.05_NPI工艺参数端到端验证通过"
```

---

## Verification Summary

Run through the dev URL and verify:
1. Page renders with bilingual navbar and form
2. Create new test task → taskID generated using `NPI-YYYYMMDD-XXXX` format
3. Select task → load existing record or blank form
4. Save draft → persisted to `NPI_ProcessRecords` sheet
5. Submit → status changes to '已提交', form locked
6. History shows all versions with timestamps
7. Navigation card and modal work correctly
8. All labels follow bilingual format per Global Constraints
