# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

高露洁三笑设备部数字化系统 (EDS) — Google Apps Script (GAS) Web App，用于设备保养管理、故障报修、点检、交接班、模具管理等。

## 常用命令

```bash
clasp pull              # 从 GAS 拉取最新代码
clasp push              # 推送本地代码到 GAS
git status              # 查看变更状态
git add <file>          # 暂存文件
git commit -m "VYYYYMMDD.XX_描述"  # 提交（版本命名规范）
```

## 架构

### 路由机制
- 入口函数 `doGet(e)` 在 `Code.js`，通过 `e.parameters.v` 做路由分发
- `Route.path("页面名", load函数)` 注册路由，无匹配时 fallback 到登录页 `home_new_1.0`
- `render(file, obj)` 用 `HtmlService.createTemplateFromFile` 渲染页面

### 文件结构约定
- 每个功能页面**一对文件**：`ModuleName.html`（UI 结构）+ `ModuleName-js.html`（JS 逻辑）
- `-js.html` 文件在 HTML 页面底部通过 `<?!=include("XXX_js") ?>` 引入
- 第三方库以 `Kez_` 前缀内联为 HTML 文件（Bootstrap 5.3.1、jQuery 3.6.4、DataTables 1.13.6、Select2 4.0.13、SweetAlert2 等）
- `CSS.html` 存放全局样式
- `appsscript.json` 记录 OAuth scope 和部署配置

### 数据流
- 前端通过 `google.script.run.withSuccessHandler(cb).serverFunction(args)` 调用后端
- 后端 `Code.js` 操作 Google Sheets / Drive / Documents 作为数据库
- 用户信息存 `sessionStorage`（ID, Name, PWD, Process, Workshop）
- 页面间通过 URL query params 传递参数（`?v=PageName&ID=xxx&Name=xxx`）

### UI规范
- **表头格式**：中文在上，英文在下，使用 `<br>` 换行，不使用 `/` 分隔符
  - 正确：`<th>保养计划<br>PM Plan</th>`
  - 错误：`<th>保养计划 / PM Plan</th>` 或 `<th>保养计划/ PM Plan</th>`
- 数据 key 保持不变（如 `"保养状态/ PM Status"`），仅前端显示 title 做转换
- **Navbar 标题例外**：navbar 品牌标题使用 `"中文 / English"` 格式（`/` 分隔），不套用上述 `<br>` 规则

### 版本命名规范
- 提交格式：`VYYYYMMDD.XX_修改描述`，如 `V20260506.01_登录界面版本号升级至2.0`

### 注意事项
- `Google API/` 目录含 service account 私钥，已在 `.gitignore` 中排除，禁止提交
- `.clasp.json` 和 `appsscript.json` 也在 `.gitignore` 中（本地配置不提交）
- Web App 以 `USER_DEPLOYING` 身份运行，访问权限为 `DOMAIN`（colpal.com 域内）
- 时区：`Asia/Hong_Kong`

###后端数据
https://docs.google.com/spreadsheets/d/1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U/edit?gid=1865158446#gid=1865158446 -- 保养模块任务清单数据
https://docs.google.com/spreadsheets/d/1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4/edit?gid=0#gid=0 -- 保养模块保养记录数据
https://docs.google.com/spreadsheets/d/10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w/edit?gid=572953716#gid=572953716 -- 交接班模块记录数据
