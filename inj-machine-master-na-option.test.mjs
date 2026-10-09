// 注塑机台主数据维护页：设备类型1 / 设备类型2 / 自动化类型 的 NA（不适用）选项测试
// 运行：node --test inj-machine-master-na-option.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 -js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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

// const 声明在 eval 里只活在那次 eval 的作用域内，必须和用到它的函数一起求值
function extractConst(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*[^;]+;`));
  if (!m) throw new Error(`${name} const not found in source`);
  return m[0];
}

const mmJs = fs.readFileSync(new URL('./INJ_MachineMaster-js.html', import.meta.url), 'utf8');
(0, eval)([
  extractConst(mmJs, 'MM_NA_VALUE'),
  extractFunction(mmJs, 'mmDeviceTypeOptions_'),
].join('\n'));

// 枚举值取字面量手工推导，不复用被测代码的常量，避免同义反复
const RAW = { deviceTypeOptions: ['3AX', '6AX'] };

test('设备类型选项：真实机型在后端原序，NA 追加在末尾', () => {
  const r = mmDeviceTypeOptions_(RAW);
  assert.deepEqual(r.list, ['3AX', '6AX', 'NA']);
  assert.equal(r.sourceEmpty, false);
});

test('设备类型选项：来源里已经有 NA 时不重复追加', () => {
  const r = mmDeviceTypeOptions_({ deviceTypeOptions: ['3AX', 'NA'] });
  assert.deepEqual(r.list, ['3AX', 'NA']);
});

test('设备类型选项：来源为空时只剩 NA 可选', () => {
  assert.deepEqual(mmDeviceTypeOptions_({ deviceTypeOptions: [] }).list, ['NA']);
});

test('设备类型选项：接口没返回 deviceTypeOptions 时只剩 NA 可选，不抛错', () => {
  assert.deepEqual(mmDeviceTypeOptions_({}).list, ['NA']);
});

test('设备类型选项：响应整体为 null 时只剩 NA 可选，不抛错', () => {
  assert.deepEqual(mmDeviceTypeOptions_(null).list, ['NA']);
});

test('设备类型选项：sourceEmpty 反映原始来源，不会被 NA 顶成非空', () => {
  // 后端枚举源挂掉时页面要弹「枚举来源为空」提醒；若拿拼过 NA 的列表判空，这条提醒会永久失效
  assert.equal(mmDeviceTypeOptions_({ deviceTypeOptions: [] }).sourceEmpty, true);
  assert.equal(mmDeviceTypeOptions_({}).sourceEmpty, true);
  assert.equal(mmDeviceTypeOptions_(null).sourceEmpty, true);
  assert.equal(mmDeviceTypeOptions_(RAW).sourceEmpty, false);
});

test('设备类型选项：不修改后端返回的原数组', () => {
  const raw = ['3AX'];
  mmDeviceTypeOptions_({ deviceTypeOptions: raw });
  assert.deepEqual(raw, ['3AX'], '原数组被就地 push 了');
});
