// NPI 产品信息公用化 + 模版页组合视图 — 回归测试
// 覆盖：buildProductInfoMigrationPlan_（产品信息迁移纯函数）、
//       composeCardList / instanceLabel（模版页组合展开）、
//       getSharedProductInfoRows（记录页共享产品信息取数）
// 背景：6AX 机型组合 = 产品信息(公用) + HIM + VIM-1/2/3 + 6AX自动化；
//       产品信息字段集中到专用卡「产品信息」，其他卡的产品信息行迁移时删除
// 运行：node --test npi-productinfo-shared.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从源文件中提取函数定义，单独 eval（不依赖 GAS / jQuery 全局）
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

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(extractFunction(code, 'buildProductInfoMigrationPlan_'));

const tplJs = fs.readFileSync(new URL('./NPI_TemplateCards-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(tplJs, 'composeCardList'));
(0, eval)(extractFunction(tplJs, 'instanceLabel'));

const recordJs = fs.readFileSync(new URL('./NPI_ProcessRecord-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(recordJs, 'getSharedProductInfoRows'));

// ===== buildProductInfoMigrationPlan_（数据迁移纯函数） =====

const TPL_HEADER = ['卡', '工序', '区块', '区块EN', '字段CN', '字段EN', '字段key', '类型', '单位', '下限', '上限', '检查部门', '预设', '分段', '状态', '备注'];

function piRow(card, key, cn) {
  return [card, 'IM', '产品信息', 'Product Info', cn || ('字段_' + key), 'Field EN', key, 'text', '', '', '', '', '', '', '已确认', ''];
}
function otherRow(card, key) {
  return [card, 'IM', '炮筒通用', 'Barrel', '炮筒温度', 'Barrel Temp', key || 'him_barrel_temp', 'number', '℃', '', '', '', '', '', '已确认', ''];
}

test('迁移计划：无产品信息卡时，从首卡复制建卡并标记其他卡产品信息行删除', () => {
  const data = [
    [...TPL_HEADER],
    piRow('FCS/ENG', 'productInfo_9', '产品名称'),
    piRow('FCS/ENG', 'productInfo_10', '工艺卡编号'),
    otherRow('FCS/ENG'),
    piRow('HIM', 'productInfo_9', '产品名称'),
    piRow('HIM', 'productInfo_10', '工艺卡编号'),
    otherRow('HIM'),
  ];
  const plan = buildProductInfoMigrationPlan_(data);
  assert.equal(plan.changed, true);
  assert.equal(plan.srcCard, 'FCS/ENG');
  assert.equal(plan.create.length, 2);
  assert.equal(plan.create[0][0], '产品信息');
  assert.equal(plan.create[0][6], 'productInfo_9');
  assert.equal(plan.create[1][6], 'productInfo_10');
  assert.equal(plan.create[0][14], '已确认');
  assert.deepEqual(plan.deleteIndexes, [1, 2, 4, 5]);
});

test('迁移计划：产品信息卡已存在时不重复建卡（幂等），仍清理其他卡残留', () => {
  const data = [
    [...TPL_HEADER],
    piRow('产品信息', 'productInfo_9', '产品名称'),
    piRow('产品信息', 'productInfo_10', '工艺卡编号'),
    piRow('FCS/ENG', 'productInfo_9', '产品名称'),
    otherRow('FCS/ENG'),
  ];
  const plan = buildProductInfoMigrationPlan_(data);
  assert.equal(plan.create.length, 0, '已有产品信息卡，不应重复建卡');
  assert.deepEqual(plan.deleteIndexes, [3], '其他卡的产品信息行仍需删除');
  assert.equal(plan.changed, true);
});

test('迁移计划：全部清理完成后返回 changed=false（可安全重复执行）', () => {
  const data = [
    [...TPL_HEADER],
    piRow('产品信息', 'productInfo_9', '产品名称'),
    otherRow('FCS/ENG'),
    otherRow('HIM'),
  ];
  const plan = buildProductInfoMigrationPlan_(data);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.deleteIndexes.length, 0);
  assert.equal(plan.changed, false);
});

test('迁移计划：无任何产品信息行时无操作', () => {
  const data = [[...TPL_HEADER], otherRow('FCS/ENG'), otherRow('VIM')];
  const plan = buildProductInfoMigrationPlan_(data);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.deleteIndexes.length, 0);
  assert.equal(plan.changed, false);
});

// ===== composeCardList / instanceLabel（模版页组合展开） =====

const byDisplay6AX = {
  '6AX': [
    { card: 'HIM', count: 1, order: 1 },
    { card: 'VIM', count: 3, order: 2 },
    { card: '6AX自动化', count: 1, order: 3 },
  ],
};

test('composeCardList：6AX 展开为 HIM + VIM×3 + 6AX自动化 五个实例', () => {
  const list = composeCardList(byDisplay6AX, '6AX');
  assert.equal(list.length, 5);
  assert.deepEqual(list.map(i => i.card), ['HIM', 'VIM', 'VIM', 'VIM', '6AX自动化']);
  assert.deepEqual(list.map(i => i.instance), [1, 1, 2, 3, 1]);
  assert.deepEqual(list.map(i => i.prefix), ['1_', '2_', '3_', '4_', '5_']);
});

test('composeCardList：单卡组合不拆实例、无前缀', () => {
  const list = composeCardList({ 'VIM': [{ card: 'VIM', count: 1, order: 1 }] }, 'VIM');
  assert.equal(list.length, 1);
  assert.equal(list[0].instance, 1);
  assert.equal(list[0].prefix, '');
});

test('composeCardList：未知机型返回 null（调用方回退 FCS/ENG）', () => {
  assert.equal(composeCardList(byDisplay6AX, 'NOPE'), null);
  assert.equal(composeCardList({}, '6AX'), null);
});

test('instanceLabel：多实例卡显示 VIM-1 样式，单实例卡只显示卡名', () => {
  assert.equal(instanceLabel({ card: 'VIM', count: 3, instance: 2 }), 'VIM-2');
  assert.equal(instanceLabel({ card: 'HIM', count: 1, instance: 1 }), 'HIM');
});

// ===== getSharedProductInfoRows（记录页共享产品信息取数） =====

function setupRecordGlobals(cards, compose) {
  globalThis.templateData = { cards: cards || {} };
  globalThis.currentCompose = compose || [];
}

test('getSharedProductInfoRows：优先读「产品信息」卡', () => {
  setupRecordGlobals({
    '产品信息': [
      { sec: '产品信息', key: 'productInfo_9' },
      { sec: '产品信息', key: 'productInfo_10' },
    ],
    'HIM': [{ sec: '产品信息', key: 'productInfo_9' }],
  }, [{ card: 'HIM' }, { card: 'VIM' }]);
  const rows = getSharedProductInfoRows();
  assert.deepEqual(rows.map(r => r.key), ['productInfo_9', 'productInfo_10']);
});

test('getSharedProductInfoRows：「产品信息」卡缺失时回退组合首卡', () => {
  setupRecordGlobals({
    'HIM': [{ sec: '产品信息', key: 'productInfo_9' }, { sec: '炮筒通用', key: 'him_barrel_temp' }],
    'VIM': [{ sec: '产品信息', key: 'productInfo_9' }],
  }, [{ card: 'HIM' }, { card: 'VIM' }]);
  const rows = getSharedProductInfoRows();
  assert.deepEqual(rows.map(r => r.key), ['productInfo_9']);
});

test('getSharedProductInfoRows：无任何产品信息行返回空数组', () => {
  setupRecordGlobals({ 'HIM': [{ sec: '炮筒通用', key: 'him_barrel_temp' }] }, [{ card: 'HIM' }]);
  assert.deepEqual(getSharedProductInfoRows(), []);
});

// ===== 记录页实例命名：VIM-1 样式（与用户描述一致） =====

test('记录页实例标签必须使用 VIM-1 样式（连字符而非 #）', () => {
  assert.ok(/inst\.count > 1 \? '-' \+ inst\.instance/.test(recordJs),
    'NPI_ProcessRecord-js.html 实例标签未使用 VIM-N 连字符样式');
});

// ===== 模版页组合视图结构护栏 =====

test('模版页必须定义 composeCardList 与组合渲染（镜像记录页结构）', () => {
  assert.ok(/function composeCardList\(/.test(tplJs), 'NPI_TemplateCards-js.html 缺少 composeCardList');
  assert.ok(/function renderCardUnit\(/.test(tplJs), 'NPI_TemplateCards-js.html 缺少 renderCardUnit 组合渲染');
});

test('模版页编辑/删除事件委托必须携带卡名（组合视图多卡定位）', () => {
  assert.ok(/\.tpl-edit-btn'[\s\S]{0,300}data\('card'\)/.test(tplJs), '编辑按钮事件未携带 data-card');
  assert.ok(/deleteRow\(\$b\.data\('card'\),\s*parseInt\(\$b\.data\('idx'\)/.test(tplJs), '删除事件未携带 data-card');
});

// ===== 页面加载提示护栏 =====
// 背景：刷新后 loading toast 延迟约 1s 才出现 —— ready 里先发 ensureNPIProductInfoCard
//       后端往返（读全表），返回后才进 loadTemplateMeta 弹 toast；必须先把 toast 弹出来

test('模版页 ready 必须先弹 loading toast 再发起迁移请求', () => {
  const readyStart = tplJs.indexOf('$(document).ready(function () {');
  assert.ok(readyStart >= 0, '未找到 document.ready');
  const readyEnd = tplJs.indexOf('});', readyStart);
  const readyBlock = tplJs.slice(readyStart, readyEnd);
  assert.ok(readyBlock.indexOf('Swal.fire(swalLoading') >= 0, 'ready 内缺少 loading toast');
  assert.ok(readyBlock.indexOf('Swal.fire(swalLoading') < readyBlock.indexOf('ensureNPIProductInfoCard()'),
    'loading toast 必须在迁移请求之前弹出');
});

// ===== ensureNPIProductInfoCard 迁移标记短路（每次刷新不再读全表） =====

(0, eval)(extractFunction(code, 'ensureNPIProductInfoCard'));

test('ensureNPIProductInfoCard：已有迁移完成标记时直接返回，不读表', () => {
  let sheetOpens = 0;
  globalThis.NPI_SS_ID = 'mock-npi';
  globalThis.CacheService = { getScriptCache() { return { get() { return '1'; }, put() {}, remove() {} }; } };
  globalThis.SpreadsheetApp = { openById() { sheetOpens++; return { getSheetByName() { sheetOpens++; return null; } }; } };
  const res = JSON.parse(ensureNPIProductInfoCard());
  assert.equal(res.success, true);
  assert.equal(res.changed, false);
  assert.equal(sheetOpens, 0, '有迁移标记时不应再读表');
});

test('ensureNPIProductInfoCard：迁移检查完成后写入完成标记', () => {
  const putKeys = [];
  globalThis.NPI_SS_ID = 'mock-npi';
  globalThis.CacheService = {
    getScriptCache() {
      return {
        get() { return null; },
        put(k) { putKeys.push(k); },
        remove() {},
      };
    },
  };
  const ws = {
    getDataRange() { return { getValues() { return [[...TPL_HEADER], otherRow('FCS/ENG')]; } }; },
    appendRow() {},
    deleteRow() {},
  };
  globalThis.SpreadsheetApp = { openById() { return { getSheetByName() { return ws; } }; } };
  const res = JSON.parse(ensureNPIProductInfoCard());
  assert.equal(res.success, true);
  assert.ok(putKeys.indexOf('NPI_PI_MIGRATED_FLAG_v1') >= 0, '完成后应写入迁移完成标记');
});
