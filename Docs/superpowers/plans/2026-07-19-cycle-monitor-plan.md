# 注塑周期监控模块 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增注塑周期监控页面，以 ECharts 小多图网格展示 27 台机台的周期散点图，按 TB1/TB2 车间分 Tab，支持 7/30 天切换，异常点红色高亮。

**Architecture:** 新增 `CycleMonitor.html`（UI）+ `CycleMonitor-js.html`（ECharts 渲染逻辑），修改 `Code.js` 新增后端数据函数和路由，修改 `Navigation.html` + `Navigation_js.html` 新增入口。ECharts 库以 `Kez_ECharts_js.html` 内联托管。

**Tech Stack:** Google Apps Script (V8), ECharts 5.x, Bootstrap 5.3.1, jQuery 3.6.4, SweetAlert2

## Global Constraints

- 所有 UI 文本中英双语：表头 `中文<br>English`，标题 `中文 | English`
- 日期格式 `YYYY-MM-DD`，时间基于 Asia/Hong_Kong
- 路由参数通过 `?v=PageName` 注册
- 前端调后端用 `google.script.run.withSuccessHandler(cb).serverFunction(args)`
- 页面通过 `HtmlService.createTemplateFromFile` + `render()` 渲染
- JS 文件在 HTML 底部通过 `<?!=include("XXX-js")?>` 引入
- 第三方库内联为 `Kez_` 前缀的 HTML 文件
- 版本命名规范：`VYYYYMMDD.XX_描述`

---

### Task 1: 添加 ECharts 库文件

**Files:**
- Create: `Kez_ECharts_js.html`

**Interfaces:**
- Produces: ECharts 5.x 库，通过 `<?!=include("Kez_ECharts_js")?>` 引入后，全局 `echarts` 对象可用

- [ ] **Step 1: 下载 ECharts 5.x minified JS**

Download from CDN: `https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js`

Run:
```bash
curl -o /tmp/echarts.min.js https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js
wc -c /tmp/echarts.min.js
```

Expected: file size ~1MB

- [ ] **Step 2: 创建 Kez_ECharts_js.html**

Wrap the minified JS content in `<script>` tags. GAS HtmlService 需要这样托管。

Create file `Kez_ECharts_js.html`:
```html
<script>
// ECharts 5.5.0 — minified
// (paste the contents of echarts.min.js here)
</script>
```

Run to create the wrapper:
```bash
echo '<script>' > /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
cat /tmp/echarts.min.js >> /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
echo '</script>' >> /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
wc -c /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
```

Expected: ~1MB file, starts with `<script>` ends with `</script>`

- [ ] **Step 3: 验证文件可被 include**

Run:
```bash
head -c 100 /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
tail -c 20 /Users/kelland/gas-projects/EQU-Digital-System/Kez_ECharts_js.html
```

Expected: starts with `<script>`, ends with `</script>\n`

- [ ] **Step 4: Commit**

```bash
git add Kez_ECharts_js.html
git commit -m "V20260719.03_添加ECharts5.5.0库文件用于周期监控图表

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 添加后端常量和数据函数

**Files:**
- Modify: `Code.js` — 追加新函数

**Interfaces:**
- Produces:
  - `CYCLE_SS_ID` — 常量，Spreadsheet ID
  - `getCycleMonitorMachineList(): { TB1: string[], TB2: string[] }` — 按车间分组的机台列表
  - `getCycleMonitorStandards(): { [machineNo]: number }` — 机台号→标准周期映射
  - `getCycleMonitorData(machines: string[], days: number): { machines: MachineData[] }` — 周期散点数据含异常标记

- [ ] **Step 1: 在 Code.js 头部常量区追加 Spreadsheet ID 常量**

Insert after line 21 (`const IM_SCHEDULING_SHEET = "MasterData";`):

In `Code.js`, find:
```
const IM_SCHEDULING_SHEET = "MasterData";
```

Add after:
```javascript
// 注塑周期监控模块常量 / Cycle Monitor Constants
const CYCLE_SS_ID = "1cfJBxEKnNcwt1xH_tSRjKpD6Dv1JqOEzJxi2p7mZiZM";
const CYCLE_ACTUAL_SHEET = "机台周期实际值";
const CYCLE_STANDARD_SHEET = "机台周期标准";
```

- [ ] **Step 2: 追加后端函数到 Code.js 末尾**

Read the last 5 lines of Code.js to find the end of file:
```bash
tail -5 /Users/kelland/gas-projects/EQU-Digital-System/Code.js
```

Append the following three functions at the end of `Code.js`:

```javascript
// ============================================================
//  注塑周期监控模块 / Cycle Monitor Module
// ============================================================

