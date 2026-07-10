# 里程碑增加「计划开始日期」— 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为所有项目类型的里程碑/事项新增 `plannedStart`（计划开始日期）字段，甘特图改为条状图展示时间跨度。

**Architecture:** 数据层在里程碑 JSON 对象中增加 `plannedStart` 字段（空字符串兼容旧数据）；前端在 Add/Update 弹窗表单中加日期输入框；甘特图从菱形标记改为横条（有开始日期）或降级菱形（无开始日期）；CI checklist 表格增加对应列。

**Tech Stack:** Google Apps Script (Code.js), HTML/CSS/jQuery/Bootstrap 5.3.1/DataTables/Select2

## Global Constraints

- 新字段 `plannedStart` 为选填，空字符串表示未填写
- `planned` 字段名不变，语义保持为「计划完成日期」
- 旧数据兼容：无 `plannedStart` 时甘特图降级为菱形标记
- 所有项目类型（新品/新自动化、CI、Kaizen）均适用
- 时间格式统一使用 YYYY-MM-DD

---

### Task 1: 后端 — addProject() 适配 plannedStart

**Files:**
- Modify: `Code.js:13014-13026`

**Interfaces:**
- Consumes: 前端传入 `data.milestones[].plannedStart`（字符串或空）
- Produces: 里程碑 JSON 对象包含 `plannedStart` 字段写入 Google Sheets

- [ ] **Step 1: 修改 msJsonArr 构建逻辑**

定位到 `Code.js` 的 `addProject()` 函数，将第 13017-13026 行替换为：

```javascript
    const msJsonArr = msData.map(function(ms) {
      if (typeof ms === 'string') return { name: ms, plannedStart: '', planned: ms || 'NA', actual: '', owner: '', ownerEmail: '' };
      return {
        name: ms.name || '',
        plannedStart: ms.plannedStart || '',
        planned: ms.planned || 'NA',
        actual: ms.actual || '',
        owner: ms.owner || '',
        ownerEmail: ms.ownerEmail || '',
        status: ms.status || ''
      };
    });
```

- [ ] **Step 2: 验证 — 保存文件，确保语法无误**

Run: `git diff Code.js` 确认改动仅包含 plannedStart 字段新增

- [ ] **Step 3: Commit**

```bash
git add Code.js
git commit -m "新增: addProject 里程碑存储增加 plannedStart 字段"
```

---

### Task 2: 后端 — updateProjectTracking() 里程碑替换路径适配

**Files:**
- Modify: `Code.js:10868-10880`

**Interfaces:**
- Consumes: `updates.milestonesReplace[].plannedStart`
- Produces: 完整里程碑 JSON（含 `plannedStart`）写入 Google Sheets

- [ ] **Step 1: 修改里程碑替换的 JSON 构建**

定位到 `Code.js` 的 `updateProjectTracking()` 函数，将第 10870-10879 行替换为：

```javascript
      const newArr = updates.milestonesReplace.map(function(ms) {
        return {
          name: String(ms.name || ''),
          plannedStart: String(ms.plannedStart || ''),
          planned: String(ms.planned || 'NA'),
          actual: String(ms.actual || ''),
          owner: String(ms.owner || ''),
          ownerEmail: String(ms.ownerEmail || ''),
          status: String(ms.status || '')
        };
      });
```

- [ ] **Step 2: 新增 plannedStart 变更的 History 记录**

在计划日期变更检测块中（第 10896-10903 行之后），增加 plannedStart 变更检测。在 `if (oldP !== newP)` 块之后（约 10903 行后）插入：

```javascript
          // 计划开始日期
          const oldPS = String(oldMs.plannedStart || '').trim();
          const newPS = String(newMs.plannedStart || '');
          if (oldPS !== newPS) {
            historyRows.push({ milestone: msLabel, plannedOld: oldPS || 'NA', plannedNew: newPS, note: '计划开始日期变更' });
          }
```

- [ ] **Step 3: Commit**

```bash
git add Code.js
git commit -m "新增: updateProjectTracking 里程碑替换保留 plannedStart + History 记录"
```

---

### Task 3: 后端 — sendProjectCreationNotification() 邮件表格适配

**Files:**
- Modify: `Code.js:13141-13160`

**Interfaces:**
- Consumes: `milestonesArr[].plannedStart`
- Produces: 邮件 HTML 中里程碑表格增加「计划开始」列

- [ ] **Step 1: 更新邮件里程碑表头**

将第 13155-13157 行替换为：

