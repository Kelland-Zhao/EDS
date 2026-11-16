// PM 测量记录 — 前端纯函数测试
// 运行：node --test pm-measurement-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in source`);
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
for (const name of ['pmIsPdMYes_', 'pmTaskDoneState_', 'pmPhotoSuccess_', 'pmTaskEndErrors_', 'pmPhotoKey_', 'pmMergePhotos_', 'pmParsePoints_', 'pmParseLabels_', 'pmNumericValue_', 'pmAggregate_', 'pmPointOutOfLimit_', 'pmInspectionResult_', 'pmMeasurementErrors_', 'pmMeasurementSummary_']) {
  const fn = (() => { try { return extractFunction(html, name); } catch (e) { return null; } })();
  (0, eval)(fn || `function ${name}(){ throw new Error("${name} not found in PM_Task-js_1.0.html"); }`);
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
