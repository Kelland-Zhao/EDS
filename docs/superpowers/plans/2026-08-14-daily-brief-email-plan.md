# 早会闭环邮件提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每天 07:45 自动发送一封早会闭环邮件（在岗未安排人员 + 超期未关闭任务，按直线上级分组），形成排班→派工→执行→关闭的管理闭环。

**Architecture:** 在 Code.js 任务安排模块区新增一组后端函数：`getAttendanceMonthSheet_` 解析考勤表当月 sheet，`getSupervisorFromAttendance_` 从「考勤员」列构建直线上级映射，`collectUnassignedStaff_`/`collectOverdueTasks_` 复用现有 load* 函数汇总两类清单，`buildBriefEmailHtml_` 按 UI规范 渲染内联样式邮件，`sendDailyBrief` 编排发送并写 TaskLogs，`ensureDailyBriefTrigger_` 幂等安装 07:45 日触发器。前端两个页面的任务类型下拉各加一个「机动/待命」选项。

**Tech Stack:** Google Apps Script (V8)、MailApp、ScriptApp 触发器、Google Sheets（userID / 考勤表 / TASK 表）、Bootstrap 5 页面（仅加 option）

**Spec:** `docs/superpowers/specs/2026-08-13-daily-brief-email-design.md`（V20260813.03）

## Global Constraints

- 所有新后端函数插入 Code.js 任务安排模块区：**紧接在 `writeTaskLog_` 函数之后（Code.js:11525）**，以注释横幅 `// ============================================================` 分隔；常量插入顶部任务模块常量区（Code.js:21 `TASK_PERMISSION_COL` 之后）
- Commit 格式：`VYYYYMMDD.XX_中文描述`，末尾附 `Co-Authored-By: Claude <noreply@anthropic.com>`
- 本仓库无测试框架：本地验证 = `node --check Code.js`（语法）+ 代码走查；功能验证 = 推送后用户在 GAS 编辑器手动 Run（推送/部署走 push-to-gas / deploy-gas 技能，需用户确认，本计划不执行）
- 时区统一用 `Session.getScriptTimeZone()`（Asia/Hong_Kong），不写死
- 邮件 HTML 全内联样式，不引 Bootstrap/外部资源；表头双语 `<br>` 中上英下；品牌红 `#E60012`；斑马纹 `#f5f5f5`/`#ffffff`；正文 `#333`；次要 `#6c757d`
- 邮件主题：`【EDS人员工作安排 & 任务完成情况】` + 当天日期（yyyy-MM-dd）
- 考勤表列定位：考勤员列**按表头名定位**（第 4 行语义表头扫描），工号列固定 A（索引 0）、姓名列固定 C（索引 2）；不用 B 列（328 前缀 8 位）与表尾「直接上司」列
- userID 表数据自第 3 行起（前 2 行为两行表头）；A(0)=SAPID 5 位、B(1)=NAME、J(9)=邮箱、BK(62)=任务安排权限
- GAS `getValues()` 返回类型化值（数字单元格返回 number），所有 ID/姓名比较前必须 `String(x).trim()`
- 临时测试函数（`testXXX_`）验证完即删除，不得留在 Code.js

---

### Task 1: 考勤表常量与月度 sheet 解析器

**Files:**
- Modify: `Code.js:21`（常量区，TASK_PERMISSION_COL 之后加 1 行）
- Modify: `Code.js:11525`（writeTaskLog_ 之后插入新函数区）

**Interfaces:**
- Consumes: 无（本任务无上游依赖）
- Produces:
  - `const ATTENDANCE_SS_ID = "1dMON_DEcAUH9xRsfOkEF37fIN7DuyVHfNwOoUyd-V-0"`（常量）
  - `function getAttendanceMonthSheet_(year, month)` → `Sheet|null`。`year` 为字符串（如 "2026"），`month` 为数字（如 8）。遍历考勤表全部 sheet，正则 `^(20\d{2})\.(\d{1,2})月?$` 匹配名称，年等于 `year` 且月等于 `month` 则返回该 sheet；无匹配或异常返回 `null`

- [ ] **Step 1: 加常量**

在 Code.js:21（`const TASK_PERMISSION_COL = 62; // Column BK (0-indexed)`）之后插入：

```js
const ATTENDANCE_SS_ID = "1dMON_DEcAUH9xRsfOkEF37fIN7DuyVHfNwOoUyd-V-0"; // 考勤表（E&E 电子考勤记录）
```

- [ ] **Step 2: 插入月度 sheet 解析函数**

