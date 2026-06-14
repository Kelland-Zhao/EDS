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
  <nav class="navbar navbar-expand-lg bg-nav">
    <div class="container-fluid">
      <a class="navbar-brand" style="display:flex;align-items:center;gap:12px;text-decoration:none;">
        <img src="[Colgate logo data URI, see §3.1]" alt="Colgate" style="height:60px;">
        <span style="color:white;font-family:Arial,Helvetica,sans-serif;line-height:1.2;">
          <span style="font-size:xx-large;font-weight:bold;">中文名</span><br>
          <span style="font-size:14px;font-weight:400;opacity:0.85;">English Name</span>
        </span>
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
- navbar 品牌名：中文在上（`xx-large bold`）、英文在下（`14px` 85% 透明度），不用 `/` 分隔
- 所有页面必须引入 Colgate logo（§3.1），位于品牌文字左侧，间距 12px
- HTML 文件必须以 UTF-8 无 BOM 编码保存

### 3.1 Colgate Logo

所有页面 navbar 左侧必须放置 Colgate logo。

**来源**：Wikipedia Commons `Colgate_logo_red.svg`，经以下处理：
- 所有红色（`#ba151b`、`#ed1c24`、`#df1a21`、`#e41b22`、`#d2010d`）统一替换为 EDS 品牌色 `#E60012`
- 转换为 base64 内联 data URI（`data:image/svg+xml;base64,...`）
- 高度 60px，通过 `<img>` 标签嵌入
- SVG 矢量格式，透明背景，任意缩放不模糊

**嵌入方式**：
```html
<img src="data:image/svg+xml;base64,[base64 string]" alt="Colgate" style="height:60px;">
```

**注意**：
- logo 与品牌文字间距 12px（`gap:12px`）
- 不要在 logo 外围加白色衬底，直接放在红色 navbar 上
- SVG 红色已适配品牌色，与 navbar 背景形成视觉层次

---

## 4. 核心组件

### 4.1 欢迎条 welcome-bar

用于登录后第一屏，替代跑马灯。

**基础版**（仅欢迎文字）：

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

**权限版**（欢迎文字 + 右侧权限徽章，适合有角色区分的页面）：

```html
<div class="welcome-bar">
  <div class="greet">
    <span id="name"></span>，欢迎进入 XX 模块 / Welcome to XX Module
  </div>
  <div class="perm-info">
    <span id="userLevelBadge" class="badge bg-secondary">加载中... / Loading...</span>
    <span id="permissionNotice" class="ms-2" style="display:none;">
      <span class="label-cn">无操作权限，请联系管理员</span>
      <span class="label-en">No permission, please contact admin</span>
    </span>
  </div>
</div>

<style>
.welcome-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.welcome-bar .perm-info { font-size: 12px; color: #6c757d; }
.welcome-bar .perm-info .badge { font-size: 11px; vertical-align: middle; }
</style>
```

**`#name` 填充规则**：
- 服务端渲染传入 `userName` 时：`<span id="name"><?= userName ?></span>`（直接模板注入）
- 无模板变量时：JS 初始化阶段 `$('#name').text(sessionStorage.getItem('Name') || '')`

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
  text-align: center !important;
}
#xxxTable th, #xxxTable td {
  padding: 5px 6px;
  font-size: 12px;
  vertical-align: middle;
  text-align: center;
}
/* 长文本列左对齐 + 限宽换行 */
#xxxTable td:nth-child(N) {
  text-align: left;
  max-width: 200px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
