# NPI 新品测试管理 — 设计文档

> **数据模型 + 全流程架构，分阶段实现。Phase 1: 工艺参数记录。**

**Goal:** 将注塑 NPI 新品测试全流程（排期→样单→物料→人员→工艺参数→样品→报告）系统化，解决测试排期协调低效、工艺参数记录失控、样品管理靠人记三大痛点。

**架构:** GAS Web App 单体架构，新增 4 个页面 + 复用现有 Code.js 后端。Google Sheets 作为数据存储。模块间通过 `testTaskID` 关联。

**Tech Stack:** Google Apps Script, Bootstrap 5.3.1, jQuery, SweetAlert2, DataTables, Select2

## Global Constraints

- **所有表头/标签中英双语**：前端页面标题、表格列头、表单字段标签、按钮文字一律双语，格式遵循项目规范
  - 表头：`中文<br>English`（`<br>` 换行，不使用 `/`）
  - Navbar 标题：`中文 / English`（`/` 分隔）
  - 按钮：`中文<br><small>English</small>`
- **Sheet 列头中英双语**：Google Sheets 存储表的列头行同样双语，如 `产品名称 Product Name`
- **数据 key 纯英文或编码**：JSON 字段名、Sheet 列索引、Route 名称等内部标识使用英文/驼峰命名
- 前端 `swalTitle(cn, en)` / `swalHtml(cn, en)` 全局提示双语化

---

## 数据模型

```
TestTask (测试任务)
  ├── 1:1 → ProcessRecord (工艺参数记录)
  └── 1:N → SampleRecord (样品记录)
```

### TestTask — 测试任务 / Test Task

Sheet 列头行示例：

| 字段 key (en) | Sheet 列头 (双语) | 类型 | 说明 |
|------|------|------|------|
| taskID | 任务编号<br>Task ID | string | `NPI-YYYYMMDD-XXXX` |
| source | 来源<br>Source | enum | `周计划 weekly` / `紧急 urgent` |
| status | 状态<br>Status | enum | `待确认 → 已排期 → 执行中 → 已完成 → 已评审` |
| productName | 产品名称<br>Product Name | string | |
| moldNo | 模具编号<br>Mold No. | string | |
| machineNo | 机台编号<br>Machine No. | string | |
| material | 物料<br>Material | string | |
| reqDept | 发起部门<br>Req. Dept. | string | NPD / 测试组 Test Team |
| reqPerson | 发起人<br>Requestor | string | SAP ID |
| planDate | 计划日期<br>Plan Date | date | YYYY-MM-DD |
| confirmStatus | 计划部确认<br>Planner Confirm | enum | 待确认 Pending / 已确认 Confirmed / 已拒绝 Rejected |
| confirmBy | 确认人<br>Confirmed By | string | SAP ID |
| tester | 测试人员<br>Tester | string | SAP ID |
| actualStart | 实际开始<br>Actual Start | datetime | |
| actualEnd | 实际结束<br>Actual End | datetime | |
| remark | 备注<br>Remark | string | |
| createdAt | 创建时间<br>Created At | datetime | |
| updatedAt | 更新时间<br>Updated At | datetime | |
| processType | 工序<br>Process Type | enum | `IM 注塑` / `TF 植磨毛` / `PK 包装`（扩展列） |
| sku | 适用SKU<br>SKU | string | 分号分隔多值，来自 BOM 主数据（扩展列） |
| machineModel | 机型<br>Machine Model | string | 选机台时从 Workcenter D列自动带出（扩展列） |

> reqDept（发起部门）、confirmStatus（计划部确认）、tester、actualStart/actualEnd 归 Phase 2 测试排期联动。

### ProcessRecord — 工艺参数记录 / Process Record

Sheet 列头行示例：

| 字段 key (en) | Sheet 列头 (双语) | 类型 | 说明 |
|------|------|------|------|
| recordID | 记录编号<br>Record ID | string | `NPI-PR-YYYYMMDD-XXXX` |
| testTaskID | 任务编号<br>Task ID | string | **FK → TestTask** |
| status | 状态<br>Status | enum | `草稿 Draft` / `已提交 Submitted` / `已转正 Promoted` |
| cardNumber | 工艺卡编号<br>Card No. | string | `TEST-Parameter-{工序}-NNNN-NN`，提交时版本号递增（扩展列） |
| isLatest | 最新版本<br>Is Latest | bool | 是否为最新版本（支持修订） |
| …196 fields | 来自工艺卡模板，列头均双语 | — | 注塑/注胶产品工艺卡通用模板全部字段 |
| createdAt | 创建时间<br>Created At | datetime | |
| updatedAt | 更新时间<br>Updated At | datetime | |
| createdBy | 创建人<br>Created By | string | SAP ID |

### SampleRecord — 样品记录 / Sample Record

Sheet 列头行示例：

