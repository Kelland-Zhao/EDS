// EDS 自动任务监控：只读 ScheduledTask 配置与日志，不执行任务。
var TASK_MONITOR_CONFIG_ = {
  spreadsheetId: '1VH9I4-vRA3GlKo2dx6LVsr29HKdzCylxwROdsfoLwtM',
  ownerEmail: 'kelland_zhao@colpal.com',
  maxLogRows: 20000,
  timingHeaders: ['月\n(文本格式：[1~12])', '星期\n(文本格式：[1~0])', '当月第几周\n(文本格式：[1~6])', '日\n(文本格式：[1~31])', '时间点\n(文本格式：HH:MM)', '程序名', '函数名'],
  menuHeaders: ['描述', '脚本名称', '是否显示'],
  logHeaders: ['执行时间', '函数名', '状态', '详情', '触发方式', '备注'],
};

function checkTaskMonitorAccess() {
  try {
    return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase() === TASK_MONITOR_CONFIG_.ownerEmail;
  } catch (error) {
    return false;
  }
}

function taskMonitorRequireAccess_() {
  if (!checkTaskMonitorAccess()) throw new Error('TM_FORBIDDEN: 此模块仅限 Kelland 访问 / Owner only');
}

function taskMonitorIndex_(headers, required, sheetName) {
  var index = Object.create(null);
  headers.forEach(function (value, i) {
    var name = String(value || '').replace(/\r\n?/g, '\n').trim();
    if (!name) return;
    if (index[name] !== undefined) throw new Error('TM_CONFIG: ' + sheetName + ' 重复表头：' + name);
    index[name] = i;
  });
  required.forEach(function (name) {
    if (index[name] === undefined) throw new Error('TM_CONFIG: ' + sheetName + ' 缺少表头：' + name);
  });
  return index;
}

function taskMonitorReadTable_(sheet, headerRow, headers, startRow, endRow, sheetName, displayValues) {
  var width = sheet.getLastColumn();
  if (width < headers.length) throw new Error('TM_CONFIG: ' + sheetName + ' 列数不足');
  var index = taskMonitorIndex_(sheet.getRange(headerRow, 1, 1, width).getDisplayValues()[0], headers, sheetName);
  if (endRow < startRow) return [];
  var range = sheet.getRange(startRow, 1, endRow - startRow + 1, width);
  var values = displayValues ? range.getDisplayValues() : range.getValues();
  return values.map(function (row, offset) {
    var result = { _sourceRow: startRow + offset };
    headers.forEach(function (name) { result[name] = row[index[name]] == null ? '' : row[index[name]]; });
    return result;
  }).filter(function (row) {
    return headers.some(function (name) { return String(row[name]).trim() !== ''; });
  });
}

function taskMonitorReadSources_() {
  taskMonitorRequireAccess_();
  var result;
  for (var attempt = 0; attempt < 2; attempt++) {
    var ss = SpreadsheetApp.openById(TASK_MONITOR_CONFIG_.spreadsheetId);
    var timingSheet = ss.getSheetByName('定时设置');
    var menuSheet = ss.getSheetByName('菜单设置');
    var logSheet = ss.getSheetByName('Log');
    if (!timingSheet || !menuSheet || !logSheet) throw new Error('TM_CONFIG: 缺少定时设置、菜单设置或 Log');
    var boundaries = [timingSheet.getLastRow(), menuSheet.getLastRow(), logSheet.getLastRow()];
    var startRow = Math.max(2, boundaries[2] - TASK_MONITOR_CONFIG_.maxLogRows + 1);
    result = {
      timeZone: ss.getSpreadsheetTimeZone(),
      timing: taskMonitorReadTable_(timingSheet, 2, TASK_MONITOR_CONFIG_.timingHeaders, 3, boundaries[0], '定时设置', true),
      menus: taskMonitorReadTable_(menuSheet, 2, TASK_MONITOR_CONFIG_.menuHeaders, 3, boundaries[1], '菜单设置'),
      logs: taskMonitorReadTable_(logSheet, 1, TASK_MONITOR_CONFIG_.logHeaders, startRow, boundaries[2], 'Log'),
      coverage: { complete: startRow === 2, startRow: startRow, endRow: boundaries[2], totalRows: Math.max(0, boundaries[2] - 1), warnings: [] },
    };
    if (startRow > 2) result.coverage.warnings.push('日志超过读取上限，仅展示最近 ' + TASK_MONITOR_CONFIG_.maxLogRows + ' 行；缺日志判断已暂停');
    var changed = timingSheet.getLastRow() !== boundaries[0] || menuSheet.getLastRow() !== boundaries[1] || logSheet.getLastRow() !== boundaries[2];
    if (!changed) return result;
    result.coverage.complete = false;
    result.coverage.warnings.push('读取期间来源行数发生变化，当前数据可能过期；缺日志判断已暂停');
  }
  return result;
}

