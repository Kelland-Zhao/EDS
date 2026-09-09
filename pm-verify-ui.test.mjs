// PM任务验证 — 前端纯函数测试（从 PM_Task-js_1.0.html 提取，不依赖 jQuery / GAS 全局）
// 运行：node --test pm-verify-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 PM_Task-js_1.0.html 中提取函数定义，单独 eval
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

function tryExtract(src, name) {
  try { return extractFunction(src, name); } catch (e) { return null; }
}

const html = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'pmIsOperatorResource_')
  || 'function pmIsOperatorResource_(){ throw new Error("pmIsOperatorResource_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmVerifyButtonEnabled_')
  || 'function pmVerifyButtonEnabled_(){ throw new Error("pmVerifyButtonEnabled_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmLatestVerifyRecord_')
  || 'function pmLatestVerifyRecord_(){ throw new Error("pmLatestVerifyRecord_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmHasVerify_')
  || 'function pmHasVerify_(){ throw new Error("pmHasVerify_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmEscapeHtml_')
  || 'function pmEscapeHtml_(){ throw new Error("pmEscapeHtml_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmVerifyBadgeHtml_')
  || 'function pmVerifyBadgeHtml_(){ throw new Error("pmVerifyBadgeHtml_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmVerifyCellHtml_')
  || 'function pmVerifyCellHtml_(){ throw new Error("pmVerifyCellHtml_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmVerifyValidate_')
  || 'function pmVerifyValidate_(){ throw new Error("pmVerifyValidate_ not found in PM_Task-js_1.0.html"); }');
(0, eval)(tryExtract(html, 'pmVerifyUserInfo_')
  || 'function pmVerifyUserInfo_(){ throw new Error("pmVerifyUserInfo_ not found in PM_Task-js_1.0.html"); }');

// 后端验证记录对象（与 PM_Task_Verify sheet 表头一致）
const REC_QUALIFIED = {
  'PM No.': 'PM-001', 'Workcenter': 'A12', 'Task No': 'T1',
  'Task Description': '清洁', 'Resource': '操作员',
  'Verify Result': '合格', 'Fail Reason': '',
  'Verifier ID': '90001', 'Verifier Name': '张三', 'Verify Time': '2026-09-09 10:00:00',
};
const REC_FAIL = {
  'PM No.': 'PM-001', 'Workcenter': 'A12', 'Task No': 'T1',
  'Task Description': '清洁', 'Resource': '操作员',
  'Verify Result': '不合格', 'Fail Reason': '未清洁干净',
  'Verifier ID': '90002', 'Verifier Name': '李四', 'Verify Time': '2026-09-09 11:00:00',
};

// ===== 1. pmIsOperatorResource_ =====
test('pmIsOperatorResource_: 操作员 → true', () => {
  assert.equal(pmIsOperatorResource_('操作员'), true);
  assert.equal(pmIsOperatorResource_('操作员/OPC'), true);
  assert.equal(pmIsOperatorResource_(' 操作员 '), true);
});

test('pmIsOperatorResource_: 技术员 → false', () => {
  assert.equal(pmIsOperatorResource_('技术员'), false);
  assert.equal(pmIsOperatorResource_('技术员/IDL'), false);
  assert.equal(pmIsOperatorResource_('操作员+技术员'), false); // 混合时按技术员处理（与现有徽章规则一致）
  assert.equal(pmIsOperatorResource_(''), false);
  assert.equal(pmIsOperatorResource_(null), false);
});

// ===== 2. pmVerifyButtonEnabled_ =====
test('pmVerifyButtonEnabled_: 操作员+已勾选+有保养号 → 可用', () => {
  const row = { Resource: '操作员', taskStatus: true };
  assert.equal(pmVerifyButtonEnabled_(row, 'PM-001'), true);
});

