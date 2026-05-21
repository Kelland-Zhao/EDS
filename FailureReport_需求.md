# FailureReport 模块优化需求

---

## 待办需求

---

### 需求1：验证页面新增"验证回复"列

**页面：** `FailureReport_Followup_Verify`

**问题描述：**
验证人验证时只能修改状态，无法填写验证回复内容。需要新增"验证回复"列供验证人填写反馈。

**改动范围：**

#### 后端 Google Sheet
- Sheet：`Failure_Report_followup`（SS ID：`1YAPdZKVEOHgCGIJRQwWTQBmwaWIS4yd1SQKJJfRCtAU`）
- 新增第15列（O列）表头：`验证回复 / Verification Reply`

#### 后端 `Code.js`
- `getFollowupRecords()`：formattedRow 末尾追加 `row[14]`（O列，验证回复）
- `getFollowupRecordsForVerifier()`：同上
- `updateFollowupFieldValue()`：fieldMap 新增 `verifyReply: 15`
- 保存逻辑：保存状态时同步保存验证回复内容
- 新增 `sendVerifyReplyNotification(followupId, newStatus, verifyReply, verifierName)`：
  - 保存成功后触发，发送邮件通知责任人
  - 收件人：paWho 字段提取邮箱
  - 抄送：paVerifier 字段提取邮箱（验证人自己）
  - 验证回复为空时仍发送邮件
  - 邮件样式参考 `sendProjectUpdateNotification`（白底卡片 + 红色渐变表头 + CTA 按钮）
  - 邮件内容包含：故障报告编号、跟进ID、PA类型、预防性措施、验证状态（颜色标注：已通过=绿/#28a745、未通过=红/#dc3545、未验证=灰/#6c757d）、验证回复、验证人、更新日期

#### 前端 `FailureReport_Followup_Verify.html`
- 表头新增列：`验证回复<br><span class="th-en">Verification Reply</span>`
- 位置：在"跟进内容"与"创建日期"之间

#### 前端 `FailureReport_Followup_Verify-js.html`
- `mapRowsToObjects()`：新增 `verifyReply: String(row[13] || '')`
- `initializeTable columns`：新增 verifyReply 列，渲染为可编辑 textarea
- `save-status-btn` 点击事件：同步读取并保存 verifyReply 内容
- `rowApi.data()` 更新：保存后同步更新 verifyReply

---

### 需求2：进度页面新增"验证进度"列 + "状态"列重构

**页面：** `FailureReport_Progress`

**改动一：列名重命名**
- `附件 / Attachments` 列改名为 `状态 / Status`

**改动二：状态流转重构**

| 状态值 | 判定条件 |
|---|---|
| 未上传 / Not Uploaded | 无附件（attachments 为空）|
| 已上传 / Uploaded | 有附件，但跟进项未全部通过 |
| 已完成 / Completed | 有附件 **且** 所有跟进项已通过（AA == BB，且 BB > 0）|

**改动三：新增"验证进度"列**
- 位置：`完成天数` 与 `状态` 之间
- 显示格式：`AA / BB`（如 `2 / 3`），AA = 已通过跟进项数，BB = 总跟进项数
- BB = 0 时显示 `-`
- 数据来源：**动态计算**，不存物理列
- 外观建议：已完成用绿色（AA==BB）、进行中用蓝色、未开始用灰色

#### 后端 `Code.js`
- `getFailureReportProgressData()`：关联查询 `Failure_Report_followup` Sheet
  - 按故障报告编号统计：总跟进项数（BB）= 该编号下所有行数；已通过数（AA）= status == `已通过 / Passed` 的行数
  - 返回数据中新增字段：`verifyTotal`（BB）、`verifyPassed`（AA）
  - `status` 字段逻辑改为三态判断（见上表）

#### 前端 `FailureReport_Progress-js.html`
- 三个 Tab 的 DataTable columns 均新增 `验证进度` 列（`verifyTotal`/`verifyPassed`）
- `状态` 列渲染逻辑改为三态 badge（红色=未上传、黄色=已上传、绿色=已完成）
- `验证进度` 列颜色：AA==BB && BB>0 绿色，BB==0 灰色，其余蓝色

#### 前端 `FailureReport_Progress.html`
- 三个 Tab 的表头新增 `验证进度<br><span>Verify Progress</span>` 列