/**
 * 获取按车间分组的机台列表
 * @returns {{ TB1: string[], TB2: string[] }}
 */
function getCycleMonitorMachineList() {
  try {
    var ss = SpreadsheetApp.openById(CYCLE_SS_ID);
    var ws = ss.getSheetByName(CYCLE_STANDARD_SHEET);
    var data = ws.getDataRange().getValues();
    var result = { TB1: [], TB2: [] };
    for (var i = 1; i < data.length; i++) {
      var machineNo = String(data[i][0]).trim();
      if (!machineNo) continue;
      if (machineNo.indexOf("H1") === 0) {
        result.TB1.push(machineNo);
      } else if (machineNo.indexOf("H2") === 0) {
        result.TB2.push(machineNo);
      }
    }
    return result;
  } catch (e) {
    console.error("getCycleMonitorMachineList error:", e.message);
    return { TB1: [], TB2: [], error: e.message };
  }
}

/**
 * 获取机台号→标准周期的映射
 * @returns {{ [machineNo: string]: number }}
 */
function getCycleMonitorStandards() {
  try {
    var ss = SpreadsheetApp.openById(CYCLE_SS_ID);
    var ws = ss.getSheetByName(CYCLE_STANDARD_SHEET);
    var data = ws.getDataRange().getValues();
    var result = {};
    for (var i = 1; i < data.length; i++) {
      var machineNo = String(data[i][0]).trim();
      var standard = parseFloat(data[i][2]);
      if (machineNo && !isNaN(standard)) {
        result[machineNo] = standard;
      }
    }
    return result;
  } catch (e) {
    console.error("getCycleMonitorStandards error:", e.message);
    return { error: e.message };
  }
}

/**
 * 获取周期散点数据，含异常标记
 * @param {string[]} machines — 机台号数组
 * @param {number} days — 往前推天数（7 或 30）
 * @returns {{ machines: Array }}
 */
function getCycleMonitorData(machines, days) {
  try {
    if (!machines || !machines.length) {
      return { machines: [], error: "未指定机台" };
    }
    var ss = SpreadsheetApp.openById(CYCLE_SS_ID);
    var ws = ss.getSheetByName(CYCLE_ACTUAL_SHEET);
    var allData = ws.getDataRange().getValues();
    
    // 计算日期范围
    var today = new Date();
    var cutoff = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    var cutoffStr = formatDateLocal(cutoff);
    var todayStr = formatDateLocal(today);
    
    // 读取标准值
    var stdSheet = ss.getSheetByName(CYCLE_STANDARD_SHEET);
    var stdData = stdSheet.getDataRange().getValues();
    var standards = {};
    for (var i = 1; i < stdData.length; i++) {
      var m = String(stdData[i][0]).trim();
      var s = parseFloat(stdData[i][2]);
      if (m && !isNaN(s)) standards[m] = s;
    }
    
    // 按机台分组收集数据点
    var machinesMap = {};
    var machineSet = {};
    machines.forEach(function(m) { machineSet[m] = true; });
    
    for (var i = 1; i < allData.length; i++) {
      var row = allData[i];
      var machineNo = String(row[0]).trim();
      if (!machineSet[machineNo]) continue;
      
      var dataDate = String(row[5]).trim();
      if (dataDate < cutoffStr || dataDate > todayStr) continue;
      
      var shift = String(row[2]).trim();
      var cycle = parseFloat(row[3]);
      if (isNaN(cycle)) continue;
      
      if (!machinesMap[machineNo]) {
        machinesMap[machineNo] = [];
      }
      
      var std = standards[machineNo];
      var anomaly = false;
      var deviation = 0;
      if (std !== undefined) {
        deviation = cycle - std;
        anomaly = (deviation > 3) || (deviation < -1);
      }
      
      machinesMap[machineNo].push({
        date: formatDateShort(dataDate),
        dateFull: dataDate,
        shift: shift,
        cycle: Math.round(cycle * 100) / 100,
        anomaly: anomaly,
        deviation: Math.round(deviation * 100) / 100
      });
    }
    
    // 构建返回结果
    var result = [];
    machines.forEach(function(machineNo) {
      var points = machinesMap[machineNo] || [];
      var anomalyCount = points.filter(function(p) { return p.anomaly; }).length;
      result.push({
        name: machineNo,
        standard: standards[machineNo] !== undefined ? standards[machineNo] : null,
        anomalyCount: anomalyCount,
        points: points
      });
    });
    
    return { machines: result };
  } catch (e) {
    console.error("getCycleMonitorData error:", e.message);
    return { machines: [], error: e.message };
  }
}

