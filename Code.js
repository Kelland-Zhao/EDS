const devWebPage =
  "https://script.google.com/a/macros/colpal.com/s/AKfycbz92tqMHCvBErGfu_yHxtSeL25lDOkuuKcNTPvkMJQ/dev";
const releaseWebPage =
  "https://script.google.com/a/colpal.com/macros/s/AKfycbyaQjG5yFGYxU825DrODhSLl2bdfbYKpqAH4qOIzKoTJ4b-5qU/exec";
const userLogInformationId = "1ecEx7G_FX7DAJ_8cm1AxSaN2h95IVo8n-W4WMX-g1m4";
const webIconUrl =
  "https://images.ctfassets.net/m3056igwnpsm/2QQOLoOlu2v9JFVVjTnsrz/8fea197464768353c908b0c2c9d0edb3/EDS.png";

var Route = {};

Route.path = function (route, callback) {
  Route[route] = callback;
};

function doGet(e) {
  Route.path("PM_Plan", loadPM_Plan);
  Route.path("PMtask", loadPM_Task);
  Route.path("Shift", loadShift);
  Route.path("addItem_manage", loadaddItem_manage);
  Route.path("tmp_stop_machine", tmp_stop_machine);
  Route.path("PointCheck", PointCheck);
  Route.path("MaintenanceReport_Manage", MaintenanceReport_Manage);
  Route.path("ViewHistory", loadViewHistory);
  Route.path("Navigation", loadNavigation);
  Route.path("home_new_1.0", loadhome_new);
  Route.path("Shift_1.0", loadShift_new);
  Route.path("PM_Plan_1.0", loadPM_Plan_new);
  Route.path("PM_Task_1.0", loadPM_Task_new);
  Route.path("PM_Production_Confirm", loadPM_Production_Confirm);
  //   Route.path("failureReport", loadFailureReport_new);
  Route.path("FailureReport_Upload", loadFailureReport_Upload);
  Route.path("FailureReport_Manage", loadFailureReport_Manage);
  Route.path("FailureReport_Progress", loadFailureReport_Progress);
  Route.path("FailureReport_View", loadFailureReport_View);
  Route.path("FailureReport_Followup", loadFailureReport_Followup);
  Route.path("FailureReport_Followup_Manage", loadFailureReport_Followup_Manage);
  Route.path("FailureReport_Followup_Verify", loadFailureReport_Followup_Verify);
  Route.path("MoldSurfaceClean", loadMoldSurfaceClean); // Changed to MoldSurfaceClean
  Route.path("TaskManagement", loadTaskManagement);
  Route.path("PersonnelAssignment", loadPersonnelAssignment);
  Route.path("TaskEdit", loadTaskEdit);
  Route.path("PM_RecordQuery", loadPM_RecordQuery); // 新增记录查询页面路由
  Route.path("Inspection2.0", loadInspection2_0); // 新增点检2.0路由
  Route.path("ProcessSamplingInspection", loadProcessSamplingInspection); // 新增工艺抽检路由
  Route.path("PM_ShiftFollowUp", loadPM_ShiftFollowUp); // 新增三班转保养跟进页面路由
  Route.path("Handover_1.0", loadHandover_1_0); // 新增交接班页面路由
  Route.path("Fault_Record_1.0", loadFault_Record_1_0); // 新增故障记录页面路由
  Route.path("FailureReport_Template", loadFailureReport_Template);
  Route.path("ProjectTracking", loadProjectTracking);

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
      .setTitle("登录")
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
    .setTitle("保养班组确认/ PM Production Team confirmation")
    .setFaviconUrl(webIconUrl);
}

// 新增：记录查询页面加载函数
function loadPM_RecordQuery() {
  let webPage = getReleaseWebPage();
  return render("PM_RecordQuery", { webPage: webPage })
    .setTitle("记录查询")
    .setFaviconUrl(webIconUrl);
}

// 新增：三班转保养跟进页面加载函数
function loadPM_ShiftFollowUp() {
  let webPage = getReleaseWebPage();
  return render("PM_ShiftFollowUp", { webPage: webPage })
    .setTitle("三班转保养跟进 / PM Shift Follow-up")
    .setFaviconUrl(webIconUrl);
}

// --- 新增任务编辑页面的加载函数 ---
function loadTaskEdit() {
  let webPage = getReleaseWebPage();
  return render("TaskEdit", { webPage: webPage })
    .setTitle("任务清单编辑 / Task List Edit")
    .setFaviconUrl(webIconUrl);
}

// --- 新增页面加载函数 ---
function loadTaskManagement() {
  let webPage = getReleaseWebPage();
  return render("TaskManagement", { webPage: webPage })
    .setTitle("任务管理 / Task Management")
    .setFaviconUrl(webIconUrl);
}

// --- 新增人员分配页面的加载函数 ---
function loadPersonnelAssignment() {
  let webPage = getReleaseWebPage();
  return render("PersonnelAssignment", { webPage: webPage })
    .setTitle("人员分配 / Personnel Assignment")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Task_new() {
  let webPage = getReleaseWebPage();
  return render("PM_Task_1.0", { webPage: webPage })
    .setTitle("保养任务/ PM Task")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Plan_new() {
  let webPage = getReleaseWebPage();
  return render("PM_Plan_1.0", { webPage: webPage })
    .setTitle("保养计划 PM Plan")
    .setFaviconUrl(webIconUrl);
}

function loadShift_new() {
  let webPage = getReleaseWebPage();
  return render("Shift_1.0", { webPage: webPage })
    .setTitle("交接班/ Handover")
    .setFaviconUrl(webIconUrl);
}

// 新增：交接班页面加载函数
function loadHandover_1_0() {
  let webPage = getReleaseWebPage();
  return render("Handover_1.0", { webPage: webPage })
    .setTitle("交接班 / Handover")
    .setFaviconUrl(webIconUrl);
}

function loadFailureReport_Template() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Template", { webPage: webPage })
    .setTitle("故障报告模板 / Failure Report Template")
    .setFaviconUrl(webIconUrl);
}

function loadProjectTracking() {
  let webPage = getReleaseWebPage();
  return render("ProjectTracking", { webPage: webPage })
    .setTitle("项目跟进 / Project Tracking")
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
          defaultVerifierEmail: defaultVerifierEmail
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
    const dataForSheet = Object.assign({}, data);
    delete dataForSheet.photo;
    delete dataForSheet.fault_category_text;
    delete dataForSheet._editMode;
    ws.getRange(rowIndex, 11).setValue(JSON.stringify(dataForSheet));

    // 编辑模式：删除旧 PDF + 版本化文件名
    let pdfVersionSuffix = '';
    if (isEditMode) {
      const oldCellJ = values[rowIndex - 1][9];
      if (oldCellJ) {
        const oldMatch = String(oldCellJ).match(/HYPERLINK\("([^"]+)","([^"]*)"\)/);
        if (oldMatch) {
          try {
            const oldUrl = oldMatch[1];
            const idMatch = oldUrl.match(/\/d\/([^\/]+)/);
            if (idMatch) DriveApp.getFileById(idMatch[1]).setTrashed(true);
          } catch (e) { /* 旧文件不存在则忽略 */ }
          const oldName = oldMatch[2] || '';
          const vMatch = oldName.match(/_v(\d+)\.pdf$/);
          const newVer = vMatch ? parseInt(vMatch[1]) + 1 : 2;
          pdfVersionSuffix = '_v' + newVer;
        }
      }
    }

    // 生成 PDF 并写入 J 列
    const pdfBlob = generateFailureReportPDF_(data);
    const reportNo = String(data.case_code || '').trim();
    const workshop = String(values[rowIndex - 1][4] || '').trim();
    const processFromRow = String(values[rowIndex - 1][5] || '').trim();
    const fileName = reportNo + '_' + workshop + '_' + processFromRow + pdfVersionSuffix + '.pdf';
    pdfBlob.setName(fileName);
    const folder = DriveApp.getFolderById('1mMKiMFOzbpqB_V2iIQcIqF2o4ZyRRcNL');
    const pdfFile = folder.createFile(pdfBlob);
    const fileUrl = pdfFile.getUrl();
    ws.getRange(rowIndex, 10).setFormula('=HYPERLINK("' + fileUrl + '","' + fileName + '")');

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const requiredPa = ['pa_plan', 'pa_who', 'pa_when', 'pa_verifier', 'pa_verifier_when'];
    const PA_INDEX_COL = 13;
    // 确保 paIndex 列有表头
    const paIndexHeader = wsFollow.getRange(1, PA_INDEX_COL + 1);
    if (!paIndexHeader.getValue()) paIndexHeader.setValue('paIndex');

    function isPaRowFilled(row) {
      const missing = requiredPa.filter(function(fid) { return !String((row && row[fid]) || '').trim(); });
      return missing.length < requiredPa.length;
    }

    const filledCount = (data.pa || []).filter(isPaRowFilled).length;
    if (filledCount === 0) {
      throw new Error('请至少完整填写1条预防对策后再提交 / Please complete at least one PA row');
    }

    if (isEditMode) {
      // 编辑模式：按 paIndex 精确匹配，同步更新已有跟进记录
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
          '进行中 / Ongoing',
          nowYmd,
          nowYmd,
          fileUrl,
          '未验证 / Not Verified',
          paIdx
        ];

        if (existingMap[paIdx] !== undefined) {
          const existing = existingMap[paIdx].data;
          newRow[8] = String(existing[8] || '进行中 / Ongoing').trim();
          newRow[9] = String(existing[9] || nowYmd).trim();
          newRow[10] = nowYmd;
          newRow[12] = String(existing[12] || '未验证 / Not Verified').trim();
          usedExisting.add(paIdx);
          wsFollow.getRange(existingMap[paIdx].rowIndex, 1, 1, newRow.length).setValues([newRow]);
        } else {
          wsFollow.getRange(wsFollow.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
        }
      });

      const existingIndices = Object.keys(existingMap).map(Number);
      const toDelete = existingIndices
        .filter(function(idx) { return !usedExisting.has(idx); })
        .map(function(idx) { return existingMap[idx].rowIndex; })
        .sort(function(a, b) { return b - a; });
      toDelete.forEach(function(rowIdx) { wsFollow.deleteRow(rowIdx); });

    } else {
      // 新建模式：创建新跟进记录（含 paIndex 列）
      const followRows = [];
      data.pa.forEach(function(row, paIdx) {
        const missing = requiredPa.filter(function(fid) { return !String((row && row[fid]) || '').trim(); });
        if (missing.length === requiredPa.length) return;
        const followId = 'FU' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmssSSS') + Math.floor(100 + Math.random() * 900);
        followRows.push([
          followId,
          String(data.case_code || '').trim(),
          String((row && row.type) || '').trim(),
          String((row && row.pa_plan) || '').trim(),
          String((row && row.pa_who) || '').trim(),
          String((row && row.pa_when) || '').trim(),
          String((row && row.pa_verifier) || '').trim(),
          String((row && row.pa_verifier_when) || '').trim(),
          '进行中 / Ongoing',
          nowYmd,
          nowYmd,
          fileUrl,
          '未验证 / Not Verified',
          paIdx
        ]);
      });
      wsFollow.getRange(wsFollow.getLastRow() + 1, 1, followRows.length, followRows[0].length).setValues(followRows);
    }

    return JSON.stringify({ success: true, fileUrl: fileUrl, fileName: fileName });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
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

  let rcaRows = '';
  (data.rca || []).forEach(function(r, i) {
    rcaRows += '<tr>' +
      '<td style="' + td + 'text-align:center;font-weight:bold">Why' + (i+1) + '</td>' +
      '<td style="' + td + '">' + e(r.desc) + '&nbsp;</td>' +
      '<td style="' + td + '">' + e(r.cause) + '&nbsp;</td>' +
      '<td style="' + td + '">' + e(r.action) + '&nbsp;</td>' +
      '</tr>';
  });

  let paHeader = '<tr><th style="' + th + 'width:90px">\u5e8f\u53f7<br>No.</th>';
  (data.pa_fields || []).forEach(function(f) {
    paHeader += '<th style="' + th + '">' + e(f.cn) + '<br>' + e(f.en) + '</th>';
  });
  paHeader += '</tr>';
  let paRows = '';
  (data.pa || []).forEach(function(p) {
    let cells = '<td style="' + td + 'font-weight:bold">' + e(p.type) + '</td>';
    (data.pa_fields || []).forEach(function(f) {
      let v = p[f.id];
      if (/who|verifier/i.test(String(f.id || ''))) v = displayNameOnly(v);
      if (/date|when/i.test(String(f.id || ''))) v = formatDateYMD(v);
      cells += '<td style="' + td + '">' + e(v) + '&nbsp;</td>';
    });
    paRows += '<tr>' + cells + '</tr>';
  });

  const cats = data.fault_category_text || (data.fault_category || '').split(',').filter(function(v){return v;}).join(' / ');

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
    '<div style="font-size:9pt;margin-bottom:10px"><b>故障分类 Fault Category: </b>' + (e(cats) || '&nbsp;') + '</div>' +

    '<div style="' + sec + '">根本原因分析 / RCA Analysis</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">' +
    '<tr><th style="' + th + 'width:55px">层<br>Level</th><th style="' + th + '">描述 (Description)</th>' +
    '<th style="' + th + '">原因分析 (Cause)</th><th style="' + th + '">行动 (Action)</th></tr>' +
    rcaRows + '</table>' +

    '<div style="' + sec + '">预防对策 / Preventive Action</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">' +
    paHeader + paRows + '</table>' +
    '</body></html>';
}