function taskMonitorStatus_(status) {
  var value = String(status || '').trim();
  if (value === '失败' || value === '异常') return 'error';
  if (value === '警告') return 'warning';
  if (/^(超期\d+天|提前\d+天|到期当天)$/.test(value)) return 'business';
  if (value === '成功' || /^成功[（(].+[)）]$/.test(value)) return 'success';
  if (value === '跳过' || value === '无需提醒') return 'skip';
  return 'other';
}

// 日期计算使用来源表的本地时间分量，经 UTC 方法运算，避免执行主机时区影响。
function taskMonitorParseTime_(value) {
  var match = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value).trim());
  if (!match) return null;
  var parts = match.slice(1).map(function (v) { return Number(v || 0); });
  var ms = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  var date = new Date(ms);
  var actual = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
  return parts.every(function (n, i) { return n === actual[i]; }) ? ms : null;
}

function taskMonitorFormatTime_(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

function taskMonitorRule_(row) {
  var fields = TASK_MONITOR_CONFIG_.timingHeaders;
  var ranges = [[1, 12], [0, 6], [1, 6], [1, 31]];
  var values = ranges.map(function (range, i) {
    var list;
    try { list = JSON.parse(String(row[fields[i]])); } catch (error) { throw new Error('日期条件不是有效 JSON 数组'); }
    if (!Array.isArray(list) || !list.length || list.some(function (n) { return typeof n !== 'number' || !Number.isInteger(n) || n < range[0] || n > range[1]; })) {
      throw new Error('日期条件超出范围：' + fields[i].split('\n')[0]);
    }
    return list.filter(function (v, j) { return list.indexOf(v) === j; }).sort(function (a, b) { return a - b; });
  });
  var times = String(row[fields[4]] || '').split('|').map(function (time) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error('无效时间点：' + time);
    return Number(m[1]) * 60 + Number(m[2]);
  }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  return { months: values[0], weekdays: values[1], weeks: values[2], days: values[3], times: times };
}

function taskMonitorMatches_(rule, dayMs) {
  var date = new Date(dayMs);
  var weekInMonth = Math.ceil((date.getUTCDate() + 6 - date.getUTCDay()) / 7);
  return rule.months.indexOf(date.getUTCMonth() + 1) !== -1 && rule.weekdays.indexOf(date.getUTCDay()) !== -1 &&
    rule.weeks.indexOf(weekInMonth) !== -1 && rule.days.indexOf(date.getUTCDate()) !== -1;
}

function taskMonitorPlanText_(rule) {
  function list(values, max, suffix) { return values.length === max ? '每' + suffix : values.join(',') + suffix; }
  return list(rule.months, 12, '月') + '；星期 ' + (rule.weekdays.length === 7 ? '每日' : rule.weekdays.map(function (d) { return '日一二三四五六'.charAt(d); }).join(',')) +
    '；月内' + list(rule.weeks, 6, '周') + '；' + list(rule.days, 31, '日') + '；' + rule.times.map(function (time) {
      return ('0' + Math.floor(time / 60)).slice(-2) + ':' + ('0' + time % 60).slice(-2);
    }).join(' | ');
}

function taskMonitorBuild_(source, days, nowLocal) {
  var now = taskMonitorParseTime_(nowLocal);
  if (now === null) throw new Error('TM_CONFIG: 无法解析当前来源时间');
  var dayMs = 86400000;
  var today = Math.floor(now / dayMs) * dayMs;
  var since = today - (days - 1) * dayMs;
  var coverage = Object.assign({}, source.coverage, { warnings: (source.coverage.warnings || []).slice(), actualStart: null, actualEnd: null });
  var catalog = Object.create(null);
  var configErrors = [];
  function task(fn, name, origin) {
    fn = String(fn || '').trim();
    if (!fn) return null;
    if (!catalog[fn]) catalog[fn] = { fn: fn, name: String(name || fn).trim(), sources: [], plans: [], scheduled: false, configErrors: [], latest: null, errorCount: 0, warningCount: 0, missing: [], uncertain: [], nextPlanned: null };
    var item = catalog[fn];
    if (item.sources.indexOf(origin) === -1) item.sources.push(origin);
    return item;
  }
  source.timing.forEach(function (row) {
    var item = task(row['函数名'], row['程序名'], '定时设置');
    if (!item) { configErrors.push('定时设置第 ' + row._sourceRow + ' 行缺少函数名'); return; }
    item.scheduled = true;
    try {
      if (!String(row['程序名'] || '').trim()) throw new Error('缺少程序名');
      var rule = taskMonitorRule_(row);
      var key = JSON.stringify(rule);
      if (!item.plans.some(function (p) { return p.key === key; })) item.plans.push({ key: key, rule: rule, text: taskMonitorPlanText_(rule) });
    } catch (error) {
      var message = '定时设置第 ' + row._sourceRow + ' 行（' + item.fn + '）：' + error.message;
      item.configErrors.push(message);
      configErrors.push(message);
    }
  });
  source.menus.forEach(function (row) { task(row['脚本名称'], row['描述'], '菜单设置'); });
  var logs = source.logs.map(function (row, i) {
    var value = row['执行时间'];
    if (Object.prototype.toString.call(value) === '[object Date]') value = Utilities.formatDate(value, source.timeZone, 'yyyy-MM-dd HH:mm:ss');
    var ms = taskMonitorParseTime_(value);
    var fn = String(row['函数名'] || '').trim();
    var valid = ms !== null && ms <= now && !!fn;
    if (!valid) coverage.complete = false;
    var item = task(fn, fn, 'Log');
    var record = { id: row._sourceRow || i + 2, fn: fn, name: item ? item.name : '未指定函数', time: ms === null ? String(value) : taskMonitorFormatTime_(ms), timestamp: ms,
      status: String(row['状态'] || '').trim(), kind: taskMonitorStatus_(row['状态']), detail: String(row['详情'] || ''), trigger: String(row['触发方式'] || '').trim(), remark: String(row['备注'] || ''), valid: valid };
    if (valid) {
      if (!coverage.actualStart || record.time < coverage.actualStart) coverage.actualStart = record.time;
      if (!coverage.actualEnd || record.time > coverage.actualEnd) coverage.actualEnd = record.time;
      if (!item.latest || item.latest.timestamp < ms || (item.latest.timestamp === ms && item.latest.id < record.id)) item.latest = record;
      if (ms >= since && record.kind === 'error') item.errorCount++;
      if (ms >= since && record.kind === 'warning') item.warningCount++;
    }
    return record;
  });
  if (logs.some(function (log) { return !log.valid; })) coverage.warnings.push('存在无法解析、晚于当前时间或缺少函数名的日志；缺日志判断已暂停');
  var tasks = Object.keys(catalog).map(function (key) { return catalog[key]; });
  tasks.forEach(function (item) {
    var occurrences = [];
    // 包含今日以及未来366天；同时用于区分同函数相邻计划的日志窗口。
    for (var offset = 0; offset <= 366; offset++) {
      var date = today + offset * dayMs;
      item.plans.forEach(function (plan) {
        if (taskMonitorMatches_(plan.rule, date)) plan.rule.times.forEach(function (time) {
          var ms = date + time * 60000;
          if (ms <= now + 366 * dayMs && occurrences.indexOf(ms) === -1) occurrences.push(ms);
        });
      });
    }
    occurrences.sort(function (a, b) { return a - b; });
    var next = occurrences.find(function (ms) { return ms > now; });
    item.nextPlanned = next === undefined || item.configErrors.length ? null : taskMonitorFormatTime_(next);
    if (coverage.complete && item.configErrors.length === 0) occurrences.forEach(function (ms, i) {
      if (ms >= today + dayMs || now - ms < 15 * 60000) return;
      var end = occurrences[i + 1] === undefined ? Infinity : occurrences[i + 1];
      var inWindow = logs.filter(function (log) {
        return log.valid && log.fn === item.fn && log.timestamp >= ms && log.timestamp < end;
      });
      var seen = inWindow.some(function (log) { return log.trigger === '定时' || log.trigger === 'scheduled'; });
      var unknownTrigger = inWindow.some(function (log) { return ['定时', 'scheduled', '手动', 'manual'].indexOf(log.trigger) === -1; });
      if (!seen && unknownTrigger) item.uncertain.push(taskMonitorFormatTime_(ms));
      else if (!seen) item.missing.push(taskMonitorFormatTime_(ms));
    });
    item.issue = item.configErrors.length ? 'config' : item.missing.length || item.uncertain.length ? 'missing' : item.errorCount ? 'error' : item.warningCount ? 'warning' : 'none';
    item.plans = item.plans.map(function (plan) { return { text: plan.text }; });
  });
  var priority = { config: 0, missing: 1, error: 2, warning: 3, none: 4 };
  tasks.sort(function (a, b) { return priority[a.issue] - priority[b.issue] || a.name.localeCompare(b.name); });
  var selectedLogs = logs.filter(function (log) { return !log.valid || log.timestamp >= since; }).sort(function (a, b) { return (b.timestamp || Infinity) - (a.timestamp || Infinity) || b.id - a.id; });
  var todayLogs = logs.filter(function (log) { return log.valid && log.timestamp >= today; });
  return {
    days: days, timeZone: source.timeZone, generatedAt: taskMonitorFormatTime_(now), windowStart: taskMonitorFormatTime_(since), coverage: coverage,
    sourceUrl: 'https://docs.google.com/spreadsheets/d/' + TASK_MONITOR_CONFIG_.spreadsheetId + '/edit',
    tasks: tasks, logs: selectedLogs, configErrors: configErrors,
    summary: { taskCount: tasks.length, todaySeenTasks: todayLogs.map(function (log) { return log.fn; }).filter(function (fn, i, arr) { return arr.indexOf(fn) === i; }).length,
      errorLogs: todayLogs.filter(function (log) { return log.kind === 'error'; }).length,
      warningLogs: todayLogs.filter(function (log) { return log.kind === 'warning'; }).length,
      missingOccurrences: coverage.complete && !configErrors.length && !tasks.some(function (item) { return item.uncertain.length; }) ? tasks.reduce(function (sum, item) { return sum + item.missing.length; }, 0) : null },
  };
}

function getTaskMonitorData(days) {
  taskMonitorRequireAccess_();
  if ([1, 7, 30].indexOf(days) === -1) throw new Error('TM_INPUT: 仅支持最近1、7或30天');
  var source = taskMonitorReadSources_();
  return taskMonitorBuild_(source, days, Utilities.formatDate(new Date(), source.timeZone, 'yyyy-MM-dd HH:mm:ss'));
}

function loadTaskMonitor() {
  if (!checkTaskMonitorAccess()) {
    return HtmlService.createHtmlOutput('<!DOCTYPE html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>无访问权限</title><body><p>此模块仅限 Kelland 访问。请使用获准的公司 Google 账号打开。</p><p>Owner only. Please use the authorized Google account.</p></body></html>');
  }
  return render('TaskMonitor', { webPage: getReleaseWebPage() })
    .setTitle('自动任务监控 | Task Monitor').setFaviconUrl(webIconUrl);
}