#xxxTable tbody tr.odd > td { background-color: #f5f5f5; }
#xxxTable tbody tr.even > td { background-color: #ffffff; }
/* 操作列统一居中 */
#xxxTable td:last-child {
  text-align: center;
  vertical-align: middle;
}
/* 覆盖 DataTables 默认排序图标背景图，避免请求缺失的 PNG */
table.dataTable thead > tr > th.sorting,
table.dataTable thead > tr > th.sorting_asc,
table.dataTable thead > tr > th.sorting_desc,
table.dataTable thead > tr > th.sorting_asc_disabled,
table.dataTable thead > tr > th.sorting_desc_disabled {
  background-image: none !important;
}
</style>
```

**规则**：
- 表头红底白字，sticky 顶部
- 表头文字居中（`text-align: center !important`，`!important` 必须，否则 Bootstrap 覆盖）
- 内容默认居中，长文本列（问题描述、预防性措施、跟进内容等）左对齐
- 长文本列需加 `max-width: 200~220px; word-wrap: break-word; overflow-wrap: break-word;` 限制列宽通过换行管理
- 操作列（最后一列）统一 `text-align: center; vertical-align: middle;`
- 双语表头**必须**用 `<br>` 换行（中上英下），不用 `/`
- 数据 key 保持原样（如 `"保养状态/ PM Status"`），只前端显示时拆分
- 斑马纹隔行变色
- DataTables 排序图标设为 `background-image: none` 避免 404 请求

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

**表格内操作按钮**（Actions 列）：

- DataTables 列定义必须加 `className: 'text-center align-middle'`
- 按钮文字统一用 `<br>` 上下排列（中文在上、英文在下），不用 `/` 横向分隔
- 按钮须足够宽以保证中文一行、英文一行不换行：
  - 短文字（2-4 字符）：`width: 84px`
  - 长文字（5-8 字符）：`width: 120px` 或 `min-width: 130px`
- 按钮样式模板：
  ```js
  const btnStyle = 'font-size:0.75rem;width:84px;display:inline-flex;'
    + 'flex-direction:column;align-items:center;'
    + 'justify-content:center;line-height:1.2;white-space:normal;';
  ```
- 多个按钮用 wrapper `<div>` 包裹：`style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;"`
- 图标**只能**用 Bootstrap Icons（`bi-*`），不用 Font Awesome（`fas fa-*`）

**图标对应**：
| 操作 | 图标 |
|---|---|
| 查看 | `bi-eye` |
| 保存 | `bi-save` |
| PDF | `bi-file-pdf` |
| 邮件 | `bi-envelope` |

### 4.7 标签页 Tabs

用于同一页面按工序/类型切换表格或内容区域，避免页面过长。

```html
<ul class="nav nav-tabs" id="processTabs" role="tablist">
  <li class="nav-item" role="presentation">
    <button class="nav-link active" id="tab-a" data-bs-toggle="tab" data-bs-target="#content-a"
            type="button" role="tab" aria-controls="content-a" aria-selected="true">
      <span class="tab-cn">工序中文</span>
      <span class="tab-en">Process EN</span>
    </button>
  </li>
  <li class="nav-item" role="presentation">
    <button class="nav-link" id="tab-b" data-bs-toggle="tab" data-bs-target="#content-b"
            type="button" role="tab" aria-controls="content-b" aria-selected="false">
      <span class="tab-cn">工序中文</span>
      <span class="tab-en">Process EN</span>
    </button>
  </li>
</ul>

<div class="tab-content" id="processTabContent">
  <div class="tab-pane fade show active" id="content-a" role="tabpanel" aria-labelledby="tab-a">
    <!-- 表格或其他内容 -->
  </div>
  <div class="tab-pane fade" id="content-b" role="tabpanel" aria-labelledby="tab-b">
    <!-- 表格或其他内容 -->
  </div>
</div>

<style>
.nav-tabs { border-bottom: 2px solid #e9ecef; }
.nav-tabs .nav-link {
  color: #6c757d;
  border: none;
  font-size: 13px;
  padding: 8px 16px;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.nav-tabs .nav-link.active {
  color: #E60012;
  background: transparent;
  border-bottom-color: #E60012;
  font-weight: 600;
}
.nav-tabs .nav-link .tab-cn { display: block; line-height: 1.1; }
.nav-tabs .nav-link .tab-en {
  display: block;
  font-size: 11px;
  color: #adb5bd;
  line-height: 1.1;
  margin-top: 2px;
}
.nav-tabs .nav-link.active .tab-en { color: #E60012; opacity: 0.7; }
</style>
```

**规则**：
- tab 标签用双语（中上英下），与表头/卡片标题一致
- active 态红色下划线 `2px solid #E60012`，与品牌色统一
- 每个 tab-pane 内放独立表格（DataTables 按 tab 分别初始化），切换时调用 `columns.adjust()`
- 表格容器用 `.table-wrapper` 包裹（白底 + 圆角 + 阴影），与 tab 形成视觉整体

```html
<style>
.table-wrapper {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
</style>
```

### 4.8 规则芯片 Rule Chips

