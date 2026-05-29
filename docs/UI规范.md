# EDS 页面 UI 规范 / UI Design Guide

> 基于 2026-05-25 Navigation 页面重设计提取，用于指导后续其他页面改造。
> 目标：跨页面视觉一致、降低用户认知成本、加快新页面开发速度。

---

## 1. 设计原则

| 原则 | 说明 |
|---|---|
| 信息优先 | 不用装饰动画（如跑马灯）占用首屏；用静态、可扫读的布局 |
| 业务驱动分组 | 同业务域功能放一起，跨业务域用视觉分隔 |
| 双语并存 | 中文为主，英文为辅，永远使用"中文上+英文下"格式，不用 `/` 横向分隔 |
| 状态可见 | 禁用/即将上线/异常状态必须有视觉标识，不能让用户怀疑"是不是坏了" |
| 响应式优先 | 桌面/平板/移动各断点都要可用，不假设用户只在桌面访问 |

---

## 2. 视觉系统

### 2.1 配色

| 用途 | 色值 | 应用场景 |
|---|---|---|
| 主品牌色 | `#E60012` | navbar 背景、表头背景、分组标题左边框、用户名/警示文字、按钮 hover 边框 |
| 页面背景 | `#f5f6f8` | body 背景（注意：旧页面没有这条，新页面改造时优先加上） |
| 卡片/表单底色 | `#ffffff` | 卡片、模态框、表单容器 |
| 边框/分隔色 | `#e9ecef` | 卡片默认边框、分组线 |
| 次要文字 | `#6c757d` / `#888` | 分组标题、英文副标题、meta 信息 |
| 主体文字 | `#333` | 正文、标题 |

**业务域配色**（仅用于导航/仪表板类页面的图标着色）：
| 业务域 | 色值 | 图标颜色用途 |
|---|---|---|
| 日常作业 Daily Operations | `#0d6efd`（蓝） | 保养/点检/工艺等高频操作 |
| 故障与改善 Fault & Improvement | `#fd7e14`（橙） | 故障/项目/MoC 等异常处理 |
| 资产管理 Asset Management | `#198754`（绿） | 模具/备件/特检等长周期管理 |

**状态色**（来自 CSS.html，所有页面通用）：
| 状态 | 背景 | 文字 | class |
|---|---|---|---|
| 进行中 | `#fff3cd` | `#856404` | `.status-ongoing` |
| 已完成 | `#d4edda` | `#155724` | `.status-completed` |
| 可编辑高亮 | `#fff3cd` + 黄边 | — | `.editable-cell` |

### 2.2 字号

| 元素 | 字号 | 字重 |
|---|---|---|
| navbar 品牌名 | `xx-large` | bold |
| 分组标题 (section-title) | `13px` | 700，字距 1px，大写英文 |
| 卡片中文标题 | `14px` | 600 |
| 卡片英文副标题 | `11px` | 400，灰色 |
| 欢迎条文字 | `16px` | 正文 400，用户名 600 |
| 表格表头 | `12px` | bold |
| 表格内容 | `12px` | 400 |
| 按钮文字 | `1rem` (16px) | 正文 |

### 2.3 间距

- 页面外边距：`px-3`（左右）
- 分组之间：`margin: 18px 0 10px`（section-title 用）
- 卡片之间：Bootstrap grid 的 `g-3`（gap 1rem）
- 卡片内边距：`16px 14px`
- 模态框按钮间距：`d-grid gap-3`

---

## 3. 页面骨架模板

所有页面顶部必须用：