| 字段 key (en) | Sheet 列头 (双语) | 类型 | 说明 |
|------|------|------|------|
| sampleID | 样品编号<br>Sample ID | string | `NPI-SP-YYYYMMDD-XXXX` |
| testTaskID | 任务编号<br>Task ID | string | **FK → TestTask** |
| sampleName | 样品名称<br>Sample Name | string | |
| qty | 数量<br>Qty | number | |
| location | 库位<br>Location | string | |
| retain | 留存<br>Retain | enum | 不保留 Discard / 保留 Keep / 问题样品 Defect |
| disposition | 去向<br>Disposition | string | |
| createdAt | 创建时间<br>Created At | datetime | |
| updatedAt | 更新时间<br>Updated At | datetime | |

---

## Phase 1: 工艺参数记录 (NPI_ProcessRecord)

### 页面: `NPI_ProcessRecord.html` + `NPI_ProcessRecord-js.html`

**路由:** `?v=NPI_ProcessRecord`

**页面结构:**

```
┌─ NavBar ─────────────────────────────────────┐
│ 新品测试工艺参数 / NPI Process Record          │
└──────────────────────────────────────────────┘
┌─ 任务选择 ───────────────────────────────────┐
│ [选择测试任务 ▼]                            │
│ 展示：产品/模具/机台/人员/状态               │
│ [新建测试任务] (快速创建草稿任务)            │
└──────────────────────────────────────────────┘
┌─ 工艺参数表单 (折叠面板 Accordion) ───────────┐
│ ▼ 产品信息                                   │
│   · 产品名称 / 机型 / 模具编号 …             │
│ ▶ 炮筒模块 / A炮筒 / B炮筒 / 热流道 / …     │
│ ▶ 注射模块 / 保压模块 / 冷却模块 / …         │
│                                              │
│ [保存草稿] [提交]                             │
└──────────────────────────────────────────────┘
┌─ 历史记录 ───────────────────────────────────┐
│ 当前任务的参数修改版本列表                    │
│ 可以查看每个版本的完整参数                    │
└──────────────────────────────────────────────┘
```

**表单设计:**
- 区块与模板保持 1:1 对应
- 每区块内字段名显示中文标签（来自模板 Row 对应列 B→F 的字段说明）
- 折叠面板默认折叠，点击展开
- 草稿可多次保存，提交后不可修改（需创建新版本）

**交互流程:**
1. 选择已有测试任务 → 自动加载对应的工艺参数（如有）
2. 填写/修改字段 → 保存草稿
3. 全部确认后 → 提交 (status=已提交)
4. 如需修改 → 创建新版本 (isLatest=动态切换)

### 后端: Code.js 新增函数

```javascript
// 测试任务（Phase 1 仅创建基础 stub，后续 Phase 2 完善排期功能）
function createNPITestTask_(taskData)          // 创建测试任务
function loadTestTaskList_()                   // 加载任务列表

// 工艺参数
function saveNPIProcessRecord(recordJSON)      // 保存/更新草稿
function submitNPIProcessRecord(recordID)      // 提交
function loadNPIProcessRecord(testTaskID)      // 读取最新
function loadNPIProcessRecordHistory(testTaskID) // 版本历史
```

### 存储: Google Sheets
- Spreadsheet: 复用 TASK_SS_ID（或新建 NPI_SS_ID）
- Sheet: `NPI_TestTasks`, `NPI_ProcessRecords`, `NPI_Samples`（按需创建）

---

## 实现现状与扩展（2026-08-21 更新）

Phase 1 已完整上线；Phase 2A（测试排期第一迭代）已上线生产（@567）。以下为原设计之外的扩展与实现细节：

### Phase 2A 落地现状（2026-08-17 设计文档 → 实现）

- **测试计划页 `NPI_Dashboard`**（导航「测试计划 / Test Scheduling」）：周列表视图（周五起始周）、五态状态机（待确认→已排期→执行中→已完成，任意未完成态可取消；服务端 `NPI_STATUS_FLOW` 校验）、机台冲突黄标提示（同机台同天≥2条活跃任务）、紧急置顶红色高亮、任务行跳转工艺参数页自动选中
- **新建任务就地弹窗**：弹窗组件抽为共享文件 `NPI_TaskModal.html` + `NPI_TaskModal-js.html`，工艺参数页与测试计划页共用（BOM 联动/机型联动/校验/编辑全一致）；各页面通过 `onTaskSaved(tid)` 钩子做保存后刷新
- **草稿表单条导入**（2026-08-20 变更，替代批量导入）：导入弹窗逐行「导入」→ 打开共享弹窗预填（产品/模具/机台/日期/备注/初始状态）→ 走标准创建路径；`createNPITestTask` 支持 `initialStatus`（五态白名单，导入场景一步到位）；四元组（产品+模具+机台+日期）去重置灰
- **协作人**（2026-08-21 新增）：`NPI_TestTasks` 第 22 列，弹窗多选（数据源 `getUseID`，与任务安排一致，存储 `姓名|工号` 分号分隔）
- **预计完成日期**（2026-08-21 新增，必填）：第 23 列；桥接映射到任务安排 dueDate（空则回退计划日期），超期口径（dueDate < 今天且未完成）与任务安排一致
- **任务安排侧联动**：`loadAllNPITasks` 桥接函数（状态映射 `mapNPIStatusToEDS_`：待确认→等待中/已排期→未开始/执行中→进行中/已完成→已完成/已取消→已取消）已接入 任务列表/今日看板/我的任务/资源甘特/早会日报 五个入口（NPI 任务只读展示，点击跳转工艺参数页）