// 新增：故障记录页面加载函数
function loadFault_Record_1_0() {
  let webPage = getReleaseWebPage();
  return render("Fault_Record_1.0", { webPage: webPage })
    .setTitle("故障记录 / Fault Record")
    .setFaviconUrl(webIconUrl);
}

function loadhome_new() {
  let webPage = getReleaseWebPage();
  return render("home_new_1.0", { webPage: webPage })
    .setTitle("Login/ 登录")
    .setFaviconUrl(webIconUrl);
}

function loadNavigation() {
  let webPage = getReleaseWebPage();
  return render("Navigation", { webPage: webPage })
    .setTitle("Navigation/ 导航")
    .setFaviconUrl(webIconUrl);
}

// 新增的模面清理页面的加载函数
function loadMoldSurfaceClean() {
  let webPage = getReleaseWebPage();
  return render("MoldSurfaceClean", { webPage: webPage })
    .setTitle("模面清理/ Mold Surface Clean") // Changed title
    .setFaviconUrl(webIconUrl);
}

// 新增的工艺抽检页面的加载函数
function loadProcessSamplingInspection() {
  let webPage = getReleaseWebPage();
  return render("Process_Inspection", { webPage: webPage })
    .setTitle("工艺抽检 / Process Inspection")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Plan(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  if (
    !intoWebUrl &&
    !intoWebLoginId &&
    !intoWebLoginName &&
    !intoWebLoginType
  ) {
    intoWebUrl = getReleaseWebPage();
    intoWebLoginID = "";
    intoWebLoginName = "";
    intoWebLoginType = "";
  }
  return render("PM_Plan", {
    webPage: intoWebUrl,
    intoWebID: intoWebLoginId,
    intoWebName: intoWebLoginName,
    intoWebType: intoWebLoginType,
  })
    .setTitle("AM/PM计划查询")
    .setFaviconUrl(webIconUrl);
}

function loadPM_Task() {
  let webPage = getReleaseWebPage();
  return render("PM_Task", { webPage: webPage })
    .setTitle("保养任务")
    .setFaviconUrl(webIconUrl);
}

function loadShift() {
  let webPage = getReleaseWebPage();
  return render("Shift", { webPage: webPage })
    .setTitle("交接班")
    .setFaviconUrl(webIconUrl);
}

function loadaddItem_manage() {
  let webPage = getReleaseWebPage();
  return render("addItem_manage", { webPage: webPage })
    .setTitle("三班项目管理")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告上传页面加载函数
function loadFailureReport_Upload() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Upload", { webPage: webPage })
    .setTitle("故障报告上传/ Upload Failure Report")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告管理页面加载函数
function loadFailureReport_Manage() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Manage", { webPage: webPage })
    .setTitle("故障报告管理/ Failure Report Management")
    .setFaviconUrl(webIconUrl);
}

// 新增：故障报告进度页面加载函数
function loadFailureReport_Progress() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Progress", { webPage: webPage })
    .setTitle("故障报告进度/ Failure Report Progress")
    .setFaviconUrl(webIconUrl);
}

function tmp_stop_machine() {
  let webPage = getReleaseWebPage();
  return render("tmp_stop_machine", { webPage: webPage })
    .setTitle("临时停机管理")
    .setFaviconUrl(webIconUrl);
}

function PointCheck(
  intoWebUrl,
  intoWebLoginId,
  intoWebLoginName,
  intoWebLoginType
) {
  console.log(intoWebUrl, intoWebLoginId, intoWebLoginName, intoWebLoginType);
  if (
    !intoWebUrl &&
    !intoWebLoginId &&
    !intoWebLoginName &&
    !intoWebLoginType
  ) {
    intoWebUrl = getReleaseWebPage();
    intoWebLoginID = "";
    intoWebLoginName = "";
    intoWebLoginType = "";
  }
  return render("PointCheck", {
    webPage: intoWebUrl,
    intoWebID: intoWebLoginId,
    intoWebName: intoWebLoginName,
    intoWebType: intoWebLoginType,
  })
    .setTitle("点检")
    .setFaviconUrl(webIconUrl);
}

function MaintenanceReport_Manage() {
  let webPage = getReleaseWebPage();
  return render("MaintenanceReport_Manage", { webPage: webPage })
    .setTitle("故障报告管理")
    .setFaviconUrl(webIconUrl);
}