```html
<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <base target="_top">
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- 按需选择 include，CSS 在前，JS 库引用在底部 -->
  <?!=include("Kez_Bootstrap@5.3.1_css");?>
  <?!=include("Kez_datatables@1.11.5_css");?>
  <?!=include("kez_Datatables_css");?>
  <?!=include("Kez_Select2@4.0.13_css");?>           <!-- 仅需要下拉时 -->
  <?!=include("Kez_bootstrap-datepicker_css");?>      <!-- 仅需要日期选择时 -->
  <?!=include("CSS");?>
  <?!=include("Kez_sweetalert2_js");?>
  <!-- 图标按需引入 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
</head>

<body>
  <!-- 顶部 navbar -->
  <nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
      <a class="navbar-brand"
        style="color: white; font-size: xx-large; font-weight: bold;">
        中文名 / English Name
      </a>
    </div>
  </nav>

  <!-- 主体内容 -->
  <div class="container-fluid px-3">
    ... 业务内容 ...
  </div>

  <!-- 模态框（如有） -->
  <div class="modal fade" id="xxxModal" tabindex="-1" aria-hidden="true">...</div>
</body>

<?!=include("Kez_jquery@3.6.4_js") ?>
<?!=include("Kez_datatables@1.13.6_js") ?>
<?!=include("Kez_bootstrap@5.3.1_js") ?>
<?!=include("Kez_select2@4.0.13_js") ?>              <!-- 按需 -->
<?!=include("Kez_bootstrap-datepicker-js") ?>         <!-- 按需 -->
<?!=include("Kez_sweetalert2_js") ?>
<?!=include("PageName_js") ?>
</html>
```

**强制规则**：
- `<!DOCTYPE html>` + `<html lang="zh-CN">`，旧页面只写 `<html>` 的要补上
- `<meta charset="UTF-8">` 必须有
- navbar 品牌名格式是**例外**：用 `中文 / English`（横线分隔），不用 `<br>` 换行（来自 CLAUDE.md）

---

## 4. 核心组件

### 4.1 欢迎条 welcome-bar

用于登录后第一屏，替代跑马灯。

```html
<div class="welcome-bar">
  <div class="greet">
    <span id="name"></span>，欢迎进入 XX 模块 / Welcome to XX Module
  </div>
</div>

<style>
.welcome-bar {
  background: #fff;
  border-left: 4px solid #E60012;
  padding: 10px 18px;
  margin: 12px 0 18px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.welcome-bar .greet { color: #333; font-size: 16px; }
.welcome-bar .greet #name { color: #E60012; font-weight: 600; }
</style>
```

### 4.2 分组标题 section-title

用于一个页面里需要把多个区块语义分组时。

```html
<div class="section-title">日常作业 / DAILY OPERATIONS</div>

<style>
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #6c757d;
  letter-spacing: 1px;
  margin: 18px 0 10px;
  border-left: 3px solid #E60012;
  padding-left: 10px;
}
</style>
```

**英文部分大写**，是视觉锚点，不是"内容"。

### 4.3 导航卡 nav-card

适合：导航/仪表板/快捷入口页。

```html
<div class="row g-3 domain-daily">
  <div class="col-6 col-md-4 col-lg-3">
    <button type="button" class="nav-card" id="PageId">
      <i class="bi bi-tools icon"></i>
      <div class="title-cn">中文功能名</div>
      <div class="title-en">English Name</div>
    </button>
  </div>
</div>

<style>
.nav-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 14px;
  cursor: pointer;
  transition: all .15s;
  border: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 96px;
  justify-content: center;
  color: #333;
  width: 100%;
}
.nav-card:hover {
  border-color: #E60012;
  box-shadow: 0 4px 12px rgba(230,0,18,0.12);
  transform: translateY(-2px);
  color: #E60012;
}
.nav-card:disabled,
.nav-card.disabled {
  opacity: .5;
  cursor: not-allowed;
  background: #f8f9fa;
  position: relative;
}
.nav-card .icon { font-size: 26px; margin-bottom: 6px; }
.nav-card .title-cn { font-size: 14px; font-weight: 600; line-height: 1.2; }
.nav-card .title-en { font-size: 11px; color: #888; margin-top: 2px; line-height: 1.2; }
/* 业务域配色，与 4.4 表格列配色保持业务一致 */
.domain-daily .nav-card .icon { color: #0d6efd; }
.domain-fault .nav-card .icon { color: #fd7e14; }
.domain-asset .nav-card .icon { color: #198754; }
</style>
```

**禁用态标识**（"即将上线"小标签）：
```html
<button type="button" class="nav-card disabled" disabled>
  <span class="badge-soon">即将上线</span>
  <i class="bi bi-folder icon"></i>
  <div class="title-cn">文档索引</div>
  <div class="title-en">Document Library</div>
</button>
<style>
.nav-card .badge-soon {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #adb5bd;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}
</style>
```

