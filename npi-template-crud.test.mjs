// NPI 工艺参数卡模版页面 — 后端纯函数测试
// 覆盖：buildTemplateKeyPrefix_ / buildTemplateKeyCandidate_ / validateTemplateKey_ /
//       isTemplateKeyUnique_ / findTemplateRowIndex_ / buildTemplateRowArray_
// 背景：新品测试模块新增工艺参数卡模版页（只读展示 + 字段级增删改），
//       行定位 = (卡+工序+字段key) 唯一，新增字段自动生成候选 key 可手改
// 运行：node --test npi-template-crud.test.mjs
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
(0, eval)(extractFunction(code, 'buildTemplateKeyPrefix_'));
(0, eval)(extractFunction(code, 'buildTemplateKeyCandidate_'));
(0, eval)(extractFunction(code, 'validateTemplateKey_'));
(0, eval)(extractFunction(code, 'isTemplateKeyUnique_'));
(0, eval)(extractFunction(code, 'findTemplateRowIndex_'));
(0, eval)(extractFunction(code, 'buildTemplateRowArray_'));

const jsHtml = fs.readFileSync(new URL('./NPI_TemplateCards-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(jsHtml, 'slugKey'));
(0, eval)(extractFunction(jsHtml, 'groupRowsBySection'));;

// ===== buildTemplateKeyPrefix_（卡名 → 小写 key 前缀） =====

test('卡名转小写前缀：字母数字保留', () => {
  assert.equal(buildTemplateKeyPrefix_('HIM'), 'him');
  assert.equal(buildTemplateKeyPrefix_('DP'), 'dp');
});

test('卡名含分隔符：非字母数字转为下划线并折叠', () => {
  assert.equal(buildTemplateKeyPrefix_('OMNI-DB'), 'omni_db');
  assert.equal(buildTemplateKeyPrefix_('FCS/ENG'), 'fcs_eng');
});

test('卡名含中文与空格：中文剔除、空格折叠为下划线', () => {
  assert.equal(buildTemplateKeyPrefix_('H Auto机械手'), 'h_auto');
  assert.equal(buildTemplateKeyPrefix_('6AX自动化'), '6ax');
  assert.equal(buildTemplateKeyPrefix_('3AX自动化'), '3ax');
});

test('卡名首尾下划线被去除', () => {
  assert.equal(buildTemplateKeyPrefix_(' HIM '), 'him');
  assert.equal(buildTemplateKeyPrefix_('-VIM-'), 'vim');
});

// ===== buildTemplateKeyCandidate_（自动生成候选 key） =====

test('无冲突时生成前缀_区块_1', () => {
  assert.equal(buildTemplateKeyCandidate_('HIM', 'Barrel', []), 'him_barrel_1');
});

test('已有 key 时递增到最小未占用序号', () => {
  assert.equal(buildTemplateKeyCandidate_('HIM', 'Barrel', ['him_barrel_1']), 'him_barrel_2');
  assert.equal(buildTemplateKeyCandidate_('HIM', 'Barrel', ['him_barrel_1', 'him_barrel_3']), 'him_barrel_2');
});

test('区块英文转蛇形：空格与大小写处理', () => {
  assert.equal(buildTemplateKeyCandidate_('HIM', 'Hot Runner', []), 'him_hot_runner_1');
  assert.equal(buildTemplateKeyCandidate_('OMNI-DB', 'Aux. Equipment', []), 'omni_db_aux_equipment_1');
});

test('卡或区块为空返回 null', () => {
  assert.equal(buildTemplateKeyCandidate_('', 'Barrel', []), null);
  assert.equal(buildTemplateKeyCandidate_('HIM', '', []), null);
});

// ===== validateTemplateKey_（保存前校验） =====

test('合法 key 通过', () => {
  assert.deepEqual(validateTemplateKey_('him_barrel_temp'), { ok: true, message: '' });
});

test('空 key 拒绝', () => {
  const r = validateTemplateKey_('');
  assert.equal(r.ok, false);
  assert.ok(r.message.length > 0);
});

test('含逗号拒绝（分段列用逗号分隔，key 含逗号会冲突）', () => {
  const r = validateTemplateKey_('him,barrel_temp');
  assert.equal(r.ok, false);
});

test('纯空白 key 拒绝', () => {
  const r = validateTemplateKey_('   ');
  assert.equal(r.ok, false);
});

// ===== isTemplateKeyUnique_（卡+工序 内唯一） =====

// 模拟 sheet 数据：表头 + 行；列 A卡 B工序 G字段key
const header = ['卡', '工序', '区块', '区块EN', '字段CN', '字段EN', '字段key', '类型', '单位', '下限', '上限', '检查部门', '预设', '分段', '状态', '备注'];
const rows = [
  header,
  ['HIM', 'IM', '炮筒通用', 'Barrel', '炮筒温度', 'Barrel Temp', 'him_barrel_temp', 'number', '℃', '', '', '班组/设备', '', '一段,二段', '已确认', ''],
  ['HIM', 'IM', '冷却', 'Cooling', '冷却时间', 'Cooling Time', 'him_cool_cooling_time', 'number', 's', '', '', '设备', '', '', '已确认', ''],
  ['VIM', 'IM', '冷却', 'Cooling', '冷却时间', 'Cooling Time', 'vim_cool_cooling_time', 'number', 's', '', '', '设备', '', '', '已确认', ''],
];

test('卡内无重复 key 返回 true', () => {
  assert.equal(isTemplateKeyUnique_(rows, 'HIM', 'IM', 'him_barrel_new_1', -1), true);
});

test('卡内已有相同 key 返回 false', () => {
  assert.equal(isTemplateKeyUnique_(rows, 'HIM', 'IM', 'him_barrel_temp', -1), false);
});

test('不同卡的相同 key 不冲突', () => {
  assert.equal(isTemplateKeyUnique_(rows, 'VIM', 'IM', 'him_barrel_temp', -1), true);
});

test('不同工序的相同 key 不冲突', () => {
  assert.equal(isTemplateKeyUnique_(rows, 'HIM', 'INJ', 'him_barrel_temp', -1), true);
});

test('excludeIndex 排除自身后视为唯一', () => {
  assert.equal(isTemplateKeyUnique_(rows, 'HIM', 'IM', 'him_barrel_temp', 1), true);
});

test('空数据数组返回 true', () => {
  assert.equal(isTemplateKeyUnique_([], 'HIM', 'IM', 'him_barrel_temp', -1), true);
});

// ===== findTemplateRowIndex_（按 卡+工序+key 定位行） =====

test('找到匹配行返回 data 数组下标', () => {
  assert.equal(findTemplateRowIndex_(rows, 'HIM', 'IM', 'him_cool_cooling_time'), 2);
});

test('卡或工序或 key 不匹配返回 -1', () => {
  assert.equal(findTemplateRowIndex_(rows, 'VIM', 'IM', 'him_cool_cooling_time'), -1);
  assert.equal(findTemplateRowIndex_(rows, 'HIM', 'INJ', 'him_cool_cooling_time'), -1);
  assert.equal(findTemplateRowIndex_(rows, 'HIM', 'IM', 'not_exist'), -1);
});

test('空白匹配忽略前后空格', () => {
  assert.equal(findTemplateRowIndex_(rows, ' HIM ', ' IM ', ' him_cool_cooling_time '), 2);
});

test('空数据数组返回 -1', () => {
  assert.equal(findTemplateRowIndex_([], 'HIM', 'IM', 'x'), -1);
});

// ===== buildTemplateRowArray_（行对象 → 16 列数组） =====

test('完整行对象映射 16 列', () => {
  const row = {
    sec: '炮筒通用', secEn: 'Barrel', cn: '炮筒温度', en: 'Barrel Temp',
    key: 'him_barrel_temp', type: 'number', unit: '℃', lo: '', hi: '',
    dept: '班组/设备', preset: '', segs: ['一段', '二段'], status: '已确认', note: '',
  };
  assert.deepEqual(buildTemplateRowArray_('HIM', 'IM', row), [
    'HIM', 'IM', '炮筒通用', 'Barrel', '炮筒温度', 'Barrel Temp', 'him_barrel_temp',
    'number', '℃', '', '', '班组/设备', '', '一段,二段', '已确认', '',
  ]);
});

test('segs 缺省为空数组时写空串', () => {
  const row = { key: 'k', segs: undefined };
  const arr = buildTemplateRowArray_('HIM', 'IM', row);
  assert.equal(arr.length, 16);
  assert.equal(arr[13], '');
  assert.equal(arr[0], 'HIM');
  assert.equal(arr[1], 'IM');
});

test('segs 为空串元素被过滤', () => {
  const row = { key: 'k', segs: ['一段', '', '二段'] };
  assert.equal(buildTemplateRowArray_('HIM', 'IM', row)[13], '一段,二段');
});

// ===== 前端纯函数（NPI_TemplateCards-js.html 抽取） =====

test('slugKey：与后端前缀规则一致', () => {
  assert.equal(slugKey('OMNI-DB'), 'omni_db');
  assert.equal(slugKey('H Auto机械手'), 'h_auto');
  assert.equal(slugKey(''), '');
});

test('groupRowsBySection：按首次出现顺序分组，保留行序', () => {
  const rows = [
    { sec: '炮筒A', secEn: 'Barrel A', key: 'a1' },
    { sec: '冷却', secEn: 'Cooling', key: 'b1' },
    { sec: '炮筒A', secEn: 'Barrel A', key: 'a2' },
    { sec: '', secEn: '', key: 'c1' },
  ];
  const sections = groupRowsBySection(rows);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].sec, '炮筒A');
  assert.deepEqual(sections[0].rows.map(r => r.key), ['a1', 'a2']);
  assert.equal(sections[1].sec, '冷却');
  assert.equal(sections[2].sec, '（未分区）');
});

test('groupRowsBySection：空数组返回空分区列表', () => {
  assert.deepEqual(groupRowsBySection([]), []);
});