function loadViewHistory() {
  let webPage = getReleaseWebPage();
  return render("ViewHistory", { webPage: webPage })
    .setTitle("查询数据")
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
    .setTitle("点检2.0 / Inspection 2.0")
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

    var wss = ss.getSheetByName(process + "-" + workshop);
    var datanew = wss
      .getRange(2, 1, wss.getLastRow() - 1, wss.getLastColumn())
      .getDisplayValues();

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

    let sheetName = [
      "INJ-TB1",
      "INJ-TB2",
      "TF-TB1",
      "TF-TB2",
      "PK-TB1",
      "PK-TB2",
    ];
    let ws_head = ss.getSheetByName("INJ-TB1");
    let head_record = ws_head
      .getRange(1, 1, 1, ws_head.getLastColumn())
      .getValues()[0];
    console.log("head_record", head_record);

    let record = [];
    sheetName.forEach((name) => {
      let wss = ss.getSheetByName(name);
      let lastRow = wss.getLastRow();
      if (lastRow > 1) {
        // 确保至少有数据行存在
        let values = wss
          .getRange(2, 1, lastRow - 1, wss.getLastColumn())
          .getValues();
        record = record.concat(values);
      }
    });
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

    // 计算前一周的周日（上一周）
    let lastWeekSunday = new Date(currentWeekSunday);
    lastWeekSunday.setDate(currentWeekSunday.getDate() - 7);

    // 计算后三周的周六（当前周+未来两周）
    let threeWeeksLaterSaturday = new Date(currentWeekSunday);
    threeWeeksLaterSaturday.setDate(currentWeekSunday.getDate() + 20); // 当前周+2周=20天

    const TIMEZONE = "Asia/Shanghai";
    const DATE_FORMAT = "yyyy-MM-dd";
    let lastWeekSundayStr = Utilities.formatDate(
      lastWeekSunday,
      TIMEZONE,
      DATE_FORMAT
    );
    let threeWeeksLaterSaturdayStr = Utilities.formatDate(
      threeWeeksLaterSaturday,
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
      lastWeekSundayStr,
      "到",
      threeWeeksLaterSaturdayStr
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
          dateStr >= lastWeekSundayStr &&
          dateStr <= threeWeeksLaterSaturdayStr
        ) {
          let rowNumber = idx + 2; // 数据开始于第2行
          matchedRows.push(rowNumber);

          if (dateStr >= lastWeekSundayStr && dateStr < currentWeekSundayStr) {
            hasLastWeekData = true;
          }

          if (dateStr >= currentWeekSundayStr && dateStr <= threeWeeksLaterSaturdayStr) {
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

    // 获取状态数据（优化：直接读Master_PM_Data合并表，替代6个分表循环，减少10次API调用）
    const STATUS_SHEET_DATE_COL = 5; // Plan PM Date 列
    let record_obj = [];
    let wsMaster = ss.getSheetByName("Master_PM_Data");
    let lastRowMaster = wsMaster.getLastRow();
    if (lastRowMaster > 1) {
      let masterDates = wsMaster.getRange(2, STATUS_SHEET_DATE_COL, lastRowMaster - 1, 1).getValues();
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
        if (dateStr >= lastWeekSundayStr && dateStr <= threeWeeksLaterSaturdayStr) {
          matchedStatusRows.push(idx + 2);
        }
      });

      if (matchedStatusRows.length > 0) {
        let minStatusRow = Math.min.apply(null, matchedStatusRows);
        let maxStatusRow = Math.max.apply(null, matchedStatusRows);
        let statusRowsToFetch = maxStatusRow - minStatusRow + 1;
        // 只读B-J列（9列）：PmStatus[0], Plan PM Date[3], Workcenter[8]
        let rowValues = wsMaster
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
        startDate: lastWeekSundayStr,
        endDate: threeWeeksLaterSaturdayStr,
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
  var SheetName = "Shift_" + process + "_" + workshop;
  var code_update = code + "true";
  var url =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss = SpreadsheetApp.openByUrl(url);
  var ws = ss.getSheetByName(SheetName);
  var data = ws
    .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
    .getDisplayValues();
  for (i = 0; i < data.length; i++) {
    var a = data[i][0].toString() + data[i][12].toString();
    data[i][0] = a;
  }
  var codelist = data.map(function (r) {
    return r[0];
  });
  var position = codelist.indexOf(code_update);
  ws.getRange(position + 2, 17).setValue("Y");
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
    var SheetName = process + "-" + workshop;
    var url =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss = SpreadsheetApp.openByUrl(url);
    var ws = ss.getSheetByName(SheetName);
    var arrWsPmNo = ws
      .getRange(2, 1, ws.getLastRow() - 1, 1)
      .getDisplayValues()
      .map((v) => {
        return v[0].toString();
      });
    let positionPmNo = arrWsPmNo.indexOf(info[0].toString());
    if (positionPmNo == -1) {
      ws.appendRow(info);
    } else {
      ws.getRange(positionPmNo + 2, 1, 1, info.length).setValues([info]);
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
    var ws = ss.getSheetByName(PM_Info.process + "-" + PM_Info.workshop);
    var allData = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();
    
    Logger.log("=== getPMrecord 调试信息 ===");
    Logger.log("查询条件 - Workcenter: " + PM_Info.workcenter + ", Plan_SD: " + PM_Info.Plan_SD);
    Logger.log("总数据行数: " + allData.length);
    
    allData.forEach(function(v, index) {
      Logger.log("第" + (index + 2) + "行 - v[9](Workcenter): '" + v[9] + "', v[4](Plan PM Date): '" + v[4] + "'");
    });
    
    var data = allData.filter((v) => {
      var workcenterMatch = v[9].toString().trim() == PM_Info.workcenter.toString().trim();
      var dateMatch = v[4].toString().trim() == PM_Info.Plan_SD.toString().trim();
      Logger.log("过滤判断 - Workcenter匹配: " + workcenterMatch + ", 日期匹配: " + dateMatch);
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
    var ws_PM = ss_PM.getSheetByName(SheetName_PM);
    var ws_APT = ss_APT.getSheetByName(SheetName_APT);
    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, 1)
      .getDisplayValues();
    var data_PM = ws_PM
      .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
      .getDisplayValues();
    /*-----生成code list-----------------------------*/
    var codelist = data_PM.map(function (r) {
      return r[0].toString();
    });
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
      ws_PM.appendRow(arrJsonInfo);
    } else {
      ws_PM
        .getRange(position + 2, 1, 1, arrJsonInfo.length)
        .setValues([arrJsonInfo]); //写入完成情况和备注
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
    var ws_PM = ss_PM.getSheetByName(SheetName_PM);
    var ws_APT = ss_APT.getSheetByName(SheetName_APT);
    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, 1)
      .getDisplayValues();
    var data_PM = ws_PM
      .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
      .getDisplayValues();
    /*-----生成code list-----------------------------*/
    var codelist = data_PM.map(function (r) {
      return r[0].toString();
    });
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
      ws_PM.appendRow(arrJsonInfo);
    } else {
      ws_PM
        .getRange(position + 2, 1, 1, arrJsonInfo.length)
        .setValues([arrJsonInfo]); //写入完成情况和备注
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
    var ws = ss.getSheetByName(SheetName_1);
    var data = ws
      .getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn())
      .getDisplayValues();
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
    var ws_PM = ss_PM.getSheetByName(SheetName_2);
    var arrWs_PM_No = ws_PM
      .getRange(2, 1, ws_PM.getLastRow() - 1, 1)
      .getDisplayValues()
      .map((v) => {
        return v[0].toString();
      });
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

function getData_additem_manage(workshop, process) {
  try {
    var url_PM_Plan =
      "https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/";
    var ss_PM_Plan = SpreadsheetApp.openByUrl(url_PM_Plan);
    var ws_PM_Plan = ss_PM_Plan.getSheetByName("Total PM Plan List");
    var data_PM_Plan = ws_PM_Plan
      .getRange(2, 1, ws_PM_Plan.getLastRow() - 1, ws_PM_Plan.getLastColumn())
      .getDisplayValues();

    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
      .getDisplayValues();

    var url_workcenter =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_workcenter = SpreadsheetApp.openByUrl(url_workcenter);
    var ws_workcenter = ss_workcenter.getSheetByName(
      "Workcenter & Mold Matrix"
    );
    var data_workcenter = ws_workcenter
      .getRange(3, 1, ws_workcenter.getLastRow(), ws_workcenter.getLastColumn())
      .getDisplayValues();

    var SheetName_1 = "Shift_" + process + "_" + workshop;
    var ws_shift = ss_PM_Plan.getSheetByName(SheetName_1);
    var data_shift = ws_shift
      .getRange(2, 1, ws_shift.getLastRow() - 1, ws_shift.getLastColumn())
      .getDisplayValues();
    var SheetName_2 = "APT_" + process + "_" + workshop;
    var ws_APT = ss_PM_Plan.getSheetByName(SheetName_2);
    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, ws_APT.getLastColumn())
      .getDisplayValues();

    var url_TMP =
      "https://docs.google.com/spreadsheets/d/1iBhTmRl1KjtcSO96rfWhQowiZ4E1jqJohC5wEjF_7rQ/";
    var ss_TMP = SpreadsheetApp.openByUrl(url_TMP);
    var ws_TMP = ss_TMP.getSheetByName("Record");
    var data_TMP = ws_TMP
      .getRange(2, 1, ws_TMP.getLastRow() - 1, ws_TMP.getLastColumn())
      .getDisplayValues();

    var data = {
      PMPlan: data_PM_Plan,
      userID: data_userID,
      machine_info: data_workcenter,
      data_shift: data_shift,
      data_APT: data_APT,
      data_TMP: data_TMP,
    };
    return ["OK", JSON.stringify(data)];
  } catch (e) {
    return ["NO", "创建的任务记录获取出错：" + toString()];
  }
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
    var wsFromId = ss_database.getSheetByName(
      "Shift_" + processFromId + "_" + workshopFromId
    );
    var data_shift = wsFromId
      .getRange(2, 1, wsFromId.getLastRow() - 1, wsFromId.getLastColumn())
      .getDisplayValues()
      .filter((v) => {
        return v[21] == "Last";
      });
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
    var wsFromId = ss_database.getSheetByName(
      "Shift_" + processFromId + "_" + workshopFromId
    );
    var data_shift = wsFromId
      .getRange(2, 1, wsFromId.getLastRow() - 1, wsFromId.getLastColumn())
      .getDisplayValues()
      .filter((v) => {
        return v[21] == "Last";
      });
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

function upload_additem_manage(data) {
  try {
    data.status = "Ongoing";
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var url_TMP =
      "https://docs.google.com/spreadsheets/d/1iBhTmRl1KjtcSO96rfWhQowiZ4E1jqJohC5wEjF_7rQ/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ss_TMP = SpreadsheetApp.openByUrl(url_TMP);
    var SheetName_shift = "Shift_" + data.process + "_" + data.workshop;

    var ws_shift = ss_database.getSheetByName(SheetName_shift);
    var data_shift = ws_shift
      .getRange(2, 1, ws_shift.getLastRow() - 1, ws_shift.getLastColumn())
      .getDisplayValues();

    var SheetName_APT = "APT_" + data.process + "_" + data.workshop;
    var ws_APT = ss_database.getSheetByName(SheetName_APT);

    var data_APT = ws_APT
      .getRange(2, 1, ws_APT.getLastRow() - 1, ws_APT.getLastColumn())
      .getDisplayValues();
    var ws_TMP = ss_TMP.getSheetByName("Record");

    /*******************写入【临时停机申请】**********************/
    if (data.result == true) {
      ws_TMP.appendRow([
        data.applier,
        data.submitDate,
        data.taskDescription,
        data.workshop,
        data.Mold_Tooling,
        data.type,
        data.bookDate,
        data.shift,
        data.workcenter,
        data.duration,
      ]);
    }
    /*************************************************************/

    /*********************database写入[Y]是否转保养清单*************/
    var code = data.code + "true";
    data_shift.forEach((r) => {
      r[17] = r[0].toString() + r[12].toString();
    });
    var codelist = data_shift.map((r) => {
      return r[17];
    });
    var position = codelist.indexOf(code);
    ws_shift.getRange(position + 2, 19).setValue("Y");
    /************************************************************/

    /***********************database APT写入保养清单条目***********/
    ws_APT.appendRow([
      data.code,
      data.machine_type,
      data.workcenter,
      data.module,
      data.taskDescription,
      data.duration,
      data.No_resources,
      data.bookDate,
      data.shift,
      data.result,
      data.status,
    ]);
    /***********************************************************/
    return ["OK", true];
  } catch (e) {
    return ["NO", "创建任务保存出错：" + e.toString()];
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
    var SheetName = "Shift_" + obj.process + "_" + obj.workshop;
    var ws_shift = ss_database.getSheetByName(SheetName);
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
    var ws_shift = ss_database.getSheetByName(SheetName);
    var arrIssueNo = ws_shift
      .getRange(2, 1, ws_shift.getLastRow() - 1, 1)
      .getValues()
      .map((v) => {
        return v[0].toString();
      });
    var position = arrIssueNo.indexOf(obj.issueNo.toString());
    if (position == -1) {
      ws_shift.appendRow([
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
      ]);
    } else {
      var arrIssueNoRecord = ws_shift
        .getRange(position + 2, 1, 1, ws_shift.getLastColumn())
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
        .getRange(position + 2, 1, 1, arrNewRecord.length)
        .setValues([arrNewRecord]);
    }
    return ["OK", true];
  } catch (e) {
    return ["NO", "交接班数据保存出错：" + e.toString()];
  }
}

function getData_MaintenanceReport_Manage(workshop, process) {
  try {
    var url_userID =
      "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
    var ss_userID = SpreadsheetApp.openByUrl(url_userID);
    var ws_userID = ss_userID.getSheetByName("userID");
    var data_userID = ws_userID
      .getRange(3, 1, ws_userID.getLastRow() - 2, 25)
      .getDisplayValues();
    var SheetName = "Shift_" + process + "_" + workshop;
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ws_database = ss_database.getSheetByName(SheetName);
    var data_shift = ws_database
      .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
      .getDisplayValues();
    var data = {
      user: data_userID,
      shift: data_shift,
      process: process,
      workshop: workshop,
      type: "S&C",
    }; //
    return ["OK", JSON.stringify(data)];
  } catch (e) {
    return ["NO", e.toString()];
  }
}

function add_MaintenanceReport(obj) {
  try {
    var SheetName = "Shift_" + obj.user[0][14] + "_" + obj.user[0][13];
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ws_database = ss_database.getSheetByName(SheetName);
    var data_shift = ws_database
      .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
      .getDisplayValues();
    data_shift.forEach((r) => {
      r[20] = r[0] + r[5];
    });
    var codeList = data_shift.map((r) => {
      return r[20];
    });
    obj.data.forEach((r) => {
      var position = codeList.indexOf(r.code + "已解决");
      ws_database.getRange(position + 2, 20).setValue("待完成");
    });
    return ["OK", true];
  } catch (e) {
    return ["NO", "增加故障报告出错：" + e.toString()];
  }
}

function delete_MaintenanceReport(obj) {
  try {
    var SheetName = "Shift_" + obj.user[0][14] + "_" + obj.user[0][13];
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ws_database = ss_database.getSheetByName(SheetName);
    var data_shift = ws_database
      .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
      .getDisplayValues();
    data_shift.forEach((r) => {
      r[20] = r[0] + r[5];
    });
    var codeList = data_shift.map((r) => {
      return r[20];
    });
    obj.data.forEach((r) => {
      var position = codeList.indexOf(r.code + "已解决");
      ws_database.getRange(position + 2, 20).setValue("无需填写");
    });
    return ["OK", true];
  } catch (e) {
    return ["NO", "删除故障报告出错：" + e.toString()];
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
    var SheetName = "Shift_" + process + "_" + workshop;
    var url_database =
      "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
    var ss_database = SpreadsheetApp.openByUrl(url_database);
    var ws_database = ss_database.getSheetByName(SheetName);
    var data_shift = ws_database
      .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
      .getDisplayValues();
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
  var SheetName = "Shift_" + process + "_" + workshop;
  var url_database =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss_database = SpreadsheetApp.openByUrl(url_database);
  var ws_database = ss_database.getSheetByName(SheetName);
  var data_shift = ws_database
    .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
    .getDisplayValues();

  var data = { user: data_userID, shift: data_shift };
  return data;
}

function getData_TMP_stop_machine(workshop, process) {
  var url_userID =
    "https://docs.google.com/spreadsheets/d/1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM/";
  var ss_userID = SpreadsheetApp.openByUrl(url_userID);
  var ws_userID = ss_userID.getSheetByName("userID");
  var data_userID = ws_userID
    .getRange(3, 1, ws_userID.getLastRow() - 2, 16)
    .getDisplayValues();
  var SheetName = "Shift_" + process + "_" + workshop;
  var url_database =
    "https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/";
  var ss_database = SpreadsheetApp.openByUrl(url_database);
  var ws_database = ss_database.getSheetByName(SheetName);
  var data_shift = ws_database
    .getRange(2, 1, ws_database.getLastRow() - 1, ws_database.getLastColumn())
    .getDisplayValues();
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
    let ws_PointCheckData = ss_PointCheck.getSheetByName(
      process + "-" + workshop
    );
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
    let nimWorkcenters_raw = []; // NIM机台号原始列表（不做排除，传给前端）
    let excludedCombinations = []; // 当周已检查的"机台号+任务类型"组合
    
    // 注塑工序（INJ）使用新的机台号获取逻辑
    if (process === "INJ") {
      // ========== NIM机台号数据准备 ==========
      // 1. 从 Workcenter_List_IM 获取数据（从第1行开始）
      let ss_WorkcenterList = SpreadsheetApp.openById("1RQql-PrcBWiAQNeg7hQKcocpllSUMRhT5XPrDTVWoBY");
      let ws_WorkcenterList_IM = ss_WorkcenterList.getSheetByName("Workcenter_List_IM");
      let data_WorkcenterList_IM = ws_WorkcenterList_IM
        .getRange(1, 1, ws_WorkcenterList_IM.getLastRow(), 2)
        .getDisplayValues();
      
      // 2. 筛选机型为 ENG、FCS 或 6AX
      let filtered_WorkcenterList_IM = data_WorkcenterList_IM.filter(row => {
        let machineType = row[1] ? row[1].toString().trim() : "";
        return machineType === "ENG" || machineType === "FCS" || machineType === "6AX";
      });
      
      // 3. 与 MachineList 的D列机台号取交集
      let ws_MachineList = ss_PointCheck.getSheetByName("MachineList");
      let data_MachineList_D = ws_MachineList
        .getRange(2, 4, ws_MachineList.getLastRow() - 1, 1)
        .getDisplayValues()
        .map(row => row[0].toString().trim());
      let nimWorkcenterSet = new Set(data_MachineList_D);
      
      // 提取 Workcenter_List_IM 的 NIM 机台号
      let nimWorkcenters_from_IM = filtered_WorkcenterList_IM
        .map(row => row[0].toString().trim())
        .filter(machineCode => machineCode && nimWorkcenterSet.has(machineCode));
      
      // 4. 从 Workcenter_List_Others 获取数据
      let ws_WorkcenterList_Others = ss_WorkcenterList.getSheetByName("Workcenter_List_Others");
      let nimWorkcenters_from_Others = [];
      if (ws_WorkcenterList_Others) {
        let data_WorkcenterList_Others = ws_WorkcenterList_Others
          .getRange(2, 1, ws_WorkcenterList_Others.getLastRow() - 1, 3)
          .getDisplayValues();
        
        // 筛选 Process = "IM"
        nimWorkcenters_from_Others = data_WorkcenterList_Others
          .filter(row => {
            let process = row[2] ? row[2].toString().trim() : "";
            return process === "IM";
          })
          .map(row => row[0].toString().trim())
          .filter(machineCode => machineCode && nimWorkcenterSet.has(machineCode));
      }
      
      // 5. 合并 NIM 机台号（不去重，因为数据源不会重复）
      nimWorkcenters_raw = [...nimWorkcenters_from_IM, ...nimWorkcenters_from_Others];
            
      // ========== 获取当周已检查记录（传递机台号+任务类型组合） ==========
      let ws_INJ_TB1 = ss_PointCheck.getSheetByName("INJ-TB1");
      let ws_INJ_TB2 = ss_PointCheck.getSheetByName("INJ-TB2");
      
      let totalRows = 0;
      let matchedRows = 0;
      
      [ws_INJ_TB1, ws_INJ_TB2].forEach(ws => {
        if (ws && ws.getLastRow() > 1) {
          let data = ws.getRange(2, 1, ws.getLastRow() - 1, 9).getDisplayValues();
          totalRows += data.length;
                    
          data.forEach(row => {
            let colA = row[0] ? row[0].toString().trim() : "";
            let colD = row[3] ? row[3].toString().trim() : ""; // D列：任务类型
            let colI = row[8] ? row[8].toString().trim() : ""; // I列：机台号
            
            // 从A列提取周次
            let weekMatch = colA.match(/(\d{4}W\d{2})/);
            if (weekMatch && weekMatch[1] === now_YearWeek && colI && colD) {
              matchedRows++;
              excludedCombinations.push({
                workcenter: colI,
                machineType: colD
              });
            }
          });
        }
      });
      
      // 注意：不再在后端合并 NIM 和 IM 机台号
      // workcenter_list 保持为空，由前端动态生成
      workcenter_list = [];
    } else if (process === "TF" || process === "PK") {
      // ========== TF和PK工序：获取当周已检查记录 ==========
      let sheetName1 = process + "-TB1";
      let sheetName2 = process + "-TB2";
      let ws_Process_TB1 = ss_PointCheck.getSheetByName(sheetName1);
      let ws_Process_TB2 = ss_PointCheck.getSheetByName(sheetName2);
      
      [ws_Process_TB1, ws_Process_TB2].forEach(ws => {
        if (ws && ws.getLastRow() > 1) {
          let data = ws.getRange(2, 1, ws.getLastRow() - 1, 9).getDisplayValues();
          
          data.forEach(row => {
            let colA = row[0] ? row[0].toString().trim() : "";
            let colD = row[3] ? row[3].toString().trim() : ""; // D列：任务类型
            let colI = row[8] ? row[8].toString().trim() : ""; // I列：机台号
            
            // 从A列提取周次
            let weekMatch = colA.match(/(\d{4}W\d{2})/);
            
            if (weekMatch && weekMatch[1] === now_YearWeek && colI && colD) {
              excludedCombinations.push({
                workcenter: colI,
                machineType: colD
              });
            }
          });
        }
      });
      
      // TF/PK工序保持workcenter_list为空，由前端基于MachineList生成
      workcenter_list = [];
    }
    
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

    // 将data_RunInfo转换为一维数组，方便查找
    let runInfoValues = data_RunInfo.map(row => row[0].toString().trim());

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
    let sheetNames = ss_PointCheck.getSheets().map(sheet => sheet.getName());
    let allHistoricalRecords = [];
    
    sheetNames.forEach(sheetName => {
      if (sheetName.includes("-") && sheetName.startsWith(process + "-")) {
        let ws = ss_PointCheck.getSheetByName(sheetName);
        if (ws && ws.getLastRow() > 1) {
          let lastRow = ws.getLastRow();
          let data = ws.getRange(2, 1, lastRow - 1, 17) // 获取A到Q列的所有数据
            .getDisplayValues();
          
          data.forEach(row => {
            if (row[0] && row[0].toString().trim()) { // 确保Code不为空
              let record = {
                Code: row[0] ? row[0].toString().trim() : "",
                Workshop: row[1] ? row[1].toString().trim() : "",
                // Process: row[2] ? row[2].toString().trim() : "",
                MachineType: row[3] ? row[3].toString().trim() : "",
                // PointChecker: row[5] ? row[5].toString().trim() : "",
                // Ownner: row[6] ? row[6].toString().trim() : "",
                SubmitDate: row[7] ? row[7].toString().trim() : "",
                Workcenter: row[8] ? row[8].toString().trim() : ""
              };
              allHistoricalRecords.push(record);
            }
          });
        }
      }
    });

    var info = {
      machine_info: filtered_machine_info,
      user: data_userID,
      tasklist: filtered_tasklist,
      origin_machine_info: filtered_origin_machine_info,
      pointCheckInfo: filtered_pointCheckInfo,
      current_PointCheckInfo: filtered_current_PointCheckInfo,
      history_PointCheckInfo: filtered_history_PointCheckInfo,
      workcenter_list: workcenter_list, // 注塑工序的机台号列表（后端不再使用，保留兼容性）
      nimWorkcenters_raw: nimWorkcenters_raw, // NIM机台号原始列表（前端动态过滤）
      excludedCombinations: excludedCombinations, // 当周已检查的"机台号+任务类型"组合
      currentYearWeek: now_YearWeek, // 当前周次
      allHistoricalRecords: allHistoricalRecords, // 所有历史点检记录的完整对象数据
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
    let SheetName = obj.process + "-" + obj.workshop;
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
    let SheetName = obj.process + "-" + obj.workshop;
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
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let ss = SpreadsheetApp.openById(id);
  let sheetName = [
    "Shift_INJ_TB1",
    "Shift_INJ_TB2",
    "Shift_TF_TB1",
    "Shift_TF_TB2",
    "Shift_PK_TB1",
    "Shift_PK_TB2",
  ];
  let head = ss
    .getSheetByName(sheetName[0])
    .getRange(1, 1, 1, ss.getSheetByName(sheetName[0]).getLastColumn())
    .getValues()[0];
  let content = [];
  sheetName.forEach((name) => {
    let ws = ss.getSheetByName(name);
    let lastRow = ws.getLastRow();
    if (lastRow > 1) {
      // 确保至少有数据行存在
      let values = ws
        .getRange(2, 1, lastRow - 1, ws.getLastColumn())
        .getValues();
      content = content.concat(values);
    }
  });

  let currentDate = new Date();
  let date30DaysAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
  );

  // 优化方案：先按状态分类，再按时间筛选，避免重复
  let unresolvedItems = content.filter((row) => {
    let status = row[head.indexOf("状态")];
    // 支持多种未解决状态的匹配
    return (
      status === "未解决" ||
      status === "Unsolved" ||
      status === "未解决/ Unsolved" ||
      (typeof status === "string" && status.includes("未解决"))
    );
  });

  // 筛选已解决条目，再按时间范围筛选
  let resolvedItems = content.filter((row) => {
    let status = row[head.indexOf("状态")];
    // 排除未解决状态，筛选已解决条目
    let isResolved = !(
      status === "未解决" ||
      status === "Unsolved" ||
      status === "未解决/ Unsolved" ||
      (typeof status === "string" && status.includes("未解决"))
    );

    if (isResolved) {
      // 对已解决条目按时间筛选（30天内）
      let itemDate = new Date(row[head.indexOf("提交日期")]);
      return itemDate >= date30DaysAgo && itemDate <= currentDate;
    }
    return false;
  });

  // 合并数据：未解决条目（不受时间限制）+ 已解决条目（30天内）
  let filteredData = [...unresolvedItems, ...resolvedItems];

  let contentArray = filteredData.map((row) => {
    let contentObj = {};
    head.forEach((columnName, index) => {
      contentObj[columnName] = row[index];
    });
    return contentObj;
  });
  // contentArray[0]['提交日期'] ='TEST';
  contentArray.forEach((r) => {
    r["提交日期"] = r["提交日期"].toISOString();
  });

  console.log(contentArray);

  return { Head: head, Content: contentArray };
}

function getShiftRowsByPrefix(prefix) {
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let ss = SpreadsheetApp.openById(id);
  let sheetName = [
    "Shift_INJ_TB1",
    "Shift_INJ_TB2",
    "Shift_TF_TB1",
    "Shift_TF_TB2",
    "Shift_PK_TB1",
    "Shift_PK_TB2",
  ];
  let head = ss
    .getSheetByName(sheetName[0])
    .getRange(1, 1, 1, ss.getSheetByName(sheetName[0]).getLastColumn())
    .getValues()[0];
  let content = [];
  sheetName.forEach((name) => {
    let ws = ss.getSheetByName(name);
    let lastRow = ws.getLastRow();
    if (lastRow > 1) {
      let values = ws
        .getRange(2, 1, lastRow - 1, ws.getLastColumn())
        .getValues();
      content = content.concat(values);
    }
  });

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
    r["提交日期"] = r["提交日期"].toISOString();
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
  workcenterData.forEach((r) => {
    if (r[0] !== "") {  // 确保机台号不为空
      let obj = {};
      obj.workcenter = r[0];  // A列：机台号
      obj.workshop = r[1];     // B列：车间（TB1/TB2）
      obj.process = r[2];      // C列：工序（INJ/IM/TF/PK）
      WORKCENTER.push(obj);
    }
  });
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
    let sheetName = "Shift_" + obj["工序"] + "_" + obj["车间"];
    let ws = ss.getSheetByName(sheetName);

    // console.log("先前编号", obj["先前编号"]);
    if (obj["先前编号"] !== "") {
      let firstColumnRange = ws.getRange(1, 1, ws.getLastRow(), 1);
      let firstColumnValues = firstColumnRange.getValues();
      let matchingRow = -1;
      for (let i = 0; i < firstColumnValues.length; i++) {
        if (String(firstColumnValues[i][0]) === String(obj["先前编号"])) {
          matchingRow = i + 1; // 因为数组索引从0开始，而行号从1开始
          break;
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

    ws.appendRow([
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
    ]);

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
    let array = [];
    data.forEach((r) => {
      let obj = {};
      head.forEach((h, i) => {
        obj[h] = r[i];
      });
      array.push(obj);
    });

    // --- 新增的日志 ---
    // 这会将从数据库获取到的完整任务清单打印到 Apps Script 的执行日志中
    Logger.log(
      "从 Tasklist_history 获取到的原始数据 (Original data from Tasklist_history):"
    );
    Logger.log(JSON.stringify(array, null, 2)); // 使用格式化的JSON字符串，便于查看

    return array;
  } catch (e) {
    Logger.log("get_Tasklist_new 发生错误: " + e.toString()); // 增加错误日志
    return ["NO", "报错：" + e.toString()];
  }
}

function saveData_tasklist(data, confirmUser) {
  try {
    let id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    let ss = SpreadsheetApp.openById(id);
    let sheetName = data["SheetName"];
    let ws = ss.getSheetByName(sheetName);
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
      } else {
        ws.appendRow([
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
        ]);
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

    let sheetName = PM_data["工序"] + "-" + PM_data["车间"];

    let ss = SpreadsheetApp.openById(ID);

    let ws = ss.getSheetByName(sheetName);

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

    // 查找 'PM No.' 对应的在 Google Sheet 中的位置
    let pmNoPosition = -1;
    for (let i = 0; i < array.length; i++) {
      if (array[i]["PM No."] === PM_Serial_Number) {
        pmNoPosition = i + 2; // 因为数组是从0开始的，Google Sheet的行是从1开始的，并且我们从第二行开始读取数据
        break;
      }
    }

    ws.getRange(pmNoPosition, 17).setValue(data[0]);

    ws.getRange(pmNoPosition, 18).setValue(data[1]);

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
    const ws = ss.getSheetByName(sheetName);
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

    // 更新指定行中的特定单元格
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
 * 修改：根据PM No.找到特定保养记录，并更新其"任务明细"字段。
 * 如果记录不存在，则创建一条新的记录。
 * @param {object} data - 包含pmNo, sheetName, updatedTasklist, 和 shouldAppendStatus 的对象
 * @returns {string} 返回操作结果
 */
function updateTasklistForPM(data) {
  try {
    const id = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
    const ss = SpreadsheetApp.openById(id);
    const ws = ss.getSheetByName(data.sheetName);

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

      const newRecord = [
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
        const sheet = ss.getSheetByName(targetSheetName);
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

    // 先列出所有工作表名称进行调试
    const allSheets = ss.getSheets();
    const sheetNames = allSheets.map((sheet) => sheet.getName());
    console.log("Available sheet names:", sheetNames);
    console.log("Looking for sheet:", sheetName);

    const sheet = ss.getSheetByName(sheetName);
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

    const spreadsheetId = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let updateSuccess = false;
    let updatedSheetName = "";

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

    // 发送邮件 - 使用GmailApp发送HTML邮件，参考您的其他项目实现
    try {
      for (let email of recipientEmails) {
        GmailApp.sendEmail(email, emailSubject, "", {
          htmlBody: htmlBody,
        });
        console.log(
          "✅ 成功发送HTML邮件到 / Successfully sent HTML email to:",
          email
        );
      }
      console.log(
        `邮件已成功发送给：${recipientEmails.join(
          ", "
        )}，标题为："${emailSubject}"`
      );
    } catch (e) {
      console.error(`发送邮件时发生错误：${e.message}`);
      // 如果GmailApp失败，尝试使用MailApp作为备选方案
      try {
        MailApp.sendEmail({
          to: recipientEmails.join(","),
          subject: emailSubject,
          body: emailBody,
        });
        console.log(
          "使用MailApp备选方案成功发送邮件到 / Successfully sent email using MailApp fallback to:",
          recipientEmails.join(", ")
        );
      } catch (mailAppError) {
        console.error(
          "MailApp备选方案也失败 / MailApp fallback also failed:",
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

function getFilteredFailureReportData() {
  let id = "10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w";
  let spreadsheet = SpreadsheetApp.openById(id);

  // 定义Sheet名称和对应工序
  let sheets = {
    IM: ["Shift_INJ_TB1", "Shift_INJ_TB2"],
    TF: ["Shift_TF_TB1", "Shift_TF_TB2"],
    PK: ["Shift_PK_TB1", "Shift_PK_TB2"],
  };

  // 定义筛选条件（维修时间，单位：分钟）- 临时设置为0以显示所有数据
  let timeThresholds = {
    IM: 240, // Temporarily set to 0 for debugging
    TF: 120, // Temporarily set to 0 for debugging
    PK: 60, // Temporarily set to 0 for debugging
  };

  // 存储筛选后的数据
  let result = {
    IM: [],
    TF: [],
    PK: [],
  };

  // 遍历所有工序和对应Sheet
  for (let process in sheets) {
    let sheetNames = sheets[process];
    let threshold = timeThresholds[process];

    for (let sheetName of sheetNames) {
      let sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet) {
        let data = sheet.getDataRange().getValues();
        Logger.log(
          "Sheet " + sheetName + " 数据行数 / Data rows: " + data.length
        );
        // 从第2行开始遍历数据（假设第1行是表头）
        for (let i = 1; i < data.length; i++) {
          let row = data[i];
          // H列（索引7）是维修时间
          let repairTimeStr = row[7] ? row[7].toString() : "0";
          // 提取维修时间中的数字（假设格式为"X小时Y分钟"或纯数字）
          let repairTime = 0;
          let timeMatch = repairTimeStr.match(/(\d+)/g);
          if (timeMatch) {
            if (repairTimeStr.includes("小时")) {
              repairTime = parseInt(timeMatch[0]) * 60;
              if (timeMatch.length > 1) {
                repairTime += parseInt(timeMatch[1]);
              }
            } else {
              repairTime = parseInt(timeMatch[0]);
            }
          }
          // 根据工序筛选 - 临时显示所有数据
          if (repairTime >= threshold) {
            result[process].push({
              reportNo: row[0] || "",
              machineNo: row[2] || "",
              problemDescription: row[3] || "",
              status: row[5] || "",
              repairTime: repairTimeStr,
              submitDate: row[11] ? row[11].toString() : "",
              workshop: row[14] || "",
              process: row[15] || process,
              confirmation: row[18] || "待确认 / Pending Confirmation",
              needFailureReport: row[19] || "", // 第20列：是否需要填写故障报告
              responsiblePerson: "",
            });
          }
        }
      } else {
        Logger.log("Sheet " + sheetName + " 未找到 / Not found");
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

    if (!failureDatabaseSheet) {
      throw new Error(
        "Failure_Database sheet未找到 / Failure_Database sheet not found"
      );
    }

    // 获取所有数据
    const data = failureDatabaseSheet.getDataRange().getValues();
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

      const attachments = row[9] || ""; // 附件
      const responsiblePerson = String(row[11] || '').trim(); // 责任人（第12列，索引11）
      const existingCompletionDays = String(row[12] || '').trim(); // 已有的完成天数（列13）

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
      if (process === "IM" || process === "INJ") {
        result.IM.push({
          failureReportNumber: failureReportNumber,
          workshop: workshop,
          process: "IM",
          machineNo: machineNo,
          submitDate: submitDate,
          problemDescription: problemDescription,
          assignmentDate: assignmentDate,
          completionDays: completionDays,
          uploadDate: uploadDate,
          attachments: attachments,
          hasFormData: !!(row[10] && String(row[10]).trim().startsWith('{')),
        });
      } else if (process === "TF") {
        result.TF.push({
          failureReportNumber: failureReportNumber,
          workshop: workshop,
          process: "TF",
          machineNo: machineNo,
          submitDate: submitDate,
          problemDescription: problemDescription,
          assignmentDate: assignmentDate,
          completionDays: completionDays,
          uploadDate: uploadDate,
          attachments: attachments,
          hasFormData: !!(row[10] && String(row[10]).trim().startsWith('{')),
        });
      } else if (process === "PK") {
        result.PK.push({
          failureReportNumber: failureReportNumber,
          workshop: workshop,
          process: "PK",
          machineNo: machineNo,
          submitDate: submitDate,
          problemDescription: problemDescription,
          assignmentDate: assignmentDate,
          completionDays: completionDays,
          uploadDate: uploadDate,
          attachments: attachments,
          hasFormData: !!(row[10] && String(row[10]).trim().startsWith('{')),
        });
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

    if (Array.isArray(rowData)) {
      reportNo = rowData[0] || "";
      machineNo = rowData[2] || "";
      problemDescription = rowData[3] || "";
      submitDateValue = rowData[11] || "";
      workshop = rowData[14] || "";
      processName = rowData[15] || process;
    } else if (rowData && typeof rowData === "object") {
      reportNo = rowData.reportNo || rowData.failureReportNumber || "";
      machineNo = rowData.machineNo || "";
      problemDescription = rowData.problemDescription || "";
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
        String(row[11] || '')
      ];

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
      verification: 13
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
      const allowedStatus = ['进行中 / Ongoing', '已完成 / Completed'];
      normalizedValue = String(normalizedValue).trim();
      if (!allowedStatus.includes(normalizedValue)) {
        throw new Error('状态值无效 / Invalid status value: ' + normalizedValue);
      }
    }

    if (fieldKey === 'verification') {
      const allowedVerification = ['已验证 / Verified', '未验证 / Not Verified'];
      normalizedValue = String(normalizedValue).trim();
      if (normalizedValue && !allowedVerification.includes(normalizedValue)) {
        throw new Error('验证值无效 / Invalid verification value: ' + normalizedValue);
      }
    }

    const tz = Session.getScriptTimeZone() || 'Asia/Shanghai';
    const now = new Date();
    const nowYmd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

    wsFollow.getRange(rowIndex, fieldMap[fieldKey]).setValue(normalizedValue);

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
    htmlBody += '<th>PA类型<br>PA Type</th>';
    htmlBody += '<th>预防性措施<br>PA Action</th>';
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
        htmlBody += '<th>PA类型<br>PA Type</th>';
        htmlBody += '<th>预防性措施<br>PA Action</th>';
        htmlBody += '<th>计划完成日期<br>Planned Completion Date</th>';
        htmlBody += '<th>状态<br>Status</th>';
        htmlBody += '</tr>';

        verifier.records.forEach(function(record) {
          htmlBody += '<tr>';
          htmlBody += '<td>' + escapeHtml(record.followupId) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.failureReportNo) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paType) + '</td>';
          htmlBody += '<td>' + escapeHtml(record.paPlan).replace(/\n/g, '<br>') + '</td>';
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
        htmlBody += '<th>PA类型<br>PA Type</th>';
        htmlBody += '<th>预防性措施<br>PA Action</th>';
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

      // 检查验证状态，已验证的记录不显示（第13列，索引12）
      const verification = String(row[12] || '');
      if (verification === '已验证 / Verified') continue;

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
        String(row[12] || '')
      ];

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

      // 检查验证状态，已验证的记录不显示（第13列，索引12）
      const verification = String(row[12] || '');
      if (verification === '已验证 / Verified') continue;

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
        String(row[12] || '')
      ];

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
 * 获取故障报告查阅数据
 * 从Failure_Database表中获取所有故障报告数据用于查阅页面
 */
function getFailureReportViewData() {
  try {
    console.log("=== 开始获取故障报告查阅数据 ===");

    const failureDatabaseID = "1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU"; // Failure_Database Spreadsheet ID
    const failureDatabaseSheet =
      SpreadsheetApp.openById(failureDatabaseID).getSheetByName(
        "Failure_Database"
      );
    const data = failureDatabaseSheet.getDataRange().getValues();
    const formulas = failureDatabaseSheet.getDataRange().getFormulas();

    console.log("从Google Sheets获取到的原始数据行数:", data.length);
    console.log("表头行:", data[0]);
    console.log("从Google Sheets获取到的公式行数:", formulas.length);
    console.log("表头行公式:", formulas[0]);

    // 定义列索引（基于Failure_Database表的实际结构）
    // 表格抬头：编号	机台号	问题描述	提交日期	车间	工序	故障报告编号	分配日期	上传日期	附件
    const columnIndexes = {
      reportNumber: 0, // 编号（第1列，索引为0）
      machineNumber: 1, // 机台号（第2列，索引为1）
      problemDescription: 2, // 问题描述（第3列，索引为2）
      submitDate: 3, // 提交日期（第4列，索引为3）
      workshop: 4, // 车间（第5列，索引为4）
      process: 5, // 工序（第6列，索引为5）
      failureReportNumber: 6, // 故障报告编号（第7列，索引为6）
      assignDate: 7, // 分配日期（第8列，索引为7）
      uploadDate: 8, // 上传日期（第9列，索引为8）
      attachment: 9, // 附件（第10列，索引为9）
    };

    console.log("列索引映射:", columnIndexes);
    console.log("附件列索引:", columnIndexes.attachment);

    const reports = [];
    for (let i = 1; i < data.length; i++) {
      // 从第2行开始
      const row = data[i];

      // 记录每一行的原始数据
      console.log("=== 处理第 " + (i + 1) + " 行数据 ===");
      console.log("完整行数据:", row);
      console.log("完整行公式:", formulas[i]);
      console.log("故障报告编号列值:", row[columnIndexes.failureReportNumber]);
      console.log("机台号列值:", row[columnIndexes.machineNumber]);
      console.log("提交日期列值:", row[columnIndexes.submitDate]);
      console.log("附件列原始值:", row[columnIndexes.attachment]);
      console.log("附件列公式:", formulas[i][columnIndexes.attachment]);
      console.log("附件列数据类型:", typeof row[columnIndexes.attachment]);
      console.log(
        "附件列值长度:",
        row[columnIndexes.attachment] ? row[columnIndexes.attachment].length : 0
      );

      if (
        row[columnIndexes.failureReportNumber] &&
        row[columnIndexes.failureReportNumber].trim() !== ""
      ) {
        let uploadDateValue = row[columnIndexes.uploadDate];
        let uploadDate = "";

        if (uploadDateValue) {
          if (uploadDateValue instanceof Date) {
            uploadDate = uploadDateValue.toISOString();
          } else if (typeof uploadDateValue === "string") {
            // 尝试解析字符串为Date
            const parsedDate = new Date(uploadDateValue);
            if (!isNaN(parsedDate.getTime())) {
              uploadDate = parsedDate.toISOString();
            } else {
              // 如果无法解析，使用原始字符串
              uploadDate = uploadDateValue;
            }
          } else {
            // 其他类型，转换为字符串
            uploadDate = String(uploadDateValue);
          }
        }

        let assignDateValue = row[columnIndexes.assignDate];
        let assignDate = "";

        if (assignDateValue) {
          if (assignDateValue instanceof Date) {
            assignDate = assignDateValue.toISOString();
          } else if (typeof assignDateValue === "string") {
            // 尝试解析字符串为Date
            const parsedDate = new Date(assignDateValue);
            if (!isNaN(parsedDate.getTime())) {
              assignDate = parsedDate.toISOString();
            } else {
              // 如果无法解析，使用原始字符串
              assignDate = String(assignDateValue);
            }
          } else {
            // 其他类型，转换为字符串
            assignDate = String(assignDateValue);
          }
        }

        // 优先使用公式，如果没有公式则使用显示值
        let attachmentValue =
          formulas[i][columnIndexes.attachment] ||
          row[columnIndexes.attachment] ||
          "";

        const report = {
          failureReportNumber: row[columnIndexes.failureReportNumber] || "",
          workshop: row[columnIndexes.workshop] || "",
          process: row[columnIndexes.process] || "",
          machineNo: row[columnIndexes.machineNumber] || "", // 新增：机台号
          submitDate: row[columnIndexes.submitDate] || "", // 新增：提交日期
          problemDescription: row[columnIndexes.problemDescription] || "",
          assignDate: assignDate,
          uploadDate: uploadDate,
          attachment: attachmentValue,
        };

        console.log("最终使用的附件值:", attachmentValue);
        console.log("构造的报告对象:", report);
        console.log("报告对象中机台号值:", report.machineNo);
        console.log("报告对象中提交日期值:", report.submitDate);
        console.log("报告对象中附件列值:", report.attachment);
        console.log("=== 第 " + (i + 1) + " 行数据处理完成 ===");

        reports.push(report);
      } else {
        console.log("第 " + (i + 1) + " 行跳过：故障报告编号为空");
      }
    }

    console.log("=== 数据处理完成 ===");
    console.log("有效报告数量:", reports.length);
    console.log("所有报告数据:", reports);

    // 特别检查附件列数据
    console.log("=== 附件列数据检查 ===");
    reports.forEach((report, index) => {
      console.log("报告 " + (index + 1) + " 附件列数据:");
      console.log("  故障报告编号:", report.failureReportNumber);
      console.log("  附件列值:", report.attachment);
      console.log("  附件列类型:", typeof report.attachment);
      console.log(
        "  附件列长度:",
        report.attachment ? report.attachment.length : 0
      );
    });

    const result = {
      success: true,
      reports: reports,
      total: reports.length,
      message: "数据获取成功 / Data retrieved successfully",
    };

    console.log("=== 最终返回结果 ===");
    console.log("结果对象:", result);
    console.log("JSON字符串长度:", JSON.stringify(result).length);

    // 返回 JSON 字符串
    return JSON.stringify(result);
  } catch (error) {
    console.error(
      "获取故障报告查阅数据时出错 / Error getting failure report view data:",
      error
    );
    const errorResult = {
      success: false,
      message:
        "获取故障报告查阅数据失败 / Failed to get failure report view data: " +
        error.message,
    };
    return JSON.stringify(errorResult);
  }
}

/**
 * 加载故障报告查阅页面
 */
function loadFailureReport_View() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_View", { webPage: webPage })
    .setTitle("故障报告查阅 / Failure Report View")
    .setFaviconUrl(webIconUrl);
}

/**
 * 加载故障报告跟进验证页面
 */
function loadFailureReport_Followup() {
  let webPage = getReleaseWebPage();
  return render("FailureReport_Followup", { webPage: webPage })
    .setTitle("故障报告跟进验证 / Failure Report Follow-up Verification")
    .setFaviconUrl(webIconUrl);
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
    .setTitle("故障报告跟进 / Failure Report Follow-up")
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
    .setTitle("故障报告验证 / Failure Report Verification")
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

// ==================== 工艺抽检模块函数 ====================

/**
 * 获取工艺抽检数据
 * @param {string} process - 工序类型 (IM/TF/PK)
 * @param {string} workshop - 车间
 * @param {string} targetDate - 目标日期 (YYYY-MM-DD)
 * @returns {object} 包含状态、数据和表头的对象
 */
function getProcessSamplingData(process, workshop, targetDate) {
  try {
    // 数据源配置
    let dataSources = {
      "IM": {
        "spreadsheetId": "1afvNifotG_Ik36NQ7aptPjKT4ebAyeSBCc4hJ9WL7v4",
        "sheetName": "Master Data",
        "available": true
      },
      "TF": {
        "spreadsheetId": "",
        "sheetName": "",
        "available": false
      },
      "PK": {
        "spreadsheetId": "",
        "sheetName": "",
        "available": false
      }
    };
    
    let dataSource = dataSources[process];
    
    if (!dataSource || !dataSource.available) {
      return {
        status: "under_development",
        message: "该工序数据源正在开发中",
        data: []
      };
    }
    
    // 获取数据
    let ss = SpreadsheetApp.openById(dataSource.spreadsheetId);
    let ws = ss.getSheetByName(dataSource.sheetName);
    
    if (!ws) {
      return {
        status: "error",
        message: "未找到工作表: " + dataSource.sheetName,
        data: []
      };
    }
    
    let allData = ws.getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn()).getDisplayValues();
    let headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getDisplayValues()[0];
    
    // 筛选当天夜班数据
    let nightShiftData = filterNightShiftData(allData, targetDate);
    
    return {
      status: "success",
      data: nightShiftData,
      headers: headers,
      totalCount: allData.length,
      filteredCount: nightShiftData.length
    };
    
  } catch (e) {
    console.error("获取工艺抽检数据失败:", e);
    return {
      status: "error",
      message: "数据获取失败：" + e.toString(),
      data: []
    };
  }
}

/**
 * 筛选夜班数据
 * @param {Array} allData - 所有数据
 * @param {string} targetDate - 目标日期
 * @returns {Array} 筛选后的夜班数据
 */
function filterNightShiftData(allData, targetDate) {
  let targetDateStr = Utilities.formatDate(new Date(targetDate), "GMT+8", "yyyy-MM-dd");
  let targetNightShift = targetDateStr + "_1"; // 夜班标识
  
  return allData.filter(function(row) {
    let dateShiftStr = row[13]; // 日期&班次列（索引13）
    return dateShiftStr === targetNightShift;
  });
}

/**
 * 获取工艺参数标准
 * @param {string} material - 物料编码
 * @returns {object} 包含状态和标准数据的对象
 */
function getProcessParameterStandards(material) {
  try {
    let standardsSpreadsheetId = "164BO94VJR6qNdJmJDwbz3w7u9QZfNQUv0U6eXSiM3kQ";
    let standardsSheetName = "INJ_New";
    
    let ss = SpreadsheetApp.openById(standardsSpreadsheetId);
    let ws = ss.getSheetByName(standardsSheetName);
    
    if (!ws) {
      return {
        status: "error",
        message: "未找到工艺参数标准工作表",
        standards: []
      };
    }
    
    let allStandards = ws.getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn()).getDisplayValues();
    
    // 通过物料匹配SKU（索引4）
    let matchingStandards = allStandards.filter(function(standard) {
      let sku = standard[4]; // SKU（索引4）
      let status = standard[19]; // 状态（索引19）
      
      let isValidStatus = status === "生效" || status === "Effective" || status === "有效";
      
      return sku === material && isValidStatus;
    });
    
    if (matchingStandards.length === 0) {
      return {
        status: "not_found",
        message: "未找到物料 " + material + " 对应的工艺参数标准",
        standards: []
      };
    }
    
    return {
      status: "success",
      standards: matchingStandards,
      message: "找到 " + matchingStandards.length + " 条匹配的标准"
    };
    
  } catch (e) {
    console.error("获取工艺参数标准失败:", e);
    return {
      status: "error",
      message: "工艺参数标准获取失败：" + e.toString(),
      standards: []
    };
  }
}

/**
 * 评估工艺参数
 * @param {string} samplingParams - 抽检时的工艺参数
 * @param {string} material - 物料编码
 * @returns {object} 评估结果
 */
function evaluateParameters(samplingParams, material) {
  // 1. 通过物料获取标准
  let standardResponse = getProcessParameterStandards(material);
  
  if (standardResponse.status !== "success") {
    return {
      allPassed: false,
      error: standardResponse.message,
      results: []
    };
  }
  
  // 2. 解析标准工艺参数
  let standard = standardResponse.standards[0];
  let standardParams = standard[8]; // 工艺参数列（索引8）
  
  let standardParamMap = parseParameterString(standardParams);
  let samplingParamMap = parseParameterString(samplingParams);
  
  // 3. 逐个比较参数
  let checkResults = [];
  let allPassed = true;
  
  for (let paramName in standardParamMap) {
    let standardRange = standardParamMap[paramName];
    let currentValue = samplingParamMap[paramName];
    
    if (currentValue !== undefined) {
      let isInRange = checkValueInRange(currentValue, standardRange);
      checkResults.push({
        parameter: paramName,
        currentValue: currentValue,
        standardRange: standardRange,
        passed: isInRange
      });
      
      if (!isInRange) {
        allPassed = false;
      }
    } else {
      checkResults.push({
        parameter: paramName,
        currentValue: '缺失',
        standardRange: standardRange,
        passed: false,
        missing: true
      });
      allPassed = false;
    }
  }
  
  return {
    allPassed: allPassed,
    results: checkResults,
    issueRecord: generateIssueRecord(checkResults.filter(function(r) { return !r.passed; })),
    material: material,
    standardInfo: {
      sku: standard[4],
      machineModel: standard[0],
      automationGroup: standard[1],
      moldCode: standard[2],
      processCardNumber: standard[5],
      cavityCount: standard[6]
    }
  };
}

/**
 * 解析参数字符串
 * @param {string} paramString - 参数字符串
 * @returns {object} 参数映射对象
 */
function parseParameterString(paramString) {
  let paramMap = {};
  
  if (!paramString || typeof paramString !== 'string') {
    return paramMap;
  }
  
  let pairs = [];
  
  if (paramString.includes(';')) {
    pairs = paramString.split(';');
  } else if (paramString.includes(',')) {
    pairs = paramString.split(',');
  } else if (paramString.includes('\n')) {
    pairs = paramString.split('\n');
  } else {
    pairs = [paramString];
  }
  
  pairs.forEach(function(pair) {
    pair = pair.trim();
    if (!pair) return;
    
    let key, value;
    
    if (pair.includes('=')) {
      let parts = pair.split('=');
      key = parts[0];
      value = parts.slice(1).join('=');
    } else if (pair.includes(':')) {
      let parts = pair.split(':');
      key = parts[0];
      value = parts.slice(1).join(':');
    } else if (pair.includes('：')) {
      let parts = pair.split('：');
      key = parts[0];
      value = parts.slice(1).join('：');
    }
    
    if (key && value) {
      key = key.trim().replace(/[：:=]/g, '');
      value = value.trim();
      if (key) {
        paramMap[key] = value;
      }
    }
  });
  
  return paramMap;
}

/**
 * 检查值是否在范围内
 * @param {string} currentValue - 当前值
 * @param {string} standardRange - 标准范围
 * @returns {boolean} 是否在范围内
 */
function checkValueInRange(currentValue, standardRange) {
  let cleanCurrentValue = currentValue.toString().trim();
  let cleanRange = standardRange.toString().trim();
  
  try {
    let currentNum = parseFloat(cleanCurrentValue);
    
    if (isNaN(currentNum)) {
      return cleanCurrentValue === cleanRange;
    }
    
    if (cleanRange.includes('-') && !cleanRange.startsWith('-')) {
      let rangeParts = cleanRange.split('-');
      if (rangeParts.length === 2) {
        let min = parseFloat(rangeParts[0].trim());
        let max = parseFloat(rangeParts[1].trim());
        return currentNum >= min && currentNum <= max;
      }
    } else if (cleanRange.startsWith('>=')) {
      let min = parseFloat(cleanRange.substring(2).trim());
      return currentNum >= min;
    } else if (cleanRange.startsWith('>')) {
      let min = parseFloat(cleanRange.substring(1).trim());
      return currentNum > min;
    } else if (cleanRange.startsWith('<=')) {
      let max = parseFloat(cleanRange.substring(2).trim());
      return currentNum <= max;
    } else if (cleanRange.startsWith('<')) {
      let max = parseFloat(cleanRange.substring(1).trim());
      return currentNum < max;
    } else if (cleanRange.includes('~')) {
      let parts = cleanRange.split('~');
      let min = parseFloat(parts[0].trim());
      let max = parseFloat(parts[1].trim());
      return currentNum >= min && currentNum <= max;
    } else {
      let target = parseFloat(cleanRange);
      return currentNum === target;
    }
  } catch (e) {
    console.error('参数范围解析错误:', e);
    return false;
  }
  
  return false;
}

/**
 * 生成问题记录
 * @param {Array} failedResults - 失败的检查结果
 * @returns {string} 问题记录文本
 */
function generateIssueRecord(failedResults) {
  if (failedResults.length === 0) {
    return '';
  }
  
  let issues = failedResults.map(function(result) {
    if (result.missing) {
      return result.parameter + ": 参数缺失（标准范围: " + result.standardRange + "）";
    } else {
      return result.parameter + ": 当前值" + result.currentValue + "，标准范围" + result.standardRange;
    }
  });
  
  return '以下工艺参数不符合标准：\n' + issues.join('\n');
}

/**
 * 保存工艺抽检结果
 * @param {Array} rowData - 行数据
 * @param {string} inspectionResult - 抽检结果
 * @param {string} issueRecord - 问题记录
 * @param {string} samplingParams - 抽检时的工艺参数
 * @returns {object} 保存结果
 */
function saveProcessInspection(rowData, inspectionResult, issueRecord, samplingParams) {
  try {
    let workcenter = rowData[1];
    let dateShift = rowData[13];
    let currentUser = Session.getActiveUser().getEmail();
    
    let spreadsheetId = "1afvNifotG_Ik36NQ7aptPjKT4ebAyeSBCc4hJ9WL7v4";
    let sheetName = "Master Data";
    
    let ss = SpreadsheetApp.openById(spreadsheetId);
    let ws = ss.getSheetByName(sheetName);
    
    if (!ws) {
      return {
        status: "error",
        message: "未找到工作表"
      };
    }
    
    // 查找对应的行
    let allData = ws.getRange(2, 1, ws.getLastRow() - 1, ws.getLastColumn()).getDisplayValues();
    let targetRowIndex = -1;
    
    for (let i = 0; i < allData.length; i++) {
      if (allData[i][1] === workcenter && allData[i][13] === dateShift) {
        targetRowIndex = i + 2;
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return {
        status: "error",
        message: "未找到对应的记录行"
      };
    }
    
    // 更新字段
    ws.getRange(targetRowIndex, 15, 1, 1).setValue(currentUser);       // 抽检人（O列，索引14）
    ws.getRange(targetRowIndex, 16, 1, 1).setValue(inspectionResult);  // 抽检结果（P列，索引15）
    ws.getRange(targetRowIndex, 17, 1, 1).setValue(issueRecord);       // 问题记录（Q列，索引16）
    ws.getRange(targetRowIndex, 18, 1, 1).setValue(samplingParams);    // 工艺参数-抽检（R列，索引17）
    
    let timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
    console.log("工艺抽检保存: " + workcenter + " " + dateShift + " " + inspectionResult + " by " + currentUser + " at " + timestamp);
    
    return {
      status: "success",
      message: "保存成功"
    };
    
  } catch (e) {
    console.error("保存工艺抽检失败:", e);
    return {
      status: "error",
      message: "保存失败：" + e.toString()
    };
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
    let sheetNames = [
      "Shift_INJ_TB1",
      "Shift_INJ_TB2",
      "Shift_TF_TB1",
      "Shift_TF_TB2",
      "Shift_PK_TB1",
      "Shift_PK_TB2",
    ];
    
    // 从recordId中提取基础编号（去掉-后的数字）
    let baseId = recordId.split('-')[0];
    
    // 遍历所有sheet查找匹配的记录
    for (let sheetName of sheetNames) {
      let ws = ss.getSheetByName(sheetName);
      if (!ws) continue;
      
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
    let sheetNames = [
      "Shift_INJ_TB1",
      "Shift_INJ_TB2",
      "Shift_TF_TB1",
      "Shift_TF_TB2",
      "Shift_PK_TB1",
      "Shift_PK_TB2",
    ];
    
    // 从recordId中提取基础编号（去掉-后的数字）
    let baseId = recordId.split('-')[0];
    
    // 遍历所有sheet查找匹配的记录
    for (let sheetName of sheetNames) {
      let ws = ss.getSheetByName(sheetName);
      if (!ws) continue;
      
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
const PROJECT_MILESTONE_COLS = [
  { name: '模具/自动化改造（供应商）/ Tooling & Automation (Supplier)', planned: 3, actual: 4 },
  { name: 'FAT / FAT', planned: 5, actual: 6 },
  { name: '现场安装 / On-site Installation', planned: 7, actual: 8 },
  { name: 'IQ/OQ / IQ/OQ', planned: 9, actual: 10 },
  { name: '工程测试 / Engineering Test', planned: 11, actual: 12 },
  { name: 'PQ / PQ', planned: 13, actual: 14 },
  { name: 'Mass Production / Mass Production', planned: 15, actual: 16 }
];
const PROJECT_STATUS_COL = 17;
const PROJECT_STATUS_EDITORS = ['Lyon Zhang'];
const PROJECT_PERMISSION_COL = 59; // BH column - 项目跟进权限管理

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
        projectName: String(row[0] || ''),
        leader: String(row[1] || ''),
        technician: String(row[2] || ''),
        status: String(row[PROJECT_STATUS_COL] || ''),
        milestones: PROJECT_MILESTONE_COLS.map(function(ms) {
          return {
            name: ms.name,
            planned: formatSheetDate_(row[ms.planned]),
            actual: formatSheetDate_(row[ms.actual])
          };
        })
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

    // Update leader
    if (updates.leader) {
      ws.getRange(rowIndex, 2).setValue(updates.leader);
    }

    // Update milestone actual dates
    if (updates.milestones && Array.isArray(updates.milestones)) {
      updates.milestones.forEach(function(ms) {
        if (ms.index >= 0 && ms.index < PROJECT_MILESTONE_COLS.length) {
          const actualCol = PROJECT_MILESTONE_COLS[ms.index].actual;
          ws.getRange(rowIndex, actualCol + 1).setValue(ms.actual || '');
        }
      });
    }

    // Update status and planned dates (only admin)
    var isAdmin = false;
    if (updates.status !== undefined || (updates.milestones && updates.hasPlannedChanges)) {
      const permCheck = JSON.parse(checkProjectPermission(editorName));
      isAdmin = permCheck.isAdmin;
    }
    if (updates.status !== undefined) {
      if (!isAdmin && PROJECT_STATUS_EDITORS.indexOf(editorName) === -1) {
        return JSON.stringify({ success: false, message: '仅管理员可修改状态 / Only admin can change status' });
      }
      ws.getRange(rowIndex, PROJECT_STATUS_COL + 1).setValue(updates.status);
    }
    // Update milestone planned dates (admin only)
    if (updates.plannedDates && isAdmin) {
      updates.plannedDates.forEach(function(pd) {
        if (pd.index >= 0 && pd.index < PROJECT_MILESTONE_COLS.length) {
          const plannedCol = PROJECT_MILESTONE_COLS[pd.index].planned;
          ws.getRange(rowIndex, plannedCol + 1).setValue(pd.planned || 'NA');
        }
      });
      sendPlannedDateChangeNotification(projectName, editorName, updates.plannedDates);
    }

    return JSON.stringify({ success: true, message: '更新成功 / Update successful' });
  } catch (e) {
    return JSON.stringify({ success: false, message: '更新失败 / Update failed: ' + e.toString() });
  }
}

/**
 * 发送计划日期变更通知给所有"管理员"权限用户
 * @param {string} projectName
 * @param {string} editorName
 * @param {Array} plannedDates
 */
function sendPlannedDateChangeNotification(projectName, editorName, plannedDates) {
  try {
    const permSs = SpreadsheetApp.openById(USER_PERMISSION_SS_ID);
    const permWs = permSs.getSheetByName(USER_PERMISSION_SHEET_NAME);
    if (!permWs) return;
    const permVals = permWs.getDataRange().getValues();
    const adminEmails = [];
    for (let i = 2; i < permVals.length; i++) {
      const perm = String(permVals[i][PROJECT_PERMISSION_COL] || '').trim();
      if (perm === '管理员') {
        const email = String(permVals[i][9] || '').trim();
        if (email) adminEmails.push(email);
      }
    }
    if (adminEmails.length === 0) return;
    const webPage = getReleaseWebPage();
    const subject = '【项目跟进】计划日期变更通知 / Planned Date Change - ' + projectName;
    var htmlBody = '<html><body>';
    htmlBody += '<h2>项目跟进 - 计划日期变更通知 / Project Tracking - Planned Date Change</h2>';
    htmlBody += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">';
    htmlBody += '<tr><td><b>项目 / Project</b></td><td>' + escapeHtml(projectName) + '</td></tr>';
    htmlBody += '<tr><td><b>编辑人 / Editor</b></td><td>' + escapeHtml(editorName) + '</td></tr>';
    htmlBody += '</table>';
    htmlBody += '<br><b>变更里程碑 / Changed Milestones:</b>';
    htmlBody += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">';
    htmlBody += '<tr><th>里程碑 / Milestone</th><th>新计划日期 / New Planned Date</th></tr>';
    plannedDates.forEach(function(pd) {
      if (pd.index >= 0 && pd.index < PROJECT_MILESTONE_COLS.length) {
        htmlBody += '<tr><td>' + escapeHtml(PROJECT_MILESTONE_COLS[pd.index].name) + '</td><td>' + escapeHtml(pd.planned || 'NA') + '</td></tr>';
      }
    });
    htmlBody += '</table>';
    htmlBody += '<p><a href="' + webPage + '?v=ProjectTracking">点击查看项目跟进 / View Project Tracking</a></p>';
    htmlBody += '<p>此邮件由系统自动发送 / Auto-sent by system.</p>';
    htmlBody += '</body></html>';
    adminEmails.forEach(function(email) {
      try {
        GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
        console.log('计划日期变更通知已发送 / Notification sent to: ' + email);
      } catch (e) {
        console.error('发送通知失败 / Failed to send to ' + email + ': ' + e);
      }
    });
  } catch (e) {
    console.error('sendPlannedDateChangeNotification error: ' + e);
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
        if (perm === '超级用户' || perm === '管理员') {
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

/**
 * 添加新项目
 * Add new project
 * @param {string} dataStr - JSON with project data
 * @returns {string} JSON string
 */
function addProject(dataStr) {
  try {
    const data = JSON.parse(dataStr);
    const ss = SpreadsheetApp.openById(PROJECT_TRACKING_SS_ID);
    const ws = ss.getSheetByName(PROJECT_TRACKING_SHEET_NAME);
    if (!ws) return JSON.stringify({ success: false, message: 'Sheet 项目总表 not found' });

    // Build new row: 18 columns
    const row = [];
    row.push(data.projectName || '');                         // 0: 项目名称
    row.push(data.leader || '');                              // 1: Leader
    row.push(data.technician || '');                          // 2: 测试责任技术员
    // 7 milestones: planned (odd indices) + actual (even indices, blank)
    const milestonePlanned = data.milestones || [];
    for (let i = 0; i < 7; i++) {
      row.push(milestonePlanned[i] || '');                    // planned date
      row.push('');                                            // actual date (blank)
    }
    row.push(data.status || 'Not start');                     // 17: Status

    ws.appendRow(row);
    return JSON.stringify({ success: true, message: '添加成功 / Project added successfully' });
  } catch (e) {
    return JSON.stringify({ success: false, message: '添加失败 / Add failed: ' + e.toString() });
  }
}