### 4.4 数据表格 (DataTables)

沿用现有项目惯例，**所有表格统一规范**：

```html
<table id="xxxTable" class="display bilingual-table" style="width:100%">
  <thead>
    <tr>
      <th>列名中文<br>Column EN</th>
      ...
    </tr>
  </thead>
</table>

<style>
#xxxTable thead th {
  background-color: #E60012 !important;
  color: white !important;
  position: sticky;
  top: 0;
  z-index: 10;
}
#xxxTable th, #xxxTable td {
  padding: 5px 6px;
  font-size: 12px;
  vertical-align: middle;
}
#xxxTable tbody tr.odd > td { background-color: #f5f5f5; }
#xxxTable tbody tr.even > td { background-color: #ffffff; }
</style>
```

**规则**：
- 表头红底白字，sticky 顶部
- 双语表头**必须**用 `<br>` 换行（中上英下），不用 `/`
- 数据 key 保持原样（如 `"保养状态/ PM Status"`），只前端显示时拆分
- 斑马纹隔行变色

### 4.5 模态框 Modal

用于功能聚合（如一个按钮触发出 5 个子功能选择）。子按钮采用**卡片式**布局：左图标 + 中英双行文字 + 右箭头，hover 时红边框 + 右移 2px。

```html
<div class="modal fade" id="xxxModal" tabindex="-1" aria-labelledby="xxxModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="xxxModalLabel">标题中文 / English Title</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <!-- modal-body 加业务域 class：modal-domain-daily / modal-domain-fault / modal-domain-asset -->
      <div class="modal-body modal-domain-daily">
        <div class="d-grid gap-2">
          <button class="modal-card-btn" type="button" id="Sub_Action_1">
            <i class="bi bi-xxx mc-icon"></i>
            <div class="mc-text">
              <div class="title-cn">子功能中文</div>
              <div class="title-en">Sub Action EN</div>
            </div>
            <i class="bi bi-chevron-right mc-arrow"></i>
          </button>
          <button class="modal-card-btn" type="button" id="Sub_Action_2">
            <i class="bi bi-yyy mc-icon"></i>
            <div class="mc-text">
              <div class="title-cn">子功能中文</div>
              <div class="title-en">Sub Action EN</div>
            </div>
            <i class="bi bi-chevron-right mc-arrow"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.modal-card-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
  text-align: left;
  width: 100%;
  color: #333;
}
.modal-card-btn:hover {
  border-color: #E60012;
  box-shadow: 0 2px 8px rgba(230,0,18,0.10);
  transform: translateX(2px);
  color: #E60012;
}
.modal-card-btn .mc-icon { font-size: 22px; width: 36px; flex-shrink: 0; text-align: center; }
.modal-card-btn .mc-text { flex: 1; }
.modal-card-btn .title-cn { font-size: 14px; font-weight: 600; line-height: 1.25; }
.modal-card-btn .title-en { font-size: 11px; color: #888; margin-top: 2px; line-height: 1.2; }
.modal-card-btn .mc-arrow { color: #adb5bd; font-size: 14px; flex-shrink: 0; }
.modal-card-btn:hover .mc-arrow { color: #E60012; }
.modal-domain-daily .modal-card-btn .mc-icon { color: #0d6efd; }
.modal-domain-fault .modal-card-btn .mc-icon { color: #fd7e14; }
.modal-domain-asset .modal-card-btn .mc-icon { color: #198754; }
</style>
```

**规则**：
- 模态框**标题**用 `中文 / English`（横线分隔，例外，与 navbar 一致）
- 模态框**子按钮**用 `modal-card-btn`，**不再用 `btn-info`**（btn-info 现仅保留给非聚合场景）
- 子按钮文字：中文在上（粗体 14px）、英文在下（灰色 11px），**不用 `/` 横向分隔**（与表头一致）
- `modal-body` 必须加业务域 class（`modal-domain-daily/fault/asset`），图标颜色随业务域
- 间距用 `gap-2`（旧 `gap-3` 偏空，卡片式按钮已有 padding）
- 子按钮 ID 保持 PascalCase，JS 用 `$('#Id').click(...)` 绑定