/**
 * 格式化日期为 YYYY-MM-DD（本地时区）
 */
function formatDateLocal(d) {
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

/**
 * 将 YYYY-MM-DD 缩短为 MM-DD 显示
 */
function formatDateShort(dateStr) {
  return dateStr.substring(5);
}
```

- [ ] **Step 3: 验证语法**

Run:
```bash
node -e "const fs = require('fs'); const code = fs.readFileSync('/Users/kelland/gas-projects/EQU-Digital-System/Code.js','utf8'); try { new Function(code); console.log('Syntax OK'); } catch(e) { console.log('Syntax error:', e.message); }"
```

Expected: `Syntax OK` (ignoring runtime references to GAS globals)

- [ ] **Step 4: Commit**

```bash
git add Code.js
git commit -m "V20260719.04_Code.js添加注塑周期监控后端函数

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 创建页面 UI (CycleMonitor.html)

**Files:**
- Create: `CycleMonitor.html`

**Interfaces:**
- Consumes: `Kez_Bootstrap@5.3.1_css`, `Kez_bootstrap@5.3.1_js`, `CSS`, `Kez_jquery@3.6.4_js`, `Kez_sweetalert2_js`, `Kez_ECharts_js`, `CycleMonitor-js`
- Produces: 完整页面 DOM 结构（welcome-bar, toolbar with date selector, Tab buttons, grid container, detail modal）

- [ ] **Step 1: 创建 CycleMonitor.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <base target="_top">
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <?!=include("Kez_Bootstrap@5.3.1_css");?>
  <?!=include("CSS");?>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    html, body { margin:0; padding:0; }
    body { background:#f5f6f8; color:#333; }
    
    .welcome-bar {
      background:#fff; border-left:4px solid #E60012; padding:10px 18px;
      margin:12px 0 16px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.04);
      display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    }
    .welcome-bar .greet { color:#333; font-size:16px; }
    .welcome-bar #userName { color:#E60012; font-weight:600; }
    
    .toolbar {
      background:#fff; border-left:4px solid #E60012; border-radius:4px;
      padding:10px 16px; margin:12px 0; display:flex; gap:10px;
      align-items:center; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,.04);
    }
    .toolbar .form-select { width:auto; font-size:12px; }
    
    .workshop-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
    .workshop-tab {
      border:1px solid #dee2e6; background:#fff; color:#555; border-radius:4px;
      padding:6px 14px; font-size:13px; font-weight:600; cursor:pointer;
      transition: all 0.2s;
    }
    .workshop-tab:hover { border-color:#E60012; color:#E60012; }
    .workshop-tab.active { background:#E60012; color:#fff; border-color:#E60012; }
    .workshop-tab .badge-anomaly {
      display:inline-block; background:#E74C3C; color:#fff; border-radius:10px;
      padding:1px 7px; font-size:10px; margin-left:4px; font-weight:700;
    }
    .workshop-tab.active .badge-anomaly { background:#fff; color:#E60012; }
    
    .chart-grid {
      display:grid;
      grid-template-columns:repeat(5, 1fr);
      gap:10px;
    }
    .chart-grid.tb1-layout { grid-template-columns:repeat(3, 1fr); }
    
    .chart-cell {
      background:#fff; border-radius:6px; padding:8px;
      box-shadow:0 1px 3px rgba(0,0,0,.04); cursor:pointer;
      transition: box-shadow 0.2s;
    }
    .chart-cell:hover { box-shadow:0 2px 8px rgba(0,0,0,.1); }
    .chart-cell .cell-title {
      font-size:12px; font-weight:700; text-align:center;
      margin-bottom:4px; color:#555;
    }
    .chart-cell .cell-title .anomaly-dot {
      display:inline-block; width:8px; height:8px; border-radius:50%;
      background:#E74C3C; margin-left:4px; vertical-align:middle;
    }
    .chart-cell .cell-chart { width:100%; height:200px; }
    .chart-cell.empty {
      display:flex; align-items:center; justify-content:center;
      height:240px; color:#999; font-size:13px;
    }
    
    .legend-bar {
      display:flex; gap:20px; align-items:center; flex-wrap:wrap;
      padding:10px 16px; margin-top:12px; font-size:12px; color:#666;
    }
    .legend-item { display:flex; align-items:center; gap:6px; }
    .legend-dot { width:10px; height:10px; border-radius:50%; }
    .legend-dot.normal { background:#95A5A6; }
    .legend-dot.anomaly { background:#E74C3C; }
    .legend-line { width:20px; height:0; border-top:2px dashed; }
    .legend-line.standard { border-color:#3498DB; }
    .legend-line.limit { border-color:#E74C3C; border-top-style:dotted; }
    
    /* Detail modal */
    .modal-dialog.detail-modal { max-width:860px; }
    .detail-chart { width:100%; height:520px; }
    
    .empty-state {
      text-align:center; padding:40px; color:#999; font-size:14px;
    }
    
    @media (max-width:768px) {
      .chart-grid { grid-template-columns:repeat(2, 1fr); }
      .chart-grid.tb1-layout { grid-template-columns:repeat(2, 1fr); }
    }
  </style>
</head>
<body>
<div class="container-fluid" style="max-width:1400px;">

  <!-- Welcome Bar -->
  <div class="welcome-bar">
    <span class="greet">🏭 注塑周期监控 / <small>Cycle Monitor</small></span>
    <span class="greet">👤 <span id="userName">--</span></span>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <label style="font-size:12px;margin:0;">时间范围 / Period:</label>
    <select class="form-select" id="daysSelect">
      <option value="7">最近7天 / Last 7 days</option>
      <option value="30">最近30天 / Last 30 days</option>
    </select>
    <span style="font-size:11px;color:#888;" id="dateRangeLabel">--</span>
    <span style="flex:1;"></span>
    <button type="button" class="btn btn-sm btn-outline-secondary" id="refreshBtn">
      <i class="bi bi-arrow-clockwise"></i> 刷新 / Refresh
    </button>
  </div>

  <!-- Workshop Tabs -->
  <div class="workshop-tabs">
    <button type="button" class="workshop-tab active" data-workshop="TB1">
      TB1 <small>(H1)</small>
      <span class="badge-anomaly" id="tb1Badge" style="display:none;">0</span>
    </button>
    <button type="button" class="workshop-tab" data-workshop="TB2">
      TB2 <small>(H2)</small>
      <span class="badge-anomaly" id="tb2Badge" style="display:none;">0</span>
    </button>
  </div>

  <!-- Chart Grid -->
  <div class="chart-grid tb1-layout" id="chartGrid"></div>

  <!-- Legend -->
  <div class="legend-bar">
    <span class="legend-item"><span class="legend-dot normal"></span> 正常点 / Normal</span>
    <span class="legend-item"><span class="legend-dot anomaly"></span> 异常点 / Anomaly</span>
    <span class="legend-item"><span class="legend-line standard"></span> 标准线 / Standard</span>
    <span class="legend-item"><span class="legend-line limit"></span> 上下限线 / Limits</span>
  </div>

</div>

<!-- Detail Modal -->
<div class="modal fade" id="detailModal" tabindex="-1">
  <div class="modal-dialog detail-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="detailTitle">机台详情 / Machine Detail</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="detail-chart" id="detailChart"></div>
      </div>
    </div>
  </div>
</div>

<?!=include("Kez_jquery@3.6.4_js") ?>
<?!=include("Kez_bootstrap@5.3.1_js") ?>
<?!=include("Kez_sweetalert2_js") ?>
<?!=include("Kez_ECharts_js") ?>
<?!=include("CycleMonitor-js") ?>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add CycleMonitor.html
git commit -m "V20260719.05_创建注塑周期监控页面UI结构

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 创建前端 JS 逻辑 (CycleMonitor-js.html)

**Files:**
- Create: `CycleMonitor-js.html`

**Interfaces:**
- Consumes: `google.script.run.getCycleMonitorData()`, `getCycleMonitorMachineList()`, `getCycleMonitorStandards()`
- Produces: ECharts 小多图网格渲染，Tab 切换，日期筛选，点击放大

- [ ] **Step 1: 创建 CycleMonitor-js.html**

```html
<script>
const swalTitle = function(cn, en) {
  return cn + '<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">' + en + '</span>';
};

var allMachines = { TB1: [], TB2: [] };
var allData = [];
var currentWorkshop = 'TB1';
var currentDays = 7;

$(document).ready(function() {
  $('#userName').text(sessionStorage.getItem('Name') || '--');
  
  $('#daysSelect').on('change', function() {
    currentDays = parseInt($(this).val());
    loadData();
  });
  
  $('#refreshBtn').on('click', loadData);
  
  $('.workshop-tab').on('click', function() {
    currentWorkshop = $(this).data('workshop');
    $('.workshop-tab').removeClass('active');
    $(this).addClass('active');
    renderGrid();
  });
  
  loadData();
});

function loadData() {
  Swal.fire({
    title: swalTitle('加载中...', 'Loading...'),
    allowOutsideClick: false,
    didOpen: function() { Swal.showLoading(); }
  });
  
  // 获取机台列表和实际数据
  google.script.run
    .withSuccessHandler(function(result) {
      if (result && !result.error) {
        allMachines = result;
        fetchData();
      } else {
        Swal.fire({
          icon: 'error',
          title: swalTitle('加载失败', 'Load Failed'),
          text: (result && result.error) || '无法获取机台列表 / Cannot get machine list'
        });
      }
    })
    .getCycleMonitorMachineList();
}

function fetchData() {
  var allMachineList = allMachines.TB1.concat(allMachines.TB2);
  
  google.script.run
    .withSuccessHandler(function(result) {
      Swal.close();
      if (result && result.machines) {
        allData = result.machines;
        renderGrid();
        updateBadges();
        updateDateRange();
      } else {
        Swal.fire({
          icon: 'error',
          title: swalTitle('数据加载失败', 'Data Load Failed'),
          text: (result && result.error) || '未知错误 / Unknown error'
        });
      }
    })
    .getCycleMonitorData(allMachineList, currentDays);
}

function updateBadges() {
  var counts = { TB1: 0, TB2: 0 };
  allData.forEach(function(m) {
    var ws = (m.name.indexOf('H1') === 0) ? 'TB1' : 'TB2';
    if (m.anomalyCount > 0) counts[ws] += 1;
  });
  
  ['TB1', 'TB2'].forEach(function(ws) {
    var badge = $('#' + ws.toLowerCase() + 'Badge');
    var count = counts[ws];
    if (count > 0) {
      badge.text(count + '台异常').show();
    } else {
      badge.hide();
    }
  });
}

function updateDateRange() {
  var today = new Date();
  var start = new Date(today.getTime() - currentDays * 24 * 60 * 60 * 1000);
  var fmt = function(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  };
  $('#dateRangeLabel').text(fmt(start) + ' ~ ' + fmt(today));
}

function renderGrid() {
  var machines = allData.filter(function(m) {
    return (currentWorkshop === 'TB1' && m.name.indexOf('H1') === 0) ||
           (currentWorkshop === 'TB2' && m.name.indexOf('H2') === 0);
  });
  
  var $grid = $('#chartGrid');
  $grid.removeClass('tb1-layout');
  if (currentWorkshop === 'TB1') {
    $grid.addClass('tb1-layout');
  }
  $grid.empty();
  
  if (!machines.length) {
    $grid.html('<div class="empty-state">暂无数据 / No data</div>');
    return;
  }
  
  machines.forEach(function(machine) {
    var $cell = $('<div class="chart-cell"></div>');
    
    // Title
    var titleHtml = machine.name;
    if (machine.anomalyCount > 0) {
      titleHtml += ' <span class="anomaly-dot"></span>';
    }
    if (machine.standard === null || machine.standard === undefined) {
      titleHtml += '<br><small style="color:#E67E22;">标准值缺失</small>';
    }
    $cell.append('<div class="cell-title">' + titleHtml + '</div>');
    
    if (!machine.points || !machine.points.length) {
      $cell.append('<div class="cell-chart" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">暂无数值<br>No data</div>');
    } else {
      var chartDiv = $('<div class="cell-chart"></div>');
      $cell.append(chartDiv);
    }
    
    $cell.on('click', function() { openDetail(machine); });
    $grid.append($cell);
  });
  
  // Initialize ECharts for each cell (after DOM is in place)
  machines.forEach(function(machine, index) {
    if (!machine.points || !machine.points.length) return;
    var chartDom = $grid.find('.cell-chart').eq(index)[0];
    if (!chartDom) return;
    initMiniChart(chartDom, machine);
  });
}

function initMiniChart(dom, machine) {
  var chart = echarts.init(dom);
  
  var dates = machine.points.map(function(p) { return p.date; });
  var normalPts = machine.points.filter(function(p) { return !p.anomaly; });
  var anomalyPts = machine.points.filter(function(p) { return p.anomaly; });
  var std = machine.standard;
  
  var yMin, yMax;
  if (std !== null && std !== undefined) {
    yMin = std - 7;
    yMax = std + 10;
  } else {
    var cycles = machine.points.map(function(p) { return p.cycle; });
    yMin = Math.min.apply(null, cycles) - 2;
    yMax = Math.max.apply(null, cycles) + 2;
  }
  
  var series = [];
  
  // Normal points
  if (normalPts.length) {
    series.push({
      name: '正常 / Normal',
      type: 'scatter',
      data: normalPts.map(function(p) { return [p.date, p.cycle]; }),
      symbolSize: 8,
      itemStyle: { color: '#95A5A6' }
    });
  }
  
  // Anomaly points
  if (anomalyPts.length) {
    series.push({
      name: '异常 / Anomaly',
      type: 'scatter',
      data: anomalyPts.map(function(p) { return [p.date, p.cycle]; }),
      symbolSize: 10,
      itemStyle: { color: '#E74C3C' }
    });
  }
  
  // Reference lines (only if standard exists)
  if (std !== null && std !== undefined) {
    // Standard line
    series.push({
      name: '标准线 / Standard',
      type: 'line',
      data: [[dates[0], std], [dates[dates.length - 1], std]],
      symbol: 'none',
      lineStyle: { color: '#3498DB', type: 'dashed', dashOffset: 0, width: 2 },
      silent: true
    });
    // Upper limit
    series.push({
      name: '上限线 / Upper Limit',
      type: 'line',
      data: [[dates[0], std + 3], [dates[dates.length - 1], std + 3]],
      symbol: 'none',
      lineStyle: { color: '#E74C3C', type: [5, 5], width: 1.5 },
      silent: true
    });
    // Lower limit
    series.push({
      name: '下限线 / Lower Limit',
      type: 'line',
      data: [[dates[0], std - 1], [dates[dates.length - 1], std - 1]],
      symbol: 'none',
      lineStyle: { color: '#F39C12', type: [5, 5], width: 1.5 },
      silent: true
    });
  }
  
  var option = {
    grid: { left: 40, right: 8, top: 8, bottom: 24 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 9, rotate: 45 },
      axisTick: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      axisLabel: { fontSize: 9 },
      splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
    },
    series: series,
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        if (params.seriesType === 'line') return '';
        var d = params.data;
        var machineName = machine.name;
        var stdVal = machine.standard !== null ? machine.standard : '--';
        return '<b>' + machineName + '</b><br/>' +
               '日期: ' + d[0] + '<br/>' +
               '周期: ' + d[1] + 's<br/>' +
               '标准: ' + stdVal + 's';
      }
    }
  };
  
  chart.setOption(option);
  
  // Store chart instance for resize
  chart.dom = dom;
  $(dom).data('echart', chart);
}

function openDetail(machine) {
  $('#detailTitle').html(machine.name + ' 周期详情 / <small>Cycle Detail</small>');
  $('#detailModal').modal('show');
  
  // Delay chart init until modal is visible
  setTimeout(function() {
    var dom = document.getElementById('detailChart');
    var chart = echarts.init(dom);
    
    var normalPts = machine.points.filter(function(p) { return !p.anomaly; });
    var anomalyPts = machine.points.filter(function(p) { return p.anomaly; });
    var dates = machine.points.map(function(p) { return p.date; });
    var std = machine.standard;
    
    var series = [];
    
    if (normalPts.length) {
      series.push({
        name: '正常 / Normal',
        type: 'scatter',
        data: normalPts.map(function(p) { return [p.date, p.cycle, p.shift]; }),
        symbolSize: 10,
        itemStyle: { color: '#95A5A6' }
      });
    }
    
    if (anomalyPts.length) {
      series.push({
        name: '异常 / Anomaly',
        type: 'scatter',
        data: anomalyPts.map(function(p) { return [p.date, p.cycle, p.shift]; }),
        symbolSize: 12,
        itemStyle: { color: '#E74C3C' }
      });
    }
    
    if (std !== null && std !== undefined) {
      series.push({
        name: '标准线 / Standard',
        type: 'line',
        data: [[dates[0], std], [dates[dates.length - 1], std]],
        symbol: 'none',
        lineStyle: { color: '#3498DB', type: 'dashed', width: 2 },
        silent: true,
        markLine: {}
      });
      series.push({
        name: '上限 / Upper Limit',
        type: 'line',
        data: [[dates[0], std + 3], [dates[dates.length - 1], std + 3]],
        symbol: 'none',
        lineStyle: { color: '#E74C3C', type: [5, 5], width: 1.5 },
        silent: true
      });
      series.push({
        name: '下限 / Lower Limit',
        type: 'line',
        data: [[dates[0], std - 1], [dates[dates.length - 1], std - 1]],
        symbol: 'none',
        lineStyle: { color: '#F39C12', type: [5, 5], width: 1.5 },
        silent: true
      });
    }
    
    var option = {
      grid: { left: 60, right: 30, top: 20, bottom: 60 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11, rotate: 45 },
        name: '日期 / Date',
        nameLocation: 'center',
        nameGap: 35
      },
      yAxis: {
        type: 'value',
        name: '周期(秒) / Cycle(s)',
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
      },
      series: series,
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.seriesType === 'line') return '';
          var d = params.data;
          return '<b>' + machine.name + '</b><br/>' +
                 '日期: ' + d[0] + '<br/>' +
                 '班别: ' + (d[2] || '--') + '<br/>' +
                 '平均周期: ' + d[1] + 's<br/>' +
                 '标准: ' + (machine.standard !== null ? machine.standard : '--') + 's';
        }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 10 }
      ]
    };
    
    chart.setOption(option);
    $(dom).data('echart', chart);
    
    // Resize handler
    $('#detailModal').on('shown.bs.modal', function() {
      chart.resize();
    });
  }, 200);
  
  // Cleanup on modal hide
  $('#detailModal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
    var dom = document.getElementById('detailChart');
    var chart = $(dom).data('echart');
    if (chart) {
      chart.dispose();
      $(dom).removeData('echart');
    }
  });
}

// Resize all charts on window resize
var resizeTimer;
$(window).on('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    $('.cell-chart').each(function() {
      var chart = $(this).data('echart');
      if (chart) chart.resize();
    });
  }, 200);
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git add CycleMonitor-js.html
git commit -m "V20260719.06_创建注塑周期监控前端JS逻辑包括ECharts散点图渲染

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 添加路由注册和 load 函数

**Files:**
- Modify: `Code.js` — 在 `doGet()` 路由区追加 1 行，在 `loadEDSMyTasks` 后追加 load 函数

**Interfaces:**
- Consumes: `CycleMonitor.html` 模板文件
- Produces: `?v=CycleMonitor` 路由可用

- [ ] **Step 1: 在 doGet 中注册路由**

In `Code.js`, find line with `Route.path("EDS_MyTasks", loadEDSMyTasks);`

Add after:
```javascript
  Route.path("CycleMonitor", loadCycleMonitor);
```

- [ ] **Step 2: 追加 load 函数**

Find `function loadEDSMyTasks` in Code.js and add after its closing `}`:

```javascript
function loadCycleMonitor(webPage, id, name, process) {
  let pageUrl = webPage || getReleaseWebPage();
  return render("CycleMonitor", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("注塑周期监控 | Cycle Monitor")
    .setFaviconUrl(webIconUrl);
}
```

- [ ] **Step 3: Commit**

```bash
git add Code.js
git commit -m "V20260719.07_Code.js添加CycleMonitor路由和load函数

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 添加导航入口

**Files:**
- Modify: `Navigation.html` — 在合适区域追加导航卡片
- Modify: `Navigation_js.html` — 追加 click handler

**Interfaces:**
- Consumes: sessionStorage (siWebPage, id, name, process, workshop)
- Produces: 导航页可见「注塑周期监控」卡片，点击跳转

- [ ] **Step 1: 在 Navigation.html 中追加卡片**

Find the section where the analysis/inspection cards are. After the INJ SDM Summary card (around line 224 where `INJSDMCardWrap` div closes), add:

```html
      <div class="col-6 col-md-4 col-lg-3" id="CycleMonitorCardWrap" style="display:none;">
        <button type="button" class="nav-card" id="CycleMonitor">
          <i class="bi bi-graph-up icon"></i>
          <div class="title-cn">注塑周期监控</div>
          <div class="title-en">Cycle Monitor</div>
        </button>
      </div>
```

- [ ] **Step 2: 在 Navigation_js.html 中追加 click handler 和权限控制**

Find where `$('#INJSDMSummary').click(...)` is defined and add after that handler block:

```javascript
    $('#CycleMonitor').click(() => {
        let url = siWebPage + '?v=CycleMonitor'
            + '&ID=' + encodeURIComponent(id)
            + '&Name=' + encodeURIComponent(name)
            + '&Process=' + encodeURIComponent(process);
        window.open(url);
    });
```

Then find where `$('#INJSDMCardWrap').show();` or similar permission logic exists, and ensure the CycleMonitor card is visible for authorized users. Add after the INJ SDM card visibility line:

```javascript
    $('#CycleMonitorCardWrap').show();
```

Note: If there's specific permission logic (e.g. `if(process === 'INJ')`), confirm the desired access control with the user. For now, the card shows when the user is logged in.

- [ ] **Step 3: Commit**

```bash
git add Navigation.html Navigation_js.html
git commit -m "V20260719.08_Navigation添加注塑周期监控入口

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 添加全局 CSS 入口样式（可选）

**Files:**
- Modify: `CSS.html` — 仅当 chart-cell、chart-grid 等样式需要全局共享时才追加

Skip this task if all styles are inline in `CycleMonitor.html` (recommended for this module — styles are page-specific and already in the page's `<style>` block).

---

### Task 8: 集成测试

**Files:**
- No new files

**Interfaces:**
- Consumes: 完整部署的 GAS Web App

- [ ] **Step 1: 推送到 GAS 测试环境**

Run:
```bash
npx @google/clasp push
```

- [ ] **Step 2: 打开测试部署 URL**

从 GAS 控制台获取最新部署的 dev URL，或使用 `npx @google/clasp deployments` 查看。

- [ ] **Step 3: 手动验证下列场景**

| # | 验证项 | 预期结果 |
|---|--------|----------|
| 1 | 从导航页点击「注塑周期监控」卡片 | 页面打开，默认显示 TB1，加载 7 天数据 |
| 2 | 网格渲染 | TB1 显示 3×2 网格 6 台机台，每格有散点图 |
| 3 | 点击 TB2 Tab | 切换到 TB2，5×5 网格 21 台机台 |
| 4 | 异常点红色高亮 | 超出标准+3s 或低于标准-1s 的点为红色 |
| 5 | 三条参考线 | 每张图有标准线（蓝虚线）、上限（红虚线）、下限（橙虚线） |
| 6 | Hover tooltip | 悬停数据点显示机台号、日期、班别、周期值 |
| 7 | 点击迷你图 | 弹出模态框，显示该机台大图，支持缩放 |
| 8 | 切换 30 天 | 选择 30 天后数据刷新，日期范围更新 |
| 9 | 刷新按钮 | 点击刷新重新加载数据 |
| 10 | 异常计数 Badge | Tab 标签上显示异常机台数量 |
| 11 | 空数据机台 | 无数据机台显示「暂无数值」 |
| 12 | 响应式 | 手机端网格缩为 2 列 |

- [ ] **Step 4: 记录问题并修复**

If any test fails, fix the issue, commit, re-push, and re-verify.

---

### Task 9: 发布到生产

**Files:**
- No new files

- [ ] **Step 1: 确认所有修改已提交**

```bash
git status
git log --oneline -10
```

Expected: working tree clean, all commits present

- [ ] **Step 2: Push 到 GitHub**

```bash
git push origin master
```

- [ ] **Step 3: 推送到 GAS 生产**

Run:
```bash
npx @google/clasp push
```

Then deploy from GAS console: Deploy → New Deployment → Web App → Deploy

Or use the deploy-gas skill:
```
/deploy-gas
```

- [ ] **Step 4: 生产验证**

Open the production exec URL and repeat key verification steps (1, 2, 4, 5, 7 from Task 8).

---

## 文件变更总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `Kez_ECharts_js.html` | 新建 | ECharts 5.5.0 内联库 |
| `CycleMonitor.html` | 新建 | 页面 UI 结构 + 内联样式 |
| `CycleMonitor-js.html` | 新建 | ECharts 渲染 + 交互逻辑 |
| `Code.js` | 修改 | +常量 +3后端函数 +1 路由 +1 load函数 |
| `Navigation.html` | 修改 | +1 导航卡片 |
| `Navigation_js.html` | 修改 | +1 click handler + 权限显示 |
