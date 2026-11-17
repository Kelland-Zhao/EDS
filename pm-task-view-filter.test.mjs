import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./PM_Task-js_1.0.html', import.meta.url), 'utf8');
const binding = source.match(/\$\('#pmViewToggle \.btn'\)\.off\('click'\)\.on\('click',\s*(function \(\) \{[\s\S]*?\n\s*\})\);/);
assert.ok(binding, '未找到保养任务角色标签的点击处理函数');

// 只替代 DataTables API 边界，检查实际点击处理函数发出的筛选指令。
function viewFilter() {
  const columnSearches = [];
  const globalSearches = [];
  let draws = 0;
  const table = {
    column(index) {
      return { search(...args) { columnSearches.push({ index, args }); return table; } };
    },
    search(...args) { globalSearches.push(args); return table; },
    draw() { draws++; return table; },
  };
  function $(target) {
    return {
      data() { return target.view; },
      removeClass() { return this; },
      addClass() { return this; },
    };
  }
  const click = new Function('$', 'table_tasklist', 'return (' + binding[1] + ');')($, table);
  return {
    select(view) { click.call({ view }); },
    columnSearches, globalSearches,
    get draws() { return draws; },
  };
}

for (const [role, keyword] of [['tech', '技术员'], ['opc', '操作员']]) {
  test(role + ' → 全部：必须清除原资源列筛选并重绘', () => {
    const filter = viewFilter();
    filter.select(role);
    filter.select('all');
    assert.deepEqual(filter.columnSearches, [
      { index: 5, args: [keyword, true, false] },
      { index: 5, args: [''] },
    ]);
    assert.equal(filter.draws, 2);
  });
}

test('角色标签反复切换后，每次全部都会清除资源列条件', () => {
  const filter = viewFilter();
  for (const view of ['tech', 'opc', 'all', 'tech', 'all']) filter.select(view);
  assert.deepEqual(filter.columnSearches.map(query => query.args[0]), ['技术员', '操作员', '', '技术员', '']);
  assert.equal(filter.draws, 5);
});

test('全部保留原有清空全表搜索的行为，角色标签不修改全表搜索', () => {
  const filter = viewFilter();
  filter.select('tech');
  filter.select('opc');
  assert.deepEqual(filter.globalSearches, []);
  filter.select('all');
  assert.deepEqual(filter.globalSearches, [['']]);
});