### 4.6 按钮

| 用途 | class | 何时用 |
|---|---|---|
| 主要操作（保存/提交） | `btn btn-primary` | 每页 ≤ 1 个 |
| 次要操作（取消/返回） | `btn btn-secondary` | — |
| 模态框内的子功能 | `btn btn-info` | 仅模态框 |
| 危险操作（删除） | `btn btn-danger` | 必须配 SweetAlert 二次确认 |
| 确认操作组 | `.btn-confirm-action`（CSS.html 已定义） | 故障报告等需统一宽度场景 |

---

## 5. 响应式断点

| 断点 | Bootstrap class | 适用 |
|---|---|---|
| 移动端 | `col-6` | 默认两列 |
| 平板 ≥768px | `col-md-4` | 三列 |
| 桌面 ≥992px | `col-lg-3` | 四列 |
| 大屏 ≥1200px | `col-xl-2` | 六列（仅信息密集页面） |

**规则**：
- 默认写 `col-6 col-md-4 col-lg-3` 三个断点
- 不要写死宽度 `style="width:200px"`，用 grid
- 移动端不应出现横向滚动（DataTables 表格除外，那是表格本身的特性）

---

## 6. 图标

**库**：Bootstrap Icons v1.11.3 — https://icons.getbootstrap.com/

**引入**：
```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
```

**已用图标对应业务**（保持一致，不要乱换）：

| 模块 | 图标 |
|---|---|
| 保养 PM | `bi-tools` |
| 交接班 Handover | `bi-arrow-left-right` |
| 点检 Inspection | `bi-clipboard-check` |
| 工艺抽检 Process Sampling | `bi-rulers` |
| 工艺参数 PPMS | `bi-sliders` |
| 模面清理 Mold Surface Clean | `bi-brush` |
| 故障报告 Failure Report | `bi-exclamation-triangle` |
| 项目跟进 Project Tracking | `bi-kanban` |
| 任务清单变更 TLMoC | `bi-list-check` |
| 模具管理 Mold Management | `bi-box-seam` |
| 二手备件 Spare Parts | `bi-gear-wide-connected` |
| 特种设备 Special Equipment | `bi-shield-check` |
| 文档索引 Document Library | `bi-folder` |

**模态框子功能图标**（聚合模态框内的子按钮，与上表模块级图标互补）：

| 子功能 | 图标 | 所属模态框 |
|---|---|---|
| 保养计划 PM Plan | `bi-calendar-check` | 保养 PM |
| 三班转保养跟进 PM Shift Follow-up | `bi-clock-history` | 保养 PM |
| 任务管理 Task Management | `bi-list-task` | 保养 PM |
| 记录查询 Record Query | `bi-search` | 保养 PM |
| 保养报告 / 点检报告 Report | `bi-file-earmark-text` | 保养 / 点检 |
| 交接班 & 留言板 Handover & MessageBoard | `bi-chat-square-text` | 交接班 |
| 故障 & 安全隐患记录 Fault & Safety Hazard | `bi-shield-exclamation` | 交接班 |
| 故障报告管理 Manage Failure Report | `bi-kanban` | 故障报告 |
| 故障报告填写 Fill Failure Report | `bi-pencil-square` | 故障报告 |
| 故障报告进度 Failure Report Progress | `bi-bar-chart-line` | 故障报告 |
| 故障报告跟进验证 Follow-up Verification | `bi-check2-square` | 故障报告 |
| 点检执行 Execute Inspection | `bi-clipboard-check` | 点检 |
| 工艺抽检执行 Process Inspection Execution | `bi-rulers` | 工艺抽检 |
| 工艺抽检报告 Process Inspection Report | `bi-file-earmark-bar-graph` | 工艺抽检 |

