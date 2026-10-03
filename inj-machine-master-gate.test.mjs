// 未登录拦截（维护页兜底）+ 登录后回跳（登录页 next）测试
// 运行：node --test inj-machine-master-gate.test.mjs
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

const mmJs = fs.readFileSync(new URL('./INJ_MachineMaster-js.html', import.meta.url), 'utf8');
const loginJs = fs.readFileSync(new URL('./home_new_1.0-js.html', import.meta.url), 'utf8');
(0, eval)(extractFunction(mmJs, 'mmGateRedirect_'));
(0, eval)(extractFunction(loginJs, 'loginTargetRoute_'));

const EXEC = 'https://script.google.com/a/colpal.com/macros/s/AKfycbTESTDEPLOYID/exec';

// ===== 登录闸门面板 =====
// GAS 沙箱禁自动顶层跳转（allow-top-navigation 未设，只有 by-user-activation），
// 官方指定做法是给用户一个可点的链接，目标 _top / _blank——所以此处必须是真的 <a>，不能用 JS 跳

(0, eval)(extractFunction(mmJs, 'escapeAttr'));
(0, eval)(extractFunction(mmJs, 'mmLoginGateHtml_'));

test('登录面板同时给出整页跳转与备用新标签页两个真实链接', () => {
  const html = mmLoginGateHtml_('https://script.google.com/a/colpal.com/macros/s/ID/exec?v=home_new_1.0&next=INJ_MachineMaster');
  assert.ok(
    html.includes('href="https://script.google.com/a/colpal.com/macros/s/ID/exec?v=home_new_1.0&amp;next=INJ_MachineMaster" target="_top"'),
    '主链接：整页跳转到登录页'
  );
  assert.ok(html.includes('target="_blank"'), '备用链接：新标签页打开');
});

test('登录面板对地址做属性转义，不会冲破 href', () => {
  const html = mmLoginGateHtml_('https://e/x?a="1"&b=<2>');
  assert.ok(!html.includes('"1"'), '原始引号不得出现');
  assert.ok(html.includes('&quot;1&quot;'), '引号必须转义');
  assert.ok(html.includes('&lt;2&gt;'), '尖括号必须转义');
});

// ===== 跨文件契约：兜底与回跳拼的路由名必须真实注册在 doGet 里，否则静默失效 =====

test('兜底/回跳用到的 doGet 路由真实存在', () => {
  const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
  assert.ok(code.includes('Route.path("home_new_1.0"'), '登录页路由 home_new_1.0');
  assert.ok(code.includes('Route.path("INJ_MachineMaster"'), '维护页路由 INJ_MachineMaster');
});

// ===== 登录页是全站入口：模板变量 intoNext 漏传会让 home_new_1.0 渲染直接抛错 =====

const code = fs.readFileSync(new URL('./Code.js', import.meta.url), 'utf8');
(0, eval)(code);

globalThis.ScriptApp = { getService: () => ({ getUrl: () => 'https://example.com/exec' }) };

test('loadhome_new 把 next 注入模板变量 intoNext', () => {
  let captured = null;
  globalThis.render = (file, obj) => {
    captured = { file, obj };
    return { setTitle: () => ({ setFaviconUrl: () => null }) };
  };
  loadhome_new('', '', '', '', 'INJ_MachineMaster');
  assert.equal(captured.file, 'home_new_1.0');
  assert.equal(captured.obj.intoNext, 'INJ_MachineMaster');
});

test('loadhome_new 没有 next 时注入空串（模板变量不能是 undefined）', () => {
  let captured = null;
  globalThis.render = (file, obj) => {
    captured = { file, obj };
    return { setTitle: () => ({ setFaviconUrl: () => null }) };
  };
  loadhome_new();
  assert.equal(captured.obj.intoNext, '');
});

test('所有 home_new_1.0 渲染点都传了 intoNext', () => {
  const sites = code.split('render("home_new_1.0"').slice(1);
  assert.ok(sites.length >= 2, 'doGet 默认分支与 loadhome_new 两处都要渲染登录页');
  sites.forEach((s, i) => {
    assert.ok(s.slice(0, 120).includes('intoNext'), `第 ${i + 1} 处渲染点漏传 intoNext`);
  });
});

// ===== 维护页兜底：未登录 → 走登录页，登录后回到维护页 =====

test('未登录（sessionStorage 无 ID）返回登录页地址并带 next 回跳', () => {
  assert.equal(
    mmGateRedirect_(EXEC, ''),
    EXEC + '?v=home_new_1.0&next=INJ_MachineMaster'
  );
});

test('未登录（undefined / null / 纯空白）一律拦截', () => {
  assert.equal(mmGateRedirect_(EXEC, undefined), EXEC + '?v=home_new_1.0&next=INJ_MachineMaster');
  assert.equal(mmGateRedirect_(EXEC, null), EXEC + '?v=home_new_1.0&next=INJ_MachineMaster');
  assert.equal(mmGateRedirect_(EXEC, '   '), EXEC + '?v=home_new_1.0&next=INJ_MachineMaster');
});

test('已登录返回空串（不跳转）', () => {
  assert.equal(mmGateRedirect_(EXEC, '12345'), '');
});

test('拿不到部署地址时不拼相对地址跳转', () => {
  assert.equal(mmGateRedirect_('', '12345'), '');
  assert.equal(mmGateRedirect_('', ''), '');
  assert.equal(mmGateRedirect_(undefined, ''), '');
});

// ===== 登录页：next 白名单校验，登录后打开目标页 =====

test('next 为空回退导航页', () => {
  assert.equal(loginTargetRoute_(''), 'Navigation');
  assert.equal(loginTargetRoute_(undefined), 'Navigation');
  assert.equal(loginTargetRoute_(null), 'Navigation');
});

test('next 为合法路由时原样使用', () => {
  assert.equal(loginTargetRoute_('INJ_MachineMaster'), 'INJ_MachineMaster');
  assert.equal(loginTargetRoute_('PM_Plan_1.0'), 'PM_Plan_1.0');
  assert.equal(loginTargetRoute_('home_new_1.0'), 'home_new_1.0');
});

test('next 含 URL 拼接字符（注入尝试）一律回退导航页', () => {
  assert.equal(loginTargetRoute_('INJ_MachineMaster&ID=99999'), 'Navigation');
  assert.equal(loginTargetRoute_('INJ_MachineMaster?x=1'), 'Navigation');
  assert.equal(loginTargetRoute_('../evil'), 'Navigation');
  assert.equal(loginTargetRoute_('a b'), 'Navigation');
  assert.equal(loginTargetRoute_('机台'), 'Navigation');
});