在 Code.js:11525（`writeTaskLog_` 的收尾 `}` 之后）插入：

```js
// ============================================================
//  任务安排模块 - 早会闭环日报 / Daily Brief Email
// ============================================================

/**
 * 考勤表月度 sheet 解析：sheet 名形如 "2026.08" / "2026.8" / "2026.08月"（命名不统一）
 * 遍历全部 sheet，正则 ^(20\d{2})\.(\d{1,2})月?$ 匹配，取 年+月 == 参数 的 sheet
 */
function getAttendanceMonthSheet_(year, month) {
  try {
    const ss = SpreadsheetApp.openById(ATTENDANCE_SS_ID);
    const sheets = ss.getSheets();
    const y = String(year);
    for (let i = 0; i < sheets.length; i++) {
      const m = sheets[i].getName().match(/^(20\d{2})\.(\d{1,2})月?$/);
      if (m && m[1] === y && parseInt(m[2], 10) === month) return sheets[i];
    }
    return null;
  } catch (e) {
    console.error('getAttendanceMonthSheet_ error: ' + e);
    return null;
  }
}

/** 临时验证函数（验证后删除） */
function testAttendanceMonthSheet_() {
  const now = new Date();
  const y = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy');
  const mm = parseInt(Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM'), 10);
  const ws = getAttendanceMonthSheet_(y, mm);
  console.log('month sheet:', ws ? ws.getName() : 'null');
  if (ws) {
    const header = ws.getDataRange().getValues()[3]; // 第4行语义表头
    console.log('row4 工号 colA:', header[0], '| 姓名 colC:', header[2], '| 考勤员 index:', header.findIndex(function (h) { return String(h).trim() === '考勤员'; }));
  }
}
```

- [ ] **Step 3: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出（语法通过）

- [ ] **Step 4: 功能验证（推送后用户执行）**

说明（写进本任务完成汇报）：用 push-to-gas 技能推送后，GAS 编辑器 Run `testAttendanceMonthSheet_`，预期日志：`month sheet: 2026.08`、`row4 工号 colA: (空) | 姓名 colC: 日期\n姓名 | 考勤员 index: 5`（F 列）。若 sheet 名不含当月（如月初未建表）应输出 `null` 且不抛错。

- [ ] **Step 5: 删除临时验证函数**

删除 `testAttendanceMonthSheet_` 整个函数。

- [ ] **Step 6: 提交**

```bash
git add Code.js
git commit -m "V20260814.01_新增考勤表常量与月度sheet解析器

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 考勤表直线上级映射构建器

**Files:**
- Modify: `Code.js`（Task 1 新建的函数区尾部继续插入）

**Interfaces:**
- Consumes: `getAttendanceMonthSheet_`（Task 1）、`ATTENDANCE_SS_ID`（Task 1）
- Produces:
  - `function getSupervisorFromAttendance_()` → `{sheetFound:boolean, clerkFound:boolean, sapToSupervisor:Object, nameToSupervisor:Object}`
    - 读当月 sheet 第 4 行（`data[3]`）语义表头，**扫描定位 `考勤员` 列索引**（找不到则 `clerkFound=false` 直接返回）
    - 自第 5 行（`data[4]`）起遍历：`sapToSupervisor[工号A列] = 考勤员值`、`nameToSupervisor[姓名C列] = 考勤员值`（值均 `String(x).trim()`，跳过空键/空值）
    - sheet 不存在或读取异常 → `sheetFound=false`

- [ ] **Step 1: 实现映射构建器**

在 Task 1 的函数区尾部插入：

```js
/**
 * 从考勤表当月 sheet 构建直线上级映射（「考勤员」列 = 主管/组长姓名）
 * 表头结构：前3行多层表头，第4行语义表头，数据自第5行起
 * 关键列：工号(A,0) 5位、姓名(C,2)；考勤员列按表头名定位（列位置逐月可能漂移）
 */