### 已实现扩展（Phase 1 期间）

- **BOM 主数据联动**（数据源：TB BOM 主数据表）
  - 产品名称：Select2 模糊搜索 + 自由输入，选项 = TF BOM Header AR列（Bundle）去重（333 个）
  - 适用SKU：选中产品后从 E列相关SKU 解析以「牙柄」开头的行（烫印/打印牙柄为注塑后另加工序，排除）
  - SKU 颜色：BOM# → 共享盘文件夹「01 GS TB BOM」同名表格的 SKU关系表 行备注颜色组合；无表格显示「无对应BOM」
  - 物料：INJ相关 R列 Bom Status=生效 的 H列产品大类去重（11 项）+ 自由输入
- **机台→机型联动**：Workcenter A列机台号 + D列 Final Machine Type；D列含「闲置/报废」的机台排除
- **多选字段**：适用SKU、物料支持多选 + 手动新增；存储用分号 `; ` 连接
- **任务编辑/删除**：编辑复用新建弹窗（全字段预填）；删除级联工艺记录，已转正任务禁止删除
- **版本历史**：提交后「创建新版本」继续修订（isLatest 动态切换）；历史列表可查看每个版本的完整参数
- **转正 PPMS**：已提交记录可转正 → 写入 PPMS `INJ_New` 审核队列（按 PPMS 真实表头映射：机型/模具编码/BigBundle/工艺卡编号/工艺参数/状态=复核/原因或备注），重复转正拦截
- **缓存策略**：Bundle 列表、SKU+颜色、物料选项、BOM 文件索引均 CacheService 6h（GAS 上限）

### 数据源清单
| 数据源 | ID / 位置 | 用途 |
|------|------|------|
| EDS_NPI_Data | `1092k9V4BT-WhD9GPoF6sRQC2TtdZfdjeRe8pK6v1rmQ` | NPI_TestTasks / NPI_ProcessRecords / NPI_Samples |
| TB BOM masterdata | `1Ikmgrv9jdTjBsa9-bNsMfyuZ5OY3ObBjA1mmPQjcROY` | TF BOM Header（产品/SKU）、INJ相关（物料） |
| 共享盘 01 GS TB BOM | `1JFw67bGsVeOUFfh5pksaBJ6Zvxz0VyBs` | BOM# 同名表格（SKU关系表颜色） |
| Workcenter | `12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM` | 机台号 + 机型 |
| PPMS | `164BO94VJR6qNdJmJDwbz3w7u9QZfNQUv0U6eXSiM3kQ` | INJ_New 转正目标 + 卡号去重 |
| 2026 Test Plan | `17ys3UDFWjhfaPnk0TErqqeU0FnMP7nsRoRsTmlmm2fg` | 测试排期草稿源（单条导入数据源） |
| userID | `1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM` | 协作人选择（getUseID，与任务安排一致） |

### 遗留事项
- 发起部门 reqDept 暂无录入入口——计划 Phase 2B 与测试排期联动时补齐
- 工艺卡 196 字段模板硬编码在 `NPI_ProcessRecord-js.html` 的 `TEMPLATE_SECTIONS`，模板表驱动化待做
- TF/PK 工序的 SKU 联动语义待确认（当前按注塑口径解析）
- Phase 2B：计划部确认流程、甘特图/机台占用视图、草稿表迁移决策（并行过渡期观察后定；**2026-08-21 用户决定 2B 暂时不做**）
- 转正 PPMS 真实业务验证（涉及其他部门，待执行）

---

## 后续 Phase 规划

| Phase | 模块 | 核心内容 |
|-------|------|---------|
| 2 | 测试排期 | 周计划/紧急插入、机台状态、计划部确认流程、甘特图视图；reqDept/测试人员等任务字段从 2026 Test Plan 联动 |
| 3 | 样品管理 | 数量/去向/库位/留存策略 |
| 4 | 报告评审 | 测试报告生成、评审流程、复盘记录 |

---

## 文件清单

| Phase | 文件 | 操作 |
|-------|------|------|
| 1 | `NPI_ProcessRecord.html` | 新建 |
| 1 | `NPI_ProcessRecord-js.html` | 新建 |
| 1 | `Code.js` | 追加函数 |
| 2+ | `NPI_Dashboard.html` + js | 新建（测试排期主页） |
| 2+ | `NPI_SampleManage.html` + js | 新建 |
| 2+ | `NPI_Report.html` + js | 新建 |
| 全 | `Navigation.html` + js | 追加 NPI 导航按钮 |

---

## 验证

1. 在导航页进入 NPI Process Record 页面
2. 新建测试任务 → 填写工艺参数 → 保存草稿
3. 刷新页面后重新选择该任务 → 草稿数据重新加载
4. 提交 → 状态变为已提交，表单只读
5. 创建新版本 → 生成新 recordID，可编辑
6. 历史记录中能看到所有版本
