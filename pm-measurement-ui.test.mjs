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
for (const name of ['pmIsPdMYes_', 'pmTaskDoneState_', 'pmPhotoSuccess_', 'pmTaskEndErrors_', 'pmPhotoKey_', 'pmMergePhotos_']) {
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
