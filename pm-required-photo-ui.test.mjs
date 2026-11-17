import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unbalanced function: ' + name);
}

const buildTableHead = new Function(
  ['pmPhotoRequired_', 'pmEscapeTaskHtml_', 'buildTableHead'].map(extractFunction).join('\n') +
  '; return buildTableHead;'
)();

function render(field, task, editable = true, type = 'display') {
  const column = buildTableHead(editable).find(col => col.data === field);
  return column.render ? column.render(task[field], type, task) : task[field];
}

test('必须提交照片的条目同时显示描述标签和红色必需拍照按钮', () => {
  for (const value of ['Y', 'y', ' Y ']) {
    for (const resource of ['技术员/ Technician', '操作员/ OPC']) {
      const task = { 'Photo Required': value, Resource: resource, 'Task Description': '检查液压管路' };
      const description = render('Task Description', task);
      const controls = render('操作', task);
      assert.match(description, /必须提交照片/);
      assert.match(description, /Photo required/);
      assert.ok(description.indexOf('必须提交照片') < description.indexOf('检查液压管路'));
      assert.match(controls, /btn-danger[^>]*take-photo-btn/);
      assert.match(controls, /拍照（必需）/);
      assert.match(controls, /PHOTO REQUIRED/);
      assert.ok(!controls.includes('disabled'));
    }
  }
});

test('普通任务保持原有描述和拍照按钮，不被误标为必需', () => {
  for (const value of ['N', '', null, undefined]) {
    const task = { 'Photo Required': value, 'Task Description': '清洁过滤网' };
    assert.equal(render('Task Description', task), '清洁过滤网');
    const controls = render('操作', task);
    assert.match(controls, /btn-warning[^>]*take-photo-btn/);
    assert.ok(!controls.includes('PHOTO REQUIRED'));
  }
});

test('未开始或已完成的只读视图也展示照片要求，拍照按钮仍禁用', () => {
  const task = { 'Photo Required': 'Y', 'Task Description': '记录检查结果' };
  assert.match(render('Task Description', task, false), /必须提交照片/);
  const controls = render('操作', task, false);
  assert.match(controls, /take-photo-btn[^>]*disabled/);
  assert.match(controls, /class="photo-input"/);
  assert.match(controls, /accept="image\/\*"/);
  assert.match(controls, /preview-btn/);
});

test('照片提示不进入排序、搜索或保存内容，原始描述中的特殊字符安全显示', () => {
  const task = Object.freeze({ 'Photo Required': 'Y', 'Task Description': 'A < B & 检查 <img src=x>' });
  assert.equal(render('Task Description', task, true, 'sort'), task['Task Description']);
  assert.equal(render('Task Description', task, true, 'filter'), task['Task Description']);
  const displayed = render('Task Description', task);
  assert.ok(displayed.includes('A &lt; B &amp; 检查 &lt;img src=x&gt;'));
  assert.ok(!displayed.includes('<img src=x>'));
  assert.equal(task['Task Description'], 'A < B & 检查 <img src=x>');
  assert.equal(task['Photo Required'], 'Y');
});

test('已有成功照片时仍保留任务本身的照片要求标识', () => {
  const task = {
    'Photo Required': 'Y', 'Task Description': '检查并提交照片',
    photos: [{ fileId: 'F1', status: 'success' }],
  };
  assert.match(render('Task Description', task), /必须提交照片/);
});