```javascript
    let msHeaderCols = '<th style="padding:12px;text-align:left;min-width:80px;">名称<br><small>Name</small></th>'
      + '<th style="padding:12px;text-align:left;">计划开始<br><small>Start</small></th>'
      + '<th style="padding:12px;text-align:left;">计划完成<br><small>Planned</small></th>'
      + '<th style="padding:12px;text-align:left;">责任人<br><small>Owner</small></th>';
```

- [ ] **Step 2: 更新邮件里程碑数据行**

将第 13143-13151 行替换为：

```javascript
    (milestonesArr || []).forEach(function(ms, i) {
      msRows += '<tr style="background-color:' + (i % 2 === 0 ? '#fff5f5' : '#ffffff') + ';">';
      msRows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-weight:500;color:#2c3e50;">' + escapeHtml(ms.name) + '</td>';
      msRows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-family:monospace;color:#555;">' + escapeHtml(ms.plannedStart || '') + '</td>';
      msRows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-family:monospace;color:#555;">' + escapeHtml(ms.planned || 'NA') + '</td>';
      msRows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;">' + escapeHtml(ms.owner || '') + '</td>';
      if (isCI) {
        msRows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;color:#555;">' + escapeHtml(ms.status || '未开始') + '</td>';
      }
      msRows += '</tr>';
    });
```

- [ ] **Step 3: Commit**

```bash
git add Code.js
git commit -m "新增: 创建通知邮件里程碑表格增加计划开始列"
```

---

### Task 4: 前端 CSS — 新增样式

**Files:**
- Modify: `ProjectTracking.html:17-79` (在 `<style>` 块末尾追加)

- [ ] **Step 1: 在 `</style>` 前追加新样式**

定位到 ProjectTracking.html 的 `<style>` 块，在 `</style>`（第 79 行附近）之前追加：

```css
    /* 计划开始日期列 */
    .upd-ms-start { width:115px; }
    /* 甘特图条状样式 */
    .gantt-bar {
      position:absolute; height:60%; top:20%; border-radius:3px;
      opacity:0.75; z-index:1; min-width:4px;
    }
    .gantt-bar-done { background:#28a745; }
    .gantt-bar-overdue { background:#dc3545; }
    .gantt-bar-delayed { background:#fd7e14; }
    .gantt-bar-pending { background:#adb5bd; }
    .gantt-bar-future { background:#6c757d; }
```

- [ ] **Step 2: Commit**

```bash
git add ProjectTracking.html
git commit -m "样式: 甘特图条状图 CSS + 计划开始列宽"
```

---

### Task 5: 前端 HTML — Add 弹窗提示文字更新

**Files:**
- Modify: `ProjectTracking.html:358`
- Modify: `ProjectTracking.html:369`

- [ ] **Step 1: 更新里程碑提示文字**

将第 358 行：
```html
<div class="text-muted mb-1" style="font-size:11px;">每条需填：里程碑 + 责任人 + 计划日期 / Item + Owner + Due</div>
```
替换为：
```html
<div class="text-muted mb-1" style="font-size:11px;">每条需填：里程碑 + 责任人 + 计划开始 + 计划完成 / Item + Owner + Start + Due</div>
```

- [ ] **Step 2: 更新 CI follow-up 提示文字**

将第 369 行：
```html
<div class="text-muted mb-1" style="font-size:11px;">每条需填：事项 + 责任人 + 计划完成日期 / Item + Owner + Due</div>
```
替换为：
```html
<div class="text-muted mb-1" style="font-size:11px;">每条需填：事项 + 责任人 + 计划开始 + 计划完成 / Item + Owner + Start + Due</div>
```

- [ ] **Step 3: Commit**

```bash
git add ProjectTracking.html
git commit -m "优化: Add 弹窗提示文字增加计划开始说明"
```

---

### Task 6: 前端 JS — addMilestoneRow() 增加计划开始输入

**Files:**
- Modify: `ProjectTracking-js.html:1478-1494`

- [ ] **Step 1: 修改函数签名和行模板**

将 `addMilestoneRow()` 函数签名从 `function addMilestoneRow(name, planned)` 改为 `function addMilestoneRow(name, plannedStart, planned)`，并将行模板替换为：