**改动四：列对齐格式**
- `状态` 列和 `操作` 列（含按钮）内容水平 + 垂直居中
- 通过 DataTable 列定义的 `className: 'text-center align-middle'` 实现

---

### ~~需求3：填写页面故障分类重构 + 位置调整~~（已取消）

> 人机料法环标注已由需求5 RCA 根本原因行（每列独立下拉）承担，故障分类区块直接删除。

**改动：**
- `FailureReport_Template.html`：删除 `<div class="mb-3">` 故障分类区块（含 `lbl_fault_category` + `fault_category_group`）
- `FailureReport_Template-js.html`：删除 `fault_category` 相关渲染逻辑及 `collectFormData()` 中的采集代码
- Sheet `FailureReport_Template`：删除 `fault_category` 行（通过 MCP）
- 后端 `submitFailureReport()` / `getFailureReportFormData()`：删除 `fault_category` 字段处理

---

### 需求4：填写页面 CAPA 标题修改

**页面：** `FailureReport_Template`

- `FailureReport_Template.html` 中 section-header 标题：
  - 中文：`预防对策` → `纠正预防措施`
  - 英文：`Preventive Action` → `Corrective & Preventive Action`
- 仅改 HTML 硬编码文字，Sheet 无此字段

---

### 需求5：填写页面 RCA 表格动态列重构

**页面：** `FailureReport_Template`

**改动一：表头重构**
- 原列：层/Level | 描述(Description) | 原因分析(Cause) | 行动(Action)
- 新列：层/Level | 管理系统（动态，可增减）| 技术系统（动态，可增减）

**改动二：动态列规则**
- 初始状态：管理系统 × 1列，技术系统 × 1列
- 每列表头带 `＋` / `－` 按钮：点 `－` 删除该列，点 `＋` 在同类型末尾新增一列
- 最小限制：每种类型可减到 0 列，但管理系统 + 技术系统合计至少保留 1 列
- 列顺序：管理系统列在左，技术系统列在右（各自成组）

**改动三：根本原因类别标签（按列）**
- RCA 表格底部固定新增一行"根本原因 / Root Cause"
- 每列独立显示一个下拉框，选项为：人 / Man｜机 / Machine｜料 / Material｜法 / Method｜环 / Environment
- 动态列增减时，该行对应单元格同步增减
- `rootCause` 存入 `rca_json` 各列对象中（见下）

**改动四：数据存储方案（JSON 化）**
- RCA 区块整体序列化为一个 JSON 字段 `rca_json` 存入后端 Sheet
- 完整结构：
  ```json
  {
    "columns": [
      {"type": "管理系统", "rootCause": "人 / Man"},
      {"type": "技术系统", "rootCause": "机 / Machine"}
    ],
    "rows": [
      ["Why1_mgmt内容", "Why1_tech内容"],
      ["Why2_mgmt内容", ""],
      ...
    ]
  }
  ```
- 原 `rca_desc / rca_cause / rca_action` 三字段废弃，合并为 `rca_json`（需确认目标记录 Sheet 并通过 MCP 调整）
- 旧报告数据不受影响（旧字段保留，新报告写 `rca_json`）

#### 后端 `Code.js`
- `submitFailureReport()`：RCA 数据改为写入 `rca_json` 列
- `getFailureReportFormData()`：读取 `rca_json` 并解析回前端
- `generateFailureReportPDF_()`：解析 `rca_json` 动态生成 RCA 表格

#### 前端 `FailureReport_Template-js.html`
- `collectFormData()`：改为收集动态列结构 + 数据，生成 `rca_json`
- `restoreFormData()`：解析 `rca_json`，动态重建列和数据
- 列操作事件：`＋` 新增列、`－` 删除列，删除时检查合计列数 ≥ 1

---

### 需求6：CAPA 表格结构调整

**页面：** `FailureReport_Template`

**改动一：原"序号"列改名为"类型"**
- 列顺序调整后，原第一列（序号/No.）变为第二列
- 列名：`序号 / No.` → `类型 / Type`
- `FailureReport_Template-js.html` 中 `paHdr` 硬编码表头改为 `类型<br>Type`
- Sheet `FailureReport_Template` 中 `pa_type` 行：Label_CN `序号` → `类型`，Label_EN `No.` → `Type`（通过 MCP 更新）

