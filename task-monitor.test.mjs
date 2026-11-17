import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scriptPath = new URL('./TaskMonitor.js', import.meta.url);
const script = () => fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';
const timingHeaders = ['月\n(文本格式：[1~12])', '星期\n(文本格式：[1~0])', '当月第几周\n(文本格式：[1~6])', '日\n(文本格式：[1~31])', '时间点\n(文本格式：HH:MM)', '程序名', '函数名'];
const menuHeaders = ['描述', '脚本名称', '是否显示'];
const logHeaders = ['执行时间', '函数名', '状态', '详情', '触发方式', '备注'];
const all = (n, start = 1) => JSON.stringify(Array.from({ length: n }, (_, i) => i + start));
function schedule(fn = 'job', times = '8:00', overrides = {}) {
  return Object.assign(Object.fromEntries(timingHeaders.map((h, i) => [h, [all(12), all(7, 0), all(6), all(31), times, '测试任务', fn][i]])), overrides);
}
function fixture() {
  return { '定时设置': [['标题'], [...timingHeaders], Object.values(schedule())], '菜单设置': [['标题'], [...menuHeaders], ['测试任务', 'job', '是']], Log: [[...logHeaders], ['2026-11-17 8:02:00', 'job', '成功', '开始执行', '定时', '']] };
}
function harness(options = {}) {
  let reads = 0;
  const requested = [];
  const tables = options.tables || fixture();
  const context = vm.createContext({
    console, Date,
    Session: { getActiveUser: () => ({ getEmail: () => options.email ?? 'kelland_zhao@colpal.com' }), getEffectiveUser: () => { throw new Error('must not use effective user'); } },
    Utilities: { formatDate: (date) => new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 19).replace('T', ' ') },
    SpreadsheetApp: { openById: id => {
      reads++; requested.push(id);
      return { getSpreadsheetTimeZone: () => 'Asia/Shanghai', getSheetByName: name => {
        const rows = tables[name];
        if (!rows) return null;
        let calls = 0;
        return { getLastRow: () => options.boundaryChanges && name === 'Log' ? rows.length + calls++ : rows.length,
          getLastColumn: () => Math.max(...rows.map(r => r.length)),
          getRange: (r, c, nr, nc) => {
            requested.push([name, r, c, nr, nc]);
            const get = () => rows.slice(r - 1, r - 1 + nr).map(row => Array.from({ length: nc }, (_, i) => row[c - 1 + i] ?? ''));
            return { getValues: get, getDisplayValues: () => get().map(row => row.map(value => value instanceof Date ? '08:00' : value)) };
          } };
      } };
    } },
    HtmlService: { createHtmlOutput: text => ({ denied: text }) },
    render: (name, args) => ({ name, args, setTitle() { return this; }, setFaviconUrl() { return this; } }),
    getReleaseWebPage: () => 'https://example.test/exec', webIconUrl: 'icon',
  });
  vm.runInContext(script(), context);
  return { context, requested, reads: () => reads };
}

test('权限查询只检查真实访问者，不读表或使用执行者身份', () => {
  for (const [email, expected] of [['kelland_zhao@colpal.com', true], [' KELLAND_ZHAO@COLPAL.COM ', true], ['', false], ['other@colpal.com', false]]) {
    const h = harness({ email });
    assert.equal(typeof h.context.checkTaskMonitorAccess, 'function');
    assert.equal(h.context.checkTaskMonitorAccess(), expected);
    assert.equal(h.reads(), 0);
  }
});

test('私有权限守卫在读取任何表之前拒绝空身份及其他用户', () => {
  for (const email of ['', 'other@colpal.com']) {
    const h = harness({ email });
    assert.equal(typeof h.context.taskMonitorReadSources_, 'function');
    assert.throws(() => h.context.taskMonitorReadSources_(), /TM_FORBIDDEN/);
    assert.equal(h.reads(), 0);
  }
});