用于展示当前页面的业务规则阈值，以芯片（chip）形式紧凑呈现。

```html
<div class="rule-chips">
  <span class="rule-label">需写报告阈值 / Threshold:</span>
  <span class="rule-chip">
    <span class="process-tag">IM</span>注塑 &gt; <strong>240 min</strong>
  </span>
  <span class="rule-chip">
    <span class="process-tag">TF</span>植磨毛 &gt; <strong>120 min</strong>
  </span>
  <span class="rule-chip">
    <span class="process-tag">PK</span>包装 &gt; <strong>60 min</strong>
  </span>
</div>

<style>
.rule-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  background: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  margin-bottom: 14px;
  align-items: center;
}
.rule-chips .rule-label {
  font-size: 12px;
  color: #6c757d;
  margin-right: 6px;
}
.rule-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}
.rule-chip strong { font-weight: 700; }
.rule-chip .process-tag {
  background: #E60012;
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}
</style>
```

**规则**：
- 芯片底色用 `#fff3cd`（与状态色"进行中"一致，表示"需关注的阈值"语义）
- 工序标签 `.process-tag` 红底白字，紧凑标识工序缩写
- 数值加粗突出，阈值为纯展示不参与交互
- 如页面无业务阈值需求则不使用此组件

### 4.9 折叠提示 Collapsible Hint

用于收纳操作说明、注意事项等辅助信息，默认收起，减少首屏干扰。

```html
<details class="manual-add-hint">
  <summary>
    <i class="bi bi-info-circle"></i>
    <span>手动添加使用说明 / Manual Add Instructions</span>
    <i class="bi bi-chevron-down"></i>
  </summary>
  <div class="hint-body">
    <ol>
      <li>
        步骤说明中文
        <span class="en">Step description in English</span>
      </li>
    </ol>
  </div>
</details>

<style>
.manual-add-hint {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}
.manual-add-hint > summary {
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  list-style: none;
}
.manual-add-hint > summary::-webkit-details-marker { display: none; }
.manual-add-hint > summary i.bi-info-circle { color: #0d6efd; }
.manual-add-hint > summary .bi-chevron-down {
  margin-left: auto;
  transition: transform .15s;
}
.manual-add-hint[open] > summary .bi-chevron-down { transform: rotate(180deg); }
.manual-add-hint .hint-body {
  padding: 10px 14px 12px;
  font-size: 12px;
  color: #6c757d;
  border-top: 1px solid #e9ecef;
}
.manual-add-hint .hint-body ol { padding-left: 18px; margin: 0; }
.manual-add-hint .hint-body ol li { margin-bottom: 4px; line-height: 1.5; }
.manual-add-hint .hint-body .en {
  color: #adb5bd;
  display: block;
  font-size: 11px;
}
</style>
```

**规则**：
- 使用原生 `<details>` 元素，无需 JS，兼容性好
- 左侧蓝色 `bi-info-circle` 信息图标，右侧 `bi-chevron-down` 展开/收起箭头
- 英文步骤说明用 `.en` 灰色小字，每条中文下另起一行
- 类名 `manual-add-hint` 为项目约定名，后续页面复用此 class 即可

### 4.10 Select2 与表格协调

当 DataTables 表格内嵌 Select2 下拉控件时，需统一尺寸和焦点色：

```html
<style>
/* Select2 控件紧凑化 */
.select2-container--bootstrap .select2-selection--single {
  height: 28px;
  padding: 0 !important;
  font-size: 12px;
  border-color: #ced4da;
  display: flex;
  align-items: center;
}
.select2-container--bootstrap .select2-selection--single .select2-selection__rendered {
  line-height: 28px;
  padding: 0 22px 0 8px;
  color: #333;
  width: 100%;
}
.select2-container--bootstrap .select2-selection--single .select2-selection__placeholder {
  line-height: 28px;
  color: #adb5bd;
}
.select2-container--bootstrap .select2-selection--single .select2-selection__arrow {
  height: 26px;
  top: 1px;
}
/* 焦点与品牌色统一 */
.select2-container--bootstrap.select2-container--focus .select2-selection,
.select2-container--bootstrap.select2-container--open .select2-selection {
  border-color: #E60012;
  box-shadow: 0 0 0 0.15rem rgba(230,0,18,0.15);
}
.select2-dropdown { border-color: #E60012; font-size: 12px; }
.select2-results__option--highlighted[aria-selected],
.select2-container--bootstrap .select2-results__option--highlighted[aria-selected] {
  background-color: #E60012 !important;
  color: white !important;
}
table.bilingual-table td .select2-container { vertical-align: middle; }
</style>
```