function getSupervisorFromAttendance_() {
  const result = { sheetFound: false, clerkFound: false, sapToSupervisor: {}, nameToSupervisor: {} };
  try {
    const now = new Date();
    const y = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy');
    const mm = parseInt(Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM'), 10);
    const ws = getAttendanceMonthSheet_(y, mm);
    if (!ws) return result;
    result.sheetFound = true;
    const data = ws.getDataRange().getValues();
    if (data.length < 5) return result;
    const header = data[3]; // 第4行语义表头
    let clerkIdx = -1;
    for (let c = 0; c < header.length; c++) {
      if (String(header[c] || '').trim() === '考勤员') { clerkIdx = c; break; }
    }
    if (clerkIdx === -1) return result;
    result.clerkFound = true;
    for (let i = 4; i < data.length; i++) {
      const sapID = String(data[i][0] || '').trim();
      const name = String(data[i][2] || '').trim();
      const clerk = String(data[i][clerkIdx] || '').trim();
      if (sapID && clerk) result.sapToSupervisor[sapID] = clerk;
      if (name && clerk) result.nameToSupervisor[name] = clerk;
    }
  } catch (e) {
    console.error('getSupervisorFromAttendance_ error: ' + e);
  }
  return result;
}

/** 临时验证函数（验证后删除） */
function testSupervisorFromAttendance_() {
  const r = getSupervisorFromAttendance_();
  console.log('sheetFound:', r.sheetFound, '| clerkFound:', r.clerkFound);
  console.log('工号66327(徐磊) →', r.sapToSupervisor['66327'] || r.nameToSupervisor['徐磊']);
  console.log('工号33677(林飞) →', r.sapToSupervisor['33677'] || r.nameToSupervisor['林飞']);
  console.log('姓名曹悦 →', r.nameToSupervisor['曹悦']);
  console.log('姓名齐兵 →', r.nameToSupervisor['齐兵']);
}
```

- [ ] **Step 2: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 3: 功能验证（推送后用户执行）**

GAS 编辑器 Run `testSupervisorFromAttendance_`，预期日志：
- `sheetFound: true | clerkFound: true`
- `工号66327(徐磊) → 曹悦`、`工号33677(林飞) → 林飞`、`姓名曹悦 → 曹悦`、`姓名齐兵 → 齐兵`
- 若当月 sheet 不存在：`sheetFound: false | clerkFound: false`（不抛错）

- [ ] **Step 4: 删除临时验证函数并提交**

```bash
git add Code.js
git commit -m "V20260814.02_新增考勤表直线上级映射构建器

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: A/B 清单汇总与收件人计算

**Files:**
- Modify: `Code.js`（Task 2 之后继续插入）

**Interfaces:**
- Consumes: `loadAttendanceSync`（Code.js:11699）、`loadIMStaffByDate`（Code.js:12020）、`loadAllTasksForList`（Code.js:11993）、`TASK_PERMISSION_COL`、`USER_PERMISSION_SS_ID`/`USER_PERMISSION_SHEET_NAME`（Code.js:10339-10340）
- Produces:
  - `function daysBetween_(fromYMD, toYMD)` → 天数差（number，按 `new Date(y,m-1,d)` 手工解析差除以 86400000 后 `Math.round`）
  - `function collectUnassignedStaff_(today)` → `{success, staff:[{sapID,name,process,workshop,shift}], source:'AttendanceSync'|'IM'|'none', message}`
  - `function collectOverdueTasks_(today)` → `{success, tasks:[{taskID,title,ownerSapIDs,ownerNames,collaboratorNames,dueDate,overdueDays,status}], involvedSapIDs:string[], message}`
  - `function getBriefRecipients_(involvedSapIDs)` → 邮箱数组（去重、去空）

- [ ] **Step 1: 实现四个函数**

在 Task 2 之后插入：

```js
/** yyyy-MM-dd 差值天数（from → to） */
function daysBetween_(fromYMD, toYMD) {
  const p1 = String(fromYMD).split('-');
  const p2 = String(toYMD).split('-');
  return Math.round((new Date(p2[0], p2[1] - 1, p2[2]) - new Date(p1[0], p1[1] - 1, p1[2])) / 86400000);
}

/**
 * A 类汇总：今日在岗但未安排任何任务的人员
 * 出勤数据源：AttendanceSync 优先，IM 排班降级，两者皆空则 source='none'
 * 只保留 attendanceStatus 为空或在岗的人员
 * 已安排口径（与工作台 todayTasks 一致）：手动+PM 合并任务中 status≠已取消、
 * 日期区间与 today 重叠（planStartDate≤today≤dueDate）、该人是 owner 或 collaborator（sapID 与姓名都算命中）
 */
function collectUnassignedStaff_(today) {
  try {
    let staff = [];
    let source = 'none';
    let attResult = JSON.parse(loadAttendanceSync(today));
    if (attResult.success && attResult.data.length > 0) {
      staff = attResult.data;
      source = 'AttendanceSync';
    } else {
      let imResult = JSON.parse(loadIMStaffByDate(today));
      staff = imResult.success ? imResult.data : [];
      if (staff.length > 0) source = 'IM';
    }
    staff = staff.filter(function (s) {
      const st = String(s.attendanceStatus || '').trim();
      return !st || st === '在岗';
    });
    const tasksResult = JSON.parse(loadAllTasksForList(true));
    const allTasks = tasksResult.success ? tasksResult.merged : [];
    const assigned = {};
    allTasks.forEach(function (t) {
      if (t.status === '已取消') return;
      const start = String(t.planStartDate || '');
      const due = String(t.dueDate || '');
      if (!start || !due) return;
      if (start > today || due < today) return;
      (t.owners || []).forEach(function (sap) { if (sap) assigned[String(sap)] = true; });
      (t.collaborators || []).forEach(function (sap) { if (sap) assigned[String(sap)] = true; });
      (t.ownerNames || []).forEach(function (n) { if (n) assigned[String(n)] = true; });
      (t.collaboratorNames || []).forEach(function (n) { if (n) assigned[String(n)] = true; });
    });
    const unassigned = staff.filter(function (s) {
      const sap = String(s.sapID || '').trim();
      const name = String(s.name || '').trim();
      return !(sap && assigned[sap]) && !(name && assigned[name]);
    });
    return { success: true, staff: unassigned, source: source, message: '' };
  } catch (e) {
    return { success: false, staff: [], source: 'none', message: e.message };
  }
}

/**
 * B 类汇总：截止日期已过且未关闭（status ∉ {已完成, 已取消}）的任务，按超期天数降序
 */
function collectOverdueTasks_(today) {
  try {
    const tasksResult = JSON.parse(loadAllTasksForList(true));
    const allTasks = tasksResult.success ? tasksResult.merged : [];
    const involved = {};
    const tasks = [];
    allTasks.forEach(function (t) {
      const status = String(t.status || '');
      if (status === '已完成' || status === '已取消') return;
      const due = String(t.dueDate || '');
      if (!due || due >= today) return;
      (t.owners || []).forEach(function (sap) { if (sap) involved[String(sap)] = true; });
      (t.collaborators || []).forEach(function (sap) { if (sap) involved[String(sap)] = true; });
      tasks.push({
        taskID: String(t.taskID || ''),
        title: String(t.title || ''),
        ownerSapIDs: (t.owners || []).map(String),
        ownerNames: (t.ownerNames || []).map(String),
        collaboratorNames: (t.collaboratorNames || []).map(String),
        dueDate: due,
        overdueDays: daysBetween_(due, today),
        status: status
      });
    });
    tasks.sort(function (a, b) { return b.overdueDays - a.overdueDays; });
    return { success: true, tasks: tasks, involvedSapIDs: Object.keys(involved), message: '' };
  } catch (e) {
    return { success: false, tasks: [], involvedSapIDs: [], message: e.message };
  }
}

/**
 * 收件人：userID 表 BK 列(62) 任务安排权限 ∈ {admin, supervisor} 的邮箱
 * ∪ B 类任务涉及 owner/collaborator 的 SAPID 对应邮箱（A 列匹配 → J 列邮箱）
 */
function getBriefRecipients_(involvedSapIDs) {
  const emails = [];
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return emails;
    const values = ws.getDataRange().getValues();
    const sapToEmail = {};
    for (let i = 2; i < values.length; i++) {
      const sapID = String(values[i][0] || '').trim();
      const email = String(values[i][9] || '').trim();
      if (sapID && email) sapToEmail[sapID] = email;
    }
    for (let i = 2; i < values.length; i++) {
      const perm = String(values[i][TASK_PERMISSION_COL] || '').trim().toLowerCase();
      if (perm === 'admin' || perm === 'supervisor') {
        const email = String(values[i][9] || '').trim();
        if (email && emails.indexOf(email) === -1) emails.push(email);
      }
    }
    (involvedSapIDs || []).forEach(function (sap) {
      if (sapToEmail[sap] && emails.indexOf(sapToEmail[sap]) === -1) emails.push(sapToEmail[sap]);
    });
  } catch (e) {
    console.error('getBriefRecipients_ error: ' + e);
  }
  return emails;
}

/** 临时验证函数（验证后删除） */
function testBriefCollectors_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const a = collectUnassignedStaff_(today);
  console.log('A 类:', a.success, '人数:', a.staff.length, '数据源:', a.source);
  console.log('A 类示例:', a.staff.slice(0, 5).map(function (s) { return s.name + '/' + s.sapID; }));
  const b = collectOverdueTasks_(today);
  console.log('B 类:', b.success, '任务数:', b.tasks.length, '涉及人数:', b.involvedSapIDs.length);
  console.log('B 类示例:', b.tasks.slice(0, 3).map(function (t) { return t.taskID + ' 超期' + t.overdueDays + '天'; }));
  console.log('收件人:', getBriefRecipients_(b.involvedSapIDs));
}
```

- [ ] **Step 2: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 3: 功能验证（推送后用户执行）**

GAS 编辑器 Run `testBriefCollectors_`，预期：
- A 类返回在岗且无当日重叠任务（owner/collaborator 都不命中）的人员
- B 类只含 dueDate < 今天且未完成/未取消的任务，超期天数 ≥ 1
- 收件人含所有 BK=admin/supervisor 人员的邮箱（无重复）

- [ ] **Step 4: 删除临时验证函数并提交**

```bash
git add Code.js
git commit -m "V20260814.03_新增早会日报清单汇总与收件人计算

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 邮件 HTML 模板

**Files:**
- Modify: `Code.js`（Task 3 之后继续插入）

**Interfaces:**
- Consumes: `getReleaseWebPage`（Code.js:193）
- Produces:
  - `function escHtml_(s)` → HTML 转义后的字符串（& < > "）
  - `function buildBriefEmailHtml_(today, staffData, overdueData, supMaps)` → HTML 字符串
    - `staffData` = collectUnassignedStaff_ 返回值；`overdueData` = collectOverdueTasks_ 返回值；`supMaps` = getSupervisorFromAttendance_ 返回值
    - 分组规则：A 类按人员直线上级分组（工号→姓名→兜底），B 类按主负责人（首个 owner；无 owner 用首个姓名）直线上级分组；`supMaps.sheetFound=false` 时全部分组为「考勤表不存在或读取失败」；直线上级解析为空 → 「未配置直线上级」；两个兜底组排最后
    - `staffData.source === 'none'` 时 A 段显示"今日无出勤数据"（不是"全员已安排"）

- [ ] **Step 1: 实现 HTML 构建函数**

在 Task 3 之后插入：

```js
/** HTML 转义（邮件内容防注入） */
function escHtml_(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 早会闭环日报 HTML（遵循 UI规范.md：品牌红、双语中上英下、斑马纹、内联样式、无外部资源）
 */
function buildBriefEmailHtml_(today, staffData, overdueData, supMaps) {
  const staff = (staffData && staffData.staff) || [];
  const tasks = (overdueData && overdueData.tasks) || [];
  const src = (staffData && staffData.source) || '';
  const fallbackKeys = ['未配置直线上级', '考勤表不存在或读取失败'];

  const staffGroups = {};
  staff.forEach(function (s) {
    const sap = String(s.sapID || '').trim();
    const name = String(s.name || '').trim();
    let gk;
    if (!supMaps.sheetFound) gk = '考勤表不存在或读取失败';
    else {
      const sup = (sap && supMaps.sapToSupervisor[sap]) || (name && supMaps.nameToSupervisor[name]) || '';
      gk = sup || '未配置直线上级';
    }
    if (!staffGroups[gk]) staffGroups[gk] = [];
    staffGroups[gk].push(s);
  });

  const taskGroups = {};
  tasks.forEach(function (t) {
    const mainSap = (t.ownerSapIDs && t.ownerSapIDs[0]) || '';
    const mainName = (t.ownerNames && t.ownerNames[0]) || (t.collaboratorNames && t.collaboratorNames[0]) || '';
    let gk;
    if (!supMaps.sheetFound) gk = '考勤表不存在或读取失败';
    else {
      const sup = (mainSap && supMaps.sapToSupervisor[mainSap]) || (mainName && supMaps.nameToSupervisor[mainName]) || '';
      gk = sup || '未配置直线上级';
    }
    if (!taskGroups[gk]) taskGroups[gk] = [];
    taskGroups[gk].push(t);
  });

  function sortedKeys(groups) {
    return Object.keys(groups).sort(function (a, b) {
      const fa = fallbackKeys.indexOf(a) !== -1;
      const fb = fallbackKeys.indexOf(b) !== -1;
      if (fa !== fb) return fa ? 1 : -1;
      return a.localeCompare(b);
    });
  }
  const zebra = function (idx) { return idx % 2 === 0 ? '#ffffff' : '#f5f5f5'; };
  const secTitle = function (cn, en) {
    return '<div style="font-size:13px;font-weight:700;color:#6c757d;letter-spacing:1px;margin:18px 0 10px;border-left:3px solid #E60012;padding-left:10px;">'
      + escHtml_(cn) + ' <span style="font-weight:400;">/ ' + escHtml_(en) + '</span></div>';
  };
  const groupTitle = function (name) {
    const suffix = fallbackKeys.indexOf(name) !== -1 ? '' : '（主管）';
    return '<div style="font-size:13px;font-weight:700;color:#333;margin:12px 0 6px;border-left:3px solid #E60012;padding-left:10px;">'
      + escHtml_(name) + suffix + '</div>';
  };
  const th = function (cn, en) {
    return '<th style="background:#E60012;color:#fff;text-align:center;font-size:12px;padding:5px 6px;">'
      + escHtml_(cn) + '<br><span style="font-weight:400;font-size:11px;">' + escHtml_(en) + '</span></th>';
  };
  const td = function (text, align, idx, extra) {
    return '<td style="text-align:' + (align || 'center') + ';padding:5px 6px;background:' + zebra(idx) + ';' + (extra || '') + '">' + text + '</td>';
  };

  let html = '';
  html += '<table style="width:100%;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#333;" cellpadding="0" cellspacing="0"><tr><td style="padding:16px;">';
  // banner
  html += '<table style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">';
  html += '<tr><td style="background:#E60012;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">'
    + '<div style="font-size:18px;font-weight:700;">人员工作安排 &amp; 任务完成情况</div>'
    + '<div style="font-size:12px;opacity:0.85;margin-top:4px;">Daily Work Arrangement &amp; Task Completion</div>'
    + '<div style="font-size:12px;opacity:0.85;margin-top:4px;">' + escHtml_(today) + '</div></td></tr>';
  // 内容卡片
  html += '<tr><td style="background:#ffffff;border:1px solid #e9ecef;border-top:none;border-radius:0 0 8px 8px;padding:16px 18px;">';

  // 段一
  html += secTitle('今日在岗未安排人员', 'UNASSIGNED STAFF TODAY');
  if (src === 'none') {
    html += '<div style="font-size:13px;color:#6c757d;">今日无出勤数据 / No attendance data today</div>';
  } else if (staff.length === 0) {
    html += '<div style="font-size:13px;color:#198754;">&#10003; 今日全员已安排 / All staff assigned</div>';
  } else {
    sortedKeys(staffGroups).forEach(function (gk) {
      html += groupTitle(gk);
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px;" cellpadding="0" cellspacing="0">';
      html += '<tr>' + th('姓名', 'Name') + th('工号', 'ID') + th('车间', 'Workshop') + th('工序', 'Process') + th('班次', 'Shift') + '</tr>';
      staffGroups[gk].sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }).forEach(function (s, idx) {
        html += '<tr>'
          + td(escHtml_(s.name || ''), 'center', idx)
          + td(escHtml_(s.sapID || ''), 'center', idx)
          + td(escHtml_(s.workshop || ''), 'center', idx)
          + td(escHtml_(s.process || ''), 'center', idx)
          + td(escHtml_(s.shift || ''), 'center', idx) + '</tr>';
      });
      html += '</table>';
    });
  }

  // 段二
  html += secTitle('超期未关闭任务', 'OVERDUE TASKS');
  if (tasks.length === 0) {
    html += '<div style="font-size:13px;color:#198754;">&#10003; 无超期任务 / No overdue tasks</div>';
  } else {
    sortedKeys(taskGroups).forEach(function (gk) {
      html += groupTitle(gk);
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px;" cellpadding="0" cellspacing="0">';
      html += '<tr>' + th('任务编号', 'Task ID') + th('标题', 'Title') + th('负责人', 'Owner') + th('截止日期', 'Due Date') + th('超期天数', 'Overdue Days') + '</tr>';
      taskGroups[gk].forEach(function (t, idx) {
        html += '<tr>'
          + td(escHtml_(t.taskID), 'center', idx)
          + td(escHtml_(t.title), 'left', idx, 'max-width:220px;word-wrap:break-word;overflow-wrap:break-word;')
          + td(escHtml_((t.ownerNames || []).join(', ')), 'center', idx)
          + td(escHtml_(t.dueDate), 'center', idx)
          + td('<strong style="color:#E60012;">' + t.overdueDays + '</strong>', 'center', idx) + '</tr>';
      });
      html += '</table>';
    });
  }

  // CTA + 脚注
  html += '<div style="text-align:center;margin:20px 0 8px;">'
    + '<a href="' + getReleaseWebPage() + '" style="display:inline-block;background:#E60012;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;">进入 EDS 系统 / Open EDS</a>'
    + '</div>';
  html += '<div style="text-align:center;font-size:11px;color:#adb5bd;margin-top:12px;">此邮件由 EDS 系统自动发送 / Auto-generated by EDS</div>';

  html += '</td></tr></table>';
  html += '</td></tr></table>';
  return html;
}
```

- [ ] **Step 2: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add Code.js
git commit -m "V20260814.04_新增早会日报邮件HTML模板

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: sendDailyBrief 主函数

**Files:**
- Modify: `Code.js`（Task 4 之后继续插入）

**Interfaces:**
- Consumes: Task 1-4 全部产物、`writeTaskLog_`（Code.js:11515）
- Produces:
  - `function sendDailyBrief()` → JSON 字符串 `{success, brief?, skipped?, message?}`。由触发器调用（也用于手动 Run 测试）。写日志：Action='dailyBrief'、TargetType='DailyBrief'、TargetID=today

- [ ] **Step 1: 实现主函数**

在 Task 4 之后插入：

```js
/**
 * 早会闭环日报：每天 07:45 由日触发器调用（GAS 编辑器可手动 Run 测试）
 * 汇总 A 类（在岗未安排）+ B 类（超期未关闭），按 Supervisor 分组渲染邮件发送给主管/管理员+责任人
 */