新增模块/子功能时先来这两张表查，没有再去 [icons.getbootstrap.com](https://icons.getbootstrap.com/) 选。

---

## 7. 命名规范

### 7.1 显示文字
- **表头/卡片标题**：中文上、英文下，用 `<br>` 换行；不用 `/`
- **navbar 品牌 / 模态框标题**：例外，用 `中文 / English`
- **段落正文混排**：用 `/`（如"导航页 / Navigation Page"）

### 7.2 ID / class
- 按钮 ID：业务功能英文名 PascalCase（`FailureReport`、`PM_Plan`）
- 跨页面跳转用 URL：`?v=PageName&ID=xxx&Name=xxx`
- 临时/历史遗留命名（如 `moldSurfaceCleanButton`、`PonitCheck` 拼写错误）：**不要重命名**，会破坏 JS 绑定
- 新模块统一 PascalCase

### 7.3 文件
- 每个页面**一对文件**：`ModuleName.html` + `ModuleName-js.html`
- 第三方库前缀 `Kez_`，全局样式在 `CSS.html`

---

## 8. 交互规范

| 场景 | 实现 |
|---|---|
| 操作成功 | `Swal.fire({icon:'success', title:'...', timer:1500})` |
| 操作失败 | `Swal.fire({icon:'error', title:'...', text:错误详情})` |
| 危险操作前 | `Swal.fire({icon:'warning', showCancelButton:true, ...})` 二次确认 |
| 数据加载 | `Swal.fire({title:'加载中...', didOpen:()=>Swal.showLoading()})` |
| 卡片 hover | 上浮 2px + 红色边框 + 阴影（`.nav-card:hover` 已定义） |
| 表格行点击 | 整行高亮 / 跳转 / 弹出详情，二选一不要混 |
| 禁用状态 | `opacity: .5; cursor: not-allowed;` + 显式标签（如 `即将上线`） |

---

## 9. 新页面 / 改造旧页面检查清单

复制此清单，逐项打勾：

```
[ ] <!DOCTYPE html> + <html lang="zh-CN">
[ ] <meta charset="UTF-8"> 已加
[ ] body 背景 #f5f6f8（如使用 nav-card 布局）
[ ] navbar 标题用 "中文 / English"（不换行）
[ ] 表头双语用 <br> 换行（中上英下，不用 /）
[ ] 表头红底白字 sticky
[ ] 至少一个分组标题（section-title）用红色左边框
[ ] 所有按钮 ID 是 PascalCase，未破坏旧 JS 绑定
[ ] 模态框标题/子按钮文字用 "中文 / English"
[ ] 响应式：col-6 col-md-4 col-lg-3
[ ] 禁用按钮有 "即将上线" / "权限不足" 等显式标签
[ ] 操作反馈用 SweetAlert，不用 alert()
[ ] 危险操作有二次确认
[ ] 图标从 §6 已用图标表选，没有再去官网选
[ ] 内联 `<style>` 仅放页面特有样式，通用样式放 CSS.html
[ ] 没有引入新的第三方库（如必须，建议先做成 Kez_ 内联文件）
```

---

## 10. 不要做的事

- ❌ 装饰性动画（跑马灯、自动轮播）抢占首屏
- ❌ 同色按钮无视觉层次（如全 `btn-primary` 导致 12 个按钮一个样）
- ❌ 用 disabled 灰按钮当占位（无说明文字，用户怀疑是 bug）
- ❌ 表头/卡片标题用 `/` 横向分隔双语
- ❌ 直接修改第三方库 (`Kez_*.html`)，要改就 fork 出新文件
- ❌ 在页面 HTML 里直接写后端逻辑，必须走 `google.script.run`
- ❌ 用 `alert()` / `confirm()`，用 SweetAlert
- ❌ 假设用户的屏幕分辨率（永远响应式）
- ❌ 把状态藏在颜色里不写文字（色弱用户看不出"已完成"和"进行中"）

---

## 附录：参考实现

- ✅ **导航页**：`Navigation.html`（本规范的源页面）
- ✅ **典型数据表格页**：`FailureReport_Manage.html`（表格 + 模态框 + 状态色完整示例）
- ✅ **全局样式**：`CSS.html`（状态色、表格、Select2、SweetAlert 适配）
- 📖 项目通用规范：`CLAUDE.md`

---

**维护说明**：后续每改造一个页面，如果发现新的可复用模式（如新组件、新颜色），请回来更新这份文档对应章节；如果发现现有规范不合理，**先改文档再改代码**，确保规范和实现始终同步。
