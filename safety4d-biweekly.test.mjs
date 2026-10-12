// 安全 4D 问题讲述提醒 — 双周周一判定测试（.mjs 扩展名，clasp 不会推送到 GAS）
// 运行：node --test safety4d-biweekly.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 用花括号配对从 INJ_SDM_Summary-js.html 中提取函数定义，单独 eval（不依赖 jQuery / GAS 全局）
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

const html = fs.readFileSync(new URL('./INJ_SDM_Summary-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(html, 'safety4dWeekOfYear'));
(0, eval)(extractFunction(html, 'isSafety4DDay'));
(0, eval)(extractFunction(html, 'safety4dForceFlag'));
(0, eval)(extractFunction(html, 'shouldShowSafety4D'));

const d = s => {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
};

// 独立对照实现：ISO 定义「第 1 周 = 含 1 月 4 日的那一周」，从该周周一起数周一
// （与实现用的「周四序数 ÷7」推导路径不同，用于交叉验证）
function isoWeekOracle(date) {
  const dowOf = x => x.getUTCDay() || 7;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const thursday = new Date(utc);
  thursday.setUTCDate(utc.getUTCDate() + 4 - dowOf(utc));
  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dowOf(jan4) - 1));
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() - (dowOf(utc) - 1));
  return Math.round((monday - week1Monday) / 86400000 / 7) + 1;
}

test('周序号与系统日历 ISO 周数一致（date +%V 核对值）', () => {
  const known = {
    '2025-12-29': 1,   // 属 2026 年第 1 周（跨年归属）
    '2026-01-01': 1,
    '2026-01-05': 2,
    '2026-10-12': 42,  // 今天
    '2026-10-19': 43,
    '2026-10-26': 44,
    '2026-12-21': 52,
    '2026-12-28': 53,  // 2026 年有 53 个 ISO 周
    '2027-01-04': 1,   // 按年重置
    '2027-01-11': 2
  };
  for (const [date, week] of Object.entries(known)) {
    assert.equal(safety4dWeekOfYear(d(date)), week, `${date} 应为第 ${week} 周`);
  }
});

test('双周（偶数周）周一提醒', () => {
  assert.equal(isSafety4DDay(d('2026-10-12')), true, '第 42 周（双周）应提醒');
  assert.equal(isSafety4DDay(d('2026-10-26')), true, '第 44 周（双周）应提醒');
  assert.equal(isSafety4DDay(d('2026-10-19')), false, '第 43 周（单周）不提醒');
});

test('非周一不提醒（提醒周内的周二至周日）', () => {
  for (const date of ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']) {
    assert.equal(isSafety4DDay(d(date)), false, `${date} 不是周一，不应提醒`);
  }
});

test('跨年按每年重置：2026-12-21 → 2027-01-11（中间隔三周）', () => {
  assert.equal(isSafety4DDay(d('2026-12-21')), true, '第 52 周（双周）应提醒');
  assert.equal(isSafety4DDay(d('2026-12-28')), false, '第 53 周（单周）不提醒');
  assert.equal(isSafety4DDay(d('2027-01-04')), false, '2027 第 1 周（单周）不提醒');
  assert.equal(isSafety4DDay(d('2027-01-11')), true, '2027 第 2 周（双周）应提醒');
});

test('年初归属：2025-12-29 属 2026 第 1 周，不提醒', () => {
  assert.equal(isSafety4DDay(d('2025-12-29')), false);
});

test('测试开关：?safety4d=1 强制提醒，?safety4d=0 强制不提醒，其余按日期', () => {
  assert.equal(shouldShowSafety4D('?safety4d=1', d('2026-10-19')), true, '强制开关应覆盖单周');
  assert.equal(shouldShowSafety4D('?safety4d=0', d('2026-10-12')), false, '强制关闭应覆盖双周');
  assert.equal(shouldShowSafety4D('', d('2026-10-12')), true, '无参数时按日期（双周提醒）');
  assert.equal(shouldShowSafety4D('', d('2026-10-19')), false, '无参数时按日期（单周不提醒）');
  assert.equal(shouldShowSafety4D('?v=INJ_SDM_Summary', d('2026-10-26')), true, '其他参数不影响判定');
});

test('2025-12-29 ~ 2027-12-31 每个周一与独立对照实现完全一致', () => {
  const cur = d('2025-12-29');
  const end = d('2027-12-31');
  let mondays = 0;
  let remindDays = 0;
  const gapDays = [];
  let prev = null;
  while (cur <= end) {
    if (cur.getDay() === 1) {
      mondays++;
      const expectedWeek = isoWeekOracle(cur);
      assert.equal(safety4dWeekOfYear(cur), expectedWeek, `${cur.toDateString()} 周序号`);
      const expected = expectedWeek % 2 === 0;
      assert.equal(isSafety4DDay(cur), expected, `${cur.toDateString()} 是否提醒`);
      if (expected) {
        remindDays++;
        if (prev) gapDays.push(Math.round((cur - prev) / 86400000));
        prev = new Date(cur); // 存副本：cur 会被循环推进
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  assert.equal(mondays, 105, '区间内应有 105 个周一');
  // 每年重置会产生 21 天间隔（2026-12-21 → 2027-01-11），其余均为 14 天
  assert.deepEqual([...new Set(gapDays)].sort((a, b) => a - b), [14, 21], '提醒间隔只能是 14 天或跨年重置的 21 天');
  assert.equal(gapDays.filter(g => g === 21).length, 1, '区间内只应出现 1 次跨年重置');
  assert.equal(remindDays, 52, '区间内应有 52 个提醒日');
});