test('表头按完整名称映射，支持调换列，读取接口没有写入能力', () => {
  const tables = fixture();
  tables.Log = tables.Log.map(r => [...r].reverse());
  const h = harness({ tables });
  assert.equal(typeof h.context.taskMonitorReadSources_, 'function');
  const source = h.context.taskMonitorReadSources_();
  assert.equal(source.logs[0]['函数名'], 'job');
  assert.equal(source.logs[0]['状态'], '成功');
  assert.equal(source.timing[0]['函数名'], 'job');
  assert.equal(source.timeZone, 'Asia/Shanghai');
  assert.equal(source.coverage.complete, true);
});

test('缺失和重复表头必须拒绝，不能按列位置继续', () => {
  for (const replacement of ['错误字段', '函数名']) {
    const tables = fixture();
    tables.Log[0][0] = replacement;
    const h = harness({ tables });
    assert.equal(typeof h.context.taskMonitorReadSources_, 'function');
    assert.throws(() => h.context.taskMonitorReadSources_(), /TM_CONFIG/);
  }
});

test('程序失败、警告、业务提醒和成功原状态分开处理', () => {
  const { context: c } = harness();
  assert.equal(typeof c.taskMonitorStatus_, 'function');
  for (const [s, kind] of [['失败', 'error'], ['异常', 'error'], ['警告', 'warning'], ['超期48天', 'business'], ['到期当天', 'business'], ['提前1天', 'business'], ['成功(季度)', 'success'], ['成功', 'success'], ['跳过', 'skip'], ['无需提醒', 'skip'], ['不认识的状态', 'other']]) {
    assert.equal(c.taskMonitorStatus_(s), kind, s);
  }
});

function source(overrides = {}) {
  return Object.assign({ timeZone: 'Asia/Shanghai', timing: [schedule()], menus: [], logs: [], coverage: { complete: true, startRow: 2, endRow: 1, totalRows: 0, warnings: [] } }, overrides);
}
function log(time, status = '成功', trigger = '定时', fn = 'job', detail = '完成') {
  return Object.fromEntries(logHeaders.map((h, i) => [h, [time, fn, status, detail, trigger, ''][i]]));
}
function build(input, now = '2026-11-17 10:40:00', days = 7) {
  const { context: c } = harness();
  assert.equal(typeof c.taskMonitorBuild_, 'function');
  return c.taskMonitorBuild_(input, days, now);
}

test('多时间点、手动日志与历史错误不会错误抵消今日未见日志', () => {
  const data = build(source({ timing: [schedule('job', '0:00|8:00|16:00')], logs: [
    log('2026-11-17 0:02:00'), log('2026-11-17 8:05:00', '成功', '手动'), log('2026-11-16 8:02:00', '失败'),
  ] }));
  assert.equal(data.summary.missingOccurrences, 1);
  assert.equal(data.tasks[0].missing[0], '2026-11-17 08:00:00');
  assert.equal(data.tasks[0].nextPlanned, '2026-11-17 16:00:00');
  assert.equal(data.tasks[0].latest.status, '成功');
  assert.equal(data.tasks[0].errorCount, 1);
});

test('15分钟阈值、午夜和未来计划边界', () => {
  assert.equal(build(source(), '2026-11-17 08:14:59').summary.missingOccurrences, 0);
  assert.equal(build(source(), '2026-11-17 08:15:00').summary.missingOccurrences, 1);
  const data = build(source({ timing: [schedule('job', '0:00|23:59')] }), '2026-12-31 23:59:01');
  assert.equal(data.tasks[0].nextPlanned, '2027-01-01 00:00:00');
  assert.equal(data.summary.missingOccurrences, 1);
});

test('星期、月内周次、月份和日期采用交集，闰年不存在的日期不溢出', () => {
  const yearly = schedule('job', '09:00', { [timingHeaders[0]]: '[2]', [timingHeaders[3]]: '[29]' });
  assert.equal(build(source({ timing: [yearly] }), '2027-03-01 00:00:00').tasks[0].nextPlanned, '2028-02-29 09:00:00');
  assert.equal(build(source({ timing: [yearly] }), '2026-03-01 00:00:00').tasks[0].nextPlanned, null);
  const monday = schedule('job', '09:25', { [timingHeaders[1]]: '[1]', [timingHeaders[2]]: '[1]' });
  // 严格复用 Common.js 的 ceil((日+6-星期)/7)，12月7日属于第2周。
  assert.equal(build(source({ timing: [monday] }), '2026-11-17 00:00:00').tasks[0].nextPlanned, '2027-02-01 09:25:00');
});

