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
- 当前列结构：A=followupId B=failureReportNo C=paType D=paPlan E=paWho F=paWhen G=paVerifier H=paVerifierWhen I=status J=createdDate K=updatedDate L=pdfUrl M=paIndex N=跟进内容
- 新增第15列（O列）表头：`验证回复<br>Verification Reply`
- 后端读取时仍跳过 M 列（paIndex，前端无用），verifyReply（O 列）正常读入并通过 formattedRow 第 14 位（索引13）传至前端

#### 后端 `Code.js`
- `getFollowupRecords()`：formattedRow 末尾追加 `row[14]`（O列，验证回复）
- `getFollowupRecordsForVerifier()`：同上
- `updateFollowupFieldValue()`：fieldMap 新增 `verifyReply: 15`
- 保存逻辑：保存状态时同步保存验证回复内容
- 新增 `sendVerifyReplyNotification(followupId, newStatus, verifyReply, verifierName)`：
  - 保存成功后触发，发送邮件通知责任人
  - **触发条件**：无论 reply 是否变更、无论 status 是否变更，只要 `save-status-btn` 被点击且保存成功即发送邮件（消除"只改状态没动回复是否发"的歧义）
  - **覆盖状态**：已通过 / 未通过 / 未验证 三态均发送（已通过=正向确认、未通过=要求整改、未验证=重置提醒）
  - 收件人：paWho 字段提取邮箱
  - 抄送：paVerifier 字段提取邮箱（验证人自己）
  - 验证回复为空时仍发送邮件（邮件内对应区块显示"（无）"占位）
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
- `附件<br>Attachments` 列改名为 `状态<br>Status`

**改动二：状态流转重构**

| 状态值 | 判定条件 |
|---|---|
| 未上传<br>Not Uploaded | 无附件（attachments 为空）|
| 已上传<br>Uploaded | 有附件，但跟进项未全部通过 |
| 已完成<br>Completed | 有附件 **且** 所有跟进项已通过（AA == BB，且 BB > 0）|

**改动三：新增"验证进度"列**
- 位置：`完成天数` 与 `状态` 之间
- 显示格式：`AA / BB`（如 `2 / 3`），AA = 已通过跟进项数，BB = 总跟进项数
- BB = 0 时显示 `-`，此时 AA==BB==0 不判定为绿色完成态（显式处理边界，虽然前端有 CAPA 条目校验、实务上 BB 不可能为 0）
- 数据来源：**动态计算**，不存物理列
- 外观建议：已完成用绿色（AA==BB && BB > 0）、进行中用蓝色、未开始用灰色（BB == 0）

**补充：状态 TTL 行的边界条件**

| 条件 | 状态 |
|---|---|
| 无附件 | 未上传<br>Not Uploaded |
| 有附件 + 跟进项未全部通过（AA < BB）| 已上传<br>Uploaded |
| 有附件 + 全部通过（AA == BB, BB > 0）| 已完成<br>Completed |
| 有附件 + 无跟进项（BB == 0）| 已完成<br>Completed |

#### 后端 `Code.js`
- `getFailureReportProgressData()`：关联查询 `Failure_Report_followup` Sheet
  - **性能要求（重要）**：避免对每个故障报告独立查询 followup 表造成 N×M 全表扫描
    - 步骤1：函数开始时一次性 `wsFollow.getDataRange().getValues()` 拉取 followup 全表
    - 步骤2：遍历一次构建聚合 Map：`const verifyMap = new Map()`，key = `failureReportNo`（followup B 列），value = `{ pass: number, total: number }`
      - 每行 total++；若 status === `已通过 / Passed` 则 pass++
    - 步骤3：主循环遍历 Failure_Database 时，按 `failureReportNumber` 直接从 Map 取值：`const v = verifyMap.get(reportNo) || { pass: 0, total: 0 }`
    - 整体复杂度：从 O(N×M) 降为 O(N+M)
  - 返回数据中新增字段：`verifyTotal`（BB = v.total）、`verifyPassed`（AA = v.pass）
  - `status` 字段逻辑改为三态判断（见上表），判定时直接用 v.pass / v.total 做比较

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
- 新列：`层<br>Level` | `管理系统<br>Management System`（动态，可增减）| `技术系统<br>Technical System`（动态，可增减）

**改动二：动态列规则**
- 初始状态：管理系统 × 1列，技术系统 × 1列
- 每列表头带 `＋` / `－` 按钮：点 `－` 删除该列，点 `＋` 在同类型末尾新增一列
- 最小限制：每种类型可减到 0 列，但管理系统 + 技术系统合计至少保留 1 列
- 行数：固定 5 行（Why1~Why5），不支持用户增删
- 列顺序：管理系统列在左，技术系统列在右（各自成组）
- 减号按钮 disabled 判断条件：合计列数 == 1（而非本类型列数 == 1）
- 根本原因类别选项（前端硬编码）：`人 / Man`｜`机 / Machine`｜`料 / Material`｜`法 / Method`｜`环 / Environment`

**改动三：根本原因类别标签（按列）**
- RCA 表格底部固定新增一行 `根本原因<br>Root Cause`
- 每列独立显示一个下拉框，选项（前端硬编码）：`人 / Man`｜`机 / Machine`｜`料 / Material`｜`法 / Method`｜`环 / Environment`
- 动态列增减时，该行对应单元格同步增减
- `rootCause` 存入 `rca_json` 各列对象中（见下）