function sendDailyBrief() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  try {
    const staffData = collectUnassignedStaff_(today);
    const overdueData = collectOverdueTasks_(today);
    const supMaps = getSupervisorFromAttendance_();
    const recipients = getBriefRecipients_(overdueData.involvedSapIDs);
    if (recipients.length === 0) {
      writeTaskLog_('dailyBrief', 'DailyBrief', today, '', '收件人为空，跳过发送', '', '');
      return JSON.stringify({ success: true, skipped: true, message: '收件人为空，已跳过 / No recipients' });
    }
    const html = buildBriefEmailHtml_(today, staffData, overdueData, supMaps);
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: '【EDS人员工作安排 & 任务完成情况】' + today,
      htmlBody: html
    });
    const brief = 'A=' + (staffData.staff ? staffData.staff.length : 0)
      + ';B=' + (overdueData.tasks ? overdueData.tasks.length : 0)
      + ';recipients=' + recipients.length
      + ';source=' + (staffData.source || '');
    writeTaskLog_('dailyBrief', 'DailyBrief', today, '', brief, '', '');
    return JSON.stringify({ success: true, brief: brief });
  } catch (e) {
    console.error('sendDailyBrief error: ' + e);
    try { writeTaskLog_('dailyBrief', 'DailyBrief', today, '', '发送失败: ' + e.message, '', ''); } catch (e2) { /* 忽略日志失败 */ }
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 2: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add Code.js
git commit -m "V20260814.05_新增早会日报发送主函数

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 日触发器安装与 doGet 挂接

**Files:**
- Modify: `Code.js`（Task 5 之后插入触发器函数）
- Modify: `Code.js:167`（doGet 路由分发前挂接 1 行）

**Interfaces:**
- Consumes: 无（`sendDailyBrief` 名称字符串引用）
- Produces: `function ensureDailyBriefTrigger_()`（幂等，无返回值）

- [ ] **Step 1: 实现幂等触发器安装函数**

在 Task 5 之后插入：

```js
/**
 * 幂等安装早会日报日触发器（每天 07:45，脚本时区 Asia/Hong_Kong）
 * doGet 时调用——任何人打开任意页面都会做幂等检查，触发器具备自修复能力
 */
function ensureDailyBriefTrigger_() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'sendDailyBrief') return;
    }
    ScriptApp.newTrigger('sendDailyBrief').timeBased().everyDays(1).atHour(7).atMinute(45).create();
  } catch (e) {
    console.error('ensureDailyBriefTrigger_ error: ' + e);
  }
}
```

- [ ] **Step 2: doGet 挂接**

在 Code.js:166（`Route.path("getSuggestedCardNumber", getSuggestedCardNumber);`）与 Code.js:167（`if (Route[e.parameters.v]) {`）之间插入：

```js
  ensureDailyBriefTrigger_();
```

- [ ] **Step 3: 本地语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 4: 提交**

```bash
git add Code.js
git commit -m "V20260814.06_新增早会日报日触发器并挂接doGet

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 前端任务类型下拉新增「机动/待命」选项

**Files:**
- Modify: `EDS_TaskList.html:157-162`（taskType select）
- Modify: `EDS_TodayDashboard.html:242-247`（taskType select）

**Interfaces:**
- Consumes: 无
- Produces: 两个页面的任务类型下拉各多一个 `<option value="机动/待命">机动/待命 / Standby</option>`；后端零改动（taskType 自由文本）

- [ ] **Step 1: 修改 EDS_TaskList.html**

在 `<option value="测试">测试 / Test</option>` 之后加一行：

```html
                  <option value="机动/待命">机动/待命 / Standby</option>
```

（缩进与相邻 option 一致，8 空格）

- [ ] **Step 2: 修改 EDS_TodayDashboard.html**

同样位置（`<option value="测试">测试 / Test</option>` 之后）加同样一行。

- [ ] **Step 3: 提交**

```bash
git add EDS_TaskList.html EDS_TodayDashboard.html
git commit -m "V20260814.07_任务类型下拉新增机动待命选项

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 端到端验证与收尾

**Files:**
- 无代码改动（验证为主）

**Interfaces:**
- Consumes: Task 1-7 全部产物
- Produces: 验证通过的完整功能

- [ ] **Step 1: 全量语法检查**

Run: `node --check Code.js`
Expected: 无输出

- [ ] **Step 2: 自查代码位置**

确认新增函数全部位于任务安排模块区（`writeTaskLog_` 之后、`formatINJSDMDate_` 之前），临时验证函数 `testXXX_` 已全部删除：
Run: `grep -n "testAttendanceMonthSheet_\|testSupervisorFromAttendance_\|testBriefCollectors_\|function sendDailyBrief\|function ensureDailyBriefTrigger_\|function buildBriefEmailHtml_\|function getSupervisorFromAttendance_\|function getAttendanceMonthSheet_\|function collectUnassignedStaff_\|function collectOverdueTasks_\|function getBriefRecipients_\|function daysBetween_\|function escHtml_" Code.js`
Expected: 10 个 `function XXX` 命中（正式函数），3 个 `testXXX_` 零命中（已删除）

- [ ] **Step 3: 推送（用户执行 push-to-gas 技能）**

向用户汇报：代码已完成，需用 push-to-gas 技能推送，然后按以下清单在 GAS 编辑器验证：
1. Run `sendDailyBrief` → 收件箱收到 `【EDS人员工作安排 & 任务完成情况】2026-08-14`，TaskLogs 表新增 `dailyBrief` 记录（含 A/B 人数与收件人数）
2. 邮件内容核对：段一段二按 Supervisor 分组、双语表头、红色 banner、超期天数红字、CTA 链接可点（落到登录页）
3. 场景验证（对照 spec 4.6）：在岗无任务人员出现在段一；建任务后消失；「机动/待命」任务豁免；dueDate 昨天的未完成任务出现在段二；状态改已完成消失；空清单收到"全员已安排"确认邮件
4. 场景核对时，确认邮件中「未配置直线上级」分组人数少、符合预期（若该组占多数，说明考勤员列匹配失败，如考勤表纵向合并单元格导致读列偏移，需检查 `getSupervisorFromAttendance_`）
5. Run `ensureDailyBriefTrigger_` 两次 → GAS 触发器页仅 1 个 `sendDailyBrief` 触发器（07:45）
6. 推送后打开任一 EDS 页面（经部署的 Web App 访问，doGet 即执行触发器自愈挂载）→ 再到 GAS 触发器页确认仍仅有 1 个 `sendDailyBrief` 触发器（07:45）——端到端验证 doGet 挂载路径
7. 验证通过后用 deploy-gas 技能发布到生产（需用户确认）

- [ ] **Step 4: 最终提交（如有验证后的修正）**

```bash
git add Code.js EDS_TaskList.html EDS_TodayDashboard.html
git commit -m "V20260814.08_早会日报端到端验证修正

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review 记录

- **Spec 覆盖**：4.1 触发链路→Task 6；4.2 主流程→Task 3+5；4.3/4.3.1 邮件内容与 UI→Task 4；4.4 例外机制→Task 7；4.5 边界（无收件人跳过/无出勤数据/考勤表缺失/发送异常/缓存强制刷新）→Task 3+4+5；4.6 测试验证→Task 8；4.7 考勤表数据源→Task 1+2。全覆盖，无缺口。
- **占位符扫描**：无 TBD/TODO/占位描述，所有代码步骤含完整实现。
- **类型一致性**：`getSupervisorFromAttendance_` 返回值结构 `{sheetFound, clerkFound, sapToSupervisor, nameToSupervisor}` 在 Task 2 定义、Task 4 消费处字段名一致；`collectUnassignedStaff_`/`collectOverdueTasks_` 返回值字段在 Task 3 定义、Task 4/5 消费一致；`escHtml_`、`daysBetween_`、`sortedKeys`、`zebra` 均先定义后使用。