```javascript
  function addMilestoneRow(name, plannedStart, planned) {
    var $row = $('<div class="add-ms-row">'
      + '<textarea rows="1" class="form-control form-control-sm add-ms-name autogrow-name" placeholder="里程碑名称 / Milestone Name">' + escapeTextarea(name || '') + '</textarea>'
      + '<div class="add-ms-owner-wrap"><select class="form-select form-select-sm add-ms-owner" style="width:100%;"></select></div>'
      + '<input type="date" class="form-control form-control-sm add-ms-start" value="' + (plannedStart || '') + '" style="width:135px;font-size:12px;" title="计划开始 / Start">'
      + '<input type="date" class="form-control form-control-sm add-ms-date" value="' + (planned || '') + '" style="width:135px;font-size:12px;" title="计划完成 / Due">'
      + '<button type="button" class="btn btn-sm btn-outline-secondary add-ms-del-btn" title="删除 / Remove"><i class="bi bi-x"></i></button>'
      + '</div>');
    $row.find('.add-ms-del-btn').on('click', function() { $row.remove(); });
    $('#addMilestones').append($row);
    var $sel = $row.find('.add-ms-owner');
    $sel.select2({
      data: userListCache || [],
      dropdownParent: $('#addModal'),
      templateResult: function(item) { return item.display || item.text; },
      templateSelection: function(item) { return item.name || item.text || ''; },
      placeholder: '责任人 / Owner', allowClear: false, width: '100%'
    });
  }
```

- [ ] **Step 2: 更新所有调用点 — 模板切换**

找到 `$('#addTemplate').on('change', ...)` （约第 63-68 行），将 `addMilestoneRow(n, formatDateYMD(today))` 改为 `addMilestoneRow(n, '', formatDateYMD(today))`

- [ ] **Step 3: 更新 addMsAddBtn 调用**

找到 `$('#addMsAddBtn').click(...)` （约第 60 行），将 `addMilestoneRow('', formatDateYMD(today))` 改为 `addMilestoneRow('', '', formatDateYMD(today))`

