// FCS-43 多点测量试点 fixture 与端到端校验
// 运行：node --test pm-measurement-fcs43.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

function fcs43Task(overrides) {
  return Object.assign({
    'Task No': 'FCS-43',
    'Task Description': '使用哥林柱拉力检测仪测量四根锁模哥林柱拉力数值，并记录',
    'PdM?': '是/ Yes',
    Unit: '哥林柱',
    Component: '锁模机构',
    Logic: 'HighAlarm_Max',
    TagName: 'S1-S4',
    'LL Limited': '',
    'HH Limited': '',
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
    'Photo Required': 'Y',
    taskStatus: true,
    measurements: [
      { point: 'S1', value: 125, unit: 'kN' },
      { point: 'S2', value: 126, unit: 'kN' },
      { point: 'S3', value: 124, unit: 'kN' },
      { point: 'S4', value: 127, unit: 'kN' },
    ],
    photos: [{ fileId: 'F1', name: 'PM-001_FCS-43_1.jpg', status: 'success' }],
  }, overrides || {});
}

test('FCS-43 完整四点（含 0 值）是有效测量', () => {
  const task = fcs43Task({
    measurements: [
      { point: 'S1', value: 0, unit: 'kN' },
      { point: 'S2', value: 0, unit: 'kN' },
      { point: 'S3', value: 0, unit: 'kN' },
      { point: 'S4', value: 0, unit: 'kN' },
    ],
  });
  assert.deepEqual(pmTaskEndErrors_([task]), []);
});

test('FCS-43 缺任一测点被后端拒绝', () => {
  const task = fcs43Task({
    measurements: [
      { point: 'S1', value: 125, unit: 'kN' },
      { point: 'S2', value: 126, unit: 'kN' },
      { point: 'S4', value: 127, unit: 'kN' },
    ],
  });
  const errors = pmTaskEndErrors_([task]);
  assert.ok(errors.some((e) => e.field === 'S3'));
});

test('FCS-43 单位缺失被后端拒绝', () => {
  const errors = pmTaskEndErrors_([fcs43Task({ 'Measurement Unit': '' })]);
  assert.ok(errors.some((e) => e.field === 'Measurement Unit'));
});

test('FCS-43 限值为空时结论为待判定且允许结束', () => {
  const task = fcs43Task();
  assert.equal(pmInspectionResult_(task), '待判定');
  assert.deepEqual(pmTaskEndErrors_([task]), []);
});

test('FCS-43 照片上传失败被拒绝，成功则通过', () => {
  const failed = fcs43Task({ photos: [{ fileId: 'F1', name: 'x.jpg', status: 'failed' }] });
  assert.ok(pmTaskEndErrors_([failed]).some((e) => e.field === 'Photo'));
  assert.ok(!pmTaskEndErrors_([fcs43Task()]).some((e) => e.field === 'Photo'));
});

test('旧工单没有 Measurement Points 时跳过测量校验', () => {
  const oldTask = {
    'Task No': 'FCS-38',
    'PdM?': '是/ Yes',
    taskStatus: true,
    valueAndNote: '125',
    photos: [{ fileId: 'F1', name: 'x.jpg', status: 'success' }],
  };
  assert.deepEqual(pmTaskEndErrors_([oldTask]), []);
});

test('FCS-43 结果计算：kN 求和、限值为空为待判定', () => {
  const tasks = [fcs43Task()];
  pmPrepareMeasurementResults_(tasks);
  assert.equal(tasks[0].measurementTotal, 502);
  assert.equal(tasks[0].inspectionResult, '待判定');
});