test('非法计划独立报错，菜单与日志函数不会猜合并，手动任务不报缺日志', () => {
  const data = build(source({ timing: [schedule('bad', '24:00'), schedule('badjson', '8:00', { [timingHeaders[0]]: '[1,]' })],
    menus: [{ 描述: '测试任务', 脚本名称: 'manualJob', 是否显示: '是' }], logs: [log('2026-11-17 8:00:00', '成功', '手动', 'anotherJob')] }));
  assert.equal(data.configErrors.length, 2);
  assert.equal(data.tasks.length, 4);
  assert.equal(data.summary.missingOccurrences, null);
  assert.equal(data.tasks.find(t => t.fn === 'manualJob').scheduled, false);
  assert.equal(data.tasks.find(t => t.fn === 'manualJob').missing.length, 0);
});

test('业务提醒不计程序失败，任务数按函数去重，日志按日期窗口筛选', () => {
  const data = build(source({ timing: [schedule(), schedule()], logs: [
    log('2026-11-17 8:02:00', '超期48天'), log('2026-11-17 8:02:01', '失败'), log('2026-11-17 8:02:02', '警告'),
    log('2026-11-17 8:02:03', '成功', '定时', 'job', '开始执行'), log('2026-11-01 8:00:00', '失败'),
  ] }));
  assert.equal(data.summary.taskCount, 1);
  assert.equal(data.summary.todaySeenTasks, 1);
  assert.equal(data.summary.errorLogs, 1);
  assert.equal(data.summary.warningLogs, 1);
  assert.equal(data.logs.length, 4);
  assert.equal(data.tasks[0].latest.detail, '开始执行');
  assert.equal(data.tasks[0].missing.length, 0);
  assert.equal(data.tasks[0].plans.length, 1);
});

test('未知、非法或未来日志时间使覆盖不完整，禁止生成缺日志数量', () => {
  for (const time of ['不是日期', '2026-02-30 8:00:00', '2026-11-18 8:00:00']) {
    const data = build(source({ logs: [log(time)] }));
    assert.equal(data.coverage.complete, false);
    assert.equal(data.summary.missingOccurrences, null);
    assert.equal(data.tasks[0].missing.length, 0);
  }
  assert.equal(build(source({ coverage: { complete: false, warnings: ['截断'] } })).summary.missingOccurrences, null);
});

test('读行数上限与来源边界变化显式降级，不能静默当完整日志', () => {
  const tables = fixture();
  for (let i = 0; i < 5; i++) tables.Log.push(logHeaders.map((_, j) => ['2026-11-17 08:01:00', 'job', '成功', '', '定时', ''][j]));
  const h = harness({ tables });
  h.context.TASK_MONITOR_CONFIG_.maxLogRows = 3;
  const limited = h.context.taskMonitorReadSources_();
  assert.equal(limited.logs.length, 3);
  assert.equal(limited.coverage.complete, false);
  assert.equal(limited.coverage.startRow, 5);
  const changed = harness({ boundaryChanges: true }).context.taskMonitorReadSources_();
  assert.equal(changed.coverage.complete, false);
  assert.match(changed.coverage.warnings.join(''), /行数发生变化/);
});

test('公开数据接口先验证身份，限制天数，返回可序列化数据', () => {
  const denied = harness({ email: '' });
  assert.equal(typeof denied.context.getTaskMonitorData, 'function');
  assert.throws(() => denied.context.getTaskMonitorData(7, 'kelland_zhao@colpal.com'), /TM_FORBIDDEN/);
  assert.equal(denied.reads(), 0);
  const h = harness();
  assert.throws(() => h.context.getTaskMonitorData(365), /TM_INPUT/);
  const result = h.context.getTaskMonitorData(7);
  assert.equal(result.days, 7);
  assert.ok(JSON.stringify(result).includes('job'));
});

