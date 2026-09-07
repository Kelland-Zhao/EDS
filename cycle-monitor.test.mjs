// 周期监控报警分级 — Node 内置 test runner 测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test cycle-monitor.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 将 Code.js（GAS 脚本，顶层仅 const + 函数定义）加载进全局作用域
const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code); // 间接 eval（sloppy mode）：函数声明挂到 globalThis，闭包可见顶层 const

// ===== GAS 全局 stub（仅测试用） =====
// 与 Code.js 顶层常量 CYCLE_SS_ID 保持一致
const CYCLE_SS_ID = "1cfJBxEKnNcwt1xH_tSRjKpD6Dv1JqOEzJxi2p7mZiZM";
const fakeSS = {};
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
      getValue: () => (rows[r - 1] || [])[c - 1] ?? '',
      setValue: () => {},
    }),
    getDataRange: () => ({ getValues: () => rows }),
  };
}
globalThis.SpreadsheetApp = {
  openById: (id) => ({ getSheetByName: (n) => fakeSS[id]?.[n] ?? null }),
};
globalThis.Utilities = { formatDate: () => '' };
globalThis.Session = { getScriptTimeZone: () => 'Asia/Hong_Kong' };

// ===== 1. classifyCycleDeviation 边界分级 =====
test('classifyCycleDeviation 边界分级：<-1 或 >+3 红，±0.5 内绿，其余橙', () => {
  const cases = [
    [-1.01, 'red'],
    [-1, 'orange'],
    [-0.51, 'orange'],
    [-0.5, 'green'],
    [0, 'green'],
    [0.5, 'green'],
    [0.51, 'orange'],
    [3, 'orange'],
    [3.01, 'red'],
  ];
  for (const [dev, expected] of cases) {
    assert.equal(globalThis.classifyCycleDeviation(dev), expected, `deviation=${dev}`);
  }
});

// ===== 2. getCycleMonitorData 下发 thresholds 且按新阈值分级 =====
test('getCycleMonitorData 返回 thresholds 且按新阈值分级', () => {
  const today = new Date();
  const pad = (n) => ('0' + n).slice(-2);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // 标准表：col0 机台号, col2 标准周期(10s)
  fakeSS[CYCLE_SS_ID] = {
    '机台周期标准': fakeSheet([['机台号', 'x', '标准周期'], ['H1TEST1', 'x', 10]]),
    // 实际表：col0 机台号, col2 班别, col3 周期, col5 日期
    '机台周期实际值': fakeSheet([
      ['机台号', 'x', '班别', '周期', 'x', '日期'],
      ['H1TEST1', '', '早班(07-19)', 8.4, '', todayStr],  // 偏差 -1.6 → red
      ['H1TEST1', '', '早班(07-19)', 9.6, '', todayStr],  // 偏差 -0.4 → green
      ['H1TEST1', '', '早班(07-19)', 10.0, '', todayStr], // 偏差 0 → green
      ['H1TEST1', '', '早班(07-19)', 10.6, '', todayStr], // 偏差 +0.6 → orange
      ['H1TEST1', '', '早班(07-19)', 13.5, '', todayStr], // 偏差 +3.5 → red
    ]),
  };

  const result = globalThis.getCycleMonitorData(['H1TEST1'], 7);
  assert.ok(!result.error, result.error);

  // thresholds 下发：前端参考线单一数据源
  assert.deepEqual(result.thresholds, {
    greenLow: -0.5, greenHigh: 0.5, alarmLow: -1, alarmHigh: 3,
  });

  const machine = result.machines[0];
  assert.equal(machine.name, 'H1TEST1');
  assert.equal(machine.standard, 10);
  assert.deepEqual(
    machine.points.map(p => p.status),
    ['red', 'green', 'green', 'orange', 'red']
  );
  assert.equal(machine.anomalyCount, 2);
});