**改动四：旧数据兼容**
- 编辑旧报告时，旧 `rca_desc / rca_cause / rca_action` 三字段 → 映射为 3 列，均标记为"管理系统"，按原顺序（desc→列1, cause→列2, action→列3）填入动态 UI
- `getFailureReportFormData()` 和 `generateFailureReportPDF_()` 需同时兼容新旧格式
- 旧字段保留不删除，新报告写 `rca_json`

**改动五：数据存储方案（JSON 化）**
- RCA 区块整体序列化为一个 JSON 字段 `rca_json` 存入后端 Sheet
- **列稳定 ID 机制（重要）**：每个列对象生成不复用的唯一 `id`（如 `col_` + 时间戳/随机后缀），列删除/新增时 ID 永不重排，仅 columns 数组的位置变化
  - 显示序号（管理系统①②③）根据 columns 数组中"同类型"的索引位置动态计算，仅用于 UI 展示
  - CAPA 表格 `problem_root_cause` 字段存储该 ID（而非显示文本），下拉选项标签每次渲染时根据 columns 当前状态动态拼接（如 `管理系统② - 人 / Man`）
  - 当 RCA 列被删除时，CAPA 行中 `problem_root_cause === 被删列 id` 的单元格清空（方案B）
- 完整结构：
  ```json
  {
    "columns": [
      {"id": "col_a1b2", "type": "管理系统", "rootCause": "人 / Man"},
      {"id": "col_c3d4", "type": "技术系统", "rootCause": "机 / Machine"}
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
  - 列名：`问题根因<br>Problem Root Cause`
- 内容为动态下拉框，选项从 RCA 表格的"根本原因"行动态生成
- 选项 value 为 RCA 列的 `id`（稳定标识，见需求5 改动五）；显示标签格式示例：`管理系统① - 人 / Man`、`技术系统① - 机 / Machine`
- RCA 列顺序变化、根因标签变更时，下拉选项标签实时重新拼接，已选 ID 不变
- **RCA 列被删除时**：CAPA 所有行中 `problem_root_cause === 被删列 id` 的单元格自动清空（方案B）
- 数据存入 `pa` 数组各行的 `problem_root_cause` 字段（存 ID 而非文本）

**改动四：CAPA 日期约束**
- `pa_when`（时间）：
  - **新建模式**：所有行 `min` 设为今日（`new Date()` 格式化为 `yyyy-MM-dd`）
  - **编辑模式**：
    - 已存在的行（从 `restoreFormData()` 回填的历史数据）不设 `min`，保留原值
    - 编辑模式下新增的行仍设 `min=today`，防止填出昨天日期
    - 判定方法：buildPaRow 接收 `isExistingRow` 参数，由调用方传入
- `pa_verifier_when`（验证时间）：`min` 属性动态绑定同行 `pa_when` 的值，`pa_when` 变更时实时更新 `pa_verifier_when` 的 `min`
  - `pa_when` 被清空时，`pa_verifier_when` 的 `min` 回退为 today（保持不能填过去日期的约束）

#### 前端 `FailureReport_Template-js.html`
- `buildPaRow(rowData, isExistingRow)`：
  - 新增 `problem_root_cause` 列，渲染为动态 `<select>`
  - `pa_when` input：
    - 新建模式：所有行 `min=today`
    - 编辑模式：`isExistingRow === true` 不设 min；`isExistingRow === false`（用户新增行）设 `min=today`
  - `pa_verifier_when` input：初始 `min` 同步 `pa_when`；新建模式下默认 today
  - RCA 列删除事件：遍历 CAPA 所有行，按 ID 匹配清空 `problem_root_cause` 选中值
- 调用约定：
  - `restoreFormData()` 回填历史行时传 `isExistingRow=true`
  - 用户点击 + 新增行时传 `isExistingRow=false`
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
  - Select2 option value 使用纯人名（去掉 `【邮箱】` 部分），与分析人员格式一致，兼容旧数据
  - 预选责任人
  - 可多选、模糊搜索
- `collectFormData()`：`pdesc_who` 改为采集多选值，逗号分隔存储
- `restoreFormData()`：`pdesc_who` 改为数组回填

> **范围限定：** 以上改动仅涉及 Template 页面。Upload 和 Progress 页面只新增传递 `responsible` URL 参数，不改动责任人列的逻辑和显示。

---

### 需求8：故障时长 MDT 自动带入且不可编辑

**页面：** `FailureReport_Template`（及入口页面）

**新建模式（`FailureReport_Upload-js.html`）**
- 数据来源：`FailureReport_Manage` 页面"维修时间 / Repair Time"列，即 `rowData.repairTime`（`getFilteredFailureReportData()` 的 H列 `row[7]`）
- 拼入跳转 URL：`&mdt=encodeURIComponent(rowData.repairTime)`

**编辑模式（`FailureReport_Progress-js.html`）**
- `getFailureReportFormData()` 已包含 `time_used`，随表单数据加载，无需额外传 `mdt` 参数
- 编辑模式无需改 Progress 页面跳转 URL

**`FailureReport_Template-js.html`**
- URL 参数处理：读取 `p.mdt`，填入 `#fld_time_used`，同时设为 readonly
- 编辑模式：`restoreFormData()` 回填 `time_used` 后，设为 readonly
- `fld_time_used` 全程不可手动修改（readonly + 灰色样式，与 `fld_aem_no` / `fld_case_code` 一致）

> **与需求7 协同：** Upload 页面跳转 URL 需同时新增 `responsible` 和 `mdt` 两个参数，一起修改避免冲突。

---

## 已完成需求

