const devWebPage =
  "https://script.google.com/a/macros/colpal.com/s/AKfycbz92tqMHCvBErGfu_yHxtSeL25lDOkuuKcNTPvkMJQ/dev";
const releaseWebPage =
  "https://script.google.com/a/colpal.com/macros/s/AKfycbyaQjG5yFGYxU825DrODhSLl2bdfbYKpqAH4qOIzKoTJ4b-5qU/exec";
const userLogInformationId = "1ecEx7G_FX7DAJ_8cm1AxSaN2h95IVo8n-W4WMX-g1m4";
const webIconUrl =
  "https://images.ctfassets.net/m3056igwnpsm/2QQOLoOlu2v9JFVVjTnsrz/8fea197464768353c908b0c2c9d0edb3/EDS.png";

// ============================================================
//  任务安排模块常量 / Task Arrangement Module Constants
// ============================================================
const TASK_SS_ID = "1UBg1Ake18cFp6gj0jKRX1Y9GJ0VL1pY5aXK-UoCeAY0";
const TASK_TASKS_SHEET = "Tasks";
const TASK_MEMBERS_SHEET = "TaskMembers";
const TASK_TEMPLATES_SHEET = "DailyTemplates";
const TASK_LOGS_SHEET = "TaskLogs";
const TASK_CONFIG_SHEET = "TaskConfig";
const TASK_PERMISSION_COL = 62; // Column BK (0-indexed)
const IM_SCHEDULING_SS_ID = "1dyS5C7r4pqYIeRT0p1zYzngt0EDCYR4hsswurAsEBYg"; // 注塑排班主数据
const IM_SCHEDULING_SHEET = "MasterData";

// 注塑周期监控模块常量 / Cycle Monitor Constants
const CYCLE_SS_ID = "1cfJBxEKnNcwt1xH_tSRjKpD6Dv1JqOEzJxi2p7mZiZM";
const CYCLE_ACTUAL_SHEET = "机台周期实际值";
const CYCLE_STANDARD_SHEET = "机台周期标准";

// Inspection2.0 统一记录表开关（紧急回滚设 false）
var USE_UNIFIED_INSPECTION_SHEET = true;

// PM 分表合并 - 配置常量
var USE_MERGED_PM_SHEET = true;  // 紧急回滚设 false
var PM_RECORDS_SHEET_NAME = "PM_Records";
var PM_DB_ID = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";

// PM 分表合并 - 获取合并表引用
function getPMSheet(ss) {
  if (USE_MERGED_PM_SHEET) {
    return ss.getSheetByName(PM_RECORDS_SHEET_NAME);
  }
  return null;  // 返回 null 让调用方回退到旧逻辑
}

// PM 分表合并 - 在表中按 PM No. 查找行号
function findRowByPMNo(ws, pmNo) {
  var lastRow = ws.getLastRow();
  if (lastRow <= 1) return -1;
  var values = ws.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === pmNo) return i + 1;
  }
  return -1;
}

// PM 分表合并 - 从合并表获取指定工序+车间的 PM No. 列表
function getPMNoList(ws, process, workshop) {
  var lastRow = ws.getLastRow();
  if (lastRow <= 1) return [];
  var data = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getDisplayValues();
  // 列 V(索引21)=工序, 列 W(索引22)=车间
  return data
    .filter(function(r) { return r[21] === process && r[22] === workshop; })
    .map(function(r) { return r[0]; });
}

// 交接班分表合并 - 配置常量
var USE_MERGED_SHIFT_SHEET = true;  // 紧急回滚设 false
var SHIFT_RECORDS_SHEET_NAME = "Shift_Records";
var SHIFT_DB_ID = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";

// 交接班分表合并 - 获取合并表引用
function getShiftSheet(ss) {
  if (USE_MERGED_SHIFT_SHEET) {
    return ss.getSheetByName(SHIFT_RECORDS_SHEET_NAME);
  }
  return null;
}

// 交接班分表合并 - 在合并表中按工序+车间过滤数据
// data: getDisplayValues() 返回的二维数组
// 利用原表已有列：col O(14)=车间, col P(15)=工序
function filterShiftByProcessWorkshop(data, process, workshop) {
  return data.filter(function(r) {
    var rowWorkshop = String(r[14] || '').trim();
    var rowProcess = String(r[15] || '').trim();
    // INJ 和 IM 视为等价
    var processMatch = (rowProcess === process) ||
      (rowProcess === 'INJ' && process === 'IM') ||
      (rowProcess === 'IM' && process === 'INJ');
    return processMatch && rowWorkshop === workshop;
  });
}

// 交接班分表合并 - 在合并表中按编号(code)和工序+车间查找行号
// 利用原表已有列：col O(14)=车间, col P(15)=工序
function findRowByShiftCode(ws, code, process, workshop) {
  var lastRow = ws.getLastRow();
  if (lastRow <= 1) return -1;
  var data = ws.getRange(1, 1, lastRow, ws.getLastColumn()).getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === String(code).trim()) {
      var rowWorkshop = String(data[i][14] || '').trim();
      var rowProcess = String(data[i][15] || '').trim();
      var processMatch = (rowProcess === process) ||
        (rowProcess === 'INJ' && process === 'IM') ||
        (rowProcess === 'IM' && process === 'INJ');
      if (processMatch && rowWorkshop === workshop) {
        return i + 1;
      }
    }
  }
  return -1;
}

var Route = {};

Route.path = function (route, callback) {
  Route[route] = callback;
};

function doGet(e) {
  // Handle project tracking approval/rejection actions via email links
  if (e.parameters.action === 'approve' || e.parameters.action === 'reject') {
    return handleApprovalAction(e.parameters.action, e.parameters.token);
  }

  Route.path("ViewHistory", loadViewHistory);
  Route.path("Navigation", loadNavigation);
  Route.path("home_new_1.0", loadhome_new);
  Route.path("PM_Plan_1.0", loadPM_Plan_new);
  Route.path("PM_Task_1.0", loadPM_Task_new);
  Route.path("PM_Production_Confirm", loadPM_Production_Confirm);
  //   Route.path("failureReport", loadFailureReport_new);
  Route.path("FailureReport_Upload", loadFailureReport_Upload);
  Route.path("FailureReport_Manage", loadFailureReport_Manage);
  Route.path("FailureReport_Progress", loadFailureReport_Progress);
  Route.path("FailureReport_Followup_Manage", loadFailureReport_Followup_Manage);
  Route.path("FailureReport_Followup_Verify", loadFailureReport_Followup_Verify);
  Route.path("MoldSurfaceClean", loadMoldSurfaceClean); // Changed to MoldSurfaceClean
  Route.path("TaskManagement", loadTaskManagement);
  Route.path("PersonnelAssignment", loadPersonnelAssignment);
  Route.path("TaskEdit", loadTaskEdit);
  Route.path("PM_RecordQuery", loadPM_RecordQuery); // 新增记录查询页面路由
  Route.path("Inspection2.0", loadInspection2_0); // 新增点检2.0路由
  Route.path("PM_ShiftFollowUp", loadPM_ShiftFollowUp); // 新增三班转保养跟进页面路由
  Route.path("Handover_1.0", loadHandover_1_0); // 新增交接班页面路由
  Route.path("Fault_Record_1.0", loadFault_Record_1_0); // 新增故障记录页面路由
  Route.path("FailureReport_Template", loadFailureReport_Template);
  Route.path("FailureReport_Review", loadFailureReport_Review);
  Route.path("ProjectTracking", loadProjectTracking);
  Route.path("INJ_SDM_Summary", loadINJSDMSummary);
  Route.path("EDS_TodayDashboard", loadEDSTodayDashboard);
  Route.path("EDS_ResourceGantt", loadEDSResourceGantt);
  Route.path("EDS_TaskList", loadEDSTaskList);
  Route.path("EDS_MyTasks", loadEDSMyTasks);
  Route.path("CycleMonitor", loadCycleMonitor);

  if (Route[e.parameters.v]) {
    return Route[e.parameters.v](
      e.parameters.webPage,
      e.parameters.intoWebID || e.parameters.ID,
      e.parameters.intoWebName || e.parameters.Name,
      e.parameters.intoWebType || e.parameters.Process
    );
  } else {
    let webPage = getReleaseWebPage();
    return render("home_new_1.0", { webPage: webPage })
      .setTitle("EDS 登录 | EDS Login")
      .setFaviconUrl(webIconUrl);
  }
}

function render(file, obj) {
  var tmp = HtmlService.createTemplateFromFile(file);
  if (obj) {
    var keys = Object.keys(obj);
    keys.forEach(function (key) {
      tmp[key] = obj[key];
    });
  }
  return tmp.evaluate();
}

function getReleaseWebPage() {
  let webPageUrl = ScriptApp.getService().getUrl(); //获取当前的url
  console.log(webPageUrl);
  return webPageUrl; //  return  devWebPage;
}

function loadPM_Production_Confirm() {
  let webPage = getReleaseWebPage();
  return render("PM_Production_Confirm", { webPage: webPage })
    .setTitle("保养班组确认 | PM Production Team Confirmation")
    .setFaviconUrl(webIconUrl);
}

// 新增：记录查询页面加载函数
function loadPM_RecordQuery() {
  let webPage = getReleaseWebPage();
  return render("PM_RecordQuery", { webPage: webPage })
    .setTitle("记录查询 | Record Query")
    .setFaviconUrl(webIconUrl);
}

// 新增：三班转保养跟进页面加载函数
function loadPM_ShiftFollowUp() {
  let webPage = getReleaseWebPage();
  return render("PM_ShiftFollowUp", { webPage: webPage })
    .setTitle("三班转保养跟进 | PM Shift Follow-up")
    .setFaviconUrl(webIconUrl);
}

// --- 新增任务编辑页面的加载函数 ---
function loadTaskEdit() {
  let webPage = getReleaseWebPage();
  return render("TaskEdit", { webPage: webPage })
    .setTitle("任务清单编辑 | Task List Edit")
    .setFaviconUrl(webIconUrl);
}

// --- 新增页面加载函数 ---
function loadTaskManagement() {
  let webPage = getReleaseWebPage();
  return render("TaskManagement", { webPage: webPage })
    .setTitle("任务管理 | Task Management")
    .setFaviconUrl(webIconUrl);
}

// --- 新增人员分配页面的加载函数 ---
function loadPersonnelAssignment() {
  let webPage = getReleaseWebPage();
  return render("PersonnelAssignment", { webPage: webPage })
    .setTitle("人员分配 | Personnel Assignment")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Task_new() {
  let webPage = getReleaseWebPage();
  return render("PM_Task_1.0", { webPage: webPage })
    .setTitle("保养任务 | PM Task")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Plan_new(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  let webPage = getReleaseWebPage();
  return render("PM_Plan_1.0", {
    webPage: webPage,
    intoWebID: intoWebLoginId || "",
    intoWebName: intoWebLoginName || "",
    intoWebType: intoWebLoginType || "",
  })
    .setTitle("保养计划 | PM Plan")
    .setFaviconUrl(webIconUrl);
}


// 新增：交接班页面加载函数
function loadHandover_1_0() {
  let webPage = getReleaseWebPage();
  return render("Handover_1.0", { webPage: webPage })
    .setTitle("交接班 | Handover")
    .setFaviconUrl(webIconUrl);
}

function loadFailureReport_Template() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Template", { webPage: webPage })
    .setTitle("故障报告模板 | Failure Report Template")
    .setFaviconUrl(webIconUrl);
}

function loadProjectTracking() {
  let webPage = getReleaseWebPage();
  return render("ProjectTracking", { webPage: webPage })
    .setTitle("项目跟进 | Project Tracking")
    .setFaviconUrl(webIconUrl);
}

function getFailureReportTemplate() {
  try {
    const id = "1Zypt94pPHgD0eEa6QWROKJy_EkLA2eh0eAgISgkJgPY";
    const ss = SpreadsheetApp.openById(id);
    const ws = ss.getSheetByName("FailureReport_Template");
    if (!ws) throw new Error("Sheet FailureReport_Template not found");
    const data = ws.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    return JSON.stringify(rows);
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

function getMachineNumbers() {
  try {
    const ws = SpreadsheetApp.openById('1BeoCokGiWAdkfFTSVOkxNr4Gr9O6FlnwTvnOmLYNY_U').getSheetByName('Database');
    if (!ws) return JSON.stringify([]);
    const lastRow = ws.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    const vals = ws.getRange(2, 1, lastRow - 1, 1).getValues();
    return JSON.stringify(vals.map(r => String(r[0] || '').trim()).filter(Boolean));
  } catch(e) { return JSON.stringify([]); }
}

function getEDSUserNames() {
  try {
    const ws = SpreadsheetApp.openById('1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM').getSheetByName('userID');
    if (!ws) return JSON.stringify([]);
    const vals = ws.getDataRange().getValues();
    const users = [];
    for (let i = 2; i < vals.length; i++) {
      const name  = String(vals[i][1]  || '').trim();
      const email = String(vals[i][9]  || '').trim();
      const colO  = String(vals[i][14] || '').trim();
      const defaultVerifierEmail = String(vals[i][55] || '').trim();
      if (name && colO) {
        users.push({
          display: email ? name + '【' + email + '】' : name,
          email: email,
          defaultVerifierEmail: defaultVerifierEmail,
          process: colO  // O列：工序（IM/TF/PK），用于前端按工序过滤责任人
        });
      }
    }
    return JSON.stringify(users);
  } catch(e) { return JSON.stringify([]); }
}

function getFailureReportInit() {
  const tpl = JSON.parse(getFailureReportTemplate());
  if (tpl.error) return JSON.stringify({ error: tpl.error });
  return JSON.stringify({ template: tpl, users: JSON.parse(getEDSUserNames()) });
}

/**
 * 获取车间和工序选项
 * Get workshop and process options
 * @returns {Object}
 */
function getWorkshopProcessOptions() {
  try {
    const id = "1Zypt94pPHgD0eEa6QWROKJy_EkLA2eh0eAgISgkJgPY";
    const ss = SpreadsheetApp.openById(id);
    const ws = ss.getSheetByName("FailureReport_Template");
    if (!ws) return JSON.stringify({ error: "Sheet not found" });
    
    const data = ws.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    let workshops = [];
    let processes = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fieldId = String(row[0] || '').trim();
      const options = String(row[3] || '').trim();
      
      if (fieldId === 'workshop' && options) {
        workshops = options.includes('|') ? options.split('|') : options.split('/');
        workshops = workshops.map(function(o) { return o.trim(); }).filter(function(o) { return o; });
      }
      if (fieldId === 'process' && options) {
        processes = options.includes('|') ? options.split('|') : options.split('/');
        processes = processes.map(function(o) { return o.trim(); }).filter(function(o) { return o; });
      }
    }
    
    return JSON.stringify({ workshops: workshops, processes: processes });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

function getFailureReportFormData(reportId) {
  try {
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const ws = ss.getSheetByName('Failure_Database');
    if (!ws) throw new Error('Failure_Database sheet not found');
    const values = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][6]).trim() === String(reportId).trim()) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex === -1) throw new Error('未找到故障报告编号 / Report not found: ' + reportId);
    const jsonStr = String(values[rowIndex][10] || '');
    if (!jsonStr || !jsonStr.trim().startsWith('{')) {
      throw new Error('该报告暂无表单数据 / No form data found');
    }
    const formData = JSON.parse(jsonStr);
    // 从 Drive 读取照片文件
    if (formData._photoFileId) {
      try {
        const photoFile = DriveApp.getFileById(formData._photoFileId);
        const photoBytes = photoFile.getBlob().getBytes();
        formData.photo = 'data:image/jpeg;base64,' + Utilities.base64Encode(photoBytes);
      } catch (e) { /* 照片文件不存在则忽略 */ }
    }
    if (!formData.time_used) {
      const repairTime = String(values[rowIndex][13] || '').trim();
      if (repairTime) formData.time_used = repairTime;
    }
    let existingFileUrl = '', existingFileName = '';
    const cellJ = values[rowIndex][9];
    if (cellJ) {
      const match = String(cellJ).match(/HYPERLINK\("([^"]+)","([^"]*)"\)/);
      if (match) { existingFileUrl = match[1]; existingFileName = match[2]; }
    }
    return JSON.stringify({ success: true, formData: formData, existingFileUrl: existingFileUrl, existingFileName: existingFileName });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function submitFailureReport(dataStr) {
  try {
    const data = JSON.parse(dataStr);
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const ws = ss.getSheetByName('Failure_Database');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    if (!ws) throw new Error('Sheet Failure_Database not found');
    if (!wsFollow) throw new Error('Sheet Failure_Report_followup not found');
    const isEditMode = data._editMode === true;
    const values = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][6]).trim() === String(data.case_code).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) throw new Error('未找到故障报告编号 / Report ID not found: ' + data.case_code);
    const machineNo = String(values[rowIndex - 1][1] || '').trim();

    // 当前审核状态（O 列，索引14）：决定走"审核路径"还是"已通过报告的再次编辑"
    const currentReviewStatus = String(values[rowIndex - 1][14] || '').trim();
    // 已落地附件（J 列）：兼容历史迁移前的老报告（空状态+有附件视同已通过）
    const hadAttachment = String(values[rowIndex - 1][9] || '').trim() !== '';
    const approvedStatuses = ['已通过', '审核通过', '已完成'];
    const isApprovedEdit = isEditMode && (approvedStatuses.includes(currentReviewStatus) || (!currentReviewStatus && hadAttachment));

    // 读取旧 JSON 中的 reviewHistory（追加而非覆盖）与暂存 PDF 信息
    let reviewHistory = [];
    let oldPdfUrl = '';
    let oldPdfName = '';
    let oldPhotoId = '';
    try {
      const oldJson = JSON.parse(String(values[rowIndex - 1][10] || '{}'));
      if (Array.isArray(oldJson.reviewHistory)) reviewHistory = oldJson.reviewHistory;
      oldPdfUrl = String(oldJson._pdfUrl || '');
      oldPdfName = String(oldJson._pdfFileName || '');
      oldPhotoId = String(oldJson._photoFileId || '');
    } catch (e) { /* 旧 JSON 不存在/非法则忽略 */ }
    // 已通过报告的 PDF 在 J 列（HYPERLINK），不在 JSON
    if (!oldPdfUrl) {
      const mJ = String(values[rowIndex - 1][9] || '').match(/HYPERLINK\("([^"]+)","([^"]*)"\)/);
      if (mJ) { oldPdfUrl = mJ[1]; oldPdfName = mJ[2]; }
    }

    const dataForSheet = Object.assign({}, data);
    // 照片存为独立 Drive 图片文件，JSON 仅存文件 ID（避免单元格超限）
    if (data.photo) {
      dataForSheet._photoFileId = ''; // 先清空，保存成功后再写入
    }
    delete dataForSheet.fault_category;
    delete dataForSheet.fault_category_text;
    delete dataForSheet._editMode;
    // 移除旧 rca 数组（新报告改用 rca_json）
    if (dataForSheet.rca_json) delete dataForSheet.rca;

    // 删除旧 PDF（编辑/退回重提）并计算版本号
    let pdfVersionSuffix = '';
    if (oldPdfUrl) {
      try {
        const idMatch = oldPdfUrl.match(/\/d\/([^\/]+)/);
        if (idMatch) DriveApp.getFileById(idMatch[1]).setTrashed(true);
      } catch (e) { /* 旧文件不存在则忽略 */ }
      // 删除旧照片文件
      if (oldPhotoId) {
        try { DriveApp.getFileById(oldPhotoId).setTrashed(true); } catch (e) { /* ignore */ }
      }
      const vMatch = String(oldPdfName).match(/_v(\d+)\.pdf$/);
      const newVer = vMatch ? parseInt(vMatch[1]) + 1 : 2;
      pdfVersionSuffix = '_v' + newVer;
    }

    // 生成 PDF（提交时即生成，照片此刻在手）
    // 审核路径下先暂存（URL 记入 JSON，不写 J 列）；已通过再编辑则直接落地 J 列
    const pdfBlob = generateFailureReportPDF_(data);
    const reportNo = String(data.case_code || '').trim();
    const workshop = String(values[rowIndex - 1][4] || '').trim();
    const processFromRow = String(values[rowIndex - 1][5] || '').trim();
    const fileName = reportNo + '_' + workshop + '_' + processFromRow + pdfVersionSuffix + '.pdf';
    pdfBlob.setName(fileName);
    const folder = DriveApp.getFolderById('1mMKiMFOzbpqB_V2iIQcIqF2o4ZyRRcNL');
    const pdfFile = folder.createFile(pdfBlob);
    const fileUrl = pdfFile.getUrl();

    // 保存照片为独立图片文件
    if (data.photo) {
      try {
        const photoBase64 = data.photo.split(',')[1] || data.photo;
        const photoBlob = Utilities.newBlob(Utilities.base64Decode(photoBase64), 'image/jpeg', reportNo + '_photo.jpg');
        const photoFile = folder.createFile(photoBlob);
        dataForSheet._photoFileId = photoFile.getId();
      } catch (e) { console.error('保存照片文件失败:', e); }
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const nowTs = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');

    // 暂存 PDF 信息 + 追加 reviewHistory，写入 K 列
    dataForSheet._pdfUrl = fileUrl;
    dataForSheet._pdfFileName = fileName;
    const responsibleDisplay = String(values[rowIndex - 1][11] || '').trim();
    const operatorName = extractName(responsibleDisplay) || responsibleDisplay || '';
    reviewHistory.push({
      action: isApprovedEdit ? 'edited' : 'submitted',
      timestamp: nowTs,
      operator: operatorName
    });
    dataForSheet.reviewHistory = reviewHistory;
    ws.getRange(rowIndex, 11).setValue(JSON.stringify(dataForSheet));

    // PA 行校验（两条路径都需至少一条完整 PA）
    const requiredPa = ['pa_plan', 'pa_who', 'pa_when', 'pa_verifier', 'pa_verifier_when'];
    const PA_INDEX_COL = 13;
    function isPaRowFilled(row) {
      const missing = requiredPa.filter(function(fid) { return !String((row && row[fid]) || '').trim(); });
      return missing.length < requiredPa.length;
    }
    const filledCount = (data.pa || []).filter(isPaRowFilled).length;
    if (filledCount === 0) {
      throw new Error('请至少完整填写1条预防对策后再提交 / Please complete at least one PA row');
    }

    if (!isApprovedEdit) {
      // ===== 审核路径：新建提交 / 退回重提 =====
      // 仅保存数据 + 置审核状态=主管审核中 + 清空退回原因；不写 J/I 列、不建跟进
      ws.getRange(rowIndex, 15).setValue('主管审核中'); // O: 审核状态
      ws.getRange(rowIndex, 18).setValue('');           // R: 清空退回原因
      // 写入审核人（直线上级）
      const supervisorEmail = getReportSupervisor_(operatorName);
      if (supervisorEmail) {
        const permWs2 = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
        const pv2 = permWs2.getDataRange().getValues();
        let supervisorDisplay = '';
        for (let si = 2; si < pv2.length; si++) {
          if (String(pv2[si][9] || '').trim().toLowerCase() === supervisorEmail.toLowerCase()) {
            supervisorDisplay = String(pv2[si][1] || '').trim() + '【' + supervisorEmail + '】';
            break;
          }
        }
        ws.getRange(rowIndex, 16).setValue(supervisorDisplay || supervisorEmail); // P: 审核人
      }
      try {
        notifyReviewSubmission_(values[rowIndex - 1], processFromRow, responsibleDisplay);
      } catch (mailErr) {
        console.error('提交审核通知邮件失败 / Failed to send review submission notification:', mailErr);
      }
      return JSON.stringify({ success: true, reviewStatus: '主管审核中', fileUrl: fileUrl, fileName: fileName });
    }

    // ===== 已通过报告的再次编辑：保持原有"落地"行为（写 J/I 列 + 同步跟进 + 邮件） =====
    ws.getRange(rowIndex, 10).setFormula('=HYPERLINK("' + fileUrl + '","' + fileName + '")');
    ws.getRange(rowIndex, 9).setValue(nowYmd);
    // 确保 paIndex 列有表头
    const paIndexHeader = wsFollow.getRange(1, PA_INDEX_COL + 1);
    if (!paIndexHeader.getValue()) paIndexHeader.setValue('paIndex');

    const followupRowsForEmail = [];
    // 按 paIndex 精确匹配，同步更新已有跟进记录
    const followData = wsFollow.getDataRange().getValues();
    const existingMap = {};
    const compatIndices = [];

    for (let i = 1; i < followData.length; i++) {
      if (String(followData[i][1]).trim() === String(data.case_code).trim()) {
        const storedIdx = followData[i][PA_INDEX_COL];
        if (storedIdx !== undefined && String(storedIdx).trim() !== '') {
          existingMap[parseInt(storedIdx)] = { rowIndex: i + 1, data: followData[i] };
        } else {
          compatIndices.push({ rowIndex: i + 1, data: followData[i] });
        }
      }
    }
    let compatCursor = 0;
    compatIndices.forEach(function(item) {
      while (existingMap[compatCursor] !== undefined) compatCursor++;
      existingMap[compatCursor] = item;
      compatCursor++;
    });

    const usedExisting = new Set();
    (data.pa || []).forEach(function(row, paIdx) {
      if (!isPaRowFilled(row)) return;

      const followId = 'FU' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmssSSS') + Math.floor(100 + Math.random() * 900);
      const newRow = [
        followId,
        String(data.case_code || '').trim(),
        String((row && row.type) || '').trim(),
        String((row && row.pa_plan) || '').trim(),
        String((row && row.pa_who) || '').trim(),
        String((row && row.pa_when) || '').trim(),
        String((row && row.pa_verifier) || '').trim(),
        String((row && row.pa_verifier_when) || '').trim(),
        '待验证',
        nowYmd,
        nowYmd,
        fileUrl,
        paIdx,
        ''
      ];

      if (existingMap[paIdx] !== undefined) {
        const existing = existingMap[paIdx].data;
        newRow[8] = String(existing[8] || '待验证').trim();
        newRow[9] = String(existing[9] || nowYmd).trim();
        newRow[10] = nowYmd;
        usedExisting.add(paIdx);
        wsFollow.getRange(existingMap[paIdx].rowIndex, 1, 1, newRow.length).setValues([newRow]);
      } else {
        wsFollow.getRange(wsFollow.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
      }
      followupRowsForEmail.push(newRow);
    });

    const existingIndices = Object.keys(existingMap).map(Number);
    const toDelete = existingIndices
      .filter(function(idx) { return !usedExisting.has(idx); })
      .map(function(idx) { return existingMap[idx].rowIndex; })
      .sort(function(a, b) { return b - a; });
    toDelete.forEach(function(rowIdx) { wsFollow.deleteRow(rowIdx); });

    if (followupRowsForEmail.length > 0) {
      try {
        sendFollowupCreationReminderEmails({ failureReportNo: reportNo, machineNo: machineNo }, followupRowsForEmail);
      } catch (emailErr) {
        console.error('提交后发送跟进提醒失败 / Failed to send follow-up reminder after submission:', emailErr);
      }
    }

    return JSON.stringify({ success: true, fileUrl: fileUrl, fileName: fileName });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

// ============================================================
// 故障报告主管审核（Supervisor Review）
// ============================================================

const FR_SS_ID = '1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU';
const FR_SYSTEM_ADMIN_EMAIL = 'kelland_zhao@colpal.com';

/** 工序代码归一：IM/INJ→INJ，PK/PKG→PK，TF→TF */
function normalizeProcessCanonical_(p) {
  const s = String(p || '').trim().toUpperCase();
  if (s === 'IM' || s === 'INJ') return 'INJ';
  if (s === 'PK' || s === 'PKG') return 'PK';
  if (s === 'TF') return 'TF';
  return s;
}

/** 单元格日期 → yyyy-MM-dd 字符串 */
function formatCellDate_(val) {
  if (!val) return '';
  try {
    var d = new Date(val);
    if (!isNaN(d.getTime())) {
      var tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong';
      return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    }
  } catch (e) {}
  return String(val);
}

/** 按工序查管理员（O列==工序归一 且 BF列(57)==Y）；零个则回退系统管理员 */
function getReportProcessAdmins_(processRaw) {
  const target = normalizeProcessCanonical_(processRaw);
  const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
  const emails = [], names = [];
  if (ws) {
    const v = ws.getDataRange().getValues();
    for (let i = 2; i < v.length; i++) {
      if (String(v[i][57] || '').trim() === 'Y' && normalizeProcessCanonical_(v[i][14]) === target) {
        const em = String(v[i][9] || '').trim();
        if (em) { emails.push(em); names.push(String(v[i][1] || '').trim()); }
      }
    }
  }
  if (emails.length === 0) {
    console.warn('工序 ' + target + ' 未配置故障报告管理员（BF列），回退系统管理员');
    return { emails: [FR_SYSTEM_ADMIN_EMAIL], names: ['系统管理员 / System Admin'], fallback: true };
  }
  return { emails: emails, names: names, fallback: false };
}

/** 查责任人直线上级邮箱（userID NAME==respName → BI列(60)） */
function getReportSupervisor_(respName) {
  if (!respName) return '';
  const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
  if (!ws) return '';
  const v = ws.getDataRange().getValues();
  for (let i = 2; i < v.length; i++) {
    if (String(v[i][1] || '').trim() === String(respName).trim()) {
      return String(v[i][60] || '').trim();
    }
  }
  return '';
}

/**
 * 审核页门控：管理员(BF=Y) OR 主管(邮箱出现在任一 BI 列)
 * 登录只存 Name 不存 Email，故先按 Name 反查用户邮箱(J列)，再用该邮箱匹配 BI。
 * @returns {Object} { hasPermission, isAdmin, adminProcess, isSupervisor, resolvedEmail }
 */
function checkReportReviewPermission(userEmail, userName) {
  const res = { hasPermission: false, isAdmin: false, adminProcess: '', isSupervisor: false, resolvedEmail: '' };
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return res;
    const v = ws.getDataRange().getValues();
    const emailLower = String(userEmail || '').trim().toLowerCase();
    const nameTrim = String(userName || '').trim();
    // Pass 1：定位用户本人行 → 解析邮箱 + 判定管理员
    let myEmail = emailLower;
    for (let i = 2; i < v.length; i++) {
      const rowName = String(v[i][1] || '').trim();
      const rowEmail = String(v[i][9] || '').trim().toLowerCase();
      const matchUser = (emailLower && rowEmail === emailLower) || (nameTrim && rowName === nameTrim);
      if (!matchUser) continue;
      if (!myEmail) myEmail = rowEmail;
      if (String(v[i][57] || '').trim() === 'Y') {
        res.isAdmin = true;
        res.adminProcess = normalizeProcessCanonical_(v[i][14]);
      }
    }
    res.resolvedEmail = myEmail || '';
    // Pass 2：主管 = 用户邮箱出现在任一行 BI 列
    if (myEmail) {
      for (let i = 2; i < v.length; i++) {
        if (String(v[i][60] || '').trim().toLowerCase() === myEmail) { res.isSupervisor = true; break; }
      }
    }
    res.hasPermission = res.isAdmin || res.isSupervisor;
  } catch (e) {
    console.error('checkReportReviewPermission error:', e);
  }
  return res;
}

/**
 * 待审报告列表：管理员看本工序、主管看下属，两者并集去重
 * @returns {string} JSON
 */
function getPendingReviewReports(userEmail, userName) {
  try {
    const perm = checkReportReviewPermission(userEmail, userName);
    if (!perm.hasPermission) {
      return JSON.stringify({ success: true, hasPermission: false, reports: [] });
    }
    // 主管的下属姓名集合（BI==当前邮箱 → 该行 NAME）
    const subordinateNames = {};
    const emailLower = String(perm.resolvedEmail || userEmail || '').trim().toLowerCase();
    if (perm.isSupervisor) {
      const permWs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
      if (permWs) {
        const pv = permWs.getDataRange().getValues();
        for (let i = 2; i < pv.length; i++) {
          if (String(pv[i][60] || '').trim().toLowerCase() === emailLower) {
            const nm = String(pv[i][1] || '').trim();
            if (nm) subordinateNames[nm] = true;
          }
        }
      }
    }
    const ws = SpreadsheetApp.openById(FR_SS_ID).getSheetByName('Failure_Database');
    const data = ws.getDataRange().getValues();
    const reports = [];
    for (let i = 1; i < data.length; i++) {
      const status = String(data[i][14] || '').trim();
      if (status !== '主管审核中' && status !== '已退回') continue;
      const reportProcess = String(data[i][5] || '').trim();
      const respDisplay = String(data[i][11] || '').trim();
      const respName = extractName(respDisplay);
      let include = false;
      if (perm.isAdmin) include = true;
      if (!include && perm.isSupervisor && respName && subordinateNames[respName]) include = true;
      if (!include) continue;
      reports.push({
        failureReportNumber: String(data[i][6] || '').trim(),
        machineNo: String(data[i][1] || '').trim(),
        problemDescription: String(data[i][2] || '').trim(),
        process: reportProcess,
        responsiblePerson: respDisplay,
        submitDate: formatCellDate_(data[i][3]),
        reviewStatus: status,
        reviewer: String(data[i][15] || '').trim(),
        returnReason: String(data[i][17] || '').trim(),
        content: String(data[i][10] || '')
      });
    }
    return JSON.stringify({ success: true, hasPermission: true, isAdmin: perm.isAdmin, isSupervisor: perm.isSupervisor, reports: reports });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * 审核通过：落地暂存 PDF（写 J/I）+ 创建 PA 跟进 + 置已通过；可重入幂等
 */
function approveReport(reportNo, reviewerEmail, reviewerName) {
  try {
    const ss = SpreadsheetApp.openById(FR_SS_ID);
    const ws = ss.getSheetByName('Failure_Database');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    const data = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === String(reportNo).trim()) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return JSON.stringify({ success: false, message: '未找到报告 / Report not found' });
    // 并发校验
    const status = String(data[rowIndex - 1][14] || '').trim();
    if (status !== '主管审核中') {
      return JSON.stringify({ success: false, message: '该报告已被处理（当前：' + (status || '空') + '）/ Already processed' });
    }
    // 审核人邮箱缺失时按姓名反查
    if (!String(reviewerEmail || '').trim()) {
      reviewerEmail = checkReportReviewPermission(reviewerEmail, reviewerName).resolvedEmail || '';
    }
    let json;
    try { json = JSON.parse(String(data[rowIndex - 1][10] || '{}')); } catch (e) { json = {}; }
    const fileUrl = String(json._pdfUrl || '');
    const fileName = String(json._pdfFileName || (reportNo + '.pdf'));
    if (!fileUrl) {
      return JSON.stringify({ success: false, message: '缺少暂存 PDF，请责任人重新提交 / Staged PDF missing' });
    }
    const tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const nowTs = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');

    // 幂等：先删除本报告已有跟进（防重试重复），再重建
    const followAll = wsFollow.getDataRange().getValues();
    const delRows = [];
    for (let i = 1; i < followAll.length; i++) {
      if (String(followAll[i][1]).trim() === String(reportNo).trim()) delRows.push(i + 1);
    }
    delRows.sort(function(a, b) { return b - a; }).forEach(function(r) { wsFollow.deleteRow(r); });

    // 落地附件(J)+上传日期(I)
    ws.getRange(rowIndex, 10).setFormula('=HYPERLINK("' + fileUrl + '","' + fileName + '")');
    ws.getRange(rowIndex, 9).setValue(nowYmd);

    // 创建 PA 跟进
    const requiredPa = ['pa_plan', 'pa_who', 'pa_when', 'pa_verifier', 'pa_verifier_when'];
    const PA_INDEX_COL = 13;
    const paIndexHeader = wsFollow.getRange(1, PA_INDEX_COL + 1);
    if (!paIndexHeader.getValue()) paIndexHeader.setValue('paIndex');
    const followRows = [];
    (json.pa || []).forEach(function(row, paIdx) {
      const missing = requiredPa.filter(function(fid) { return !String((row && row[fid]) || '').trim(); });
      if (missing.length === requiredPa.length) return;
      const followId = 'FU' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmssSSS') + Math.floor(100 + Math.random() * 900);
      followRows.push([
        followId, String(reportNo).trim(), String((row && row.type) || '').trim(),
        String((row && row.pa_plan) || '').trim(), String((row && row.pa_who) || '').trim(),
        String((row && row.pa_when) || '').trim(), String((row && row.pa_verifier) || '').trim(),
        String((row && row.pa_verifier_when) || '').trim(), '待验证', nowYmd, nowYmd, fileUrl, paIdx, ''
      ]);
    });
    if (followRows.length > 0) {
      wsFollow.getRange(wsFollow.getLastRow() + 1, 1, followRows.length, followRows[0].length).setValues(followRows);
    }

    // 审核状态/审核人/审核日期 + reviewHistory
    // 无限进项→已完成，有跟进项→审核通过
    ws.getRange(rowIndex, 15).setValue(followRows.length > 0 ? '审核通过' : '已完成');
    ws.getRange(rowIndex, 16).setValue(String(reviewerName || '') + '【' + String(reviewerEmail || '') + '】');
    ws.getRange(rowIndex, 17).setValue(nowYmd);
    json.reviewHistory = Array.isArray(json.reviewHistory) ? json.reviewHistory : [];
    json.reviewHistory.push({ action: 'approved', timestamp: nowTs, operator: String(reviewerName || '') });
    ws.getRange(rowIndex, 11).setValue(JSON.stringify(json));

    // 通知 PA 责任人（复用现有跟进创建提醒）
    if (followRows.length > 0) {
      try {
        sendFollowupCreationReminderEmails(
          { failureReportNo: String(reportNo).trim(), machineNo: String(data[rowIndex - 1][1] || '').trim() },
          followRows
        );
      } catch (mailErr) {
        console.error('审核通过通知邮件失败:', mailErr);
      }
    }
    return JSON.stringify({ success: true, message: '审核通过 / Approved' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * 审核退回：置已退回 + 写退回原因 + 通知责任人（抄送主管）
 */
function returnReport(reportNo, reviewerEmail, reviewerName, reason) {
  try {
    const ss = SpreadsheetApp.openById(FR_SS_ID);
    const ws = ss.getSheetByName('Failure_Database');
    const data = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === String(reportNo).trim()) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return JSON.stringify({ success: false, message: '未找到报告 / Report not found' });
    const status = String(data[rowIndex - 1][14] || '').trim();
    if (status !== '主管审核中') {
      return JSON.stringify({ success: false, message: '该报告已被处理（当前：' + (status || '空') + '）/ Already processed' });
    }
    if (!String(reviewerEmail || '').trim()) {
      reviewerEmail = checkReportReviewPermission(reviewerEmail, reviewerName).resolvedEmail || '';
    }
    const tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const nowTs = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
    const reasonStr = String(reason || '').trim();

    ws.getRange(rowIndex, 15).setValue('已退回');
    ws.getRange(rowIndex, 16).setValue(String(reviewerName || '') + '【' + String(reviewerEmail || '') + '】');
    ws.getRange(rowIndex, 17).setValue(nowYmd);
    ws.getRange(rowIndex, 18).setValue(reasonStr);

    let json;
    try { json = JSON.parse(String(data[rowIndex - 1][10] || '{}')); } catch (e) { json = {}; }
    json.reviewHistory = Array.isArray(json.reviewHistory) ? json.reviewHistory : [];
    json.reviewHistory.push({ action: 'returned', timestamp: nowTs, operator: String(reviewerName || ''), reason: reasonStr });
    ws.getRange(rowIndex, 11).setValue(JSON.stringify(json));

    try { notifyReturn_(data[rowIndex - 1], reasonStr); }
    catch (mailErr) { console.error('退回通知邮件失败:', mailErr); }

    return JSON.stringify({ success: true, message: '已退回 / Returned' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/** 通用故障报告邮件 HTML（红色表头风格，与现有系统一致） */
function buildFrEmailHtml_(title, subtitle, intro, rows) {
  var body = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
    + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);overflow:hidden;">'
    + '<div style="background-color:#E60012;color:white;padding:20px;text-align:center;">'
    + '<h1 style="margin:0;font-size:22px;">' + escapeHtml(title) + '</h1>'
    + '<p style="margin:8px 0 0;font-size:14px;opacity:0.9;">' + escapeHtml(subtitle) + '</p>'
    + '</div><div style="padding:30px;">'
    + '<p style="font-size:15px;line-height:1.6;color:#333;">' + escapeHtml(intro) + '</p>'
    + '<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
    + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
    + '<th style="padding:10px 12px;text-align:left;width:30%;">项目 / Item</th>'
    + '<th style="padding:10px 12px;text-align:left;">详情 / Details</th></tr></thead><tbody>';
  (rows || []).forEach(function(r) {
    body += '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">' + r[0] + '</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(String(r[1] || '')) + '</td></tr>';
  });
  body += '</tbody></table>'
    + '<p style="font-size:13px;color:#888;font-style:italic;">此邮件由 EDS 系统自动发送 / This email is auto-generated by EDS system.</p>'
    + '</div></div></div>';
  return body;
}

/** 提交审核通知：有主管→通知主管(抄送责任人)；无主管→通知工序管理员 */
function notifyReviewSubmission_(rowData, process, responsibleDisplay) {
  const respName = extractName(responsibleDisplay);
  const respEmail = extractEmail(responsibleDisplay);
  const supervisorEmail = getReportSupervisor_(respName);
  const reportNo = String(rowData[6] || '');
  const machineNo = String(rowData[1] || '');
  const problem = String(rowData[2] || '');
  const workshop = String(rowData[4] || '');
  const submitDate = formatCellDate_(rowData[3]);

  let toEmail, subject, intro, ccEmail;
  if (supervisorEmail) {
    toEmail = supervisorEmail;
    ccEmail = respEmail || undefined;
    subject = '【故障报告主管审核中】' + reportNo;
    intro = '以下故障报告已提交，等待您审核（请登录 EDS 系统进入「故障报告审核」处理）：';
  } else {
    const admins = getReportProcessAdmins_(process);
    toEmail = admins.emails.join(',');
    ccEmail = undefined;
    subject = '【责任人无直线上级】' + reportNo;
    intro = '以下故障报告的责任人未配置直线上级，请作为工序管理员登录 EDS 系统处理审核：';
  }
  const rows = [
    ['故障报告编号<br>Failure Report No.', reportNo],
    ['车间 / Workshop', workshop],
    ['工序 / Process', String(process || '')],
    ['机台号 / Machine No.', machineNo],
    ['责任人 / Responsible', respName],
    ['提交日期 / Submit Date', submitDate],
    ['问题描述<br>Problem Description', problem]
  ];
  const html = buildFrEmailHtml_('故障报告主管审核', 'Report Pending Supervisor Review', intro, rows);
  GmailApp.sendEmail(toEmail, subject, '', { htmlBody: html, cc: ccEmail });
}

/** 退回通知：通知责任人(抄送主管) */
function notifyReturn_(rowData, reason) {
  const responsibleDisplay = String(rowData[11] || '').trim();
  const respName = extractName(responsibleDisplay);
  const respEmail = extractEmail(responsibleDisplay);
  if (!respEmail) return;
  const supervisorEmail = getReportSupervisor_(respName);
  const reportNo = String(rowData[6] || '');
  const machineNo = String(rowData[1] || '');
  const rows = [
    ['故障报告编号<br>Failure Report No.', reportNo],
    ['机台号 / Machine No.', machineNo],
    ['退回原因<br>Return Reason', reason || '（未填写 / not specified）']
  ];
  const html = buildFrEmailHtml_('故障报告审核未通过', 'Report Returned for Revision',
    '您的故障报告未通过主管审核，请登录 EDS 系统进入「故障报告上传」修改后重新提交：', rows);
  GmailApp.sendEmail(respEmail, '【故障报告审核未通过】' + reportNo, '', { htmlBody: html, cc: supervisorEmail || undefined });
}

/**
 * 一次性：新增 Failure_Database O-R 表头 + 历史数据迁移
 * 有附件(J列非空)且无审核状态的报告 → 已通过、审核日期=上传日期、审核人=责任人
 * 在 GAS 编辑器手动运行一次
 */
function setupFailureReviewColumns() {
  try {
    const ws = SpreadsheetApp.openById(FR_SS_ID).getSheetByName('Failure_Database');
    if (!ws) return 'Failure_Database not found';
    ws.getRange(1, 15, 1, 4).setValues([[
      '审核状态 / Review Status', '审核人 / Reviewed By', '审核日期 / Review Date', '退回原因 / Return Reason'
    ]]);
    const data = ws.getDataRange().getValues();
    let migrated = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][14] || '').trim()) continue;               // 已有状态则跳过
      if (String(data[i][9] || '').trim() === '') continue;         // 无附件=未提交，跳过
      const uploadDate = data[i][8] ? formatCellDate_(data[i][8]) : '';
      ws.getRange(i + 1, 15).setValue('已通过');
      ws.getRange(i + 1, 16).setValue(String(data[i][11] || '').trim()); // 审核人=责任人兜底
      ws.getRange(i + 1, 17).setValue(uploadDate);
      migrated++;
    }
    return '完成：O-R 表头已写入，历史迁移 ' + migrated + ' 条 / Done. Headers set, migrated ' + migrated + ' rows.';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

function generateFailureReportPDF_(data) {
  const html = buildReportHtml_(data);
  return htmlToPdf_(html, 'TMP_FR_' + data.case_code);
}

function htmlToPdf_(htmlContent, tmpName) {
  const token = ScriptApp.getOAuthToken();
  const boundary = 'fr_boundary_' + new Date().getTime();
  const nl = '\r\n';
  const metadata = JSON.stringify({ name: tmpName, mimeType: 'application/vnd.google-apps.document' });
  const body = '--' + boundary + nl +
    'Content-Type: application/json; charset=UTF-8' + nl + nl +
    metadata + nl +
    '--' + boundary + nl +
    'Content-Type: text/html; charset=UTF-8' + nl + nl +
    htmlContent + nl +
    '--' + boundary + '--';
  const resp = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      payload: Utilities.newBlob(body).getBytes(),
      muteHttpExceptions: true
    }
  );
  const fileId = JSON.parse(resp.getContentText()).id;
  if (!fileId) throw new Error('HTML转PDF失败: ' + resp.getContentText());
  Utilities.sleep(1500);
  const pdf = DriveApp.getFileById(fileId).getAs(MimeType.PDF);
  DriveApp.getFileById(fileId).setTrashed(true);
  return pdf;
}

function buildReportHtml_(data) {
  const e = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  const th = 'background-color:#E60012;color:#fff;border:1px solid #222;padding:4px 6px;text-align:center;font-size:9pt;font-weight:bold;';
  const td = 'border:1px solid #222;padding:5px 7px;font-size:9pt;vertical-align:top;';
  const sec = 'color:#000;font-weight:bold;font-size:12pt;margin:16px 0 6px 0;';
  const fl = 'font-weight:bold;font-size:8pt;color:#222;margin-bottom:3px;';
  const fv = 'font-size:10pt;color:#222;min-height:14px;';

  const displayNameOnly = function(v) {
    return String(v || '').replace(/\s*【[^】]*】\s*$/, '').trim();
  };

  const formatDateYMD = function(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) {
      const mm = ('0' + m[2]).slice(-2);
      const dd = ('0' + m[3]).slice(-2);
      return m[1] + '-' + mm + '-' + dd;
    }
    return s;
  };

  function field(label, val, cs) {
    const colspan = cs ? ' colspan="' + cs + '"' : '';
    return '<td' + colspan + ' style="' + td + '"><div style="' + fl + '">' + label + '</div><div style="' + fv + '">' + e(val) + '&nbsp;</div></td>';
  }

  let actionRows = '';
  (data.actions || []).forEach(function(a, i) {
    actionRows += '<tr>' +
      '<td style="' + td + 'text-align:center">' + (i+1) + '</td>' +
      '<td style="' + td + '">' + e(a.proc) + '&nbsp;</td>' +
      '<td style="' + td + 'text-align:center">' + e(displayNameOnly(a.who)) + '&nbsp;</td>' +
      '<td style="' + td + 'text-align:center">' + e(formatDateYMD(a.date)) + '&nbsp;</td>' +
      '<td style="' + td + 'text-align:center">' + e(a.time) + '&nbsp;</td>' +
      '<td style="' + td + 'text-align:center">' + e(a.result) + '&nbsp;</td>' +
      '</tr>';
  });

  // RCA：优先使用 rca_json (新格式动态列)，回退到旧 rca 数组
  let rcaHeaderRow = '';
  let rcaBodyRows = '';
  let rcaFooterRow = '';
  let rcaColCount = 0;
  let parsedRca = null;
  if (data.rca_json) {
    try { parsedRca = typeof data.rca_json === 'string' ? JSON.parse(data.rca_json) : data.rca_json; } catch (err) {}
  }
  if (parsedRca && Array.isArray(parsedRca.columns) && parsedRca.columns.length > 0) {
    const cols = parsedRca.columns;
    rcaColCount = cols.length;
    // 计算同类型显示序号
    const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    const seen = {};
    rcaHeaderRow = '<th style="' + th + 'width:55px">层<br>Level</th>';
    cols.forEach(function(col) {
      seen[col.type] = (seen[col.type] || 0) + 1;
      const idx = seen[col.type];
      const enLabel = col.type === '管理系统' ? 'Management System' : 'Technical System';
      rcaHeaderRow += '<th style="' + th + '">' + e(col.type) + (circled[idx - 1] || '(' + idx + ')') + '<br>' + enLabel + '</th>';
    });
    const rows = parsedRca.rows || [];
    for (let r = 0; r < 5; r++) {
      rcaBodyRows += '<tr><td style="' + td + 'text-align:center;font-weight:bold">Why' + (r+1) + '</td>';
      for (let c = 0; c < cols.length; c++) {
        const val = (rows[r] && rows[r][c]) || '';
        rcaBodyRows += '<td style="' + td + '">' + e(val) + '&nbsp;</td>';
      }
      rcaBodyRows += '</tr>';
    }
    rcaFooterRow = '<tr><td style="' + td + 'text-align:center;font-weight:bold">根本原因<br>Root Cause</td>';
    cols.forEach(function(col) {
      rcaFooterRow += '<td style="' + td + 'text-align:center">' + e(col.rootCause || '') + '&nbsp;</td>';
    });
    rcaFooterRow += '</tr>';
  } else {
    // 旧格式回退
    rcaHeaderRow = '<th style="' + th + 'width:55px">层<br>Level</th>'
      + '<th style="' + th + '">描述 (Description)</th>'
      + '<th style="' + th + '">原因分析 (Cause)</th>'
      + '<th style="' + th + '">行动 (Action)</th>';
    rcaColCount = 3;
    (data.rca || []).forEach(function(r, i) {
      rcaBodyRows += '<tr>' +
        '<td style="' + td + 'text-align:center;font-weight:bold">Why' + (i+1) + '</td>' +
        '<td style="' + td + '">' + e(r.desc) + '&nbsp;</td>' +
        '<td style="' + td + '">' + e(r.cause) + '&nbsp;</td>' +
        '<td style="' + td + '">' + e(r.action) + '&nbsp;</td>' +
        '</tr>';
    });
  }

  // \u6784\u5efa RCA \u5217 ID \u2192 \u663e\u793a\u6807\u7b7e \u6620\u5c04\uff08\u7528\u4e8e CAPA \u95ee\u9898\u6839\u56e0\u5217\uff09
  const rcaIdToLabel = {};
  if (parsedRca && Array.isArray(parsedRca.columns)) {
    const circled2 = ['\u2460','\u2461','\u2462','\u2463','\u2464','\u2465','\u2466','\u2467','\u2468','\u2469'];
    const seen2 = {};
    parsedRca.columns.forEach(function(col) {
      seen2[col.type] = (seen2[col.type] || 0) + 1;
      const lbl = col.type + (circled2[seen2[col.type] - 1] || '(' + seen2[col.type] + ')') + (col.rootCause ? ' - ' + col.rootCause : '');
      rcaIdToLabel[col.id] = lbl;
    });
  }

  let paHeader = '<tr><th style="' + th + 'width:110px">\u7c7b\u578b<br>Type</th>'
    + '<th style="' + th + 'width:140px">\u95ee\u9898\u6839\u56e0<br>Problem Root Cause</th>';
  (data.pa_fields || []).forEach(function(f) {
    paHeader += '<th style="' + th + '">' + e(f.cn) + '<br>' + e(f.en) + '</th>';
  });
  paHeader += '</tr>';
  let paRows = '';
  (data.pa || []).forEach(function(p) {
    const rootCauseLabel = p.problem_root_cause ? (rcaIdToLabel[p.problem_root_cause] || p.problem_root_cause) : '';
    let cells = '<td style="' + td + 'font-weight:bold">' + e(p.type) + '</td>'
      + '<td style="' + td + '">' + e(rootCauseLabel) + '&nbsp;</td>';
    (data.pa_fields || []).forEach(function(f) {
      let v = p[f.id];
      if (/who|verifier/i.test(String(f.id || ''))) v = displayNameOnly(v);
      if (/date|when/i.test(String(f.id || ''))) v = formatDateYMD(v);
      cells += '<td style="' + td + '">' + e(v) + '&nbsp;</td>';
    });
    paRows += '<tr>' + cells + '</tr>';
  });

  const photoContent = data.photo
    ? '<img src="' + data.photo + '" width="160" height="120" style="display:block;width:160px;height:120px;object-fit:contain;">'
    : '<div style="width:160px;height:120px;border:1px dashed #aaa;text-align:center;padding-top:48px;color:#bbb;font-size:9pt;box-sizing:border-box;">[ 图片 / Photo ]</div>';
  const photoBox = '<div style="' + fl + '">故障设备图片 Equipment Photo</div>' + photoContent;

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;margin:24px;color:#222">' +
    '<div style="text-align:center;font-size:16pt;font-weight:bold;margin-bottom:2px">Breakdown Analysis</div>' +
    '<div style="text-align:center;font-size:11pt;margin-bottom:2px">设备故障分析</div>' +
    '<div style="text-align:right;font-size:9pt;color:#666;margin-bottom:10px">EQU-R-MAC-042-00</div>' +

    '<div style="' + sec + '">基本信息 / Basic Information</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    field('设备AEM# Equip. AEM#', data.aem_no) +
    field('目前状况 Present Status', data.present_status) +
    field('存档编号 Case Code', data.case_code) +
    '</tr><tr>' +
    field('分析人员 Analysis Person', data.analyst, '2') +
    field('故障时长 MDT', data.time_used) +
    '</tr></table>' +

    '<div style="' + sec + '">维修前故障现象描述 / Original Description of Problem Phenomena</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    '<td style="' + td + 'width:28%;vertical-align:top" rowspan="4">' + photoBox + '</td>' +
    field('What 产品/材料 What Product/Material', data.what) +
    field('When 班次/时间 When Shift/Time', formatDateYMD(data.when)) +
    '</tr><tr>' +
    field('Where 部位/源头 Where Location/Source', data.where) +
    field('Who 人员技能 Who Personnel/Skill', displayNameOnly(data.pdesc_who)) +
    '</tr><tr>' +
    '<td colspan="2" style="' + td + '"><div style="' + fl + '">故障描述 Trouble Description</div>' +
    '<div style="' + fv + 'min-height:50px">' + e(data.trouble_desc) + '&nbsp;</div></td>' +
    '</tr></table>' +

    '<div style="' + sec + '">行动措施描述 / Description of Action &amp; Remedy</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:6px">' +
    '<tr><th style="' + th + 'width:30px">序号<br>NO.</th><th style="' + th + '">维修过程描述 / Description of Maintenance Process</th>' +
    '<th style="' + th + 'width:70px">责任人<br>Who</th><th style="' + th + 'width:85px">日期<br>Date</th>' +
    '<th style="' + th + 'width:55px">时间<br>(min)</th><th style="' + th + 'width:45px">结果<br>Y/N</th></tr>' +
    actionRows + '</table>' +

    '<div style="' + sec + '">根本原因分析 / RCA Analysis</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">' +
    '<tr>' + rcaHeaderRow + '</tr>' +
    rcaBodyRows +
    rcaFooterRow +
    '</table>' +

    '<div style="' + sec + '">纠正预防措施 / Corrective &amp; Preventive Action</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">' +
    paHeader + paRows + '</table>' +
    '</body></html>';
}

// 新增：故障记录页面加载函数
function loadFault_Record_1_0() {
  let webPage = getReleaseWebPage();
  return render("Fault_Record_1.0", { webPage: webPage })
    .setTitle("故障记录 | Fault Record")
    .setFaviconUrl(webIconUrl);
}

function loadhome_new() {
  let webPage = getReleaseWebPage();
  return render("home_new_1.0", { webPage: webPage })
    .setTitle("EDS 登录 | EDS Login")
    .setFaviconUrl(webIconUrl);
}

function loadNavigation() {
  let webPage = getReleaseWebPage();
  return render("Navigation", { webPage: webPage })
    .setTitle("导航 | Navigation")
    .setFaviconUrl(webIconUrl);
}

function loadINJSDMSummary() {
  let webPage = getReleaseWebPage();
  return render("INJ_SDM_Summary", { webPage: webPage })
    .setTitle("INJ SDM 问题汇总 | INJ SDM Issue Summary")
    .setFaviconUrl(webIconUrl);
}

// 任务安排模块 load 函数 / Task Arrangement load functions
function loadEDSTodayDashboard(webPage, id, name, process) {
  let pageUrl = webPage || getReleaseWebPage();
  return render("EDS_TodayDashboard", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("今日工作台 | Today's Dashboard")
    .setFaviconUrl(webIconUrl);
}

function loadEDSResourceGantt(webPage, id, name, process) {
  let pageUrl = webPage || getReleaseWebPage();
  return render("EDS_ResourceGantt", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("任务规划 | Resource Gantt")
    .setFaviconUrl(webIconUrl);
}

function loadEDSTaskList(webPage, id, name, process) {
  let pageUrl = webPage || getReleaseWebPage();
  return render("EDS_TaskList", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("任务列表 | Task List")
    .setFaviconUrl(webIconUrl);
}

function loadEDSMyTasks(webPage, id, name, process) {
  let pageUrl = webPage || getReleaseWebPage();
  return render("EDS_MyTasks", {
    webPage: pageUrl,
    intoWebID: id || "",
    intoWebName: name || "",
    intoWebType: process || ""
  })
    .setTitle("我的任务 | My Tasks")
    .setFaviconUrl(webIconUrl);
}

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

// 新增的模面清理页面的加载函数
function loadMoldSurfaceClean() {
  let webPage = getReleaseWebPage();
  return render("MoldSurfaceClean", { webPage: webPage })
    .setTitle("模面清理 | Mold Surface Clean")
    .setFaviconUrl(webIconUrl);
}


// 新增：故障报告上传页面加载函数
function loadFailureReport_Upload() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Upload", { webPage: webPage })
    .setTitle("故障报告上传 | Upload Failure Report")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告管理页面加载函数
function loadFailureReport_Manage() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Manage", { webPage: webPage })
    .setTitle("故障报告管理 | Failure Report Management")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告进度页面加载函数
function loadFailureReport_Progress() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Progress", { webPage: webPage })
    .setTitle("故障报告进度 | Failure Report Progress")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告审核页面加载函数
function loadFailureReport_Review() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Review", { webPage: webPage })
    .setTitle("故障报告审核 | Failure Report Review")
    .setFaviconUrl(webIconUrl);
}

function loadViewHistory() {
  let webPage = getReleaseWebPage();
  return render("ViewHistory", { webPage: webPage })
    .setTitle("查询数据 | Data Query")
    .setFaviconUrl(webIconUrl);
}

function loadInspection2_0(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  let webPage = getReleaseWebPage();
  return render("Inspection2.0", {
    webPage: webPage,
    intoWebName: intoWebLoginName,
    intoWebID: intoWebLoginId,
    intoWebType: intoWebLoginType,
  })
    .setTitle("点检2.0 | Inspection 2.0")
    .setFaviconUrl(webIconUrl);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*============记录用户登录日志============*/
function writeUserLogInformation(sapId, name) {
  let now = new Date();
  let nowDateTime = Utilities.formatDate(
    now,
    "Asia/Shanghai",
    "yyyy-MM-dd HH:mm:ss"
  );
  let gmail = Session.getActiveUser().getEmail();
  let arrUserLogInformation = [sapId, name, gmail, "N", "EDS", nowDateTime];
  let sabiUserLogInformation = SpreadsheetApp.openById(userLogInformationId);
  let sbnLog = sabiUserLogInformation.getSheetByName("Log");
  sbnLog.appendRow(arrUserLogInformation);
}

function IdCheck(id) {
  var saasId = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
  var ss = SpreadsheetApp.openById(saasId);
  var ws = ss.getSheetByName("userID");
  var data = ws
    .getRange(3, 1, ws.getLastRow() - 2, ws.getLastColumn())
    .getValues();
  var idList = data.map(function (r) {
    return r[0].toString();
  });
  var pdList = data.map(function (r) {
    return r[2];
  });
  var position = idList.indexOf(id);
  return pdList[position];
}

function getUseID() {
  var saasId = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
  var ss = SpreadsheetApp.openById(saasId);
  var ws = ss.getSheetByName("userID");
  // var data = ws.getRange(3, 1, ws.getLastRow() - 2, 6).getDisplayValues();
  var data = ws.getRange(3, 1, ws.getLastRow() - 2, 16).getValues();
  console.log(data);
  return data;
}

function getWorkcenterinfo() {
  var ss = SpreadsheetApp.openById(
    "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U"
  );
  var ws = ss.getSheetByName("Workcenter & Mold Matrix");
  var data = ws
    .getRange(3, 1, ws.getLastRow() - 2, ws.getLastColumn())
    .getDisplayValues();
  return data;
}

function changePassword(changePdInfo) {
  var strongRegex = new RegExp(
    "(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[^a-zA-Z0-9]).{8,30}"
  );
  var saasId = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
  var ss = SpreadsheetApp.openById(saasId);
  var ws = ss.getSheetByName("userID");
  var data = ws.getRange(3, 1, ws.getLastRow() - 2, 3).getValues();
  var idList = data.map(function (r) {
    return r[0].toString();
  });
  var pdList = data.map(function (r) {
    return r[2];
  });
  var id = changePdInfo[0];
  var oldPd = changePdInfo[1];
  var newPd = changePdInfo[2];
  var confirmPd = changePdInfo[3];
  var position = idList.indexOf(id);
  if (id == "") {
    return "请输入用户名";
  } else {
    if (oldPd == "") {
      return "请输入旧密码";
    } else {
      if (newPd == "") {
        return "请输入新密码";
      } else {
        if (!strongRegex.test(newPd)) {
          return "您的密码复杂度太低！密码中必须包含字母、数字、特殊字符，长度不低于8，不高于30";
        } else {
          if (confirmPd == "") {
            return "请再次输入密码";
          } else {
            if (position < 0) {
              return "该用户不存在";
            } else {
              if (oldPd == pdList[position]) {
                if (newPd == confirmPd) {
                  ws.getRange(position + 3, 3).setValue(newPd);
                  return "修改成功";
                } else {
                  return "密码不一致";
                }
              } else {
                return "密码错误";
              }
            }
          }
        }
      }
    }
  }
}

function getPlan(info) {
  try {
    var date = info[0];
    var workshop = info[1];
    var process = info[2];
    var workcenter = info[3];
    var week = info[4];
    var url =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = ss.getSheetByName("Total PM Plan List");
    var data = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();

    if (
      date == "" &&
      workshop == "" &&
      process == "" &&
      workcenter == "" &&
      week == ""
    ) {
      return false;
    } else if (
      workshop == "" &&
      process == "" &&
      workcenter == "" &&
      week == ""
    ) {
      var filter_data = data.filter(function (item) {
        return formatDateTime(item[4]) == date;
      }); //筛选
    } else if (date == "" && process == "" && workcenter == "" && week == "") {
      var filter_data = data.filter(function (item) {
        return item[2] == workshop;
      }); //筛选
    } else if (date == "" && workshop == "" && workcenter == "" && week == "") {
      var filter_data = data.filter(function (item) {
        return item[3] == process;
      }); //筛选
    } else if (date == "" && workshop == "" && process == "" && week == "") {
      var filter_data = data.filter(function (item) {
        return item[6] == workcenter;
      }); //筛选
    } else if (
      date == "" &&
      workshop == "" &&
      process == "" &&
      workcenter == ""
    ) {
      var filter_data = data.filter(function (item) {
        return item[1] == week;
      }); //筛选
    } else if (process == "" && workcenter == "" && week == "") {
      //date + workshop
      var filter_data = data.filter(function (item) {
        return item[2] == workshop && formatDateTime(item[4]) == date;
      }); //筛选
    } else if (workshop == "" && workcenter == "" && week == "") {
      //date + process
      var filter_data = data.filter(function (item) {
        return item[3] == process && formatDateTime(item[4]) == date;
      }); //筛选
    } else if (date == "" && process == "" && workcenter == "") {
      //week + workshop
      var filter_data = data.filter(function (item) {
        return item[1] == week && item[2] == workshop;
      }); //筛选
    } else if (date == "" && workshop == "" && workcenter == "") {
      //week + process
      var filter_data = data.filter(function (item) {
        return item[1] == week && item[3] == process;
      }); //筛选
    } else if (date == "" && workcenter == "" && week == "") {
      //workshop + process
      var filter_data = data.filter(function (item) {
        return item[2] == workshop && item[3] == process;
      }); //筛选
    } else if (workcenter == "" && week == "") {
      //date+workshop + process
      var filter_data = data.filter(function (item) {
        return (
          formatDateTime(item[4]) == date &&
          item[2] == workshop &&
          item[3] == process
        );
      }); //筛选
    } else if (workcenter == "" && date == "") {
      //week+workshop + process
      var filter_data = data.filter(function (item) {
        return item[1] == week && item[2] == workshop && item[3] == process;
      }); //筛选
    }

    var wss = getPMSheet(ss) || ss.getSheetByName(process + "-" + workshop);
    var datanew = wss
      .getRange(2, 1, wss.getLastRow() - 1, wss.getLastColumn())
      .getDisplayValues();
    // 合并表模式：筛选当前工序+车间
    if (USE_MERGED_PM_SHEET && wss.getName() === PM_RECORDS_SHEET_NAME) {
      datanew = datanew.filter(function(r) {
        return r[21] === process && r[22] === workshop;
      });
    }

    filter_data.forEach(function (r) {
      var date2 = r[4];
      var workcenter2 = r[6];
      var record = datanew.filter(function (p) {
        return p[9] == workcenter2 && formatDateTime(p[4]) == date2;
      });
      if (record == "") {
        r.push("未开始");
      } else {
        r.push(record[0][1]); //抓取保养状态
      }
    });
    return ["OK", JSON.stringify(filter_data)];
  } catch (e) {
    return ["NO", "保养计划获取出错：" + e.toString()];
  }
}

function getPlan_new() {
  try {
    let id =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    let ss = SpreadsheetApp.openByUrl(id);
    let ws = ss.getSheetByName("Total PM Plan List");
    let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    let values = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getValues();
    let array = [];
    values.forEach((r) => {
      let obj = {};
      for (let i = 0; i < head.length; i++) {
        // 检查值是否为Date对象
        if (r[i] instanceof Date) {
          // 获取时区偏移量（以分钟为单位），并将其转换为毫秒
          // 对于北京时间（UTC+8），需要加上8小时的偏移量
          let timezoneOffset = r[i].getTimezoneOffset() * 60000; // 转换为毫秒
          let beijingOffset = 8 * 60 * 60000; // 北京时间偏移量（8小时）转换为毫秒
          // 创建一个新的日期对象，加上北京时间的时区偏移量
          let adjustedDate = new Date(
            r[i].getTime() + beijingOffset - timezoneOffset
          );
          // 转换为ISO字符串并取日期部分
          obj[head[i]] = adjustedDate.toISOString().split("T")[0];
        } else {
          obj[head[i]] = r[i];
        }
      }
      array.push(obj);
    });

    // 合并表模式：直接从 PM_Records 读取
    var ws_records = getPMSheet(ss);
    var head_record, record;
    if (USE_MERGED_PM_SHEET && ws_records) {
      head_record = ws_records
        .getRange(1, 1, 1, ws_records.getLastColumn())
        .getValues()[0];
      var lastRow = ws_records.getLastRow();
      if (lastRow > 1) {
        record = ws_records
          .getRange(2, 1, lastRow - 1, ws_records.getLastColumn())
          .getValues();
      } else {
        record = [];
      }
    } else {
      // 旧版：遍历六分表
      var sheetName = [
        "INJ-TB1", "INJ-TB2", "TF-TB1", "TF-TB2", "PK-TB1", "PK-TB2",
      ];
      var ws_head = ss.getSheetByName("INJ-TB1");
      head_record = ws_head
        .getRange(1, 1, 1, ws_head.getLastColumn())
        .getValues()[0];
      record = [];
      sheetName.forEach(function(name) {
        var wss = ss.getSheetByName(name);
        var lastRow = wss.getLastRow();
        if (lastRow > 1) {
          var values = wss
            .getRange(2, 1, lastRow - 1, wss.getLastColumn())
            .getValues();
          record = record.concat(values);
        }
      });
    }
    console.log("head_record", head_record);
    console.log("RECORD", record[0]);

    let record_obj = [];
    record.forEach((r) => {
      // console.log(r)
      let obj_2 = {};
      for (let i = 0; i < head_record.length; i++) {
        // console.log(head_record[i])
        obj_2[head_record[i]] = r[i];
      }
      // console.log(obj_2)
      record_obj.push(obj_2);
    });

    console.log("record_obj", record_obj);
    return {
      Head: head,
      Content: array,
      // Record: JSON.stringify(record),
      Record_obj: JSON.stringify(record_obj),
    };
  } catch (e) {
    return ["NO", "保养计划获取出错：" + e.toString()];
  }
}

// 新增：获取当前日期前一周和后三周的数据
function getPlan_weekly() {
  try {
    // 缓存：按周缓存，5分钟内重复访问直接返回
    var cache = CacheService.getScriptCache();
    var cacheKey = "PM_Plan_weekly_" + Utilities.formatDate(new Date(), "Asia/Hong_Kong", "yyyyWW");
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let id =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    let ss = SpreadsheetApp.openByUrl(id);
    let ws = ss.getSheetByName("Total PM Plan List");
    let lastRow = ws.getLastRow();
    let lastColumn = ws.getLastColumn();
    let head = ws.getRange(1, 1, 1, lastColumn).getValues()[0];

    // 计算时间范围（自然周：周日到周六）
    let today = new Date();
    let currentDayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六

    // 计算当前周的周日
    let currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - currentDayOfWeek);

    // 计算前20周的周日（覆盖到2026/3/1左右）
    let twentyWeeksBefore = new Date(currentWeekSunday);
    twentyWeeksBefore.setDate(currentWeekSunday.getDate() - 140);

    // 计算后4周的周六
    let fourWeeksAfter = new Date(currentWeekSunday);
    fourWeeksAfter.setDate(currentWeekSunday.getDate() + 27);

    const TIMEZONE = "Asia/Shanghai";
    const DATE_FORMAT = "yyyy-MM-dd";
    let startDateStr = Utilities.formatDate(
      twentyWeeksBefore,
      TIMEZONE,
      DATE_FORMAT
    );
    let endDateStr = Utilities.formatDate(
      fourWeeksAfter,
      TIMEZONE,
      DATE_FORMAT
    );
    let currentWeekSundayStr = Utilities.formatDate(
      currentWeekSunday,
      TIMEZONE,
      DATE_FORMAT
    );

    console.log(
      "筛选时间范围：",
      startDateStr,
      "到",
      endDateStr
    );

    let filteredValues = [];
    let hasLastWeekData = false;
    let hasNextThreeWeeksData = false;

    if (lastRow > 1) {
      let dateValues = ws.getRange(2, 5, lastRow - 1, 1).getValues();
      let matchedRows = [];

      dateValues.forEach((row, idx) => {
        let cell = row[0];
        if (!cell) {
          return;
        }

        let dateStr = "";
        if (cell instanceof Date) {
          dateStr = Utilities.formatDate(cell, TIMEZONE, DATE_FORMAT);
        } else if (typeof cell === "string") {
          dateStr = cell.trim();
        }

        if (!dateStr) {
          return;
        }

        if (
          dateStr >= startDateStr &&
          dateStr <= endDateStr
        ) {
          let rowNumber = idx + 2; // 数据开始于第2行
          matchedRows.push(rowNumber);

          if (dateStr >= startDateStr && dateStr < currentWeekSundayStr) {
            hasLastWeekData = true;
          }

          if (dateStr >= currentWeekSundayStr && dateStr <= endDateStr) {
            hasNextThreeWeeksData = true;
          }
        }
      });

      if (matchedRows.length > 0) {
        let minRow = Math.min.apply(null, matchedRows);
        let maxRow = Math.max.apply(null, matchedRows);
        let rowsToFetch = maxRow - minRow + 1;
        let rowValues = ws.getRange(minRow, 1, rowsToFetch, lastColumn).getValues();
        let rowNumberSet = new Set(matchedRows);

        rowValues.forEach((r, idx) => {
          let actualRow = minRow + idx;
          if (rowNumberSet.has(actualRow)) {
            filteredValues.push(r);
          }
        });
      }
    }

    // 处理筛选后的数据
    let array = [];
    filteredValues.forEach((r) => {
      let obj = {};
      for (let i = 0; i < head.length; i++) {
        if (r[i] instanceof Date) {
          let timezoneOffset = r[i].getTimezoneOffset() * 60000;
          let beijingOffset = 8 * 60 * 60000;
          let adjustedDate = new Date(
            r[i].getTime() + beijingOffset - timezoneOffset
          );
          obj[head[i]] = adjustedDate.toISOString().split("T")[0];
        } else {
          obj[head[i]] = r[i];
        }
      }
      array.push(obj);
    });

    // 获取状态数据（从PM_Records读取）
    const STATUS_SHEET_DATE_COL = 5; // Plan PM Date 列
    let record_obj = [];
    let wsRecords = ss.getSheetByName("PM_Records");
    let lastRowRecords = wsRecords.getLastRow();
    if (lastRowRecords > 1) {
      let masterDates = wsRecords.getRange(2, STATUS_SHEET_DATE_COL, lastRowRecords - 1, 1).getValues();
      let matchedStatusRows = [];

      masterDates.forEach((row, idx) => {
        let cell = row[0];
        if (!cell) return;
        let dateStr = "";
        if (cell instanceof Date) {
          dateStr = Utilities.formatDate(cell, TIMEZONE, DATE_FORMAT);
        } else if (typeof cell === "string") {
          dateStr = cell.trim();
        }
        if (!dateStr) return;
        if (dateStr >= startDateStr && dateStr <= endDateStr) {
          matchedStatusRows.push(idx + 2);
        }
      });

      if (matchedStatusRows.length > 0) {
        let minStatusRow = Math.min.apply(null, matchedStatusRows);
        let maxStatusRow = Math.max.apply(null, matchedStatusRows);
        let statusRowsToFetch = maxStatusRow - minStatusRow + 1;
        // 只读B-J列（9列）：PmStatus[0], Plan PM Date[3], Workcenter[8]
        let rowValues = wsRecords
          .getRange(minStatusRow, 2, statusRowsToFetch, 9)
          .getValues();
        let statusRowSet = new Set(matchedStatusRows);

        rowValues.forEach((r, idx) => {
          let actualRow = minStatusRow + idx;
          if (statusRowSet.has(actualRow)) {
            record_obj.push({
              PmStatus: r[0],
              "Plan PM Date": r[3],
              Workcenter: r[8],
            });
          }
        });
      }
    }

    var result = {
      Head: head,
      Content: array,
      Record_obj: JSON.stringify(record_obj),
      DateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        hasLastWeekData: hasLastWeekData,
        hasNextThreeWeeksData: hasNextThreeWeeksData,
      },
    };
    try {
      cache.put(cacheKey, JSON.stringify(result), 300);
    } catch (e) {
      // 缓存写入失败（可能超100KB限制），跳过
    }
    return result;
  } catch (e) {
    return ["NO", "保养计划获取出错：" + e.toString()];
  }
}

/*============时间戳、日期转换===========*/
function formatDateTime(inputTime) {
  var date = new Date(inputTime);
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  m = m < 10 ? "0" + m : m;
  var d = date.getDate();
  d = d < 10 ? "0" + d : d;
  var h = date.getHours();
  h = h < 10 ? "0" + h : h;
  return y + "-" + m + "-" + d;
}

function get_Tasklist(info, workshop, process, title) {
  console.log(info, workshop, process, title);
  try {
    var added_task = getAddedPMtask(workshop, process, title);
    var std_task = getstdTasklist(info);
    var tasklist = new Array();
    std_task.forEach(function (r) {
      tasklist.push(r);
    });
    if (added_task == false) {
    } else {
      var addeded_task = added_task.filter(function (r) {
        return r[2] == info.workcenter && formatDateTime(r[7]) == info.Plan_SD;
      });
      addeded_task.forEach(function (r) {
        var code = r[0];
        var machine_type = r[1];
        var module = r[3];
        var taskDescription = r[4];
        var source = new String();
        if (code.toString().charAt(0) == "M") {
          source = "保养准备会";
        } else {
          source = "三班";
        }
        var data = [
          machine_type,
          code,
          source,
          module,
          "NA",
          "NA",
          taskDescription,
          "NA",
          "NA",
          "NA",
          "NA",
          "技术员",
          "NA",
          "NA",
          "NA",
          "NA",
          "NA",
        ];
        tasklist.unshift(data);
      });
    }
    for (let i = 0; i < tasklist.length; i++) {
      tasklist[i][9] = tasklist[i][9] + "【" + tasklist[i][10] + "】";
    }
    return ["OK", tasklist];
  } catch (e) {
    return ["NO", "标准保养任务获取出错：" + e.toString()];
  }
}

function getstdTasklist(info) {
  // info={"Plan_SD":"2025-10-09","workcenter":"","machine_type":"FP&R-ZAH"}
  var a = info.machine_type.split(/ /);
  var machine_type = new Array();
  for (i = 0; i < a.length; i++) {
    if (a[i] != "") {
      machine_type.push(a[i]);
    }
  }
  var date = info.Plan_SD;
  var workcenter = info.workcenter;
  var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
  var ss = SpreadsheetApp.openById(id_database);
  var ws = ss.getSheetByName("PM Tasklist");
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues();
  var Tasklist = data.filter(function (r) {
    return (
      (r[4] == workcenter && formatDateTime(r[5]) == date) ||
      r[0] == machine_type[0] ||
      r[0] == machine_type[1] ||
      r[0] == machine_type[2]
    );
  });
  // console.log(Tasklist)
  return Tasklist;
}

function writeback_task(process, workshop, code) {
  var code_update = code + "true";
  var url =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = getShiftSheet(ss) || ss.getSheetByName("Shift_" + process + "_" + workshop);
  var isMerged = USE_MERGED_SHIFT_SHEET && ws.getName() === SHIFT_RECORDS_SHEET_NAME;
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var combined = data[i][0].toString() + data[i][12].toString();
    if (combined === code_update) {
      if (isMerged) {
        var rowWorkshop = String(data[i][14] || '').trim();
        var rowProcess = String(data[i][15] || '').trim();
        var processMatch2 = (rowProcess === process) ||
          (rowProcess === 'INJ' && process === 'IM') ||
          (rowProcess === 'IM' && process === 'INJ');
        if (!processMatch2 || rowWorkshop !== workshop) {
          continue;
        }
      }
      ws.getRange(i + 2, 17).setValue("Y");
      break;
    }
  }
  return true;
}

function login_check(workshop, process) {
  info = [process, workshop];
  return info;
}

function getAddedPMtask(workshop, process) {
  var SheetName = "APT_" + process + "_" + workshop;
  var url =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName(SheetName);
  if (ws.getLastRow() - 1 == 0) {
    return false;
  } else {
    var data = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();
    return data;
  }
}

function createAddtask(process, workshop, data) {
  data = JSON.parse(data);
  var SheetName = "APT_" + process + "_" + workshop;
  var url =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName(SheetName);
  data.push("Ongoing");
  ws.appendRow(data);
  return true;
}

function autocomplete_workcenter(workshop, process) {
  try {
    var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    var ss = SpreadsheetApp.openById(id_database);
    var ws = ss.getSheetByName("Workcenter & Mold Matrix");
    var data = ws.getRange(2, 1, ws.getLastRow() - 1, 1).getDisplayValues();
    var workcenter = {};
    data.forEach(function (v) {
      workcenter[v[0]] = null;
    });
    return ["OK", JSON.stringify(workcenter), workshop, process];
  } catch (e) {
    return ["NO", e.toString()];
  }
}

function autocomplete_name() {
  var url_user =
    "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
  var ss_user = SpreadsheetApp.openByUrl(url_user);
  var ws_user = ss_user.getSheetByName("userID");
  var data_user = ws_user
    .getRange(3, 2, ws_user.getLastRow() - 2, 1)
    .getDisplayValues();
  var name = {};
  data_user.forEach(function (v) {
    name[v[0]] = null;
  });
  return name;
}

function autocomplete_errorCode(process, workshop) {
  var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
  var ss = SpreadsheetApp.openById(id_database);
  var wss = ss.getSheetByName("errorCode");
  var data = wss.getRange(2, 1, wss.getLastRow() - 1, 5).getDisplayValues();
  var data_errorCode = data.filter(function (r) {
    return r[0] == process;
  });
  var errorCode = data_errorCode.map((r) => {
    return r[4];
  });
  return errorCode;
}

function pmMasterplan() {
  var url =
    "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName("Total PM Plan List");
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues();
  return JSON.stringify(data);
}

function get_toPM_data() {
  var url =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName("toPM_Task");
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues();
  return data;
}

function PMgemerate(workshop, process, info) {
  try {
    var url =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = getPMSheet(ss) || ss.getSheetByName(process + "-" + workshop);

    var arrWsPmNo;
    var positionPmNo;
    if (USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME) {
      arrWsPmNo = getPMNoList(ws, process, workshop);
      positionPmNo = arrWsPmNo.indexOf(info[0].toString());
    } else {
      arrWsPmNo = ws
        .getRange(2, 1, ws.getLastRow() - 1, 1)
        .getDisplayValues()
        .map(function(v) { return v[0].toString(); });
      positionPmNo = arrWsPmNo.indexOf(info[0].toString());
    }

    if (positionPmNo == -1) {
      if (USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME) {
        ws.appendRow(info.concat([process, workshop]));
      } else {
        ws.appendRow(info);
      }
    } else {
      ws.getRange(positionPmNo + 2, 1, 1, info.length).setValues([info]);
      if (USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME) {
        ws.getRange(positionPmNo + 2, 22).setValue(process);
        ws.getRange(positionPmNo + 2, 23).setValue(workshop);
      }
    }

    return ["OK", true];
  } catch (e) {
    return ["NO", "写入保养计划及任务出错：" + e.toString()];
  }
}

function getPMrecord(PM_Info) {
  try {
    var url =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = getPMSheet(ss) || ss.getSheetByName(PM_Info.process + "-" + PM_Info.workshop);
    var allData = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();

    // 合并表模式：仅筛选当前工序+车间（V/W为空时不过滤，兼容旧记录）
    if (USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME) {
      allData = allData.filter(function(r) {
        if (r[21] === '' && r[22] === '') return true;
        return r[21] === PM_Info.process && r[22] === PM_Info.workshop;
      });
    }
    
    Logger.log("=== getPMrecord 调试信息 ===");
    Logger.log("查询条件 - Workcenter: " + PM_Info.workcenter + ", Plan_SD: " + PM_Info.Plan_SD);
    Logger.log("总数据行数: " + allData.length);
    
    allData.forEach(function(v, index) {
      Logger.log("第" + (index + 2) + "行 - v[9](Workcenter): '" + v[9] + "', v[4](Plan PM Date): '" + v[4] + "'");
    });
    
    // 归一化日期字符串为 yyyy-MM-dd 格式，避免 getDisplayValues() 与传入格式不一致
    function normalizeDate(val) {
      if (!val) return '';
      var str = val.toString().trim();
      // 尝试解析为 Date 对象
      var d = new Date(str);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "Asia/Shanghai", "yyyy-MM-dd");
      }
      // 无法解析则去掉非数字分隔符后比较
      return str.replace(/[^0-9]/g, '');
    }

    var data = allData.filter((v) => {
      var workcenterMatch = v[9].toString().trim() == PM_Info.workcenter.toString().trim();
      var recordDate = normalizeDate(v[4]);
      var queryDate = normalizeDate(PM_Info.Plan_SD);
      var dateMatch = recordDate == queryDate;
      Logger.log("过滤判断 - Workcenter匹配: " + workcenterMatch + ", 日期匹配: " + dateMatch + " (recordDate=" + recordDate + ", queryDate=" + queryDate + ")");
      return workcenterMatch && dateMatch;
    });
    
    Logger.log("过滤后数据行数: " + data.length);
    Logger.log("===========================");
    
    return ["OK", JSON.stringify(data)];
  } catch (e) {
    return ["NO", e.toString()];
  }
}

function PMend_writeback(workshop, process, arrJsonInfo, arrInfo) {
  //PM完成后写回状态
  try {
    var SheetName_PM = process + "-" + workshop;
    var SheetName_APT = "APT_" + process + "_" + workshop;
    var url_APT =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var url_PM =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss_PM = SpreadsheetApp.openByUrl(url_PM);
    var ss_APT = SpreadsheetApp.openByUrl(url_APT);
    var ws_PM = getPMSheet(ss_PM) || ss_PM.getSheetByName(SheetName_PM);
    var ws_APT = ss_APT.getSheetByName(SheetName_APT);
    var isMerged = USE_MERGED_PM_SHEET && ws_PM.getName() === PM_RECORDS_SHEET_NAME;
    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, 1)
      .getDisplayValues();
    var data_PM = ws_PM
      .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
      .getDisplayValues();
    if (isMerged) {
      // 合并表模式：读取全部列 + 过滤工序+车间 by V/W列
      var allPMData = ws_PM.getRange(2, 1, ws_PM.getLastRow() - 1, ws_PM.getLastColumn()).getDisplayValues();
    }
    /*-----生成code list-----------------------------*/
    var codelist;
    if (isMerged) {
      codelist = allPMData
        .filter(function(r) { return r[21] === process && r[22] === workshop; })
        .map(function(r) { return r[0].toString(); });
    } else {
      codelist = data_PM.map(function (r) {
        return r[0].toString();
      });
    }
    var taskNolist = data_APT.map(function (r) {
      return r[0].toString();
    });
    /*----------------单独提取PDM任务记录-------------------------*/
    var arrInfoTaskNo = arrInfo.filter((v) => {
      return v[7].toString().indexOf("PDM") != -1;
    });
    if (arrInfoTaskNo.length > 0) {
      var sabiId = "1DIsa8go8IJjBaGZ3F9ob5l81EGiZIN5XiDja_Pd6Q2g";
      var sabi = SpreadsheetApp.openById(sabiId);
      var sbnPMD = sabi.getSheetByName(SheetName_PM);
      var dataPMD = sbnPMD
        .getRange(1, 1, sbnPMD.getLastRow(), sbnPMD.getLastColumn())
        .getDisplayValues();
      var dataPMD_DateAemTaskNo = dataPMD.map((v) => {
        return v[19].toString();
      });
      for (var k = 0; k < arrInfoTaskNo.length; k++) {
        var positionPMD = dataPMD_DateAemTaskNo.indexOf(
          arrInfoTaskNo[k][0].toString() + arrInfoTaskNo[k][7].toString()
        );
        if (positionPMD == -1) {
          arrInfoTaskNo[k].push(
            arrInfoTaskNo[k][0].toString() + arrInfoTaskNo[k][7].toString()
          );
          sbnPMD.appendRow(arrInfoTaskNo[k]);
        } else {
          arrInfoTaskNo[k].push(
            arrInfoTaskNo[k][0].toString() + arrInfoTaskNo[k][7].toString()
          );
          sbnPMD
            .getRange(positionPMD + 1, 1, 1, arrInfoTaskNo[k].length)
            .setValues([arrInfoTaskNo[k]]);
        }
      }
    }
    /*--------------------在APT文件中更新task完成状态------------------*/
    arrInfo.forEach(function (r) {
      var position_APT = taskNolist.indexOf(r[7]);
      if (position_APT != -1) {
        if (r[20] == true) {
          var a = "Done";
        } else {
          var a = "Ongoing";
        }
        ws_APT.getRange(position_APT + 2, 10).setValue(a);
      }
    });
    /*----------------查找开始的保养任务并重写记录-------------------------*/
    var position = codelist.indexOf(arrJsonInfo[0].toString());
    if (position == -1) {
      if (isMerged) {
        ws_PM.appendRow(arrJsonInfo.concat([process, workshop]));
      } else {
        ws_PM.appendRow(arrJsonInfo);
      }
    } else {
      ws_PM
        .getRange(position + 2, 1, 1, arrJsonInfo.length)
        .setValues([arrJsonInfo]); //写入完成情况和备注
      if (isMerged) {
        ws_PM.getRange(position + 2, 22).setValue(process);
        ws_PM.getRange(position + 2, 23).setValue(workshop);
      }
    }
    return ["OK", true];
  } catch (e) {
    return ["OK", "保养任务保存失败：" + e.toString()];
  }
}

function uploadTableData(workshop, process, arrJsonInfo, arrInfo) {
  try {
    var SheetName_PM = process + "-" + workshop;
    var SheetName_APT = "APT_" + process + "_" + workshop;
    var url_APT =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var url_PM =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss_PM = SpreadsheetApp.openByUrl(url_PM);
    var ss_APT = SpreadsheetApp.openByUrl(url_APT);
    var ws_PM = getPMSheet(ss_PM) || ss_PM.getSheetByName(SheetName_PM);
    var ws_APT = ss_APT.getSheetByName(SheetName_APT);
    var isMerged = USE_MERGED_PM_SHEET && ws_PM.getName() === PM_RECORDS_SHEET_NAME;
    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, 1)
      .getDisplayValues();
    var data_PM = ws_PM
      .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
      .getDisplayValues();
    if (isMerged) {
      var allPMData = ws_PM.getRange(2, 1, ws_PM.getLastRow() - 1, ws_PM.getLastColumn()).getDisplayValues();
    }
    /*-----生成code list-----------------------------*/
    var codelist;
    if (isMerged) {
      codelist = allPMData
        .filter(function(r) { return r[21] === process && r[22] === workshop; })
        .map(function(r) { return r[0].toString(); });
    } else {
      codelist = data_PM.map(function (r) {
        return r[0].toString();
      });
    }
    var taskNolist = data_APT.map(function (r) {
      return r[0].toString();
    });
    /*----------------单独提取PDM任务记录-------------------------*/
    // var arrInfoTaskNo=arrInfo.filter(v=>{return v[7].toString().indexOf("PDM")!=-1});
    // if(arrInfoTaskNo.length>0){
    //   var sabiId="1DIsa8go8IJjBaGZ3F9ob5l81EGiZIN5XiDja_Pd6Q2g";
    //   var sabi=SpreadsheetApp.openById(sabiId);
    //   var sbnPMD=sabi.getSheetByName(SheetName_PM);
    //   var dataPMD=sbnPMD.getRange(1,1,sbnPMD.getLastRow(),sbnPMD.getLastColumn()).getDisplayValues();
    //   var dataPMD_DateAemTaskNo=dataPMD.map(v=>{return v[19].toString()});
    //   for(var k=0;k<arrInfoTaskNo.length;k++){
    //     var positionPMD=dataPMD_DateAemTaskNo.indexOf(arrInfoTaskNo[k][0].toString()+arrInfoTaskNo[k][7].toString());
    //     if(positionPMD==-1){
    //       arrInfoTaskNo[k].push(arrInfoTaskNo[k][0].toString()+arrInfoTaskNo[k][7].toString());
    //       // sbnPMD.appendRow(arrInfoTaskNo[k]);
    //     }
    //     else{
    //       arrInfoTaskNo[k].push(arrInfoTaskNo[k][0].toString()+arrInfoTaskNo[k][7].toString());
    //       // sbnPMD.getRange(positionPMD+1,1,1,arrInfoTaskNo[k].length).setValues([arrInfoTaskNo[k]]);
    //     }
    //   }
    // }
    /*--------------------在APT文件中更新task完成状态------------------*/
    arrInfo.forEach(function (r) {
      var position_APT = taskNolist.indexOf(r[7]);
      if (position_APT != -1) {
        if (r[20] == true) {
          var a = "Done";
        } else {
          var a = "Ongoing";
        }
        ws_APT.getRange(position_APT + 2, 10).setValue(a);
      }
    });
    /*----------------查找开始的保养任务并重写记录-------------------------*/
    var position = codelist.indexOf(arrJsonInfo[0].toString());
    if (position == -1) {
      if (isMerged) {
        ws_PM.appendRow(arrJsonInfo.concat([process, workshop]));
      } else {
        ws_PM.appendRow(arrJsonInfo);
      }
    } else {
      ws_PM
        .getRange(position + 2, 1, 1, arrJsonInfo.length)
        .setValues([arrJsonInfo]); //写入完成情况和备注
      if (isMerged) {
        ws_PM.getRange(position + 2, 22).setValue(process);
        ws_PM.getRange(position + 2, 23).setValue(workshop);
      }
    }
    return ["OK", true];
  } catch (e) {
    return ["OK", "保养任务保存失败：" + e.toString()];
  }
}

function get_existed_PM_tasklist(PMno, workshop, process) {
  try {
    var SheetName_1 = process + "-" + workshop;
    var url =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = getPMSheet(ss) || ss.getSheetByName(SheetName_1);
    var data = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();
    // 合并表模式：筛选工序+车间
    if (USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME) {
      data = data.filter(function (r) {
        return r[21] === process && r[22] === workshop;
      });
    }
    data = data.filter(function (r) {
      return r[0] == PMno;
    });
    if (data.length > 0) {
      return ["OK", JSON.stringify(data)];
    } else {
      return ["NO", "未找到保养开始的任务"];
    }
  } catch (e) {
    return ["NO", "已有的保养任务获取出错：" + e.toString()];
  }
}

function upload_addTask(PM_Info, data) {
  try {
    var process = PM_Info.process;
    var workshop = PM_Info.workshop;
    var SheetName = "APT_" + process + "_" + workshop;
    var url =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = ss.getSheetByName(SheetName);
    var arrWsPmNo = ws
      .getRange(2, 1, ws.getLastRow() - 1, 1)
      .getDisplayValues()
      .map((v) => {
        return v[0].toString();
      });
    var position = arrWsPmNo.indexOf(data.code.toString());
    var arrAddTask = [
      data.code,
      data.machine_type,
      data.workcenter,
      data.module,
      data.jobContent,
      data.estimateTime,
      data.estimatePerson,
      data.date,
    ];
    if (position == -1) {
      ws.appendRow(arrAddTask);
    } else {
      ws.getRange(position + 2, 1, 1, arrAddTask.length).setValues([
        arrAddTask,
      ]);
    }
    var SheetName_2 = process + "-" + workshop;
    var url_PM =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss_PM = SpreadsheetApp.openByUrl(url_PM);
    var ws_PM = getPMSheet(ss_PM) || ss_PM.getSheetByName(SheetName_2);
    // 合并表模式：按工序+车间筛选 PM No. 列表
    var arrWs_PM_No;
    if (USE_MERGED_PM_SHEET && ws_PM.getName() === PM_RECORDS_SHEET_NAME) {
      arrWs_PM_No = getPMNoList(ws_PM, process, workshop);
    } else {
      arrWs_PM_No = ws_PM
        .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
        .getDisplayValues()
        .map(function(v) { return v[0].toString(); });
    }
    let positionWsPmNo = arrWs_PM_No.indexOf(data.PMno.toString());
    if (positionWsPmNo != -1) {
      let exitTaskList = ws_PM
        .getRange(positionWsPmNo + 2, 11, 1, 4)
        .getDisplayValues();
      let arrExitTaskList = JSON.parse(exitTaskList[0][0]);
      let arrExitTaskListNoSolved = JSON.parse(exitTaskList[0][2]);
      let objAddTask = {
        任务编号: data.code,
        单元: data.unite,
        模块: data.module,
        失效模式: "NA",
        任务类型: "NA",
        任务描述: data.jobContent,
        频率: "NA",
        状态: "NA",
        任务属性: "NA",
        工具: "NA",
        是否完成: "FALSE",
        备注: "",
      };
      arrExitTaskList.unshift(objAddTask);
      arrExitTaskListNoSolved.unshift(objAddTask);
      ws_PM
        .getRange(positionWsPmNo + 2, 11, 1, 4)
        .setValues([
          [
            JSON.stringify(arrExitTaskList),
            arrExitTaskList.length,
            JSON.stringify(arrExitTaskListNoSolved),
            arrExitTaskListNoSolved.length,
          ],
        ]);
    }
    return ["OK", true];
  } catch (e) {
    return ["NO", "添加保养任失败：" + e.toString()];
  }
}

function getStopPlan() {
  var url =
    "https://docs.google.com/spreadsheets/d/1iBhTmRl1KjtcSO96rfWhQowiZ4E1jqJohC5wEjF_7rQ/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName("Record");
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues()
    .filter((v) => {
      return v[0] != "";
    });
  data = JSON.stringify(data);
  return data;
}

function getData_shift(workshop, process) {
  try {
    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
      .getDisplayValues(); //16
    var workshopFromId = workshop;
    var processFromId = process;
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var wsFromId = getShiftSheet(ss_database) || ss_database.getSheetByName(
      "Shift_" + processFromId + "_" + workshopFromId
    );
    var isMerged = USE_MERGED_SHIFT_SHEET && wsFromId.getName() === SHIFT_RECORDS_SHEET_NAME;
    var data_shift = wsFromId
      .getRange(2, 1, wsFromId.getLastRow() - 1, wsFromId.getLastColumn())
      .getDisplayValues()
      .filter((v) => {
        return v[21] == "Last";
      });
    if (isMerged) {
      data_shift = filterShiftByProcessWorkshop(data_shift, process, workshop);
    }
    var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    var saas_database = SpreadsheetApp.openById(id_database);
    var ws_workcenter = saas_database.getSheetByName(
      "Workcenter & Mold Matrix"
    );
    var data_workcenter = ws_workcenter
      .getRange(3, 1, ws_workcenter.getLastRow(), ws_workcenter.getLastColumn())
      .getDisplayValues();

    var ws_erroeCode = saas_database.getSheetByName("errorCode");
    var data_errorCode = ws_erroeCode
      .getRange(
        2,
        1,
        ws_erroeCode.getLastRow() - 1,
        ws_erroeCode.getLastColumn()
      )
      .getDisplayValues();

    var data = {
      shift: data_shift,
      machine_info: data_workcenter,
      userID: data_userID,
      errorCode: data_errorCode,
      loginWorkshop: workshop,
      loginProcess: process,
    };
    return ["OK", JSON.stringify(data)];
  } catch (e) {
    return ["NO", "交接班数据获取出错：" + e.toString()];
  }
}

function getData_select(workshop, process) {
  try {
    var workshopFromId = workshop;
    var processFromId = process;
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var wsFromId = getShiftSheet(ss_database) || ss_database.getSheetByName(
      "Shift_" + processFromId + "_" + workshopFromId
    );
    var isMerged = USE_MERGED_SHIFT_SHEET && wsFromId.getName() === SHIFT_RECORDS_SHEET_NAME;
    var data_shift = wsFromId
      .getRange(2, 1, wsFromId.getLastRow() - 1, wsFromId.getLastColumn())
      .getDisplayValues()
      .filter((v) => {
        return v[21] == "Last";
      });
    if (isMerged) {
      data_shift = filterShiftByProcessWorkshop(data_shift, process, workshop);
    }
    var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    var saas_database = SpreadsheetApp.openById(id_database);
    var ws_workcenter = saas_database.getSheetByName(
      "Workcenter & Mold Matrix"
    );
    var data_workcenter = ws_workcenter
      .getRange(
        3,
        1,
        ws_workcenter.getLastRow() - 2,
        ws_workcenter.getLastColumn()
      )
      .getDisplayValues();

    var ws_erroeCode = saas_database.getSheetByName("errorCode");
    var data_errorCode = ws_erroeCode
      .getRange(
        2,
        1,
        ws_erroeCode.getLastRow() - 1,
        ws_erroeCode.getLastColumn()
      )
      .getDisplayValues();

    var data = {
      shift: data_shift,
      machine_info: data_workcenter,
      errorCode: data_errorCode,
      loginWorkshop: workshop,
      loginProcess: process,
    };
    return ["OK", JSON.stringify(data)];
  } catch (e) {
    return ["NO", "交接班数据加载出错：" + e.toString()];
  }
}

function upload_shift(obj) {
  try {
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    var saas_database = SpreadsheetApp.openById(id_database);
    var ws_machine_info = saas_database.getSheetByName(
      "Workcenter & Mold Matrix"
    );
    var data_machine_info = ws_machine_info
      .getRange(
        2,
        1,
        ws_machine_info.getLastRow() - 1,
        ws_machine_info.getLastColumn()
      )
      .getDisplayValues();
    var machine_info = data_machine_info.filter((r) => {
      return r[0] == obj.workcenter;
    });
    obj.workshop = machine_info[0][4];
    obj.process = machine_info[0][5];
    var ws_shift = getShiftSheet(ss_database) || ss_database.getSheetByName("Shift_" + obj.process + "_" + obj.workshop);
    var isMerged = USE_MERGED_SHIFT_SHEET && ws_shift.getName() === SHIFT_RECORDS_SHEET_NAME;
    ws_shift.appendRow([
      obj.code,
      obj.shift,
      obj.workcenter,
      obj.issue,
      obj.processMethod,
      obj.status,
      obj.owner,
      obj.repairDuration,
      obj.errorCode,
      obj.workorder,
      obj.handover,
      obj.submitDate,
      obj.result,
      obj.submitPerson,
      obj.workshop,
      obj.process,
      obj.No_repairPerson,
      obj.machine_type,
      "",
      "",
      obj.followStatus,
      "Last",
    ]);
    return ["OK", true];
  } catch (e) {
    return ["NO", "交接班数据保存出错：" + e.toString()];
  }
}

function upload_shift_modal(obj) {
  try {
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var id_database = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    var saas_database = SpreadsheetApp.openById(id_database);
    var ws_machine_info = saas_database.getSheetByName(
      "Workcenter & Mold Matrix"
    );
    var data_machine_info = ws_machine_info
      .getRange(
        2,
        1,
        ws_machine_info.getLastRow() - 1,
        ws_machine_info.getLastColumn()
      )
      .getDisplayValues();
    var machine_info = data_machine_info.filter((r) => {
      return r[0] == obj.workcenter;
    });
    if (machine_info.length < 1) {
      obj.workshop = "TB1";
      obj.process = "PK";
    } else {
      obj.workshop = machine_info[0][4];
      obj.process = machine_info[0][5];
    }
    var SheetName = "Shift_" + obj.process + "_" + obj.workshop;
    var ws_shift = getShiftSheet(ss_database) || ss_database.getSheetByName(SheetName);
    var isMerged = USE_MERGED_SHIFT_SHEET && ws_shift.getName() === SHIFT_RECORDS_SHEET_NAME;
    var rowNum;
    if (isMerged) {
      rowNum = findRowByShiftCode(ws_shift, obj.issueNo.toString(), obj.process, obj.workshop);
    } else {
      var arrIssueNo = ws_shift
        .getRange(2, 1, ws_shift.getLastRow() - 1, 1)
        .getValues()
        .map((v) => {
          return v[0].toString();
        });
      var position = arrIssueNo.indexOf(obj.issueNo.toString());
      rowNum = position > -1 ? position + 2 : -1;
    }
    if (rowNum == -1) {
      var modalRowData = [
        obj.issueNo,
        obj.shift,
        obj.workcenter,
        obj.issue,
        obj.processMethod,
        obj.status,
        obj.ownner,
        obj.repairDuration,
        obj.errorCode,
        obj.workorder,
        obj.handover,
        obj.submitDate,
        obj.result,
        obj.submitPerson,
        obj.workshop,
        obj.process,
        obj.No_repairPerson,
        obj.machine_type,
        "",
        "",
        "",
        "Last",
      ];
      ws_shift.appendRow(modalRowData);
    } else {
      var arrIssueNoRecord = ws_shift
        .getRange(rowNum, 1, 1, ws_shift.getLastColumn())
        .getDisplayValues();
      console.log("测试", arrIssueNoRecord);
      if (arrIssueNoRecord[0][4].toString().split("\n").length < 2) {
        obj.processMethod =
          arrIssueNoRecord[0][4] +
          '{"班次":"' +
          arrIssueNoRecord[0][1] +
          '","状态":"' +
          arrIssueNoRecord[0][5] +
          '","维修时间":"' +
          arrIssueNoRecord[0][7] +
          '","提交日期":"' +
          arrIssueNoRecord[0][11] +
          '","参与人数":"' +
          arrIssueNoRecord[0][16] +
          '"}' +
          "\n" +
          obj.processMethod +
          '{"班次":"' +
          obj.shift +
          '","状态":"' +
          obj.status +
          '","维修时间":"' +
          obj.repairDuration +
          '","提交日期":"' +
          obj.submitDate +
          '","参与人数":"' +
          obj.No_repairPerson +
          '"}';
      } else {
        obj.processMethod =
          arrIssueNoRecord[0][4] +
          "\n" +
          obj.processMethod +
          '{"班次":"' +
          obj.shift +
          '","状态":"' +
          obj.status +
          '","维修时间":"' +
          obj.repairDuration +
          '","提交日期":"' +
          obj.submitDate +
          '","参与人数":"' +
          obj.No_repairPerson +
          '"}';
      }
      obj.ownner = arrIssueNoRecord[0][6] + "\n" + obj.ownner;
      obj.repairDuration =
        Number(arrIssueNoRecord[0][7]) + Number(obj.repairDuration);
      obj.errorCode = arrIssueNoRecord[0][8] + "\n" + obj.errorCode;
      obj.workcenter = arrIssueNoRecord[0][9] + "\n" + obj.workcenter;
      obj.handover = arrIssueNoRecord[0][10] + "\n" + obj.handover;
      obj.submitPerson = arrIssueNoRecord[0][13] + "\n" + obj.submitPerson;
      var arrNewRecord = [
        obj.issueNo,
        arrIssueNoRecord[0][1],
        obj.workcenter,
        obj.issue,
        obj.processMethod,
        obj.status,
        obj.ownner,
        obj.repairDuration,
        obj.errorCode,
        obj.workorder,
        obj.handover,
        obj.submitDate,
        obj.result,
        obj.submitPerson,
        obj.workshop,
        obj.process,
        obj.No_repairPerson,
        obj.machine_type,
        "",
        "",
        "",
        "Last",
      ];
      ws_shift
        .getRange(rowNum, 1, 1, arrNewRecord.length)
        .setValues([arrNewRecord]);
    }
    return ["OK", true];
  } catch (e) {
    return ["NO", "交接班数据保存出错：" + e.toString()];
  }
}

function getWaitFaultReport(workshop, process) {
  try {
    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
      .getDisplayValues();
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ws_database = getShiftSheet(ss_database) || ss_database.getSheetByName("Shift_" + process + "_" + workshop);
    var isMerged = USE_MERGED_SHIFT_SHEET && ws_database.getName() === SHIFT_RECORDS_SHEET_NAME;
    var data_shift = ws_database
      .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
      .getDisplayValues();
    if (isMerged) {
      data_shift = filterShiftByProcessWorkshop(data_shift, process, workshop);
    }
    var data = { user: data_userID, shift: data_shift };
    return ["OK", data];
  } catch (e) {
    return ["NO", "故障报告获取出错：" + e.toString()];
  }
}

function getData_PMTask(workshop, process) {
  var url_userID =
    "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
  var ss_userID = SpreadsheetApp.openByUrl(url_userID);
  var ws_userID = ss_userID.getSheetByName("userID");
  var data_userID = ws_userID
    .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
    .getDisplayValues();
  var url_database =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss_database = SpreadsheetApp.openByUrl(url_database);
  var ws_database = getShiftSheet(ss_database) || ss_database.getSheetByName("Shift_" + process + "_" + workshop);
  var isMerged = USE_MERGED_SHIFT_SHEET && ws_database.getName() === SHIFT_RECORDS_SHEET_NAME;
  var data_shift = ws_database
    .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
    .getDisplayValues();
  if (isMerged) {
    data_shift = filterShiftByProcessWorkshop(data_shift, process, workshop);
  }
  var data = { user: data_userID, shift: data_shift };
  return data;
}

function FormatVariableToYMD(variable) {
  let result = "";
  if (variable) {
    result = Utilities.formatDate(
      new Date(variable),
      "Asia/Shanghai",
      "yyyy-MM-dd"
    );
  }
  return result;
}

function getData_PointCheck(workshop, process) {
  let now = new Date();
  let nowHour = now.getHours();
  let nowMinute = now.getMinutes();
  let currentDate = FormatVariableToYMD(now);
  let currentShift = 0;
  if (nowHour >= 0 && nowHour < 8) {
    currentShift = 1;
  } else if (nowHour >= 8 && nowHour < 16) {
    currentShift = 2;
  } else if (nowHour >= 16 && nowHour < 24) {
    currentShift = 3;
  }
  let now_YearWeek = new Date(now).getYearWeek();
  let nowBefore7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  let nowBefore7_YearWeek = new Date(nowBefore7).getYearWeek();
  console.log(currentDate, currentShift, now_YearWeek, nowBefore7_YearWeek);
  try {
    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
      .getDisplayValues();
    var url_PointCheck =
      "https://docs.google.com/spreadsheets/d/1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY/";
    var ss_PointCheck = SpreadsheetApp.openByUrl(url_PointCheck);
    let ws_PointCheckMachineList = ss_PointCheck.getSheetByName("MachineList");
    let sabi_NeedRunTimePointCheck = SpreadsheetApp.openById(
      "1bZEaJNQbKq8e9Q0OBGWkKLjQwgZqsT8nXdl9yMaVKJM"
    );
    let sbn_NeedRunTimePointCheck =
      sabi_NeedRunTimePointCheck.getSheetByName("RunInfo");
    let arrNeedRunTimePointCheck_Machine = Array.from(
      new Set(
        sbn_NeedRunTimePointCheck
          .getRange(1, 1, sbn_NeedRunTimePointCheck.getLastRow(), 1)
          .getDisplayValues()
          .filter((v, index) => index > 0)
          .map((v) => v[0])
      )
    );
    let data_machine_info = ws_PointCheckMachineList
      .getRange(2, 1, ws_PointCheckMachineList.getLastRow() - 1, 5)
      .getDisplayValues()
      .filter(
        (v) =>
          arrNeedRunTimePointCheck_Machine.indexOf(
            v[3].toString().substring(0, 8)
          ) == -1 && v[3].toString().substring(0, 1) != "V"
      );
    data_machine_info.forEach((v) => v.push(now_YearWeek, ""));
    /**以下是到点获取注塑RunTime机台信息**/
    if (
      ((nowHour == 1 || nowHour == 9 || nowHour == 17) && nowMinute > 30) ||
      (nowHour > 1 && nowHour < 8) ||
      (nowHour > 9 && nowHour < 16) ||
      (nowHour > 17 && nowHour < 24)
    ) {
      let sbnRunTimePointCheckInfo = SpreadsheetApp.openById(
        "1UWbuQt2WQh_m5WNa5cds8CIZBmOH-m6lPYmwL7k7EVc"
      ).getSheetByName("PointCheckInfo");
      let sbnRunTimePointCheckInfoLr = sbnRunTimePointCheckInfo.getLastRow();
      let arrRunTimePointCheckInfo = [];
      if (sbnRunTimePointCheckInfoLr > 1000) {
        arrRunTimePointCheckInfo = sbnRunTimePointCheckInfo
          .getRange(sbnRunTimePointCheckInfoLr - 999, 1, 1000, 15)
          .getDisplayValues();
      } else if (sbnRunTimePointCheckInfoLr > 1) {
        arrRunTimePointCheckInfo = sbnRunTimePointCheckInfo
          .getRange(2, 1, sbnRunTimePointCheckInfoLr - 1, 15)
          .getDisplayValues();
      }
      arrRunTimePointCheckInfo.forEach(
        (v) => (v[8] = FormatVariableToYMD(v[8]))
      );
      arrRunTimePointCheckInfo = arrRunTimePointCheckInfo
        .filter(
          (v) =>
            (v[8] == currentDate && v[9] == currentShift) || v[14] == "未做"
        )
        .map((v) => [
          v[0],
          v[1],
          v[2],
          v[3],
          v[4],
          v[10],
          v[14] == "" ? "" : v[10] + "_" + v[8] + "_" + v[9],
        ]);
      data_machine_info = arrRunTimePointCheckInfo.concat(data_machine_info);
    }
    /**以上是到点获取注塑RunTime机台信息**/

    let ws_PointCheckTasklist =
      ss_PointCheck.getSheetByName("PointCheckTaskList");
    let SheetName_PointCheck = USE_UNIFIED_INSPECTION_SHEET
      ? "InspectionRecords"
      : process + "-" + workshop;
    let ws_PointCheckData = ss_PointCheck.getSheetByName(SheetName_PointCheck);
    let data_PointCheckTasklist = ws_PointCheckTasklist
      .getRange(
        2,
        1,
        ws_PointCheckTasklist.getLastRow() - 1,
        ws_PointCheckTasklist.getLastColumn()
      )
      .getDisplayValues();

    let data_PoickCheck = ws_PointCheckData
      .getRange(2, 1, ws_PointCheckData.getLastRow() - 1, 9)
      .getDisplayValues()
      .filter(row => {
        if (!USE_UNIFIED_INSPECTION_SHEET) return true;
        let rw = (row[1] || "").toString().trim();
        let rp = (row[2] || "").toString().trim();
        return rw === workshop && rp === process;
      })
      .map((v) => {
        return [
          v[0].toString().substring(8, 23),
          v[4],
          v[3],
          v[5],
          v[0].toString().substring(15, 23),
          v[0].toString().substring(8, 15),
        ];
      });
    // .filter((v) => {
    //   return v[5] >= nowBefore7_YearWeek;
    // });
    var info = {
      machine_info: data_machine_info,
      user: data_userID,
      tasklist: data_PointCheckTasklist,
      loginWorkshop: workshop,
      loginProcess: process,
      alreadyPointCheckData: data_PoickCheck,
    };
    return ["OK", JSON.stringify(info)];
  } catch (e) {
    return ["NO", "点检标准数据获取出错：" + e.toString()];
  }
}

function getData_PointCheck_Inspection2(process) {
  let now = new Date();
  let nowHour = now.getHours();
  let nowMinute = now.getMinutes();
  let currentDate = FormatVariableToYMD(now);
  let currentShift = 0;
  if (nowHour >= 0 && nowHour < 8) {
    currentShift = 1;
  } else if (nowHour >= 8 && nowHour < 16) {
    currentShift = 2;
  } else if (nowHour >= 16 && nowHour < 24) {
    currentShift = 3;
  }
  let now_YearWeek = new Date(now).getYearWeek();
  let nowBefore7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  let nowBefore7_YearWeek = new Date(nowBefore7).getYearWeek();
  console.log(currentDate, currentShift, now_YearWeek, nowBefore7_YearWeek);
  

  try {
    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
      .getDisplayValues();

    var url_PointCheck =
      "https://docs.google.com/spreadsheets/d/1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY/";
    var ss_PointCheck = SpreadsheetApp.openByUrl(url_PointCheck);
    
    // 获取PointCheckInfo工作表数据（INJ工序需要，其他工序也需要）
    let ss_PointCheckInfo = SpreadsheetApp.openById("1UWbuQt2WQh_m5WNa5cds8CIZBmOH-m6lPYmwL7k7EVc");
    let ws_PointCheckInfo = ss_PointCheckInfo.getSheetByName("PointCheckInfo");
    let headers_PointCheckInfo = ws_PointCheckInfo
      .getRange(1, 1, 1, ws_PointCheckInfo.getLastColumn())
      .getDisplayValues()[0];
    let data_PointCheckInfo = ws_PointCheckInfo
      .getRange(2, 1, ws_PointCheckInfo.getLastRow() - 1, ws_PointCheckInfo.getLastColumn())
      .getDisplayValues();
    let obj_PointCheckInfo = data_PointCheckInfo.map(row => {
      let obj = {};
      headers_PointCheckInfo.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    console.log('📊 PointCheckInfo原始数据（后端）:', {
      '表头': headers_PointCheckInfo,
      '总记录数': obj_PointCheckInfo.length,
      '前3条示例': obj_PointCheckInfo.slice(0, 3)
    });
    
    obj_PointCheckInfo = obj_PointCheckInfo.filter(item => {
      return item["是否已做"] !== "已做";
    });
    
    
    // 在 if 块外部定义变量，确保作用域正确
    let workcenter_list = [];
    let workcenterOptions = []; // 预计算的机台选项（替代 nimWorkcenters_raw）
    let rbmMachineCodes = []; // RBM 机台号集合
    let excludedCombinations = []; // 当周已检查的"机台号+任务类型"组合

    // ========== 读取 Workcenter 表（INJ 工序用） ==========
    let workcenterKtoA = {}; // K(NewFormedCell) → [A列机台号]
    if (process === "INJ") {
      var ss_WorkcenterPlan = SpreadsheetApp.openById("12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM");
      var ws_Workcenter = ss_WorkcenterPlan.getSheetByName("Workcenter");
      if (ws_Workcenter && ws_Workcenter.getLastRow() > 1) {
        var data_Workcenter = ws_Workcenter.getRange(2, 1, ws_Workcenter.getLastRow() - 1, 11).getDisplayValues();
        data_Workcenter.forEach(function(row) {
          var wc = row[0] ? row[0].toString().trim() : "";
          var nfc = row[10] ? row[10].toString().trim() : "";
          if (wc && nfc) {
            if (!workcenterKtoA[nfc]) workcenterKtoA[nfc] = [];
            workcenterKtoA[nfc].push(wc);
          }
        });
      }
    }

    // ========== 获取当周已检查记录（传递机台号+任务类型组合） ==========
    if (USE_UNIFIED_INSPECTION_SHEET) {
      // 统一记录表：从 InspectionRecords 按工序过滤
      let ws_Records = ss_PointCheck.getSheetByName("InspectionRecords");
      if (ws_Records && ws_Records.getLastRow() > 1) {
        let data = ws_Records.getRange(2, 1, ws_Records.getLastRow() - 1, 9).getDisplayValues()
          .filter(row => {
            let rp = (row[2] || "").toString().trim().toUpperCase();
            if (process === "INJ") return rp === "INJ" || rp === "IM";
            return rp === process;
          });
        data.forEach(row => {
          let colA = row[0] ? row[0].toString().trim() : "";
          let colD = row[3] ? row[3].toString().trim() : "";
          let colI = row[8] ? row[8].toString().trim() : "";
          let weekMatch = colA.match(/(\d{4}W\d{2})/);
          if (weekMatch && weekMatch[1] === now_YearWeek && colI && colD) {
            excludedCombinations.push({ workcenter: colI, machineType: colD });
          }
        });
      }
    } else {
      // 旧逻辑：读 {process}-TB1, {process}-TB2
      if (process === "INJ") {
        ["INJ-TB1", "INJ-TB2"].forEach(function(name) {
          let ws = ss_PointCheck.getSheetByName(name);
          if (ws && ws.getLastRow() > 1) {
            let data = ws.getRange(2, 1, ws.getLastRow() - 1, 9).getDisplayValues();
            data.forEach(row => {
              let colA = row[0] ? row[0].toString().trim() : "";
              let colD = row[3] ? row[3].toString().trim() : "";
              let colI = row[8] ? row[8].toString().trim() : "";
              let weekMatch = colA.match(/(\d{4}W\d{2})/);
              if (weekMatch && weekMatch[1] === now_YearWeek && colI && colD) {
                excludedCombinations.push({ workcenter: colI, machineType: colD });
              }
            });
          }
        });
      } else {
        let sheetName1 = process + "-TB1";
        let sheetName2 = process + "-TB2";
        [sheetName1, sheetName2].forEach(function(name) {
          let ws = ss_PointCheck.getSheetByName(name);
          if (ws && ws.getLastRow() > 1) {
            let data = ws.getRange(2, 1, ws.getLastRow() - 1, 9).getDisplayValues();
            data.forEach(row => {
              let colA = row[0] ? row[0].toString().trim() : "";
              let colD = row[3] ? row[3].toString().trim() : "";
              let colI = row[8] ? row[8].toString().trim() : "";
              let weekMatch = colA.match(/(\d{4}W\d{2})/);
              if (weekMatch && weekMatch[1] === now_YearWeek && colI && colD) {
                excludedCombinations.push({ workcenter: colI, machineType: colD });
              }
            });
          }
        });
      }
    }

    workcenter_list = [];
    
    // 非注塑工序保持原有逻辑，继续获取 MachineList 数据
    let ws_MachineList = ss_PointCheck.getSheetByName("MachineList");
    let data_MachineList = ws_MachineList
      .getRange(
        2,
        1, // 从A列开始
        ws_MachineList.getLastRow() - 1,
        ws_MachineList.getLastColumn() // 获取所有列
      )
      .getDisplayValues();

    // 获取RunInfo工作表的A列数据（不含A1）
    let ss_RunInfo = SpreadsheetApp.openById("1bZEaJNQbKq8e9Q0OBGWkKLjQwgZqsT8nXdl9yMaVKJM");
    let ws_RunInfo = ss_RunInfo.getSheetByName("RunInfo");
    let data_RunInfo = ws_RunInfo
      .getRange(
        2,
        1, // 从A列开始
        ws_RunInfo.getLastRow() - 1,
        1 // 只获取A列
      )
      .getDisplayValues();

    // 将obj_PointCheckInfo拆分为当前和历史两个对象
    // obj_current_PointCheckInfo: 开始日期 = currentDate 且 开始班次 = currentShift
    let obj_current_PointCheckInfo = obj_PointCheckInfo.filter(item => {
      let startDate = item["开始日期"] ? FormatVariableToYMD(item["开始日期"]) : "";
      let startShift = item["开始班次"] ? item["开始班次"].toString().trim() : "";
      return startDate === currentDate && startShift === currentShift.toString();
    });
    // obj_history_PointCheckInfo: 除当前数据以外的所有数据
    let obj_history_PointCheckInfo = obj_PointCheckInfo.filter(item => {
      let startDate = item["开始日期"] ? FormatVariableToYMD(item["开始日期"]) : "";
      let startShift = item["开始班次"] ? item["开始班次"].toString().trim() : "";
      return !(startDate === currentDate && startShift === currentShift.toString());
    });
    // 为obj_history_PointCheckInfo中每个对象添加"选项描述"属性
    obj_history_PointCheckInfo = obj_history_PointCheckInfo.map(item => {
      let startDate = item["开始日期"] ? FormatVariableToYMD(item["开始日期"]) : "";
      let startShift = item["开始班次"] ? item["开始班次"].toString().trim() : "";
      let yearWeek =item["年周"] ? item["年周"].toString().trim() : "";
      item["选项描述"] = yearWeek + "_" + startDate + "_" + startShift;
      return item;
    });

    // 将data_RunInfo转换为一维数组
    // INJ 工序：通过 Workcenter 表将 RunInfo 组号展开为实际机台号
    let runInfoValues = [];
    if (process === "INJ" && Object.keys(workcenterKtoA).length > 0) {
      data_RunInfo.forEach(row => {
        let groupCode = row[0].toString().trim();
        if (workcenterKtoA[groupCode]) {
          runInfoValues = runInfoValues.concat(workcenterKtoA[groupCode]);
        }
      });
      // 去重
      runInfoValues = [...new Set(runInfoValues)];
      rbmMachineCodes = runInfoValues.slice(); // 保存 RBM 机台号集合
    } else {
      runInfoValues = data_RunInfo.map(row => row[0].toString().trim());
    }

    // 从obj_PointCheckInfo中提取所有机台号
    let pointCheckInfoMachineCodes = obj_PointCheckInfo.map(item => {
      let machineCode = item["机台号"];
      return machineCode ? machineCode.toString().trim() : "";
    }).filter(code => code !== "");

    // 过滤machine_info：剔除索引3的值存在于data_RunInfo或obj_PointCheckInfo中的记录
    let filteredMachineList = data_MachineList.filter(row => {
      let machineCode = row[3] ? row[3].toString().trim() : "";
      return !runInfoValues.includes(machineCode) && !pointCheckInfoMachineCodes.includes(machineCode);
    });

    // 修改：使用Tasklist_history工作表替代PointCheckTaskList
    let ws_PointCheckTasklist =
      ss_PointCheck.getSheetByName("Tasklist_history");
    let data_PointCheckTasklist = ws_PointCheckTasklist
      .getRange(
        2,
        1,
        ws_PointCheckTasklist.getLastRow() - 1,
        ws_PointCheckTasklist.getLastColumn()
      )
      .getDisplayValues();

    // 基于process参数筛选数据
    // 注：INJ和IM都对应注塑工序，需要同时匹配
    // 筛选current_PointCheckInfo：工序键值等于process
    let filtered_current_PointCheckInfo = obj_current_PointCheckInfo.filter(item => {
      let itemProcess = item["工序"] ? item["工序"].toString().trim() : "";
      if (process === "INJ") {
        return itemProcess === "INJ" || itemProcess === "IM";
      }
      return itemProcess === process;
    });

    // 筛选history_PointCheckInfo：工序键值等于process
    let filtered_history_PointCheckInfo = obj_history_PointCheckInfo.filter(item => {
      let itemProcess = item["工序"] ? item["工序"].toString().trim() : "";
      if (process === "INJ") {
        return itemProcess === "INJ" || itemProcess === "IM";
      }
      return itemProcess === process;
    });

    // 筛选machine_info：索引0的元素等于process
    let filtered_machine_info = filteredMachineList.filter(row => {
      let rowProcess = row[0] ? row[0].toString().trim() : "";
      if (process === "INJ") {
        return rowProcess === "INJ" || rowProcess === "IM";
      }
      return rowProcess === process;
    });

    // 筛选origin_machine_info：索引0的元素等于process
    let filtered_origin_machine_info = data_MachineList.filter(row => {
      let rowProcess = row[0] ? row[0].toString().trim() : "";
      if (process === "INJ") {
        return rowProcess === "INJ" || rowProcess === "IM";
      }
      return rowProcess === process;
    });

    // 筛选pointCheckInfo：工序键值等于process
    let filtered_pointCheckInfo = obj_PointCheckInfo.filter(item => {
      let itemProcess = item["工序"] ? item["工序"].toString().trim() : "";
      if (process === "INJ") {
        return itemProcess === "INJ" || itemProcess === "IM";
      }
      return itemProcess === process;
    });
    
    
    // 筛选tasklist：索引14的元素等于process
    // 注：INJ和IM都对应注塑工序，需要同时匹配
    let filtered_tasklist = data_PointCheckTasklist.filter(row => {
      let rowProcess = row[14] ? row[14].toString().trim() : "";
      // 如果process是INJ，同时匹配INJ和IM
      if (process === "INJ") {
        return rowProcess === "INJ" || rowProcess === "IM";
      }
      // 其他工序直接匹配
      return rowProcess === process;
    });

    // ========== 获取该工序的所有历史点检记录的Code数据 ==========
    let allHistoricalRecords = [];

    if (USE_UNIFIED_INSPECTION_SHEET) {
      // 统一记录表：从 InspectionRecords 按工序过滤
      let ws_Records = ss_PointCheck.getSheetByName("InspectionRecords");
      if (ws_Records && ws_Records.getLastRow() > 1) {
        let data = ws_Records.getRange(2, 1, ws_Records.getLastRow() - 1, 17).getDisplayValues()
          .filter(row => {
            let rp = (row[2] || "").toString().trim().toUpperCase();
            return process === "INJ" ? (rp === "INJ" || rp === "IM") : rp === process;
          });
        data.forEach(row => {
          if (row[0] && row[0].toString().trim()) {
            let record = {
              Code: row[0] ? row[0].toString().trim() : "",
              Workshop: row[1] ? row[1].toString().trim() : "",
              MachineType: row[3] ? row[3].toString().trim() : "",
              SubmitDate: row[7] ? row[7].toString().trim() : "",
              Workcenter: row[8] ? row[8].toString().trim() : ""
            };
            allHistoricalRecords.push(record);
          }
        });
      }
    } else {
      // 旧逻辑：遍历所有 sheet 按前缀匹配
      let sheetNames = ss_PointCheck.getSheets().map(sheet => sheet.getName());
      sheetNames.forEach(sheetName => {
        if (sheetName.includes("-") && sheetName.startsWith(process + "-")) {
          let ws = ss_PointCheck.getSheetByName(sheetName);
          if (ws && ws.getLastRow() > 1) {
            let lastRow = ws.getLastRow();
            let data = ws.getRange(2, 1, lastRow - 1, 17).getDisplayValues();
            data.forEach(row => {
              if (row[0] && row[0].toString().trim()) {
                let record = {
                  Code: row[0] ? row[0].toString().trim() : "",
                  Workshop: row[1] ? row[1].toString().trim() : "",
                  MachineType: row[3] ? row[3].toString().trim() : "",
                  SubmitDate: row[7] ? row[7].toString().trim() : "",
                  Workcenter: row[8] ? row[8].toString().trim() : ""
                };
                allHistoricalRecords.push(record);
              }
            });
          }
        }
      });
    }

    // ========== 构建 workcenterOptions（INJ 工序：RBM/TBM 机台预计算） ==========
    if (process === "INJ") {
      // MachineList 机型映射（机台号 → 机型）
      var mlMachineTypeMap = {};
      data_MachineList.forEach(function(row) {
        var mc = row[3] ? row[3].toString().trim() : "";
        var mt = row[2] ? row[2].toString().trim() : "";
        if (mc) { if (!mlMachineTypeMap[mc]) mlMachineTypeMap[mc] = mt; }
      });

      // 当周已检查排除集合（机台号|机型）
      var excludedSet = {};
      excludedCombinations.forEach(function(combo) {
        if (combo.workcenter && combo.machineType) {
          excludedSet[combo.workcenter + "|" + combo.machineType] = true;
        }
      });

      var optionsMap = {};

      // 1. TBM：filtered_machine_info（已排除 RBM 机台）中的 INJ 机台
      // 用 机台号|机型 做 key，同一机台在不同机型下分别出现
      filtered_machine_info.forEach(function(row) {
        var mc = row[3] ? row[3].toString().trim() : "";
        var mt = row[2] ? row[2].toString().trim() : "";
        if (!mc) return;
        if (excludedSet[mc + "|" + mt]) return;
        var key = mc + "|" + mt;
        optionsMap[key] = { id: mc, text: mc, secondInfo: "", uniqueKey: mc, machineType: mt };
      });

      // 2. RBM：PointCheckInfo 非"已做"机台
      filtered_pointCheckInfo.forEach(function(item) {
        var mc = item["机台号"] ? item["机台号"].toString().trim() : "";
        var mt = item["机型"] ? item["机型"].toString().trim() : "";
        var status = item["是否已做"] ? item["是否已做"].toString().trim() : "";
        var yearWeek = item["年周"] ? item["年周"].toString().trim() : "";
        var startDate = item["开始日期"] ? FormatVariableToYMD(item["开始日期"]) : "";
        var startShift = item["开始班次"] ? item["开始班次"].toString().trim() : "";
        if (!mc) return;
        // 排除当周已检查
        if (excludedSet[mc + "|" + mt]) return;
        // 兜底：检查 allHistoricalRecords
        var pointCheckId = yearWeek + mc;
        var alreadySubmitted = allHistoricalRecords.some(function(rec) {
          var codeSuffix = rec.Code.length >= 9 ? rec.Code.substring(8) : "";
          return codeSuffix === pointCheckId && rec.MachineType === mt;
        });
        if (alreadySubmitted) return;

        var key, secondInfo, uniqueKey;
        if (status === "未做") {
          uniqueKey = mc + "_" + yearWeek;
          secondInfo = yearWeek + "_" + startDate + "_" + startShift;
        } else {
          uniqueKey = mc;
          secondInfo = "";
        }
        // 用 机台号|机型 做 map key，确保机型区分
        key = mc + "|" + mt;
        optionsMap[key] = { id: mc, text: mc, secondInfo: secondInfo, uniqueKey: uniqueKey, machineType: mt };
      });

      workcenterOptions = Object.keys(optionsMap).map(function(k) { return optionsMap[k]; });
    }

    var info = {
      machine_info: filtered_machine_info,
      user: data_userID,
      tasklist: filtered_tasklist,
      origin_machine_info: filtered_origin_machine_info,
      pointCheckInfo: filtered_pointCheckInfo,
      current_PointCheckInfo: filtered_current_PointCheckInfo,
      history_PointCheckInfo: filtered_history_PointCheckInfo,
      workcenter_list: workcenter_list,
      workcenterOptions: workcenterOptions,
      rbmMachineCodes: rbmMachineCodes,
      excludedCombinations: excludedCombinations,
      currentYearWeek: now_YearWeek,
      allHistoricalRecords: allHistoricalRecords,
    };
    
            
    let jsonString = JSON.stringify(info);
  
    return ["OK", jsonString];
  } catch (e) {
    return ["NO", "点检标准数据获取出错：" + e.toString()];
  }
}

/**============根据日期获取周次============**/
Date.prototype.getYearWeek = function () {
  /**截掉时分秒保留整数天**/
  let date = new Date(this || new Date());
  let year = date.getFullYear();
  
  /**找到当前日期所在周的周一**/
  let currentDay = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
  let daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // 周日需要向前6天，其他向前(currentDay-1)天
  let currentWeekMonday = new Date(date);
  currentWeekMonday.setDate(date.getDate() - daysToMonday);
  
  /**找到1月1日所在周的周一（第一周的起始）**/
  let firstDayOfYear = new Date(year, 0, 1);
  let firstDay = firstDayOfYear.getDay(); // 0=周日, 1=周一, ..., 6=周六
  let daysToFirstMonday = firstDay === 0 ? 6 : firstDay - 1; // 周日需要向前6天，其他向前(firstDay-1)天
  let firstWeekMonday = new Date(year, 0, 1);
  firstWeekMonday.setDate(1 - daysToFirstMonday);
  
  /**计算当前周周一和第一周周一之间的天数差**/
  let daysDiff = Math.floor((currentWeekMonday - firstWeekMonday) / 86400000);
  
  /**计算周数：周数差 + 1**/
  let weekNum = Math.floor(daysDiff / 7) + 1;
  weekNum = weekNum < 10 ? "0" + weekNum : weekNum;
  
  let yearWeek = year + "W" + weekNum;
  
  /**调试日志：输出年周计算过程**/
  console.log('📅 年周计算调试信息:', {
    '当前日期': date.toISOString().split('T')[0],
    '当前日期星期': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][currentDay],
    '当前周周一': currentWeekMonday.toISOString().split('T')[0],
    '1月1日星期': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][firstDay],
    '第一周周一': firstWeekMonday.toISOString().split('T')[0],
    '天数差': daysDiff,
    '周数': weekNum,
    '计算出的年周': yearWeek
  });
  
  return yearWeek;
};

function upload_PointCheck(obj, arrPmInfoJson) {
  try {
    let saasId = "1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY";
    let ss_PointCheck = SpreadsheetApp.openById(saasId);
    let SheetName = USE_UNIFIED_INSPECTION_SHEET
      ? "InspectionRecords"
      : obj.process + "-" + obj.workshop;
    let ws_PointCheckData = ss_PointCheck.getSheetByName(SheetName);
    let arrWsPointCheckNo = ws_PointCheckData
      .getRange(2, 1, ws_PointCheckData.getLastRow() - 1, 6)
      .getValues()
      .map((v) => {
        return v[0].toString() + v[3] + toString() + v[5].toString();
      });
    let position = arrWsPointCheckNo.indexOf(
      arrPmInfoJson[0].toString() +
        arrPmInfoJson[3].toString() +
        arrPmInfoJson[5].toString()
    );
    if (position == -1) {
      ws_PointCheckData.appendRow(arrPmInfoJson);
    } else {
      ws_PointCheckData
        .getRange(position + 2, 1, 1, arrPmInfoJson.length)
        .setValues([arrPmInfoJson]);
    }
    let arrToShift = obj.tableData.filter(function (x) {
      return x[11] == false;
    });
    if (arrToShift.length > 0) {
      // let ss_Shift = SpreadsheetApp.openById(
      //   "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w"
      // );
      // let shiftSheetName = "Shift_" + obj.process + "_" + obj.workshop;
      // let ws_Shift = ss_Shift.getSheetByName(shiftSheetName);
      let sabi_issueTrack = SpreadsheetApp.openById(
        "1nTPw4FFB278pQ0wOqgTaR_Yv8IV1vwrJIL9q4OJUG44"
      );
      let ws_SourceData = sabi_issueTrack.getSheetByName("源数据");
      let arrIssueTrackSourceData = ws_SourceData
        .getRange(1, 51, ws_SourceData.getLastRow(), 12)
        .getDisplayValues()
        .filter((v) => v[0] != "");
      let ws_Shift = sabi_issueTrack.getSheetByName("巡场提交记录");
      let arrShiftDataCode = ws_Shift
        .getRange(1, 1, ws_Shift.getLastRow(), 1)
        .getDisplayValues()
        .map((v) => {
          return v[0];
        });
      let arrShiftData = [];
      // for (let j = 0; j < arrToShift.length; j++) {
      //   arrShiftData.push([
      //     obj.code + arrToShift[j][0],
      //     arrPmInfoJson[9],
      //     arrPmInfoJson[8],
      //     arrToShift[j][10],
      //     "点检没有解决",
      //     "未解决",
      //     arrPmInfoJson[6],
      //     10,
      //     arrToShift[j][1] + "：" + arrToShift[j][2],
      //     "",
      //     arrPmInfoJson[6],
      //     arrPmInfoJson[7].toString().substr(0, 10),
      //     false,
      //     arrPmInfoJson[6],
      //     obj.workshop,
      //     obj.process,
      //     1,
      //     obj.machinetype,
      //     false,
      //     "",
      //     "",
      //     "Last",
      //   ]);
      // }
      let now = new Date();
      let nowDateTime = Utilities.formatDate(
        now,
        "Asia/Shanghai",
        "yyyy-MM-dd HH:mm:ss"
      );
      let nowYearMonth = Utilities.formatDate(now, "Asia/Shanghai", "yyyyMM");
      let nowDate = Utilities.formatDate(now, "Asia/Shanghai", "yyyy-MM-dd");
      let issueProcess = "";
      let issueSubProcess = "";
      for (let j = 0; j < arrToShift.length; j++) {
        if (obj.process == "INJ") {
          issueProcess = "注塑";
          issueSubProcess = "注塑";
        } else if (obj.process == "TF") {
          issueProcess = "植磨毛";
          if (
            arrPmInfoJson[7].substring(2, 4) == "US" ||
            arrPmInfoJson[7].substring(2, 4) == "AF" ||
            arrPmInfoJson[7].substring(2, 4) == "PT"
          ) {
            issueSubProcess = "AFT";
          } else {
            issueSubProcess = "TF";
          }
        } else if (obj.process == "PK") {
          issueProcess = "包装";
          issueSubProcess = "包装";
        } else {
          issueProcess = obj.process;
          issueSubProcess = obj.process;
        }
        arrShiftData.push([
          obj.code + arrToShift[j][0] /**随机码**/,
          nowDateTime /**时间戳**/,
          nowYearMonth /**月份**/,
          nowDate /**日期**/,
          "PointChecker【" + arrPmInfoJson[6] + "】" /**发现人**/,
          "问题标签" /**记录分类**/,
          obj.workshop + "车间" /**问题发现区域**/,
          issueProcess /**工序**/,
          arrPmInfoJson[9].charAt(0) /**班别**/,
          "点检" /**问题分类**/,
          arrPmInfoJson[5] /**标准分类**/,
          arrPmInfoJson[8] /**机台号**/,
          "" /**备注**/,
          "【" +
            arrToShift[j][1] +
            "_" +
            arrToShift[j][2] +
            "】" +
            arrToShift[j][10] /**发现项**/,
          arrToShift[j][12] == ""
            ? ""
            : "https://drive.google.com/file/d/" +
              arrToShift[j][12] +
              "/preview" /**图片**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "coordination",
            arrIssueTrackSourceData
          ) /**协调人**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "follower",
            arrIssueTrackSourceData
          ) /**跟进人**/,
          "" /**跟进措施**/,
          "" /**完成时间**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "verifier",
            arrIssueTrackSourceData
          ) /**关闭验证人**/,
          "" /**完成状态**/,
          "" /**验证时间**/,
          '=if(or(and(indirect("R"&row())="",today()>date(year(indirect("D"&row())),month(indirect("D"&row())),day(indirect("D"&row())))),and(indirect("R"&row())<>"",indirect("U"&row())<>"是",or(and(indirect("V"&row())="",today()>date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row())))),and(indirect("V"&row())<>"",date(year(indirect("V"&row())),month(indirect("V"&row())),day(indirect("V"&row())))<date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row()))))))),"超时",if(or(and(indirect("R"&row())="",today()=date(year(indirect("D"&row())),month(indirect("D"&row())),day(indirect("D"&row())))),and(indirect("R"&row())<>"",indirect("U"&row())<>"是",or(and(indirect("V"&row())="",today()<=date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row())))),and(indirect("V"&row())<>"",date(year(indirect("V"&row())),month(indirect("V"&row())),day(indirect("V"&row())))>=date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row()))))))),"未完成",if(and(indirect("R"&row())<>"",indirect("U"&row())="是"),"已完成","")))' /**问题状态**/,
          "" /**跟进照片**/,
          issueSubProcess /**子工序**/,
          "" /**Kaizen**/,
          "" /**是否单现**/,
        ]);
      }
      if (arrShiftData.length > 0) {
        let positionShift = -1;
        for (let j = 0; j < arrShiftData.length; j++) {
          positionShift = arrShiftDataCode.indexOf(
            arrShiftData[j][0].toString()
          );
          if (positionShift == -1) {
            ws_Shift.appendRow(arrShiftData[j]);
          } else {
            ws_Shift
              .getRange(positionShift + 1, 1, 1, arrShiftData[j].length)
              .setValues([arrShiftData[j]]);
          }
        }
      }
    }
    return ["OK", true];
  } catch (e) {
    return ["NO", "点检数据保存失败：" + e.toString()];
  }
}

function submitInspectionResults(obj, arrPmInfoJson) {
  console.log("🚀 submitInspectionResults 开始执行");
  console.log("📊 接收到的数据:", {
    code: obj.code,
    workshop: obj.workshop,
    process: obj.process,
    machinetype: obj.machinetype,
    frequency: obj.frequency,
    pointChecker: obj.pointChecker,
    ownner: obj.ownner,
    date: obj.date,
    workcenter: obj.workcenter,
    checkTeam: obj.checkTeam,
    tableDataLength: obj.tableData ? obj.tableData.length : 0,
    arrPmInfoJsonLength: arrPmInfoJson.length,
    useSelectionYearWeek: obj.useSelectionYearWeek,
    yearWeekFromSelection: obj.yearWeekFromSelection,
  });

  try {
    // ========== 基于红色标题判断：使用选择的年周或提交日期的年周 ==========
    if (obj.useSelectionYearWeek && obj.yearWeekFromSelection) {
      let now = new Date();
      let dateStr = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0');
      let newCode = dateStr + obj.yearWeekFromSelection + obj.workcenter;
      arrPmInfoJson[0] = newCode;
      console.log("🔄 使用红色标题年周生成Code:", {
        原Code: obj.code,
        新Code: newCode,
        年周来源: "红色标题 (secondInfo)"
      });
    } else {
      console.log("✅ 使用提交日期年周生成Code (原有逻辑)");
    }
    
    console.log("📝 步骤1: 打开主数据表");
    let saasId = "1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY";
    let ss_PointCheck = SpreadsheetApp.openById(saasId);
    let SheetName = USE_UNIFIED_INSPECTION_SHEET
      ? "InspectionRecords"
      : obj.process + "-" + obj.workshop;
    console.log("📋 Sheet名称:", SheetName);
    let ws_PointCheckData = ss_PointCheck.getSheetByName(SheetName);
    console.log("📝 步骤2: 检查现有记录");
    let arrWsPointCheckNo = ws_PointCheckData
      .getRange(2, 1, ws_PointCheckData.getLastRow() - 1, 6)
      .getValues()
      .map((v) => {
        return v[0].toString() + v[3] + toString() + v[5].toString();
      });
    let position = arrWsPointCheckNo.indexOf(
      arrPmInfoJson[0].toString() +
        arrPmInfoJson[3].toString() +
        arrPmInfoJson[5].toString()
    );
    console.log("🔍 查找位置结果:", position);

    if (position == -1) {
      console.log("📝 步骤3: 新增记录");
      ws_PointCheckData.appendRow(arrPmInfoJson);
      console.log("✅ 主数据表记录已新增");
    } else {
      console.log("📝 步骤3: 更新记录 (位置:", position + 2, ")");
      ws_PointCheckData
        .getRange(position + 2, 1, 1, arrPmInfoJson.length)
        .setValues([arrPmInfoJson]);
      console.log("✅ 主数据表记录已更新");
    }
    console.log("📝 步骤4: 处理未解决异常");
    console.log("🔍 原始tableData样本:", obj.tableData.slice(0, 3)); // 显示前3条记录
    let arrToShift = obj.tableData.filter(function (x) {
      console.log("🔍 检查记录:", {
        taskNo: x[0],
        checkStatus: x[9], // 检查状态
        remarks: x[10], // 备注
        resolved: x[11], // 是否解决
        photoId: x[12], // 图片ID
      });
      // 只有异常且未解决的任务才写入巡查记录
      return x[9].includes("异常") && x[11].includes("否");
    });
    console.log("🔍 未解决异常数量:", arrToShift.length);
    console.log("🔍 过滤后的arrToShift:", arrToShift);
    if (arrToShift.length > 0) {
      console.log("📝 步骤5: 写入问题跟踪系统");
      let sabi_issueTrack = SpreadsheetApp.openById(
        "1nTPw4FFB278pQ0wOqgTaR_Yv8IV1vwrJIL9q4OJUG44"
      );
      let ws_SourceData = sabi_issueTrack.getSheetByName("源数据");
      let arrIssueTrackSourceData = ws_SourceData
        .getRange(1, 51, ws_SourceData.getLastRow(), 12)
        .getDisplayValues()
        .filter((v) => v[0] != "");
      let ws_Shift = sabi_issueTrack.getSheetByName("巡场提交记录");
      let arrShiftDataCode = ws_Shift
        .getRange(1, 1, ws_Shift.getLastRow(), 1)
        .getDisplayValues()
        .map((v) => {
          return v[0];
        });
      let arrShiftData = [];
      let now = new Date();
      let nowDateTime = Utilities.formatDate(
        now,
        "Asia/Shanghai",
        "yyyy-MM-dd HH:mm:ss"
      );
      let nowYearMonth = Utilities.formatDate(now, "Asia/Shanghai", "yyyyMM");
      let nowDate = Utilities.formatDate(now, "Asia/Shanghai", "yyyy-MM-dd");
      let issueProcess = "";
      let issueSubProcess = "";
      for (let j = 0; j < arrToShift.length; j++) {
        if (obj.process == "INJ") {
          issueProcess = "注塑";
          issueSubProcess = "注塑";
        } else if (obj.process == "TF") {
          issueProcess = "植磨毛";
          if (
            arrPmInfoJson[7].substring(2, 4) == "US" ||
            arrPmInfoJson[7].substring(2, 4) == "AF" ||
            arrPmInfoJson[7].substring(2, 4) == "PT"
          ) {
            issueSubProcess = "AFT";
          } else {
            issueSubProcess = "TF";
          }
        } else if (obj.process == "PK") {
          issueProcess = "包装";
          issueSubProcess = "包装";
        } else {
          issueProcess = obj.process;
          issueSubProcess = obj.process;
        }
        arrShiftData.push([
          obj.code + arrToShift[j][0] /**随机码**/,
          nowDateTime /**时间戳**/,
          nowYearMonth /**月份**/,
          nowDate /**日期**/,
          "PointChecker【" + arrPmInfoJson[6] + "】" /**发现人**/,
          "问题标签" /**记录分类**/,
          obj.workshop + "车间" /**问题发现区域**/,
          issueProcess /**工序**/,
          arrPmInfoJson[9].charAt(0) /**班别**/,
          "点检" /**问题分类**/,
          arrPmInfoJson[5] /**标准分类**/,
          arrPmInfoJson[8] /**机台号**/,
          "" /**备注**/,
          "【" +
            arrToShift[j][1] +
            "_" +
            arrToShift[j][2] +
            "】" +
            arrToShift[j][10] /**发现项**/,
          arrToShift[j][12] == ""
            ? ""
            : "https://drive.google.com/file/d/" +
              arrToShift[j][12] +
              "/preview" /**图片**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "coordination",
            arrIssueTrackSourceData
          ) /**协调人**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "follower",
            arrIssueTrackSourceData
          ) /**跟进人**/,
          "" /**跟进措施**/,
          "" /**完成时间**/,
          getCFV(
            arrPmInfoJson[2],
            arrPmInfoJson[3],
            arrPmInfoJson[5],
            arrPmInfoJson[1],
            arrPmInfoJson[9].charAt(0),
            "verifier",
            arrIssueTrackSourceData
          ) /**关闭验证人**/,
          "" /**完成状态**/,
          "" /**验证时间**/,
          '=if(or(and(indirect("R"&row())="",today()>date(year(indirect("D"&row())),month(indirect("D"&row())),day(indirect("D"&row())))),and(indirect("R"&row())<>"",indirect("U"&row())<>"是",or(and(indirect("V"&row())="",today()>date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row())))),and(indirect("V"&row())<>"",date(year(indirect("V"&row())),month(indirect("V"&row())),day(indirect("V"&row())))<date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row()))))))),"超时",if(or(and(indirect("R"&row())="",today()=date(year(indirect("D"&row())),month(indirect("D"&row())),day(indirect("D"&row())))),and(indirect("R"&row())<>"",indirect("U"&row())<>"是",or(and(indirect("V"&row())="",today()<=date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row())))),and(indirect("V"&row())<>"",date(year(indirect("V"&row())),month(indirect("V"&row())),day(indirect("V"&row())))>=date(year(indirect("S"&row())),month(indirect("S"&row())),day(indirect("S"&row()))))))),"正常",""))' /**状态**/,
          "" /**跟进照片**/,
          issueSubProcess /**子工序**/,
          "" /**Kaizen**/,
          "" /**是否单现**/,
        ]);
      }
      if (arrShiftData.length > 0) {
        let positionShift = -1;
        for (let j = 0; j < arrShiftData.length; j++) {
          positionShift = arrShiftDataCode.indexOf(
            arrShiftData[j][0].toString()
          );
          if (positionShift == -1) {
            ws_Shift.appendRow(arrShiftData[j]);
          } else {
            ws_Shift
              .getRange(positionShift + 1, 1, 1, arrShiftData[j].length)
              .setValues([arrShiftData[j]]);
          }
        }
      }
      console.log("✅ 问题跟踪系统写入完成");
    } else {
      console.log("ℹ️ 无未解决异常，跳过问题跟踪系统");
    }

    console.log("🎉 submitInspectionResults 执行完成，准备返回成功结果");
    return ["OK", true];
  } catch (e) {
    console.error("❌ submitInspectionResults 执行失败:", e.toString());
    return ["NO", "点检数据保存失败：" + e.toString()];
  }
}

function getCFV(
  process,
  machineType,
  pointChecker,
  workshop,
  team,
  CFV,
  arrIssueTrackSourceData
) {
  let result = "";
  let arrTemp = [];
  if (CFV == "coordination") {
    arrTemp = arrIssueTrackSourceData.filter(
      (v) =>
        v[0] == process &&
        v[1] == machineType &&
        v[4] == pointChecker &&
        v[5] == workshop &&
        v[6] == team
    );
    if (arrTemp.length < 1) {
      arrTemp = arrIssueTrackSourceData.filter(
        (v) =>
          v[0] == process &&
          v[1] == machineType &&
          v[4] == pointChecker &&
          v[5] == workshop &&
          v[6] == ""
      );
    }
    if (arrTemp.length > 0) {
      result = arrTemp[0][7];
    }
    if (result == "") {
      if (process == "INJ") {
        result = "俞平【ping_yu@colpal.com】";
      } else if (process == "TF") {
        result = "朱桂香【guixiang_zhu@colpal.com】";
      } else if (process == "PK") {
        result = "陈所根【suogen_chen@colpal.com】";
      } else {
        result = "张俊【jin_zhang@colpal.com】";
      }
    }
  } else if (CFV == "follower") {
    arrTemp = arrIssueTrackSourceData.filter(
      (v) =>
        v[0] == process &&
        v[1] == machineType &&
        v[4] == pointChecker &&
        v[5] == workshop &&
        v[8] == team
    );
    if (arrTemp.length < 1) {
      arrTemp = arrIssueTrackSourceData.filter(
        (v) =>
          v[0] == process &&
          v[1] == machineType &&
          v[4] == pointChecker &&
          v[5] == workshop &&
          v[8] == ""
      );
    }
    if (arrTemp.length > 0) {
      result = arrTemp[0][9];
    }
  } else if (CFV == "verifier") {
    arrTemp = arrIssueTrackSourceData.filter(
      (v) =>
        v[0] == process &&
        v[1] == machineType &&
        v[4] == pointChecker &&
        v[5] == workshop &&
        v[10] == team
    );
    if (arrTemp.length < 1) {
      arrTemp = arrIssueTrackSourceData.filter(
        (v) =>
          v[0] == process &&
          v[1] == machineType &&
          v[4] == pointChecker &&
          v[5] == workshop &&
          v[10] == ""
      );
    }
    if (arrTemp.length > 0) {
      result = arrTemp[0][11];
    }
  }
  return result;
}

function getTaskCheckList(task, years, workshop, process) {
  try {
    let sabiShiftId = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    let sabiShift = SpreadsheetApp.openById(sabiShiftId);
    let sbnHistoryTaskInfo = sabiShift.getSheetByName("HistoryTaskInfo");
    let arrHistoryTaskInfo = sbnHistoryTaskInfo
      .getRange(2, 1, sbnHistoryTaskInfo.getLastRow() - 1, 3)
      .getDisplayValues();
    let arrCheckInfo = arrHistoryTaskInfo.filter((v) => {
      return v[0] == task && v[1] == years;
    });
    let arrTaskInfo = [];
    if (arrCheckInfo.length > 0) {
      let sabiTempId = arrCheckInfo[0][2];
      let sabiTemp = SpreadsheetApp.openById(sabiTempId);
      let sbnTemp = sabiTemp.getSheetByName(process + "-" + workshop);
      arrTaskInfo = sbnTemp
        .getRange(1, 1, sbnTemp.getLastRow(), sbnTemp.getLastColumn())
        .getDisplayValues();
    }
    if (arrTaskInfo.length > 0) {
      return ["OK", arrTaskInfo];
    } else {
      return ["NO", "未找到任务数据"];
    }
  } catch (e) {
    return ["NO", "任务检索获取出错：" + toString()];
  }
}

/*===========================上传图片===================*/
function uploadPhotoFileToGoogleDrive(data, file) {
  try {
    let filename = file;
    let folder = DriveApp.getFolderById("169dHfYMS_lFvnVTj2GeWZxQaepNl21Lh");
    let files = folder.getFilesByName(filename);
    while (files.hasNext()) {
      let file_next = files.next();
      file_next.setTrashed(true);
    }
    let contentType = data.substring(5, data.indexOf(";"));
    if (!contentType.match("image")) {
      return "你选择的不是图片文件";
    }
    let bytes = Utilities.base64Decode(
      data.substr(data.indexOf("base64,") + 7)
    );
    let blob = Utilities.newBlob(bytes, contentType, file).setName(filename);
    let fileid = folder.createFile(blob).getId();
    return fileid;
  } catch (f) {
    return "错误：" + f.toString();
  }
}

/*=============================Kelland Test=====================*/
function test() {
  var id = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
  var ss = SpreadsheetApp.openById(id);
  var ws = ss.getSheetByName("PM Tasklist");
  var value = ws.getSheetValues(1, 1, ws.getLastRow(), ws.getLastColumn());
  var id_2 = "1-c07DLZP6ntxNkty5pnkQ-Bb6EtP34GyRTQ_dIqTAeQ";
  var ss = SpreadsheetApp.openById(id_2);
  var ws = ss.getSheetByName("Sheet1");
  var arrays = new Array(); //创建数组
  for (var i = 1; i < value.length; i++) {
    var tasklist = {}; //创建对象
    for (var j = 0; j < value[i].length; j++) {
      tasklist[value[0][j]] = value[i][j];
    }
    arrays.push(tasklist);
  }
  console.log(arrays[0]);
  // console.log(JSON.stringify(arrays)) //JSON.stringify 是将JS对象转换为字符串
  ws.getRange(1, 1).setValue(JSON.stringify(arrays));
}

function getUserMail() {
  let gmail = Session.getActiveUser().getEmail();
  return gmail;
}

function uploadPhotoFileToGoogleDrive_Handover(data, file) {
  try {
    let filename = file;
    // let folder = DriveApp.getFolderById("169dHfYMS_lFvnVTj2GeWZxQaepNl21Lh");
    let folder = DriveApp.getFolderById("105g7IX8yQ1TXugpJNrUVfVPneZrsOjmh");
    let files = folder.getFilesByName(filename);
    while (files.hasNext()) {
      let file_next = files.next();
      file_next.setTrashed(true);
    }
    let contentType = data.substring(5, data.indexOf(";"));
    if (!contentType.match("image")) {
      return "你选择的不是图片文件";
    }
    let bytes = Utilities.base64Decode(
      data.substr(data.indexOf("base64,") + 7)
    );
    let blob = Utilities.newBlob(bytes, contentType, file).setName(filename);
    let fileid = folder.createFile(blob).getId();
    return fileid;
  } catch (f) {
    return "错误：" + f.toString();
  }
}

/*===========================Inspection2.0图片上传===================*/
function uploadPhotoFileToGoogleDrive_Inspection2(data, file) {
  try {
    let filename = file;
    let folder = DriveApp.getFolderById("169dHfYMS_lFvnVTj2GeWZxQaepNl21Lh");
    let files = folder.getFilesByName(filename);
    while (files.hasNext()) {
      let file_next = files.next();
      file_next.setTrashed(true);
    }
    let contentType = data.substring(5, data.indexOf(";"));
    if (!contentType.match("image")) {
      return "你选择的不是图片文件";
    }
    let bytes = Utilities.base64Decode(
      data.substr(data.indexOf("base64,") + 7)
    );
    let blob = Utilities.newBlob(bytes, contentType, file).setName(filename);
    let fileid = folder.createFile(blob).getId();
    return fileid;
  } catch (f) {
    return "错误：" + f.toString();
  }
}

function getAllshiftData() {
  try {
  var id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  var ss = SpreadsheetApp.openById(id);
  var wsMerged = getShiftSheet(ss);
  var lr = wsMerged.getLastRow();
  var lc = wsMerged.getLastColumn();
  return { Head: [], Content: [], _v: 'lr-' + lr + '-lc-' + lc };
  } catch(e) {
    return { Head: [], Content: [], _v: 'catch-' + String(e).substring(0,40) };
  }
}

function getShiftRowsByPrefix(prefix) {
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let ss = SpreadsheetApp.openById(id);
  var head, content;
  if (USE_MERGED_SHIFT_SHEET) {
    var wsMerged = getShiftSheet(ss);
    if (wsMerged && wsMerged.getLastRow() > 1) {
      head = wsMerged.getRange(1, 1, 1, wsMerged.getLastColumn()).getValues()[0];
      content = wsMerged.getRange(2, 1, wsMerged.getLastRow() - 1, wsMerged.getLastColumn()).getValues();
    } else {
      head = [];
      content = [];
    }
  } else {
    var sheetName = [
      "Shift_INJ_TB1",
      "Shift_INJ_TB2",
      "Shift_TF_TB1",
      "Shift_TF_TB2",
      "Shift_PK_TB1",
      "Shift_PK_TB2",
    ];
    head = ss
      .getSheetByName(sheetName[0])
      .getRange(1, 1, 1, ss.getSheetByName(sheetName[0]).getLastColumn())
      .getValues()[0];
    content = [];
    sheetName.forEach(function(name) {
      var ws = ss.getSheetByName(name);
      var lastRow = ws.getLastRow();
      if (lastRow > 1) {
        var values = ws
          .getRange(2, 1, lastRow - 1, ws.getLastColumn())
          .getValues();
        content = content.concat(values);
      }
    });
  }

  // 按编号前缀筛选（prefix 如 "20260215"）
  let filtered = content.filter((row) => {
    let code = (row[head.indexOf("编号")] || "").toString().trim();
    return code.startsWith(prefix);
  });

  let contentArray = filtered.map((row) => {
    let contentObj = {};
    head.forEach((columnName, index) => {
      contentObj[columnName] = row[index];
    });
    return contentObj;
  });

  contentArray.forEach((r) => {
    if (r["提交日期"] && typeof r["提交日期"].toISOString === 'function') {
      r["提交日期"] = r["提交日期"].toISOString();
    } else {
      r["提交日期"] = r["提交日期"] || '';
    }
  });

  console.log("getShiftRowsByPrefix prefix:", prefix, "rows:", contentArray.length);
  return { Head: head, Content: contentArray };
}

function getIDinfo() {
  let saasId = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
  let ss = SpreadsheetApp.openById(saasId);
  let ws = ss.getSheetByName("userID");
  let data = ws.getRange(3, 1, ws.getLastRow() - 2, 16).getValues();
  // let head = ws.getRange(1, 1, 2, 16).getDisplayValues();
  let array = [];
  data.forEach((r) => {
    let obj = {
      ID: r[0],
      Name: r[1],
      PWD: r[2],
      Workshop: r[13],
      Process: r[14],
    };
    array.push(obj);
  });
  console.log(array);
  return array;
}

function getFailureProcessConfigData() {
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let ss = SpreadsheetApp.openById(id);
  let ws = ss.getSheetByName("故障处理选项设置");

  let lastRow = ws.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getDisplayValues()[0];
  let data = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getDisplayValues();

  let descriptionIdx = headers.indexOf("Description");
  let processIdx = headers.indexOf("Process");
  let placeholderIdx = headers.indexOf("Placeholder");
  let remarkIdx = headers.indexOf("Remark");

  let result = [];
  data.forEach((r) => {
    let description = descriptionIdx > -1 ? r[descriptionIdx] : "";
    let process = processIdx > -1 ? r[processIdx] : "";
    let placeholder = placeholderIdx > -1 ? r[placeholderIdx] : "";
    let remark = remarkIdx > -1 ? r[remarkIdx] : "";

    if (description !== "" && process !== "") {
      result.push({
        Description: description,
        Process: process,
        Placeholder: placeholder,
        Remark: remark,
      });
    }
  });

  return result;
}

function SelectItem() {
  // 从 Workcenter_V202602 工作表获取机台号数据
  let id = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
  let ss = SpreadsheetApp.openById(id);
  let ws = ss.getSheetByName("Workcenter_V202602");
  
  // 获取 A、B、C 列数据（机台号、车间、工序）
  let workcenterData = ws.getRange(2, 1, ws.getLastRow() - 1, 3).getValues();
  
  let WORKCENTER = [];
  let seen = {};
  workcenterData.forEach((r) => {
    if (r[0] !== "") {  // 确保机台号不为空
      let obj = {};
      obj.workcenter = r[0];  // A列：机台号
      obj.workshop = r[1];     // B列：车间（TB1/TB2）
      obj.process = r[2];      // C列：工序（INJ/IM/TF/PK）
      WORKCENTER.push(obj);
      seen[String(r[0]).trim()] = true;
    }
  });

  // 从 Workcenter_手动维护 工作表获取手动维护的机台号
  let wsManual = ss.getSheetByName("Workcenter_手动维护");
  if (wsManual) {
    let manualData = wsManual.getRange(2, 1, wsManual.getLastRow() - 1, 3).getValues();
    manualData.forEach((r) => {
      if (r[0] !== "" && !seen[String(r[0]).trim()]) {
        let obj = {};
        obj.workcenter = r[0];
        obj.workshop = r[1];
        obj.process = r[2];
        WORKCENTER.push(obj);
        seen[String(r[0]).trim()] = true;
      }
    });
  }
  // console.log(WORKCENTER);
  id = "1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM";
  ss = SpreadsheetApp.openById(id);
  ws = ss.getSheetByName("userID");
  let data = ws.getRange(3, 2, ws.getLastRow() - 2, 15).getValues();
  let name = [];
  data.forEach((r) => {
    let obj = {};
    obj.name = r[0];
    obj.workshop = r[12];
    obj.process = r[13];
    obj.title = r[14];
    name.push(obj);
  });

  // 新的故障代码数据源
  id = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
  ss = SpreadsheetApp.openById(id);
  ws = ss.getSheetByName("errorCode 2.0");
  let errorCode_data = ws
    .getRange(2, 1, ws.getLastRow() - 1, 5)
    .getDisplayValues();

  let errorCode = [];
  errorCode_data.forEach((r) => {
    let obj = {};
    obj.Process = r[0]; // Process列
    obj.Machine_Type = r[1]; // Machine_Type列
    obj.UPDT_English = r[2]; // UPDT (English)列
    obj.UPDT_Local = r[3]; // UPDT (Local Language)列
    obj.Downtime_Driver = r[4]; // Downtime Driver列
    errorCode.push(obj);
  });
  let result = [WORKCENTER, name, errorCode];

  console.log(errorCode);
  return result;
  // console.log(workcenter, workcenter.length)
}

function checkSecondCharacter(str) {
  if (str[1] === "0" || str[1] === "1") {
    return "TB1";
  } else if (str[1] === "2") {
    return "TB2";
  } else {
    return "error";
  }
}

function submitFailure(obj) {
  try {
    let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
    let ss = SpreadsheetApp.openById(id);
    var process = obj["工序"];
    var workshop = obj["车间"];
    let ws = getShiftSheet(ss) || ss.getSheetByName("Shift_" + process + "_" + workshop);
    let isMerged = USE_MERGED_SHIFT_SHEET && ws.getName() === SHIFT_RECORDS_SHEET_NAME;

    // console.log("先前编号", obj["先前编号"]);
    if (obj["先前编号"] !== "") {
      var matchingRow = -1;
      if (isMerged) {
        matchingRow = findRowByShiftCode(ws, obj["先前编号"], process, workshop);
      } else {
        let firstColumnRange = ws.getRange(1, 1, ws.getLastRow(), 1);
        let firstColumnValues = firstColumnRange.getValues();
        for (let i = 0; i < firstColumnValues.length; i++) {
          if (String(firstColumnValues[i][0]) === String(obj["先前编号"])) {
            matchingRow = i + 1; // 因为数组索引从0开始，而行号从1开始
            break;
          }
        }
      }
      // console.log("先前行号", matchingRow);
      if (matchingRow !== -1) {
        ws.getRange(matchingRow, 6).setValue("已解决/ Solved"); // 第F列是第6列
      }
    }

    // 判断是否需要填写故障报告（按工序阈值）：
    // IM 维修时间 < 240min → 填“否”
    // TF 维修时间 < 120min → 填“否”
    // PK 维修时间 < 60min  → 填“否”
    // 其他情况 → 填空值
    let maintenanceTime = parseFloat(obj["维修时间"]);
    let processForJudge = (obj["工序"] || "").toString().trim();
    if (processForJudge === "INJ") processForJudge = "IM"; // INJ/IM 视为同一工序口径

    obj["是否需要填写故障报告"] = "";
    if (!isNaN(maintenanceTime)) {
      if (processForJudge === "IM" && maintenanceTime < 240) {
        obj["是否需要填写故障报告"] = "否";
      } else if (processForJudge === "TF" && maintenanceTime < 120) {
        obj["是否需要填写故障报告"] = "否";
      } else if (processForJudge === "PK" && maintenanceTime < 60) {
        obj["是否需要填写故障报告"] = "否";
      }
    }

    var failureRowData = [
      obj["编号"],
      obj["班次"],
      obj["机台号"],
      obj["问题描述"],
      obj["处理过程"],
      obj["状态"],
      obj["维修人"],
      obj["维修时间"],
      obj["故障代码"],
      obj["工单号"],
      obj["交接人"],
      obj["提交日期"],
      obj["是否转保养"],
      obj["填写人"],
      obj["车间"],
      obj["工序"],
      obj["参与人数"],
      obj["机型"],
      obj["是否已安排PM跟进"],
      obj["是否需要填写故障报告"],
      obj["是否跟随"],
      obj["判断是否最后"],
      obj["直接原因"] || "",
      obj["建议措施"] || "",
    ];
    ws.appendRow(failureRowData);

    return ["OK", true];
  } catch (e) {
    return ["NO", "交接班数据保存出错：" + e.toString()];
  }
}

function saveVerifyOpcRow(TrData) {
  try {
    let sabiRecord = SpreadsheetApp.openById(
      "1_ML5OefjalevT_3P6tEtwms_QbPdHBC3yn2DElGRqDw"
    );
    let sbnRecord = sabiRecord.getSheetByName("Record");
    sbnRecord.appendRow(TrData[0]);
    return ["OK", "成功"];
  } catch (e) {
    return ["NO", e.toString()];
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    // 解码base64数据
    var decodedData = Utilities.base64Decode(base64Data);
    // 创建Blob对象
    var blob = Utilities.newBlob(decodedData, mimeType, fileName);

    // 指定Google Drive中的文件夹ID
    var folderId = "105g7IX8yQ1TXugpJNrUVfVPneZrsOjmh"; // 替换为你的文件夹ID
    var folder = DriveApp.getFolderById(folderId);

    // 在指定的文件夹中创建文件
    var file = folder.createFile(blob);

    // 返回文件的URL，或者其他你需要的信息
    return file.getUrl();
  } catch (error) {
    // 如果出现错误，返回错误信息
    return "Error: " + error.toString();
  }
}

function get_Tasklist_new() {
  try {
    let id_tasklist = "1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U";
    let ss = SpreadsheetApp.openById(id_tasklist);
    let ws = ss.getSheetByName("Tasklist_history");
    let data = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getValues();
    let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    // 列索引: Status = M (index 12)
    const statusIdx = head.indexOf("Status");
    const validStatuses = ["生效/ Effective", "待审批/ Pending", "待发放/ Wait for Dissminater"];
    let array = [];
    data.forEach((r) => {
      // 后端预过滤：仅返回前端实际使用的状态，减少 ~70% 数据传输量
      if (statusIdx >= 0) {
        const s = String(r[statusIdx] || "").trim();
        if (!validStatuses.some(function (vs) { return s === vs; })) return;
      }
      let obj = {};
      head.forEach((h, i) => {
        obj[h] = r[i];
      });
      array.push(obj);
    });

    return array;
  } catch (e) {
    Logger.log("get_Tasklist_new 发生错误: " + e.toString());
    return ["NO", "报错：" + e.toString()];
  }
}

function saveData_tasklist(data, confirmUser) {
  try {
    let id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    let ss = SpreadsheetApp.openById(id);
    let sheetName = data["SheetName"];
    var process = data["工序"];
    var workshop = data["车间"];
    let ws = getPMSheet(ss) || ss.getSheetByName(sheetName);
    let isMerged = USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME;
    let Status = data["Status"];
    let pmNo = data["PM No."];
    let lastRow = ws.getLastRow();
    let range = ws.getRange(1, 1, lastRow, 1); // 获取第一列的所有数据
    let values = range.getValues();

    // 查找 PM No. 在第一列中的行号
    let rowNumber = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === pmNo) {
        rowNumber = i + 1; // 因为数组索引从0开始，而行号从1开始
        break;
      }
    }

    if (Status == "Start") {
      if (rowNumber !== -1) {
        ws.getRange(rowNumber, 2).setValue(data["PmStatus"]);
        ws.getRange(rowNumber, 3).setValue(data["Notification"]);
        ws.getRange(rowNumber, 4).setValue(data["PM People"]);
        ws.getRange(rowNumber, 5).setValue(data["Plan PM Date"]);
        ws.getRange(rowNumber, 6).setValue(data["SatrtDate"]);
        ws.getRange(rowNumber, 7).setValue(data["StartTime"]);
        ws.getRange(rowNumber, 8).setValue(data["EndDate"]);
        ws.getRange(rowNumber, 9).setValue(data["EndTime"]);
        ws.getRange(rowNumber, 10).setValue(data["Workcenter"]);
        ws.getRange(rowNumber, 11).setValue(data["任务明细"]);
        if (isMerged) {
          ws.getRange(rowNumber, 22).setValue(process);
          ws.getRange(rowNumber, 23).setValue(workshop);
        }
      } else {
        var newRowData = [
          data["PM No."],
          data["PmStatus"],
          data["Notification"],
          data["PM People"],
          data["Plan PM Date"],
          data["SatrtDate"],
          data["StartTime"],
          data["EndDate"],
          data["EndTime"],
          data["Workcenter"],
          data["任务明细"],
        ];
        ws.appendRow(newRowData);
        if (isMerged) {
          var newRow = ws.getLastRow();
          ws.getRange(newRow, 22).setValue(process);
          ws.getRange(newRow, 23).setValue(workshop);
        }
      }
    } else if (Status == "End" && rowNumber !== -1) {
      let endDateColumn = 8; // 假设 EndDate 在第8列
      let endTimeColumn = 9; // 假设 EndTime 在第9列
      let taskDetailColumn = 11; // 假设 任务明细 在第11列
      let taskCountColumn = 12; // 假设 任务明细 在第12列
      let UncheckedTasksColumn = 13; // 未完成的任务
      let UncheckedCountColumn = 14; // 未完成的任务数量
      let NonEmptyNotesTasksColumn = 15; // 备注不为空的任务
      let NonEmptyNotesCountColumn = 16; // 备注不为空的任务数量
      let confirmInfoColumn = 20; // T列：确认人和提交时间

      ws.getRange(rowNumber, endDateColumn).setValue(data["EndDate"]);
      ws.getRange(rowNumber, endTimeColumn).setValue(data["EndTime"]);
      ws.getRange(rowNumber, taskDetailColumn).setValue(data["任务明细"]);
      ws.getRange(rowNumber, taskCountColumn).setValue(data["TaskCount"]);

      ws.getRange(rowNumber, UncheckedTasksColumn).setValue(
        data["UncheckedTasks"]
      );
      ws.getRange(rowNumber, UncheckedCountColumn).setValue(
        data["UncheckedCount"]
      );
      ws.getRange(rowNumber, NonEmptyNotesTasksColumn).setValue(
        data["NonEmptyNotesTasks"]
      );
      ws.getRange(rowNumber, NonEmptyNotesCountColumn).setValue(
        data["NonEmptyNotesCount"]
      );
      ws.getRange(rowNumber, 2).setValue(data["PmStatus"]);

      // 新增：在T列写入确认人和提交时间（仅当提供确认人时）
      if (confirmUser) {
        let now = new Date();
        let confirmDateTime = Utilities.formatDate(
          now,
          "Asia/Shanghai",
          "yyyy-MM-dd HH:mm:ss"
        );
        let confirmInfo = `${confirmDateTime} confirmed by: ${confirmUser}`;
        ws.getRange(rowNumber, confirmInfoColumn).setValue(confirmInfo);
      }
    } else if (Status == "Ongoing") {
      let taskDetailColumn = 11; // 假设 任务明细 在第11列
      let taskCountColumn = 12; // 假设 任务明细 在第12列
      let UncheckedTasksColumn = 13; // 未完成的任务
      let UncheckedCountColumn = 14; // 未完成的任务数量
      let NonEmptyNotesTasksColumn = 15; // 备注不为空的任务
      let NonEmptyNotesCountColumn = 16; // 备注不为空的任务数量
      let confirmInfoColumn = 20; // T列：确认人和提交时间

      ws.getRange(rowNumber, taskDetailColumn).setValue(data["任务明细"]);
      ws.getRange(rowNumber, taskCountColumn).setValue(data["TaskCount"]);

      ws.getRange(rowNumber, UncheckedTasksColumn).setValue(
        data["UncheckedTasks"]
      );
      ws.getRange(rowNumber, UncheckedCountColumn).setValue(
        data["UncheckedCount"]
      );
      ws.getRange(rowNumber, NonEmptyNotesTasksColumn).setValue(
        data["NonEmptyNotesTasks"]
      );
      ws.getRange(rowNumber, NonEmptyNotesCountColumn).setValue(
        data["NonEmptyNotesCount"]
      );
      ws.getRange(rowNumber, 2).setValue(data["PmStatus"]);
    } else {
      return "PM No. not found";
    }
    return "提交成功";
  } catch (e) {
    return ["Error", e.toString()];
  }
}

function createSubFolder(parentFolderId, subFolderName) {
  // 获取父文件夹的引用
  var parentFolder = DriveApp.getFolderById(parentFolderId);

  // 在父文件夹下创建新的子文件夹
  var subFolder = parentFolder.createFolder(subFolderName);

  // 打印新创建的子文件夹的ID
  Logger.log("Subfolder ID: " + subFolder.getId());

  return subFolder.getId();
}

function uploadBase64ImageToDrive(base64Data, folderId, imageName, mimeType) {
  // 解码Base64数据并转换为Blob
  var decodedData = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decodedData, mimeType, imageName);

  // 获取父文件夹的引用
  var folder = DriveApp.getFolderById(folderId);

  // 在指定的父文件夹中创建文件
  var file = folder.createFile(blob);

  // 返回新创建的文件的ID
  return file.getId();
}

function get_Folder_ID(PM_NO) {
  let ID = "1lzLwqUMqrAofk9Cho4m0-QDpWXlROJG-";

  let parenetFolder = DriveApp.getFolderById(ID);

  let folders = parenetFolder.getFoldersByName(PM_NO);

  if (folders.hasNext()) {
    let folder = folders.next();

    return folder.getId();
  } else {
    return null;
  }
}

function Production_Confirm_Info_Fill(data, PM_Serial_Number, PM_data) {
  try {
    let ID = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";

    let ss = SpreadsheetApp.openById(ID);
    var process = PM_data["工序"];
    var workshop = PM_data["车间"];
    let sheetName = process + "-" + workshop;

    let ws = getPMSheet(ss) || ss.getSheetByName(sheetName);
    var isMerged = USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME;

    // 查找 'PM No.' 对应的行号
    let pmNoPosition;
    if (isMerged) {
      pmNoPosition = findRowByPMNo(ws, PM_Serial_Number);
    } else {
      let sheet_Data = ws
        .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
        .getValues();

      let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0]; // 获取表头数组

      let array = [];

      sheet_Data.forEach((r) => {
        let obj = {};

        head.forEach((h, i) => {
          obj[h] = r[i]; // 使用表头作为键
        });

        array.push(obj);
      });

      pmNoPosition = -1;
      for (let i = 0; i < array.length; i++) {
        if (array[i]["PM No."] === PM_Serial_Number) {
          pmNoPosition = i + 2; // 因为数组是从0开始的，Google Sheet的行是从1开始的，并且我们从第二行开始读取数据
          break;
        }
      }
    }

    ws.getRange(pmNoPosition, 17).setValue(data[0]); // 班组交接（列Q，位置不变）

    ws.getRange(pmNoPosition, 18).setValue(data[1]); // 留样问题（列R，位置不变）

    let folderID = get_Folder_ID(PM_Serial_Number);

    let base64Data = data[2];

    let imageName = PM_Serial_Number + "留样图片";

    let subFolderID;

    let imageCellContent;

    if (data[2] == "NA") {
      imageCellContent = "NA";
    } else {
      if (folderID == null) {
        let parentFolderId = "1lzLwqUMqrAofk9Cho4m0-QDpWXlROJG-";

        let subFolderName = PM_Serial_Number;

        subFolderID = createSubFolder(parentFolderId, subFolderName);
      } else {
        subFolderID = folderID;
      }

      let fileID = uploadBase64ImageToDrive(base64Data, subFolderID, imageName);

      let file = DriveApp.getFileById(fileID);

      let fileUrl = file.getUrl();

      imageCellContent = fileUrl;
    }

    console.log("imageCellContent", imageCellContent);

    ws.getRange(pmNoPosition, 19).setValue(imageCellContent);

    return true;
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function PdMData_submit(PM_data, data_written_in) {
  try {
    let ID = "1DIsa8go8IJjBaGZ3F9ob5l81EGiZIN5XiDja_Pd6Q2g";

    let sheetName = PM_data["工序"] + "-" + PM_data["车间"];

    let ss = SpreadsheetApp.openById(ID);

    let ws = ss.getSheetByName(sheetName);

    if (!ws) {
      throw new Error("Sheet not found: " + sheetName);
    }

    let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0]; // 获取表头数组

    let dataRange = ws.getDataRange();

    let data = dataRange.getValues(); // 获取整个表的数据

    let pmTaskNumberIndex = head.indexOf("PM No.任务编号");

    if (pmTaskNumberIndex === -1) {
      throw new Error("Column 'PM No.任务编号' not found in sheet");
    }

    let existingRows = {}; // 用于存储现有的 PM No.任务编号 行索引

    for (let i = 1; i < data.length; i++) {
      // 从第二行开始遍历，第一行为表头

      existingRows[data[i][pmTaskNumberIndex]] = i + 1; // 存储 PM No.任务编号 值和对应的行索引
    }

    // 遍历 data_written_in 数组中的每个对象
    for (let i = 0; i < data_written_in.length; i++) {
      let newRow = [];

      let dataRow = data_written_in[i];

      let pmTaskNumber = dataRow["PM No.任务编号"];

      // 遍历表头，根据表头找到 dataRow 中对应的值
      for (let j = 0; j < head.length; j++) {
        let colName = head[j];

        newRow.push(dataRow[colName]);
      }

      if (pmTaskNumber in existingRows) {
        // 覆盖现有行数据
        let rowIndex = existingRows[pmTaskNumber];

        ws.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
      } else {
        ws.appendRow(newRow);
      }
    }

    return true;
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getWorkcenterinfo_Plan() {
  try {
    let ID = "12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM";

    let sheetName = "Workcenter";

    let ss = SpreadsheetApp.openById(ID);

    var ws = ss.getSheetByName(sheetName);
    let workcenter = ws
      .getRange(1, 1, ws.getLastRow() - 2, ws.getLastColumn())
      .getValues();

    return workcenter;
  } catch (e) {
    return ["Error", e.toString()];
  }
}

function uploadFile_General(dataUrl, fileName, folderId) {
  try {
    const contentType = dataUrl.match(/data:([^;]+);/)[1];

    const bytes = Utilities.base64Decode(dataUrl.split(",")[1]);

    const blob = Utilities.newBlob(bytes, contentType, fileName);

    const folder = DriveApp.getFolderById(folderId);

    folder.createFile(blob);

    return true;
  } catch (error) {
    console.error("上传失败：" + error);

    throw new Error("上传失败");
  }
}

function getFilesInFolder(folderId) {
  let folder = DriveApp.getFolderById(folderId);

  let files = folder.getFiles();

  let fileData = [];

  while (files.hasNext()) {
    let file = files.next();

    fileData.push({
      name: file.getName(),

      url: file.getUrl(),
    });
  }
  return fileData;
}

function getMoldMachineListForCleaning() {
  const SHEET_ID = "1oR-SsslV4W7n8yb95hG5w91R-Gsfa4BN2odZO95l32A";
  const SHEET_NAME = "Plan";

  try {
    console.log("开始执行【日期修复版】...");
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ws = ss.getSheetByName(SHEET_NAME);

    if (!ws) {
      throw new Error(`工作表 "${SHEET_NAME}" 未找到。`);
    }

    // 1. 正常获取原始数据
    const originalData = ws.getDataRange().getValues();
    console.log("已获取 " + originalData.length + " 行原始数据。");

    // 2. 遍历数据，转换日期对象
    const processedData = originalData.map((row) =>
      row.map((cell) => {
        // 判断单元格内容是否是日期对象
        if (cell instanceof Date) {
          // 如果是，则使用 Utilities 服务将其格式化为字符串
          // "Asia/Shanghai" 是中国的时区，确保时间正确
          return Utilities.formatDate(
            cell,
            "Asia/Shanghai",
            "yyyy-MM-dd HH:mm:ss"
          );
        }
        return cell; // 如果不是日期，则原样返回
      })
    );

    console.log("数据处理完毕，准备返回。");

    // 3. 返回处理过的数据
    return processedData;
  } catch (e) {
    console.error("函数执行失败！错误详情: ", e);
    return ["Error", e.toString()];
  }
}

/**
 * 保存清洁记录。
 * 如果提供了照片，则执行完整流程。
 * 如果未提供，则记录为"未生产"状态。
 * @param {object} data 从前端传递过来的对象。
 * @returns {object} 返回一个包含操作结果的对象。
 */
function saveCleaningRecord(data) {
  // --- 配置信息 ---
  const FOLDER_ID = "1KhhjXPGc0WEi_B7gkKPCT4ZH7gEXoZk-";
  const SPREADSHEET_ID = "1oR-SsslV4W7n8yb95hG5w91R-Gsfa4BN2odZO95l32A";
  const RECORD_SHEET_NAME = "Record";
  const TIMEZONE = "Asia/Shanghai";

  try {
    // --- 步骤 1: 从前端获取并验证核心数据 ---
    const {
      serialNo,
      process,
      workcenter,
      planDate: planDateStr,
      technicianId,
    } = data;
    const { photoDataUrl } = data; // 照片可能是 undefined

    if (!serialNo || !process || !workcenter || !planDateStr || !technicianId) {
      throw new Error(
        "核心数据不完整 (序列号、工序、机台号、计划日期或员工号缺失)。"
      );
    }

    let newRow;
    let successMessage;

    // --- 步骤 2: 判断是哪种提交流程 ---
    if (photoDataUrl) {
      // --- 流程A: 完整提交（已开机） ---
      console.log(`处理完整提交，序列号: ${serialNo}, 操作员: ${technicianId}`);

      const mimeType = photoDataUrl.substring(
        photoDataUrl.indexOf(":") + 1,
        photoDataUrl.indexOf(";")
      );
      const base64Data = photoDataUrl.split(",")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const timestamp = Utilities.formatDate(
        new Date(),
        TIMEZONE,
        "yyyyMMddHHmmss"
      );
      const fileName = `${serialNo}_${timestamp}.jpg`;
      const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      const file = folder.createFile(blob);
      const fileUrl = file.getUrl();

      const formattedPlanDate = Utilities.formatDate(
        new Date(planDateStr),
        TIMEZONE,
        "yyyy-MM-dd"
      );
      const formattedExecutionDate = Utilities.formatDate(
        new Date(),
        TIMEZONE,
        "yyyy-MM-dd"
      );

      newRow = [
        serialNo,
        process,
        workcenter,
        formattedPlanDate,
        technicianId,
        formattedExecutionDate,
        fileUrl,
      ];
      successMessage = `文件和记录已成功保存！文件名: ${fileName}`;
    } else {
      // --- 流程B: "未生产"状态提交 ---
      console.log(
        `处理"未生产"记录，序列号: ${serialNo}, 操作员: ${technicianId}`
      );

      const formattedPlanDate = Utilities.formatDate(
        new Date(planDateStr),
        TIMEZONE,
        "yyyy-MM-dd"
      );
      const formattedExecutionDate = Utilities.formatDate(
        new Date(),
        TIMEZONE,
        "yyyy-MM-dd"
      );

      newRow = [
        serialNo,
        process,
        workcenter,
        formattedPlanDate,
        technicianId, // 修正：确保在"未生产"流程中也写入员工工号
        formattedExecutionDate,
        "未生产",
      ];
      successMessage = `"未生产"状态已成功记录。`;
    }

    // --- 步骤 3: 将数据写入 Google Sheet ---
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
    if (!recordSheet) {
      throw new Error(
        `在电子表格中未找到名为 "${RECORD_SHEET_NAME}" 的工作表。`
      );
    }
    recordSheet.appendRow(newRow);
    console.log("新行已成功写入表格:", newRow);

    // --- 步骤 4: 返回成功的响应给前端 ---
    return {
      success: true,
      message: successMessage,
    };
  } catch (e) {
    // 如果发生错误，记录日志并返回失败的响应
    console.error("saveCleaningRecord 失败:", e);
    return {
      success: false,
      message: "保存记录时发生错误: " + e.message,
    };
  }
}

/**
 * 从 "Record" 工作表中获取所有已完成的记录，返回一个以序列号为键、文件ID为值的对象。
 * @returns {object | {error: boolean, message: string}} 成功时返回记录对象，失败时返回错误对象。
 */
function getCompletedRecords() {
  const SPREADSHEET_ID = "1oR-SsslV4W7n8yb95hG5w91R-Gsfa4BN2odZO95l32A";
  const RECORD_SHEET_NAME = "Record";

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
    if (!recordSheet) {
      throw new Error(
        `在电子表格中未找到名为 "${RECORD_SHEET_NAME}" 的工作表。`
      );
    }

    if (recordSheet.getLastRow() < 2) {
      return {};
    }

    const range = recordSheet.getRange(2, 1, recordSheet.getLastRow() - 1, 7);
    const values = range.getValues();

    const completedRecords = {};
    values.forEach((row) => {
      const serialNo = row[0]; // 第1列是序列号
      const imageCell = row[6]; // 第7列是图片/状态单元格

      if (serialNo) {
        if (imageCell === "未生产") {
          // 状态：未生产
          completedRecords[serialNo] = { status: "Unproduced" };
        } else if (
          imageCell &&
          typeof imageCell === "string" &&
          imageCell.startsWith("http")
        ) {
          // 状态：已完成
          try {
            const fileIdMatch = imageCell.match(/[-\w]{25,}/);
            if (fileIdMatch && fileIdMatch[0]) {
              completedRecords[serialNo] = {
                status: "Done",
                fileId: fileIdMatch[0],
              };
            }
          } catch (err) {
            console.warn(`无法为序列号 ${serialNo} 解析文件ID: ${imageCell}`);
          }
        }
      }
    });

    console.log(
      "从Record表获取到的已完成记录数量: " +
        Object.keys(completedRecords).length
    );
    return completedRecords;
  } catch (e) {
    console.error("getCompletedRecords 失败:", e);
    return { error: true, message: e.message };
  }
}

/**
 * 根据文件ID获取图片的Base64数据，用于前端直接显示。
 * @param {string} fileId Google Drive文件的ID。
 * @returns {string | {error: boolean, message: string}} 成功时返回Base64数据URL，失败时返回错误对象。
 */
function getImageAsBase64(fileId) {
  try {
    if (!fileId) {
      throw new Error("文件ID未提供。");
    }
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const contentType = blob.getContentType();
    // --- 修复：使用正确的函数名 base64Encode ---
    const base64Data = Utilities.base64Encode(blob.getBytes());
    return `data:${contentType};base64,${base64Data}`;
  } catch (e) {
    console.error("getImageAsBase64 失败:", e);
    return { error: true, message: "获取图片时发生错误: " + e.message };
  }
}

// --- 新增的函数 ---
/**
 * 更新一个已存在的PM任务记录，将其状态变更为"进行中"并记录开始信息
 * @param {object} data - 从前端传递过来的包含任务更新信息的对象
 * @returns {string} 返回操作结果 "更新成功" 或错误信息
 */
function updateStartedPMTask(data) {
  try {
    const id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    const ss = SpreadsheetApp.openById(id);
    const sheetName = data["SheetName"];
    const ws = getPMSheet(ss) || ss.getSheetByName(sheetName);
    const pmNo = data["PM No."];

    if (!ws) {
      throw new Error("在数据库中未找到工作表: " + sheetName);
    }

    const values = ws.getRange(1, 1, ws.getLastRow(), 1).getValues();
    let rowNumber = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === pmNo) {
        rowNumber = i + 1;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error("在工作表中未找到 PM No.: " + pmNo);
    }

    // 更新指定行中的特定单元格（列号不变，工序/车间在末尾V/W列不影响）
    // 表格列: B(2)=PmStatus, C(3)=Notification, D(4)=PM People, F(6)=SatrtDate, G(7)=StartTime, K(11)=任务明细
    ws.getRange(rowNumber, 2).setValue(data["PmStatus"]); // 更新状态
    ws.getRange(rowNumber, 3).setValue(data["Notification"]); // 更新工单号
    ws.getRange(rowNumber, 4).setValue(data["PM People"]); // 更新人员
    ws.getRange(rowNumber, 6).setValue(data["SatrtDate"]); // 更新开始日期
    ws.getRange(rowNumber, 7).setValue(data["StartTime"]); // 更新开始时间
    ws.getRange(rowNumber, 11).setValue(data["任务明细"]); // 更新任务清单

    return "更新成功";
  } catch (e) {
    Logger.log("updateStartedPMTask 错误: " + e.toString());
    return "错误: " + e.toString();
  }
}

/**
 * 更新保养人员（仅修改 PM People 列，不影响其他字段）
 * @param {object} data - { "PM No.": string, "PM People": string, "SheetName": string }
 * @returns {string} 返回操作结果 "更新成功" 或错误信息
 */
function updatePmPeople(data) {
  try {
    const id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    const ss = SpreadsheetApp.openById(id);
    const sheetName = data["SheetName"];
    const ws = getPMSheet(ss) || ss.getSheetByName(sheetName);
    const pmNo = data["PM No."];

    if (!ws) {
      throw new Error("在数据库中未找到工作表: " + sheetName);
    }

    const values = ws.getRange(1, 1, ws.getLastRow(), 1).getValues();
    let rowNumber = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === pmNo) {
        rowNumber = i + 1;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error("在工作表中未找到 PM No.: " + pmNo);
    }

    // 仅更新 D 列（第4列）保养人员
    ws.getRange(rowNumber, 4).setValue(data["PM People"]);

    return "更新成功";
  } catch (e) {
    Logger.log("updatePmPeople 错误: " + e.toString());
    return "错误: " + e.toString();
  }
}

/**
 * 修改：根据PM No.找到特定保养记录，并更新其"任务明细"字段。
 * 如果记录不存在，则创建一条新的记录。
 * @param {object} data - 包含pmNo, sheetName, updatedTasklist, 和 shouldAppendStatus 的对象
 * @returns {string} 返回操作结果
 */
function updateTasklistForPM(data) {
  try {
    const id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    const ss = SpreadsheetApp.openById(id);
    const ws = getPMSheet(ss) || ss.getSheetByName(data.sheetName);
    var isMerged = USE_MERGED_PM_SHEET && ws.getName() === PM_RECORDS_SHEET_NAME;
    // 从 sheetName (格式: "工序-车间") 或 data.process/data.workshop 解析
    var proc = data.process;
    var wksp = data.workshop;
    if ((!proc || !wksp) && data.sheetName && data.sheetName.indexOf("-") !== -1) {
      var parts = data.sheetName.split("-");
      proc = parts[0];
      wksp = parts[1];
    }

    if (!ws) {
      throw new Error("工作表未找到: " + data.sheetName);
    }

    const values = ws.getRange(1, 1, ws.getLastRow(), 1).getValues();
    let rowNumber = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === data.pmNo) {
        rowNumber = i + 1;
        break;
      }
    }

    // --- 如果记录不存在，则创建新记录 ---
    if (rowNumber === -1) {
      // 这是一个还未分配人员的任务，我们需要为它创建第一条记录

      // 从 pmNo (例如 "20250718E0EN0011") 中解析出日期和机台号
      const pmNo = data.pmNo;
      const dateStr = pmNo.substring(0, 8); // "20250718"
      const workcenter = pmNo.substring(8); // "E0EN0011"
      const planDate = `${dateStr.substring(0, 4)}-${dateStr.substring(
        4,
        6
      )}-${dateStr.substring(6, 8)}`; // "2025-07-18"

      var newRecord = [
        pmNo, // PM No.
        "已添加临时任务 / Added Temporary Task", // PmStatus
        "", // Notification
        "", // PM People
        planDate, // Plan PM Date
        "", // SatrtDate
        "", // StartTime
        "", // EndDate
        "", // EndTime
        workcenter, // Workcenter
        data.updatedTasklist, // 任务明细
      ];
      if (isMerged) {
        newRecord.push(proc, wksp);
      }

      ws.appendRow(newRecord);
      return "新保养记录已创建，并添加了临时任务！";
    } else {
      // --- 如果记录已存在，则更新现有记录 ---
      // Column K 是第11列, 用于存储 "任务明细"
      ws.getRange(rowNumber, 11).setValue(data.updatedTasklist);

      // 如果前端传递了标志位，则更新状态
      if (data.shouldAppendStatus) {
        const statusCell = ws.getRange(rowNumber, 2); // Column B is the 2nd column, for "PmStatus"
        const currentStatus = statusCell.getValue();
        const newStatusLine = "已添加临时任务 / Added Temporary Task";

        // 避免重复添加
        if (!currentStatus.includes(newStatusLine)) {
          // 使用换行符 \n 来实现分行显示
          statusCell.setValue(currentStatus + "\n" + newStatusLine);
        }
      }
      return "任务清单已成功更新！";
    }
  } catch (e) {
    Logger.log("updateTasklistForPM 错误: " + e.toString());
    return "保存失败: " + e.message;
  }
}

/**
 * 生成PM保养任务报告PDF
 * @param {Object} reportData - 包含PM任务和确认数据的对象
 * @returns {Object} - 包含成功状态和文件信息的对象
 */
function generatePMTaskReport(reportData) {
  try {
    console.log("开始生成PM保养任务报告PDF");

    // 获取目标文件夹
    const targetFolder = DriveApp.getFolderById(reportData.targetFolderId);

    // 创建临时电子表格作为报告模板
    const reportSpreadsheet = SpreadsheetApp.create(
      `PM保养任务报告_${reportData.pmSerialNumber}_${reportData.confirmationTime}`
    );
    const sheet = reportSpreadsheet.getActiveSheet();
    sheet.setName("PM保养任务报告");

    // 设置表格格式和内容
    setupReportFormat(sheet, reportData);

    // 保存电子表格
    SpreadsheetApp.flush();

    // 获取电子表格文件
    const spreadsheetFile = DriveApp.getFileById(reportSpreadsheet.getId());

    // 转换为PDF
    const pdfBlob = spreadsheetFile.getBlob().getAs("application/pdf");
    const pdfFileName = `PM保养任务报告_${reportData.pmSerialNumber}_${reportData.confirmationTime}.pdf`;

    // 将PDF文件移动到目标文件夹
    const pdfFile = targetFolder.createFile(pdfBlob.setName(pdfFileName));

    // 删除临时电子表格
    DriveApp.getFileById(reportSpreadsheet.getId()).setTrashed(true);

    console.log("PDF报告生成成功:", pdfFile.getUrl());

    return {
      success: true,
      fileId: pdfFile.getId(),
      fileName: pdfFileName,
      fileUrl: pdfFile.getUrl(),
      message: "PM保养任务报告PDF生成成功",
    };
  } catch (error) {
    console.error("生成PDF报告时出错:", error);
    return {
      success: false,
      error: error.toString(),
      message: "PDF报告生成失败",
    };
  }
}

/**
 * 将PDF链接保存到数据表的U列
 * @param {Object} data - 包含PM序列号、PM数据和PDF链接的对象
 * @returns {Boolean} - 操作是否成功
 */
function savePDFLinkToSheet(data) {
  try {
    console.log("data", data);
    // 获取PM系统的主数据表
    const id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    const ss = SpreadsheetApp.openById(id);
    var isMerged = USE_MERGED_PM_SHEET;

    // 合并表模式：直接在 PM_Records 中查找
    if (isMerged) {
      var wsMerged = getPMSheet(ss);
      var rowNum = findRowByPMNo(wsMerged, data.pmSerialNumber);
      if (rowNum !== -1) {
        wsMerged.getRange(rowNum, 21).setValue(data.pdfLink); // U列（保持不变，索引21）
        return true;
      }
      throw new Error("在 PM_Records 中未找到 PM No.: " + data.pmSerialNumber);
    }

    // --- 以下为旧版六分表逻辑，USE_MERGED_PM_SHEET=false 时使用 ---
    // 从PM_data中获取工序和车间，类似于Production_Confirm_Info_Fill函数
    let sheetName;
    if (data.pmData && data.pmData["工序"] && data.pmData["车间"]) {
      sheetName = data.pmData["工序"] + "-" + data.pmData["车间"];
    } else if (data.sheetName) {
      // 如果无法从pmData获取，则使用提供的sheetName作为后备
      sheetName = data.sheetName;
    } else {
      // 如果没有工序和车间信息，尝试使用其他方法找到合适的工作表
      console.log("尝试在所有工作表中查找PM编号...");
      const sheets = ss.getSheets();
      let foundSheet = null;

      for (let i = 0; i < sheets.length; i++) {
        const currentSheet = sheets[i];
        const values = currentSheet
          .getRange(1, 1, currentSheet.getLastRow(), 1)
          .getValues();

        for (let j = 0; j < values.length; j++) {
          if (values[j][0] === data.pmSerialNumber) {
            foundSheet = currentSheet;
            break;
          }
        }

        if (foundSheet) break;
      }

      if (foundSheet) {
        sheetName = foundSheet.getName();
        console.log("在工作表中找到PM编号:", sheetName);
      } else {
        console.error(
          "无法确定工作表名称: 缺少必要的工序和车间信息，且在所有工作表中未找到PM编号"
        );
        return false;
      }
    }

    console.log("计算得到的工作表名:", sheetName);

    const ws = ss.getSheetByName(sheetName);

    if (!ws) {
      console.error("未找到工作表:", sheetName);
      return false;
    }

    // 查找匹配的PM编号行
    const values = ws.getRange(1, 1, ws.getLastRow(), 1).getValues();
    let rowNumber = -1;

    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === data.pmSerialNumber) {
        rowNumber = i + 1; // 因为数组索引从0开始，而行号从1开始
        break;
      }
    }

    if (rowNumber === -1) {
      console.warn(`未找到PM编号为 ${data.pmSerialNumber} 的记录`);
      return false;
    }

    // PDF报告链接保存在U列（第21列，索引为20）
    const pdfLinkColumn = 21; // Excel中的U列是第21列
    ws.getRange(rowNumber, pdfLinkColumn).setValue(data.pdfUrl);
    console.log(`已将PDF链接保存到 ${sheetName} 表的第 ${rowNumber} 行的U列`);

    return true;
  } catch (error) {
    console.error("保存PDF链接时出错:", error);
    return false;
  }
}

/**
 * 设置报告表格格式和内容
 * @param {Sheet} sheet - 电子表格工作表
 * @param {Object} reportData - 报告数据
 */
function setupReportFormat(sheet, reportData) {
  const confirmationStatusText = getConfirmationStatusText(
    reportData.confirmationStatus
  );
  const now = new Date();
  const generateTime = Utilities.formatDate(
    now,
    "Asia/Shanghai",
    "yyyy-MM-dd HH:mm:ss"
  );

  let currentRow = 1;

  // 设置标题
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet.getRange(currentRow, 1).setValue("PM保养任务报告 / PM Task Report");
  sheet
    .getRange(currentRow, 1)
    .setFontSize(18)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  currentRow += 2;

  // 基本信息标题
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet.getRange(currentRow, 1).setValue("基本信息 / Basic Information");
  sheet
    .getRange(currentRow, 1)
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#E60012")
    .setFontColor("white");
  currentRow++;

  // 基本信息内容
  const basicInfoData = [
    ["PM序列号 / PM Serial Number:", reportData.pmSerialNumber],
    ["工作中心 / Work Center:", reportData.pmData["AEM#"] || "N/A"],
    ["工序 / Process:", reportData.pmData["工序"] || "N/A"],
    ["车间 / Workshop:", reportData.pmData["车间"] || "N/A"],
    [
      "计划开始日期 / Planned Start Date:",
      reportData.pmData["开始日期"] || "N/A",
    ],
    ["设备类型1 / Equipment Type 1:", reportData.pmData["设备类型1"] || "N/A"],
    ["设备类型2 / Equipment Type 2:", reportData.pmData["设备类型2"] || "N/A"],
    ["自动化类型 / Automation Type:", reportData.pmData["自动化类型"] || "N/A"],
  ];

  for (let i = 0; i < basicInfoData.length; i++) {
    sheet
      .getRange(currentRow, 1)
      .setValue(basicInfoData[i][0])
      .setFontWeight("bold");
    sheet.getRange(currentRow, 2, 1, 4).merge().setValue(basicInfoData[i][1]);
    currentRow++;
  }

  currentRow++;

  // 确认信息标题
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet
    .getRange(currentRow, 1)
    .setValue("保养班组确认信息 / Production Team Confirmation");
  sheet
    .getRange(currentRow, 1)
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#E60012")
    .setFontColor("white");
  currentRow++;

  // 确认信息内容
  const confirmInfoData = [
    [
      "确认时间 / Confirmation Time:",
      formatConfirmationTime(reportData.confirmationTime),
    ],
    [
      "确认人员 / Confirmed By:",
      `${reportData.confirmationData[0].name} (${reportData.confirmationData[0].workNumber})`,
    ],
    ["确认状态 / Confirmation Status:", confirmationStatusText],
    ["样品状态 / Sample Status:", reportData.confirmationData[0].sampleStatus],
    [
      "留样图片已上传 / Sample Images Uploaded:",
      reportData.confirmationData[2] && reportData.confirmationData[2] !== "NA"
        ? "Yes / 是"
        : "No / 否",
    ],
  ];

  // 添加PM Planner确认信息（如果有）
  if (
    reportData.pmPlannerConfirmation &&
    reportData.pmPlannerConfirmation.confirmedBy
  ) {
    confirmInfoData.push([
      "确认人 / PM Planner:",
      reportData.pmPlannerConfirmation.confirmedBy,
    ]);
    confirmInfoData.push([
      "确认时间 / Confirmation Time:",
      formatConfirmationTime(reportData.pmPlannerConfirmation.confirmationTime),
    ]);
  }

  // 如果有问题描述，添加到确认信息中
  if (
    reportData.confirmationData[1] &&
    reportData.confirmationData[1] !== "NA"
  ) {
    confirmInfoData.push([
      "问题描述 / Issue Description:",
      reportData.confirmationData[1],
    ]);
  }

  for (let i = 0; i < confirmInfoData.length; i++) {
    sheet
      .getRange(currentRow, 1)
      .setValue(confirmInfoData[i][0])
      .setFontWeight("bold");
    sheet.getRange(currentRow, 2, 1, 4).merge().setValue(confirmInfoData[i][1]);
    currentRow++;
  }

  currentRow++;

  // 添加任务明细部分
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet.getRange(currentRow, 1).setValue("任务明细 / Task Details");
  sheet
    .getRange(currentRow, 1)
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#E60012")
    .setFontColor("white");
  currentRow++;

  // 解析并显示任务明细
  try {
    let taskTableData = [];

    console.log("开始解析任务明细数据...");
    console.log("reportData.taskDetails:", reportData.taskDetails);
    console.log("reportData.pmData type:", typeof reportData.pmData);
    console.log("reportData.pmData:", reportData.pmData);

    // 优先使用从sessionStorage传递的表格数据
    if (
      reportData.taskDetails &&
      Array.isArray(reportData.taskDetails) &&
      reportData.taskDetails.length > 1
    ) {
      console.log("Using cached table data from sessionStorage");
      taskTableData = reportData.taskDetails;
      console.log(
        "Successfully loaded table data from sessionStorage:",
        taskTableData.length,
        "rows (including header)"
      );
    }
    // 如果没有缓存的表格数据，尝试从pmData中解析
    else if (reportData.pmData) {
      console.log("Attempting to parse pmData...");

      // 检查pmData是否是对象格式（从getCompletePMTaskData返回）
      if (
        typeof reportData.pmData === "object" &&
        !Array.isArray(reportData.pmData)
      ) {
        console.log("Processing pmData as object format");
        console.log("Available pmData keys:", Object.keys(reportData.pmData));

        if (reportData.pmData["任务明细"]) {
          console.log("Found 任务明细 key in pmData object");
          try {
            console.log(
              "Task details raw data from object:",
              reportData.pmData["任务明细"]
            );
            const taskDetails = JSON.parse(reportData.pmData["任务明细"]);
            console.log(
              "Successfully parsed task details from object:",
              taskDetails.length,
              "tasks"
            );

            // 转换为表格格式
            taskTableData = [
              ["任务编号", "任务描述", "执行人员", "完成状态", "备注"],
            ]; // 表头
            taskDetails.forEach((task, index) => {
              const taskNo =
                task["Task No"] || task["任务编号"] || `Task ${index + 1}`;
              const taskDesc =
                task["Task Description"] || task["任务描述"] || "";
              const taskStatus =
                task.taskStatus === true || task["Task Status"] === true
                  ? "✓ 已完成"
                  : "✗ 未完成";
              const taskNotes =
                task.valueAndNote ||
                task["数值记录&备注"] ||
                task["备注"] ||
                "";
              // 只从执行人员字段提取执行人员信息
              const taskResource = task["执行人员"] || "N/A";
              taskTableData.push([
                taskNo,
                taskDesc,
                taskResource,
                taskStatus,
                taskNotes,
              ]);
            });
          } catch (parseError) {
            console.log("无法解析对象格式的任务明细数据:", parseError);
            console.log("Raw 任务明细 data:", reportData.pmData["任务明细"]);
          }
        } else {
          console.log("No 任务明细 key found in pmData object");
        }
      }
      // 如果pmData是数组格式，查找K列（索引10）
      else if (Array.isArray(reportData.pmData)) {
        console.log(
          "Processing pmData as array - fallback to traditional parsing"
        );
        for (let i = 0; i < reportData.pmData.length; i++) {
          if (reportData.pmData[i].length > 10 && reportData.pmData[i][10]) {
            try {
              console.log("Found task details in array format at index:", i);
              console.log("Task details raw data:", reportData.pmData[i][10]);
              const taskDetails = JSON.parse(reportData.pmData[i][10]);
              console.log(
                "Successfully parsed task details from array:",
                taskDetails.length,
                "tasks"
              );

              // 转换为表格格式
              taskTableData = [
                ["任务编号", "任务描述", "执行人员", "完成状态", "备注"],
              ]; // 表头
              taskDetails.forEach((task, index) => {
                const taskNo =
                  task["Task No"] || task["任务编号"] || `Task ${index + 1}`;
                const taskDesc =
                  task["Task Description"] || task["任务描述"] || "";
                const taskStatus =
                  task.taskStatus === true || task["Task Status"] === true
                    ? "✓ 已完成"
                    : "✗ 未完成";
                const taskNotes =
                  task.valueAndNote ||
                  task["数值记录&备注"] ||
                  task["备注"] ||
                  "";
                // 只从执行人员字段提取执行人员信息
                const taskResource = task["执行人员"] || "N/A";
                taskTableData.push([
                  taskNo,
                  taskDesc,
                  taskResource,
                  taskStatus,
                  taskNotes,
                ]);
              });
              break;
            } catch (parseError) {
              console.log("无法解析数组格式的任务明细数据:", parseError);
            }
          }
        }
      }
    } else {
      console.log("No pmData available for task details parsing");
    }

    if (taskTableData && taskTableData.length > 1) {
      console.log(`处理任务表格数据: 共 ${taskTableData.length} 行（含表头）`);

      // 获取表头（第一行）
      const tableHeaders = taskTableData[0];
      console.log("表头:", tableHeaders);

      // 添加表头
      for (let col = 0; col < Math.min(tableHeaders.length, 5); col++) {
        sheet
          .getRange(currentRow, col + 1)
          .setValue(tableHeaders[col])
          .setFontWeight("bold")
          .setBackground("#f0f0f0");
      }
      currentRow++;

      // 添加数据行（跳过表头）
      for (let rowIndex = 1; rowIndex < taskTableData.length; rowIndex++) {
        const rowData = taskTableData[rowIndex];
        console.log(`处理第 ${rowIndex} 行数据:`, rowData);

        // 添加每列的数据（最多5列）
        for (let col = 0; col < Math.min(rowData.length, 5); col++) {
          let cellValue = rowData[col] || "";
          sheet.getRange(currentRow, col + 1).setValue(cellValue);

          // 为较长内容设置文本换行
          if (cellValue.length > 30) {
            sheet
              .getRange(currentRow, col + 1)
              .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
          }
        }

        // 根据内容长度动态设置行高
        const maxLength = Math.max(
          ...rowData.map((cell) => (cell || "").toString().length)
        );
        if (maxLength > 100) {
          sheet.setRowHeight(currentRow, 60); // 较长内容使用更高行高
        } else if (maxLength > 50) {
          sheet.setRowHeight(currentRow, 40); // 中等内容使用中等行高
        } else {
          sheet.setRowHeight(currentRow, 25); // 短内容使用标准行高
        }

        // 根据完成状态设置行颜色（检查状态列是否包含"已完成"）
        const statusText =
          rowData.length > 3 ? (rowData[3] || "").toString() : "";
        if (statusText.includes("已完成") || statusText.includes("✓")) {
          sheet
            .getRange(currentRow, 1, 1, Math.min(rowData.length, 5))
            .setBackground("#d4edda"); // 浅绿色表示已完成
        } else if (statusText.includes("未完成") || statusText.includes("✗")) {
          sheet
            .getRange(currentRow, 1, 1, Math.min(rowData.length, 5))
            .setBackground("#f8d7da"); // 浅红色表示未完成
        }

        currentRow++;
      }

      // 添加任务统计信息
      let completedTasks = 0;
      let totalTasks = taskTableData.length - 1; // 减去表头行

      // 统计完成状态（从第二行开始，跳过表头）
      for (let rowIndex = 1; rowIndex < taskTableData.length; rowIndex++) {
        const rowData = taskTableData[rowIndex];
        const statusText =
          rowData.length > 3 ? (rowData[3] || "").toString() : "";
        if (statusText.includes("已完成") || statusText.includes("✓")) {
          completedTasks++;
        }
      }

      const incompleteTasks = totalTasks - completedTasks;
      const completionRate =
        totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0";

      currentRow++; // 空行
      sheet
        .getRange(currentRow, 1)
        .setValue("任务统计 / Task Summary:")
        .setFontWeight("bold")
        .setFontSize(12);
      currentRow++;

      // 详细统计信息
      sheet
        .getRange(currentRow, 1)
        .setValue("总任务数 / Total Tasks:")
        .setFontWeight("bold");
      sheet.getRange(currentRow, 2).setValue(totalTasks);
      sheet
        .getRange(currentRow, 3)
        .setValue("已完成 / Completed:")
        .setFontWeight("bold");
      sheet.getRange(currentRow, 4).setValue(completedTasks);
      currentRow++;

      sheet
        .getRange(currentRow, 1)
        .setValue("未完成 / Incomplete:")
        .setFontWeight("bold");
      sheet.getRange(currentRow, 2).setValue(incompleteTasks);
      sheet
        .getRange(currentRow, 3)
        .setValue("完成率 / Completion Rate:")
        .setFontWeight("bold");
      sheet.getRange(currentRow, 4).setValue(`${completionRate}%`);
      currentRow++;
    } else {
      // 如果没有任务明细数据
      console.log("No task table data available");
      sheet
        .getRange(currentRow, 1, 1, 5)
        .merge()
        .setValue("暂无任务明细数据 / No task details available");
      currentRow++;
    }
  } catch (error) {
    console.error("处理任务明细时出错:", error);
    sheet
      .getRange(currentRow, 1, 1, 5)
      .merge()
      .setValue("任务明细解析失败 / Failed to parse task details");
    currentRow++;
  }

  currentRow++;

  // 报告生成信息标题
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet
    .getRange(currentRow, 1)
    .setValue("报告生成信息 / Report Generation Info");
  sheet
    .getRange(currentRow, 1)
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#E60012")
    .setFontColor("white");
  currentRow++;

  // 生成信息内容
  sheet
    .getRange(currentRow, 1)
    .setValue("生成时间 / Generated Time:")
    .setFontWeight("bold");
  sheet.getRange(currentRow, 2, 1, 4).merge().setValue(generateTime);
  currentRow++;

  sheet
    .getRange(currentRow, 1)
    .setValue("系统 / System:")
    .setFontWeight("bold");
  sheet
    .getRange(currentRow, 2, 1, 4)
    .merge()
    .setValue("系统自动生成 / Auto Generated");

  // 设置列宽 - 优化为多页面内容显示
  sheet.setColumnWidth(1, 220); // 任务编号列 - 增加宽度
  sheet.setColumnWidth(2, 300); // 任务描述列 - 适当减少宽度
  sheet.setColumnWidth(3, 150); // 执行人员列
  sheet.setColumnWidth(4, 100); // 完成状态列
  sheet.setColumnWidth(5, 180); // 备注列

  // 设置边框
  const dataRange = sheet.getRange(1, 1, currentRow, 5);
  dataRange.setBorder(true, true, true, true, true, true);
}

/**
 * 格式化确认时间为指定格式
 * @param {string} timeString - 时间字符串
 * @returns {string} - 格式化后的时间字符串
 */
function formatConfirmationTime(timeString) {
  try {
    // 如果已经是正确格式，直接返回
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }

    // 尝试解析时间字符串并格式化
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      return timeString; // 如果解析失败，返回原字符串
    }

    return Utilities.formatDate(date, "Asia/Shanghai", "yyyy-MM-dd HH:mm:ss");
  } catch (error) {
    console.error("格式化时间出错:", error);
    return timeString;
  }
}

/**
 * 获取PM Planner确认信息
 * @param {string} pmSerialNumber - PM任务序列号
 * @param {Array} pmData - PM任务数据
 * @param {string} sheetName - 工作表名称（可选）
 * @returns {Object} - PM Planner确认信息对象
 */
function getPMPlannerConfirmation(pmSerialNumber, pmData, sheetName) {
  try {
    console.log("getPMPlannerConfirmation called with:", {
      pmSerialNumber,
      pmData,
      sheetName,
    });

    // 从PM任务数据中获取PM Planner确认信息
    let pmPlannerInfo = {
      confirmedBy: "",
      confirmationTime: "",
    };

    // 如果没有提供pmData或pmData为空，尝试从Google Sheets获取
    if (
      !pmData ||
      pmData.length === 0 ||
      (Array.isArray(pmData) &&
        pmData[0] &&
        typeof pmData[0] === "object" &&
        !Array.isArray(pmData[0]))
    ) {
      try {
        // 获取PM任务表
        const ss = SpreadsheetApp.openById(
          "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4"
        );

        // 使用提供的工作表名称，如果没有提供则默认为'PM Task'
        const targetSheetName = sheetName || "PM Task";
        const sheet = getPMSheet(ss) || ss.getSheetByName(targetSheetName);
        if (!sheet) {
          console.error("找不到工作表:", targetSheetName);
          return pmPlannerInfo;
        }

        const data = sheet.getDataRange().getValues();
        console.log("Retrieved sheet data, total rows:", data.length);

        // 查找对应的PM任务 (通过PM No.列，通常是第一列)
        for (let i = 1; i < data.length; i++) {
          if (
            data[i][0] &&
            data[i][0].toString().trim() === pmSerialNumber.toString().trim()
          ) {
            pmData = [data[i]]; // 找到匹配的行，包装成数组
            console.log("Found matching PM task at row:", i + 1);
            console.log(
              "PM task data includes K column (index 10):",
              data[i][10] ? "Yes" : "No"
            );
            break;
          }
        }

        if (!pmData || pmData.length === 0) {
          console.log("No matching PM task found for:", pmSerialNumber);
          return pmPlannerInfo;
        }
      } catch (sheetError) {
        console.error("无法从Google Sheets获取PM数据:", sheetError);
        return pmPlannerInfo;
      }
    }

    // 处理从前端传来的对象格式数据
    if (
      pmData &&
      pmData.length === 1 &&
      typeof pmData[0] === "object" &&
      !Array.isArray(pmData[0])
    ) {
      // 如果pmData[0]是一个对象而不是数组，需要转换
      console.log("Converting object data to array format");
      // 这种情况下，需要从Google Sheets重新获取数据
      try {
        const ss = SpreadsheetApp.openById(
          "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4"
        );
        const targetSheetName = sheetName || "PM Task";
        const sheet = ss.getSheetByName(targetSheetName);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
          if (
            data[i][0] &&
            data[i][0].toString().trim() === pmSerialNumber.toString().trim()
          ) {
            pmData = [data[i]];
            break;
          }
        }
      } catch (error) {
        console.error("Error retrieving sheet data:", error);
        return pmPlannerInfo;
      }
    }

    // 从pmData中解析PM Planner确认信息
    if (pmData && pmData.length > 0) {
      for (let i = 0; i < pmData.length; i++) {
        if (Array.isArray(pmData[i]) && pmData[i].length > 19) {
          // 确保列T存在 (索引19)
          let confirmationData = pmData[i][19]; // 列T
          if (confirmationData && confirmationData.toString().trim() !== "") {
            try {
              let confirmationStr = confirmationData.toString();
              console.log("Parsing confirmation data:", confirmationStr);

              // 解析确认信息格式：时间 + confirmed by: + 用户名
              if (confirmationStr.includes("confirmed by:")) {
                let parts = confirmationStr.split("confirmed by:");
                if (parts.length === 2) {
                  pmPlannerInfo.confirmationTime = parts[0].trim();
                  pmPlannerInfo.confirmedBy = parts[1].trim();
                }
              } else if (confirmationStr.includes("/")) {
                // 处理旧格式：用户名 / 时间
                let parts = confirmationStr.split("/");
                if (parts.length === 2) {
                  pmPlannerInfo.confirmedBy = parts[0].trim();
                  pmPlannerInfo.confirmationTime = parts[1].trim();
                }
              } else {
                // 如果格式不同，尝试按长度分割
                if (confirmationStr.length > 19) {
                  pmPlannerInfo.confirmationTime = confirmationStr
                    .substring(0, 19)
                    .trim();
                  pmPlannerInfo.confirmedBy = confirmationStr
                    .substring(19)
                    .trim();
                }
              }
              break;
            } catch (parseError) {
              console.error(
                "Error parsing PM Planner confirmation data:",
                parseError
              );
            }
          }
        }
      }
    }

    console.log("Retrieved PM Planner confirmation info:", pmPlannerInfo);
    return pmPlannerInfo;
  } catch (error) {
    console.error("Error retrieving PM Planner confirmation:", error);
    return {
      confirmedBy: "",
      confirmationTime: "",
    };
  }
}

/**
 * 获取完整的PM任务数据（包括任务明细）
 * @param {string} pmSerialNumber - PM任务序列号
 * @param {string} sheetName - 工作表名称
 * @returns {Object} - 完整的PM任务数据
 */
function getCompletePMTaskData(pmSerialNumber, sheetName) {
  try {
    console.log("获取完整PM任务数据:", { pmSerialNumber, sheetName });

    // 获取PM任务表
    const ss = SpreadsheetApp.openById(
      "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4"
    );

    // 合并表优先
    var sheet = getPMSheet(ss) || ss.getSheetByName(sheetName);
    if (!sheet) {
      console.error("找不到工作表:", sheetName);
      console.log("尝试查找包含相似名称的工作表...");

      // 尝试模糊匹配工作表名称
      const matchingSheet = allSheets.find(
        (s) =>
          s.getName().includes(sheetName.split("-")[0]) ||
          s.getName().includes(sheetName.split("-")[1]) ||
          sheetName.includes(s.getName())
      );

      if (matchingSheet) {
        console.log("找到匹配的工作表:", matchingSheet.getName());
        return getCompletePMTaskDataFromSheet(matchingSheet, pmSerialNumber);
      } else {
        return null;
      }
    }

    console.log(
      "工作表:",
      getCompletePMTaskDataFromSheet(sheet, pmSerialNumber)
    );

    return getCompletePMTaskDataFromSheet(sheet, pmSerialNumber);
  } catch (error) {
    console.error("获取完整PM任务数据时出错:", error);
    return null;
  }
}

/**
 * 从指定工作表获取PM任务数据
 */
function getCompletePMTaskDataFromSheet(sheet, pmSerialNumber) {
  try {
    const data = sheet.getDataRange().getValues();
    console.log("Sheet data rows:", data.length);

    if (data.length < 2) {
      console.log("工作表数据不足");
      return null;
    }

    const headers = data[0]; // 第一行是标题
    console.log("Sheet headers:", headers);

    // 查找对应的PM任务
    for (let i = 1; i < data.length; i++) {
      const pmNoValue = data[i][0];
      console.log(
        `Row ${i}: PM No = "${pmNoValue}", Looking for = "${pmSerialNumber}"`
      );

      if (
        pmNoValue &&
        pmNoValue.toString().trim() === pmSerialNumber.toString().trim()
      ) {
        // 将数据转换为对象格式，方便使用
        const pmTaskData = {};
        headers.forEach((header, index) => {
          pmTaskData[header] = data[i][index];
        });

        console.log("找到完整PM任务数据");
        console.log(
          "任务明细列 (K列/索引10):",
          pmTaskData["任务明细"] ? "存在" : "不存在"
        );
        console.log(
          "任务明细内容长度:",
          pmTaskData["任务明细"] ? pmTaskData["任务明细"].toString().length : 0
        );

        return pmTaskData;
      }
    }

    console.log("未找到匹配的PM任务:", pmSerialNumber);
    console.log("工作表中存在的PM No值:");
    for (let i = 1; i < Math.min(data.length, 6); i++) {
      // 只显示前5个用于调试
      console.log(`  Row ${i}: "${data[i][0]}"`);
    }

    return null;
  } catch (error) {
    console.error("从工作表获取数据时出错:", error);
    return null;
  }
}

/**
 * 获取确认状态的中英文描述
 * @param {string} status - 确认状态
 * @returns {string} - 状态描述
 */
function getConfirmationStatusText(status) {
  switch (status) {
    case "Normal":
      return "接受 / Accept";
    case "Abnormal":
      return "拒绝 / Refuse";
    case "PassWithDeviation":
      return "偏差接受 / Accept with Deviation";
    default:
      return status;
  }
}

function getMasterPMData() {
  try {
    Logger.log("getMasterPMData已被调用");
    const ss = SpreadsheetApp.openById(
      "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4"
    );
    const ws = ss.getSheetByName("Master_PM_Data");
    if (!ws) return { Head: [], Content: [] };
    const head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    const values = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getValues();
    const array = values.map((r) => {
      let obj = {};
      for (let i = 0; i < head.length; i++) {
        // 如果是日期对象，格式化为yyyy-MM-dd字符串
        if (r[i] instanceof Date) {
          obj[head[i]] = Utilities.formatDate(
            r[i],
            "Asia/Shanghai",
            "yyyy-MM-dd"
          );
        } else {
          obj[head[i]] = r[i];
        }
      }
      return obj;
    });
    // 只保留"Plan PM Date"为当年记录
    const currentYear = new Date().getFullYear();
    const filteredArray = array.filter((obj) => {
      const dateStr = obj["Plan PM Date"];
      if (!dateStr) return false;
      const year = parseInt(dateStr.toString().slice(0, 4), 10);
      return year === currentYear;
    });
    return { Head: head, Content: filteredArray };
  } catch (e) {
    return { Head: [], Content: [], error: e.toString() };
  }
}

// 新增函数：从指定Google Sheet获取故障报告数据并按工序筛选
function updateFailureReportConfirmation(
  reportId,
  process,
  needReport,
  responsiblePerson,
  clientRowData
) {
  try {
    console.log(
      "开始更新故障报告确认状态 / Starting to update failure report confirmation status:",
      { reportId, process, needReport, responsiblePerson }
    );

    const responsibleName = String(responsiblePerson || "").trim();
    const rowDataFromClient = clientRowData || null;
    const isManualEntry = !!(rowDataFromClient && rowDataFromClient.manualEntry);

    // 手动录入行：不存在对应 Shift Sheet 行，直接处理后返回
    if (isManualEntry) {
      if (needReport) {
        if (!responsibleName) {
          throw new Error(
            "需要故障报告前必须分配责任人 / Please assign a responsible person before requesting a failure report"
          );
        }
        writeToFailureDatabase(rowDataFromClient, process, responsibleName);
        try {
          sendFailureReportNotification(rowDataFromClient, process, responsibleName);
        } catch (notifyError) {
          console.error(
            "发送故障报告通知邮件失败 / Failed to send failure report notification:",
            notifyError
          );
        }
      }
      return {
        success: true,
        message: needReport
          ? "故障报告需求已登记 / Failure report request recorded"
          : "已记录为无需故障报告 / Marked as no failure report required",
        details: {
          reportId,
          process,
          needReport,
          manualEntry: true,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 非手动录入行：在对应 Shift Sheet 中更新"是否需要故障报告"列
    const spreadsheetId = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let updateSuccess = false;
    let updatedSheetName = "";

    if (USE_MERGED_SHIFT_SHEET) {
      var shiftProcess = process === "IM" ? "INJ" : process;
      var wsMerged = getShiftSheet(spreadsheet);
      var rowNum = -1;
      var workshops = ["TB1", "TB2"];
      if (wsMerged) {
        for (var w = 0; w < workshops.length; w++) {
          rowNum = findRowByShiftCode(wsMerged, reportId, shiftProcess, workshops[w]);
          if (rowNum > -1) break;
        }
        if (rowNum > -1) {
          wsMerged.getRange(rowNum, 20).setValue(needReport ? "是" : "否");
          if (needReport) {
            if (!responsibleName) {
              throw new Error(
                "需要故障报告前必须分配责任人 / Please assign a responsible person before requesting a failure report"
              );
            }
            var rowForProcessing = wsMerged.getRange(rowNum, 1, 1, wsMerged.getLastColumn()).getValues()[0];
            try {
              writeToFailureDatabase(rowForProcessing, process, responsibleName);
              sendFailureReportNotification(rowForProcessing, process, responsibleName);
            } catch (e) {
              console.error(
                "写入 Failure_Database 或发送通知失败 / Failed to write or notify:",
                e
              );
            }
          }
          updateSuccess = true;
          updatedSheetName = SHIFT_RECORDS_SHEET_NAME;
        }
      }
    } else {
      let sheetNames = [];
      if (process === "IM") {
        sheetNames = ["Shift_INJ_TB1", "Shift_INJ_TB2"];
      } else if (process === "TF") {
        sheetNames = ["Shift_TF_TB1", "Shift_TF_TB2"];
      } else if (process === "PK") {
        sheetNames = ["Shift_PK_TB1", "Shift_PK_TB2"];
      } else {
        throw new Error("无效的工序参数 / Invalid process parameter: " + process);
      }

      for (let sheetName of sheetNames) {
        try {
          const sheet = spreadsheet.getSheetByName(sheetName);
          if (!sheet) continue;

          const data = sheet.getDataRange().getValues();
          if (data.length <= 1) continue;

          let rowIndex = -1;
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(reportId)) {
              rowIndex = i;
              break;
            }
          }

          if (rowIndex !== -1) {
            sheet
              .getRange(rowIndex + 1, 20)
              .setValue(needReport ? "是" : "否");

            if (needReport) {
              if (!responsibleName) {
                throw new Error(
                  "需要故障报告前必须分配责任人 / Please assign a responsible person before requesting a failure report"
                );
              }
              const rowForProcessing = rowDataFromClient || data[rowIndex];
              try {
                writeToFailureDatabase(rowForProcessing, process, responsibleName);
                sendFailureReportNotification(rowForProcessing, process, responsibleName);
              } catch (e) {
                console.error(
                  "写入 Failure_Database 或发送通知失败 / Failed to write or notify:",
                  e
                );
              }
            }

            updateSuccess = true;
            updatedSheetName = sheetName;
            break;
          }
        } catch (sheetError) {
          console.error(
            "处理Sheet时出错 / Error processing sheet:",
            sheetName,
            sheetError
          );
          continue;
        }
      }
    }

    if (!updateSuccess) {
      throw new Error(
        "在所有相关Sheet中均未找到匹配的记录 / No matching record found in any related sheets"
      );
    }

    return {
      success: true,
      message:
        "故障报告确认状态已成功更新 / Failure report confirmation status updated successfully",
      details: {
        reportId,
        process,
        needReport,
        updatedSheet: updatedSheetName,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error(
      "更新故障报告确认状态失败 / Failed to update failure report confirmation status:",
      error
    );
    throw new Error("更新失败 / Update failed: " + error.message);
  }
}

function updateFailureReportResponsible(failureReportNumber, process, responsiblePerson) {
  try {
    const spreadsheetId = "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Failure_Database");
    if (!sheet) throw new Error("Failure_Database sheet not found");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === String(failureReportNumber).trim()) {
        sheet.getRange(i + 1, 12).setValue(String(responsiblePerson || '').trim());
        return { success: true };
      }
    }
    throw new Error("Record not found: " + failureReportNumber);
  } catch (e) {
    throw new Error("updateFailureReportResponsible failed: " + e.message);
  }
}

/**
 * 保存责任人并发送邮件通知
 * Save responsible person and send email notification to responsible person + supervisor
 * @param {string} failureReportNumber - 故障报告编号
 * @param {string} process - 工序 (IM/TF/PK)
 * @param {string} responsiblePerson - 责任人 (format: Name【email】)
 * @returns {string} JSON result
 */
function saveResponsibleAndNotify(failureReportNumber, process, responsiblePerson) {
  try {
    // 1. 更新 Failure_Database 第12列责任人
    const spreadsheetId = "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Failure_Database");
    if (!sheet) throw new Error("Failure_Database sheet not found");
    const data = sheet.getDataRange().getValues();
    let rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === String(failureReportNumber).trim()) {
        sheet.getRange(i + 1, 12).setValue(String(responsiblePerson || "").trim());
        rowData = data[i];
        break;
      }
    }
    if (!rowData) throw new Error("Record not found: " + failureReportNumber);

    // 2. 从显示格式 "Name【email】" 提取姓名和邮箱
    const respName = extractName(responsiblePerson);
    const respEmail = extractEmail(responsiblePerson);

    if (!respEmail) {
      return JSON.stringify({
        success: true,
        message: "责任人已保存，但未找到邮箱，无法发送通知 / Saved but no email found for notification",
        noEmail: true
      });
    }

    // 3. 从 userID 表查找直线上级邮箱
    const userIDSS = SpreadsheetApp.openById("1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM");
    const userIDWs = userIDSS.getSheetByName("userID");
    let supervisorEmail = "";
    if (userIDWs) {
      const userVals = userIDWs.getDataRange().getValues();
      for (let i = 2; i < userVals.length; i++) {
        if (String(userVals[i][1] || "").trim() === respName) {
          supervisorEmail = String(userVals[i][60] || "").trim(); // BI列：直线上级邮箱
          break;
        }
      }
    }

    // 4. 获取故障报告详情用于邮件
    const reportNo = String(rowData[0] || "");
    const machineNo = String(rowData[1] || "");
    const problemDescription = String(rowData[2] || "");
    var submitDate = "";
    if (rowData[3]) {
      try {
        var d = new Date(rowData[3]);
        if (!isNaN(d.getTime())) {
          submitDate = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        } else { submitDate = String(rowData[3]); }
      } catch (e) { submitDate = String(rowData[3]); }
    }
    const workshop = String(rowData[4] || "");
    const processName = String(rowData[5] || process || "");

    // 5. 构建并发送邮件
    const tz = Session.getScriptTimeZone() || "Asia/Hong_Kong";
    const now = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    const subject = "【故障报告责任人通知】" + reportNo + " - " + machineNo + " / Failure Report Assignment - " + now;

    var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);overflow:hidden;">'
      + '<div style="background-color:#E60012;color:white;padding:20px;text-align:center;">'
      + '<h1 style="margin:0;font-size:22px;">故障报告责任人通知</h1>'
      + '<p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Failure Report Assignment Notification</p>'
      + '</div>'
      + '<div style="padding:30px;">'
      + '<p style="font-size:15px;line-height:1.6;color:#333;">' + escapeHtml(respName) + '，您好 / Hello，</p>'
      + '<p style="font-size:15px;line-height:1.6;color:#333;">您已被指定为以下故障报告的责任人，请及时处理：</p>'
      + '<p style="font-size:15px;line-height:1.6;color:#333;">You have been assigned as the responsible person for the following failure report:</p>'
      + '<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
      + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
      + '<th style="padding:10px 12px;text-align:left;width:30%;">项目 / Item</th>'
      + '<th style="padding:10px 12px;text-align:left;">详情 / Details</th>'
      + '</tr></thead><tbody>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">故障报告编号<br>Failure Report No.</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(reportNo) + '</td></tr>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">车间 / Workshop</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(workshop) + '</td></tr>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">工序 / Process</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(processName) + '</td></tr>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">机台号 / Machine No.</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(machineNo) + '</td></tr>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">提交日期 / Submit Date</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(submitDate) + '</td></tr>'
      + '<tr><td style="padding:10px 12px;background:#fff5f5;font-weight:600;">问题描述<br>Problem Description</td>'
      + '<td style="padding:10px 12px;">' + escapeHtml(problemDescription) + '</td></tr>'
      + '</tbody></table>'
      + '<p style="font-size:13px;color:#888;font-style:italic;">此邮件由 EDS 系统自动发送 / This email is auto-generated by EDS system.</p>'
      + '</div></div></div>';

    GmailApp.sendEmail(respEmail, subject, "", {
      htmlBody: htmlBody,
      cc: supervisorEmail || undefined
    });

    console.log("责任人通知邮件已发送至 / Notification sent to: " + respEmail
      + (supervisorEmail ? ", CC: " + supervisorEmail : ""));

    return JSON.stringify({
      success: true,
      message: "责任人已保存，通知已发送 / Saved and notification sent",
      respEmail: respEmail,
      supervisorEmail: supervisorEmail || ""
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      message: "保存失败 / Save failed: " + e.toString()
    });
  }
}

/**
 * 从显示格式 "Name【email】" 提取姓名
 */
function extractName(display) {
  if (!display) return "";
  var s = String(display).trim();
  var match = s.match(/^(.+?)【(.+?)】$/);
  return match ? match[1].trim() : s;
}

/**
 * 从显示格式 "Name【email】" 提取邮箱
 */
function extractEmail(display) {
  if (!display) return "";
  var s = String(display).trim();
  var match = s.match(/^(.+?)【(.+?)】$/);
  return match ? match[2].trim() : "";
}

function sendFailureReportNotification(rowData, process, responsiblePerson) {
  try {
    console.log(
      "开始发送故障报告邮件通知 / Starting to send failure report email notification"
    );

    let reportNo = "";
    let machineNo = "";
    let problemDescription = "";
    let submitDate = "";
    let workshop = "";
    let processName = process;

    if (Array.isArray(rowData)) {
      reportNo = rowData[0] || "";
      machineNo = rowData[2] || "";
      problemDescription = rowData[3] || "";
      submitDate = rowData[11] ? rowData[11].toString() : "";
      workshop = rowData[14] || "";
      processName = rowData[15] || process;
    } else if (rowData && typeof rowData === "object") {
      reportNo = rowData.reportNo || rowData.failureReportNumber || "";
      machineNo = rowData.machineNo || "";
      problemDescription = rowData.problemDescription || "";
      submitDate = rowData.submitDate || "";
      workshop = rowData.workshop || "";
      processName = rowData.process || process;
    }

    console.log("提取的故障报告信息 / Extracted failure report info:", {
      reportNo,
      machineNo,
      problemDescription,
      submitDate,
      workshop,
      processName,
    });

    // 格式化提交日期为 YYYY-MM-DD 格式
    let formattedDate = "";
    if (submitDate) {
      try {
        const date = new Date(submitDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          formattedDate = `${year}-${month}-${day}`;
        } else {
          formattedDate = submitDate;
        }
      } catch (e) {
        formattedDate = submitDate;
      }
    }

    // 构建邮件标题 - 使用当前日期，不是故障发生日期
    const currentDate = new Date();
    const currentDateString =
      currentDate.getFullYear() +
      "-" +
      String(currentDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(currentDate.getDate()).padStart(2, "0");
    const emailSubject = `故障报告需求通知 / Failure Report Request Notification - ${currentDateString}`;

    // 构建HTML邮件内容 - 参考PM报告的样式
    let htmlBody = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 1000px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #E60012; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
          .content { padding: 30px; }
          .info-section { margin-bottom: 25px; }
          .info-section h2 { color: #E60012; border-bottom: 2px solid #E60012; padding-bottom: 10px; margin-bottom: 20px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; color: #333; font-size: 14px; }
          td { background-color: white; font-size: 14px; }
          .highlight { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .highlight h3 { margin: 0 0 10px 0; color: #856404; }
          .highlight p { margin: 0; color: #856404; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>故障报告需求通知 / Failure Report Request Notification</h1>
            <p>报告时间: ${new Date().toLocaleString("zh-CN")}</p>
          </div>
          
          <div class="content">
            <div class="info-section">
              <h2>故障信息 / Failure Information</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 20%;">字段 / Field</th>
                    <th style="width: 20%;">值 / Value</th>
                    <th style="width: 20%;">字段 / Field</th>
                    <th style="width: 40%;">值 / Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>提交日期 / Submit Date</strong></td>
                    <td>${formattedDate}</td>
                    <td><strong>工序 / Process</strong></td>
                    <td>${processName}工序</td>
                  </tr>
                  <tr>
                    <td><strong>车间 / Workshop</strong></td>
                    <td>${workshop}</td>
                    <td><strong>机台号 / Machine No.</strong></td>
                    <td>${machineNo}</td>
                  </tr>
                  <tr>
                    <td colspan="2"><strong>问题描述 / Problem Description</strong></td>
                    <td colspan="2">${problemDescription}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="highlight">
              <h3>⚠️ 重要提醒 / Important Reminder</h3>
              <p>请准备故障报告，并与三日内上传系统 / Please prepare the failure report and upload it to the system within three days.</p>
            </div>
            
            <div class="info-section">
              <h2>故障报告要求 / Failure Report Requirements</h2>
              <ul style="line-height: 1.6; color: #333;">
                <li>详细描述故障现象和影响 / Detailed description of failure symptoms and impact</li>
                <li>分析故障原因 / Analysis of failure causes</li>
                <li>记录维修过程和措施 / Record maintenance process and measures</li>
                <li>提出预防措施建议 / Propose preventive measures</li>
                <li>附上相关照片和文档 / Attach relevant photos and documents</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>此邮件由EDS设备管理系统自动发送 / This email is automatically sent by EDS Equipment Management System</p>
            <p>如有疑问，请联系系统管理员 / For questions, please contact system administrator</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 构建纯文本邮件内容（作为备选）
    const emailBody = `对${formattedDate}在${workshop}${processName}工序${machineNo}发生的${problemDescription}准备故障报告，并与三日内上传系统`;

    console.log("邮件标题 / Email subject:", emailSubject);
    console.log("HTML邮件内容 / HTML email body:", htmlBody);
    console.log("纯文本邮件内容 / Plain text email body:", emailBody);

    // 获取收件人邮箱地址 - 将INJ转换为IM进行匹配
    let processForMatching = processName;
    if (processName === "INJ") {
      processForMatching = "IM";
      console.log(
        "工序INJ转换为IM进行邮箱匹配 / Process INJ converted to IM for email matching"
      );
    }

    const recipientEmails = getNotificationEmails(processForMatching, workshop);
    console.log("收件人邮箱 / Recipient emails:", recipientEmails);

    // 提取责任人邮箱并加入收件人列表
    if (responsiblePerson) {
      const respMatch = String(responsiblePerson).match(/【(.+?)】$/);
      if (respMatch && respMatch[1]) {
        const respEmail = respMatch[1].trim();
        if (respEmail && !recipientEmails.includes(respEmail)) {
          recipientEmails.push(respEmail);
          console.log("已添加责任人邮箱 / Added responsible person email:", respEmail);
        }
      }
    }

    if (recipientEmails.length === 0) {
      console.warn(
        "未找到对应的收件人邮箱 / No recipient emails found for process:",
        processName,
        "workshop:",
        workshop
      );
      return;
    }

    // 查询责任人的 Line Manager 邮箱用于 CC
    let lineManagerEmail = '';
    if (responsiblePerson) {
      const nameMatch = String(responsiblePerson).match(/^(.+?)【/);
      const respName = nameMatch ? nameMatch[1].trim() : String(responsiblePerson).trim();
      lineManagerEmail = getLineManagerEmail(respName);
      if (lineManagerEmail) {
        console.log('已找到责任人Line Manager邮箱 / Found Line Manager email for CC:', lineManagerEmail);
      }
    }

    // 发送邮件 - 合并收件人一次发送，CC Line Manager
    try {
      const sendOptions = { htmlBody: htmlBody };
      if (lineManagerEmail) sendOptions.cc = lineManagerEmail;
      GmailApp.sendEmail(recipientEmails.join(','), emailSubject, '', sendOptions);
      console.log(`✅ 邮件已发送给 / Email sent to: ${recipientEmails.join(', ')}${lineManagerEmail ? '，CC: ' + lineManagerEmail : ''}`);
    } catch (e) {
      console.error(`发送邮件时发生错误：${e.message}`);
      // 如果GmailApp失败，尝试使用MailApp作为备选方案
      try {
        const mailOptions = {
          to: recipientEmails.join(','),
          subject: emailSubject,
          body: emailBody,
        };
        if (lineManagerEmail) mailOptions.cc = lineManagerEmail;
        MailApp.sendEmail(mailOptions);
        console.log('使用MailApp备选方案成功发送邮件 / Successfully sent email using MailApp fallback');
      } catch (mailAppError) {
        console.error(
          'MailApp备选方案也失败 / MailApp fallback also failed:',
          mailAppError
        );
      }
    }

    console.log(
      "故障报告邮件通知发送完成 / Failure report email notification completed"
    );
  } catch (error) {
    console.error(
      "发送故障报告邮件通知时出错 / Error sending failure report email notification:",
      error
    );
    throw error;
  }
}

function getNotificationEmails(process, workshop) {
  try {
    console.log(
      "获取通知邮箱地址 / Getting notification email addresses for process:",
      process,
      "workshop:",
      workshop
    );

    // 打开通知清单Sheet
    const notificationSpreadsheetId =
      "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w"; // 使用相同的Spreadsheet ID
    const spreadsheet = SpreadsheetApp.openById(notificationSpreadsheetId);
    const notificationSheet = spreadsheet.getSheetByName("通知清单");

    if (!notificationSheet) {
      console.error("通知清单Sheet未找到 / Notification list sheet not found");
      return [];
    }

    // 获取所有数据
    const data = notificationSheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log(
        "通知清单Sheet数据为空 / Notification list sheet data is empty"
      );
      return [];
    }

    // 查找表头行 - 基于实际的通知清单结构
    let functionColIndex = -1;
    let processColIndex = -1;
    let workshopColIndex = -1;
    let mailColIndex = -1;

    const headers = data[0];
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      if (header === "Function") {
        functionColIndex = i;
      } else if (header === "Process") {
        processColIndex = i;
      } else if (header === "Workshop") {
        workshopColIndex = i;
      } else if (header === "Mail") {
        mailColIndex = i;
      }
    }

    console.log("列索引 / Column indices:", {
      functionColIndex,
      processColIndex,
      workshopColIndex,
      mailColIndex,
    });

    if (
      functionColIndex === -1 ||
      processColIndex === -1 ||
      workshopColIndex === -1 ||
      mailColIndex === -1
    ) {
      console.error("未找到必要的列 / Required columns not found");
      return [];
    }

    // 查找匹配的邮箱地址
    const emails = [];
    console.log(
      "开始搜索匹配的邮箱地址 / Starting to search for matching email addresses..."
    );
    console.log("搜索条件 / Search criteria:", {
      function: "故障报告",
      process: process,
      workshop: workshop,
    });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowFunction = String(row[functionColIndex] || "").trim();
      const rowProcess = String(row[processColIndex] || "").trim();
      const rowWorkshop = String(row[workshopColIndex] || "").trim();
      const rowMail = String(row[mailColIndex] || "").trim();

      console.log(`检查第 ${i + 1} 行数据 / Checking row ${i + 1}:`, {
        rowFunction: rowFunction,
        rowProcess: rowProcess,
        rowWorkshop: rowWorkshop,
        rowMail: rowMail,
        isFunctionMatch: rowFunction === "故障报告",
        isProcessMatch: rowProcess === process,
        isWorkshopMatch: rowWorkshop === workshop,
        isMailValid: rowMail && rowMail.includes("@"),
      });

      // 检查是否匹配：Function="故障报告"、Process=工序、Workshop=车间，且邮箱不为空
      if (
        rowFunction === "故障报告" &&
        rowProcess === process &&
        rowWorkshop === workshop &&
        rowMail &&
        rowMail.includes("@")
      ) {
        emails.push(rowMail);
        console.log(
          "✅ 找到匹配的邮箱 / Found matching email:",
          rowMail,
          "for process:",
          process,
          "workshop:",
          workshop
        );
      } else {
        console.log("❌ 不匹配 / No match for row:", i + 1);
      }
    }

    console.log("=== 邮箱搜索结果汇总 / Email Search Results Summary ===");
    console.log("搜索条件 / Search criteria:", {
      function: "故障报告",
      process: process,
      workshop: workshop,
    });
    console.log("找到的邮箱地址 / Found email addresses:", emails);
    console.log(
      "总共找到匹配的邮箱数量 / Total matching emails found:",
      emails.length
    );
    console.log("==================================================");

    return emails;
  } catch (error) {
    console.error(
      "获取通知邮箱地址时出错 / Error getting notification email addresses:",
      error
    );
    return [];
  }
}

function getLineManagerEmail(personName) {
  try {
    if (!personName) return '';
    const ws = SpreadsheetApp.openById('1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM').getSheetByName('userID');
    if (!ws) return '';
    const vals = ws.getDataRange().getValues();
    const nameTrimmed = String(personName).trim();
    for (let i = 2; i < vals.length; i++) {
      if (String(vals[i][1] || '').trim() === nameTrimmed) {
        return String(vals[i][60] || '').trim();
      }
    }
    return '';
  } catch (e) {
    console.error('获取Line Manager邮箱失败 / Failed to get Line Manager email:', e);
    return '';
  }
}

/**
 * 测试邮件发送功能
 * 发送测试邮件到指定邮箱
 */
function testEmailSending() {
  try {
    console.log("开始测试邮件发送功能 / Starting email sending test");

    const testEmail = "kelland_zhao@colpal.com";
    const testSubject =
      "故障报告邮件功能测试 / Failure Report Email Function Test";

    // 构建测试HTML邮件内容
    let htmlBody = "";
    htmlBody +=
      "<h2 style='color: #E60012;'>故障报告邮件功能测试 / Failure Report Email Function Test</h2>";
    htmlBody +=
      "<p>这是一封测试邮件，用于验证故障报告邮件发送功能是否正常工作。</p>";
    htmlBody +=
      "<p>This is a test email to verify that the failure report email sending function is working properly.</p>";
    htmlBody += "<hr>";
    htmlBody += "<h3>测试信息 / Test Information</h3>";
    htmlBody +=
      "<table style='border-collapse: collapse; border: 1px solid #ccc; width: 100%;'>";
    htmlBody += "<tr style='background-color: #f2f2f2;'>";
    htmlBody +=
      "<th style='border: 1px solid #ccc; padding: 8px; text-align: left;'>字段 / Field</th>";
    htmlBody +=
      "<th style='border: 1px solid #ccc; padding: 8px; text-align: left;'>值 / Value</th>";
    htmlBody += "</tr>";
    htmlBody += "<tr>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>测试时间 / Test Time</td>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>" +
      new Date().toLocaleString("zh-CN") +
      "</td>";
    htmlBody += "</tr>";
    htmlBody += "<tr>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>测试功能 / Test Function</td>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>故障报告邮件通知 / Failure Report Email Notification</td>";
    htmlBody += "</tr>";
    htmlBody += "<tr>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>测试邮箱 / Test Email</td>";
    htmlBody +=
      "<td style='border: 1px solid #ccc; padding: 8px;'>" +
      testEmail +
      "</td>";
    htmlBody += "</tr>";
    htmlBody += "</table>";
    htmlBody += "<hr>";
    htmlBody +=
      "<p style='color: #666; font-size: 12px;'>如果您收到这封邮件，说明故障报告邮件功能正常工作。</p>";
    htmlBody +=
      "<p style='color: #666; font-size: 12px;'>If you receive this email, it means the failure report email function is working properly.</p>";

    // 构建纯文本邮件内容（作为备选）
    const plainBody = `故障报告邮件功能测试 / Failure Report Email Function Test

这是一封测试邮件，用于验证故障报告邮件发送功能是否正常工作。
This is a test email to verify that the failure report email sending function is working properly.

测试信息 / Test Information:
- 测试时间 / Test Time: ${new Date().toLocaleString("zh-CN")}
- 测试功能 / Test Function: 故障报告邮件通知 / Failure Report Email Notification
- 测试邮箱 / Test Email: ${testEmail}

如果您收到这封邮件，说明故障报告邮件功能正常工作。
If you receive this email, it means the failure report email function is working properly.`;

    console.log("测试邮件信息 / Test email info:", {
      to: testEmail,
      subject: testSubject,
      htmlBody: htmlBody,
      plainBody: plainBody,
    });

    // 尝试使用GmailApp发送HTML邮件
    try {
      GmailApp.sendEmail(testEmail, testSubject, "", {
        htmlBody: htmlBody,
      });
      console.log(
        "✅ 使用GmailApp成功发送测试邮件 / Successfully sent test email using GmailApp"
      );
      return {
        success: true,
        method: "GmailApp",
        message: "测试邮件发送成功 / Test email sent successfully",
      };
    } catch (gmailError) {
      console.error(
        "GmailApp发送失败，尝试使用MailApp / GmailApp failed, trying MailApp:",
        gmailError
      );

      // 如果GmailApp失败，尝试使用MailApp
      try {
        MailApp.sendEmail({
          to: testEmail,
          subject: testSubject,
          body: plainBody,
        });
        console.log(
          "✅ 使用MailApp成功发送测试邮件 / Successfully sent test email using MailApp"
        );
        return {
          success: true,
          method: "MailApp",
          message: "测试邮件发送成功 / Test email sent successfully",
        };
      } catch (mailAppError) {
        console.error("MailApp也发送失败 / MailApp also failed:", mailAppError);
        return {
          success: false,
          method: "Both failed",
          message: "所有邮件发送方式都失败 / All email sending methods failed",
          errors: {
            gmailApp: gmailError.message,
            mailApp: mailAppError.message,
          },
        };
      }
    }
  } catch (error) {
    console.error(
      "测试邮件发送功能时出错 / Error testing email sending function:",
      error
    );
    return {
      success: false,
      method: "Error",
      message: "测试过程中发生错误 / Error occurred during testing",
      error: error.message,
    };
  }
}

/** 将 Date 对象或日期字符串格式化为 YYYY-MM-DD，用于字符串比较（避免 new Date('YYYY-MM-DD') UTC 时区偏差） */
function _formatDateStr(raw) {
  if (!raw) return '';
  var d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return '';
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function getFilteredFailureReportData() {
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let spreadsheet = SpreadsheetApp.openById(id);

  // 定义筛选条件（维修时间，单位：分钟）
  let timeThresholds = {
    IM: 240,
    TF: 120,
    PK: 60,
  };

  // 存储筛选后的数据
  let result = {
    IM: [],
    TF: [],
    PK: [],
  };

  // 合并表模式：从 Shift_Records 统一读取
  if (USE_MERGED_SHIFT_SHEET) {
    var wsMerged = getShiftSheet(spreadsheet);
    if (wsMerged && wsMerged.getLastRow() > 1) {
      var allData = wsMerged.getDataRange().getValues();
      for (var i = 1; i < allData.length; i++) {
        var row = allData[i];
        // 利用原表已有列：col O(14)=车间, col P(15)=工序
        var rowWorkshop = String(row[14] || '').trim();
        var rowProcess = String(row[15] || '').trim();
        // INJ → IM 映射
        var mappedProcess = rowProcess === 'INJ' ? 'IM' : rowProcess;
        var threshold = timeThresholds[mappedProcess];
        if (!threshold) continue;

        // 维修时间处理（同旧逻辑）
        var repairTimeStr = row[7] ? row[7].toString() : "0";
        var repairTime = 0;
        var timeMatch = repairTimeStr.match(/(\d+)/g);
        if (timeMatch) {
          if (repairTimeStr.includes("小时")) {
            repairTime = parseInt(timeMatch[0]) * 60;
            if (timeMatch.length > 1) repairTime += parseInt(timeMatch[1]);
          } else {
            repairTime = parseInt(timeMatch[0]);
          }
        }
        if (repairTime >= threshold) {
          if (mappedProcess === 'PK') {
            var rawSubmitDate = row[11];
            if (rawSubmitDate) {
              var dateStr = _formatDateStr(row[11]);
              if (dateStr < '2026-05-15') continue;
            }
            var problemDesc = String(row[3] || '');
            if (problemDesc.includes('转规格')) continue;
          }
          result[mappedProcess].push({
            reportNo: row[0] || "",
            machineNo: row[2] || "",
            problemDescription: String(row[3] || ''),
            status: row[5] || "",
            repairTime: repairTimeStr,
            submitDate: row[11] ? row[11].toString() : "",
            shift: row[1] || "",
            maintenancePerson: row[6] || "",
            workshop: rowWorkshop || "",
            process: rowProcess || mappedProcess,
            submitter: row[13] || "",
            confirmation: row[18] || "待确认 / Pending Confirmation",
            needFailureReport: row[19] || "",
            responsiblePerson: "",
          });
        }
      }
    }
  } else {
    // 旧版：遍历6个分表
    var sheets = {
      IM: ["Shift_INJ_TB1", "Shift_INJ_TB2"],
      TF: ["Shift_TF_TB1", "Shift_TF_TB2"],
      PK: ["Shift_PK_TB1", "Shift_PK_TB2"],
    };
    for (var process in sheets) {
      var sheetNames = sheets[process];
      var threshold = timeThresholds[process];
      for (var s = 0; s < sheetNames.length; s++) {
        var sheetName = sheetNames[s];
        var sheet = spreadsheet.getSheetByName(sheetName);
        if (sheet) {
          var data = sheet.getDataRange().getValues();
          Logger.log("Sheet " + sheetName + " 数据行数 / Data rows: " + data.length);
          for (var i = 1; i < data.length; i++) {
            var row = data[i];
            var repairTimeStr = row[7] ? row[7].toString() : "0";
            var repairTime = 0;
            var timeMatch = repairTimeStr.match(/(\d+)/g);
            if (timeMatch) {
              if (repairTimeStr.includes("小时")) {
                repairTime = parseInt(timeMatch[0]) * 60;
                if (timeMatch.length > 1) repairTime += parseInt(timeMatch[1]);
              } else {
                repairTime = parseInt(timeMatch[0]);
              }
            }
            if (repairTime >= threshold) {
              if (process === 'PK') {
                var rawSubmitDate = row[11];
                if (rawSubmitDate) {
                  var dateStr = _formatDateStr(row[11]);
                  if (dateStr < '2026-05-15') continue;
                }
                var problemDesc = String(row[3] || '');
                if (problemDesc.includes('转规格')) continue;
              }
              result[process].push({
                reportNo: row[0] || "",
                machineNo: row[2] || "",
                problemDescription: String(row[3] || ''),
                status: row[5] || "",
                repairTime: repairTimeStr,
                submitDate: row[11] ? row[11].toString() : "",
                shift: row[1] || "",
                maintenancePerson: row[6] || "",
                workshop: row[14] || "",
                process: row[15] || process,
                submitter: row[13] || "",
                confirmation: row[18] || "待确认 / Pending Confirmation",
                needFailureReport: row[19] || "",
                responsiblePerson: "",
              });
            }
          }
        } else {
          Logger.log("Sheet " + sheetName + " 未找到 / Not found");
        }
      }
    }
  }

  Logger.log(
    "筛选后数据 / Filtered data: IM=" +
      result.IM.length +
      ", TF=" +
      result.TF.length +
      ", PK=" +
      result.PK.length
  );
  // 使用JSON.stringify显式转换为JSON字符串
  return JSON.stringify(result);
}

/**
 * 获取故障报告进度数据
 * 用于故障报告进度页面显示
 * 直接从Failure_Database sheet获取数据
 */
function getFailureReportProgressData(userEmail, userName) {
  try {
    console.log(
      "开始获取故障报告进度数据 / Starting to get failure report progress data"
    );

    // 打开Failure_Database sheet
    const failureDatabaseSpreadsheetId =
      "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const spreadsheet = SpreadsheetApp.openById(failureDatabaseSpreadsheetId);
    const failureDatabaseSheet = spreadsheet.getSheetByName("Failure_Database");
    const followupSheet = spreadsheet.getSheetByName("Failure_Report_followup");

    if (!failureDatabaseSheet) {
      throw new Error(
        "Failure_Database sheet未找到 / Failure_Database sheet not found"
      );
    }

    // 一次性拉取 followup 全表并聚合为 Map（避免 N×M 全表扫描）
    const verifyMap = new Map();
    if (followupSheet) {
      const followData = followupSheet.getDataRange().getValues();
      for (let i = 1; i < followData.length; i++) {
        const reportNo = String(followData[i][1] || '').trim();
        if (!reportNo) continue;
        const status = String(followData[i][8] || '').trim();
        if (!verifyMap.has(reportNo)) verifyMap.set(reportNo, { pass: 0, total: 0 });
        const agg = verifyMap.get(reportNo);
        agg.total++;
        if (status === '已通过 / Passed') agg.pass++;
      }
    }

    // 获取所有数据
    const data = failureDatabaseSheet.getDataRange().getValues();
    const formulas = failureDatabaseSheet.getDataRange().getFormulas();
    if (data.length <= 1) {
      console.log(
        "Failure_Database sheet数据为空 / Failure_Database sheet data is empty"
      );
      return {
        IM: [],
        TF: [],
        PK: [],
      };
    }

    // 如果传入了用户身份信息，检查是否管理员（决定是否过滤数据）
    let shouldFilter = false;
    let userNameTrimmed = '';
    const hasUserIdentity = (userEmail !== undefined && userEmail !== null && String(userEmail).trim() !== '') ||
                            (userName !== undefined && userName !== null && String(userName).trim() !== '');
    if (hasUserIdentity) {
      const isAdmin = checkFailureReportFillPermission(userEmail, userName);
      userNameTrimmed = String(userName || '').trim();
      shouldFilter = !isAdmin;
      console.log("权限过滤模式: isAdmin=" + isAdmin + ", shouldFilter=" + shouldFilter + ", userName=" + userNameTrimmed);
    }

    // 存储进度数据
    let result = {
      IM: [],
      TF: [],
      PK: [],
    };

    // 收集每行的完成天数，用于批量回写后端表格
    const completionDaysBackfill = [];

    // 从 Shift 表查找班次、填写人、维修人，以及回补缺失的 repairTime
    const shiftShiftMap = {};      // 班次查找表
    const shiftSubmitterMap = {};  // 填写人查找表
    const shiftMaintenancePersonMap = {}; // 维修人查找表
    const shiftRepairTimeMap = {};
    const hasEmptyRepairTime = data.slice(1).some(function(r) { return !String(r[13] || '').trim(); });
    // 始终构建班次和填写人查找表；仅在需要回补时构建 repairTime 表
    (function buildShiftLookupMaps() {
      const shiftSS = SpreadsheetApp.openById('10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w');
      if (USE_MERGED_SHIFT_SHEET) {
        var wsMerged = getShiftSheet(shiftSS);
        if (wsMerged) {
          var sData = wsMerged.getDataRange().getValues();
          for (var j = 1; j < sData.length; j++) {
            var rNo = String(sData[j][0] || '').trim();
            if (!rNo) continue;
            var rShift = sData[j][1] != null ? String(sData[j][1]).trim() : '';
            var rSubmitter = sData[j][13] != null ? String(sData[j][13]).trim() : '';
            var rMaintenancePerson = sData[j][6] != null ? String(sData[j][6]).trim() : '';
            if (rShift && !shiftShiftMap[rNo]) shiftShiftMap[rNo] = rShift;
            if (rSubmitter && !shiftSubmitterMap[rNo]) shiftSubmitterMap[rNo] = rSubmitter;
            if (rMaintenancePerson && !shiftMaintenancePersonMap[rNo]) shiftMaintenancePersonMap[rNo] = rMaintenancePerson;
            if (hasEmptyRepairTime) {
              var rTime = sData[j][7] != null ? String(sData[j][7]) : '';
              if (rTime && !shiftRepairTimeMap[rNo]) shiftRepairTimeMap[rNo] = rTime;
            }
          }
        }
      } else {
        ['Shift_INJ_TB1','Shift_INJ_TB2','Shift_TF_TB1','Shift_TF_TB2','Shift_PK_TB1','Shift_PK_TB2'].forEach(function(sn) {
          const sSheet = shiftSS.getSheetByName(sn);
          if (!sSheet) return;
          const sData = sSheet.getDataRange().getValues();
          for (let j = 1; j < sData.length; j++) {
            const rNo = String(sData[j][0] || '').trim();
            if (!rNo) continue;
            const rShift = sData[j][1] != null ? String(sData[j][1]).trim() : '';
            const rSubmitter = sData[j][13] != null ? String(sData[j][13]).trim() : '';
            const rMaintenancePerson = sData[j][6] != null ? String(sData[j][6]).trim() : '';
            if (rShift && !shiftShiftMap[rNo]) shiftShiftMap[rNo] = rShift;
            if (rSubmitter && !shiftSubmitterMap[rNo]) shiftSubmitterMap[rNo] = rSubmitter;
            if (rMaintenancePerson && !shiftMaintenancePersonMap[rNo]) shiftMaintenancePersonMap[rNo] = rMaintenancePerson;
            if (hasEmptyRepairTime) {
              const rTime = sData[j][7] != null ? String(sData[j][7]) : '';
              if (rTime && !shiftRepairTimeMap[rNo]) shiftRepairTimeMap[rNo] = rTime;
            }
          }
        });
      }
    })();

    // 从第2行开始遍历数据（第1行是表头）
    for (let i = 1; i < data.length; i++) {
      let row = data[i];

      // 根据新的数据结构提取字段（编号、机台号、问题描述、提交日期、车间、工序、故障报告编号、分配日期、上传日期、附件）
      const reportNo = row[0] || ""; // 编号
      const machineNo = row[1] || ""; // 机台号
      const problemDescription = row[2] || ""; // 问题描述

      // 处理日期格式，转换为JSON兼容格式
      let submitDate = "";
      if (row[3]) {
        try {
          const date = new Date(row[3]);
          if (!isNaN(date.getTime())) {
            submitDate = date.toISOString();
          } else {
            submitDate = row[3].toString();
          }
        } catch (e) {
          submitDate = row[3].toString();
        }
      }

      const workshop = row[4] || ""; // 车间
      const process = row[5] || ""; // 工序
      const failureReportNumber = row[6] || ""; // 故障报告编号

      // 处理分配日期
      let assignmentDate = "";
      if (row[7]) {
        try {
          const date = new Date(row[7]);
          if (!isNaN(date.getTime())) {
            assignmentDate = date.toISOString();
          } else {
            assignmentDate = row[7].toString();
          }
        } catch (e) {
          assignmentDate = row[7].toString();
        }
      }

      // 处理上传日期
      let uploadDate = "";
      if (row[8]) {
        try {
          const date = new Date(row[8]);
          if (!isNaN(date.getTime())) {
            uploadDate = date.toISOString();
          } else {
            uploadDate = row[8].toString();
          }
        } catch (e) {
          uploadDate = row[8].toString();
        }
      }

      const attachments = formulas[i][9] || row[9] || ""; // 附件
      const responsiblePerson = String(row[11] || '').trim(); // 责任人（第12列，索引11）
      const existingCompletionDays = String(row[12] || '').trim(); // 已有的完成天数（列13）
      let repairTime = String(row[13] || '').trim(); // 维修时间 / MDT（列14）
      if (!repairTime && reportNo && shiftRepairTimeMap[reportNo]) {
        repairTime = shiftRepairTimeMap[reportNo];
        failureDatabaseSheet.getRange(i + 1, 14).setValue(repairTime);
      }

      // 验证进度（从 followup Map 聚合）+ 状态三态
      const verifyAgg = verifyMap.get(String(failureReportNumber).trim()) || { pass: 0, total: 0 };
      const verifyPassed = verifyAgg.pass;
      const verifyTotal = verifyAgg.total;
      // O列值映射为统一状态（兼容旧值：空→待提交，已通过→按验证状态推断）
      var reviewStatusStr = String(row[14] || '').trim();
      var progressStatus;
      if (reviewStatusStr === '' || reviewStatusStr === '未提交') {
        progressStatus = '待提交';
      } else if (reviewStatusStr === '已通过') {
        // 旧"已通过"：按验证状态推断新值
        progressStatus = (verifyTotal === 0 || verifyPassed >= verifyTotal) ? '已完成' : '审核通过';
      } else {
        progressStatus = reviewStatusStr;
      }

      // 计算完成天数
      // 已上传且有已有值：复用，不重新计算；未上传或无值：动态计算
      let completionDays = '';
      if (uploadDate && existingCompletionDays !== '') {
        completionDays = parseInt(existingCompletionDays) || '';
      } else {
        try {
          const assignDate = assignmentDate ? new Date(assignmentDate) : null;
          let endDate = null;
          if (uploadDate) {
            endDate = new Date(uploadDate);
          } else {
            endDate = new Date();
          }
          if (assignDate && !isNaN(assignDate.getTime()) && endDate && !isNaN(endDate.getTime())) {
            const diffTime = endDate.getTime() - assignDate.getTime();
            completionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        } catch (e) {
          completionDays = '';
        }
      }

      // 收集完成天数用于批量回写后端表格
      completionDaysBackfill.push([completionDays]);

      // 权限过滤：非管理员只能看到自己作为责任人 or 责任人为空的报告
      if (shouldFilter) {
        const isResponsible = responsiblePerson && responsiblePerson.includes(userNameTrimmed);
        const isEmptyResponsible = !responsiblePerson;
        if (!isResponsible && !isEmptyResponsible) {
          continue;
        }
      }

      // 调试：检查提取的数据
      if (i === 1) {
        // 只对第一行数据进行调试
        console.log("第一行数据提取结果:");
        console.log("  机台号:", machineNo);
        console.log("  提交日期:", submitDate);
        console.log("  工序:", process);
        console.log("  责任人:", responsiblePerson);
      }

      // 根据工序分类数据
      const baseItem = {
        failureReportNumber: failureReportNumber,
        workshop: workshop,
        machineNo: machineNo,
        submitDate: submitDate,
        problemDescription: problemDescription,
        assignmentDate: assignmentDate,
        completionDays: completionDays,
        uploadDate: uploadDate,
        attachments: attachments,
        responsiblePerson: responsiblePerson,
        repairTime: repairTime,
        shift: shiftShiftMap[String(reportNo).trim()] || '',      // 从Shift表查找班次
        maintenancePerson: shiftMaintenancePersonMap[String(reportNo).trim()] || '', // 从Shift表查找维修人
        submitter: shiftSubmitterMap[String(reportNo).trim()] || '', // 从Shift表查找填写人
        verifyTotal: verifyTotal,
        verifyPassed: verifyPassed,
        progressStatus: progressStatus,
        hasFormData: !!(row[10] && String(row[10]).trim().startsWith('{')),
        // 主管审核新增列 O-R（索引 14-17）
        reviewStatus: String(row[14] || '').trim(),   // O: 审核状态
        reviewedBy: String(row[15] || '').trim(),     // P: 审核人
        reviewDate: String(row[16] || '').trim(),     // Q: 审核日期
        returnReason: String(row[17] || '').trim(),   // R: 退回原因
      };
      if (process === "IM" || process === "INJ") {
        result.IM.push(Object.assign({ process: "IM" }, baseItem));
      } else if (process === "TF") {
        result.TF.push(Object.assign({ process: "TF" }, baseItem));
      } else if (process === "PK") {
        result.PK.push(Object.assign({ process: "PK" }, baseItem));
      }
    }

    // 批量回写完成天数到后端表格列13
    if (completionDaysBackfill.length > 0) {
      try {
        const COMPLETION_DAYS_COL = 13;
        const headerCell = failureDatabaseSheet.getRange(1, COMPLETION_DAYS_COL);
        if (!headerCell.getValue()) {
          headerCell.setValue("完成天数");
        }
        failureDatabaseSheet.getRange(2, COMPLETION_DAYS_COL, completionDaysBackfill.length, 1)
          .setValues(completionDaysBackfill);
        console.log("完成天数批量回写完成，共" + completionDaysBackfill.length + "行");
      } catch (e) {
        console.error("完成天数批量回写失败:", e);
      }
    }

    console.log(
      "故障报告进度数据获取完成 / Failure Report Progress Data retrieved successfully"
    );
    console.log(
      "数据统计 / Data statistics: IM=" +
        result.IM.length +
        ", TF=" +
        result.TF.length +
        ", PK=" +
        result.PK.length
    );

    // 调试：检查返回的数据结构
    if (result.IM.length > 0) {
      console.log("IM数据示例:", result.IM[0]);
      console.log("IM数据字段:", Object.keys(result.IM[0]));
    }
    if (result.TF.length > 0) {
      console.log("TF数据示例:", result.TF[0]);
      console.log("TF数据字段:", Object.keys(result.TF[0]));
    }
    if (result.PK.length > 0) {
      console.log("PK数据示例:", result.PK[0]);
      console.log("PK数据字段:", Object.keys(result.PK[0]));
    }

    return result;
  } catch (error) {
    console.error(
      "获取故障报告进度数据时出错 / Error getting failure report progress data:",
      error
    );
    throw new Error(
      "获取故障报告进度数据失败 / Failed to get failure report progress data: " +
        error.message
    );
  }
}

/**
 * 向Failure_Database sheet写入故障报告数据
 * 当用户确认需要故障报告时调用
 */
function writeToFailureDatabase(rowData, process, responsiblePerson) {
  try {
    console.log(
      "开始向Failure_Database sheet写入数据 / Starting to write data to Failure_Database sheet"
    );
    console.log("行数据 / Row data:", rowData);
    console.log("工序 / Process:", process);
    const responsibleName = String(responsiblePerson || "").trim();

    // 打开Failure_Database sheet
    const failureDatabaseSpreadsheetId =
      "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const spreadsheet = SpreadsheetApp.openById(failureDatabaseSpreadsheetId);
    const failureDatabaseSheet = spreadsheet.getSheetByName("Failure_Database");

    if (!failureDatabaseSheet) {
      throw new Error(
        "Failure_Database sheet未找到 / Failure_Database sheet not found"
      );
    }

    let reportNo = "";
    let machineNo = "";
    let problemDescription = "";
    let submitDateValue = "";
    let workshop = "";
    let processName = process;
    let repairTime = "";

    if (Array.isArray(rowData)) {
      reportNo = rowData[0] || "";
      machineNo = rowData[2] || "";
      problemDescription = rowData[3] || "";
      repairTime = rowData[7] != null ? String(rowData[7]) : "";
      submitDateValue = rowData[11] || "";
      workshop = rowData[14] || "";
      processName = rowData[15] || process;
    } else if (rowData && typeof rowData === "object") {
      reportNo = rowData.reportNo || rowData.failureReportNumber || "";
      machineNo = rowData.machineNo || "";
      problemDescription = rowData.problemDescription || "";
      repairTime = rowData.repairTime != null ? String(rowData.repairTime) : "";
      submitDateValue = rowData.submitDate || "";
      workshop = rowData.workshop || "";
      processName = rowData.process || process;
    } else {
      throw new Error("无效的故障报告数据 / Invalid failure report data");
    }

    let formattedSubmitDate = "";
    if (submitDateValue) {
      try {
        const date = new Date(submitDateValue);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          formattedSubmitDate = `${year}-${month}-${day}`;
        } else {
          formattedSubmitDate = submitDateValue.toString();
        }
      } catch (e) {
        formattedSubmitDate = submitDateValue.toString();
      }
    }

    // 工序转换：如果工序是INJ，则改写为IM
    if (processName === "INJ") {
      processName = "IM";
      console.log("工序INJ转换为IM / Process INJ converted to IM");
    }

    console.log("提取的数据 / Extracted data:", {
      reportNo,
      machineNo,
      problemDescription,
      submitDate: formattedSubmitDate,
      workshop,
      processName,
    });

    // 生成故障报告编号（FR+YYYY+0001格式）
    const failureReportNumber = generateFailureReportNumber();
    console.log(
      "生成的故障报告编号 / Generated failure report number:",
      failureReportNumber
    );

    // 准备要写入的数据行
    // 数据结构：编号、机台号、问题描述、提交日期、车间、工序、故障报告编号、分配日期、上传日期、附件
    const newRowData = [
      reportNo, // 编号
      machineNo, // 机台号
      problemDescription, // 问题描述
      formattedSubmitDate, // 提交日期（已格式化为YYYY-MM-DD）
      workshop, // 车间
      processName, // 工序
      failureReportNumber, // 故障报告编号
      new Date().toISOString().split("T")[0], // 分配日期（当前日期，格式为YYYY-MM-DD）
      "", // 上传日期（初始为空）
      "", // 附件（初始为空）
    ];

    console.log("准备写入的数据行 / Data row to write:", newRowData);

    // 从第二行开始写入数据（第一行是表头）
    const nextRow = failureDatabaseSheet.getLastRow() + 1;
    failureDatabaseSheet
      .getRange(nextRow, 1, 1, newRowData.length)
      .setValues([newRowData]);

    const RESPONSIBLE_COL = 12; // 责任人列
    const headerCell = failureDatabaseSheet.getRange(1, RESPONSIBLE_COL);
    if (!headerCell.getValue()) {
      headerCell.setValue("责任人");
    }
    failureDatabaseSheet.getRange(nextRow, RESPONSIBLE_COL).setValue(responsibleName);

    // 完成天数：新记录分配日期=今天、上传日期为空，完成天数=0
    const COMPLETION_DAYS_COL = 13;
    const completionDaysHeader = failureDatabaseSheet.getRange(1, COMPLETION_DAYS_COL);
    if (!completionDaysHeader.getValue()) {
      completionDaysHeader.setValue("完成天数");
    }
    failureDatabaseSheet.getRange(nextRow, COMPLETION_DAYS_COL).setValue(0);

    // 维修时间 / MDT (列14)：用于 Template 页面回填，不可编辑
    const REPAIR_TIME_COL = 14;
    const repairTimeHeader = failureDatabaseSheet.getRange(1, REPAIR_TIME_COL);
    if (!repairTimeHeader.getValue()) {
      repairTimeHeader.setValue("维修时间 / Repair Time");
    }
    failureDatabaseSheet.getRange(nextRow, REPAIR_TIME_COL).setValue(repairTime);

    // O列: 审核状态初始值 = 待提交
    var REVIEW_STATUS_COL = 15;
    var reviewStatusHeader = failureDatabaseSheet.getRange(1, REVIEW_STATUS_COL);
    if (!reviewStatusHeader.getValue()) reviewStatusHeader.setValue('审核状态');
    failureDatabaseSheet.getRange(nextRow, REVIEW_STATUS_COL).setValue('待提交');

    console.log(
      "成功写入Failure_Database sheet / Successfully wrote to Failure_Database sheet"
    );
    console.log(
      "写入位置 / Write position: 行 / Row",
      nextRow,
      "列 / Column 1"
    );

    return {
      success: true,
      message:
        "数据已成功写入Failure_Database sheet / Data successfully written to Failure_Database sheet",
      details: {
        reportNo: reportNo,
        machineNo: machineNo,
        failureReportNumber: failureReportNumber,
        row: nextRow,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error(
      "向Failure_Database sheet写入数据时出错 / Error writing data to Failure_Database sheet:",
      error
    );
    throw new Error(
      "写入Failure_Database失败 / Failed to write to Failure_Database: " +
        error.message
    );
  }
}

/**
 * 生成故障报告编号（FR+YYYY+0001格式）
 * 自动递增，确保编号唯一性
 */
function generateFailureReportNumber() {
  try {
    console.log(
      "开始生成故障报告编号 / Starting to generate failure report number"
    );

    // 打开Failure_Database sheet
    const failureDatabaseSpreadsheetId =
      "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const spreadsheet = SpreadsheetApp.openById(failureDatabaseSpreadsheetId);
    const failureDatabaseSheet = spreadsheet.getSheetByName("Failure_Database");

    if (!failureDatabaseSheet) {
      throw new Error(
        "Failure_Database sheet未找到 / Failure_Database sheet not found"
      );
    }

    // 获取当前年份
    const currentYear = new Date().getFullYear();
    const yearPrefix = "FR" + currentYear;

    console.log("年份前缀 / Year prefix:", yearPrefix);

    // 获取所有数据
    const data = failureDatabaseSheet.getDataRange().getValues();

    // 查找当前年份的最大编号
    let maxNumber = 0;
    const failureReportNumberColumnIndex = 6; // 故障报告编号列（第7列，索引为6）

    for (let i = 1; i < data.length; i++) {
      // 从第2行开始（跳过表头）
      const row = data[i];
      const failureReportNumber = row[failureReportNumberColumnIndex] || "";

      if (failureReportNumber && failureReportNumber.startsWith(yearPrefix)) {
        // 提取编号中的数字部分
        const numberMatch = failureReportNumber.match(
          new RegExp(yearPrefix + "(\\d+)")
        );
        if (numberMatch && numberMatch[1]) {
          const number = parseInt(numberMatch[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    // 生成下一个编号
    const nextNumber = maxNumber + 1;
    const newFailureReportNumber =
      yearPrefix + String(nextNumber).padStart(4, "0");

    console.log("当前年份最大编号 / Max number for current year:", maxNumber);
    console.log("生成的新编号 / Generated new number:", newFailureReportNumber);

    return newFailureReportNumber;
  } catch (error) {
    console.error(
      "生成故障报告编号时出错 / Error generating failure report number:",
      error
    );
    // 如果出错，返回一个基于当前时间的备用编号
    const timestamp = new Date().getTime();
    return "FR" + currentYear + String(timestamp).slice(-4);
  }
}

/**
 * 获取故障报告附件信息
 * 从Failure_Database表中获取指定故障报告的附件信息
 */
function getFailureReportAttachmentInfo(failureReportNumber) {
  try {
    console.log(
      "获取故障报告附件信息 / Getting failure report attachment info for:",
      failureReportNumber
    );

    // 打开Failure_Database sheet
    const failureDatabaseSpreadsheetId =
      "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU";
    const spreadsheet = SpreadsheetApp.openById(failureDatabaseSpreadsheetId);
    const failureDatabaseSheet = spreadsheet.getSheetByName("Failure_Database");

    if (!failureDatabaseSheet) {
      throw new Error(
        "Failure_Database sheet未找到 / Failure_Database sheet not found"
      );
    }

    // 查找对应的故障报告记录
    const range = failureDatabaseSheet.getDataRange();
    const data = range.getValues();
    const formulas = range.getFormulas();
    const failureReportNumberColumnIndex = 6; // 故障报告编号列（第7列，索引为6）
    const attachmentColumnIndex = 9; // 附件列（第10列，索引为9）
    const uploadDateColumnIndex = 8; // 上传日期列（第9列，索引为8）

    for (let i = 1; i < data.length; i++) {
      // 从第2行开始（跳过表头）
      const row = data[i];
      if (row[failureReportNumberColumnIndex] === failureReportNumber) {
        const attachmentInfo = row[attachmentColumnIndex] || "";
        const attachmentText = String(attachmentInfo || "").trim();
        const attachmentFormula = String(
          (formulas[i] && formulas[i][attachmentColumnIndex]) || ""
        ).trim();
        const uploadDate = row[uploadDateColumnIndex] || "";

        if (attachmentText) {
          // 解析附件信息：现在附件列存储的是超链接公式 =HYPERLINK("链接","显示文本")
          let fileName = "";
          let fileUrl = "";

          // 优先从单元格公式中提取真实链接
          if (attachmentFormula.startsWith("=HYPERLINK(")) {
            const fm = attachmentFormula.match(
              /=HYPERLINK\("([^"]+)","([^"]+)"\)/
            );
            if (fm) {
              fileUrl = fm[1];
              fileName = fm[2] || attachmentText;
            }
          }

          if (!fileUrl && attachmentText.startsWith("=HYPERLINK(")) {
            // 解析超链接公式
            const match = attachmentText.match(
              /=HYPERLINK\("([^"]+)","([^"]+)"\)/
            );
            if (match) {
              fileUrl = match[1];
              fileName = match[2];
            }
          } else if (!fileUrl && attachmentText.includes("|")) {
            // 兼容旧格式：文件名|文件链接|文件描述|上传日期
            const parts = attachmentText.split("|");
            fileName = parts[0] || "";
            fileUrl = parts[1] || "";
          } else if (!fileName) {
            // 如果都不是，直接使用原始值
            fileName = attachmentText;
          }

          const fileDescription = ""; // 当前不再存储文件描述
          const fileUploadDate = String(uploadDate || "").trim();

          return {
            success: true,
            hasAttachment: true,
            attachment: {
              fileName: String(fileName || "").trim(),
              fileUrl: String(fileUrl || "").trim(),
              fileDescription: String(fileDescription || "").trim(),
              uploadDate: fileUploadDate,
            },
          };
        } else {
          return {
            success: true,
            hasAttachment: false,
            message: "未找到附件信息 / No attachment information found"
          };
        }
      }
    }

    return {
      success: true,
      hasAttachment: false,
      message: "未找到故障报告编号 / Failure report number not found"
    };
  } catch (error) {
    console.error("获取故障报告附件信息失败:", error);
    return {
      success: false,
      message: "获取附件信息失败 / Failed to get attachment info: " + error.toString()
    };
  }
}

/**
 * 获取跟进记录列表
 * 从Failure_Report_followup表中获取所有跟进记录
 */
function getFollowupRecords() {
  try {
    console.log('获取跟进记录列表 / Getting follow-up records');

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    // 构建 Failure_Database failureReportNo -> process 映射
    const wsDB = ss.getSheetByName('Failure_Database');
    const processMap = {};
    if (wsDB) {
      const dbData = wsDB.getDataRange().getValues();
      for (let d = 1; d < dbData.length; d++) {
        const frNo = String(dbData[d][6] || '').trim();
        if (frNo) processMap[frNo] = String(dbData[d][5] || '').trim();
      }
    }

    const dataRange = wsFollow.getDataRange();
    const values = dataRange.getValues();
    const headers = values.length > 0 ? values[0] : [];
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';

    const followupData = [];

    const formatDate = (cell) => {
      if (!cell) return '';
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
      }
      return String(cell);
    };

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      const isRowEmpty = row.every(cell => cell === '' || cell === null || typeof cell === 'undefined');
      if (isRowEmpty) continue;

      const formattedRow = [
        String(row[0] || ''),
        String(row[1] || ''),
        String(row[2] || ''),
        String(row[3] || ''),
        String(row[4] || ''),
        formatDate(row[5]),
        String(row[6] || ''),
        formatDate(row[7]),
        String(row[8] || ''),
        formatDate(row[9]),
        formatDate(row[10]),
        String(row[11] || ''),
        String(row[13] || ''),  // Column N - 备注
        String(row[14] || '')   // Column O - 验证回复 / verifyReply
      ];

      // 追加工序（从 Failure_Database 关联）
      const process = processMap[String(row[1] || '').trim()] || '';
      formattedRow.push(process);

      if (!formattedRow[0]) {
        console.log('跳过无跟进ID的行 / Skip row without follow-up ID', row);
        continue;
      }

      followupData.push(formattedRow);
    }

    console.log('跟进记录获取成功，记录数:', followupData.length);

    return {
      success: true,
      headers: headers,
      data: followupData
    };

  } catch (error) {
    console.error('获取跟进记录失败:', error);
    return {
      success: false,
      message: '获取跟进记录失败 / Failed to get follow-up records: ' + error.toString()
    };
  }
}

/**
 * 更新跟进状态
 * 更新指定跟进记录的状态和验证结果
 * @param {string} followupId - 跟进ID
 * @param {string} status - 新状态
 * @param {string} remarks - 验证结果/备注
 */
function updateFollowupStatus(followupId, status, remarks) {
  try {
    console.log('更新跟进状态 / Updating follow-up status:', { followupId, status, remarks });

    const allowedStatus = ['进行中 / Ongoing', '已完成 / Completed'];
    if (!allowedStatus.includes(String(status || '').trim())) {
      throw new Error('状态值无效 / Invalid status value: ' + status);
    }

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    // 获取所有数据
    const data = wsFollow.getDataRange().getValues();
    let rowIndex = -1;

    // 查找对应的跟进记录（第1列是followupId）
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) {
        rowIndex = i + 1; // 转换为实际行号（从1开始）
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('未找到跟进ID / Follow-up ID not found: ' + followupId);
    }

    // 更新状态（第9列，索引为8）
    wsFollow.getRange(rowIndex, 9).setValue(status);

    // 更新备注（如果提供了备注，需要先确认是否有备注列）
    // 根据现有字段结构，我们可以在updated_date后面添加备注列，或者将备注添加到某个现有字段
    // 暂时将备注添加到updated_date字段（第11列，索引为10），格式为：日期 | 备注
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    
    let updatedValue = nowYmd;
    if (remarks && String(remarks).trim()) {
      updatedValue += ' | ' + String(remarks).trim();
    }
    
    wsFollow.getRange(rowIndex, 11).setValue(updatedValue);

    console.log('跟进状态更新成功');

    return {
      success: true,
      message: '跟进状态更新成功 / Follow-up status updated successfully',
      updatedDate: updatedValue
    };

  } catch (error) {
    console.error('更新跟进状态失败:', error);
    return {
      success: false,
      message: '更新跟进状态失败 / Failed to update follow-up status: ' + error.toString()
    };
  }
}

function updateFollowupFieldValue(followupId, fieldKey, value) {
  try {
    console.log('更新跟进字段 / Updating follow-up field:', { followupId, fieldKey, value });

    const fieldMap = {
      paPlan: 4,
      paWho: 5,
      paVerifier: 7,
      status: 9,
      followupContent: 14,
      verifyReply: 15
    };

    if (!fieldMap.hasOwnProperty(fieldKey)) {
      throw new Error('不支持的字段键 / Unsupported field key: ' + fieldKey);
    }

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    const data = wsFollow.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('未找到跟进ID / Follow-up ID not found: ' + followupId);
    }

    let normalizedValue = value;
    if (normalizedValue === null || typeof normalizedValue === 'undefined') {
      normalizedValue = '';
    }

    if (fieldKey === 'status') {
      const allowedStatus = ['进行中 / Ongoing', '已完成 / Completed', '未验证 / Not Verified', '未通过 / Not Passed', '已通过 / Passed'];
      normalizedValue = String(normalizedValue).trim();
      if (!allowedStatus.includes(normalizedValue)) {
        throw new Error('状态值无效 / Invalid status value: ' + normalizedValue);
      }
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

    wsFollow.getRange(rowIndex, fieldMap[fieldKey]).setValue(normalizedValue);

    // 备注保存后，自动将状态改为"未验证"
    if (fieldKey === 'followupContent' && normalizedValue) {
      wsFollow.getRange(rowIndex, 9).setValue('未验证 / Not Verified');
    }

    const rangeUpdatedDate = wsFollow.getRange(rowIndex, 11);
    const currentUpdatedValue = String(rangeUpdatedDate.getValue() || '').trim();
    let nextUpdatedValue = nowYmd;
    if (currentUpdatedValue && currentUpdatedValue.includes('|')) {
      const remarkPart = currentUpdatedValue.split('|')[1];
      if (remarkPart && remarkPart.trim()) {
        nextUpdatedValue += ' | ' + remarkPart.trim();
      }
    }
    rangeUpdatedDate.setValue(nextUpdatedValue);

    console.log('字段更新成功 / Field updated successfully');

    return {
      success: true,
      updatedDate: nextUpdatedValue
    };

  } catch (error) {
    console.error('更新跟进字段失败:', error);
    return {
      success: false,
      message: '更新跟进字段失败 / Failed to update follow-up field: ' + error.toString()
    };
  }
}

/**
 * 验证页面"保存"按钮入口：同步保存验证状态 + 验证回复，并触发邮件通知
 * Save verification status + reply in one call, then trigger notification email.
 * @param {string} followupId
 * @param {string} status
 * @param {string} verifyReply
 * @param {string} verifierName
 */
/**
 * 同步报告主表 O 列状态：遍历所有跟进，全部已通过/已取消→已完成，否则→审核通过
 */
function syncReportStatus_(ss, failureReportNo) {
  var ws = ss.getSheetByName('Failure_Database');
  var wsFollow = ss.getSheetByName('Failure_Report_followup');
  if (!ws || !wsFollow) return;
  var data = ws.getDataRange().getValues();
  var reportRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][6]).trim() === String(failureReportNo).trim()) {
      reportRow = i + 1;
      break;
    }
  }
  if (reportRow === -1) return;

  var followData = wsFollow.getDataRange().getValues();
  var hasActive = false, allDone = true;
  for (var j = 1; j < followData.length; j++) {
    if (String(followData[j][1]).trim() !== String(failureReportNo).trim()) continue;
    var st = String(followData[j][8] || '').trim();
    if (!st) continue;
    hasActive = true;
    if (st !== '已通过 / Passed' && st !== '已取消 / Cancelled') allDone = false;
  }
  var newStatus = !hasActive || allDone ? '已完成' : '审核通过';
  ws.getRange(reportRow, 15).setValue(newStatus);
}

function saveVerifyStatusAndReply(followupId, status, verifyReply, verifierName) {
  try {
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    if (!wsFollow) throw new Error('Failure_Report_followup sheet未找到');

    const data = wsFollow.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) throw new Error('未找到跟进ID: ' + followupId);

    const allowedStatus = ['进行中 / Ongoing', '已完成 / Completed', '未验证 / Not Verified', '未通过 / Not Passed', '已通过 / Passed'];
    const normalizedStatus = String(status || '').trim();
    if (!allowedStatus.includes(normalizedStatus)) {
      throw new Error('状态值无效: ' + normalizedStatus);
    }
    const normalizedReply = String(verifyReply == null ? '' : verifyReply);

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const nowYmd = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

    wsFollow.getRange(rowIndex, 9).setValue(normalizedStatus);   // I列 status
    wsFollow.getRange(rowIndex, 15).setValue(normalizedReply);   // O列 verify_reply
    wsFollow.getRange(rowIndex, 11).setValue(nowYmd);            // K列 updated_date

    // 同步主表 O 列：全部跟进通过→已完成
    var reportNo = String(data[rowIndex - 1][1] || '').trim();
    if (reportNo) syncReportStatus_(ss, reportNo);

    // 触发邮件通知
    try {
      sendVerifyReplyNotification(followupId, normalizedStatus, normalizedReply, verifierName || '');
    } catch (mailErr) {
      console.error('sendVerifyReplyNotification 发送失败:', mailErr);
    }

    return { success: true, updatedDate: nowYmd };
  } catch (error) {
    console.error('saveVerifyStatusAndReply 失败:', error);
    return { success: false, message: error.toString() };
  }
}

function returnFollowupRecord(followupId, reason, newDate, verifierName) {
  try {
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    if (!wsFollow) throw new Error('Failure_Report_followup sheet未找到');
    const data = wsFollow.getDataRange().getValues();
    let rowIndex = -1, rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) { rowIndex = i + 1; rowData = data[i]; break; }
    }
    if (rowIndex === -1) throw new Error('未找到跟进ID: ' + followupId);
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const nowYmd = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const nowStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
    const existingReply = String(rowData[14] || '');
    const newEntry = '[' + nowStr + ' ' + (verifierName || '') + ' 退回] ' + (reason || '');
    const updatedReply = existingReply ? existingReply + '\n' + newEntry : newEntry;
    wsFollow.getRange(rowIndex, 9).setValue('需补充 / Requires Supplement');
    wsFollow.getRange(rowIndex, 15).setValue(updatedReply);
    wsFollow.getRange(rowIndex, 6).setValue(newDate);
    wsFollow.getRange(rowIndex, 11).setValue(nowYmd);

    // 同步主表 O 列：跟进退回→审核通过
    var reportNo = String(rowData[1] || '').trim();
    if (reportNo) syncReportStatus_(ss, reportNo);

    try { sendReturnNotificationToResponsible(rowData, reason, newDate, verifierName, nowStr); } catch (e) { console.error('退回邮件发送失败:', e); }
    return { success: true, updatedDate: nowYmd, updatedReply: updatedReply };
  } catch (error) {
    console.error('returnFollowupRecord 失败:', error);
    return { success: false, message: error.toString() };
  }
}

function sendReturnNotificationToResponsible(rowData, reason, newDate, verifierName, nowStr) {
  const paWho = String(rowData[4] || '');
  const match = paWho.match(/【(.+)】/);
  const email = match ? match[1].trim() : '';
  if (!email) return;
  const name = paWho.replace(/【.+】/, '').trim();
  const followupId = String(rowData[0] || '');
  const failureReportNo = String(rowData[1] || '');
  const paType = String(rowData[2] || '');
  const paPlan = String(rowData[3] || '');
  const subject = '故障报告跟进退回通知 / Follow-up Returned - ' + followupId;
  let html = '<h2>故障报告跟进退回通知 / Failure Report Follow-up Returned</h2>';
  html += '<p>您好 ' + escapeHtml(name) + '，您的跟进记录未通过验证，需进行补充 / Hello ' + escapeHtml(name) + ', your follow-up was returned and requires further action.</p>';
  html += '<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;">';
  html += '<tr style="background:#E60012;color:white;"><th>字段/Field</th><th>内容/Content</th></tr>';
  html += '<tr><td>跟进ID / Follow-up ID</td><td>' + escapeHtml(followupId) + '</td></tr>';
  html += '<tr><td>故障报告编号 / Failure Report No.</td><td>' + escapeHtml(failureReportNo) + '</td></tr>';
  html += '<tr><td>措施类型 / Action Type</td><td>' + escapeHtml(paType) + '</td></tr>';
  html += '<tr><td>措施描述 / Action Desc</td><td>' + escapeHtml(paPlan).replace(/\n/g, '<br>') + '</td></tr>';
  html += '<tr style="background:#fff3cd;"><td><strong>退回原因 / Return Reason</strong></td><td>' + escapeHtml(reason || '-').replace(/\n/g, '<br>') + '</td></tr>';
  html += '<tr style="background:#cce5ff;"><td><strong>新完成日期 / New Completion Date</strong></td><td>' + escapeHtml(newDate || '-') + '</td></tr>';
  html += '<tr><td>退回人 / Returned By</td><td>' + escapeHtml(verifierName || '-') + '</td></tr>';
  html += '<tr><td>退回时间 / Return Time</td><td>' + escapeHtml(nowStr || '-') + '</td></tr>';
  html += '</table>';
  html += '<p style="margin-top:16px;">请尽快登录系统更新备注 / Please log in to update your remarks as soon as possible.</p>';
  html += '<p>此邮件由系统自动发送 / This email is sent automatically by the system.</p>';
  GmailApp.sendEmail(email, subject, '', { htmlBody: html });
}

function cancelFollowupRecord(followupId, reason, verifierName) {
  try {
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    if (!wsFollow) throw new Error('Failure_Report_followup sheet未找到');
    const data = wsFollow.getDataRange().getValues();
    let rowIndex = -1, rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) { rowIndex = i + 1; rowData = data[i]; break; }
    }
    if (rowIndex === -1) throw new Error('未找到跟进ID: ' + followupId);
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const nowYmd = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const nowStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
    const existingReply = String(rowData[14] || '');
    const newEntry = '[' + nowStr + ' ' + (verifierName || '') + ' 取消] ' + (reason || '');
    const updatedReply = existingReply ? existingReply + '\n' + newEntry : newEntry;
    wsFollow.getRange(rowIndex, 9).setValue('已取消 / Cancelled');
    wsFollow.getRange(rowIndex, 15).setValue(updatedReply);
    wsFollow.getRange(rowIndex, 11).setValue(nowYmd);

    // 同步主表 O 列：跟进取消→审核通过
    var reportNo = String(rowData[1] || '').trim();
    if (reportNo) syncReportStatus_(ss, reportNo);

    try { sendCancelNotificationToAll(rowData, reason, verifierName, nowStr); } catch (e) { console.error('取消邮件发送失败:', e); }
    return { success: true, updatedDate: nowYmd, updatedReply: updatedReply };
  } catch (error) {
    console.error('cancelFollowupRecord 失败:', error);
    return { success: false, message: error.toString() };
  }
}

function sendCancelNotificationToAll(rowData, reason, verifierName, nowStr) {
  const paWho = String(rowData[4] || '');
  const paVerifier = String(rowData[6] || '');
  const followupId = String(rowData[0] || '');
  const failureReportNo = String(rowData[1] || '');
  const paType = String(rowData[2] || '');
  const recipients = [];
  [paWho, paVerifier].forEach(function(p) { const m = p.match(/【(.+)】/); if (m) recipients.push(m[1].trim()); });
  if (recipients.length === 0) return;
  const unique = [...new Set(recipients)];
  const subject = '故障报告跟进取消通知 / Follow-up Cancelled - ' + followupId;
  let html = '<h2>故障报告跟进取消通知 / Failure Report Follow-up Cancelled</h2>';
  html += '<p>以下跟进条目已被取消 / The following follow-up entry has been cancelled:</p>';
  html += '<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;">';
  html += '<tr style="background:#E60012;color:white;"><th>字段/Field</th><th>内容/Content</th></tr>';
  html += '<tr><td>跟进ID / Follow-up ID</td><td>' + escapeHtml(followupId) + '</td></tr>';
  html += '<tr><td>故障报告编号 / Failure Report No.</td><td>' + escapeHtml(failureReportNo) + '</td></tr>';
  html += '<tr><td>措施类型 / Action Type</td><td>' + escapeHtml(paType) + '</td></tr>';
  html += '<tr style="background:#f8d7da;"><td><strong>取消原因 / Cancel Reason</strong></td><td>' + escapeHtml(reason || '-').replace(/\n/g, '<br>') + '</td></tr>';
  html += '<tr><td>操作人 / Cancelled By</td><td>' + escapeHtml(verifierName || '-') + '</td></tr>';
  html += '<tr><td>操作时间 / Time</td><td>' + escapeHtml(nowStr || '-') + '</td></tr>';
  html += '</table>';
  html += '<p>此邮件由系统自动发送 / This email is sent automatically by the system.</p>';
  GmailApp.sendEmail(unique.join(','), subject, '', { htmlBody: html });
}

/**
 * 验证操作邮件通知
 * 状态 = 已通过 / 未通过 / 未验证 三态均发送
 * 收件人：paWho（责任人），抄送：paVerifier（验证人自己）
 */
function sendVerifyReplyNotification(followupId, newStatus, verifyReply, verifierName) {
  try {
    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');
    if (!wsFollow) return;
    const data = wsFollow.getDataRange().getValues();
    let target = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(followupId).trim()) {
        target = data[i];
        break;
      }
    }
    if (!target) return;

    const failureReportNo = String(target[1] || '');
    const paType         = String(target[2] || '');
    const paPlan         = String(target[3] || '');
    const paWho          = String(target[4] || '');
    const paVerifier     = String(target[6] || '');

    const extractEmail = function(s) {
      const m = String(s || '').match(/【([^】]+)】/);
      return m ? m[1].trim() : '';
    };
    const extractName = function(s) {
      return String(s || '').replace(/\s*【[^】]*】\s*$/, '').trim();
    };

    const toEmail = extractEmail(paWho);
    const ccEmail = extractEmail(paVerifier);
    if (!toEmail) {
      console.log('paWho 无邮箱，跳过通知 / paWho missing email, skip notification');
      return;
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

    let statusColor = '#6c757d';
    if (newStatus === '已通过 / Passed') statusColor = '#28a745';
    else if (newStatus === '未通过 / Not Passed') statusColor = '#dc3545';

    const subject = '【故障报告验证】' + failureReportNo + ' - ' + newStatus;
    const webPage = getReleaseWebPage();
    const replyText = (verifyReply && String(verifyReply).trim()) ? String(verifyReply) : '（无 / None）';

    const htmlBody = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:#fff0f0;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;border-left:5px solid #E60012;">'
      + '<h2 style="color:#E60012;text-align:center;margin-bottom:20px;border-bottom:3px solid #E60012;padding-bottom:10px;">'
      + '【故障报告验证通知】<br><span style="font-size:0.8em;">Failure Report Verification Notification</span></h2>'
      + '<p style="font-size:15px;line-height:1.6;color:#c0392b;">（' + today + '）您的故障报告跟进项已被验证：<br>'
      + '<span style="font-size:0.9em;opacity:0.85;">Your failure report follow-up has been verified:</span></p>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;">'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">'
      + '<tr><td style="padding:8px 12px;width:160px;font-weight:600;color:#555;">故障报告编号 / Report No.</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(failureReportNo) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">跟进ID / Follow-up ID</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(followupId) + '</td></tr>'
      + '<tr><td style="padding:8px 12px;font-weight:600;color:#555;">措施类型 / Action Type</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(paType) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;vertical-align:top;">措施描述 / Action Desc</td><td style="padding:8px 12px;color:#2c3e50;white-space:pre-wrap;">' + escapeHtml(paPlan) + '</td></tr>'
      + '<tr><td style="padding:8px 12px;font-weight:600;color:#555;">验证状态 / Status</td><td style="padding:8px 12px;"><span style="display:inline-block;padding:4px 12px;border-radius:14px;color:#fff;font-weight:600;background:' + statusColor + ';">' + escapeHtml(newStatus) + '</span></td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;vertical-align:top;">验证回复 / Verification Reply</td><td style="padding:8px 12px;color:#2c3e50;white-space:pre-wrap;">' + escapeHtml(replyText) + '</td></tr>'
      + '<tr><td style="padding:8px 12px;font-weight:600;color:#555;">验证人 / Verifier</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(verifierName || extractName(paVerifier)) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">更新日期 / Updated</td><td style="padding:8px 12px;color:#2c3e50;font-family:monospace;">' + escapeHtml(today) + '</td></tr>'
      + '</table>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:20px;text-align:center;">'
      + '<p style="margin-bottom:12px;"><a href="' + webPage + '?v=FailureReport_Followup_Manage" style="background:#E60012;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">点击查看跟进 / View Follow-up</a></p>'
      + '<p style="margin:0;font-size:12px;color:#999;font-style:italic;">此邮件由系统自动发送，请勿回复。<br><span style="font-size:0.9em;">Auto-sent by system, please do not reply.</span></p>'
      + '</div></div>';

    const options = { htmlBody: htmlBody };
    if (ccEmail && ccEmail.toLowerCase() !== toEmail.toLowerCase()) options.cc = ccEmail;
    GmailApp.sendEmail(toEmail, subject, '', options);
    console.log('验证通知已发送 / Verify reply notification sent to:', toEmail, 'cc:', ccEmail);
  } catch (e) {
    console.error('sendVerifyReplyNotification error:', e);
  }
}

/**
 * 发送跟进邮件提醒
 * 根据类型发送邮件给责任人或验证人
 * @param {string} type - 提醒类型：'responsible' 或 'verifier'
 */
function sendFollowupEmailReminder(type) {
  try {
    console.log('发送跟进邮件提醒 / Sending follow-up email reminder:', type);

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    const data = wsFollow.getDataRange().getValues();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';

    // 收集收件人邮箱
    const recipients = new Set();
    const details = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // 跳过无跟进ID的行

      const status = String(row[8] || '').trim();
      // 只提醒状态为"进行中"的记录
      if (status !== '进行中 / Ongoing') continue;

      const failureReportNo = String(row[1] || '');
      const paType = String(row[2] || '');
      const paPlan = String(row[3] || '');
      const paWho = String(row[4] || '');
      const paWhen = String(row[5] || '');
      const paVerifier = String(row[6] || '');

      let targetEmail = '';
      let targetName = '';

      if (type === 'responsible' && paWho) {
        // 从paWho中提取名字和邮箱
        const match = paWho.match(/【(.+)】/);
        if (match) {
          targetEmail = match[1].trim();
          targetName = paWho.replace(/【.+】/, '').trim();
        }
      } else if (type === 'verifier' && paVerifier) {
        // 从paVerifier中提取名字和邮箱
        const match = paVerifier.match(/【(.+)】/);
        if (match) {
          targetEmail = match[1].trim();
          targetName = paVerifier.replace(/【.+】/, '').trim();
        }
      }

      if (targetEmail) {
        recipients.add(targetEmail);
        details.push({
          failureReportNo: failureReportNo,
          paType: paType,
          paPlan: paPlan,
          paWhen: paWhen,
          targetName: targetName
        });
      }
    }

    if (recipients.size === 0) {
      return {
        success: true,
        message: '没有需要提醒的' + (type === 'responsible' ? '责任人' : '验证人') + ' / No ' + (type === 'responsible' ? 'responsible persons' : 'verifiers') + ' to remind'
      };
    }

    // 构建邮件内容
    const now = new Date();
    const nowStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm');

    const typeText = type === 'responsible' ? '责任人 / Responsible Person' : '验证人 / Verifier';
    const subject = '故障报告跟进提醒 / Failure Report Follow-up Reminder - ' + nowStr;

    let htmlBody = '<h2>故障报告跟进提醒 / Failure Report Follow-up Reminder</h2>';
    htmlBody += '<p>您好 / Hello,</p>';
    htmlBody += '<p>您有进行中的故障报告跟进任务需要处理 / You have ongoing failure report follow-up tasks to handle:</p>';
    htmlBody += '<table border="1" cellpadding="5" style="border-collapse: collapse;">';
    htmlBody += '<tr style="background-color: #E60012; color: white;">';
    htmlBody += '<th>故障报告编号<br>Failure Report No.</th>';
    htmlBody += '<th>措施类型<br>Action Type</th>';
    htmlBody += '<th>措施描述<br>Action Desc</th>';
    htmlBody += '<th>计划日期<br>Plan Date</th>';
    htmlBody += '</tr>';

    details.forEach(function(item) {
      htmlBody += '<tr>';
      htmlBody += '<td>' + escapeHtml(item.failureReportNo) + '</td>';
      htmlBody += '<td>' + escapeHtml(item.paType) + '</td>';
      htmlBody += '<td>' + escapeHtml(item.paPlan).replace(/\n/g, '<br>') + '</td>';
      htmlBody += '<td>' + escapeHtml(item.paWhen) + '</td>';
      htmlBody += '</tr>';
    });

    htmlBody += '</table>';
    htmlBody += '<p style="margin-top: 20px;">请尽快登录系统处理 / Please log in to the system to handle these tasks as soon as possible.</p>';
    htmlBody += '<p>此邮件由系统自动发送 / This email is sent automatically by the system.</p>';

    const recipientList = Array.from(recipients);
    console.log('收件人列表 / Recipients:', recipientList);

    // 发送邮件
    let sentCount = 0;
    recipientList.forEach(function(email) {
      try {
        GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
        sentCount++;
        console.log('邮件已发送到 / Email sent to:', email);
      } catch (e) {
        console.error('发送邮件失败 / Failed to send email to ' + email + ':', e);
      }
    });

    return {
      success: true,
      message: '已成功发送 ' + sentCount + ' 封邮件 / Successfully sent ' + sentCount + ' emails',
      recipientCount: recipientList.length,
      sentCount: sentCount
    };

  } catch (error) {
    console.error('发送跟进邮件提醒失败:', error);
    return {
      success: false,
      message: '发送邮件提醒失败 / Failed to send email reminder: ' + error.toString()
    };
  }
}

/**
 * 发送验证提醒邮件给验证人
 * 针对状态为"已完成"的记录，提醒验证人进行验证
 * @param {Array} records - 要发送邮件的记录数组
 */
function sendVerificationReminderToVerifiers(records) {
  try {
    console.log('发送验证提醒邮件 / Sending verification reminder emails, records count:', records.length);

    if (!records || records.length === 0) {
      return {
        success: true,
        message: '没有需要发送的记录 / No records to send',
        sentCount: 0
      };
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm');

    // 按验证人分组记录
    const verifierGroups = {};

    records.forEach(function(record) {
      const paVerifier = String(record.paVerifier || '');
      // 从"名字【邮箱】"格式中提取邮箱
      const match = paVerifier.match(/【(.+)】/);
      const email = match ? match[1].trim() : '';
      const name = paVerifier.replace(/【.+】/, '').trim();

      if (!email) {
        console.log('跳过无邮箱的验证人 / Skip verifier without email:', paVerifier);
        return;
      }

      if (!verifierGroups[email]) {
        verifierGroups[email] = {
          name: name,
          email: email,
          records: []
        };
      }
      verifierGroups[email].records.push(record);
    });

    const verifierList = Object.values(verifierGroups);
    if (verifierList.length === 0) {
      return {
        success: true,
        message: '没有有效的验证人邮箱 / No valid verifier emails found',
        sentCount: 0
      };
    }

    console.log('需要发送的验证人数 / Verifiers to notify:', verifierList.length);

    const subject = '故障报告验证提醒 / Failure Report Verification Reminder - ' + nowStr;

    let sentCount = 0;

    verifierList.forEach(function(verifier) {
      try {
        // 构建邮件内容
        let htmlBody = '<h2>故障报告验证提醒 / Failure Report Verification Reminder</h2>';
        htmlBody += '<p>您好 ' + escapeHtml(verifier.name) + ' / Hello ' + escapeHtml(verifier.name) + ',</p>';
        htmlBody += '<p>您有故障报告跟进任务需要验证 / You have failure report follow-up tasks that require verification:</p>';
        htmlBody += '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
        htmlBody += '<tr style="background-color: #E60012; color: white;">';
        htmlBody += '<th>跟进ID<br>Follow-up ID</th>';
        htmlBody += '<th>故障报告编号<br>Failure Report No.</th>';
        htmlBody += '<th>措施类型<br>Action Type</th>';
        htmlBody += '<th>措施描述<br>Action Desc</th>';
        htmlBody += '<th>备注<br>Remarks</th>';
        htmlBody += '<th>跟进人<br>Updated By</th>';
        htmlBody += '<th>计划完成日期<br>Planned Completion Date</th>';
        htmlBody += '<th>状态<br>Status</th>';
        htmlBody += '</tr>';

        verifier.records.forEach(function(record) {
          htmlBody += '<tr>';
          htmlBody += '<td>' + escapeHtml(record.followupId) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.failureReportNo) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paType) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paPlan).replace(/\n/g, '<br>') + '</td>';
          htmlBody += '<td style="background:#fffbe6;">' + escapeHtml(record.followupContent || '-').replace(/\n/g, '<br>') + '</td>';
          htmlBody += '<td>' + escapeHtml(record.updatedBy || '-') + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paWhen) + '</td>';
          htmlBody += '<td style="color: #28a745; font-weight: bold;">' + escapeHtml(record.status) + '</td>';
          htmlBody += '</tr>';
        });

        htmlBody += '</table>';
        htmlBody += '<p style="margin-top: 20px;">请尽快登录系统验证这些任务 / Please log in to the system to verify these tasks as soon as possible.</p>';
        htmlBody += '<p>此邮件由系统自动发送 / This email is sent automatically by the system.</p>';

        // 发送邮件
        GmailApp.sendEmail(verifier.email, subject, '', { htmlBody: htmlBody });
        sentCount++;
        console.log('验证提醒邮件已发送到 / Verification reminder email sent to:', verifier.email);

      } catch (e) {
        console.error('发送邮件失败 / Failed to send email to ' + verifier.email + ':', e);
      }
    });

    return {
      success: true,
      message: '已成功发送 ' + sentCount + ' 封邮件 / Successfully sent ' + sentCount + ' emails',
      sentCount: sentCount,
      verifierCount: verifierList.length
    };

  } catch (error) {
    console.error('发送验证提醒邮件失败:', error);
    return {
      success: false,
      message: '发送邮件失败 / Failed to send emails: ' + error.toString()
    };
  }
}

/**
 * 发送提醒邮件给责任人
 * 针对验证状态不等于"已验证"的记录，提醒责任人跟进
 * @param {Array} records - 要发送邮件的记录数组
 */
function sendReminderToResponsiblePersons(records) {
  try {
    console.log('发送责任人提醒邮件 / Sending reminder emails to responsible persons, records count:', records.length);

    if (!records || records.length === 0) {
      return {
        success: true,
        message: '没有需要发送的记录 / No records to send',
        sentCount: 0
      };
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm');

    // 按责任人分组记录
    const responsibleGroups = {};

    records.forEach(function(record) {
      const paWho = String(record.paWho || '');
      // 从"名字【邮箱】"格式中提取邮箱
      const match = paWho.match(/【(.+)】/);
      const email = match ? match[1].trim() : '';
      const name = paWho.replace(/【.+】/, '').trim();

      if (!email) {
        console.log('跳过无邮箱的责任人 / Skip responsible person without email:', paWho);
        return;
      }

      if (!responsibleGroups[email]) {
        responsibleGroups[email] = {
          name: name,
          email: email,
          records: []
        };
      }
      responsibleGroups[email].records.push(record);
    });

    const responsibleList = Object.values(responsibleGroups);
    if (responsibleList.length === 0) {
      return {
        success: true,
        message: '没有有效的责任人邮箱 / No valid responsible person emails found',
        sentCount: 0
      };
    }

    console.log('需要发送的责任人数 / Responsible persons to notify:', responsibleList.length);

    const subject = '故障报告跟进提醒 / Failure Report Follow-up Reminder - ' + nowStr;

    let sentCount = 0;

    responsibleList.forEach(function(person) {
      try {
        // 构建邮件内容
        let htmlBody = '<h2>故障报告跟进提醒 / Failure Report Follow-up Reminder</h2>';
        htmlBody += '<p>您好 ' + escapeHtml(person.name) + ' / Hello ' + escapeHtml(person.name) + ',</p>';
        htmlBody += '<p>您有以下故障报告跟进任务尚未被验证，请尽快完成 / You have the following failure report follow-up tasks that have not been verified yet, please complete them as soon as possible:</p>';
        htmlBody += '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">';
        htmlBody += '<tr style="background-color: #E60012; color: white;">';
        htmlBody += '<th>跟进ID<br>Follow-up ID</th>';
        htmlBody += '<th>故障报告编号<br>Failure Report No.</th>';
        htmlBody += '<th>措施类型<br>Action Type</th>';
        htmlBody += '<th>措施描述<br>Action Desc</th>';
        htmlBody += '<th>计划完成日期<br>Planned Completion Date</th>';
        htmlBody += '<th>状态<br>Status</th>';
        htmlBody += '<th>验证状态<br>Verification Status</th>';
        htmlBody += '</tr>';

        person.records.forEach(function(record) {
          const verificationColor = record.verification === '未验证 / Not Verified' ? '#dc3545' : '#6c757d';
          htmlBody += '<tr>';
          htmlBody += '<td>' + escapeHtml(record.followupId) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.failureReportNo) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paType) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paPlan).replace(/\n/g, '<br>') + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paWhen) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.status) + '</td>';
          htmlBody += '<td style="color: ' + verificationColor + '; font-weight: bold;">' + escapeHtml(record.verification || '未验证 / Not Verified') + '</td>';
          htmlBody += '</tr>';
        });

        htmlBody += '</table>';
        htmlBody += '<p style="margin-top: 20px;">请登录系统查看详情并尽快完成验证 / Please log in to the system to view details and complete verification as soon as possible.</p>';
        htmlBody += '<p>此邮件由系统自动发送 / This email is sent automatically by the system.</p>';

        // 发送邮件
        GmailApp.sendEmail(person.email, subject, '', { htmlBody: htmlBody });
        sentCount++;
        console.log('跟进提醒邮件已发送到 / Follow-up reminder email sent to:', person.email);

      } catch (e) {
        console.error('发送邮件失败 / Failed to send email to ' + person.email + ':', e);
      }
    });

    return {
      success: true,
      message: '已成功发送 ' + sentCount + ' 封邮件 / Successfully sent ' + sentCount + ' emails',
      sentCount: sentCount,
      responsibleCount: responsibleList.length
    };

  } catch (error) {
    console.error('发送责任人提醒邮件失败:', error);
    return {
      success: false,
      message: '发送邮件失败 / Failed to send emails: ' + error.toString()
    };
  }
}

/**
 * 故障报告提交后发送跟进创建提醒邮件
 * 按责任人分组发送，验证人作为抄送
 * @param {{failureReportNo: string, machineNo: string}} reportInfo
 * @param {Array} followupRows - 新写入的跟进行（与 Failure_Report_followup 列顺序一致）
 */
function sendFollowupCreationReminderEmails(reportInfo, followupRows) {
  if (!reportInfo || !followupRows || followupRows.length === 0) return;

  const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';

  const parseDisplay = function(display) {
    const text = String(display || '').trim();
    if (!text) return { name: '', email: '' };
    const m = text.match(/【(.+)】/);
    return { name: text.replace(/【.+】/, '').trim(), email: m ? m[1].trim() : '' };
  };

  const formatDateYmd = function(val) {
    if (!val) return '';
    if (val instanceof Date) return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
    const s = String(val).trim();
    if (!s) return '';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  };

  const calcDays = function(dueDate) {
    try {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) return 999;
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.round((due - today) / (1000 * 3600 * 24));
    } catch(e) { return 999; }
  };

  // 按责任人邮箱分组
  const ownerMap = {};
  const ownerCcMap = {};

  followupRows.forEach(function(row) {
    const paWho = parseDisplay(row[4]);
    if (!paWho.email) {
      console.log('跳过无邮箱责任人 / Skip responsible without email:', row[4]);
      return;
    }
    if (!ownerMap[paWho.email]) {
      ownerMap[paWho.email] = [];
      ownerCcMap[paWho.email] = new Set();
    }
    const paVerifier = parseDisplay(row[6]);
    if (paVerifier.email && paVerifier.email !== paWho.email) {
      ownerCcMap[paWho.email].add(paVerifier.email);
    }
    ownerMap[paWho.email].push({
      reportNo: String(row[1] || ''),
      paPlan:   String(row[3] || ''),
      owner:    String(row[4] || ''),
      dueDate:  formatDateYmd(row[5]),
      status:   String(row[8] || '待验证'),
      days:     calcDays(row[5])
    });
  });

  if (Object.keys(ownerMap).length === 0) return;

  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const reportNo = String(reportInfo.failureReportNo || '').trim();

  for (const email in ownerMap) {
    const items = ownerMap[email];
    const ownerName = parseDisplay(items[0].owner).name;
    const accentColor = '#f39c12';
    const darkColor   = '#e65100';
    const bgColor     = '#fff8e1';
    const headerGrad  = 'linear-gradient(135deg,#f39c12,#e67e22)';

    let rows = '';
    items.forEach(function(item, i) {
      const days = item.days;
      let badge;
      if (days < 0) {
        badge = '<div style="background:linear-gradient(135deg,#f44336,#d32f2f);color:white;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;display:inline-block;min-width:80px;text-align:center;"><span style="display:block;">[逾期] ' + Math.abs(days) + '天</span><span style="display:block;font-size:10px;opacity:0.9;">Days Overdue</span></div>';
      } else if (days === 999) {
        badge = '<div style="background:linear-gradient(135deg,#f39c12,#e67e22);color:white;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;display:inline-block;min-width:80px;text-align:center;"><span style="display:block;">新建</span><span style="display:block;font-size:10px;opacity:0.9;">New</span></div>';
      } else {
        badge = '<div style="background:linear-gradient(135deg,#f39c12,#e67e22);color:white;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;display:inline-block;min-width:80px;text-align:center;"><span style="display:block;">还剩 ' + days + '天</span><span style="display:block;font-size:10px;opacity:0.9;">Days Left</span></div>';
      }
      rows += '<tr style="background-color:' + (i % 2 === 0 ? '#fffbf0' : '#ffffff') + ';">'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;font-weight:500;color:#2c3e50;">' + escapeHtml(item.reportNo) + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;color:#34495e;max-width:220px;word-wrap:break-word;">' + escapeHtml(item.paPlan) + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;color:#34495e;">' + escapeHtml(parseDisplay(item.owner).name) + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;color:#34495e;font-family:monospace;">' + escapeHtml(item.dueDate || '-') + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;color:#34495e;">' + escapeHtml(item.status) + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e9ecef;text-align:center;">' + badge + '</td>'
        + '</tr>';
    });

    const html = '<div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:' + bgColor + ';border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;border-left:5px solid ' + accentColor + ';">'
      + '<h2 style="color:' + darkColor + ';text-align:center;margin-bottom:20px;border-bottom:3px solid ' + accentColor + ';padding-bottom:10px;">'
      + '[新建通知] 故障报告跟进项目已创建<br><span style="font-size:0.8em;">New Follow-up Items Created</span></h2>'
      + '<p style="font-size:16px;line-height:1.6;color:' + darkColor + ';">'
      + '您好' + (ownerName ? ' ' + ownerName : '') + '！（' + today + '）以下故障报告跟进项目已为您创建，请及时跟进：<br>'
      + '<span style="font-size:0.9em;opacity:0.85;">Hello' + (ownerName ? ' ' + ownerName : '') + '! The following follow-up items have been created for you (' + today + '):</span>'
      + '</p></div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;">'
      + '<h3 style="color:' + darkColor + ';border-bottom:2px solid ' + accentColor + ';padding-bottom:10px;margin-bottom:20px;">'
      + '[新建] 跟进项目 Follow-up Items (' + items.length + '条)</h3>'
      + '<div style="overflow-x:auto;">'
      + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
      + '<thead><tr style="background:' + headerGrad + ';color:white;">'
      + '<th style="padding:12px;text-align:left;font-weight:600;">故障报告编号<br><span style="font-size:0.8em;opacity:0.9;">Report No.</span></th>'
      + '<th style="padding:12px;text-align:left;font-weight:600;">行动描述<br><span style="font-size:0.8em;opacity:0.9;">Action Description</span></th>'
      + '<th style="padding:12px;text-align:left;font-weight:600;">责任人<br><span style="font-size:0.8em;opacity:0.9;">Owner</span></th>'
      + '<th style="padding:12px;text-align:left;font-weight:600;">期限<br><span style="font-size:0.8em;opacity:0.9;">Due Date</span></th>'
      + '<th style="padding:12px;text-align:left;font-weight:600;">状态<br><span style="font-size:0.8em;opacity:0.9;">Status</span></th>'
      + '<th style="padding:12px;text-align:center;font-weight:600;">剩余天数<br><span style="font-size:0.8em;opacity:0.9;">Days Left</span></th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div></div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;">'
      + '<div style="text-align:center;color:' + darkColor + ';font-size:14px;line-height:1.6;">'
      + '<p style="margin-bottom:10px;font-weight:600;">请及时跟进以上项目！<br><span style="font-size:0.9em;opacity:0.85;">Please follow up on the above items promptly!</span></p>'
      + '<p style="margin:0;font-style:italic;">此邮件由系统自动发送，请勿回复。<br><span style="font-size:0.8em;opacity:0.7;">This email is automatically sent by the system, please do not reply.</span></p>'
      + '</div></div></div>';

    const subject = '【新建通知】故障报告跟进项目已创建 / New Follow-up Items Created - ' + reportNo;
    const ccList = Array.from(ownerCcMap[email]);
    try {
      const options = { htmlBody: html, name: '故障报告提醒系统' };
      if (ccList.length > 0) options.cc = ccList.join(',');
      GmailApp.sendEmail(email, subject, '请使用支持HTML的邮件客户端查看此邮件。', options);
      console.log('跟进创建提醒已发送 / Follow-up creation reminder sent to:', email, 'cc:', ccList);
    } catch (err) {
      console.error('发送跟进创建提醒失败 / Failed to send creation reminder:', err);
    }
  }
}

/**
 * HTML转义辅助函数
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 获取责任人的跟进记录
 * 只返回指定责任人负责的跟进记录
 * @param {string} userName - 责任人姓名（URL参数中的Name）
 */
function getFollowupRecordsForResponsiblePerson(userName) {
  try {
    console.log('获取责任人跟进记录 / Getting responsible person follow-up records:', userName);

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    // 构建 Failure_Database failureReportNo -> process 映射
    const wsDB = ss.getSheetByName('Failure_Database');
    const processMap = {};
    if (wsDB) {
      const dbData = wsDB.getDataRange().getValues();
      for (let d = 1; d < dbData.length; d++) {
        const frNo = String(dbData[d][6] || '').trim();
        if (frNo) processMap[frNo] = String(dbData[d][5] || '').trim();
      }
    }

    const dataRange = wsFollow.getDataRange();
    const values = dataRange.getValues();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';

    const followupData = [];

    const formatDate = (cell) => {
      if (!cell) return '';
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
      }
      return String(cell);
    };

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      const isRowEmpty = row.every(cell => cell === '' || cell === null || typeof cell === 'undefined');
      if (isRowEmpty) continue;

      // 检查责任人是否匹配（第5列，索引4）
      const paWho = String(row[4] || '');
      // 从"名字【邮箱】"格式中提取名字
      const paWhoName = paWho.replace(/【.+】/, '').trim();

      // 如果不匹配当前用户，跳过
      if (paWhoName !== userName) continue;

      const formattedRow = [
        String(row[0] || ''),
        String(row[1] || ''),
        String(row[2] || ''),
        String(row[3] || ''),
        String(row[4] || ''),
        formatDate(row[5]),
        String(row[6] || ''),
        formatDate(row[7]),
        String(row[8] || ''),
        formatDate(row[9]),
        formatDate(row[10]),
        String(row[11] || ''),
        String(row[13] || ''),  // Column N - 备注
        String(row[14] || '')   // Column O - 验证回复 / verifyReply
      ];

      // 追加工序（从 Failure_Database 关联）
      const process = processMap[String(row[1] || '').trim()] || '';
      formattedRow.push(process);

      if (!formattedRow[0]) {
        console.log('跳过无跟进ID的行 / Skip row without follow-up ID', row);
        continue;
      }

      followupData.push(formattedRow);
    }

    console.log('责任人跟进记录获取成功，记录数:', followupData.length);

    return {
      success: true,
      data: followupData
    };

  } catch (error) {
    console.error('获取责任人跟进记录失败:', error);
    return {
      success: false,
      message: '获取跟进记录失败 / Failed to get follow-up records: ' + error.toString()
    };
  }
}

/**
 * 获取验证人的跟进记录
 * 只返回指定验证人负责的跟进记录
 * @param {string} userName - 验证人姓名（URL参数中的Name）
 */
function getFollowupRecordsForVerifier(userName) {
  try {
    console.log('获取验证人跟进记录 / Getting verifier follow-up records:', userName);

    const ss = SpreadsheetApp.openById('1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU');
    const wsFollow = ss.getSheetByName('Failure_Report_followup');

    if (!wsFollow) {
      throw new Error('Failure_Report_followup sheet未找到 / Failure_Report_followup sheet not found');
    }

    // 构建 Failure_Database failureReportNo -> process 映射
    const wsDB = ss.getSheetByName('Failure_Database');
    const processMap = {};
    if (wsDB) {
      const dbData = wsDB.getDataRange().getValues();
      for (let d = 1; d < dbData.length; d++) {
        const frNo = String(dbData[d][6] || '').trim();
        if (frNo) processMap[frNo] = String(dbData[d][5] || '').trim();
      }
    }

    const dataRange = wsFollow.getDataRange();
    const values = dataRange.getValues();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';

    const followupData = [];

    const formatDate = (cell) => {
      if (!cell) return '';
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
      }
      return String(cell);
    };

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      const isRowEmpty = row.every(cell => cell === '' || cell === null || typeof cell === 'undefined');
      if (isRowEmpty) continue;

      // 检查验证人是否匹配（第7列，索引6）
      const paVerifier = String(row[6] || '');
      // 从"名字【邮箱】"格式中提取名字
      const paVerifierName = paVerifier.replace(/【.+】/, '').trim();

      // 如果不匹配当前用户，跳过
      if (paVerifierName !== userName) continue;

      const formattedRow = [
        String(row[0] || ''),
        String(row[1] || ''),
        String(row[2] || ''),
        String(row[3] || ''),
        String(row[4] || ''),
        formatDate(row[5]),
        String(row[6] || ''),
        formatDate(row[7]),
        String(row[8] || ''),
        formatDate(row[9]),
        formatDate(row[10]),
        String(row[11] || ''),
        String(row[13] || ''),  // Column N - 备注
        String(row[14] || '')   // Column O - 验证回复 / verifyReply
      ];

      // 追加工序（从 Failure_Database 关联）
      const process = processMap[String(row[1] || '').trim()] || '';
      formattedRow.push(process);

      if (!formattedRow[0]) {
        console.log('跳过无跟进ID的行 / Skip row without follow-up ID', row);
        continue;
      }

      followupData.push(formattedRow);
    }

    console.log('验证人跟进记录获取成功，记录数:', followupData.length);

    return {
      success: true,
      data: followupData
    };

  } catch (error) {
    console.error('获取验证人跟进记录失败:', error);
    return {
      success: false,
      message: '获取跟进记录失败 / Failed to get follow-up records: ' + error.toString()
    };
  }
}


/**
 * 加载故障报告跟进页面（责任人使用）
 */
function loadFailureReport_Followup_Manage(webPage, id, name, type) {
  let pageUrl = webPage || getReleaseWebPage();
  let userName = name || '';
  return render("FailureReport_Followup_Manage", { 
    webPage: pageUrl,
    userName: userName 
  })
    .setTitle("故障报告跟进 | Failure Report Follow-up")
    .setFaviconUrl(webIconUrl);
}

/**
 * 加载故障报告验证页面（验证人使用）
 */
function loadFailureReport_Followup_Verify(webPage, id, name, type) {
  let pageUrl = webPage || getReleaseWebPage();
  let userName = name || '';
  return render("FailureReport_Followup_Verify", { 
    webPage: pageUrl,
    userName: userName 
  })
    .setTitle("故障报告验证 | Failure Report Verification")
    .setFaviconUrl(webIconUrl);
}

function PdMData_submit_Database_PdM_Data_visualization(PdM_Data_Written_In) {
  try {
    let url = "1ft6cYnIsBt1FjYx7vXp_4tH7963VFm6Z4qETMFhL6zY";

    let ss = SpreadsheetApp.openById(url);

    let ws = ss.getSheetByName("Master_Data");

    // 获取表头
    let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];

    // 字段映射关系：表头字段名 -> 数据对象字段名
    let fieldMapping = {
      Workshop: "Workshop",
      Machine_Type: "Machine_Type",
      Workcenter: "Workcenter",
      Unit: "Unit",
      Component: "Component",
      Logic: "Logic",
      TagName: "TagName",
      "LL Limited": "LL_Limited", // 表头有空格，数据字段是下划线
      "HH Limited": "HH_Limited", // 表头有空格，数据字段是下划线
      Record: "Record",
      "Record Time": "Record_Time", // 表头有空格，数据字段是下划线
      Equipment: "Equipment",
      Process: "Process", // 新增：工序字段
      Month: "Month",     // 新增：月份字段
      Week: "Week",       // 新增：周数字段
      Notification: "Notification", // 通知字段
      Alarm_information: "Alarm_information", // 报警信息字段
      "Notification No.": null, // 手动输入字段，写入空值
      "Work Order": null, // 手动输入字段，写入空值
      "Tracking Result": null // 手动输入字段，写入空值
    };

    // 遍历 PdM_Data_Written_In 数组中的每个对象
    for (let i = 0; i < PdM_Data_Written_In.length; i++) {
      let newRow = [];
      let dataRow = PdM_Data_Written_In[i];

      // 根据表头顺序构建行数据
      for (let j = 0; j < head.length; j++) {
        let colName = head[j];
        let dataFieldName = fieldMapping[colName];

        if (dataFieldName === null) {
          // 手动输入字段，写入空值
          newRow.push("");
        } else if (dataFieldName && dataRow.hasOwnProperty(dataFieldName)) {
          // 如果字段存在，使用字段值
          newRow.push(dataRow[dataFieldName] || "");
        } else {
          // 如果字段不存在，尝试直接使用表头名称
          newRow.push(dataRow[colName] || "");
        }
      }

      // 追加新行
      ws.appendRow(newRow);
    }

    return {
      success: true,
      message: "PdM数据写入成功 / PdM data written successfully",
      count: PdM_Data_Written_In.length,
    };
  } catch (error) {
    console.error("PdM数据写入失败 / Failed to write PdM data:", error);
    return {
      success: false,
      message:
        "PdM数据写入失败 / Failed to write PdM data: " + error.toString(),
    };
  }
}

function get_Equipment_No_in_EAM() {
  try {
    let url = "12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM";

    let ss = SpreadsheetApp.openById(url);

    let ws = ss.getSheetByName("Workcenter");

    // 获取数据范围：从第2行开始（第1行是表头），到最后一行的所有列
    let lastRow = ws.getLastRow();
    if (lastRow < 2) {
      // 如果没有数据行，返回空数组
      return [];
    }

    // 获取所有数据（从第2行开始）
    let data = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();

    // 构建结果数组
    let result = [];
    data.forEach(function (row) {
      let workcenter = row[0] || ""; // A列：Workcenter
      let equipment = row[5] || ""; // J列：设备编号

      // 只有当两个值都不为空时才添加到结果中
      if (workcenter && equipment) {
        result.push({
          Workcenter: workcenter,
          Equipment: equipment,
        });
      }
    });

    console.log(JSON.stringify(result));
    return JSON.stringify(result);
  } catch (error) {
    console.error("获取设备编号失败 / Failed to get equipment number:", error);
    return {
      success: false,
      message:
        "获取设备编号失败 / Failed to get equipment number: " +
        error.toString(),
    };
  }
}

function get_PM_Workorder() {
  try {
    let ID = "1YzMGIQ2RcBlGIadWh5yfxlCmOpCuOBHpgKfEVz8_W98";
    let sheetName = "Database";

    let ss = SpreadsheetApp.openById(ID);
    let ws = ss.getSheetByName(sheetName);

    if (!ws) {
      console.error("Sheet 'Database' not found");
      return JSON.stringify({
        success: false,
        message: "未找到 'Database' 工作表 / 'Database' sheet not found.",
      });
    }

    // 获取表头（第1行）
    let head = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];

    // 获取数据范围：从第2行开始（第1行是表头），到最后一行的所有列
    let lastRow = ws.getLastRow();
    if (lastRow < 2) {
      // 如果没有数据行，返回空数组
      return JSON.stringify([]);
    }

    // 获取所有数据（从第2行开始）
    let data = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();

    // 构建结果数组，将每行数据转换为对象
    let result = [];
    data.forEach(function (row) {
      let obj = {};
      for (let i = 0; i < head.length; i++) {
        // 处理日期类型
        if (row[i] instanceof Date) {
          let timezoneOffset = row[i].getTimezoneOffset() * 60000;
          let beijingOffset = 8 * 60 * 60000;
          let adjustedDate = new Date(
            row[i].getTime() + beijingOffset - timezoneOffset
          );
          obj[head[i]] = adjustedDate.toISOString().split("T")[0];
        } else {
          obj[head[i]] = row[i] || "";
        }
      }
      result.push(obj);
    });

    console.log("成功获取PM工单数据，共 " + result.length + " 条记录");
    return JSON.stringify(result);
  } catch (error) {
    console.error(
      "获取PM工单数据失败 / Failed to get PM workorder data:",
      error
    );
    return JSON.stringify({
      success: false,
      message:
        "获取PM工单数据失败 / Failed to get PM workorder data: " +
        error.toString(),
    });
  }
}
/**
 * 保存保养后续措施数据
 * @param {string} recordId - 记录编号（例如：20260213233819-1）
 * @param {object} pmData - 保养数据对象
 * @returns {object} 保存结果
 */
function savePMFollowUpAction(recordId, pmData) {
  try {
    let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
    let ss = SpreadsheetApp.openById(id);

    // 从recordId中提取基础编号（去掉-后的数字）
    let baseId = recordId.split('-')[0];

    // 构建要遍历的sheet列表
    var sheetsToSearch = [];
    if (USE_MERGED_SHIFT_SHEET) {
      var wsMerged = getShiftSheet(ss);
      if (wsMerged) sheetsToSearch.push(wsMerged);
    } else {
      var sheetNames = [
        "Shift_INJ_TB1", "Shift_INJ_TB2",
        "Shift_TF_TB1", "Shift_TF_TB2",
        "Shift_PK_TB1", "Shift_PK_TB2",
      ];
      sheetNames.forEach(function(sn) {
        var s = ss.getSheetByName(sn);
        if (s) sheetsToSearch.push(s);
      });
    }

    // 遍历所有sheet查找匹配的记录
    for (var sIdx = 0; sIdx < sheetsToSearch.length; sIdx++) {
      var ws = sheetsToSearch[sIdx];
      
      let lastRow = ws.getLastRow();
      if (lastRow < 2) continue;
      
      // 获取表头
      let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
      let idColIndex = headers.indexOf('编号');
      let pmColIndex = headers.indexOf('后续措施 - 保养');
      
      if (idColIndex === -1 || pmColIndex === -1) {
        continue;
      }
      
      // 获取所有数据
      let allData = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();
      
      // 查找所有匹配基础编号的记录
      let matchingRows = [];
      for (let i = 0; i < allData.length; i++) {
        let currentId = allData[i][idColIndex].toString();
        if (currentId.startsWith(baseId)) {
          matchingRows.push({
            rowIndex: i + 2,
            id: currentId,
            suffix: currentId.includes('-') ? parseInt(currentId.split('-')[1]) : 0
          });
        }
      }
      
      // 如果找到匹配的记录，找到后缀数字最大的那条
      if (matchingRows.length > 0) {
        matchingRows.sort((a, b) => b.suffix - a.suffix);
        let targetRow = matchingRows[0].rowIndex;
        
        // 构建JSON数据
        let pmJsonData = [{
          "优化现有保养清单 / Optimize existing PM checklist": pmData.option1 || "NA",
          "下次保养时专项执行 / Special execution in next PM": pmData.option2 || "NA",
          "其他 / Others": pmData.option3 || "NA",
          "提交人/ Submitor": pmData.submitor,
          "提交日期/ Submit Date": pmData.submitDate
        }];
        
        // 写入数据
        ws.getRange(targetRow, pmColIndex + 1).setValue(JSON.stringify(pmJsonData));
        
        console.log("保养数据保存成功: " + matchingRows[0].id + " at row " + targetRow);
        
        return {
          status: "success",
          message: "保存成功 / Save successfully",
          targetId: matchingRows[0].id
        };
      }
    }
    
    return {
      status: "error",
      message: "未找到对应的记录 / Record not found"
    };
    
  } catch (e) {
    console.error("保存保养数据失败:", e);
    return {
      status: "error",
      message: "保存失败 / Save failed: " + e.toString()
    };
  }
}

/**
 * 读取保养后续措施数据
 * @param {string} recordId - 记录编号（例如：20260213233819-1）
 * @returns {object} 读取结果
 */
function getPMFollowUpAction(recordId) {
  try {
    let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
    let ss = SpreadsheetApp.openById(id);

    // 从recordId中提取基础编号（去掉-后的数字）
    let baseId = recordId.split('-')[0];

    // 构建要遍历的sheet列表
    var sheetsToSearch = [];
    if (USE_MERGED_SHIFT_SHEET) {
      var wsMerged = getShiftSheet(ss);
      if (wsMerged) sheetsToSearch.push(wsMerged);
    } else {
      var sheetNames = [
        "Shift_INJ_TB1", "Shift_INJ_TB2",
        "Shift_TF_TB1", "Shift_TF_TB2",
        "Shift_PK_TB1", "Shift_PK_TB2",
      ];
      sheetNames.forEach(function(sn) {
        var s = ss.getSheetByName(sn);
        if (s) sheetsToSearch.push(s);
      });
    }

    // 遍历所有sheet查找匹配的记录
    for (var sIdx = 0; sIdx < sheetsToSearch.length; sIdx++) {
      var ws = sheetsToSearch[sIdx];
      
      let lastRow = ws.getLastRow();
      if (lastRow < 2) continue;
      
      // 获取表头
      let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
      let idColIndex = headers.indexOf('编号');
      let pmColIndex = headers.indexOf('后续措施 - 保养');
      
      if (idColIndex === -1 || pmColIndex === -1) {
        continue;
      }
      
      // 获取所有数据
      let allData = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();
      
      // 查找所有匹配基础编号的记录
      let matchingRows = [];
      for (let i = 0; i < allData.length; i++) {
        let currentId = allData[i][idColIndex].toString();
        if (currentId.startsWith(baseId)) {
          matchingRows.push({
            rowIndex: i + 2,
            id: currentId,
            suffix: currentId.includes('-') ? parseInt(currentId.split('-')[1]) : 0,
            pmData: allData[i][pmColIndex]
          });
        }
      }
      
      // 如果找到匹配的记录，找到后缀数字最大的那条
      if (matchingRows.length > 0) {
        matchingRows.sort((a, b) => b.suffix - a.suffix);
        let targetRecord = matchingRows[0];
        
        // 检查是否有保养数据
        if (!targetRecord.pmData || targetRecord.pmData.toString().trim() === '') {
          return {
            status: "success",
            hasData: false,
            data: null
          };
        }
        
        // 解析JSON数据
        try {
          let pmJsonData = JSON.parse(targetRecord.pmData);
          if (Array.isArray(pmJsonData) && pmJsonData.length > 0) {
            let pmInfo = pmJsonData[0];
            return {
              status: "success",
              hasData: true,
              data: {
                option1: pmInfo["优化现有保养清单 / Optimize existing PM checklist"] === "NA" ? "" : pmInfo["优化现有保养清单 / Optimize existing PM checklist"],
                option2: pmInfo["下次保养时专项执行 / Special execution in next PM"] === "NA" ? "" : pmInfo["下次保养时专项执行 / Special execution in next PM"],
                option3: pmInfo["其他 / Others"] === "NA" ? "" : pmInfo["其他 / Others"]
              }
            };
          }
        } catch (parseError) {
          console.error("解析保养数据JSON失败:", parseError);
          return {
            status: "error",
            message: "数据格式错误 / Data format error"
          };
        }
      }
    }
    
    return {
      status: "success",
      hasData: false,
      data: null
    };
    
  } catch (e) {
    console.error("读取保养数据失败:", e);
    return {
      status: "error",
      message: "读取失败 / Read failed: " + e.toString()
    };
  }
}

// ==================== 三班转保养跟进功能 / PM Shift Follow-up Functions ====================

/**
 * 根据工序获取MasterData数据
 * @param {string} process - 工序名称 (INJ/TF/PK)
 * @returns {Array} 返回对应工序的数据数组
 */
function getMasterDataByProcess(process) {
  try {
    const spreadsheetId = '1HZHz5wN8sXeP5S7ub041bqklk0Rm2Jsmh3Ovd7ZKeJE';
    const sheetName = 'MasterData';
    
    let ss = SpreadsheetApp.openById(spreadsheetId);
    let ws = ss.getSheetByName(sheetName);
    
    if (!ws) {
      console.error('MasterData sheet not found');
      return [];
    }
    
    let lastRow = ws.getLastRow();
    if (lastRow < 2) {
      return [];
    }
    
    // 获取表头
    let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    
    // 获取所有数据
    let allData = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();
    
    // 转换为对象数组
    let dataArray = allData.map((row, index) => {
      let obj = {};
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      obj['行号'] = index + 2; // 保存行号用于后续更新
      return obj;
    });
    
    // 根据工序筛选数据
    let filteredData = dataArray.filter(item => {
      let itemProcess = item['工序'] || '';
      // INJ和IM等同处理
      if (process === 'INJ' || process === 'IM') {
        return itemProcess === 'INJ' || itemProcess === 'IM';
      }
      return itemProcess === process;
    });
    
    return filteredData;
    
  } catch (e) {
    console.error('获取MasterData数据失败:', e);
    return [];
  }
}

/**
 * 批量更新MasterData数据
 * @param {Array} submitData - 提交的数据数组
 * @returns {Object} 返回操作结果
 */
function batchUpdateMasterData(submitData) {
  try {
    const spreadsheetId = '1HZHz5wN8sXeP5S7ub041bqklk0Rm2Jsmh3Ovd7ZKeJE';
    const sheetName = 'MasterData';
    
    let ss = SpreadsheetApp.openById(spreadsheetId);
    let ws = ss.getSheetByName(sheetName);
    
    if (!ws) {
      return {
        success: false,
        message: 'MasterData sheet not found'
      };
    }
    
    // 获取表头
    let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    let statusColIndex = headers.indexOf('状态') + 1;
    let feedbackColIndex = headers.indexOf('后续措施 - 保养（反馈）') + 1;
    let numberColIndex = headers.indexOf('编号') + 1;
    
    if (statusColIndex === 0 || feedbackColIndex === 0 || numberColIndex === 0) {
      return {
        success: false,
        message: '表头列未找到'
      };
    }
    
    // 获取所有编号列数据用于查找行号
    let lastRow = ws.getLastRow();
    let allNumbers = ws.getRange(2, numberColIndex, lastRow - 1, 1).getValues();
    
    let updateCount = 0;
    
    // 遍历提交数据进行更新
    submitData.forEach(item => {
      let recordNumber = item.recordNumber;
      let changes = item.changes;
      
      // 查找对应的行号
      let rowIndex = -1;
      for (let i = 0; i < allNumbers.length; i++) {
        if (allNumbers[i][0].toString() === recordNumber.toString()) {
          rowIndex = i + 2; // +2 因为数据从第2行开始
          break;
        }
      }
      
      if (rowIndex === -1) {
        console.error('未找到编号为 ' + recordNumber + ' 的记录');
        return;
      }
      
      // 更新状态
      if (changes.hasOwnProperty('状态')) {
        ws.getRange(rowIndex, statusColIndex).setValue(changes['状态']);
        updateCount++;
      }
      
      // 更新反馈
      if (changes.hasOwnProperty('后续措施 - 保养（反馈）')) {
        ws.getRange(rowIndex, feedbackColIndex).setValue(changes['后续措施 - 保养（反馈）']);
        updateCount++;
      }
    });
    
    return {
      success: true,
      message: '成功更新 ' + updateCount + ' 个字段',
      updateCount: updateCount
    };
    
  } catch (e) {
    console.error('批量更新MasterData失败:', e);
    return {
      success: false,
      message: '更新失败: ' + e.toString()
    };
  }
}

// ==================== 4D隐患汇报功能 / 4D Hazard Report Functions ====================

/**
 * 提交4D隐患汇报
 * @param {object} hazardData - 隐患汇报数据对象
 * @returns {object} 返回操作结果
 */
function submit4DHazardReport(hazardData) {
  try {
    const spreadsheetId = '1VlYsGx1WenM2xw2W-5i0zKOsjlj-QW2ZJnANrQksUQA';
    const sheetName = 'MasterData';
    
    let ss = SpreadsheetApp.openById(spreadsheetId);
    let ws = ss.getSheetByName(sheetName);
    
    if (!ws) {
      return {
        success: false,
        message: 'MasterData工作表未找到 / MasterData sheet not found'
      };
    }
    
    // 按照表头顺序准备数据
    // A:工序 / Process | B:车间 / Workshop | C:隐患详情 / Hazard Details | 
    // D:建议措施 / Suggested Measures | E:提交人 / Submitter | F:提交时间 / Data
    let submitRow = [
      hazardData['工序'] || '',                    // A: 工序 / Process
      hazardData['车间'] || '',                    // B: 车间 / Workshop  
      hazardData['隐患描述'] || '',                 // C: 隐患详情 / Hazard Details
      hazardData['建议措施'] || '',                 // D: 建议措施 / Suggested Measures
      hazardData['提交人'] || '',                   // E: 提交人 / Submitter
      hazardData['提交时间'] || ''                  // F: 提交时间 / Data (YYYY-MM-DD)
    ];
    
    // 追加新行
    ws.appendRow(submitRow);
    
    // 生成汇报编号 (格式: HZ + YYYYMMDD + 4位序号)
    let now = new Date();
    let dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    let reportId = 'HZ' + dateStr + String(ws.getLastRow()).padStart(4, '0');
    
    console.log('4D隐患汇报提交成功，编号: ' + reportId);
    console.log('提交数据:', hazardData);
    
    return {
      success: true,
      message: '提交成功 / Submit Successfully',
      reportId: reportId
    };
    
  } catch (error) {
    console.error('4D隐患汇报提交失败:', error);
    return {
      success: false,
      message: '提交失败 / Submit Failed: ' + error.toString()
    };
  }
}

// ==================== Check 4 Safety功能 / Check 4 Safety Functions ====================

/**
 * 提交Check 4 Safety检查数据
 * @param {object} checkData - 检查数据对象
 * @returns {object} 返回操作结果
 */
function submitSafety4Check(checkData) {
  try {
    const spreadsheetId = '1S5l2sWbozcOVXVFdP2P8rXmyCAVsYbwjNKosXdhdz3U';
    const sheetName = 'MasterData';
    
    let ss = SpreadsheetApp.openById(spreadsheetId);
    let ws = ss.getSheetByName(sheetName);
    
    if (!ws) {
      return {
        success: false,
        message: 'MasterData工作表未找到 / MasterData sheet not found'
      };
    }
    
    // 格式化检查项数据
    let check1Data = formatCheckItemData(checkData.checks[0]);
    let check2Data = formatCheckItemData(checkData.checks[1]);
    let check3Data = formatCheckItemData(checkData.checks[2]);
    let check4Data = formatCheckItemData(checkData.checks[3]);
    
    // 准备提交数据
    let now = new Date();
    let submitDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    let submitTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
    
    let submitRow = [
      checkData.process || '',                    // A: 工序 / Process
      checkData.workshop || '',                   // B: 车间 / Workshop  
      check1Data,                                 // C: 检查项1
      check2Data,                                 // D: 检查项2
      check3Data,                                 // E: 检查项3
      check4Data,                                 // F: 检查项4
      checkData.submitter || '',                   // G: 提交人 / Submitter
      submitDate,                                 // H: 提交日期 / Date
      submitTime                                  // I: 提交时间 / Time
    ];
    
    // 追加新行
    ws.appendRow(submitRow);
    
    // 生成检查编号 (格式: S4C + YYYYMMDD + 4位序号)
    let dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    let checkId = 'S4C' + dateStr + String(ws.getLastRow()).padStart(4, '0');
    
    console.log('Check 4 Safety提交成功，编号: ' + checkId);
    console.log('提交数据:', checkData);
    
    return {
      success: true,
      message: '提交成功 / Submit Successfully',
      checkId: checkId
    };
    
  } catch (error) {
    console.error('Check 4 Safety提交失败:', error);
    return {
      success: false,
      message: '提交失败 / Submit Failed: ' + error.toString()
    };
  }
}

/**
 * 格式化检查项数据
 * @param {object} checkItem - 检查项对象
 * @returns {string} 格式化后的字符串
 */
function formatCheckItemData(checkItem) {
  let status = checkItem.status || '';
  let details = checkItem.details || '';
  
  let result = '【状态 / Status】：' + status;
  
  if (status === '异常' && details) {
    result += '\n【具体细节 / Specific Details】：' + details;
  } else if (status === '正常') {
    result += '\n【具体细节 / Specific Details】：无 / None';
  }
  
  return result;
}

// ==========================================
// 交接班留言板功能 / Handover Message Board
// ==========================================
const HANDBOARD_SS_ID = '1PlLYcuCA3H3MsQyOaA0AIPpuEPNR0fXWCsBvQtT-bEQ';
const HANDBOARD_SHEET_NAME = 'Handover_MessageBoard';
const USER_PERMISSION_SS_ID = '1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM';
const USER_PERMISSION_SHEET_NAME = 'userID';

/**
 * 检查用户是否有留言板编辑权限
 * Check if user has message board edit permission
 * @param {string} userEmail - 用户邮箱
 * @param {string} userName - 用户姓名
 * @returns {boolean}
 */
function checkMessageBoardEditPermission(userEmail, userName) {
  try {
    const ss = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const sheet = ss.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!sheet) return false;
    
    const values = sheet.getDataRange().getValues();
    const emailLower = String(userEmail || '').trim().toLowerCase();
    const nameTrimmed = String(userName || '').trim();
    // 从第2行开始遍历（跳过表头）
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // B列为姓名（索引1），J列为邮箱（索引9），BE列为权限（索引56）
      const rowName = String(row[1] || '').trim();
      const rowEmail = String(row[9] || row[0] || '').trim().toLowerCase();
      const permission = String(row[56] || '').trim();
      
      const matchByEmail = emailLower && rowEmail && rowEmail === emailLower;
      const matchByName = nameTrimmed && rowName && rowName === nameTrimmed;
      
      if ((matchByEmail || matchByName) && permission.includes('编辑')) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('检查权限失败:', error);
    return false;
  }
}

/**
 * 检查用户是否有故障报告管理权限
 * Check if user has failure report management permission
 * 读取权限表最后一列，检查是否包含"故障报告管理"
 * @param {string} userEmail - 用户邮箱
 * @param {string} userName - 用户姓名
 * @returns {boolean}
 */
function checkFailureReportManagePermission(userEmail, userName) {
  try {
    const ss = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const sheet = ss.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!sheet) return false;

    const values = sheet.getDataRange().getValues();
    // userID sheet: row 1 = category, row 2 = headers, row 3+ = data
    if (values.length < 3) return false;

    const emailLower = String(userEmail || '').trim().toLowerCase();
    const nameTrimmed = String(userName || '').trim();
    // 按表头名称查找"故障报告管理权限"列（表头在第2行，即values[1]）
    const headers = values[1];
    let permColIndex = -1;
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c] || '').trim() === '故障报告管理权限') {
        permColIndex = c;
        break;
      }
    }
    if (permColIndex === -1) return false;

    for (let i = 2; i < values.length; i++) {
      const row = values[i];
      // B列为姓名（索引1），J列为邮箱（索引9）
      const rowName = String(row[1] || '').trim();
      const rowEmail = String(row[9] || row[0] || '').trim().toLowerCase();
      const permission = String(row[permColIndex] || '').trim();

      const matchByEmail = emailLower && rowEmail && rowEmail === emailLower;
      const matchByName = nameTrimmed && rowName && rowName === nameTrimmed;

      if ((matchByEmail || matchByName) && permission === 'Y') {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('检查故障报告管理权限失败:', error);
    return false;
  }
}

/**
 * 初始化故障报告管理权限列（一次性操作）
 * 在权限表最后新增一列，表头为"故障报告管理权限"
 * Setup failure report management permission column (one-time operation)
 */
function setupFailureReportManagePermissionColumn() {
  try {
    const ss = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const sheet = ss.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!sheet) return 'Sheet userID not found';

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const lastHeader = String(headers[lastCol - 1] || '').trim();

    if (lastHeader === '故障报告管理权限') {
      return 'Column already exists, no action needed / 列已存在，无需操作';
    }

    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue('故障报告管理权限');
    return 'Column added successfully / 列添加成功';
  } catch (error) {
    console.error('初始化权限列失败:', error);
    return 'Error: ' + error.message;
  }
}

/**
 * 检查故障报告填写权限
 * Check failure report filling permission
 * @param {string} userEmail - 用户邮箱
 * @param {string} userName - 用户姓名
 * @returns {boolean}
 */
function checkFailureReportFillPermission(userEmail, userName) {
  try {
    const ss = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const sheet = ss.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!sheet) return false;

    const values = sheet.getDataRange().getValues();
    if (values.length < 3) return false;

    const emailLower = String(userEmail || '').trim().toLowerCase();
    const nameTrimmed = String(userName || '').trim();
    const headers = values[1];
    let permColIndex = -1;
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c] || '').trim() === '故障报告填写权限') {
        permColIndex = c;
        break;
      }
    }
    if (permColIndex === -1) return false;

    for (let i = 2; i < values.length; i++) {
      const row = values[i];
      const rowName = String(row[1] || '').trim();
      const rowEmail = String(row[9] || row[0] || '').trim().toLowerCase();
      const permission = String(row[permColIndex] || '').trim();

      const matchByEmail = emailLower && rowEmail && rowEmail === emailLower;
      const matchByName = nameTrimmed && rowName && rowName === nameTrimmed;

      if ((matchByEmail || matchByName) && permission === 'Y') {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('检查故障报告填写权限失败:', error);
    return false;
  }
}

/**
 * 初始化故障报告填写权限列（一次性操作）
 * 在权限表最后新增一列，表头为"故障报告填写权限"
 */
function setupFailureReportFillPermissionColumn() {
  try {
    const ss = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const sheet = ss.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!sheet) return 'Sheet userID not found';

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const lastHeader = String(headers[lastCol - 1] || '').trim();

    if (lastHeader === '故障报告填写权限') {
      return 'Column already exists, no action needed / 列已存在，无需操作';
    }

    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue('故障报告填写权限');
    return 'Column added successfully / 列添加成功';
  } catch (error) {
    console.error('初始化权限列失败:', error);
    return 'Error: ' + error.message;
  }
}

/**
 * 迁移 O 列审核状态为全生命周期状态（一次性）
 * 空→待提交，已通过→审核通过/已完成（按跟进验证状态判断）
 * 使用方式：在 GAS 编辑器中手动执行一次 migrateReviewStatus_O_Column()
 */
function migrateReviewStatus_O_Column() {
  var ss = SpreadsheetApp.openById(FR_SS_ID);
  var ws = ss.getSheetByName('Failure_Database');
  var wsFollow = ss.getSheetByName('Failure_Report_followup');
  if (!ws) return 'Failure_Database sheet 未找到';
  var data = ws.getDataRange().getValues();
  var updated = 0;

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][14] || '').trim();
    var reportNo = String(data[i][6] || '').trim();

    if (status === '') {
      ws.getRange(i + 1, 15).setValue('待提交');
      updated++;
    } else if (status === '已通过') {
      var allDone = true, hasActive = false;
      if (wsFollow) {
        var followData = wsFollow.getDataRange().getValues();
        for (var j = 1; j < followData.length; j++) {
          if (String(followData[j][1]).trim() !== reportNo) continue;
          var st = String(followData[j][8] || '').trim();
          if (!st) continue;
          hasActive = true;
          if (st !== '已通过 / Passed' && st !== '已取消 / Cancelled') allDone = false;
        }
      }
      ws.getRange(i + 1, 15).setValue(!hasActive || allDone ? '已完成' : '审核通过');
      updated++;
    }
  }
  console.log('O列状态迁移完成，共更新 ' + updated + ' 行');
  return '迁移完成，共更新 ' + updated + ' 行';
}

/**
 * 获取留言板列表（按车间工序过滤，时间倒序）
 * Get message board list (filtered by workshop/process, time desc)
 * @param {string} workshop - 车间
 * @param {string} process - 工序
 * @param {number} limit - 限制条数（默认50）
 * @returns {Object}
 */
function getMessageBoardList(workshop, process, limit) {
  try {
    limit = limit || 50;
    const ss = SpreadsheetApp.openById(HANDBOARD_SS_ID);
    const sheet = ss.getSheetByName(HANDBOARD_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: '留言板工作表不存在 / Message board sheet not found' };
    }
    
    const values = sheet.getDataRange().getValues();
    let messages = [];
    
    // 从第2行开始遍历（跳过表头）
    // 列顺序：序号(0),留言ID(1),车间(2),工序(3),留言人(4),留言时间(5),留言内容(6),最后编辑时间(7)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowWorkshop = String(row[2] || '').trim();
      const rowProcess = String(row[3] || '').trim();
      
      // 过滤车间和工序
      if (workshop && rowWorkshop !== workshop) continue;
      if (process && rowProcess !== process) continue;
      
      messages.push({
        seqNo: String(row[0] || ''),
        messageId: String(row[1] || ''),
        timestamp: String(row[5] || ''),
        author: String(row[4] || ''),
        workshop: rowWorkshop,
        process: rowProcess,
        content: String(row[6] || ''),
        editTime: String(row[7] || '')
      });
    }
    
    // 按时间倒序排列
    messages.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // 限制返回条数
    messages = messages.slice(0, limit);
    
    return { success: true, data: messages };
  } catch (error) {
    return { success: false, message: '获取留言失败 / Failed to get messages: ' + error.toString() };
  }
}

/**
 * 添加新留言
 * Add new message
 * @param {string} author - 留言人
 * @param {string} workshop - 车间
 * @param {string} process - 工序
 * @param {string} content - 内容
 * @returns {Object}
 */
function addMessageBoardMessage(author, workshop, process, content) {
  try {
    const ss = SpreadsheetApp.openById(HANDBOARD_SS_ID);
    const sheet = ss.getSheetByName(HANDBOARD_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: '留言板工作表不存在 / Message board sheet not found' };
    }
    
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const messageId = Utilities.getUuid();
    
    // 计算序号：当前行数（含表头）即下一行的序号
    const lastRow = sheet.getLastRow();
    const seqNo = lastRow > 0 ? lastRow : 1;
    
    // 列顺序：序号(0),留言ID(1),车间(2),工序(3),留言人(4),留言时间(5),留言内容(6),最后编辑时间(7)
    sheet.appendRow([seqNo, messageId, workshop, process, author, timestamp, content, timestamp]);
    
    return { success: true, message: '留言添加成功 / Message added successfully' };
  } catch (error) {
    return { success: false, message: '添加留言失败 / Failed to add message: ' + error.toString() };
  }
}

/**
 * 编辑留言
 * Edit message
 * @param {string} messageId - 留言ID
 * @param {string} content - 新内容
 * @param {string} editor - 编辑人
 * @returns {Object}
 */
function editMessageBoardMessage(messageId, content, editor) {
  try {
    const ss = SpreadsheetApp.openById(HANDBOARD_SS_ID);
    const sheet = ss.getSheetByName(HANDBOARD_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: '留言板工作表不存在 / Message board sheet not found' };
    }
    
    const values = sheet.getDataRange().getValues();
    
    // 查找留言
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][1]) === messageId) {
        const editTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        // 更新内容（G列，索引7）和编辑时间（H列，索引8）
        sheet.getRange(i + 1, 7).setValue(content);
        sheet.getRange(i + 1, 8).setValue(editTime);
        return { success: true, message: '留言编辑成功 / Message edited successfully' };
      }
    }
    
    return { success: false, message: '留言不存在 / Message not found' };
  } catch (error) {
    return { success: false, message: '编辑留言失败 / Failed to edit message: ' + error.toString() };
  }
}

/**
 * 删除留言
 * Delete message
 * @param {string} messageId - 留言ID
 * @returns {Object}
 */
function deleteMessageBoardMessage(messageId) {
  try {
    const ss = SpreadsheetApp.openById(HANDBOARD_SS_ID);
    const sheet = ss.getSheetByName(HANDBOARD_SHEET_NAME);
    if (!sheet) {
      return { success: false, message: '留言板工作表不存在 / Message board sheet not found' };
    }
    
    const values = sheet.getDataRange().getValues();
    
    // 查找并删除留言
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][1]) === messageId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: '留言删除成功 / Message deleted successfully' };
      }
    }
    
    return { success: false, message: '留言不存在 / Message not found' };
  } catch (error) {
    return { success: false, message: '删除留言失败 / Failed to delete message: ' + error.toString() };
  }
}

// ==========================================
// 项目跟进模块 / Project Tracking Module
// ==========================================
const PROJECT_TRACKING_SS_ID = '1aoQDjeWU9Xa9clloyTwiXL6WS62tYVbB0-VOavpAgAM';
const PROJECT_TRACKING_SHEET_NAME = '项目总表';
// 项目总表列结构（0-indexed）：A 项目名称 / B Leader / C 技术员 / D 状态 / E 里程碑JSON
const PROJECT_STATUS_COL = 3;          // Col D
const PROJECT_PERMISSION_COL = 59; // BH column - 项目跟进权限管理（用户权限表，不受项目总表列变更影响）
const PROJECT_TRACKING_HISTORY_SHEET_NAME = 'ProjectTracking_History';
const PROJECT_TRACKING_APPROVALS_SHEET_NAME = 'ProjectTracking_Approvals';
const PROJECT_MILESTONES_JSON_COL = 4;  // Col E — 里程碑 JSON 数组（单一数据源）
const PROJECT_TYPE_COL = 5;             // Col F — 项目类型：新品/新自动化 / CI / Kaizen
const PROJECT_ID_COL = 6;              // Col G — 项目编号
const PROJECT_CREATED_COL = 7;         // Col H — 创建时间
const PROJECT_COMPLETED_COL = 8;       // Col I — 完成时间
const PROJECT_PROCESS_COL = 9;         // Col J — 工序（INJ/TF/PK）

/**
 * Format a sheet cell value as YYYY-MM-DD string
 * @param {*} val - Cell value (Date object, string, etc.)
 * @returns {string}
 */
function formatSheetDate_(val) {
  if (!val || val === 'NA' || val === '') return val === 'NA' ? 'NA' : '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    var now = new Date();
    var year = m[3] ? parseInt(m[3]) : now.getFullYear();
    return year + '-' + ('0' + parseInt(m[1])).slice(-2) + '-' + ('0' + parseInt(m[2])).slice(-2);
  }
  return s;
}

/**
 * 解析里程碑数组（单一数据源：S 列 Milestones_JSON）
 * Parse milestones from the JSON column. Returns [] when absent/invalid.
 * @param {*} raw - cell value of PROJECT_MILESTONES_JSON_COL
 * @returns {Array<{name:string,planned:string,actual:string}>}
 */
function parseMilestonesJSON_(raw) {
  if (raw && String(raw).trim().charAt(0) === '[') {
    try { return JSON.parse(String(raw)); } catch (e) {}
  }
  return [];
}

/**
 * 获取项目跟进数据
 * Get project tracking data
 * @returns {string} JSON string
 */
function getProjectTrackingData() {
  try {
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!ws) return JSON.stringify({ error: 'Sheet 项目总表 not found' });

    const data = ws.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).filter(function(row) {
      return row[0] && String(row[0]).trim() !== '';
    });

    const projects = rows.map(function(row, index) {
      const project = {
        rowIndex: index + 2,
        projectId: String(row[PROJECT_ID_COL] || ''),
        projectName: String(row[0] || ''),
        leader: String(row[1] || ''),
        technician: String(row[2] || ''),
        status: String(row[PROJECT_STATUS_COL] || ''),
        type: String(row[PROJECT_TYPE_COL] || '').trim() || '新品/新自动化',
        process: String(row[PROJECT_PROCESS_COL] || '').trim() || 'INJ',
        milestones: parseMilestonesJSON_(row[PROJECT_MILESTONES_JSON_COL]),
        createdAt: String(row[PROJECT_CREATED_COL] || ''),
        completedAt: String(row[PROJECT_COMPLETED_COL] || '')
      };
      return project;
    });

    return JSON.stringify({ headers: headers, projects: projects });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/**
 * 更新项目跟进数据
 * Update project tracking data
 * @param {string} projectName - 项目名称
 * @param {string} updatesStr - JSON string with milestone actual dates and/or status
 * @param {string} editorName - 编辑人姓名
 * @returns {string} JSON string
 */
function updateProjectTracking(projectName, updatesStr, editorName) {
  try {
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!ws) return JSON.stringify({ success: false, message: 'Sheet 项目总表 not found' });

    const updates = JSON.parse(updatesStr);
    const data = ws.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === projectName) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      return JSON.stringify({ success: false, message: '项目未找到 / Project not found' });
    }

    const currentRow = data[rowIndex - 1];
    const changes = {};

    // Update leader
    if (updates.leader) {
      const currentLeader = String(currentRow[1] || '').trim();
      if (updates.leader !== currentLeader) changes.leader = { old: currentLeader, new: updates.leader };
      ws.getRange(rowIndex, 2).setValue(updates.leader);
    }

    // Update milestone actual dates
    if (updates.milestones && Array.isArray(updates.milestones)) {
      const actualChanges = [];
      var currentMsArr = parseMilestonesJSON_(currentRow[PROJECT_MILESTONES_JSON_COL]);
      updates.milestones.forEach(function(ms) {
        if (ms.index >= 0 && ms.index < currentMsArr.length) {
          const currentActual = String(currentMsArr[ms.index].actual || '').trim();
          if ((ms.actual || '') !== currentActual) {
            actualChanges.push({ name: currentMsArr[ms.index].name, old: currentActual, new: ms.actual || '', owner: currentMsArr[ms.index].owner || '' });
          }
          currentMsArr[ms.index].actual = ms.actual || '';
        }
      });
      ws.getRange(rowIndex, PROJECT_MILESTONES_JSON_COL + 1).setValue(JSON.stringify(currentMsArr));
      if (actualChanges.length > 0) changes.milestones = actualChanges;
    }

    // Full milestone replacement — 同时检测计划日期变更、写History
    if (updates.milestonesReplace !== undefined) {
      var oldMsArr = parseMilestonesJSON_(currentRow[PROJECT_MILESTONES_JSON_COL]);
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
      ws.getRange(rowIndex, PROJECT_MILESTONES_JSON_COL + 1).setValue(JSON.stringify(newArr));
      changes.milestonesReplace = newArr;

      // 检测计划日期变更 + 全面记录所有变更到 History
      const plannedChanges = [];
      const historyRows = []; // 通用 History 记录行
      const maxLen = Math.max(oldMsArr.length, newArr.length);
      for (let j = 0; j < maxLen; j++) {
        const oldMs = j < oldMsArr.length ? oldMsArr[j] : null;
        const newMs = j < newArr.length ? newArr[j] : null;
        const msLabel = (newMs || oldMs).name || ('#' + (j + 1));

        if (!oldMs && newMs) {
          historyRows.push({ milestone: '新增: ' + msLabel, note: '新增里程碑/事项' });
        } else if (oldMs && !newMs) {
          historyRows.push({ milestone: '删除: ' + msLabel, note: '删除里程碑/事项' });
        } else if (oldMs && newMs) {
          // 计划日期
          const oldP = String(oldMs.planned || '').trim();
          const newP = String(newMs.planned || 'NA');
          if (oldP !== newP) {
            plannedChanges.push({ name: msLabel, old: oldP || 'NA', new: newP, owner: (newMs.owner || oldMs.owner || '') });
            historyRows.push({ milestone: msLabel, plannedOld: oldP || 'NA', plannedNew: newP, note: '计划日期变更' });
          }
          // 计划开始日期
          const oldPS = String(oldMs.plannedStart || '').trim();
          const newPS = String(newMs.plannedStart || '');
          if (oldPS !== newPS) {
            historyRows.push({ milestone: msLabel, plannedOld: oldPS || 'NA', plannedNew: newPS, note: '计划开始日期变更' });
          }
          // 名称
          if (String(oldMs.name || '').trim() !== String(newMs.name || '').trim()) {
            historyRows.push({ milestone: msLabel, plannedOld: String(oldMs.name || '').trim(), plannedNew: String(newMs.name || '').trim(), note: '名称变更' });
          }
          // 实际完成日期
          const oldA = String(oldMs.actual || '').trim();
          const newA = String(newMs.actual || '');
          if (oldA !== newA) {
            historyRows.push({ milestone: msLabel, plannedOld: oldA || '无', plannedNew: newA || '无', note: '实际完成日期变更' });
          }
          // 责任人 (CI)
          const oldO = String(oldMs.owner || '').trim();
          const newO = String(newMs.owner || '');
          if (oldO !== newO) {
            historyRows.push({ milestone: msLabel, plannedOld: oldO || '无', plannedNew: newO || '无', note: '责任人变更' });
          }
          // 事项状态 (CI)
          const oldS = String(oldMs.status || '').trim();
          const newS = String(newMs.status || '');
          if (oldS !== newS) {
            historyRows.push({ milestone: msLabel, plannedOld: oldS || '无', plannedNew: newS || '无', note: '事项状态变更' });
          }
        }
      }
      if (plannedChanges.length > 0) changes.plannedDates = plannedChanges;

      // 写入 History
      const historyWs = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
      if (historyWs) {
        const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
        const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
        historyRows.forEach(function(hr) {
          historyWs.appendRow([projectName, hr.milestone, hr.plannedOld || '', hr.plannedNew || '', editorName, now, hr.note || '']);
        });
      }
    }
    if (updates.leader) {
      const currentLeader = String(currentRow[1] || '').trim();
      if (updates.leader !== currentLeader) {
        // Leader 变更写入 History（changes.leader 已在上方设置）
        const historyWs = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
        if (historyWs) {
          const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
          const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
          historyWs.appendRow([projectName, 'Leader变更', currentLeader, updates.leader, editorName, now, '项目Leader变更']);
        }
      }
    }
    if (updates.status !== undefined) {
      const currentStatus = String(currentRow[PROJECT_STATUS_COL] || '').trim();
      if (updates.status !== currentStatus) {
        changes.status = { old: currentStatus, new: updates.status };
        // 状态变更写入 History
        const historyWs = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
        if (historyWs) {
          const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
          const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
          historyWs.appendRow([projectName, '状态变更', changes.status.old, changes.status.new, editorName, now, '项目状态变更']);
        }
        // 状态改为 Done 时记录完成时间
        if (updates.status === 'Done') {
          const tz2 = Session.getScriptTimeZone() || 'Asia/Shanghai';
          const doneTime = Utilities.formatDate(new Date(), tz2, 'yyyy-MM-dd');
          ws.getRange(rowIndex, PROJECT_COMPLETED_COL + 1).setValue(doneTime);
        }
        // 状态从 Done 改回其他时清除完成时间
        if (currentStatus === 'Done' && updates.status !== 'Done') {
          ws.getRange(rowIndex, PROJECT_COMPLETED_COL + 1).setValue('');
        }
      }
      ws.getRange(rowIndex, PROJECT_STATUS_COL + 1).setValue(updates.status);
    }

    if (updates.type !== undefined) {
      const currentType = String(currentRow[PROJECT_TYPE_COL] || '').trim() || '新品/新自动化';
      if (updates.type !== currentType) {
        changes.type = { old: currentType, new: updates.type };
        const historyWs = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
        if (historyWs) {
          const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
          const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
          historyWs.appendRow([projectName, '类型变更', changes.type.old, changes.type.new, editorName, now, '项目类型变更']);
        }
      }
      ws.getRange(rowIndex, PROJECT_TYPE_COL + 1).setValue(updates.type);
    }

    if (Object.keys(changes).length > 0) {
      sendProjectUpdateNotification(projectName, editorName, changes);
    }

    return JSON.stringify({ success: true, message: '更新成功 / Update successful' });
  } catch (e) {
    return JSON.stringify({ success: false, message: '更新失败 / Update failed: ' + e.toString() });
  }
}

/**
 * 发送项目更新通知给所有管理员（含任何字段变更）
 * Send project update notification to all admin users on any change
 */
function sendProjectUpdateNotification(projectName, editorName, changes) {
  try {
    // 1. 获取项目 Leader 邮箱（从项目总表 Col B）
    const trackSs = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const trackWs = trackSs.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!trackWs) return;
    const trackData = trackWs.getDataRange().getValues();
    let leaderValue = '';
    let milestonesRaw = '';
    for (let i = 1; i < trackData.length; i++) {
      if (String(trackData[i][0] || '').trim() === projectName) {
        leaderValue = String(trackData[i][1] || '').trim();
        milestonesRaw = String(trackData[i][PROJECT_MILESTONES_JSON_COL] || '');
        break;
      }
    }
    // 从 "姓名 (email)" 格式提取邮箱
    const leaderEmail = (leaderValue.match(/\(([^)]+)\)/) || [])[1] || '';

    // 2. 项目 Leader 的直线上级（从 userID BI 列查找）
    const leaderName = leaderValue.replace(/\(.*\)/, '').trim();  // "郭彭 (email)" → "郭彭"
    const permSs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const permWs = permSs.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!permWs) return;
    const permVals = permWs.getDataRange().getValues();
    const INJ_ADMIN_COLS = { process: 14, perm: 59, email: 9, name: 1, supervisor: 60 }; // O=工序, BH=权限, J=邮箱, B=姓名, BI=直线上级
    const injAdminEmails = [];
    let supervisorEmail = '';
    for (let i = 2; i < permVals.length; i++) {
      const proc  = String(permVals[i][INJ_ADMIN_COLS.process] || '').trim();    // O: EDS 工序
      const perm  = String(permVals[i][INJ_ADMIN_COLS.perm] || '').trim();       // BH: 项目跟进权限
      const email = String(permVals[i][INJ_ADMIN_COLS.email] || '').trim();      // J: GMail
      if (proc === 'INJ' && perm === '管理员' && email) {
        injAdminEmails.push(email);
      }
      const name  = String(permVals[i][INJ_ADMIN_COLS.name] || '').trim();       // B: NAME
      if (name === leaderName) {
        supervisorEmail = String(permVals[i][INJ_ADMIN_COLS.supervisor] || '').trim(); // BI: 直线上级
      }
    }

    // 事项责任人邮箱：取当前项目里程碑 JSON 中各节点的 ownerEmail
    const ownerEmails = [];
    parseMilestonesJSON_(milestonesRaw).forEach(function(n) {
      const e = String((n && n.ownerEmail) || '').trim();
      if (e) ownerEmails.push(e);
    });

    // 3. 构建收件人：To=项目Leader, CC=INJ管理员+直线上级+事项责任人（去重）
    const ccList = [...new Set([...injAdminEmails, supervisorEmail, ...ownerEmails].filter(Boolean))];
    const ccFiltered = leaderEmail ? ccList.filter(function(e) { return e.toLowerCase() !== leaderEmail.toLowerCase(); }) : ccList;
    const toEmail = leaderEmail || ccFiltered.shift() || '';

    if (!toEmail) {
      console.log('No recipients for project update notification: ' + projectName);
      return;
    }

    const webPage = getReleaseWebPage();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const subject = '【项目跟进】' + escapeHtml(editorName) + ' 更新了项目 / Project Update - ' + projectName;

    const fmtDate = function(val) {
      if (!val || val === '空/Empty' || val === 'NA') return val || '空/Empty';
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    };

    let sectionsHtml = '';

    if (changes.leader) {
      sectionsHtml += '<div style="background:#f8f9fa;border-radius:6px;padding:12px 16px;margin-bottom:12px;border-left:4px solid #E60012;">'
        + '<span style="font-weight:600;color:#E60012;">负责人变更 / Leader Change：</span>'
        + '<span style="color:#555;">' + escapeHtml(changes.leader.old || '空/Empty') + '</span>'
        + ' <span style="color:#999;font-size:1.1em;">→</span> '
        + '<span style="color:#2c3e50;font-weight:600;">' + escapeHtml(changes.leader.new) + '</span>'
        + '</div>';
    }

    if (changes.status) {
      sectionsHtml += '<div style="background:#f8f9fa;border-radius:6px;padding:12px 16px;margin-bottom:12px;border-left:4px solid #E60012;">'
        + '<span style="font-weight:600;color:#E60012;">状态变更 / Status Change：</span>'
        + '<span style="color:#555;">' + escapeHtml(changes.status.old || '空/Empty') + '</span>'
        + ' <span style="color:#999;font-size:1.1em;">→</span> '
        + '<span style="color:#2c3e50;font-weight:600;">' + escapeHtml(changes.status.new) + '</span>'
        + '</div>';
    }

    if (changes.milestonesReplace && Array.isArray(changes.milestonesReplace)) {
      let rows = '';
      changes.milestonesReplace.forEach(function(ms, i) {
        rows += '<tr style="background-color:' + (i % 2 === 0 ? '#fff5f5' : '#ffffff') + ';">';
        rows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-weight:500;color:#2c3e50;">' + escapeHtml(ms.name) + '</td>';
        rows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-family:monospace;color:#555;">' + escapeHtml(ms.planned || 'NA') + '</td>';
        rows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;font-family:monospace;color:#555;">' + escapeHtml(fmtDate(ms.actual) || '未完成/Pending') + '</td>';
        rows += '<td style="padding:8px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;">' + escapeHtml(ms.owner || '') + '</td>';
        rows += '</tr>';
      });
      sectionsHtml += '<h3 style="color:#E60012;border-bottom:2px solid #E60012;padding-bottom:8px;margin:16px 0 12px;">里程碑结构已更新 / Milestone Structure Updated</h3>'
        + '<div style="overflow-x:auto;">'
        + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
        + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
        + '<th style="padding:12px;text-align:left;">里程碑 / Milestone</th>'
        + '<th style="padding:12px;text-align:left;">计划日期 / Planned</th>'
        + '<th style="padding:12px;text-align:left;">实际完成 / Actual</th>'
        + '<th style="padding:12px;text-align:left;">责任人 / Owner</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    if (changes.milestones && changes.milestones.length > 0) {
      let rows = '';
      changes.milestones.forEach(function(ms, i) {
        var isFutureDate = false;
        var nd = ms.new;
        if (nd && nd !== '空/Empty' && nd !== 'NA' && nd > today) isFutureDate = true;
        rows += '<tr style="background-color:' + (i % 2 === 0 ? '#fff5f5' : '#ffffff') + ';">'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;font-weight:500;">' + escapeHtml(ms.name) + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#777;font-family:monospace;">' + escapeHtml(fmtDate(ms.old) || '空/Empty') + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;font-family:monospace;font-weight:600;">'
          + escapeHtml(fmtDate(ms.new) || '空/Empty')
          + (isFutureDate ? ' &nbsp;<span style="background:#fff3cd;color:#856404;font-size:11px;padding:2px 6px;border-radius:3px;">⚠️ 计划时间推迟 / Planned Delayed</span>' : '')
          + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;">' + escapeHtml(ms.owner || '') + '</td>'
          + '</tr>';
      });
      sectionsHtml += '<h3 style="color:#E60012;border-bottom:2px solid #E60012;padding-bottom:8px;margin:16px 0 12px;">里程碑实际完成日期更新 / Milestone Actual Date Update</h3>'
        + '<div style="overflow-x:auto;">'
        + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
        + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
        + '<th style="padding:12px;text-align:left;font-weight:600;">里程碑 / Milestone</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">原日期 / Old</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">新日期 / New</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">责任人 / Owner</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    if (changes.plannedDates && changes.plannedDates.length > 0) {
      let rows = '';
      changes.plannedDates.forEach(function(pd, i) {
        rows += '<tr style="background-color:' + (i % 2 === 0 ? '#fff5f5' : '#ffffff') + ';">'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;font-weight:500;">' + escapeHtml(pd.name) + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#777;font-family:monospace;">' + escapeHtml(pd.old || 'NA') + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;font-family:monospace;font-weight:600;">' + escapeHtml(pd.new) + '</td>'
          + '<td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#2c3e50;">' + escapeHtml(pd.owner || '') + '</td>'
          + '</tr>';
      });
      // Check for future planned dates and add warning
      var hasFuturePlanned = changes.plannedDates.some(function(pd) {
        var nd = pd.new;
        return nd && nd !== 'NA' && nd > today;
      });
      if (hasFuturePlanned) {
        rows += '<tr><td colspan="4" style="padding:8px 12px;background:#fff3cd;color:#856404;font-size:12px;">'
          + '⚠️ <strong>计划时间推迟 / Planned Delayed</strong> — '
          + '部分里程碑的新计划日期晚于当前日期。<br>'
          + '<span style="font-size:11px;opacity:0.8;">Some milestones have new planned dates later than today. Plan may be delayed.</span>'
          + '</td></tr>';
      }
      sectionsHtml += '<h3 style="color:#E60012;border-bottom:2px solid #E60012;padding-bottom:8px;margin:16px 0 12px;">里程碑计划日期变更 / Planned Date Change</h3>'
        + '<div style="overflow-x:auto;">'
        + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
        + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
        + '<th style="padding:12px;text-align:left;font-weight:600;">里程碑 / Milestone</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">原计划 / Old</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">新计划 / New</th>'
        + '<th style="padding:12px;text-align:left;font-weight:600;">责任人 / Owner</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    const htmlBody = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:#fff0f0;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;border-left:5px solid #E60012;">'
      + '<h2 style="color:#E60012;text-align:center;margin-bottom:20px;border-bottom:3px solid #E60012;padding-bottom:10px;">'
      + '【项目更新通知】项目跟进<br><span style="font-size:0.8em;">Project Update Notification - Project Tracking</span></h2>'
      + '<p style="font-size:15px;line-height:1.6;color:#c0392b;">（' + today + '）以下项目数据已更新：<br>'
      + '<span style="font-size:0.9em;opacity:0.85;">The following project data has been updated:</span></p>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;">'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">'
      + '<tr><td style="padding:8px 12px;width:140px;font-weight:600;color:#555;">项目 / Project</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(projectName) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">编辑人 / Editor</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(editorName) + '</td></tr>'
      + '</table>'
      + sectionsHtml
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:20px;text-align:center;">'
      + '<p style="margin-bottom:12px;"><a href="' + webPage + '?v=ProjectTracking" style="background:#E60012;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">点击查看项目跟进 / View Project Tracking</a></p>'
      + '<p style="margin:0;font-size:12px;color:#999;font-style:italic;">此邮件由系统自动发送，请勿回复。<br><span style="font-size:0.9em;">Auto-sent by system, please do not reply.</span></p>'
      + '</div></div>';

    const mailOptions = { htmlBody: htmlBody };
    if (ccFiltered.length > 0) mailOptions.cc = ccFiltered.join(',');
    GmailApp.sendEmail(toEmail, subject, '', mailOptions);
    console.log('项目更新通知已发送 / Project update notification sent — To: ' + toEmail + (ccFiltered.length > 0 ? ', CC: ' + ccFiltered.join(',') : ''));
  } catch (e) {
    console.error('sendProjectUpdateNotification error: ' + e);
  }
}

/**
 * 检查当前用户是否为项目跟进管理员
 * Check if current user is project tracking admin
 * @param {string} userName - 用户姓名
 * @returns {string} JSON string {isAdmin: bool, userLevel: string}
 */
function checkProjectPermission(userName) {
  try {
    const ws = SpreadsheetApp.openById('1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM').getSheetByName('userID');
    if (!ws) return JSON.stringify({ isAdmin: false, userLevel: '普通用户 / User' });
    const vals = ws.getDataRange().getValues();
    for (let i = 2; i < vals.length; i++) {
      const name = String(vals[i][1] || '').trim();
      if (name === userName) {
        const perm = String(vals[i][PROJECT_PERMISSION_COL] || '').trim();
        if (perm === '管理员') {
          return JSON.stringify({ isAdmin: true, userLevel: '管理员 / Admin' });
        }
        break;
      }
    }
    return JSON.stringify({ isAdmin: false, userLevel: '普通用户 / User' });
  } catch (e) {
    return JSON.stringify({ isAdmin: false, userLevel: '普通用户 / User' });
  }
}

/**
 * 获取指定项目的计划日期变更历史
 * Get planned date change history for a project
 * @param {string} projectName - 项目名称
 * @returns {string} JSON array
 */
function getPlannedDateHistory(projectName) {
  try {
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
    if (!ws) return JSON.stringify([]);
    const data = ws.getDataRange().getValues();
    if (data.length < 2) return JSON.stringify([]);
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[0] || '').trim() === projectName) {
        rows.push({
          projectName: row[0],
          milestone: row[1],
          oldDate: row[2] instanceof Date ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[2] || ''),
          newDate: row[3] instanceof Date ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[3] || ''),
          editor: row[4],
          modifiedTime: row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(row[5] || ''),
          note: row[6]
        });
      }
    }
    rows.reverse();
    return JSON.stringify(rows);
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/**
 * 获取所有项目的计划日期变更历史摘要（用于前端判断是否显示历史图标）
 * Get summary map of which milestones have planned date change history
 * @returns {string} JSON object keyed by "ProjectName::MilestoneName"
 */
function getPlannedDateHistorySummary() {
  try {
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
    if (!ws) return JSON.stringify({});
    const data = ws.getDataRange().getValues();
    if (data.length < 2) return JSON.stringify({});
    const historyMap = {};
    for (let i = 1; i < data.length; i++) {
      const pn = String(data[i][0] || '').trim();
      const mn = String(data[i][1] || '').trim();
      if (pn && mn) {
        historyMap[pn + '::' + mn] = true;
      }
    }
    return JSON.stringify(historyMap);
  } catch (e) {
    return JSON.stringify({});
  }
}

/**
 * 获取用户列表（姓名 + 邮箱）
 * Get user list for dropdowns
 * @returns {string} JSON string
 */
function getUserList() {
  try {
    const ws = SpreadsheetApp.openById('1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM').getSheetByName('userID');
    if (!ws) return JSON.stringify([]);
    const vals = ws.getDataRange().getValues();
    const users = [];
    for (let i = 2; i < vals.length; i++) {
      const name  = String(vals[i][1]  || '').trim();
      const email = String(vals[i][9]  || '').trim();
      if (name && name !== 'NAME') {
        users.push({
          name: name,
          email: email,
          display: email ? name + ' (' + email + ')' : name
        });
      }
    }
    return JSON.stringify(users);
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  }
}

// ==================== INJ SDM 问题汇总 ====================
const INJ_SDM_SS_ID = '1mOG7PAJX7AdPioJJdSJAmgxjOt2S2NGTIV6SVLtkrH8';
const INJ_SDM_SHEET_NAME = 'MasterData';
const INJ_SDM_ADMIN_COL = 59; // BH：复用项目跟进管理员权限

function normalizeINJSDMProcess_(value) {
  const process = String(value || '').trim().toUpperCase();
  return process === 'IM' ? 'INJ' : process;
}

function getINJSDMPermission_(userName, userEmail) {
  const result = { hasPermission: false, userName: '', userEmail: '' };
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return result;
    const values = ws.getDataRange().getValues();
    const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    const requestedEmail = String(userEmail || '').trim().toLowerCase();
    const requestedName = String(userName || '').trim();

    for (let i = 2; i < values.length; i++) {
      const rowName = String(values[i][1] || '').trim();
      const rowEmail = String(values[i][9] || '').trim().toLowerCase();
      const rowProcess = normalizeINJSDMProcess_(values[i][14]);
      const adminPermission = String(values[i][INJ_SDM_ADMIN_COL] || '').trim();
      const identityMatched =
        (activeEmail && rowEmail === activeEmail) ||
        (requestedEmail && rowEmail === requestedEmail) ||
        (!activeEmail && requestedName && rowName === requestedName);

      if (identityMatched && rowProcess === 'INJ' && adminPermission === '管理员') {
        result.hasPermission = true;
        result.userName = rowName;
        result.userEmail = rowEmail;
        return result;
      }
    }
  } catch (e) {
    console.error('getINJSDMPermission_ error: ' + e);
  }
  return result;
}

function checkINJSDMPermission(userName, userEmail) {
  return JSON.stringify(getINJSDMPermission_(userName, userEmail));
}

function getINJSCUsers_() {
  const users = [];
  const seen = {};
  const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
  if (!ws) return users;
  const values = ws.getDataRange().getValues();
  for (let i = 2; i < values.length; i++) {
    const name = String(values[i][1] || '').trim();
    const email = String(values[i][9] || '').trim();
    const process = normalizeINJSDMProcess_(values[i][14]);
    const position = String(values[i][15] || '').trim().toUpperCase();
    if (name && process === 'INJ' && position === 'S&C' && !seen[name]) {
      seen[name] = true;
      users.push({ name: name, email: email });
    }
  }
  return users.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
}

// ============================================================
//  任务安排模块 - 权限 / Task Arrangement - Permission
// ============================================================

function getEDSTaskPermission_(userName) {
  const result = { permission: "", sapID: "", name: "", workshop: "", process: "", shift: "" };
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return result;
    const values = ws.getDataRange().getValues();
    const requestedName = String(userName || '').trim();
    for (let i = 2; i < values.length; i++) {
      const rowName = String(values[i][1] || '').trim();
      if (rowName && rowName === requestedName) {
        const perm = String(values[i][TASK_PERMISSION_COL] || '').trim();
        if (perm) {
          result.permission = perm;
          result.sapID = String(values[i][0] || '').trim();
          result.name = rowName;
          result.workshop = String(values[i][13] || '').trim();
          result.process = String(values[i][14] || '').trim();
          result.shift = String(values[i][50] || '').trim(); // AY col = 班次
          return result;
        }
      }
    }
    // Fallback: match by Session email
    const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (activeEmail && !result.permission) {
      for (let i = 2; i < values.length; i++) {
        const rowEmail = String(values[i][9] || '').trim().toLowerCase();
        if (rowEmail === activeEmail) {
          const perm = String(values[i][TASK_PERMISSION_COL] || '').trim();
          if (perm) {
            result.permission = perm;
            result.sapID = String(values[i][0] || '').trim();
            result.name = String(values[i][1] || '').trim();
            result.workshop = String(values[i][13] || '').trim();
            result.process = String(values[i][14] || '').trim();
            result.shift = String(values[i][50] || '').trim();
            return result;
          }
        }
      }
    }
  } catch (e) { console.error('getEDSTaskPermission_ error: ' + e); }
  return result;
}

function checkEDSTaskPermission(userName, userEmail) {
  return JSON.stringify(getEDSTaskPermission_(userName));
}

// ============================================================
//  任务安排模块 - ID 生成器 / Task Arrangement - ID Generators
// ============================================================

function generateTaskID_() {
  const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TASKS_SHEET);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return "TASK-" + today + "-0001";
  const data = ws.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxSeq = 0;
  const prefix = "TASK-" + today + "-";
  for (let i = 0; i < data.length; i++) {
    const id = String(data[i][0] || '');
    if (id.indexOf(prefix) === 0) {
      const seq = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return prefix + Utilities.formatString("%04d", maxSeq + 1);
}

function generateTemplateID_() {
  const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TEMPLATES_SHEET);
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return "TMPL-001";
  const data = ws.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxSeq = 0;
  for (let i = 0; i < data.length; i++) {
    const id = String(data[i][0] || '');
    if (id.indexOf("TMPL-") === 0) {
      const seq = parseInt(id.substring(5), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return "TMPL-" + Utilities.formatString("%03d", maxSeq + 1);
}

function generateLogID_() {
  const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_LOGS_SHEET);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return "LOG-" + today + "-0001";
  const data = ws.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxSeq = 0;
  const prefix = "LOG-" + today + "-";
  for (let i = 0; i < data.length; i++) {
    const id = String(data[i][0] || '');
    if (id.indexOf(prefix) === 0) {
      const seq = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return prefix + Utilities.formatString("%04d", maxSeq + 1);
}

// ============================================================
//  任务安排模块 - 日志 / Task Arrangement - Logging
// ============================================================

function writeTaskLog_(action, targetType, targetID, beforeJSON, afterJSON, operatorSAPID, operatorName) {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_LOGS_SHEET);
    if (!ws) return;
    const logID = generateLogID_();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.appendRow([logID, action, targetType, targetID, beforeJSON || '', afterJSON || '', operatorSAPID, operatorName, now]);
  } catch (e) {
    console.error('writeTaskLog_ error: ' + e);
  }
}

// ============================================================
//  任务安排模块 - 辅助函数 / Task Arrangement - Helpers
// ============================================================

function loadUserListForSelect() {
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return JSON.stringify([]);
    const values = ws.getDataRange().getValues();
    const users = [];
    for (let i = 2; i < values.length; i++) {
      const sapID = String(values[i][0] || '').trim();
      const name = String(values[i][1] || '').trim();
      if (sapID && name) {
        users.push({ id: sapID, text: name + ' (' + sapID + ')' });
      }
    }
    return JSON.stringify(users);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

// 人员姓名→SAPID 映射（全局缓存，2小时有效，多个函数复用）
// sapID → 人名 反向映射（与 getNameToSapMap_ 互补，共用同一缓存键）
function getSapToNameMap_() {
  try {
    var nameToSap = getNameToSapMap_();
    var map = {};
    Object.keys(nameToSap).forEach(function (name) {
      var sid = nameToSap[name];
      if (sid && !map[sid]) map[sid] = name;
    });
    return map;
  } catch (e) {
    console.error('getSapToNameMap_ error: ' + e.message);
    return {};
  }
}

function getNameToSapMap_() {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'NameToSapMap';
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);

    var userWs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    var map = {};
    if (userWs) {
      var vals = userWs.getDataRange().getValues();
      for (var i = 2; i < vals.length; i++) {
        var nm = String(vals[i][1] || '').trim();
        var sid = String(vals[i][0] || '').trim();
        if (nm && sid) map[nm] = sid;
      }
    }
    try { cache.put(key, JSON.stringify(map), 7200); } catch (e) { /* 静默跳过 */ }
    return map;
  } catch (e) {
    console.error('getNameToSapMap_ error: ' + e.message);
    return {}; // fallback: empty map, owners will show as SAP IDs
  }
}

function loadTodayStaffForSelect(dateStr) {
  try {
    // 人员列表缓存（按天，30分钟有效）
    var staffCache = CacheService.getScriptCache();
    var staffCacheKey = 'StaffSelect_v2_' + Utilities.formatDate(new Date(), 'Asia/Shanghai', 'yyyyMMdd');
    var staffCached = staffCache.get(staffCacheKey);
    if (staffCached) return staffCached;
    // 优先从 AttendanceSync 读取当天在岗人员
    let staffResult = JSON.parse(loadAttendanceSync(dateStr));
    let staff = staffResult.success ? staffResult.data : [];
    const seen = {};
    const users = [];
    // Fallback 1: IM 排班主数据
    if (staff.length === 0) {
      staffResult = JSON.parse(loadIMStaffByDate(dateStr));
      staff = staffResult.success ? staffResult.data : [];
    }
    staff.forEach(function (s) {
      const sapID = s.sapID || s.name;
      if (sapID && !seen[sapID]) {
        seen[sapID] = true;
        const uid = s.name ? s.name + '|' + sapID : sapID;
        users.push({ id: uid, text: (s.name || sapID) + (s.workshop ? ' [' + s.workshop + ']' : '') });
      }
    });
    var result = JSON.stringify(users);
    try { staffCache.put(staffCacheKey, result, 1800); } catch (e) { /* 静默跳过 */ }
    return result;
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function loadUserProcessMap() {
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return JSON.stringify({});
    const values = ws.getDataRange().getValues();
    const map = {};
    for (let i = 2; i < values.length; i++) {
      const sapID = String(values[i][0] || '').trim();
      const process = String(values[i][14] || '').trim();
      if (sapID) map[sapID] = process;
    }
    return JSON.stringify(map);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function getAttendanceOptions() {
  return JSON.stringify(["在岗", "休息", "请假", "外出", "培训"]);
}

function getWorkRoleOptions() {
  return JSON.stringify(["设备", "模具", "SAP", "点检", "其他"]);
}

function getShiftOptions() {
  return JSON.stringify(["白班", "中班", "夜班"]);
}

function loadTaskConfig() {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_CONFIG_SHEET);
    if (!ws) return JSON.stringify({});
    const data = ws.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim();
      if (key) config[key] = String(data[i][1] || '').trim();
    }
    return JSON.stringify(config);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function loadTaskLogs(targetType, targetID) {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_LOGS_SHEET);
    if (!ws) return JSON.stringify([]);
    const data = ws.getDataRange().getValues();
    const logs = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2] || '') === targetType && String(data[i][3] || '') === targetID) {
        logs.push({
          logID: data[i][0], action: data[i][1], targetType: data[i][2],
          targetID: data[i][3], beforeValue: data[i][4], afterValue: data[i][5],
          operatorSAPID: data[i][6], operatorName: data[i][7], createdAt: data[i][8]
        });
      }
    }
    return JSON.stringify(logs);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

// ============================================================
//  任务安排模块 - 人员排班 CRUD / Task Arrangement - Staff CRUD
// ============================================================

/**
 * 从 AttendanceSync sheet 读取指定日期的出勤数据（优先数据源）
 * 返回格式与 loadIMStaffByDate 兼容
 */
function loadAttendanceSync(dateStr) {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName("AttendanceSync");
    if (!ws) return JSON.stringify({ success: true, data: [] });

    const lastRow = ws.getLastRow();
    if (lastRow <= 1) return JSON.stringify({ success: true, data: [] });

    const data = ws.getRange(2, 1, lastRow - 1, 11).getValues();
    const result = [];

    for (let i = 0; i < data.length; i++) {
      const rowDate = data[i][0] instanceof Date
        ? Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : String(data[i][0] || "").trim();
      if (rowDate !== dateStr) continue;

      result.push({
        sapID: String(data[i][1] || "").trim(),
        name: String(data[i][2] || "").trim(),
        process: String(data[i][3] || "").trim(),
        workshop: String(data[i][5] || "").trim(),
        shift: String(data[i][6] || "").trim(),
        hours: parseFloat(data[i][7]) || 0,
        attendanceStatus: String(data[i][8] || "").trim() || "在岗",
        workRole: String(data[i][3] || "").trim(),
        team: String(data[i][4] || "").trim()
      });
    }

    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function loadTasks(filterJSON) {
  try {
    const filter = typeof filterJSON === 'string' ? JSON.parse(filterJSON) : (filterJSON || {});

    // 缓存：按小时缓存手动任务列表（forceRefresh 时跳过缓存）
    var cache = CacheService.getScriptCache();
    var cacheKey = 'TaskList_Manual_v2_' + Utilities.formatDate(new Date(), 'Asia/Shanghai', 'yyyyMMddHH');
    if (!filter._forceRefresh) {
      var cached = cache.get(cacheKey);
      if (cached) return cached;
    }
    const tasksWs = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TASKS_SHEET);
    const membersWs = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_MEMBERS_SHEET);
    if (!tasksWs) return JSON.stringify({ success: true, data: [] });
    const taskData = tasksWs.getDataRange().getValues();
    const memberData = membersWs ? membersWs.getDataRange().getValues() : [];
    // Build member lookup: TaskID -> { owners: [...], collaborators: [...], ownerNames: [...], collaboratorNames: [...] }
    const memberMap = {};
    for (let i = 1; i < memberData.length; i++) {
      const taskID = String(memberData[i][1] || '').trim();
      if (!taskID) continue;
      if (!memberMap[taskID]) memberMap[taskID] = { owners: [], collaborators: [], ownerNames: [], collaboratorNames: [] };
      const rawId = String(memberData[i][2] || '').trim();
      // Parse "Name|SAPID" format (backward-compat: bare "SAPID" → resolve name below)
      const pipeIdx = rawId.indexOf('|');
      const memberName = pipeIdx > 0 ? rawId.substring(0, pipeIdx) : '';
      const sapID = pipeIdx > 0 ? rawId.substring(pipeIdx + 1) : rawId;
      const role = String(memberData[i][3] || '').trim();
      if (role === 'owner') {
        memberMap[taskID].owners.push(sapID);
        memberMap[taskID].ownerNames.push(memberName || null); // placeholder for resolve below
      } else if (role === 'collaborator') {
        memberMap[taskID].collaborators.push(sapID);
        memberMap[taskID].collaboratorNames.push(memberName || null);
      }
    }

    // Resolve bare SAP IDs to names for backward-compatible display
    var sapToName = null;
    Object.keys(memberMap).forEach(function (tid) {
      var m = memberMap[tid];
      // Resolve ownerNames
      for (var j = 0; j < m.ownerNames.length; j++) {
        if (!m.ownerNames[j]) {
          if (!sapToName) sapToName = getSapToNameMap_();
          m.ownerNames[j] = sapToName[m.owners[j]] || '';
        }
      }
      m.ownerNames = m.ownerNames.filter(Boolean);
      // Resolve collaboratorNames
      for (var k = 0; k < m.collaboratorNames.length; k++) {
        if (!m.collaboratorNames[k]) {
          if (!sapToName) sapToName = getSapToNameMap_();
          m.collaboratorNames[k] = sapToName[m.collaborators[k]] || '';
        }
      }
      m.collaboratorNames = m.collaboratorNames.filter(Boolean);
    });

    const result = [];
    for (let i = 1; i < taskData.length; i++) {
      const taskID = String(taskData[i][0] || '').trim();
      if (!taskID) continue;
      const status = String(taskData[i][5] || '').trim();
      const dueDateRaw = taskData[i][7];
      const dueDate = dueDateRaw instanceof Date
        ? Utilities.formatDate(dueDateRaw, Session.getScriptTimeZone(), "yyyy-MM-dd")
        : String(dueDateRaw || '');
      // Apply filters
      if (filter.status) {
        if (status !== filter.status) continue;
        // "未开始" only if within planned window (not overdue)
        if (filter.status === '未开始' && dueDate && dueDate < Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')) continue;
      }
      if (filter.process) {
        const taskProcess = String(taskData[i][14] || '').trim(); // Column O = process (new field)
        // INJ = IM equivalence
        const pc = taskProcess.toUpperCase();
        if (filter.process === 'INJ') { if (pc !== 'INJ' && pc !== 'IM') continue; }
        else if (pc !== filter.process) continue;
      }
      if (filter.search) {
        const title = String(taskData[i][1] || '').toLowerCase();
        const desc = String(taskData[i][2] || '').toLowerCase();
        const q = filter.search.toLowerCase();
        if (title.indexOf(q) === -1 && desc.indexOf(q) === -1 && taskID.toLowerCase().indexOf(q) === -1) continue;
      }
      if (filter.dateFrom && dueDate && dueDate < filter.dateFrom) continue;
      if (filter.dateTo && dueDate && dueDate > filter.dateTo) continue;
      // Owner filter
      if (filter.ownerSAPID) {
        const mems = memberMap[taskID];
        const allMembers = (mems ? mems.owners.concat(mems.collaborators) : []);
        if (allMembers.indexOf(filter.ownerSAPID) === -1) continue;
      }
      const mems = memberMap[taskID] || { owners: [], collaborators: [], ownerNames: [], collaboratorNames: [] };
      result.push({
        taskID: taskID,
        title: String(taskData[i][1] || ''),
        description: String(taskData[i][2] || ''),
        taskType: String(taskData[i][3] || ''),
        priority: String(taskData[i][4] || ''),
        status: status,
        planStartDate: taskData[i][6] instanceof Date
          ? Utilities.formatDate(taskData[i][6], Session.getScriptTimeZone(), "yyyy-MM-dd")
          : String(taskData[i][6] || ''),
        dueDate: dueDate,
        completedAt: taskData[i][8] instanceof Date
          ? Utilities.formatDate(taskData[i][8], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
          : String(taskData[i][8] || ''),
        createdBy: String(taskData[i][9] || ''),
        closedBy: String(taskData[i][10] || ''),
        remark: String(taskData[i][11] || ''),
        process: String(taskData[i][14] || ''),
        owners: mems.owners,
        collaborators: mems.collaborators,
        ownerNames: mems.ownerNames || [],
        collaboratorNames: mems.collaboratorNames || [],
        createdAt: String(taskData[i][12] || ''),
        updatedAt: String(taskData[i][13] || '')
      });
    }
    // Sort by priority (高 first) then due date
    const priorityOrder = { '高': 0, '中': 1, '低': 2 };
    result.sort(function (a, b) {
      const pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 3;
      const pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 3;
      if (pa !== pb) return pa - pb;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
    const jsonResult = JSON.stringify({ success: true, data: result });
    try { cache.put(cacheKey, jsonResult, 300); } catch (e) { /* 静默跳过 */ }
    return jsonResult;
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

// Load all PM tasks for task list — read sheets once, filter in memory
function loadAllPMTasks(filterJSON) {
  try {
    var filter = typeof filterJSON === 'string' ? JSON.parse(filterJSON) : (filterJSON || {});

    // 缓存：按天缓存PM任务列表（数据量大，forceRefresh 时跳过缓存）
    var cache = CacheService.getScriptCache();
    var cacheKey = 'TaskList_PM_v2_' + Utilities.formatDate(new Date(), 'Asia/Shanghai', 'yyyyMMdd');
    if (!filter._forceRefresh) {
      var cached = cache.get(cacheKey);
      if (cached) return cached;
    }
    var ss = SpreadsheetApp.openById('1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4');
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    var cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // 复用全局缓存的 name→SAPID 映射（避免重复读用户权限表）
    var nameToSap = getNameToSapMap_();

    function addDays_(d, n) {
      if (n <= 0) return d;
      var p = d.split('-');
      var dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      dt.setDate(dt.getDate() + n);
      return Utilities.formatDate(dt, 'Asia/Shanghai', 'yyyy-MM-dd');
    }

    // Step 1: Read Total PM Plan List once → build taskMap
    var taskMap = {};
    var planWs = ss.getSheetByName('Total PM Plan List');
    if (planWs) {
      var planData = planWs.getDataRange().getValues();
      for (var i = 1; i < planData.length; i++) {
        var planDate = normalizeDate_(planData[i][4]);
        var planHours = parseFloat(String(planData[i][7] || '0'));
        var durationDays = Math.max(1, Math.ceil(planHours / 24));
        var planEndDate = addDays_(planDate, durationDays - 1);
        if (planDate < cutoffStr) continue;
        var aem = String(planData[i][6] || '').trim();
        if (!aem) continue;
        var pmType = String(planData[i][8] || '').trim();
        if (!pmType) continue; // 跳过保养类型为空的条目（模具保养停机申请，机器不做保养）
        var key = planDate + '_' + aem;
        if (taskMap[key]) continue;
        taskMap[key] = {
          taskID: 'PM-' + aem + '-' + planDate.replace(/-/g, ''),
          title: 'PM: ' + aem + ' - ' + pmType,
          description: '工时: ' + planHours + 'h | 机型: ' + String(planData[i][9] || '').trim() + ' | 计划中 / Planned',
          taskType: '保养', priority: '中', status: '未开始',
          planStartDate: planDate, dueDate: planEndDate,
          owners: [], collaborators: [], ownerNames: [],
          process: String(planData[i][3] || '').trim(),
          workshop: String(planData[i][2] || '').trim(),
          createdBy: 'PM Plan', remark: '源自保养计划 / From PM Plan'
        };
      }
    }

    // Step 2: PM_Records overlay once
    var recordsWs = ss.getSheetByName('PM_Records');
    if (recordsWs) {
      var recordsData = recordsWs.getDataRange().getValues();
      for (var i = 1; i < recordsData.length; i++) {
        var pmNo = String(recordsData[i][0] || '').trim();
        var status = String(recordsData[i][1] || '').trim();
        var people = String(recordsData[i][3] || '').trim();
        var workcenter = String(recordsData[i][9] || '').trim();
        if (!pmNo || !workcenter) continue;
        var recPlanDate = normalizeDate_(recordsData[i][4]);
        var key = recPlanDate + '_' + workcenter;
        var existing = taskMap[key];
        if (!existing) continue;
        var s = status.toLowerCase();
        if (s.indexOf('ongoing') !== -1 || s.indexOf('进行中') !== -1) existing.status = '进行中';
        else if (s.indexOf('done') !== -1 || s.indexOf('已完成') !== -1 || s.indexOf('finished') !== -1) existing.status = '已完成';
        var oNames = people.split('/').map(function (n) { return n.trim(); }).filter(Boolean);
        existing.owners = oNames.map(function (n) { return nameToSap[n] || n; });
        existing.ownerNames = oNames;
        var endDate = normalizeDate_(recordsData[i][7]);
        if (endDate) existing.dueDate = endDate;
        existing.description = '总任务: ' + String(recordsData[i][11] || '').trim() + ' | 未完成: ' + String(recordsData[i][13] || '').trim() + ' | 状态: ' + status;
        existing.createdBy = 'PM Module';
        existing.remark = 'PM No: ' + pmNo;
      }
    }

    var allPM = Object.values(taskMap);
    // Mark overdue FIRST (before filters)
    allPM.forEach(function (t) {
      if (t.status === '未开始' && t.dueDate && t.dueDate < today) t.status = '已超期';
    });
    // Apply filters
    if (filter.status) {
      allPM = allPM.filter(function (t) { return t.status === filter.status; });
    }
    if (filter.process) {
      allPM = allPM.filter(function (t) {
        var pc = (t.process || '').toUpperCase();
        if (filter.process === 'INJ') return pc === 'INJ' || pc === 'IM';
        return pc === filter.process;
      });
    }
    if (filter.search) {
      var q = filter.search.toLowerCase();
      allPM = allPM.filter(function (t) {
        return (t.title || '').toLowerCase().indexOf(q) >= 0
          || (t.description || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    var jsonResult = JSON.stringify({ success: true, data: allPM });
    try { cache.put(cacheKey, jsonResult, 300); } catch (e) { /* 缓存过大时静默跳过 */ }
    return jsonResult;
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

// 合并任务列表加载：手动任务 + PM 任务 一次调用返回，服务端去重
// forceRefresh: 跳过缓存，强制从 Sheet 重新读取（创建/编辑任务后使用）
function loadAllTasksForList(forceRefresh) {
  try {
    // 复用各自的缓存（forceRefresh 时传入非空 filter 强制跳过缓存）
    var filter = forceRefresh ? JSON.stringify({ _forceRefresh: true }) : JSON.stringify({});
    var manualResult = JSON.parse(loadTasks(filter));
    var pmResult = JSON.parse(loadAllPMTasks(filter));
    var manualData = manualResult.success ? manualResult.data : [];
    var pmData = pmResult.success ? pmResult.data : [];

    console.log('loadAllTasksForList: manual=' + manualData.length + ' tasks, pm=' + pmData.length + ' tasks, forceRefresh=' + !!forceRefresh);
    if (!pmResult.success) {
      console.error('loadAllPMTasks failed: ' + (pmResult.message || 'unknown'));
    }

    // 服务端去重（PM taskID 优先）
    var seen = {};
    pmData.forEach(function (t) { seen[t.taskID] = true; });
    var merged = pmData.concat(manualData.filter(function (t) { return !seen[t.taskID]; }));

    console.log('loadAllTasksForList: merged=' + merged.length + ' tasks');
    return JSON.stringify({ success: true, manual: manualData, pm: pmData, merged: merged });
  } catch (e) {
    console.error('loadAllTasksForList error: ' + e.message);
    return JSON.stringify({ success: false, message: e.message });
  }
}

function loadIMStaffByDate(dateStr) {
  try {
    // Convert yyyy-MM-dd to yyyy.MM.dd
    const parts = dateStr.split('-');
    const datePrefix = parts[0] + '.' + parts[1] + '.' + parts[2];
    const ws = SpreadsheetApp.openById(IM_SCHEDULING_SS_ID).getSheetByName(IM_SCHEDULING_SHEET);
    if (!ws) return JSON.stringify({ success: true, data: [] });
    const data = ws.getDataRange().getValues();
    // Build name→SAPID map from userID
    const userWs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    const nameToSap = {};
    if (userWs) {
      const userVals = userWs.getDataRange().getValues();
      for (let i = 2; i < userVals.length; i++) {
        const name = String(userVals[i][1] || '').trim();
        const sapID = String(userVals[i][0] || '').trim();
        if (name && sapID) nameToSap[name] = sapID;
      }
    }
    // Shift mapping: 1夜→夜班, 2早→早班, 3中→中班
    const shiftMap = { '1夜': '夜班', '2早': '早班', '3中': '中班' };
    const result = [];
    for (let i = 1; i < data.length; i++) {
      const dateShift = String(data[i][0] || '');
      if (dateShift.indexOf(datePrefix) === 0) {
        const workshop = String(data[i][1] || '').trim();
        const name = String(data[i][3] || '').trim();
        const hours = String(data[i][4] || '').trim();
        // Parse shift from dateShift string: "2026.06.25_1夜" → "1夜"
        const shiftPart = dateShift.substring(datePrefix.length + 1); // skip "2026.06.25_"
        const shift = shiftMap[shiftPart] || shiftPart;
        const sapID = nameToSap[name] || '';
        if (name) {
          result.push({
            sapID: sapID,
            name: name,
            workshop: workshop,
            attendanceStatus: '在岗',
            workRole: workshop === 'TB1' ? 'TB1' : 'TB2',
            shift: shift,
            hours: hours
          });
        }
      }
    }
    // Deduplicate by name (same person might appear multiple times)
    const seen = {};
    const unique = [];
    result.forEach(function (r) {
      if (!seen[r.name]) { seen[r.name] = true; unique.push(r); }
    });
    return JSON.stringify({ success: true, data: unique });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function normalizeDate_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  // Handle string formats: "2026-1-5", "2026.01.05", "2026/01/05", "2026-01-05"
  let s = String(val).trim();
  // Remove time portion
  const spaceIdx = s.indexOf(' ');
  if (spaceIdx > 0) s = s.substring(0, spaceIdx);
  // Split on common separators
  const parts = s.split(/[.\-\/]/);
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (y > 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return Utilities.formatString('%04d-%02d-%02d', y, m, d);
    }
  }
  return s;
}

function loadPMTasksByDate(dateStr) {
  try {
    const ss = SpreadsheetApp.openById('1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4');
    // Build name->SAPID map from userID
    const userWs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    const nameToSap = {};
    if (userWs) {
      const userVals = userWs.getDataRange().getValues();
      for (let i = 2; i < userVals.length; i++) {
        const sapID = String(userVals[i][0] || '').trim();
        const name = String(userVals[i][1] || '').trim();
        if (name && sapID) nameToSap[name] = sapID;
      }
    }

    function addDays_(d, n) {
      if (n <= 0) return d;
      var p = d.split('-');
      var dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      dt.setDate(dt.getDate() + n);
      return Utilities.formatDate(dt, 'Asia/Shanghai', 'yyyy-MM-dd');
    }

    // Step 1: Total PM Plan List -> base, key = PlanDate_AEM#
    const taskMap = {};
    const planWs = ss.getSheetByName('Total PM Plan List');
    if (planWs) {
      const planData = planWs.getDataRange().getValues();
      for (let i = 1; i < planData.length; i++) {
        const planDate = normalizeDate_(planData[i][4]); // E: 开始日期
        const planHours = parseFloat(String(planData[i][7] || '0')); // H: 保养时间
        const durationDays = Math.max(1, Math.ceil(planHours / 24));
        const planEndDate = addDays_(planDate, durationDays - 1);
        if (dateStr < planDate) continue;
        if (addDays_(planEndDate, 90) < dateStr) continue; // Skip tasks >90 days overdue
        const aem = String(planData[i][6] || '').trim(); // G: AEM#
        if (!aem) continue;
        const key = planDate + '_' + aem;
        if (taskMap[key]) continue;
        const workshop = String(planData[i][2] || '').trim();
        const process = String(planData[i][3] || '').trim();
        const pmType = String(planData[i][8] || '').trim();
        if (!pmType) continue; // 跳过保养类型为空的条目（模具保养停机申请，机器不做保养）
        const machineType = String(planData[i][9] || '').trim();
        taskMap[key] = {
          taskID: 'PM-' + aem + '-' + planDate.replace(/-/g, ''),
          title: 'PM: ' + aem + (workshop ? ' [' + workshop + ']' : '') + ' - ' + pmType,
          description: '工时: ' + planHours + 'h | 机型: ' + machineType + ' | 计划中 / Planned',
          taskType: '保养', priority: '中', status: '未开始',
          planStartDate: planDate, dueDate: planEndDate,
          owners: [], collaborators: [], ownerNames: [],
          process: process, workshop: workshop,
          createdBy: 'PM Plan', remark: '源自保养计划 / From PM Plan'
        };
      }
    }

    // Step 2: PM_Records overlay -> key = PlanPMDate_Workcenter
    const recordsWs = ss.getSheetByName('PM_Records');
    if (recordsWs) {
      const recordsData = recordsWs.getDataRange().getValues();
      for (let i = 1; i < recordsData.length; i++) {
        const pmNo = String(recordsData[i][0] || '').trim();
        const status = String(recordsData[i][1] || '').trim();
        const people = String(recordsData[i][3] || '').trim();
        const workcenter = String(recordsData[i][9] || '').trim();
        if (!pmNo || !workcenter) continue;
        const recPlanDate = normalizeDate_(recordsData[i][4]); // E: Plan PM Date
        const key = recPlanDate + '_' + workcenter;
        const existing = taskMap[key];
        if (!existing) continue;
        const s = status.toLowerCase();
        if (s.indexOf('ongoing') !== -1 || s.indexOf('进行中') !== -1) existing.status = '进行中';
        else if (s.indexOf('done') !== -1 || s.indexOf('已完成') !== -1 || s.indexOf('finished') !== -1) existing.status = '已完成';
        const oNames = people.split('/').map(function (n) { return n.trim(); }).filter(Boolean);
        existing.owners = oNames.map(function (n) { return nameToSap[n] || n; });
        existing.ownerNames = oNames;
        var endDate = normalizeDate_(recordsData[i][7]);
        if (endDate) existing.dueDate = endDate;
        existing.description = '总任务: ' + String(recordsData[i][11] || '').trim() + ' | 未完成: ' + String(recordsData[i][13] || '').trim() + ' | 状态: ' + status;
        existing.createdBy = 'PM Module';
        existing.remark = 'PM No: ' + pmNo;
      }
    }

    // Mark overdue: 未开始 + dueDate < viewing date → 已超期
    Object.values(taskMap).forEach(function (t) {
      if (t.status === '未开始' && t.dueDate && t.dueDate < dateStr) t.status = '已超期';
    });
    return Object.values(taskMap);
  } catch (e) {
    console.error('loadPMTasksByDate error: ' + e);
    return [];
  }
}

function loadTodayDashboardData(date, sapID) {
  try {
    // Load staff from AttendanceSync (优先)
    let staffResult = JSON.parse(loadAttendanceSync(date));
    let staff = staffResult.success ? staffResult.data : [];
    // Fallback 1: IM scheduling master data
    if (staff.length === 0) {
      staffResult = JSON.parse(loadIMStaffByDate(date));
      staff = staffResult.success ? staffResult.data : [];
    }
    // 只保留在岗人员，过滤掉病假/休息/年假等非在岗状态
    staff = staff.filter(function(s) {
      var status = (s.attendanceStatus || '').trim();
      return !status || status === '在岗';
    });
    // Load manual tasks
    const tasksData = JSON.parse(loadTasks(JSON.stringify({})));
    let allTasks = tasksData.success ? tasksData.data : [];
    // Merge PM tasks from PM_Records
    const pmTasks = loadPMTasksByDate(date);
    allTasks = pmTasks.concat(allTasks);
    // Today tasks: status != 已取消 AND in date range (include 已完成)
    const todayTasks = allTasks.filter(function (t) {
      if (t.status === '已取消') return false;
      if (t.planStartDate <= date && t.dueDate >= date) return true;
      return false;
    });
    // Overdue tasks: dueDate < today AND status != 已完成/已取消
    const overdueTasks = allTasks.filter(function (t) {
      if (t.status === '已完成' || t.status === '已取消') return false;
      return t.dueDate && t.dueDate < date;
    });
    // My tasks: owner or collaborator, exclude cancelled only
    const myTasks = allTasks.filter(function (t) {
      if (t.status === '已取消') return false;
      return t.owners.indexOf(sapID) !== -1 || t.collaborators.indexOf(sapID) !== -1;
    });
    return JSON.stringify({
      success: true,
      data: {
        staff: staff,
        todayTasks: todayTasks,
        overdueTasks: overdueTasks,
        myTasks: myTasks
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function addDaysYMD_(dateStr, days) {
  const parts = String(dateStr || '').split('-');
  const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  dt.setDate(dt.getDate() + days);
  return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getResourceGroupDefs_() {
  return [
    { key: 'mold', name: '模具组', en: 'Mold Team' },
    { key: 'tb1', name: 'TB1工序', en: 'TB1 Process' },
    { key: 'tb2', name: 'TB2工序', en: 'TB2 Process' },
    { key: 'test', name: '测试组', en: 'Test Team' },
    { key: 'pm', name: '保养组', en: 'PM Team' }
  ];
}

function buildResourceUserMap_() {
  const map = {};
  try {
    const ws = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!ws) return map;
    const values = ws.getDataRange().getValues();
    for (let i = 2; i < values.length; i++) {
      const sapID = String(values[i][0] || '').trim();
      if (!sapID) continue;
      map[sapID] = {
        sapID: sapID,
        name: String(values[i][1] || '').trim(),
        workshop: String(values[i][13] || '').trim(),
        process: String(values[i][14] || '').trim(),
        internalGroup: String(values[i][63] || '').trim()
      };
    }
  } catch (e) {
    console.error('buildResourceUserMap_ error: ' + e);
  }
  return map;
}

function inferResourceGroup_(person, task) {
  // 优先使用 userID 表 BL 列直接指定的内部组别
  if (person && person.internalGroup) {
    const ig = person.internalGroup;
    // BL列值到预定义 group key 的直接映射
    const blToGroup = { 'TB1': 'tb1', 'TB2': 'tb2' };
    if (blToGroup[ig]) return blToGroup[ig];
    const defs = getResourceGroupDefs_();
    for (let d = 0; d < defs.length; d++) {
      if (ig === defs[d].name || ig === defs[d].key || ig === defs[d].en) return defs[d].key;
    }
    // 非预定义组别，将中文名作为 key 动态分组
    return ig;
  }

  const workshop = String((person && person.workshop) || (task && task.workshop) || '').toUpperCase();
  const process = String((person && person.process) || (task && task.process) || '').toUpperCase();
  const roleText = [
    person && person.workRole,
    person && person.name,
    task && task.taskType,
    task && task.title,
    task && task.description
  ].join(' ');

  if (workshop === 'TB1') return 'tb1';
  if (workshop === 'TB2') return 'tb2';
  if (roleText.indexOf('模具') !== -1 || /MOLD/i.test(roleText)) return 'mold';
  if (roleText.indexOf('测试') !== -1 || /TEST|TF/i.test(roleText) || process === 'TF') return 'test';
  if (roleText.indexOf('保养') !== -1 || /PM/i.test(roleText)) return 'pm';
  if (process === 'INJ' || process === 'IM') return workshop === 'TB2' ? 'tb2' : 'tb1';
  return 'pm';
}

function loadResourceGanttData(startDate, daysCount) {
  try {
    const days = [];
    const count = Math.max(1, Math.min(parseInt(daysCount || 7, 10) || 7, 31));
    for (let i = 0; i < count; i++) days.push(addDaysYMD_(startDate, i));

    const userMap = buildResourceUserMap_();

    // ---- 优先: 从 AttendanceSync 读取出勤数据 ----
    const staffByDate = {};
    const staffLookup = {};
    const dateSet = {};
    days.forEach(function (d) { dateSet[d] = true; staffByDate[d] = []; });

    let hasAttendanceData = false;
    try {
      const attWs = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName("AttendanceSync");
      if (attWs && attWs.getLastRow() > 1) {
        const attData = attWs.getRange(2, 1, attWs.getLastRow() - 1, 11).getValues();
        const seen = {};
        for (let i = 0; i < attData.length; i++) {
          const rowDate = attData[i][0] instanceof Date
            ? Utilities.formatDate(attData[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd")
            : String(attData[i][0] || "").trim();
          if (!dateSet[rowDate]) continue;

          const sapID = String(attData[i][1] || "").trim();
          const name = String(attData[i][2] || "").trim();
          const dedupKey = name + "_" + rowDate;
          if (seen[dedupKey]) continue;
          seen[dedupKey] = true;

          const staffObj = {
            sapID: sapID, name: name,
            workshop: String(attData[i][5] || "").trim(),
            attendanceStatus: String(attData[i][8] || "").trim() || "在岗",
            workRole: String(attData[i][3] || "").trim(),
            shift: String(attData[i][6] || "").trim(),
            hours: parseFloat(attData[i][7]) || 0
          };
          staffByDate[rowDate].push(staffObj);
          const key = String(sapID || name).trim();
          if (key) staffLookup[key] = Object.assign({}, userMap[key] || {}, staffObj);
          hasAttendanceData = true;
        }
      }
    } catch (e) {
      console.warn("AttendanceSync 读取失败: " + e.message);
    }

    // ---- 降级: 从 IM 排班读取（仅在 AttendanceSync 无数据时） ----
    if (!hasAttendanceData) {
    // Build name→SAPID map ONCE (instead of per-day in loadIMStaffByDate)
    const userWs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID).getSheetByName(USER_PERMISSION_SHEET_NAME);
    const nameToSap = {};
    if (userWs) {
      const userVals = userWs.getDataRange().getValues();
      for (let i = 2; i < userVals.length; i++) {
        const nm = String(userVals[i][1] || '').trim();
        const sid = String(userVals[i][0] || '').trim();
        if (nm && sid) nameToSap[nm] = sid;
      }
    }

    // Read IM data ONCE, scan all rows, bucket into relevant dates
    const imWs = SpreadsheetApp.openById(IM_SCHEDULING_SS_ID).getSheetByName(IM_SCHEDULING_SHEET);
    if (imWs) {
      const imData = imWs.getDataRange().getValues();
      const shiftMap = { '1夜': '夜班', '2早': '早班', '3中': '中班' };
      const seen = {}; // dedup by name+date
      for (let i = 1; i < imData.length; i++) {
        const dateShift = String(imData[i][0] || '');
        const usIdx = dateShift.lastIndexOf('_');
        const datePart = usIdx > 0 ? dateShift.substring(0, usIdx) : dateShift;
        const normalizedDate = datePart.replace(/\./g, '-'); // "2026.06.25"→"2026-06-25"
        if (!dateSet[normalizedDate]) continue;

        const workshop = String(imData[i][1] || '').trim();
        const name = String(imData[i][3] || '').trim();
        const hours = String(imData[i][4] || '').trim();
        const shiftPart = usIdx > 0 ? dateShift.substring(usIdx + 1) : '';
        const shift = shiftMap[shiftPart] || shiftPart;
        const sapID = nameToSap[name] || '';
        if (!name) continue;
        const dedupKey = name + '_' + normalizedDate;
        if (seen[dedupKey]) continue;
        seen[dedupKey] = true;
        const staffObj = {
          sapID: sapID, name: name, workshop: workshop,
          attendanceStatus: '在岗',
          workRole: workshop === 'TB1' ? 'TB1' : 'TB2',
          shift: shift, hours: hours
        };
        staffByDate[normalizedDate].push(staffObj);
        const key = String(sapID || name).trim();
        if (key) staffLookup[key] = Object.assign({}, userMap[key] || {}, staffObj);
      }
    }

    } // end if (!hasAttendanceData)

    // ---- 优化: 用 loadAllPMTasks 一次性读取保养任务，不再按天循环 ----
    const taskMap = {};
    function addTask_(task) {
      if (!task || !task.taskID || task.status === '已取消') return;
      const start = String(task.planStartDate || '').trim();
      const due = String(task.dueDate || start).trim();
      if (!start && !due) return;
      // Only include tasks overlapping our date window
      if ((due || start) < days[0] || (start || due) > days[days.length - 1]) return;
      if (!taskMap[task.taskID]) taskMap[task.taskID] = task;
    }

    // Manual tasks (single read)
    const manualResult = JSON.parse(loadTasks(JSON.stringify({})));
    const manualTasks = manualResult.success ? manualResult.data : [];
    manualTasks.forEach(addTask_);

    // PM tasks (single read via loadAllPMTasks, not per-day loadPMTasksByDate)
    const allPMResult = JSON.parse(loadAllPMTasks(JSON.stringify({})));
    const allPMTasks = allPMResult.success ? allPMResult.data : [];
    allPMTasks.forEach(addTask_);

    // ---- Grouping logic (unchanged) ----
    const groupMap = {};
    getResourceGroupDefs_().forEach(function (g) {
      groupMap[g.key] = { key: g.key, name: g.name, en: g.en, people: {}, dailyCounts: {} };
      days.forEach(function (date) { groupMap[g.key].dailyCounts[date] = 0; });
    });

    Object.keys(taskMap).forEach(function (taskID) {
      const task = taskMap[taskID];
      const start = String(task.planStartDate || task.dueDate || '').trim();
      const due = String(task.dueDate || task.planStartDate || '').trim();
      const members = (task.owners || []).concat(task.collaborators || []).filter(Boolean);
      if (members.length === 0) members.push('未分配');

      members.forEach(function (memberID) {
        const person = staffLookup[memberID] || userMap[memberID] || { sapID: memberID, name: memberID };
        // BL列为空的人不在项目管理范围内，跳过
        if (!person.internalGroup) return;
        const groupKey = inferResourceGroup_(person, task);
        if (!groupMap[groupKey]) {
          groupMap[groupKey] = { key: groupKey, name: groupKey, en: groupKey, people: {}, dailyCounts: {} };
          days.forEach(function (d) { groupMap[groupKey].dailyCounts[d] = 0; });
        }
        const group = groupMap[groupKey];
        if (!group.people[memberID]) {
          group.people[memberID] = {
            sapID: memberID,
            name: person.name || memberID,
            workshop: person.workshop || task.workshop || '',
            process: person.process || task.process || '',
            hasTasks: true,
            tasks: []
          };
        }
        group.people[memberID].tasks.push({
          taskID: task.taskID,
          title: task.title || task.taskID,
          taskType: task.taskType || '',
          priority: task.priority || '',
          status: task.status || '',
          start: start,
          end: due,
          role: (task.owners || []).indexOf(memberID) !== -1 ? 'owner' : 'collaborator'
        });

        days.forEach(function (date) {
          if (start <= date && due >= date) group.dailyCounts[date]++;
        });
      });
    });

    // ---- 补充考勤但无任务的人员（空闲标记） ----
    Object.keys(staffLookup).forEach(function (key) {
      const staff = staffLookup[key];
      // 无 internalGroup 的人不在项目管理范围内，跳过
      if (!staff.internalGroup) return;
      // 检查是否已在任何分组中（已有任务的人不重复添加）
      let alreadyExists = false;
      Object.keys(groupMap).forEach(function (gk) {
        if (groupMap[gk].people[key]) alreadyExists = true;
      });
      if (alreadyExists) return;

      const groupKey = inferResourceGroup_(staff, null);
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = { key: groupKey, name: groupKey, en: groupKey, people: {}, dailyCounts: {} };
        days.forEach(function (d) { groupMap[groupKey].dailyCounts[d] = 0; });
      }
      groupMap[groupKey].people[key] = {
        sapID: key,
        name: staff.name || key,
        workshop: staff.workshop || '',
        process: staff.process || '',
        hasTasks: false,
        tasks: []
      };
    });

    const groups = Object.keys(groupMap).map(function (key) {
      const group = groupMap[key];
      return {
        key: group.key,
        name: group.name,
        en: group.en,
        dailyCounts: group.dailyCounts,
        people: Object.keys(group.people).map(function (k) { return group.people[k]; })
      };
    });

    return JSON.stringify({ success: true, data: { days: days, groups: groups } });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function loadMyTasks(sapID) {
  try {
    const tasksData = JSON.parse(loadTasks(JSON.stringify({})));
    const allTasks = tasksData.success ? tasksData.data : [];
    const ownerTasks = allTasks.filter(function (t) {
      return t.owners.indexOf(sapID) !== -1 && t.status !== '已完成' && t.status !== '已取消';
    });
    const collaboratorTasks = allTasks.filter(function (t) {
      return t.collaborators.indexOf(sapID) !== -1 && t.status !== '已完成' && t.status !== '已取消';
    });
    return JSON.stringify({
      success: true,
      data: { ownerTasks: ownerTasks, collaboratorTasks: collaboratorTasks }
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function createTask(taskJSON, membersJSON, operatorSAPID, operatorName) {
  try {
    const task = typeof taskJSON === 'string' ? JSON.parse(taskJSON) : taskJSON;
    const members = typeof membersJSON === 'string' ? JSON.parse(membersJSON) : (membersJSON || []);
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TASKS_SHEET);
    if (!ws) return JSON.stringify({ success: false, message: 'Tasks sheet not found' });
    const taskID = generateTaskID_();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.appendRow([
      taskID,
      task.title || '',
      task.description || '',
      task.taskType || '临时',
      task.priority || '中',
      task.status || '未开始',
      task.planStartDate || '',
      task.dueDate || '',
      '',
      operatorSAPID,
      '',
      task.remark || '',
      now,
      now,
      task.process || ''
    ]);
    // Save task members
    saveTaskMembers_(taskID, members, operatorSAPID);
    writeTaskLog_('createTask', 'Task', taskID, '', JSON.stringify(task).substring(0, 500), operatorSAPID, operatorName);
    return JSON.stringify({ success: true, taskID: taskID, message: '任务已创建 / Task created' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function saveTaskMembers_(taskID, members, operatorSAPID) {
  const membersWs = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_MEMBERS_SHEET);
  if (!membersWs) return;
  // Delete existing members for this task
  const data = membersWs.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1] || '') === taskID) {
      membersWs.deleteRow(i + 1);
    }
  }
  // Insert new members
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  members.forEach(function (m) {
    const memberID = Utilities.getUuid();
    membersWs.appendRow([memberID, taskID, m.sapID || m.id || '', m.memberRole || m.role || 'collaborator', 'Y', now, operatorSAPID]);
  });
}

function updateTask(taskJSON, operatorSAPID, operatorName) {
  try {
    const task = typeof taskJSON === 'string' ? JSON.parse(taskJSON) : taskJSON;
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TASKS_SHEET);
    if (!ws) return JSON.stringify({ success: false, message: 'Tasks sheet not found' });
    const data = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === task.taskID) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) return JSON.stringify({ success: false, message: '任务未找到 / Task not found' });
    const beforeJSON = JSON.stringify({
      title: String(data[rowIndex - 1][1] || ''),
      description: String(data[rowIndex - 1][2] || ''),
      taskType: String(data[rowIndex - 1][3] || ''),
      priority: String(data[rowIndex - 1][4] || ''),
      status: String(data[rowIndex - 1][5] || ''),
      planStartDate: String(data[rowIndex - 1][6] || ''),
      dueDate: String(data[rowIndex - 1][7] || ''),
      remark: String(data[rowIndex - 1][11] || '')
    });
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.getRange(rowIndex, 2).setValue(task.title || data[rowIndex - 1][1]);
    ws.getRange(rowIndex, 3).setValue(task.description !== undefined ? task.description : data[rowIndex - 1][2]);
    ws.getRange(rowIndex, 4).setValue(task.taskType || data[rowIndex - 1][3]);
    ws.getRange(rowIndex, 5).setValue(task.priority || data[rowIndex - 1][4]);
    ws.getRange(rowIndex, 7).setValue(task.planStartDate || data[rowIndex - 1][6]);
    ws.getRange(rowIndex, 8).setValue(task.dueDate || data[rowIndex - 1][7]);
    ws.getRange(rowIndex, 12).setValue(task.remark !== undefined ? task.remark : data[rowIndex - 1][11]);
    ws.getRange(rowIndex, 14).setValue(now);
    writeTaskLog_('updateTask', 'Task', task.taskID, beforeJSON, JSON.stringify(task).substring(0, 500), operatorSAPID, operatorName);
    return JSON.stringify({ success: true, message: '任务已更新 / Task updated' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function updateTaskStatus(taskID, newStatus, operatorSAPID, operatorName) {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_TASKS_SHEET);
    if (!ws) return JSON.stringify({ success: false, message: 'Tasks sheet not found' });
    const data = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === taskID) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) return JSON.stringify({ success: false, message: '任务未找到 / Task not found' });
    const oldStatus = String(data[rowIndex - 1][5] || '');
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    ws.getRange(rowIndex, 6).setValue(newStatus);
    ws.getRange(rowIndex, 14).setValue(now);
    if (newStatus === '已完成') {
      ws.getRange(rowIndex, 9).setValue(now);
    }
    writeTaskLog_('updateStatus', 'Task', taskID, oldStatus, newStatus, operatorSAPID, operatorName);
    return JSON.stringify({ success: true, message: '状态已更新 / Status updated' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function closeTask(taskID, operatorSAPID, operatorName) {
  return updateTaskStatus(taskID, '已完成', operatorSAPID, operatorName);
}

function cancelTask(taskID, operatorSAPID, operatorName) {
  return updateTaskStatus(taskID, '已取消', operatorSAPID, operatorName);
}

function loadTaskMembers(taskID) {
  try {
    const ws = SpreadsheetApp.openById(TASK_SS_ID).getSheetByName(TASK_MEMBERS_SHEET);
    if (!ws) return JSON.stringify([]);
    const data = ws.getDataRange().getValues();
    const members = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1] || '') === taskID) {
        members.push({
          memberID: String(data[i][0] || ''),
          taskID: String(data[i][1] || ''),
          sapID: String(data[i][2] || ''),
          memberRole: String(data[i][3] || ''),
          canUpdate: String(data[i][4] || '')
        });
      }
    }
    return JSON.stringify(members);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function saveTaskMembers(taskID, membersJSON, operatorSAPID, operatorName) {
  try {
    const members = typeof membersJSON === 'string' ? JSON.parse(membersJSON) : membersJSON;
    saveTaskMembers_(taskID, members, operatorSAPID);
    writeTaskLog_('updateMembers', 'TaskMembers', taskID, '', JSON.stringify(members).substring(0, 500), operatorSAPID, operatorName);
    return JSON.stringify({ success: true, message: '成员已更新 / Members updated' });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function formatINJSDMDate_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Hong_Kong', 'yyyy-MM-dd');
  }
  const text = String(value).trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  return compact ? compact[1] + '-' + compact[2] + '-' + compact[3] : text.substring(0, 10);
}

function formatINJSDMDateTime_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value).trim();
}

function getINJSDMSheet_() {
  const ws = SpreadsheetApp.openById(INJ_SDM_SS_ID).getSheetByName(INJ_SDM_SHEET_NAME);
  if (!ws) throw new Error('MasterData sheet not found');
  return ws;
}

function readINJSDMRows_() {
  const ws = getINJSDMSheet_();
  const lastRow = ws.getLastRow();
  if (lastRow < 3) return [];
  return ws.getRange(3, 1, lastRow - 2, 15).getValues();
}

function rowToINJSDMItem_(row) {
  let owners = [];
  try { owners = JSON.parse(String(row[10] || '[]')); } catch (e) {}
  return {
    reportId: String(row[0] || ''),
    reportDate: formatINJSDMDate_(row[1]),
    dataStartDate: formatINJSDMDate_(row[2]),
    dataEndDate: formatINJSDMDate_(row[3]),
    itemId: String(row[4] || ''),
    category: String(row[5] || ''),
    workshop: String(row[6] || ''),
    machineNo: String(row[7] || ''),
    description: String(row[8] || ''),
    ownerNames: String(row[9] || ''),
    owners: owners,
    createdAt: formatINJSDMDateTime_(row[11]),
    updatedAt: formatINJSDMDateTime_(row[12]),
    status: String(row[13] || ''),
    editHistoryJSON: String(row[14] || '[]')
  };
}

function groupINJSDMReports_(rows) {
  const map = {};
  rows.forEach(function (row) {
    const item = rowToINJSDMItem_(row);
    if (item.status !== 'ACTIVE' || !item.reportId) return;
    if (!map[item.reportId]) {
      map[item.reportId] = {
        reportId: item.reportId,
        reportDate: item.reportDate,
        dataStartDate: item.dataStartDate,
        dataEndDate: item.dataEndDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        major: [],
        outstanding: [],
        communication: []
      };
    }
    const report = map[item.reportId];
    report.updatedAt = item.updatedAt || report.updatedAt;
    if (item.category === 'MAJOR') {
      report.major.push({ itemId: item.itemId, workshop: item.workshop, machineNo: item.machineNo, description: item.description });
    } else if (item.category === 'OUTSTANDING') {
      report.outstanding.push({ itemId: item.itemId, workshop: item.workshop, machineNo: item.machineNo, description: item.description });
    } else if (item.category === 'COMMUNICATION') {
      report.communication.push({ itemId: item.itemId, description: item.description, owners: item.owners });
    }
  });
  return Object.keys(map).map(function (key) { return map[key]; });
}

function getINJSDMInitData(userName, userEmail) {
  try {
    const permission = getINJSDMPermission_(userName, userEmail);
    if (!permission.hasPermission) {
      return JSON.stringify({ success: true, hasPermission: false, scUsers: [], todayReport: null });
    }
    const today = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
    const reports = groupINJSDMReports_(readINJSDMRows_());
    const todayReport = reports.filter(function (report) { return report.reportDate === today; })[0] || null;
    return JSON.stringify({
      success: true,
      hasPermission: true,
      scUsers: getINJSCUsers_(),
      todayReport: todayReport
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString() });
  }
}

function validateINJSDMPayload_(payload) {
  if (!payload) throw new Error('Missing payload');
  const reportDate = formatINJSDMDate_(payload.reportDate);
  const startDate = formatINJSDMDate_(payload.dataStartDate);
  const endDate = formatINJSDMDate_(payload.dataEndDate);
  if (!reportDate || !startDate || !endDate) throw new Error('Date is required');
  if (startDate > endDate) throw new Error('Data start date cannot be later than end date');
  if (endDate > reportDate) throw new Error('Data date cannot be later than report date');

  const major = Array.isArray(payload.major) ? payload.major : [];
  const outstanding = Array.isArray(payload.outstanding) ? payload.outstanding : [];
  const communication = Array.isArray(payload.communication) ? payload.communication : [];
  if (!major.length && !outstanding.length && !communication.length) throw new Error('At least one item is required');

  major.concat(outstanding).forEach(function (item) {
    if (['TB1', 'TB2'].indexOf(String(item.workshop || '')) === -1) throw new Error('Workshop is required');
    if (!String(item.machineNo || '').trim()) throw new Error('Machine number is required');
    if (!String(item.description || '').trim()) throw new Error('Description is required');
  });
  communication.forEach(function (item) {
    if (!String(item.description || '').trim()) throw new Error('Communication description is required');
    if (!Array.isArray(item.owners) || !item.owners.length) throw new Error('Communication owner is required');
  });
  return {
    reportDate: reportDate,
    dataStartDate: startDate,
    dataEndDate: endDate,
    major: major,
    outstanding: outstanding,
    communication: communication
  };
}

function saveINJSDMReport(payload, userName, userEmail) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!getINJSDMPermission_(userName, userEmail).hasPermission) {
      return JSON.stringify({ success: false, permissionDenied: true, message: 'Permission denied' });
    }
    const data = validateINJSDMPayload_(payload);
    const ws = getINJSDMSheet_();
    const rows = readINJSDMRows_();
    const existingActive = [];
    let reportId = '';
    let createdAt = '';
    let previousSnapshot = null;

    rows.forEach(function (row, index) {
      if (formatINJSDMDate_(row[1]) === data.reportDate && String(row[13] || '') === 'ACTIVE') {
        existingActive.push(index + 3);
        reportId = reportId || String(row[0] || '');
        createdAt = createdAt || formatINJSDMDateTime_(row[11]);
      }
    });

    if (reportId) {
      const reports = groupINJSDMReports_(rows);
      previousSnapshot = reports.filter(function (report) { return report.reportId === reportId; })[0] || null;
    } else {
      reportId = 'RPT-' + data.reportDate.replace(/-/g, '') + '-' + Utilities.getUuid().substring(0, 8);
    }

    const now = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
    createdAt = createdAt || now;
    const history = previousSnapshot ? [{ changedAt: now, before: previousSnapshot }] : [];
    const historyJSON = JSON.stringify(history);

    if (existingActive.length) {
      existingActive.forEach(function (sheetRow) {
        ws.getRange(sheetRow, 13, 1, 3).setValues([[now, 'DELETED', historyJSON]]);
      });
    }

    const output = [];
    let sequence = 1;
    function addItem(category, item) {
      const itemId = 'ITM-' + data.reportDate.replace(/-/g, '') + '-' + ('000' + sequence++).slice(-3) + '-' + Utilities.getUuid().substring(0, 4);
      const owners = Array.isArray(item.owners) ? item.owners : [];
      output.push([
        reportId, data.reportDate, data.dataStartDate, data.dataEndDate, itemId, category,
        String(item.workshop || ''), String(item.machineNo || ''), String(item.description || '').trim(),
        owners.join('、'), JSON.stringify(owners), createdAt, now, 'ACTIVE', historyJSON
      ]);
    }
    data.major.forEach(function (item) { addItem('MAJOR', item); });
    data.outstanding.forEach(function (item) { addItem('OUTSTANDING', item); });
    data.communication.forEach(function (item) { addItem('COMMUNICATION', item); });

    ws.getRange(ws.getLastRow() + 1, 1, output.length, 15).setValues(output);
    return JSON.stringify({ success: true, reportId: reportId, updated: existingActive.length > 0 });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString() });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function getINJSDMHistory(startDate, endDate, userName, userEmail) {
  try {
    if (!getINJSDMPermission_(userName, userEmail).hasPermission) {
      return JSON.stringify({ success: false, permissionDenied: true, records: [] });
    }
    const start = formatINJSDMDate_(startDate);
    const end = formatINJSDMDate_(endDate);
    let reports = groupINJSDMReports_(readINJSDMRows_());
    reports = reports.filter(function (report) {
      return (!start || report.reportDate >= start) && (!end || report.reportDate <= end);
    }).sort(function (a, b) { return b.reportDate.localeCompare(a.reportDate); });
    return JSON.stringify({ success: true, records: reports });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString(), records: [] });
  }
}

function deleteINJSDMReport(reportId, userName, userEmail) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!getINJSDMPermission_(userName, userEmail).hasPermission) {
      return JSON.stringify({ success: false, permissionDenied: true, message: 'Permission denied' });
    }
    const ws = getINJSDMSheet_();
    const rows = readINJSDMRows_();
    const reports = groupINJSDMReports_(rows);
    const snapshot = reports.filter(function (report) { return report.reportId === reportId; })[0] || null;
    if (!snapshot) return JSON.stringify({ success: false, message: 'Record not found' });
    const now = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
    const historyJSON = JSON.stringify([{ changedAt: now, action: 'DELETE', before: snapshot }]);
    let count = 0;
    rows.forEach(function (row, index) {
      if (String(row[0] || '') === reportId && String(row[13] || '') === 'ACTIVE') {
        ws.getRange(index + 3, 13, 1, 3).setValues([[now, 'DELETED', historyJSON]]);
        count++;
      }
    });
    return JSON.stringify({ success: true, deletedRows: count });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString() });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * 普通用户申请推迟计划日期
 * Request planned date delay (non-admin users)
 * @param {string} projectName - 项目名称
 * @param {number} milestoneIndex - 里程碑索引
 * @param {string} newDate - 目标推迟日期 (YYYY-MM-DD)
 * @param {string} reason - 推迟原因
 * @param {string} editorName - 申请人姓名
 * @returns {string} JSON string
 */
function requestPlannedDateDelay(projectName, milestoneIndex, newDate, reason, editorName) {
  try {
    // Get current planned date from the project's own milestone JSON (single source of truth)
    const trackSs = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const trackWs = trackSs.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!trackWs) return JSON.stringify({ success: false, message: '数据表未找到 / Sheet not found' });
    const trackData = trackWs.getDataRange().getValues();
    let rowIndex = -1;
    let msArr = [];
    for (let i = 1; i < trackData.length; i++) {
      if (String(trackData[i][0] || '').trim() === projectName) {
        rowIndex = i + 1;
        msArr = parseMilestonesJSON_(trackData[i][PROJECT_MILESTONES_JSON_COL]);
        break;
      }
    }
    if (rowIndex < 0) return JSON.stringify({ success: false, message: '项目未找到 / Project not found' });
    if (milestoneIndex < 0 || milestoneIndex >= msArr.length) {
      return JSON.stringify({ success: false, message: '无效的里程碑索引 / Invalid milestone index' });
    }
    const msName = String(msArr[milestoneIndex].name || '');
    const oldPlanned = String(msArr[milestoneIndex].planned || '').trim();

    // Get user info (email and supervisor email)
    const permSs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const permWs = permSs.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!permWs) return JSON.stringify({ success: false, message: '用户权限表未找到 / User permission sheet not found' });
    const permVals = permWs.getDataRange().getValues();
    let userEmail = '';
    let supervisorEmail = '';
    for (let i = 2; i < permVals.length; i++) {
      if (String(permVals[i][1] || '').trim() === editorName) {
        userEmail = String(permVals[i][9] || '').trim();
        supervisorEmail = String(permVals[i][60] || '').trim(); // BI column
        break;
      }
    }

    if (!supervisorEmail) {
      return JSON.stringify({ success: false, message: '未找到直线上级邮箱，请联系管理员设置 / Supervisor email not found' });
    }

    // Generate token and write to approvals sheet
    const token = Utilities.getUuid();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
    const approvalsWs = trackSs.getSheetByName(PROJECT_TRACKING_APPROVALS_SHEET_NAME);
    if (!approvalsWs) return JSON.stringify({ success: false, message: '审批表未找到 / Approvals sheet not found' });
    approvalsWs.appendRow([token, projectName, msName, oldPlanned, newDate, editorName, userEmail, supervisorEmail, reason, '待审批', now, '']);

    // Send approval email to supervisor
    const webPage = getReleaseWebPage();
    const approveUrl = webPage + '?action=approve&token=' + encodeURIComponent(token);
    const rejectUrl = webPage + '?action=reject&token=' + encodeURIComponent(token);
    const subject = '【审批申请】计划日期推迟 / Planned Date Delay Request - ' + projectName;

    const htmlBody = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:#fff0f0;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;border-left:5px solid #E60012;">'
      + '<h2 style="color:#E60012;text-align:center;margin-bottom:20px;border-bottom:3px solid #E60012;padding-bottom:10px;">'
      + '【审批申请】计划日期推迟<br><span style="font-size:0.8em;">Planned Date Delay Request</span></h2>'
      + '<p style="font-size:15px;line-height:1.6;color:#c0392b;">' + escapeHtml(editorName) + ' 申请推迟项目里程碑计划日期，请审批：</p>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;">'
      + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
      + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
      + '<th style="padding:10px 12px;text-align:left;">项目 / Project</th>'
      + '<td style="padding:10px 12px;background:#fff5f5;">' + escapeHtml(projectName) + '</td></tr>'
      + '<tr><th style="padding:10px 12px;text-align:left;background:linear-gradient(135deg,#E60012,#c0000f);color:white;">里程碑 / Milestone</th>'
      + '<td style="padding:10px 12px;">' + escapeHtml(msName) + '</td></tr>'
      + '<tr><th style="padding:10px 12px;text-align:left;background:linear-gradient(135deg,#E60012,#c0000f);color:white;">申请人 / Requester</th>'
      + '<td style="padding:10px 12px;background:#fff5f5;">' + escapeHtml(editorName) + (userEmail ? ' (' + escapeHtml(userEmail) + ')' : '') + '</td></tr>'
      + '<tr><th style="padding:10px 12px;text-align:left;background:linear-gradient(135deg,#E60012,#c0000f);color:white;">原计划日期 / Original</th>'
      + '<td style="padding:10px 12px;font-family:monospace;">' + escapeHtml(oldPlanned || 'NA') + '</td></tr>'
      + '<tr><th style="padding:10px 12px;text-align:left;background:linear-gradient(135deg,#E60012,#c0000f);color:white;">申请推迟到 / Requested</th>'
      + '<td style="padding:10px 12px;background:#fff5f5;font-family:monospace;font-weight:600;color:#E60012;">' + escapeHtml(newDate) + '</td></tr>'
      + '<tr><th style="padding:10px 12px;text-align:left;background:linear-gradient(135deg,#E60012,#c0000f);color:white;">推迟原因 / Reason</th>'
      + '<td style="padding:10px 12px;">' + escapeHtml(reason) + '</td></tr>'
      + '</table>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;text-align:center;">'
      + '<p style="font-size:16px;font-weight:600;color:#333;margin-bottom:20px;">请选择操作 / Please choose an action:</p>'
      + '<a href="' + approveUrl + '" style="display:inline-block;background:#28a745;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:0 10px;">✅ 批准 / Approve</a>'
      + '<a href="' + rejectUrl + '" style="display:inline-block;background:#dc3545;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:0 10px;">❌ 拒绝 / Reject</a>'
      + '<p style="margin-top:20px;font-size:12px;color:#999;font-style:italic;">此链接仅可点击一次，重复点击将显示"已处理"。<br>This link can only be used once.</p>'
      + '</div></div>';

    GmailApp.sendEmail(supervisorEmail, subject, '', { htmlBody: htmlBody });
    console.log('审批邮件已发送至 / Approval email sent to: ' + supervisorEmail);

    return JSON.stringify({ success: true, message: '申请已提交，请等待上级审批 / Request submitted, awaiting supervisor approval' });
  } catch (e) {
    return JSON.stringify({ success: false, message: '申请失败 / Request failed: ' + e.toString() });
  }
}

/**
 * 处理审批动作（来自邮件链接的 doGet 调用）
 * Handle approve/reject action from email link
 * @param {string} action - 'approve' or 'reject'
 * @param {string} token - approval token
 * @returns {HtmlOutput} result page
 */
function handleApprovalAction(action, token) {
  try {
    const trackSs = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const approvalsWs = trackSs.getSheetByName(PROJECT_TRACKING_APPROVALS_SHEET_NAME);
    if (!approvalsWs) return createResultPage('错误 / Error', '审批表未找到 / Approvals sheet not found', false);

    const data = approvalsWs.getDataRange().getValues();
    let rowIdx = -1;
    let approvalRow = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === token) {
        rowIdx = i + 1; // 1-based row index
        approvalRow = data[i];
        break;
      }
    }
    if (!approvalRow) return createResultPage('无效链接 / Invalid Link', '未找到对应的审批申请，请联系管理员 / Approval request not found', false);

    const status = String(approvalRow[9] || '').trim();
    if (status !== '待审批') {
      return createResultPage('已处理 / Already Processed',
        '此审批申请已处理（状态：' + status + '），无需重复操作。<br>This request has already been processed.',
        false);
    }

    const projectName = String(approvalRow[1] || '').trim();
    const msName = String(approvalRow[2] || '').trim();
    const oldPlanned = String(approvalRow[3] || '').trim();
    const newDate = String(approvalRow[4] || '').trim();
    const requesterName = String(approvalRow[5] || '').trim();
    const requesterEmail = String(approvalRow[6] || '').trim();
    const reason = String(approvalRow[8] || '').trim();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');

    if (action === 'approve') {
      // Update planned date in tracking sheet
      const trackWs = trackSs.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
      if (trackWs) {
        const trackData = trackWs.getDataRange().getValues();
        for (let i = 1; i < trackData.length; i++) {
          if (String(trackData[i][0] || '').trim() === projectName) {
            // Update the planned date inside the milestone JSON (single source of truth)
            var msArr = parseMilestonesJSON_(trackData[i][PROJECT_MILESTONES_JSON_COL]);
            for (let j = 0; j < msArr.length; j++) {
              if (msArr[j].name === msName) {
                msArr[j].planned = newDate;
                break;
              }
            }
            trackWs.getRange(i + 1, PROJECT_MILESTONES_JSON_COL + 1).setValue(JSON.stringify(msArr));
            break;
          }
        }
      }

      // Record in history
      const historyWs = trackSs.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
      if (historyWs) {
        historyWs.appendRow([projectName, msName, oldPlanned, newDate, requesterName + '(审批)', now, '批准 / Approved']);
      }

      // Update approval status
      approvalsWs.getRange(rowIdx, 11).setValue(now); // 处理时间
      approvalsWs.getRange(rowIdx, 10).setValue('已批准'); // 状态

      // Notify requester
      if (requesterEmail) {
        const webPage = getReleaseWebPage();
        const notifyBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:20px;">'
          + '<div style="background:#f0fff4;border-radius:8px;padding:30px;margin-bottom:20px;border-left:5px solid #28a745;">'
          + '<h2 style="color:#28a745;text-align:center;">✅ 申请已批准 / Approved</h2>'
          + '<p>您的计划日期推迟申请已<strong style="color:#28a745;">批准</strong>。</p>'
          + '<table style="width:100%;border-collapse:collapse;margin-top:12px;">'
          + '<tr><td style="padding:6px 10px;font-weight:600;">项目 / Project</td><td>' + escapeHtml(projectName) + '</td></tr>'
          + '<tr><td style="padding:6px 10px;font-weight:600;">里程碑 / Milestone</td><td>' + escapeHtml(msName) + '</td></tr>'
          + '<tr><td style="padding:6px 10px;font-weight:600;">原计划 / Original</td><td>' + escapeHtml(oldPlanned || 'NA') + '</td></tr>'
          + '<tr><td style="padding:6px 10px;font-weight:600;">新计划 / New</td><td style="font-weight:600;color:#28a745;">' + escapeHtml(newDate) + '</td></tr>'
          + '</table>'
          + '<p style="margin-top:16px;"><a href="' + webPage + '?v=ProjectTracking" style="background:#28a745;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">查看项目跟进 / View Project</a></p>'
          + '</div></div>';
        GmailApp.sendEmail(requesterEmail, '【已批准】计划日期推迟 / Delay Approved - ' + projectName, '', { htmlBody: notifyBody });
      }

      return createResultPage('✅ 批准成功 / Approved',
        '<p>项目 <strong>' + escapeHtml(projectName) + '</strong> 的里程碑 <strong>' + escapeHtml(msName) + '</strong></p>'
        + '<p>计划日期已从 <strong>' + escapeHtml(oldPlanned || 'NA') + '</strong> 更新为 <strong>' + escapeHtml(newDate) + '</strong></p>'
        + '<p style="font-size:12px;color:#666;">申请人将收到邮件通知 / Requester will be notified</p>',
        true);

    } else {
      // Reject
      approvalsWs.getRange(rowIdx, 11).setValue(now); // 处理时间
      approvalsWs.getRange(rowIdx, 10).setValue('已拒绝'); // 状态

      if (requesterEmail) {
        const webPage = getReleaseWebPage();
        const notifyBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:20px;">'
          + '<div style="background:#fff5f5;border-radius:8px;padding:30px;margin-bottom:20px;border-left:5px solid #dc3545;">'
          + '<h2 style="color:#dc3545;text-align:center;">❌ 申请已拒绝 / Rejected</h2>'
          + '<p>您的计划日期推迟申请已被<strong style="color:#dc3545;">拒绝</strong>。</p>'
          + '<table style="width:100%;border-collapse:collapse;margin-top:12px;">'
          + '<tr><td style="padding:6px 10px;font-weight:600;">项目 / Project</td><td>' + escapeHtml(projectName) + '</td></tr>'
          + '<tr><td style="padding:6px 10px;font-weight:600;">里程碑 / Milestone</td><td>' + escapeHtml(msName) + '</td></tr>'
          + '<tr><td style="padding:6px 10px;font-weight:600;">申请推迟到 / Requested</td><td>' + escapeHtml(newDate) + '</td></tr>'
          + '</table>'
          + '<p style="margin-top:16px;"><a href="' + webPage + '?v=ProjectTracking" style="background:#E60012;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">查看项目跟进 / View Project</a></p>'
          + '</div></div>';
        GmailApp.sendEmail(requesterEmail, '【已拒绝】计划日期推迟 / Delay Rejected - ' + projectName, '', { htmlBody: notifyBody });
      }

      return createResultPage('❌ 已拒绝 / Rejected',
        '<p>项目 <strong>' + escapeHtml(projectName) + '</strong> 的里程碑 <strong>' + escapeHtml(msName) + '</strong></p>'
        + '<p>计划日期推迟申请已被<strong style="color:#dc3545;">拒绝</strong></p>'
        + '<p style="font-size:12px;color:#666;">申请人将收到邮件通知 / Requester will be notified</p>',
        false);
    }
  } catch (e) {
    return createResultPage('错误 / Error', '处理失败 / Processing failed: ' + e.toString(), false);
  }
}

/**
 * 生成审批结果页面
 * Generate approval result HTML page
 * @param {string} title - 页面标题
 * @param {string} message - 提示信息 (HTML)
 * @param {boolean} isSuccess - 是否成功
 * @returns {HtmlOutput}
 */
function createResultPage(title, message, isSuccess) {
  const color = isSuccess ? '#28a745' : '#dc3545';
  const icon = isSuccess ? '&#10004;' : '&#10008;';
  const webPage = getReleaseWebPage();
  const html = '<!DOCTYPE html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta charset="utf-8">'
    + '</head><body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa;">'
    + '<div style="max-width:480px;width:90%;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;background:#fff;">'
    + '<div style="font-size:64px;color:' + color + ';margin-bottom:16px;">' + icon + '</div>'
    + '<h2 style="color:#333;margin-bottom:16px;">' + title + '</h2>'
    + '<div style="font-size:14px;color:#666;line-height:1.8;margin-bottom:24px;">' + message + '</div>'
    + '<a href="' + webPage + '?v=ProjectTracking" style="display:inline-block;padding:10px 24px;background:#E60012;color:white;text-decoration:none;border-radius:6px;font-weight:600;">返回项目跟进 / Back to Project Tracking</a>'
    + '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

/**
 * 添加新项目
 * Add new project
 * @param {string} dataStr - JSON with project data
 * @returns {string} JSON string
 */
function addProject(dataStr, editorName) {
  try {
    const data = JSON.parse(dataStr);
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!ws) return JSON.stringify({ success: false, message: 'Sheet 项目总表 not found' });

    // milestones: array of {name, planned, owner?, ownerEmail?} from frontend
    const msData = Array.isArray(data.milestones) ? data.milestones : [];
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

    const projType = (data.type === 'CI' || data.type === 'Kaizen') ? data.type : '新品/新自动化';

    // 生成唯一项目编号 PRJ-YYYYMMDD-NNN
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const nowDate = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const allData = ws.getDataRange().getValues();
    let maxSeq = 0;
    const todayPrefix = 'PRJ-' + todayStr.split('-').join('') + '-';
    for (let i = 1; i < allData.length; i++) {
      const existingId = String(allData[i][PROJECT_ID_COL] || '').trim();
      if (existingId.indexOf(todayPrefix) === 0) {
        const seq = parseInt(existingId.split('-').pop(), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    const projectId = todayPrefix + String(maxSeq + 1).padStart(3, '0');

    // Build row: A-G → 项目名称/Leader/技术员/状态/里程碑JSON/类型/编号/创建时间/完成时间
    const row = [
      data.projectName || '',
      data.leader || '',
      data.technician || '',
      data.status || 'Not start',
      JSON.stringify(msJsonArr),
      projType,
      projectId,
      nowDate,
      '',
      data.process || 'INJ'
    ];

    ws.appendRow(row);

    // 发送创建通知邮件
    sendProjectCreationNotification(data.projectName, data.leader, editorName || '', projectId, projType, data.status || 'Not start', msJsonArr);

    return JSON.stringify({ success: true, message: '添加成功 / Project added successfully', projectId: projectId });
  } catch (e) {
    return JSON.stringify({ success: false, message: '添加失败 / Add failed: ' + e.toString() });
  }
}

/**
 * 发送项目创建通知给所有相关人
 * Send project creation notification to all stakeholders
 * @param {string} projectName - 项目名称
 * @param {string} leader - Leader 值（"姓名 (email)" 格式）
 * @param {string} editorName - 创建人姓名
 * @param {string} projectId - 项目编号
 * @param {string} projType - 项目类型（新品/新自动化 / CI / Kaizen）
 * @param {string} status - 初始状态
 * @param {Array} milestonesArr - 里程碑数组 [{name, planned, actual, owner, ownerEmail, status}]
 */
function sendProjectCreationNotification(projectName, leader, editorName, projectId, projType, status, milestonesArr) {
  try {
    // 1. 提取 Leader 邮箱
    const leaderEmail = (String(leader || '').match(/\(([^)]+)\)/) || [])[1] || '';
    const leaderName = String(leader || '').replace(/\(.*\)/, '').trim();

    // 2. 获取 Leader 直线上级 + INJ 管理员
    const permSs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const permWs = permSs.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!permWs) return;
    const permVals = permWs.getDataRange().getValues();
    const INJ_ADMIN_COLS = { process: 14, perm: 59, email: 9, name: 1, supervisor: 60 };
    const injAdminEmails = [];
    let supervisorEmail = '';
    for (let i = 2; i < permVals.length; i++) {
      const proc  = String(permVals[i][INJ_ADMIN_COLS.process] || '').trim();
      const perm  = String(permVals[i][INJ_ADMIN_COLS.perm] || '').trim();
      const email = String(permVals[i][INJ_ADMIN_COLS.email] || '').trim();
      if (proc === 'INJ' && perm === '管理员' && email) {
        injAdminEmails.push(email);
      }
      const name = String(permVals[i][INJ_ADMIN_COLS.name] || '').trim();
      if (name === leaderName) {
        supervisorEmail = String(permVals[i][INJ_ADMIN_COLS.supervisor] || '').trim();
      }
    }

    // 3. 事项责任人邮箱
    const ownerEmails = [];
    (milestonesArr || []).forEach(function(ms) {
      const e = String((ms && ms.ownerEmail) || '').trim();
      if (e) ownerEmails.push(e);
    });

    // 4. 构建收件人：To=项目Leader, CC=INJ管理员+直线上级+事项责任人（去重）
    const ccList = [...new Set([...injAdminEmails, supervisorEmail, ...ownerEmails].filter(Boolean))];
    const ccFiltered = leaderEmail ? ccList.filter(function(e) { return e.toLowerCase() !== leaderEmail.toLowerCase(); }) : ccList;
    const toEmail = leaderEmail || ccFiltered.shift() || '';

    if (!toEmail) {
      console.log('No recipients for project creation notification: ' + projectName);
      return;
    }

    const webPage = getReleaseWebPage();
    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const subject = '【项目跟进】' + escapeHtml(editorName || leaderName) + ' 创建了新项目 / New Project Created - ' + projectName;

    const statusMap = {
      'Not start': '未开始 / Not Start',
      'Processing': '进行中 / In Progress',
      'Done': '已完成 / Done',
      'Delayed': '已延迟 / Delayed',
      'Canceled': '已取消 / Canceled'
    };
    const statusDisplay = statusMap[status] || status;

    // 里程碑/事项表格
    let msRows = '';
    const isCI = (projType === 'CI' || projType === 'Kaizen');
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

    // 里程碑表头：CI 类型多一列"事项状态"
    let msHeaderCols = '<th style="padding:12px;text-align:left;min-width:80px;">名称<br><small>Name</small></th>'
      + '<th style="padding:12px;text-align:left;">计划开始<br><small>Start</small></th>'
      + '<th style="padding:12px;text-align:left;">计划完成<br><small>Planned</small></th>'
      + '<th style="padding:12px;text-align:left;">责任人<br><small>Owner</small></th>';
    if (isCI) {
      msHeaderCols += '<th style="padding:12px;text-align:left;">事项状态<br><small>Status</small></th>';
    }

    const htmlBody = '<div style="font-family:Arial,sans-serif;max-width:860px;margin:0 auto;background-color:#f8f9fa;padding:20px;">'
      + '<div style="background:#fff0f0;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;border-left:5px solid #E60012;">'
      + '<h2 style="color:#E60012;text-align:center;margin-bottom:20px;border-bottom:3px solid #E60012;padding-bottom:10px;">'
      + '【新项目创建通知】项目跟进<br><span style="font-size:0.8em;">New Project Created - Project Tracking</span></h2>'
      + '<p style="font-size:15px;line-height:1.6;color:#c0392b;">（' + today + '）新项目已创建：<br>'
      + '<span style="font-size:0.9em;opacity:0.85;">A new project has been created:</span></p>'
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:30px;margin-bottom:20px;">'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">'
      + '<tr><td style="padding:8px 12px;width:140px;font-weight:600;color:#555;">项目 / Project</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(projectName) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">项目编号 / ID</td><td style="padding:8px 12px;color:#2c3e50;font-family:monospace;">' + escapeHtml(projectId) + '</td></tr>'
      + '<tr><td style="padding:8px 12px;font-weight:600;color:#555;">项目负责人 / Leader</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(leaderName) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">项目类型 / Type</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(projType) + '</td></tr>'
      + '<tr><td style="padding:8px 12px;font-weight:600;color:#555;">初始状态 / Status</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(statusDisplay) + '</td></tr>'
      + '<tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-weight:600;color:#555;">创建人 / Creator</td><td style="padding:8px 12px;color:#2c3e50;">' + escapeHtml(editorName || leaderName) + '</td></tr>'
      + '</table>'
      + (msRows ? ('<h3 style="color:#E60012;border-bottom:2px solid #E60012;padding-bottom:8px;margin:16px 0 12px;">' + (isCI ? '事项清单 / Follow-up Items' : '里程碑计划 / Milestones') + '</h3>'
        + '<div style="overflow-x:auto;">'
        + '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
        + '<thead><tr style="background:linear-gradient(135deg,#E60012,#c0000f);color:white;">'
        + msHeaderCols
        + '</tr></thead><tbody>' + msRows + '</tbody></table></div>') : '')
      + '</div>'
      + '<div style="background:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);padding:20px;text-align:center;">'
      + '<p style="margin-bottom:12px;"><a href="' + webPage + '?v=ProjectTracking" style="background:#E60012;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">点击查看项目跟进 / View Project Tracking</a></p>'
      + '<p style="margin:0;font-size:12px;color:#999;font-style:italic;">此邮件由系统自动发送，请勿回复。<br><span style="font-size:0.9em;">Auto-sent by system, please do not reply.</span></p>'
      + '</div></div>';

    const mailOptions = { htmlBody: htmlBody };
    if (ccFiltered.length > 0) mailOptions.cc = ccFiltered.join(',');
    GmailApp.sendEmail(toEmail, subject, '', mailOptions);
    console.log('项目创建通知已发送 / Project creation notification sent — To: ' + toEmail + (ccFiltered.length > 0 ? ', CC: ' + ccFiltered.join(',') : ''));
  } catch (e) {
    console.error('sendProjectCreationNotification error: ' + e);
  }
}

/**
 * 删除项目（仅管理员）
 * Delete a project — admin only. Identified by projectId (preferred) or projectName.
 * @param {string} projectName - 项目名称
 * @param {string} projectId - 项目编号（优先用于精确定位）
 * @param {string} editorName - 操作人姓名
 * @returns {string} JSON string
 */
function deleteProject(projectName, projectId, editorName) {
  try {
    // 权限校验：仅项目跟进管理员可删除
    var perm = {};
    try { perm = JSON.parse(checkProjectPermission(editorName)); } catch (e) {}
    if (!perm.isAdmin) {
      return JSON.stringify({ success: false, message: '无权限：仅管理员可删除项目 / Permission denied: admin only' });
    }

    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!ws) return JSON.stringify({ success: false, message: 'Sheet 项目总表 not found' });

    const data = ws.getDataRange().getValues();
    const pid = String(projectId || '').trim();
    const pname = String(projectName || '').trim();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (pid) {
        if (String(data[i][PROJECT_ID_COL] || '').trim() === pid) { rowIndex = i + 1; break; }
      } else if (String(data[i][0] || '').trim() === pname) {
        rowIndex = i + 1; break;
      }
    }
    if (rowIndex === -1) return JSON.stringify({ success: false, message: '未找到项目 / Project not found' });

    const delName = String(data[rowIndex - 1][0] || '');
    const delId = String(data[rowIndex - 1][PROJECT_ID_COL] || '');
    ws.deleteRow(rowIndex);

    // 审计：写入历史表 [项目名, 里程碑, 旧, 新, 编辑人, 时间, 备注]
    try {
      const histWs = ss.getSheetByName(PROJECT_TRACKING_HISTORY_SHEET_NAME);
      if (histWs) {
        const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
        const nowStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
        histWs.appendRow([delName, '【项目删除 / Deleted】', '', '', editorName || '', nowStr, '删除项目 ' + delId]);
      }
    } catch (e) { /* 审计失败不影响删除结果 */ }

    return JSON.stringify({ success: true, message: '项目已删除 / Project deleted: ' + delName });
  } catch (e) {
    return JSON.stringify({ success: false, message: '删除失败 / Delete failed: ' + e.toString() });
  }
}

// ========== 项目跟进工序列迁移：历史数据 J 列回填 INJ ==========
// 使用方式：在 GAS 编辑器中手动执行一次 migrateProjectProcessColumn()
function migrateProjectProcessColumn() {
  const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
  const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
  if (!ws) return 'Sheet 项目总表 not found';
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return 'No data rows to migrate';
  // J 列（第10列）批量写入 INJ
  const range = ws.getRange(2, PROJECT_PROCESS_COL + 1, lastRow - 1, 1);
  const values = range.getValues();
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0] || String(values[i][0]).trim() === '') {
      values[i][0] = 'INJ';
      count++;
    }
  }
  if (count > 0) range.setValues(values);
  return 'Migration complete: ' + count + ' rows backfilled with INJ / 迁移完成：' + count + ' 行回填 INJ';
}

// ========== Inspection2.0 数据迁移：6 Sheet → 1 统一记录表 ==========
// 使用方式：在 GAS 编辑器中手动执行一次 migrateToInspectionRecords()
// 验证方式：执行 countInspectionRows() 对比新旧行数
function migrateToInspectionRecords() {
  var ss = SpreadsheetApp.openById("1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY");

  // 1. 创建或清空目标表
  var target = ss.getSheetByName("InspectionRecords");
  if (target) {
    ss.deleteSheet(target);
  }
  target = ss.insertSheet("InspectionRecords");
  target.setFrozenRows(1);

  var sheetNames = ["INJ-TB1", "INJ-TB2", "TF-TB1", "TF-TB2", "PK-TB1", "PK-TB2"];
  var headers = null;
  var allData = [];

  sheetNames.forEach(function (name) {
    var ws = ss.getSheetByName(name);
    if (!ws || ws.getLastRow() <= 1) {
      console.log("跳过空表: " + name);
      return;
    }

    // 从第一个非空表获取表头
    if (!headers) {
      headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
      console.log("表头来源: " + name + ", 列数: " + headers.length);
    }

    var data = ws.getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn()).getValues();
    var parts = name.split("-"); // e.g. ["INJ", "TB1"]

    // 补全空白的 B(车间)/C(工序) 列
    data.forEach(function (row) {
      if (!row[1] || row[1].toString().trim() === "") row[1] = parts[1]; // 车间
      if (!row[2] || row[2].toString().trim() === "") row[2] = parts[0]; // 工序
    });

    console.log("从 " + name + " 读取 " + data.length + " 行");
    allData = allData.concat(data);
  });

  console.log("总计: " + allData.length + " 行数据待写入");

  // 2. 写入表头
  if (headers) {
    target.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // 3. 分批写入数据
  var batch = 500;
  for (var i = 0; i < allData.length; i += batch) {
    var chunk = allData.slice(i, Math.min(i + batch, allData.length));
    target.getRange(i + 2, 1, chunk.length, chunk[0].length).setValues(chunk);
    SpreadsheetApp.flush();
  }

  console.log("迁移完成！共写入 " + allData.length + " 行至 InspectionRecords");
  return "OK: " + allData.length + " rows migrated";
}

// 验证函数：统计各表行数
function countInspectionRows() {
  var ss = SpreadsheetApp.openById("1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY");
  var sheetNames = ["INJ-TB1", "INJ-TB2", "TF-TB1", "TF-TB2", "PK-TB1", "PK-TB2"];
  var oldTotal = 0;

  sheetNames.forEach(function (name) {
    var ws = ss.getSheetByName(name);
    var rows = ws && ws.getLastRow() > 1 ? ws.getLastRow() - 1 : 0;
    console.log(name + ": " + rows + " 行");
    oldTotal += rows;
  });

  var newWs = ss.getSheetByName("InspectionRecords");
  var newRows = newWs && newWs.getLastRow() > 1 ? newWs.getLastRow() - 1 : 0;
  console.log("InspectionRecords: " + newRows + " 行");
  console.log("旧6表合计: " + oldTotal + " | 新表: " + newRows + " | 匹配: " + (oldTotal === newRows));
  return { oldTotal: oldTotal, newRows: newRows, match: oldTotal === newRows };
}

// ========== PM 分表合并：6 Sheet → 1 统一记录表 ==========
// 使用方式：在 GAS 编辑器中手动执行一次 migrateToPMRecords()
// 验证方式：执行 validatePMRecordsMigration() 对比新旧行数
function migrateToPMRecords() {
  var ss = SpreadsheetApp.openById(PM_DB_ID);
  var sheetNames = ["INJ-TB1", "INJ-TB2", "TF-TB1", "TF-TB2", "PK-TB1", "PK-TB2"];

  // 1. 创建或清空目标表
  var target = ss.getSheetByName(PM_RECORDS_SHEET_NAME);
  if (target) {
    ss.deleteSheet(target);
  }
  target = ss.insertSheet(PM_RECORDS_SHEET_NAME, 0);
  target.setFrozenRows(1);

  // 2. 获取表头（使用 INJ-TB1 的表头作为模板）
  var ws_head = ss.getSheetByName("INJ-TB1");
  var headers = ws_head.getRange(1, 1, 1, ws_head.getLastColumn()).getValues()[0];
  headers.push("工序", "车间"); // 末尾追加标识列
  target.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 3. 逐表迁移数据
  var totalRows = 0;
  sheetNames.forEach(function (name) {
    var ws = ss.getSheetByName(name);
    var lastRow = ws.getLastRow();
    if (lastRow <= 1) {
      console.log(name + ": 无数据，跳过");
      return;
    }
    var data = ws.getRange(2, 1, lastRow - 1, ws.getLastColumn()).getValues();
    var parts = name.split("-"); // e.g. ["INJ", "TB1"]
    var proc = parts[0];
    var wksp = parts[1];

    // 每行末尾追加 工序、车间
    var enriched = data.map(function (row) {
      row[21] = proc;  // V列 = 工序
      row[22] = wksp;  // W列 = 车间
      return row;
    });

    // 分批写入
    var batch = 500;
    for (var i = 0; i < enriched.length; i += batch) {
      var chunk = enriched.slice(i, Math.min(i + batch, enriched.length));
      target.getRange(totalRows + 2 + i, 1, chunk.length, chunk[0].length).setValues(chunk);
      SpreadsheetApp.flush();
    }
    totalRows += enriched.length;
    console.log(name + ": " + enriched.length + " 行已迁移");
  });

  console.log("迁移完成！总计 " + totalRows + " 行写入 " + PM_RECORDS_SHEET_NAME);
  return "OK: " + totalRows + " rows migrated to " + PM_RECORDS_SHEET_NAME;
}

// 验证迁移结果
function validatePMRecordsMigration() {
  var ss = SpreadsheetApp.openById(PM_DB_ID);
  var sheetNames = ["INJ-TB1", "INJ-TB2", "TF-TB1", "TF-TB2", "PK-TB1", "PK-TB2"];
  var oldTotal = 0;

  sheetNames.forEach(function (name) {
    var ws = ss.getSheetByName(name);
    var rows = ws && ws.getLastRow() > 1 ? ws.getLastRow() - 1 : 0;
    console.log(name + ": " + rows + " 行");
    oldTotal += rows;
  });

  var newWs = ss.getSheetByName(PM_RECORDS_SHEET_NAME);
  var newRows = newWs && newWs.getLastRow() > 1 ? newWs.getLastRow() - 1 : 0;
  console.log(PM_RECORDS_SHEET_NAME + ": " + newRows + " 行");
  console.log("旧6表合计: " + oldTotal + " | 新表: " + newRows + " | 匹配: " + (oldTotal === newRows));

  // 抽检：验证首行数据的工序/车间列
  if (newWs && newRows > 0) {
    var sample = newWs.getRange(2, 1, 1, newWs.getLastColumn()).getValues()[0];
    console.log("抽检首行 - PM No.: " + sample[0] + ", 工序(V): " + sample[21] + ", 车间(W): " + sample[22]);
  }

  return { oldTotal: oldTotal, newRows: newRows, match: oldTotal === newRows };
}

// ==========================================
// 交接班分表合并 - 迁移脚本
// 将旧6张 Shift_XXX_YYY 分表数据迁移到 Shift_Records 统一表
// ==========================================
function migrateToShiftRecords() {
  var ss = SpreadsheetApp.openById(SHIFT_DB_ID);
  var oldSheetNames = [
    "Shift_INJ_TB1", "Shift_INJ_TB2",
    "Shift_TF_TB1", "Shift_TF_TB2",
    "Shift_PK_TB1", "Shift_PK_TB2",
  ];

  // 获取最大列宽（submitFailure 写24列，upload_shift 写22列）
  var maxCols = 0;
  var head = null;
  for (var i = 0; i < oldSheetNames.length; i++) {
    var ws = ss.getSheetByName(oldSheetNames[i]);
    if (ws && ws.getLastRow() > 0) {
      var h = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
      if (h.length > maxCols) {
        head = h;
        maxCols = h.length;
      }
    }
  }
  if (!head) return "No data found in any source sheet / 源Sheet无数据";

  // 创建或清空 Shift_Records
  var wsNew = ss.getSheetByName(SHIFT_RECORDS_SHEET_NAME);
  if (!wsNew) {
    wsNew = ss.insertSheet(SHIFT_RECORDS_SHEET_NAME);
  } else {
    wsNew.clear();
  }
  // 写入新表头（原表头即可，车间/工序已在 O/P 列）
  var allRows = [head];

  var totalRows = 0;
  for (var j = 0; j < oldSheetNames.length; j++) {
    var wsSrc = ss.getSheetByName(oldSheetNames[j]);
    if (!wsSrc || wsSrc.getLastRow() <= 1) continue;

    var data = wsSrc.getRange(2, 1, wsSrc.getLastRow() - 1, wsSrc.getLastColumn()).getValues();
    for (var k = 0; k < data.length; k++) {
      if (data[k].some(function(c) { return c !== '' && c !== null && c !== undefined; })) {
        // 扩展到 maxCols 宽度（补齐空列）
        while (data[k].length < maxCols) data[k].push('');
        allRows.push(data[k]);
        totalRows++;
      }
    }
  }

  // 批量写入（一次性，避免逐行 appendRow 的性能问题）
  if (allRows.length > 0) {
    wsNew.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
  }

  return "Migration complete: " + totalRows + " rows migrated to " + SHIFT_RECORDS_SHEET_NAME +
    " / 迁移完成：共 " + totalRows + " 行";
}

// ==========================================
// 交接班分表合并 - 校验脚本
// 对比旧6表和新表的数据，确保迁移正确
// ==========================================
function validateShiftRecordsMigration() {
  var ss = SpreadsheetApp.openById(SHIFT_DB_ID);
  var oldSheetNames = [
    "Shift_INJ_TB1", "Shift_INJ_TB2",
    "Shift_TF_TB1", "Shift_TF_TB2",
    "Shift_PK_TB1", "Shift_PK_TB2",
  ];

  var oldTotal = 0;
  oldSheetNames.forEach(function(name) {
    var ws = ss.getSheetByName(name);
    if (ws && ws.getLastRow() > 1) oldTotal += ws.getLastRow() - 1;
    console.log(name + ": " + (ws && ws.getLastRow() > 1 ? ws.getLastRow() - 1 : 0) + " 行");
  });

  var newWs = ss.getSheetByName(SHIFT_RECORDS_SHEET_NAME);
  var newRows = newWs && newWs.getLastRow() > 1 ? newWs.getLastRow() - 1 : 0;
  console.log(SHIFT_RECORDS_SHEET_NAME + ": " + newRows + " 行");
  console.log("旧6表合计: " + oldTotal + " | 新表: " + newRows + " | 匹配: " + (oldTotal === newRows));

  // 抽检：验证首行和末行数据的工序/车间列（O列=车间, P列=工序）
  if (newWs && newRows > 0) {
    var lastCol = newWs.getLastColumn();
    var sampleRow = newWs.getRange(2, 1, 1, lastCol).getValues()[0];
    console.log("首行 - 编号: " + sampleRow[0] + ", 车间(O): " + sampleRow[14] + ", 工序(P): " + sampleRow[15]);

    if (newRows > 1) {
      var lastSample = newWs.getRange(newRows + 1, 1, 1, lastCol).getValues()[0];
      console.log("末行 - 编号: " + lastSample[0] + ", 车间(O): " + lastSample[14] + ", 工序(P): " + lastSample[15]);
    }

    // 检查 "Last" 标记行数
    var allData = newWs.getRange(2, 1, newRows, lastCol).getDisplayValues();
    var lastCount = allData.filter(function(r) { return r[21] === 'Last'; }).length;
    console.log("标记为 'Last' 的行数: " + lastCount);
  }

  return { oldTotal: oldTotal, newRows: newRows, match: oldTotal === newRows };
}

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
 * 备用工具函数 / Utility: available for future use
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
    // TODO: getCycleMonitorStandards() 已提供相同逻辑，后续可考虑复用避免重复读取
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

      var dataDate = row[5] instanceof Date
        ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(row[5]).trim();
      if (dataDate < cutoffStr || dataDate > todayStr) continue;

      var shift = String(row[2]).trim();
      var cycle = parseFloat(row[3]);
      if (isNaN(cycle)) continue;

      if (!machinesMap[machineNo]) {
        machinesMap[machineNo] = [];
      }

      // 提取班别类型：夜/早/中
      var shiftType = shift.charAt(0); // "夜班(07-19)" → "夜"
      var shiftOrder = { '夜': 0, '早': 1, '中': 2 };
      var dateShort = formatDateShort(dataDate);
      var dateLabel = dateShort + ' ' + shiftType;

      var std = standards[machineNo];
      var status = null; // 'red' | 'orange' | 'green' | null(无标准)
      var deviation = 0;
      if (std !== undefined) {
        deviation = Math.round((cycle - std) * 100) / 100;
        if (deviation < -1)      status = 'red';
        else if (deviation < 0)  status = 'green';
        else if (deviation <= 3) status = 'orange';
        else                     status = 'red';
      }

      machinesMap[machineNo].push({
        date: dateLabel,
        dateFull: dataDate,
        shift: shift,
        shiftOrder: shiftOrder[shiftType] !== undefined ? shiftOrder[shiftType] : 9,
        cycle: Math.round(cycle * 100) / 100,
        status: status,
        deviation: deviation
      });
    }

    // 按日期+班次排序（夜→早→中）后构建返回结果
    var result = [];
    machines.forEach(function(machineNo) {
      var points = machinesMap[machineNo] || [];
      // 排序：先按完整日期，再按班次顺序（夜0→早1→中2）
      points.sort(function(a, b) {
        if (a.dateFull !== b.dateFull) return a.dateFull < b.dateFull ? -1 : 1;
        return a.shiftOrder - b.shiftOrder;
      });
      var anomalyCount = points.filter(function(p) { return p.status === 'red'; }).length;
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
