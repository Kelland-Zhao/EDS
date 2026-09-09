// NPI 产品名称自增表单 — 前端纯函数测试（从 NPI_TaskModal-js.html 提取，不依赖 jQuery / GAS 全局）
// 覆盖：产品缺失判断、选项HTML生成（含转义）、BOM清单追加去重、临时加入提示文案
// 运行：node --test npi-extra-product-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 NPI_TaskModal-js.html 中提取函数定义，单独 eval
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

const html = fs.readFileSync(new URL('./NPI_TaskModal-js.html', import.meta.url), 'utf8');
// 目标函数尚不存在时以占位函数抛出描述性错误，保证测试以「失败」而非「加载报错」变红
(0, eval)(tryExtract(html, 'productMissingFromList_')
  || 'function productMissingFromList_(){ throw new Error("productMissingFromList_ not found in NPI_TaskModal-js.html"); }');
(0, eval)(tryExtract(html, 'productOptionHtml_')
  || 'function productOptionHtml_(){ throw new Error("productOptionHtml_ not found in NPI_TaskModal-js.html"); }');
(0, eval)(tryExtract(html, 'productOptionsToAppend_')
  || 'function productOptionsToAppend_(){ throw new Error("productOptionsToAppend_ not found in NPI_TaskModal-js.html"); }');
(0, eval)(tryExtract(html, 'productTempAddedHintText_')
  || 'function productTempAddedHintText_(){ throw new Error("productTempAddedHintText_ not found in NPI_TaskModal-js.html"); }');

// 现有产品清单（BOM Bundle 去重名，纯字符串数组）
const PRODUCTS = ['A23 Brush', 'C45 Comb', 'E67 Mirror'];

// ===== productMissingFromList_（产品名是否缺失于清单） =====

test('productMissingFromList_: 空产品名 → 不缺失', () => {
  assert.equal(productMissingFromList_('', PRODUCTS), false);
  assert.equal(productMissingFromList_(null, PRODUCTS), false);
});

test('productMissingFromList_: 清单含该产品 → 不缺失', () => {
  assert.equal(productMissingFromList_('A23 Brush', PRODUCTS), false);
});

test('productMissingFromList_: 清单不含 → 缺失', () => {
  assert.equal(productMissingFromList_('X99 New', PRODUCTS), true);
});

test('productMissingFromList_: 空清单 → 非空产品名缺失', () => {
  assert.equal(productMissingFromList_('X99 New', []), true);
});

test('productMissingFromList_: 名称首尾空白去除后匹配', () => {
  assert.equal(productMissingFromList_('  A23 Brush  ', PRODUCTS), false);
});

// ===== productOptionHtml_（产品下拉选项 HTML） =====

test('productOptionHtml_: 生成选项（value=产品名、显示文本=产品名）', () => {
  const h = productOptionHtml_('A23 Brush');
  assert.match(h, /value="A23 Brush"/);
  assert.match(h, />A23 Brush</);
});

test('productOptionHtml_: 含引号/尖括号的产品名被转义', () => {
  const h = productOptionHtml_('X"<&>');
  assert.equal(h.includes('value="X"<&>"'), false); // 原样拼接会破坏属性，必须转义
  assert.match(h, /value="X&quot;&lt;&amp;&gt;"/);
});

// ===== productOptionsToAppend_（BOM清单追加去重） =====

test('productOptionsToAppend_: 全部为新产品 → 原样返回', () => {
  assert.deepEqual(productOptionsToAppend_(['N1', 'N2'], PRODUCTS), ['N1', 'N2']);
});

test('productOptionsToAppend_: 部分已存在 → 只返回新产品且保持顺序', () => {
  assert.deepEqual(productOptionsToAppend_(['C45 Comb', 'N1', 'A23 Brush', 'N2'], PRODUCTS), ['N1', 'N2']);
});

test('productOptionsToAppend_: 跳过空串', () => {
  assert.deepEqual(productOptionsToAppend_(['N1', '', '  '], PRODUCTS), ['N1']);
});

test('productOptionsToAppend_: 不修改入参', () => {
  const bundles = ['N1', 'A23 Brush'];
  const before = JSON.stringify(bundles);
  productOptionsToAppend_(bundles, PRODUCTS);
  assert.equal(JSON.stringify(bundles), before);
});

// ===== productTempAddedHintText_（临时加入提示文案） =====

test('productTempAddedHintText_: 提示文案含产品名并说明会话内临时有效', () => {
  const text = productTempAddedHintText_('X99 New');
  assert.match(text, /X99 New/);
  assert.match(text, /临时/);
  assert.match(text, /会话/);
});

test('productTempAddedHintText_: 空产品名 → 文案不含异常输出', () => {
  assert.equal(productTempAddedHintText_('').includes('undefined'), false);
});
