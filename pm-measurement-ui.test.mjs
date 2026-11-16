// PM 测量记录 — 前端纯函数测试
// 运行：node --test pm-measurement-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function extractFunction(src, name) {
  let start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in source`);
  if (src.slice(start - 6, start) === 'async ') start -= 6;
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`${name} braces not balanced`);
}

const html = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
for (const name of ['pmIsPdMYes_', 'pmLegacyDoneValue_', 'pmTaskDoneState_', 'pmPhotoSuccess_', 'pmTaskEndErrors_', 'pmPhotoKey_', 'pmMergePhotos_', 'pmParsePoints_', 'pmParseLabels_', 'pmNumericValue_', 'pmAggregate_', 'pmPointOutOfLimit_', 'pmInspectionResult_', 'pmMeasurementErrors_', 'pmMeasurementSummary_', 'checkPdMLimit', 'buildPdMRows_', 'PdMData_empty_or_not', 'pmTaskPayload_', 'pmMeasurementTotals_', 'pmTaskCheckboxState_', 'pmUploadPendingPhotos_', 'pmApplyUploadedPhotos_', 'findMissingMandatoryValueRows']) {
  const fn = (() => { try { return extractFunction(html, name); } catch (e) { return null; } })();
  (0, eval)(fn || `function ${name}(){ throw new Error("${name} not found in PM_Task-js_1.0.html"); }`);
}

const common = fs.readFileSync(new URL('./PM_Common_js.html', import.meta.url), 'utf8');
for (const name of ['pmTaskStatusLabel_', 'pmLegacyDoneValue_', 'pmEscapeReportHtml_', 'pmMeasurementSummaryText_', 'pmMeasurementReportHtml_']) {
  const fn = (() => { try { return extractFunction(common, name); } catch (e) { return null; } })();
  (0, eval)(fn || `function ${name}(){ throw new Error("${name} not found in PM_Common_js.html"); }`);
}

test('前端结束校验与后端同规则', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' },
  ]);
  assert.equal(errors[0].field, 'Value');
});

test('skipPhoto 时照片缺失不报错', () => {
  const errors = pmTaskEndErrors_(
    [{ 'Task No': 'FCS-43', taskStatus: true, 'Photo Required': 'Y' }],
    { skipPhoto: true }
  );
  assert.deepEqual(errors, []);
});

test('照片按工单+任务+文件名去重且保留已有', () => {
  const existing = [{ fileId: 'a', name: 'x.jpg', status: 'success' }];
  const merged = pmMergePhotos_(existing, [
    { fileId: 'b', name: 'x.jpg', status: 'success' },
    { fileId: 'c', name: 'y.jpg', status: 'success' },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].fileId, 'a');
  assert.equal(merged[1].fileId, 'c');
});

test('照片最多保留 3 张', () => {
  const existing = [{ fileId: 'a', name: '1.jpg', status: 'success' }];
  const merged = pmMergePhotos_(existing, [
    { fileId: 'b', name: '2.jpg', status: 'success' },
    { fileId: 'c', name: '3.jpg', status: 'success' },
    { fileId: 'd', name: '4.jpg', status: 'success' },
  ]);
  assert.equal(merged.length, 3);
});

test('结束流程先校验、再传图、最后提交', () => {
  const src = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
  const iValidate = src.indexOf('pmTaskEndErrors_(task, { skipPhoto: true })');
  const iUpload = src.indexOf('uploadBase64ImageToDrive(img.base64Image');
  const iSubmit = src.indexOf('await dataSubmit(data, finalConfirmUser)');
  assert.ok(iValidate > 0, '缺少预校验');
  assert.ok(iUpload > iValidate, '传图应在预校验之后');
  assert.ok(iSubmit > iUpload, '提交应在传图之后');
});

test('草稿保存先传图再保存', () => {
  const src = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
  const iHandler = src.indexOf('$("#Submit_wo_End").on("click"');
  const iUpload = src.indexOf('uploadBase64ImageToDrive(img.base64Image', iHandler);
  const iSubmit = src.indexOf('await dataSubmit(data);', iHandler);
  assert.ok(iHandler > 0, '缺少草稿保存入口');
  assert.ok(iUpload > iHandler, '草稿应先上传照片');
  assert.ok(iSubmit > iUpload, '草稿保存应在传图之后');
});

let commonSrc = '';
try { commonSrc = fs.readFileSync(new URL('./PM_Common_js.html', import.meta.url), 'utf8'); } catch (e) { commonSrc = ''; }
const statusFn = (() => { try { return extractFunction(commonSrc, 'pmTaskStatusLabel_'); } catch (e) { return null; } })();
(0, eval)(statusFn || 'function pmTaskStatusLabel_(){ throw new Error("pmTaskStatusLabel_ not found in PM_Common_js.html"); }');

test('完成状态冲突显示待核实', () => {
  assert.equal(pmTaskStatusLabel_({ taskStatus: true, 'Task Status': false }), '待核实 / Verify');
  assert.equal(pmTaskStatusLabel_({ taskStatus: true }), '已完成 / Done');
  assert.equal(pmTaskStatusLabel_({ 'Task Status': false }), '未完成 / Pending');
});

test('0 是有效数值，正常/284abc 不是（前端同规则）', () => {
  assert.equal(pmNumericValue_('0'), 0);
  assert.equal(pmNumericValue_('正常'), null);
  assert.equal(pmNumericValue_('284abc'), null);
});

test('任一点超限即不合格（前端同规则）', () => {
  const task = {
    'Measurement Points': 'S1,S2', 'Measurement Unit': 'kN',
    Logic: 'Out_of_range', 'LL Limited': '100', 'HH Limited': '130',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 145 }],
  };
  assert.equal(pmInspectionResult_(task), '不合格');
});

test('多点摘要按测点顺序显示', () => {
  const task = {
    'Measurement Points': 'S1,S2',
    'Point Labels': 'S1=操作侧;S2=非操作侧',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  };
  assert.equal(pmMeasurementSummary_(task), 'S1 125 · S2 126');
});

test('前端新配置缺 S3 时结束校验报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }, { point: 'S4', value: 127 }],
  }]);
  assert.ok(errors.some((e) => e.field === 'S3'));
});

test('前端测量单位与配置不一致时结束校验报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1', 'Point Labels': 'S1=操作侧', 'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125, unit: '吨力' }],
  }]);
  assert.ok(errors.some((e) => e.field === 'Measurement Unit'));
});

test('PdM 趋势按测点展开', () => {
  const rows = buildPdMRows_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  }], 'PM-001');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].TagName, 'S1');
  assert.equal(rows[1].TagName, 'S2');
});

test('PdM 趋势逐点判定超限', () => {
  const rows = buildPdMRows_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', Logic: 'HighAlarm_Max', 'LL Limited': '', 'HH Limited': '130',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 145 }],
  }], 'PM-001');
  assert.equal(rows[0].Record, '125');
  assert.equal(rows[0].Notification, 'No');
  assert.equal(rows[1].Notification, 'Yes');
});

test('PdM 趋势筛选不再看任务编号', () => {
  const result = PdMData_empty_or_not([
    { 'Task No': 'ABC-1', 'PdM?': '是/ Yes', measurements: [{ point: 'S1', value: 1 }] },
    { 'Task No': 'PDM-OLD-1', 'PdM?': '否/ No' },
  ]);
  assert.equal(result.PdMData.length, 1);
  assert.equal(result.PdMData[0]['Task No'], 'ABC-1');
});

test('旧 PdM 任务没有 measurements 仍按单行归集', () => {
  const result = PdMData_empty_or_not([
    { 'Task No': 'PDM-OLD-1', 'PdM?': '是/ Yes', TagName: 'OLD', '数值记录&备注': '125' },
  ]);
  assert.equal(result.PdMData.length, 1);
  const rows = buildPdMRows_(result.PdMData, 'PM-001');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].TagName, 'OLD');
  assert.equal(rows[0].Record, '125');
});

test('报告显示测点、Total 与结果', () => {
  const html = pmMeasurementReportHtml_({
    'Measurement Unit': 'kN', measurementTotal: 502, inspectionResult: '合格',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  });
  assert.ok(html.includes('S1=125'));
  assert.ok(html.includes('502'));
  assert.ok(html.includes('合格'));
});

test('报告包含成功照片链接并忽略失败照片', () => {
  const html = pmMeasurementReportHtml_({
    'Measurement Unit': 'kN', measurements: [{ point: 'S1', value: 125 }],
    photos: [
      { fileId: 'FILE_OK', name: 'a.jpg', status: 'success' },
      { fileId: 'FILE_BAD', name: 'b.jpg', status: 'failed' },
    ],
  });
  assert.ok(html.includes('FILE_OK'));
  assert.ok(!html.includes('FILE_BAD'));
});

test('确认页摘要包含不合格与异常措施', () => {
  const text = pmMeasurementSummaryText_({
    'Measurement Unit': 'kN', measurementTotal: 502, inspectionResult: '不合格',
    note: '更换密封', measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  });
  assert.ok(text.includes('S1=125'));
  assert.ok(text.includes('502'));
  assert.ok(text.includes('不合格'));
  assert.ok(text.includes('更换密封'));
});

test('无 measurements 的旧任务摘要为空', () => {
  assert.equal(pmMeasurementSummaryText_({ valueAndNote: '125' }), '');
});

function extractAssignedTaskFormatter(src) {
  const mapIdx = src.indexOf('finalTaskList.map(');
  if (mapIdx < 0) throw new Error('finalTaskList.map not found');
  const start = src.indexOf('task =>', mapIdx);
  if (start < 0) throw new Error('task => callback not found');
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('formatter braces not balanced');
}

test('人员分配展开原任务保留测量字段', () => {
  const src = fs.readFileSync(new URL('./PersonnelAssignment_js.html', import.meta.url), 'utf8');
  const formatter = new Function('taskAssignments', 'return (' + extractAssignedTaskFormatter(src) + ')')({ 'FCS-43': ['张三'] });
  const result = formatter({
    'Task No': 'FCS-43',
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
    'Photo Required': 'Y',
  });
  assert.equal(result['Measurement Points'], 'S1,S2,S3,S4');
  assert.equal(result['Point Labels'], 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧');
  assert.equal(result['Measurement Unit'], 'kN');
  assert.equal(result['Photo Required'], 'Y');
  assert.deepEqual(result['执行人员'], ['张三']);
  assert.equal(result.taskStatus, false);
});

test('任务编辑保存完整行数据不丢测量字段', () => {
  const src = fs.readFileSync(new URL('./TaskEdit_js.html', import.meta.url), 'utf8');
  assert.ok(src.includes('const updatedData = taskEditTable.rows().data().toArray();'));
  assert.ok(src.includes('updatedTasklist: JSON.stringify(updatedData)'));
});

test('旧数据缺新字段时不报错并按旧工单处理', () => {
  const oldTask = { 'Task No': 'OLD-1', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '125' };
  assert.deepEqual(pmTaskEndErrors_([oldTask]), []);
  assert.equal(pmMeasurementSummaryText_({ 'Task No': 'OLD-1', valueAndNote: '125' }), '');
});

// ===== Final review 修复项 =====

test('空字符串 Task Status 在报告里不显示待核实', () => {
  assert.equal(pmTaskStatusLabel_({ taskStatus: true, 'Task Status': '' }), '已完成 / Done');
  assert.equal(pmTaskStatusLabel_({ taskStatus: true, 'Task Status': false }), '待核实 / Verify');
});

test('前端 HighAlarm 缺 HH 时待判定', () => {
  assert.equal(pmPointOutOfLimit_('HighAlarm_Max', 125, 100, ''), null);
});

test('前端 PdM=否 的有配置任务不要求测量', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'T-1', 'PdM?': '否/ No', taskStatus: true,
    'Measurement Points': 'S1', 'Point Labels': 'S1=操作侧', 'Measurement Unit': 'kN',
    measurements: [],
  }]);
  assert.deepEqual(errors, []);
});

test('结束载荷保留 measurements 与 note 并归一空 Task Status', () => {
  const payload = pmTaskPayload_({
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', 'Task Status': '',
    'Measurement Points': 'S1', 'Point Labels': 'S1=操作侧', 'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125, unit: 'kN' }],
    note: '正常', image: '见文件夹',
  }, true, '');
  assert.deepEqual(payload.measurements, [{ point: 'S1', value: 125, unit: 'kN' }]);
  assert.equal(payload.note, '正常');
  assert.equal(payload['Task Status'], true);
  assert.equal(payload.image, '见文件夹');
  assert.equal(pmTaskPayload_({ 'Task No': 'T2' }, false, '').image, '无图片');
});

test('快照计算 Total 与结果', () => {
  const totals = pmMeasurementTotals_({
    'Measurement Points': 'S1,S2', 'Measurement Unit': 'kN', 'LL Limited': '', 'HH Limited': '',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  });
  assert.equal(totals.measurementTotal, 251);
  assert.equal(totals.inspectionResult, '待判定');
  assert.deepEqual(pmMeasurementTotals_({ 'Task No': 'OLD' }), {});
});

test('完成状态勾选以 taskStatus 为准并标记冲突', () => {
  assert.deepEqual(pmTaskCheckboxState_({ taskStatus: false, 'Task Status': true }), { checked: false, conflict: true });
  assert.deepEqual(pmTaskCheckboxState_({ taskStatus: true, 'Task Status': '' }), { checked: true, conflict: false });
  assert.deepEqual(pmTaskCheckboxState_({ 'Task Status': true }), { checked: true, conflict: false });
});

test('照片转换完成后才上传并回写任务', async () => {
  const images = [];
  const promises = [Promise.resolve().then(() => images.push({ taskIndex: 0, imageName: 'a.jpg', mimeType: 'image/jpeg', base64Image: 'x' }))];
  const task = [{ photos: [], image: '无图片' }];
  const calls = [];
  const res = await pmUploadPendingPhotos_(images, promises, task, async (img) => { calls.push(img.imageName); return 'FILE1'; }, '2026-11-16 10:00:00');
  assert.equal(res.uploaded, 1);
  assert.deepEqual(calls, ['a.jpg']);
  assert.equal(task[0].photos[0].fileId, 'FILE1');
  assert.equal(task[0].image, '见文件夹');
});

test('无待上传照片时不上传', async () => {
  const res = await pmUploadPendingPhotos_([], [], [], async () => 'X', 'T');
  assert.equal(res.uploaded, 0);
});

test('上传成功的照片回写行数据供再次保存', () => {
  const rows = [{ 'Task No': 'T1', photos: [], image: '无图片' }];
  const tasks = [{ photos: [{ fileId: 'F1', status: 'success' }], image: '见文件夹' }];
  const merged = pmApplyUploadedPhotos_(rows, tasks);
  assert.equal(merged[0].photos[0].fileId, 'F1');
  assert.equal(merged[0].image, '见文件夹');
});

test('有测量配置的 PdM 任务不再要求旧数值输入', () => {
  const missing = findMissingMandatoryValueRows([
    { taskNo: 'FCS-43 - PdM', checked: true, valueAndNote: '', hasMeasurementConfig: true },
    { taskNo: 'PDM-01', checked: true, valueAndNote: '' },
  ]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].taskNo, 'PDM-01');
});