**规则**：
- Select2 高度 28px 与表格行高协调
- 焦点/下拉边框用品牌红 `#E60012`，高亮选项红底白字
- 表格单元格内的 Select2 用 `vertical-align: middle` 对齐

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

新增模块/子功能时先来这两张表查，没有再去 [icons.getbootstrap.com](https://icons.getbootstrap.com/) 选。

---

## 7. 命名规范

### 7.1 显示文字
- **表头/卡片标题/navbar**：中文上、英文下，用 `<br>` 换行；不用 `/`
- **模态框标题**：例外，用 `中文 / English`
- **段落正文混排**：用 `/`（如"导航页 / Navigation Page"）
- **浏览器 Tab 标题**（`Code.js` 中 `setTitle()`）：统一用 `中文名 | English Name` 格式，` | ` 两侧各一个空格，不用 `/`
  - 例：`"保养计划 | PM Plan"`、`"导航 | Navigation"`、`"EDS 登录 | EDS Login"`

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
| 数据加载 | `Swal.fire({title:swalTitle('加载数据中...','Loading Data...'), html:swalHtml('正在获取数据，请稍候。','Fetching data, please wait.'), allowOutsideClick:false, showConfirmButton:false, didOpen:()=>Swal.showLoading()})` |
| 卡片 hover | 上浮 2px + 红色边框 + 阴影（`.nav-card:hover` 已定义） |
| 表格行点击 | 整行高亮 / 跳转 / 弹出详情，二选一不要混 |
| 禁用状态 | `opacity: .5; cursor: not-allowed;` + 显式标签（如 `即将上线`） |

**双语 Toast 规范**：
- 所有页面的 `-js.html` 文件开头必须定义双语 helper：
  ```js
  const swalTitle = (cn, en) => `${cn}<span style="display:block;font-size:0.65em;color:#888;font-weight:400;line-height:1.3;margin-top:4px;">${en}</span>`;
  const swalHtml = (cn, en) => `<div>${cn}<div style="font-size:0.85em;color:#888;margin-top:6px;line-height:1.4;">${en}</div></div>`;
  ```
- `swalTitle` — toast 标题（中文在上、英文在下小字灰色）
- `swalHtml` — toast 正文（中文在上、英文在下小字灰色）
- 加载 toast 必须配置 `allowOutsideClick: false` + `showConfirmButton: false` + `didOpen: () => Swal.showLoading()`

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
[ ] 如有多工序/分类切换，用双语 tabs（§4.7），切换时调用 columns.adjust()
[ ] 如有业务阈值展示，用 rule-chips（§4.8）
[ ] 如有操作说明文字，用折叠 hint（§4.9），默认收起
[ ] 如表格内嵌 Select2，焦点/高亮色统一为品牌红（§4.10）
[ ] welcome-bar 的 #name 已填充（<?= userName ?> 或 sessionStorage）
[ ] 表格操作列 class 含 text-center align-middle，按钮中上英下 <br> 格式
[ ] 表格操作按钮宽度足够中文一行英文一行（短 84px / 长 120px+）
[ ] 长文本列已加 max-width + word-wrap 换行控制
[ ] 图标只用 Bootstrap Icons (bi-*)，未混入 Font Awesome (fas)
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
- ✅ **典型数据表格页**：`FailureReport_Manage.html`（tabs + 表格 + rule-chips + 折叠提示 + Select2 完整示例）
- ✅ **跟进/验证页**：`FailureReport_Followup_Manage.html`、`FailureReport_Followup_Verify.html`（单表格 + 内嵌编辑 + Select2 + 状态 badge/下拉）
- ✅ **全局样式**：`CSS.html`（状态色、表格、Select2、SweetAlert 适配）
- 📖 项目通用规范：`CLAUDE.md`

---

**维护说明**：后续每改造一个页面，如果发现新的可复用模式（如新组件、新颜色），请回来更新这份文档对应章节；如果发现现有规范不合理，**先改文档再改代码**，确保规范和实现始终同步。