test('pmVerifyButtonEnabled_: 只读视图（已完成）已勾选也可用，不依赖 isEditable', () => {
  const row = { Resource: '操作员', taskStatus: true };
  assert.equal(pmVerifyButtonEnabled_(row, 'PM-001'), true); // 函数签名不含 isEditable
  // 兼容中文键 'Task Status'
  const rowZh = { Resource: '操作员', 'Task Status': true };
  assert.equal(pmVerifyButtonEnabled_(rowZh, 'PM-001'), true);
});

test('pmVerifyButtonEnabled_: 非操作员行 → 不可用', () => {
  const row = { Resource: '技术员/IDL', taskStatus: true };
  assert.equal(pmVerifyButtonEnabled_(row, 'PM-001'), false);
});

test('pmVerifyButtonEnabled_: 未勾选完成 → 不可用', () => {
  const row = { Resource: '操作员', taskStatus: false };
  assert.equal(pmVerifyButtonEnabled_(row, 'PM-001'), false);
  const rowMissing = { Resource: '操作员' };
  assert.equal(pmVerifyButtonEnabled_(rowMissing, 'PM-001'), false);
});

test('pmVerifyButtonEnabled_: 无保养号 → 不可用', () => {
  const row = { Resource: '操作员', taskStatus: true };
  assert.equal(pmVerifyButtonEnabled_(row, ''), false);
  assert.equal(pmVerifyButtonEnabled_(row, null), false);
});

// ===== 3. pmLatestVerifyRecord_ / pmHasVerify_ =====
test('pmLatestVerifyRecord_: 无记录 → null', () => {
  assert.equal(pmLatestVerifyRecord_([]), null);
  assert.equal(pmLatestVerifyRecord_(null), null);
});

test('pmLatestVerifyRecord_: 多条记录 → 取最后一条（追加顺序）', () => {
  assert.equal(pmLatestVerifyRecord_([REC_QUALIFIED, REC_FAIL]), REC_FAIL);
});

test('pmHasVerify_: 有记录 → true（用于锁定勾选框）', () => {
  assert.equal(pmHasVerify_([REC_QUALIFIED]), true);
  assert.equal(pmHasVerify_([]), false);
  assert.equal(pmHasVerify_(null), false);
});