test('同函数重复计划去重，不同计划的日志时间边界不互相抵消', () => {
  const data = build(source({ timing: [schedule('job', '8:00|10:00'), schedule('job', '8:00')], logs: [log('2026-11-17 10:00:00')] }));
  assert.equal(data.summary.missingOccurrences, 1);
  assert.equal(data.tasks[0].missing[0], '2026-11-17 08:00:00');
});

const readOptional = file => fs.existsSync(new URL(file, import.meta.url)) ? fs.readFileSync(new URL(file, import.meta.url), 'utf8') : '';
function uiHarness() {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '', hidden: false, disabled: false, value: '7', dataset: {}, className: '', setAttribute(k, v) { this[k] = v; }, addEventListener() {}, scrollIntoView() {} });
    return nodes.get(id);
  }
  const c = vm.createContext({ console, document: { hidden: false, getElementById: element, querySelectorAll: () => [], addEventListener() {} },
    window: { addEventListener() {} }, setInterval() {}, clearInterval() {}, sessionStorage: { getItem: () => '' } });
  vm.runInContext(readOptional('./TaskMonitor-js.html').replace(/^<script>\s*|\s*<\/script>\s*$/g, ''), c);
  return { c, element };
}

test('EDS 路由、受限导航、独立页面与邮箱 scope 接线完整', () => {
  const code = readOptional('./Code.js');
  assert.match(code, /Route\.path\("TaskMonitor", loadTaskMonitor\)/);
  assert.match(readOptional('./Navigation.html'), /id="TaskMonitorTools"[^>]*style="display:none;"/);
  assert.match(readOptional('./Navigation_js.html'), /checkTaskMonitorAccess\(\)/);
  const html = readOptional('./TaskMonitor.html');
  assert.match(html, /include\("TaskMonitor-js"\)/);
  assert.match(html, /alt="Colgate"/);
  assert.match(html, /<th>任务[^<]*<br>/);
});

test('本地 manifest 包含身份查询 scope，未配置的干净检出明确跳过此本地验收项', { skip: !fs.existsSync(new URL('./appsscript.json', import.meta.url)) }, () => {
  assert.ok(JSON.parse(readOptional('./appsscript.json')).oauthScopes.includes('https://www.googleapis.com/auth/userinfo.email'));
});

test('页面服务端门控同样拒绝未授权访问', () => {
  const h = harness({ email: '' });
  assert.equal(typeof h.context.loadTaskMonitor, 'function');
  assert.match(h.context.loadTaskMonitor().denied, /仅限 Kelland/);
  const allowed = harness().context.loadTaskMonitor();
  assert.equal(allowed.name, 'TaskMonitor');
});

test('前端搜索、异常筛选和历史日志使用同一数据模型', () => {
  const { c } = uiHarness();
  assert.equal(typeof c.tmVisibleRows_, 'function');
  c.tmState_.data = build(source({ logs: [log('2026-11-17 8:00:00', '失败', '定时', 'job', '<img src=x onerror=alert(1)>')] }));
  assert.equal(c.tmVisibleRows_().length, 1);
  c.tmState_.view = 'issues';
  assert.equal(c.tmVisibleRows_().length, 1);
  c.tmState_.query = '不存在';
  assert.equal(c.tmVisibleRows_().length, 0);
  c.tmState_.query = ''; c.tmState_.view = 'history'; c.tmState_.filter = 'business';
  assert.equal(c.tmVisibleRows_().length, 0);
  assert.equal(c.tmEscape_('<img>"&'), '&lt;img&gt;&quot;&amp;');
});

