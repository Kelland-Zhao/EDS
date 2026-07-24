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

### ProcessRecord — 工艺参数记录 / Process Record

Sheet 列头行示例：

| 字段 key (en) | Sheet 列头 (双语) | 类型 | 说明 |
|------|------|------|------|
| recordID | 记录编号<br>Record ID | string | `NPI-PR-YYYYMMDD-XXXX` |
| testTaskID | 任务编号<br>Task ID | string | **FK → TestTask** |
| status | 状态<br>Status | enum | `草稿 Draft` / `已提交 Submitted` |
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

## 后续 Phase 规划

| Phase | 模块 | 核心内容 |
|-------|------|---------|
| 2 | 测试排期 | 周计划/紧急插入、机台状态、计划部确认流程、甘特图视图 |
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