- [ ] **Step 4: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: addMilestoneRow 增加计划开始日期输入框"
```

---

### Task 7: 前端 JS — addFollowupRow() 增加计划开始输入

**Files:**
- Modify: `ProjectTracking-js.html:1507-1526`

- [ ] **Step 1: 修改函数签名和行模板**

将 `addFollowupRow()` 函数签名从 `function addFollowupRow(name, ownerDisplay, ownerName, due, status)` 改为 `function addFollowupRow(name, ownerDisplay, ownerName, plannedStart, due, status)`，并将行模板替换为：

```javascript
  function addFollowupRow(name, ownerDisplay, ownerName, plannedStart, due, status) {
    var $row = $('<div class="ci-fu-row">'
      + '<textarea rows="1" class="form-control form-control-sm ci-fu-name autogrow-name" placeholder="事项 / Item">' + escapeTextarea(name || '') + '</textarea>'
      + '<div class="ci-fu-owner-wrap"><select class="form-select form-select-sm ci-fu-owner" style="width:100%;"></select></div>'
      + '<input type="date" class="form-control form-control-sm ci-fu-start" value="' + (plannedStart || '') + '" style="width:135px;font-size:12px;" title="计划开始 / Start">'
      + '<input type="date" class="form-control form-control-sm ci-fu-date" value="' + (due || '') + '" style="width:135px;font-size:12px;" title="计划完成 / Due">'
      + ciStatusSelectHtml('ci-fu-status', status)
      + '<button type="button" class="btn btn-sm btn-outline-secondary ci-fu-del-btn" title="删除 / Remove"><i class="bi bi-x"></i></button>'
      + '</div>');
    $row.find('.ci-fu-del-btn').on('click', function() { $row.remove(); });
    $('#addFollowups').append($row);
    var $sel = $row.find('.ci-fu-owner');
    if (ownerDisplay) $sel.append('<option value="' + ownerDisplay.replace(/"/g, '&quot;') + '" selected>' + (ownerName || ownerDisplay) + '</option>');
    $sel.select2({
      data: userListCache || [],
      dropdownParent: $('#addModal'),
      templateResult: function(item) { return item.display || item.text; },
      templateSelection: function(item) { return item.name || item.text || ''; },
      placeholder: '责任人 / Owner', allowClear: false, width: '100%'
    });
    if (!ownerDisplay) $sel.val(null).trigger('change');
  }
```

- [ ] **Step 2: 更新 addFollowupBtn 调用**

找到 `$('#addFollowupBtn').click(...)` （约第 72 行），将 `addFollowupRow('', '', '', formatDateYMD(today), '')` 改为 `addFollowupRow('', '', '', '', formatDateYMD(today), '')`

- [ ] **Step 3: 更新 toggleAddType 中的默认行创建**

找到 `toggleAddType()` 中的 `addFollowupRow('', '', '', formatDateYMD(today), '');` （约第 1535 行），改为 `addFollowupRow('', '', '', '', formatDateYMD(today), '');`

- [ ] **Step 4: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: addFollowupRow 增加计划开始日期输入框"
```

---

### Task 8: 前端 JS — submitAddProject() 收集 plannedStart

**Files:**
- Modify: `ProjectTracking-js.html:1566-1596`

- [ ] **Step 1: CI/Kaizen 路径 — 收集 plannedStart**

将第 1571-1582 行中 CI 路径的里程碑收集改为：

```javascript
    if (isCIType(type)) {
      var missingOwner = false;
      $('#addFollowups .ci-fu-row').each(function() {
        var name = $(this).find('.ci-fu-name').val().trim();
        if (!name) return;
        var ownerDisp = $(this).find('.ci-fu-owner').val() || '';
        var plannedStart = $(this).find('.ci-fu-start').val().trim();
        var due = $(this).find('.ci-fu-date').val().trim();
        var status = $(this).find('.ci-fu-status').val() || '未开始';
        var cache = (userListCache || []).filter(function(u) { return u.display === ownerDisp; })[0];
        if (!ownerDisp || !cache) { missingOwner = true; return; }
        milestones.push({ name: name, plannedStart: plannedStart || '', planned: due || 'NA', owner: cache.name, ownerEmail: cache.email || '', status: status });
      });
      if (missingOwner) { Swal.fire('提示 / Notice', '每条事项都需选择责任人 / Each item needs an owner', 'warning'); return; }
      if (milestones.length === 0) { Swal.fire('提示 / Notice', '请至少添加一条 follow-up 事项 / Add at least one item', 'warning'); return; }
```

- [ ] **Step 2: 新品/新自动化路径 — 收集 plannedStart**

将第 1585-1595 行中新品路径的里程碑收集改为：

```javascript
    } else {
      $('#addMilestones .add-ms-row').each(function() {
        var name = $(this).find('.add-ms-name').val().trim();
        var plannedStart = $(this).find('.add-ms-start').val().trim();
        var planned = $(this).find('.add-ms-date').val().trim();
        var ownerDisp = $(this).find('.add-ms-owner').val() || '';
        var cache = (userListCache || []).filter(function(u) { return u.display === ownerDisp; })[0];
        var ownerName = '', ownerEmail = '';
        if (cache) { ownerName = cache.name; ownerEmail = cache.email || ''; }
        else if (ownerDisp) { ownerName = ownerDisp; }
        if (name) milestones.push({ name: name, plannedStart: plannedStart || '', planned: planned || 'NA', owner: ownerName, ownerEmail: ownerEmail });
      });
    }
```

- [ ] **Step 3: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: submitAddProject 收集 plannedStart 字段"
```

---

### Task 9: 前端 JS — updateMilestonesThead() 增加表头列

**Files:**
- Modify: `ProjectTracking-js.html:1463-1473`

- [ ] **Step 1: 在表头中增加「计划开始」列**

将 `updateMilestonesThead()` 函数整个替换为：

```javascript
  function updateMilestonesThead(isCI) {
    var nameLabel = isCI ? '事项<br><small>Item</small>' : '名称<br><small>Name</small>';
    var plannedLabel = isCI ? '计划完成<br><small>Due</small>' : '计划完成<br><small>Planned</small>';
    $('#modalMilestonesHead').html('<tr style="background:#f8f9fa;border-bottom:2px solid #e9ecef;">'
      + '<th style="min-width:140px;">' + nameLabel + '</th>'
      + '<th style="width:110px;">责任人<br><small>Owner</small></th>'
      + '<th style="width:115px;">计划开始<br><small>Start</small></th>'
      + '<th style="width:115px;">' + plannedLabel + '</th>'
      + '<th style="width:115px;">实际完成<br><small>Actual</small></th>'
      + '<th style="width:90px;">状态<br><small>Status</small></th>'
      + '<th style="width:36px;"></th>'
      + '</tr>');
  }
```

> 注意：CI 类型的表头「计划日期」改为「计划完成」以区分开始/完成

- [ ] **Step 2: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: updateMilestonesThead 增加计划开始表头列"
```

---

### Task 10: 前端 JS — addUpdateMilestoneRow() 增加计划开始输入

**Files:**
- Modify: `ProjectTracking-js.html:1424-1460`

- [ ] **Step 1: 修改函数签名**

将 `addUpdateMilestoneRow()` 函数签名从 `function addUpdateMilestoneRow(name, planned, actual, owner, ownerEmail, status)` 改为 `function addUpdateMilestoneRow(name, plannedStart, planned, actual, owner, ownerEmail, status)`

- [ ] **Step 2: 在行模板中插入计划开始列**

将行模板 HTML（约第 1431-1442 行）替换为在 owner 列和 planned 列之间插入 `upd-ms-start` 列：

```javascript
    var $row = $('<tr style="' + rowStyle + '">'
      + '<td style="vertical-align:middle;"><textarea rows="1" class="form-control form-control-sm upd-ms-name autogrow-name" placeholder="名称 / Name">' + escapeTextarea(name || '') + '</textarea></td>'
      + '<td style="vertical-align:middle;"><select class="form-select form-select-sm upd-ms-owner" style="width:100%;"></select></td>'
      + '<td style="vertical-align:middle;"><input type="date" class="form-control form-control-sm upd-ms-start" value="' + (plannedStart ? (parseDate(plannedStart) ? formatDateYMD(parseDate(plannedStart)) : '') : '') + '" style="font-size:12px;"></td>'
      + '<td style="vertical-align:middle;"><input type="date" class="form-control form-control-sm upd-ms-planned" value="' + (planned && planned !== 'NA' ? (parseDate(planned) ? formatDateYMD(parseDate(planned)) : '') : '') + '"></td>'
      + '<td style="vertical-align:middle;text-align:center;" class="ms-actual-cell">'
      + (isCompleted
        ? '<input type="date" class="form-control form-control-sm ms-actual readonly-field" value="' + (actual ? (parseDate(actual) ? formatDateYMD(parseDate(actual)) : formatDateYMD(today)) : formatDateYMD(today)) + '" readonly>'
        : '<span class="ms-actual-na" style="color:#adb5bd;font-size:12px;">NA</span><input type="date" class="form-control form-control-sm ms-actual" style="display:none;">')
      + '</td>'
      + '<td style="vertical-align:middle;">' + ciStatusSelectHtml('upd-ms-status', effStatus) + '</td>'
      + '<td style="vertical-align:middle;text-align:center;"><button type="button" class="btn btn-sm btn-outline-secondary upd-ms-del-btn" title="删除 / Remove"><i class="bi bi-x"></i></button></td>'
      + '</tr>');
```

- [ ] **Step 3: 已完成项目只读模式也要禁用新列**

无需额外改动 — 已完成项目中 `$(this).find('input, select').prop('disabled', true)` 会自动覆盖新 input。

- [ ] **Step 4: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: addUpdateMilestoneRow 增加计划开始日期列"
```

---

### Task 11: 前端 JS — openUpdateModal() 传递 plannedStart 到行渲染

**Files:**
- Modify: `ProjectTracking-js.html:1227-1228`

- [ ] **Step 1: 更新 addUpdateMilestoneRow 调用传参**

将第 1228 行：
```javascript
      addUpdateMilestoneRow(ms.name, ms.planned, ms.actual, ms.owner, ms.ownerEmail, ms.status);
```
替换为：
```javascript
      addUpdateMilestoneRow(ms.name, ms.plannedStart, ms.planned, ms.actual, ms.owner, ms.ownerEmail, ms.status);
```

- [ ] **Step 2: 更新类型切换时重建行的逻辑**

找到 `$('#modalType').on('change', ...)` 中调用 `addUpdateMilestoneRow` 的地方（约第 190 行），将：
```javascript
        addUpdateMilestoneRow(r.name, r.planned, r.actual, r.owner, r.ownerEmail, r.status);
```
替换为：
```javascript
        addUpdateMilestoneRow(r.name, r.plannedStart, r.planned, r.actual, r.owner, r.ownerEmail, r.status);
```

同时在该回调收集行数据时（约第 167-181 行），增加 `plannedStart` 收集：
```javascript
          plannedStart: $(this).find('.upd-ms-start').val().trim(),
```

- [ ] **Step 3: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: openUpdateModal 传递 plannedStart 到行渲染"
```

---

### Task 12: 前端 JS — saveUpdates() 收集 plannedStart

**Files:**
- Modify: `ProjectTracking-js.html:1292-1307`

- [ ] **Step 1: 在里程碑收集循环中增加 plannedStart 读取**

将第 1294-1308 行替换为：

```javascript
    var newMsArr = [];
    var ciMissingOwner = false;
    $('#modalMilestones tr').each(function() {
      var name = $(this).find('.upd-ms-name').val().trim();
      var plannedStartVal = $(this).find('.upd-ms-start').val().trim();
      var plannedVal = $(this).find('.upd-ms-planned').val().trim();
      var actualVal = $(this).find('.ms-actual').val().trim();
      if (!name) return;
      if (actualVal) { var d = parseDate(actualVal); if (d && d > today) futureMilestones.push({ name: name, date: actualVal }); }
      var ownerName = '', ownerEmail = '', itemStatus = '';
      itemStatus = $(this).find('.upd-ms-status').val() || '';
      var disp = $(this).find('.upd-ms-owner').val() || '';
      var cache = (userListCache || []).filter(function(u) { return u.display === disp; })[0];
      if (cache) { ownerName = cache.name; ownerEmail = cache.email || ''; }
      else if (disp) { ownerName = disp; }
      if (!ownerName) ciMissingOwner = true;
      newMsArr.push({ name: name, plannedStart: plannedStartVal ? normalizeDateInput(plannedStartVal) : '', planned: plannedVal ? normalizeDateInput(plannedVal) : 'NA', actual: actualVal || '', owner: ownerName, ownerEmail: ownerEmail, status: itemStatus });
    });
```

- [ ] **Step 2: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: saveUpdates 收集 plannedStart 字段"
```

---

### Task 13: 前端 JS — getMilestoneTitle() 增加 plannedStart 信息

**Files:**
- Modify: `ProjectTracking-js.html:479-507`

- [ ] **Step 1: 在 tooltip 中增加计划开始日期行**

将 `getMilestoneTitle()` 函数替换为：

```javascript
  function getMilestoneTitle(ms) {
    var parts = ms.name.split(' / ');
    var shortName = parts[0] || ms.name;
    var lines = [shortName];
    if (ms.plannedStart) {
      lines.push('计划开始: ' + normalizeDate(ms.plannedStart));
    }
    if (ms.planned && ms.planned !== 'NA') {
      lines.push('计划完成: ' + normalizeDate(ms.planned));
    } else {
      lines.push('计划完成: NA');
    }
    if (ms.actual) {
      lines.push('实际完成: ' + normalizeDate(ms.actual));
      var actualDate = parseDate(ms.actual);
      if (actualDate && actualDate > today) {
        lines.push('状态: 计划时间推迟 / Planned Delayed');
      } else {
        lines.push('状态: 已完成 / Completed');
      }
    } else {
      var planned = parseDate(ms.planned);
      if (planned && planned < today) {
        lines.push('状态: 逾期未完成 / Overdue');
      } else if (planned) {
        lines.push('状态: 待完成 / Pending');
      } else {
        lines.push('状态: 无计划 / Not Scheduled');
      }
    }
    return lines.join('<br>');
  }
```

- [ ] **Step 2: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: getMilestoneTitle tooltip 显示计划开始日期"
```

---

### Task 14: 前端 JS — renderCIChecklist() 增加计划开始列

**Files:**
- Modify: `ProjectTracking-js.html:665-707`

- [ ] **Step 1: 更新表头和数据行**

将 `renderCIChecklist()` 函数中的表头和数据行替换，增加「计划开始」列：

表头（约第 700-706 行）替换为：
```javascript
    container.innerHTML = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:6px;overflow:hidden;">'
      + '<thead><tr style="background:linear-gradient(135deg,#6f42c1,#59359a);color:#fff;">'
      + '<th style="padding:8px;text-align:left;">事项 / Item</th>'
      + '<th style="padding:8px;text-align:left;">责任人 / Owner</th>'
      + '<th style="padding:8px;text-align:left;">计划开始 / Start</th>'
      + '<th style="padding:8px;text-align:left;">计划完成 / Due</th>'
      + '<th style="padding:8px;text-align:left;">实际完成 / Actual</th>'
      + '<th style="padding:8px;text-align:left;">状态 / Status</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
```

数据行模板（约第 691-697 行）替换为：
```javascript
      var startTxt = ms.plannedStart ? normalizeDate(ms.plannedStart) : '—';
      return '<tr style="background:' + (i % 2 === 0 ? '#fff5f5' : '#fff') + ';">'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;">' + (ms.name || '').replace(/</g,'&lt;') + '</td>'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap;">' + owner + '</td>'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;white-space:nowrap;color:#555;">' + startTxt + '</td>'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;white-space:nowrap;color:' + (p && p < today && !a ? '#dc3545' : '#555') + ';">' + dueTxt + '</td>'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;white-space:nowrap;">' + actTxt + '</td>'
        + '<td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap;font-weight:600;color:' + stColor + ';">' + stHtml + '</td>'
        + '</tr>';
```

- [ ] **Step 2: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: CI checklist 展开表格增加计划开始列"
```

---

### Task 15: 前端 JS — renderSingleProjectGantt() 改为条状图

**Files:**
- Modify: `ProjectTracking-js.html:711-818`

这是最大的一处改动。需要将甘特图从菱形标记改为条状图。

- [ ] **Step 1: 日期范围计算纳入 plannedStart**

在现有日期收集循环（约第 727-730 行）中，增加 plannedStart：

```javascript
    var dates = [];
    milestones.forEach(function(ms) {
      var dps = parseDate(ms.plannedStart); if (dps) dates.push(dps);
      var dp = parseDate(ms.planned); if (dp) dates.push(dp);
      var da = parseDate(ms.actual);  if (da) dates.push(da);
    });
```

- [ ] **Step 2: activeDaySet 纳入 plannedStart 日期**

在 existing activeDaySet 标记循环（约第 745-751 行）中，增加 plannedStart：

```javascript
    milestones.forEach(function(ms) {
      [parseDate(ms.plannedStart), parseDate(ms.planned), parseDate(ms.actual)].forEach(function(dt) {
        if (!dt) return;
        for (var di2 = 0; di2 < days.length; di2++) {
          if (Math.abs((days[di2] - dt) / 86400000) <= COLLAPSE_BUFFER) activeDaySet[di2] = true;
        }
      });
    });
```

- [ ] **Step 3: projStart/projEnd 纳入 plannedStart**

更新项目起止日期计算（约第 775-778 行）：

```javascript
    var projStart = null, projEnd = null;
    milestones.forEach(function(ms) {
      [parseDate(ms.plannedStart), parseDate(ms.planned), parseDate(ms.actual)].forEach(function(d) {
        if (d) { if (!projStart || d < projStart) projStart = d; if (!projEnd || d > projEnd) projEnd = d; }
      });
    });
```

- [ ] **Step 4: 替换里程碑行渲染逻辑为条状图**

将第 789-814 行的里程碑行渲染替换为条状图逻辑：

```javascript
    milestones.forEach(function(ms, msIdx) {
      var shortName = ms.name.split(' / ')[0];
      var msStart = parseDate(ms.plannedStart);
      var msEnd = parseDate(ms.planned);
      html += '<tr><td style="font-size:11px;white-space:nowrap;padding:2px 4px;position:relative;">' + shortName;
      // 渲染条状图
      html += '<div style="position:absolute;top:0;bottom:0;left:0;right:0;">';
      displayCols.forEach(function(col, colIdx) {
        // 用 CSS grid 定位横条：找到 start 和 end 对应的列索引
      });
      html += '</div></td>';
```

实际实现改为在单元格内用绝对定位渲染横条。更好的实现是保持原结构，在每个 day 列中判断是否需要渲染 bar 段：

```javascript
    milestones.forEach(function(ms, msIdx) {
      var shortName = ms.name.split(' / ')[0];
      var msStart = parseDate(ms.plannedStart);
      var msEnd = parseDate(ms.planned);
      var msColor = getMilestoneColor(ms);
      var barColorClass = '';
      if (msEnd) {
        var actualDate = parseDate(ms.actual);
        if (actualDate) { barColorClass = actualDate > today ? 'gantt-bar-delayed' : 'gantt-bar-done'; }
        else if (msEnd < today) { barColorClass = 'gantt-bar-overdue'; }
        else { barColorClass = 'gantt-bar-future'; }
      }
      html += '<tr><td style="font-size:11px;white-space:nowrap;padding:2px 4px;position:relative;">' + shortName + '</td>';
      displayCols.forEach(function(col, colIdx) {
        if (col.type === 'collapse') {
          var inRange = msStart && msEnd && col.endDate >= msStart && col.startDate <= msEnd;
          html += '<td style="min-width:12px;max-width:12px;background:' + (inRange ? rgba(msColor, 0.15) : '#f8f9fa') + ';border-left:1px dashed #dee2e6;border-right:1px dashed #dee2e6;"></td>';
        } else {
          var d = col.dayIdx;
          var day = days[d];
          var cellStyle = 'text-align:center;vertical-align:middle;position:relative;';
          var todayCls = inDay(today, day) ? ' class="today-col"' : '';
          if (projStart && projEnd && projEnd >= day && projStart <= day) cellStyle += 'background:' + barBg + ';';
          var cellContent = '';

          // 条状图：判断当天是否在 [msStart, msEnd] 范围内
          var inBarRange = msStart && msEnd && day >= msStart && day <= msEnd;
          if (inBarRange) {
            var isFirst = inDay(msStart, day);
            var isLast = inDay(msEnd, day);
            var barStyle = 'position:absolute;top:20%;height:60%;z-index:1;';
            if (isFirst && isLast) barStyle += 'left:2px;right:2px;border-radius:3px;';
            else if (isFirst) barStyle += 'left:2px;right:0;border-radius:3px 0 0 3px;';
            else if (isLast) barStyle += 'left:0;right:2px;border-radius:0 3px 3px 0;';
            else barStyle += 'left:0;right:0;';
            var barBgColor = rgba(msColor, 0.6);
            cellContent += '<span class="gantt-bar ' + barColorClass + '" style="' + barStyle + '"></span>';
          }

          // 计划完成日标记：有 start → 显示小圆点；无 start → 显示菱形（旧数据兼容）
          var msPlanned = parseDate(ms.planned);
          if (msPlanned && inDay(msPlanned, day)) {
            if (msStart) {
              // 小圆点标记完成日
              cellContent += '<span style="display:inline-block;font-size:8px;color:' + msColor + ';position:relative;z-index:2;">●</span>';
            } else {
              // 旧数据：菱形标记
              var msTitle = getMilestoneTitle(ms);
              var hasHist = historyMap && historyMap[proj.projectName + '::' + ms.name.split(' / ')[0]];
              cellContent += (hasHist ? '<span class="hist-icon" data-project="' + proj.projectName.replace(/"/g,'&quot;') + '" data-milestone="' + ms.name.split(' / ')[0].replace(/"/g,'&quot;') + '" style="cursor:pointer;font-size:10px;color:#E60012;position:relative;z-index:2;" title="查看变更历史">🔄</span>' : '')
                + '<span class="ms-node" data-ms-title="' + msTitle.replace(/"/g, '&quot;') + '" style="display:inline-block;font-size:13px;color:' + msColor + ';cursor:pointer;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;position:relative;z-index:2;">&#9670;</span>';
            }
          }
          // 计划开始日标记：小三角
          if (msStart && inDay(msStart, day) && msPlanned && !inDay(msPlanned, day)) {
            cellContent += '<span style="display:inline-block;font-size:9px;color:' + msColor + ';position:relative;z-index:2;">▶</span>';
          }
          html += '<td' + todayCls + ' style="' + cellStyle + '">' + cellContent + '</td>';
        }
      });
      html += '</tr>';
    });
```

> 注意：CSS 中 `.gantt-bar` 类已在 Task 4 定义。条状图的 `barColorClass` 使用 `gantt-bar-done`/`gantt-bar-overdue`/`gantt-bar-delayed`/`gantt-bar-future` 等类名，但此处使用内联 `background` 覆盖（inline style > CSS class），因此可选保留 class 用于语义。

为简化实现，直接使用内联 style 着色：

```javascript
          // 条状图颜色内联（简化）
          if (inBarRange) {
            var barColor = msColor;
            var isFirst = inDay(msStart, day);
            var isLast = inDay(msEnd, day);
            var barStyle = 'position:absolute;top:20%;height:60%;z-index:1;background:' + rgba(barColor, 0.6) + ';';
            if (isFirst && isLast) barStyle += 'left:2px;right:2px;border-radius:3px;';
            else if (isFirst) barStyle += 'left:2px;right:0;border-radius:3px 0 0 3px;';
            else if (isLast) barStyle += 'left:0;right:2px;border-radius:0 3px 3px 0;';
            else barStyle += 'left:0;right:0;';
            cellContent += '<span style="' + barStyle + '"></span>';
          }
```

- [ ] **Step 5: Commit**

```bash
git add ProjectTracking-js.html
git commit -m "新增: 甘特图改为条状图展示里程碑时间跨度"
```

---

### Task 16: 部署验证

- [ ] **Step 1: clasp push 部署**

```bash
clasp push
```

- [ ] **Step 2: 验证清单**

打开 Web App，逐项验证：

1. Add 弹窗 → 切换到「新品/新自动化」→ 里程碑行有「计划开始」→「计划完成」两个日期框
2. Add 弹窗 → 切换到 CI → follow-up 行有「计划开始」→「计划完成」两个日期框
3. 填写计划开始 + 计划完成 → 提交 → 刷新列表 → 展开甘特图 → 显示为横条
4. Update 弹窗 → 表格有「计划开始」列 → 可编辑
5. 编辑旧项目（无 plannedStart）→ 甘特图仍显示菱形标记
6. 为旧里程碑补充计划开始日期 → 甘特图从菱形变为横条
7. CI/Kaizen 项目展开 checklist → 有「计划开始」列
8. 检查通知邮件 → 里程碑表格有「计划开始」列

- [ ] **Step 3: 如有问题修复后重新 clasp push**

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "新增: 里程碑计划开始日期功能完成"
```

---

## Post-Implementation

部署完成后更新 `项目记录.md`，记录本次改动概要。