test('普通读取失败保留旧数据并标过期，拒绝访问必须清空', () => {
  const { c, element } = uiHarness();
  assert.equal(typeof c.tmFail_, 'function');
  c.tmState_.data = build(source());
  c.tmFail_(new Error('Network disconnected'));
  assert.ok(c.tmState_.data);
  assert.equal(c.tmState_.stale, true);
  assert.match(element('tmNotice').textContent, /过期/);
  c.tmFail_(new Error('TM_FORBIDDEN: denied'));
  assert.equal(c.tmState_.data, null);
  assert.equal(element('tmContent').hidden, true);
  assert.equal(element('tmRows').innerHTML, '');
});

test('刷新不并发，切换日期忽略旧响应后重新读取，隐藏页面暂停', () => {
  const { c } = uiHarness();
  assert.equal(typeof c.tmLoad_, 'function');
  const requests = [];
  c.google = { script: { run: { withSuccessHandler(success) { return { withFailureHandler(fail) { return { getTaskMonitorData(days) { requests.push({ success, fail, days }); } }; } }; } } } };
  c.tmLoad_(); c.tmLoad_();
  assert.equal(requests.length, 1);
  c.tmState_.days = 1; c.tmLoad_();
  requests[0].success(build(source(), '2026-11-17 10:40:00', 7));
  assert.equal(c.tmState_.data, null);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].days, 1);
  requests[1].success(build(source(), '2026-11-17 10:40:00', 1));
  assert.equal(c.tmState_.data.days, 1);
  c.document.hidden = true; c.tmLoad_();
  assert.equal(requests.length, 2);
});

test('现有 scheduled 定时标签抵消缺日志，manual 和手动不抵消', () => {
  for (const [trigger, expected] of [['scheduled', 0], ['定时', 0], ['manual', 1], ['手动', 1]]) {
    assert.equal(build(source({ logs: [log('2026-11-17 8:01:00', '成功', trigger)] })).summary.missingOccurrences, expected, trigger);
  }
});

test('同窗口触发方式未知时不能把已观察到的日志判定为缺日志', () => {
  for (const trigger of ['', '未知方式']) {
    const data = build(source({ logs: [log('2026-11-17 8:01:00', '成功', trigger)] }));
    assert.equal(data.summary.missingOccurrences, null);
    assert.equal(data.tasks[0].missing.length, 0);
    assert.equal(data.tasks[0].uncertain.length, 1);
  }
});

test('定时配置与执行方一样读取显示值，接受显示为08:00的原生时间单元格', () => {
  const tables = fixture();
  tables['定时设置'][2][4] = new Date('1899-12-30T00:00:00Z');
  const h = harness({ tables });
  const data = h.context.taskMonitorBuild_(h.context.taskMonitorReadSources_(), 7, '2026-11-17 10:40:00');
  assert.equal(data.configErrors.length, 0);
  assert.equal(data.tasks[0].nextPlanned, '2026-11-18 08:00:00');
});

test('同函数存在坏规则时，总体缺日志次数和该函数下次计划都不能作确定结论', () => {
  const data = build(source({ timing: [schedule('job', '8:00'), schedule('job', '25:00')] }));
  assert.equal(data.summary.missingOccurrences, null);
  assert.equal(data.tasks[0].nextPlanned, null);
  assert.equal(data.tasks[0].configErrors.length, 1);
});

test('拒绝访问清除详情、来源、配置及概览辅助节点，不只隐藏父容器', () => {
  const { c, element } = uiHarness();
  c.tmState_.data = build(source({ logs: [log('2026-11-17 8:00:00', '失败')] }));
  c.tmState_.selected = 'job'; c.tmRender_();
  assert.ok(element('tmDetailTitle').textContent);
  const filled = ['tmDetailTitle', 'tmDetailMeta', 'tmConfigErrors', 'tmCoverage', 'tmSourceMeta', 'tmWarningCount', 'tmResult', 'tmDetailCount'];
  filled.forEach(id => { element(id).textContent = 'private data'; });
  c.tmFail_(new Error('TM_FORBIDDEN: denied'));
  for (const id of filled) assert.equal(element(id).textContent, '', id);
});