// ===== 4. pmEscapeHtml_ =====
test('pmEscapeHtml_: 转义 HTML 特殊字符', () => {
  assert.equal(pmEscapeHtml_('<b>x</b> & "y"'), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
  assert.equal(pmEscapeHtml_('普通文本'), '普通文本');
});

// ===== 5. pmVerifyBadgeHtml_ =====
test('pmVerifyBadgeHtml_: 无记录 → 灰色未验证提示', () => {
  const html = pmVerifyBadgeHtml_(null);
  assert.ok(html.includes('未验证'));
  assert.ok(html.includes('#6c757d'));
});

test('pmVerifyBadgeHtml_: 合格 → 绿色徽章+验证人时间 title', () => {
  const html = pmVerifyBadgeHtml_(REC_QUALIFIED);
  assert.ok(html.includes('合格'));
  assert.ok(html.includes('#d4edda'));
  assert.ok(html.includes('#155724'));
  assert.ok(html.includes('张三'));
});

test('pmVerifyBadgeHtml_: 不合格 → 红色徽章+原因（转义）', () => {
  const html = pmVerifyBadgeHtml_(REC_FAIL);
  assert.ok(html.includes('不合格'));
  assert.ok(html.includes('#f8d7da'));
  assert.ok(html.includes('未清洁干净'));
  // 原因中含 HTML 特殊字符时被转义
  const evil = { ...REC_FAIL, 'Fail Reason': '<script>alert(1)</script>' };
  const evilHtml = pmVerifyBadgeHtml_(evil);
  assert.ok(!evilHtml.includes('<script>'));
  assert.ok(evilHtml.includes('&lt;script&gt;'));
});

// ===== 6. pmVerifyCellHtml_ =====
test('pmVerifyCellHtml_: 技术员行 → NA/不适用提示', () => {
  const row = { Resource: '技术员/IDL', taskStatus: true };
  const html = pmVerifyCellHtml_(row, null, 'PM-001');
  assert.ok(html.includes('NA'));
  assert.ok(html.includes('不适用'));
  // 混合资源（含技术员）同样不适用
  const mixed = { Resource: '操作员+技术员', taskStatus: true };
  assert.ok(pmVerifyCellHtml_(mixed, null, 'PM-001').includes('不适用'));
});

test('pmVerifyCellHtml_: 资源为空 → 空（未知不误标 NA）', () => {
  const row = { Resource: '', taskStatus: true };
  assert.equal(pmVerifyCellHtml_(row, null, 'PM-001'), '');
  const rowMissing = { taskStatus: true };
  assert.equal(pmVerifyCellHtml_(rowMissing, null, 'PM-001'), '');
});

test('pmVerifyCellHtml_: 操作员未勾选 → 仅灰色未验证，无按钮', () => {
  const row = { Resource: '操作员', taskStatus: false };
  const html = pmVerifyCellHtml_(row, null, 'PM-001');
  assert.ok(html.includes('未验证'));
  assert.ok(!html.includes('pm-verify-btn'));
});

test('pmVerifyCellHtml_: 操作员已勾选未验证 → 醒目验证按钮', () => {
  const row = { Resource: '操作员', taskStatus: true };
  const html = pmVerifyCellHtml_(row, null, 'PM-001');
  assert.ok(html.includes('pm-verify-btn'));
  assert.ok(html.includes('验证'));
  assert.ok(html.includes('btn-success'));
});

test('pmVerifyCellHtml_: 已验证 → 徽章+可重验按钮', () => {
  const row = { Resource: '操作员', taskStatus: true };
  const html = pmVerifyCellHtml_(row, REC_QUALIFIED, 'PM-001');
  assert.ok(html.includes('合格'));
  assert.ok(html.includes('pm-verify-btn'));
  assert.ok(html.includes('btn-outline-secondary')); // 重验按钮降级样式
});

test('pmVerifyCellHtml_: 无保养号 → 即使已勾选也无按钮', () => {
  const row = { Resource: '操作员', taskStatus: true };
  const html = pmVerifyCellHtml_(row, null, '');
  assert.ok(!html.includes('pm-verify-btn'));
});

// ===== 7. pmVerifyValidate_ =====
test('pmVerifyValidate_: 合格 → 通过', () => {
  assert.equal(pmVerifyValidate_('合格', ''), null);
});

test('pmVerifyValidate_: 不合格必填原因', () => {
  assert.ok(pmVerifyValidate_('不合格', '') !== null);
  assert.ok(pmVerifyValidate_('不合格', '   ') !== null);
  assert.equal(pmVerifyValidate_('不合格', '未清洁干净'), null);
});

test('pmVerifyValidate_: 未选结果 → 报错', () => {
  assert.ok(pmVerifyValidate_('', '') !== null);
  assert.ok(pmVerifyValidate_(null, '') !== null);
});

// ===== 8. pmVerifyUserInfo_ =====
test('pmVerifyUserInfo_: 主页面会话信息 → 验证人 {code, name}', () => {
  assert.deepEqual(pmVerifyUserInfo_('90001', '张三'), { code: '90001', name: '张三' });
  assert.deepEqual(pmVerifyUserInfo_(' 90001 ', ' 张三 '), { code: '90001', name: '张三' });
});

test('pmVerifyUserInfo_: 无工号 → null（无法记录验证人，阻止验证）', () => {
  assert.equal(pmVerifyUserInfo_('', '张三'), null);
  assert.equal(pmVerifyUserInfo_(null, '张三'), null);
  assert.equal(pmVerifyUserInfo_('  ', ''), null);
});

test('pmVerifyUserInfo_: 有工号无姓名 → 姓名回退空串', () => {
  assert.deepEqual(pmVerifyUserInfo_('90001', ''), { code: '90001', name: '' });
});