**改动二（MCP）：类型选项修改**
- Sheet `FailureReport_Template` 中 `pa_type` 行 Options 字段：
  - 原值：`SWI/SOP/AM/PM/Kaizen/其他同类设备`
  - 新值：`SWI/SOP/AM/PM/Kaizen/纠正措施`
  - 目标单元格：G23（通过 MCP 更新）

**改动三：新增"问题根因"列**
- CAPA 表格在"类型 / Type"列之后、"预防行动 / Action Plan"列之前新增一列：
  - 列名：`问题根因 / Problem Root Cause`
- 内容为动态下拉框，选项从 RCA 表格的"根本原因"行动态生成
- 选项格式示例：`管理系统① - 人 / Man`、`技术系统① - 机 / Machine`
- RCA 列增减或根因标签变更时，此下拉选项实时同步
- 数据存入 `pa` 数组各行的 `problem_root_cause` 字段

**改动四：CAPA 日期约束**
- `pa_when`（时间）：`min` 属性设为今日（`new Date()` 格式化为 `yyyy-MM-dd`），不可选过去日期
- `pa_verifier_when`（验证时间）：`min` 属性动态绑定同行 `pa_when` 的值，`pa_when` 变更时实时更新 `pa_verifier_when` 的 `min`

#### 前端 `FailureReport_Template-js.html`
- `buildPaRow()`：
  - 新增 `problem_root_cause` 列，渲染为动态 `<select>`
  - `pa_when` input 设置 `min=today`
  - `pa_verifier_when` input 初始 `min=today`
- 事件绑定：`pa_when` 变更时，同行 `pa_verifier_when` 的 `min` 同步更新为 `pa_when` 的值
- `collectFormData()`：采集 `problem_root_cause` 值
- `restoreFormData()`：回填 `problem_root_cause`，并重新设置日期 `min` 约束
- RCA 根因变更事件：触发 CAPA 下拉选项重新生成

---

### 需求7：填写页面分析人员与 Who 人员默认预填责任人

**页面：** `FailureReport_Template`（及两个入口页面）

**背景：**
- 分析人员（圈1）与 Who 人员（圈3）均应默认包含故障报告的责任人
- 责任人通过 URL 参数 `responsible` 传入模板页面

**入口1：`FailureReport_Upload-js.html`（新建模式）**
- 从 `rowData` 中取责任人字段（含姓名+邮箱格式 `名字【邮箱】`）
- 拼入跳转 URL：`&responsible=encodeURIComponent(responsible)`

**入口2：`FailureReport_Progress-js.html`（编辑模式）**
- 编辑按钮新增 `data-responsible` 属性，值来自进度列表行数据
- 拼入跳转 URL：`&responsible=encodeURIComponent(responsible)`

**`FailureReport_Template.html`**
- `fld_pdesc_who`：`<input type="text">` → `<select multiple class="sel2-user">`（与分析人员控件一致）

**`FailureReport_Template-js.html`**
- URL 参数处理：读取 `p.responsible`
- `fld_analyst`（分析人员）：预选责任人（`val([responsible]).trigger('change')`）
- `fld_pdesc_who`（Who 人员）：
  - 初始化 Select2，数据源与分析人员一致（`userNames`）
  - 预选责任人
  - 可多选、模糊搜索
- `collectFormData()`：`pdesc_who` 改为采集多选值，逗号分隔存储
- `restoreFormData()`：`pdesc_who` 改为数组回填

---

### 需求8：故障时长 MDT 自动带入且不可编辑

**页面：** `FailureReport_Template`（及入口页面）

**新建模式（`FailureReport_Upload-js.html`）**
- 数据来源：`FailureReport_Manage` 页面"维修时间 / Repair Time"列，即 `rowData.repairTime`（`getFilteredFailureReportData()` 的 H列 `row[7]`）
- 拼入跳转 URL：`&mdt=encodeURIComponent(rowData.repairTime)`

**编辑模式（`FailureReport_Progress-js.html`）**
- `getFailureReportFormData()` 已包含 `time_used`，随表单数据加载，无需额外传参

**`FailureReport_Template-js.html`**
- URL 参数处理：读取 `p.mdt`，填入 `#fld_time_used`，同时设为 readonly
- 编辑模式：`restoreFormData()` 回填 `time_used` 后，设为 readonly
- `fld_time_used` 全程不可手动修改（readonly + 灰色样式，与 `fld_aem_no` / `fld_case_code` 一致）

---

## 已完成需求