test('真实 doGet 的 TaskMonitor 路由不执行通用触发器安装', () => {
  const h = harness();
  vm.runInContext(readOptional('./Code.js'), h.context);
  h.context.ensureDailyBriefTrigger_ = () => { throw new Error('unexpected trigger installation'); };
  h.context.loadTaskMonitor = () => 'monitor';
  assert.equal(h.context.doGet({ parameters: { v: ['TaskMonitor'] } }), 'monitor');
});

test('首次加载失败时刷新按钮仍在可见的数据容器外', () => {
  const html = readOptional('./TaskMonitor.html');
  assert.ok(html.indexOf('id="tmRefresh"') < html.indexOf('id="tmContent"'), 'initial retry must not be inside hidden data');
});

function pictureHarness(mime, fileId = 'test-photo') {
  const calls = { blob: 0, bytes: 0, fileIds: [] };
  const row = Array(14).fill('');
  row[6] = 'REPORT-TEST';
  row[10] = JSON.stringify({ _photoFileId: fileId, summary: '保留原表单内容' });
  row[13] = '1.5';
  const c = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    DriveApp: { getFileById: id => {
      calls.fileIds.push(id);
      return { getMimeType: () => mime, getBlob: () => {
        calls.blob++;
        return { getContentType: () => mime, getBytes: () => { calls.bytes++; return [1, 2, 3]; } };
      } };
    } },
    Utilities: { base64Encode: bytes => Buffer.from(bytes).toString('base64') },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [Array(14).fill('header'), row] }) }) }) },
  });
  vm.runInContext(readOptional('./Code.js'), c);
  return { c, calls };
}

test('共享图片读取校验必须在读取 Blob 或字节之前拒绝非图片', () => {
  const { c, calls } = pictureHarness('application/vnd.google-apps.spreadsheet');
  assert.equal(typeof c.getEDSPictureBlob_, 'function');
  assert.throws(() => c.getEDSPictureBlob_('protected-spreadsheet'), /仅允许读取图片文件/);
  assert.equal(calls.blob, 0);
  assert.equal(calls.bytes, 0);
});

test('直接取图入口拒绝配置表、PDF 和文本，不能返回文件内容', () => {
  for (const mime of ['application/vnd.google-apps.spreadsheet', 'application/pdf', 'text/plain']) {
    const { c, calls } = pictureHarness(mime);
    const result = c.getImageAsBase64('1VH9I4-vRA3GlKo2dx6LVsr29HKdzCylxwROdsfoLwtM');
    assert.equal(result.error, true, mime);
    assert.match(result.message, /仅允许读取图片文件/);
    assert.equal(calls.blob, 0);
    assert.equal(calls.bytes, 0);
  }
});

test('故障报告取图入口拒绝非图片，同时保留原表单和工时', () => {
  const { c, calls } = pictureHarness('application/vnd.google-apps.spreadsheet', 'protected-spreadsheet');
  const result = JSON.parse(c.getFailureReportFormData('REPORT-TEST'));
  assert.equal(result.success, true);
  assert.equal(result.formData.photo, undefined);
  assert.equal(result.formData.summary, '保留原表单内容');
  assert.equal(result.formData.time_used, '1.5');
  assert.equal(calls.blob, 0);
  assert.equal(calls.bytes, 0);
});

test('正常 JPEG、PNG、WebP 仍能通过直接取图，原报告照片格式保持兼容', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
    const { c, calls } = pictureHarness(mime);
    assert.equal(c.getImageAsBase64('test-photo'), 'data:' + mime + ';base64,AQID');
    assert.equal(calls.blob, 1);
    assert.equal(calls.bytes, 1);
  }
  const { c, calls } = pictureHarness('image/jpeg');
  const result = JSON.parse(c.getFailureReportFormData('REPORT-TEST'));
  assert.equal(result.success, true);
  assert.equal(result.formData.photo, 'data:image/jpeg;base64,AQID');
  assert.equal(result.formData.summary, '保留原表单内容');
  assert.equal(calls.blob, 1);
  assert.equal(calls.bytes, 1);
});
