# 需求文档：Database_PM 六设备分表合并

## 1. 项目背景

### 1.1 现状

`Database_PM`（`1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4`）作为保养模块核心数据库，目前为 3 种设备 × 2 个车间 = **6 张独立分表**：

| 分表名 | 工序(Process) | 车间(Workshop) | 当前行数 |
|--------|:---:|:---:|------|
| INJ-TB1 | INJ (注塑机) | TB1 (牙刷一车间) | 778 |
| INJ-TB2 | INJ (注塑机) | TB2 (牙刷二车间) | 372 |
| TF-TB1 | TF (植磨毛) | TB1 | 1407 |
| TF-TB2 | TF (植磨毛) | TB2 | 681 |
| PK-TB1 | PK (包装机) | TB1 | 329 |
| PK-TB2 | PK (包装机) | TB2 | 359 |

**六张表列结构完全一致**（21 列，A–U），表头为：

| 列 | 字段名 | 说明 |
|:--:|------|------|
| A | PM No. | 保养编号 |
| B | PmStatus | 保养状态 |
| C | Notification | 工单号 |
| D | PM People | 保养人员 |
| E | Plan PM Date | 计划日期 |
| F | SatrtDate | 开始日期 |
| G | StartTime | 开始时间 |
| H | EndDate | 结束日期 |
| I | EndTime | 结束时间 |
| J | Workcenter | 工作中心 |
| K | 任务明细 | 任务清单 JSON |
| L | 总任务数量 | |
| M | 任务未完成明细 | |
| N | 任务未完成数量 | |
| O | 任务备注明细 | |
| P | 任务备注数量 | |
| Q | 班组交接 | |
| R | 留样问题 | |
| S | 留样图片 | |
| T | 保养确认人 | |
| U | 保养任务报告 | PDF 链接 |

### 1.2 痛点

1. **添加新设备类型需创建新分表** — 若未来新增设备（如 Assembly 组装），需手动创建 AS-TB1、AS-TB2 两张表
2. **跨设备查询需要遍历 6 张表** — `getPlan_new()` 函数硬编码遍历所有 6 个分表名
3. **`Master_PM_Data` 已存在但未使用** — 该汇总表（13399 行，相同 21 列结构）已有数据，但业务逻辑仍读/写六张分表
4. **代码中硬编码分表名** — 多个位置出现 `["INJ-TB1", "INJ-TB2", ...]` 数组，修改成本高

## 2. 核心功能

### 2.1 目标

将 6 张独立设备分表合并为 **1 张统一记录表**，通过在数据行中增加显式的 `工序` 和 `车间` 列来区分设备与位置。所有现有业务逻辑的读取和写入操作均指向合并后的单表。

### 2.2 合并后结构

**新表名**：`PM_Records`（或复用 `Master_PM_Data`）

**列结构**：在现有 21 列（A–U）**末尾追加** 2 列标识列，共计 23 列：

| 列 | 字段名 | 说明 |
|:--:|------|------|
| A | PM No. | （不变） |
| B | PmStatus | （不变） |
| ... | ... | ... |
| U | 保养任务报告 | PDF 链接（不变） |
| V | **工序** | INJ / TF / PK（**新增，列索引 21**） |
| W | **车间** | TB1 / TB2（**新增，列索引 22**） |

> **设计理由**：工序和车间放在末尾（V/W 列），**现有 21 列的列号完全不偏移**。所有硬编码的 `row[0]`~`row[20]`、`getRange(rowNumber, N)` 索引引用无需任何修改。这是迁移安全性的最关键保障。
> 
> **具体收益举例**：`saveData_tasklist` 中 `ws.getRange(rowNumber, 2).setValue(...)`（列 B）、`ws.getRange(rowNumber, 11).setValue(...)`（列 K）等数十处列号引用**全部无需修改**。唯一新增的逻辑是：在写入行时额外设置 V/W 列的值。

### 2.3 功能范围

| 功能 | 描述 | 影响等级 |
|------|------|:--:|
| 写入新保养记录 | `PMgemerate()` 改为向合并表追加 | 高 |
| 读取保养记录 | `getPMrecord()` 改为筛选查询 | 高 |
| 保养完成回写 | `PMend_writeback()` 改为按 PM No. 定位行 | 高 |
| 任务明细更新 | `saveData_tasklist()` / `updateTasklistForPM()` 增加工序+车间定位 | 高 |
| 任务列表上传 | `uploadTableData()` 改为筛选后更新 | 高 |
| 计划数据统计 | `getPlan_new()` 改为读单表而非 6 表 | 中 |
| 已有任务查询 | `get_existed_PM_tasklist()` 增加筛选维度 | 中 |
| 生产确认回填 | `Production_Confirm_Info_Fill()` 增加筛选维度 | 中 |
| PDF 链接保存 | `savePDFLinkToSheet()` 改为按工序+车间定位 | 中 |
| PdM 数据提交 | `PdMData_submit()` 改为筛选定位 | 低（不同 spreadsheet） |
| 前端页面 | PM_Plan / PM_Task / PM_Production_Confirm 等 | 低（微调参数传递） |

## 3. 数据源

| 数据表 | Spreadsheet ID | 说明 |
|--------|:---|------|
| Database_PM | `1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4` | 当前数据库（含 6 分表 + Master_PM_Data） |
| 保养任务清单 | `1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U` | 标准任务模板（不变） |
| 交接班记录 | `10Fnrqc1AUiPqOi-b2UsKgR-Ww-BNdIla_HB_HjVdI0w` | Shift_* 表（不变） |

## 4. 触发方式

- **一次性迁移脚本**：由管理员手动执行，将 6 分表数据合并迁移
- **后续运行时**：所有 CRUD 操作自动指向合并表，无感知

## 5. 输出渠道

- 后端 `Code.js` 函数返回格式不变（`["OK", data]` / `["NO", error]`）
- 前端页面无 UI 变更
- 通知/邮件逻辑不受影响（走 `通知清单` 表，该表不动）

## 6. 配置项

| 配置项 | 建议值 | 说明 |
|--------|--------|------|
| 合并表名 | `PM_Records` | 新表，与 `Master_PM_Data` 区分 |
| WORKSHOP_LIST | `["TB1", "TB2"]` | 车间常量 |
| PROCESS_LIST | `["INJ", "TF", "PK"]` | 工序常量 |
| 保留旧分表 | 是 | 迁移后保留为只读备份 |
| 批次写入大小 | 500 行/批 | 避免 GAS 超时 |

## 7. 权限/角色

- 迁移脚本：管理员执行（需 Sheet 写入权限）
- 日常 CRUD：与现有权限一致（Web App 以 `USER_DEPLOYING` 运行）
- 旧分表设为只读：可通过 Sheet 保护实现

## 8. 边界条件

| 场景 | 处理方式 |
|------|----------|
| PM No. 在不同工序/车间间重复 | PM No. 本身含车间工序信息，不会重复；若意外重复则按 工序+车间+PM No. 联合定位 |
| 旧分表数据与 `Master_PM_Data` 不一致 | 以六分表为准，`Master_PM_Data` 作为校验参考 |
| 迁移期间有用户正在写入 | 迁移应在非工作时间执行；迁移脚本原子写入 |
| 新设备类型加入 | 只需在 PROCESS_LIST 中新增常量，无需创建新分表 |
| GAS 执行时间超时（6 分钟） | 分批写入 + `SpreadsheetApp.flush()`，支持断点续传 |

## 9. 验收标准

1. ✅ 迁移后合并表行数 = 六分表行数之和
2. ✅ 合并表中每行可唯一确定工序+车间（列 V、W 不为空）
3. ✅ `PMgemerate` 能在合并表中正确写入新记录
4. ✅ `getPMrecord` 能按工序+车间+条件正确筛选
5. ✅ `PMend_writeback` 能正确定位并更新行
6. ✅ `saveData_tasklist` 能正确处理 Start/End 状态切换
7. ✅ `getPlan_new` 不再遍历硬编码的六分表数组
8. ✅ PM 计划页、任务执行页、生产确认页功能正常
9. ✅ 其他非保养功能（交接班、故障报修等）不受影响
10. ✅ 旧六分表保留且数据完整（回滚路径）

## 10. 技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| 定位策略 | `工序 + 车间 + PM No.` 三元组 | PM No. 理论上唯一，但加双列防重复 |
| 查询方式 | 单表 filter（非 `getSheetByName`） | 统一的 sheet 引用，用 JS filter |
| 迁移方式 | GAS 脚本 + 分批写入 | 利用现有环境，无需外部工具 |
| 回滚方案 | 保留旧六分表 + 切换函数中的表名常量 | 一行改回即可 |

---

# 迁移计划

## 阶段一：准备工作（估计 1 小时）

### 1.1 创建合并表
```javascript
// 在 Database_PM 中新建 PM_Records
// 表头（原有 21 列 + 末尾新增工序/车间）:
// PM No. | PmStatus | ... | 保养任务报告 | 工序 | 车间
//        ← 列 A–U 与现有完全一致 →      列 V   列 W
```

### 1.2 新增常量定义
```javascript
// Code.js 顶部新增
const PM_WORKSHOP_LIST = ["TB1", "TB2"];
const PM_PROCESS_LIST = ["INJ", "TF", "PK"];
const PM_RECORDS_SHEET_NAME = "PM_Records"; // 合并表名
const PM_DB_ID = "1Y7FclPNn_yHWzwZiRCzSy350fppgXZ3NYgwA1OXQgD4";
```

### 1.3 增加辅助函数
```javascript
function getPMRecordsSheet() {
  return SpreadsheetApp.openById(PM_DB_ID).getSheetByName(PM_RECORDS_SHEET_NAME);
}
```

## 阶段二：数据迁移（估计 30 分钟）

### 2.1 迁移脚本 `migrateToPMRecords()`
- 读取 6 张分表数据
- 每行末尾追加 `[工序, 车间]`（不影响原 21 列位置）
- 分批写入 `PM_Records`
- 写入后校验行数

### 2.2 数据校验脚本 `validateMigration()`
- 对比六分表总行数 vs 合并表行数
- 抽检 5-10 行确认工序/车间正确
- 输出校验报告到 `Logger`

## 阶段三：Code.js 适配（估计 2-3 小时）

### 3.1 改造函数清单（按影响程度排列）

#### 第一梯队：直接写入函数

| 函数 | 原逻辑 | 新逻辑 |
|------|--------|--------|
| `PMgemerate` (L1647) | `ss.getSheetByName(process + "-" + workshop)` | `getPMRecordsSheet()` + `appendRow([...info, process, workshop])`（末尾追加，info 的顺序不变） |
| `PMend_writeback` (L1722) | `process + "-" + workshop` 定位 sheet | 在 PM_Records 中按 `工序`+`车间`+`PM No.` 定位行 |
| `uploadTableData` (L1808) | 同上 | 同上 |
| `saveData_tasklist` (L4284) | `data["SheetName"]` → `getSheetByName` | 改为 `data["工序"]`+`data["车间"]` 定位 |
| `updateTasklistForPM` (L4973) | `data.sheetName` → `getSheetByName` | 同上 |
| `updateStartedPMTask` (L4926) | `data["SheetName"]` → `getSheetByName` | 同上 |
| `savePDFLinkToSheet` (L5108) | `工序+"-"+车间` 或 `sheetName` | 统一用 `工序`+`车间` 定位 |
| `Production_Confirm_Info_Fill` (L4451) | `工序+"-"+车间` → `getSheetByName` | 在 PM_Records 中定位 |

#### 第二梯队：读取函数

| 函数 | 原逻辑 | 新逻辑 |
|------|--------|--------|
| `get_plan` (L~1080) | `process + "-" + workshop` 读取整表 | 从 PM_Records 中 filter by `工序`+`车间` |
| `getPMrecord` (L1673) | 同上 | 同上 |
| `get_existed_PM_tasklist` (L1880) | 同上 | 同上 |
| `getPlan_new` (L1136) | 硬编码六表名，concat 读取 | 直接读 PM_Records 全表 |
| `getCompletePMTaskData` (L5850) | `getSheetByName(sheetName)` | 在 PM_Records 中 filter(`工序`, `车间`) |

#### 第三梯队：间接引用函数

| 函数 | 原逻辑 | 新逻辑 |
|------|--------|--------|
| `upload_addTask` (L1903) | `process + "-" + workshop` 定位 PM 表 | 在 PM_Records 中定位 |
| `getPMPlannerConfirmation` (L5710) | `sheetName` 或 `"PM Task"` | 在 PM_Records 中定位 |

### 3.2 前端适配

| 文件 | 改动点 | 改动量 |
|------|--------|:--:|
| `PM_Plan-js.html` | sessionStorage 已有 workshop/process，无需改 | 无 |
| `PM_Task-js.html` | 同上 | 无 |
| `PM_Production_Confirm.html` | 同上 | 无 |
| `TaskEdit_js.html` | 当前传 `sheetName: 工序+"-"+车间` → 改为传 `工序`、`车间` 分别传 | 2 行 |
| `TaskManagement_js.html` | 需检查 | 待确认 |
| `PM_Procduction_Confirm-js.html` | global_data 已含工序+车间，无需改 | 无 |

### 3.3 不涉及的模块

- **交接班 (Shift)** — 使用独立 spreadsheet (`10Fnrqc...`)，不受影响
- **故障报修 (Fault_Record)** — 使用独立数据源，不受影响
- **点检 (PointCheck)** — 虽然引用 `process + "-" + workshop` 模式，但在独立 spreadsheet 中，不受影响
- **通知清单 / 定时设置 / 菜单设置** — 配置表，与设备数据无关

## 阶段四：测试验证（估计 1 小时）

### 4.1 单元测试
- 每个改造函数的输入/输出对比（迁移前 vs 迁移后）
- Logger.log 抓取实际返回值对比

### 4.2 集成测试
1. PM 计划页面 → 按工序+车间筛选计划
2. PM 任务页面 → 开始保养、生成任务、写回状态
3. 生产确认页面 → 确认信息回填
4. 任务编辑页面 → 追加任务、修改任务明细
5. PDF 报告生成 → 链接保存至对应行

### 4.3 回归测试
1. 交接班功能正常
2. 故障报修功能正常
3. 点检功能正常
4. 邮件通知正常

## 阶段五：上线 & 回滚

### 5.1 上线步骤
1. 非工作时间执行 `migrateToPMRecords()`
2. 执行 `validateMigration()` 确认数据一致
3. `clasp push` 部署新版 Code.js
4. 打开 PM 页面验证 CRUD

### 5.2 回滚方案
```javascript
// 一行回滚：将常量改回旧模式
const PM_RECORDS_SHEET_NAME = null; // null = 使用旧六分表模式
```
或者在 `getPMRecordsSheet()` 加入 feature flag：
```javascript
const USE_MERGED_SHEET = true; // false = 回退到旧六分表
```

旧六分表在迁移后**仅改名加 `_OLD` 后缀**（如 `INJ-TB1_OLD`），不删除，数据完整保留。

---

## 附录 A：受影响的 Code.js 函数完整列表

| 序号 | 行号 | 函数名 | 类型 | 影响 |
|:--:|------|--------|:--:|:--:|
| 1 | 1080 | `get_plan()` | 读 | 中 |
| 2 | 1136 | `getPlan_new()` | 读 | 高 |
| 3 | 1647 | `PMgemerate()` | 写 | 高 |
| 4 | 1673 | `getPMrecord()` | 读 | 高 |
| 5 | 1722 | `PMend_writeback()` | 写 | 高 |
| 6 | 1808 | `uploadTableData()` | 写 | 高 |
| 7 | 1880 | `get_existed_PM_tasklist()` | 读 | 中 |
| 8 | 1903 | `upload_addTask()` | 写 | 中 |
| 9 | 4284 | `saveData_tasklist()` | 写 | 高 |
| 10 | 4451 | `Production_Confirm_Info_Fill()` | 写 | 中 |
| 11 | 4534 | `PdMData_submit()` | 写 | 低 |
| 12 | 4926 | `updateStartedPMTask()` | 写 | 高 |
| 13 | 4973 | `updateTasklistForPM()` | 写 | 高 |
| 14 | 5108 | `savePDFLinkToSheet()` | 写 | 中 |
| 15 | 5710 | `getPMPlannerConfirmation()` | 读 | 低 |
| 16 | 5850 | `getCompletePMTaskData()` | 读 | 中 |

## 附录 B：不涉及的函数（确认安全清单）

| 函数 | 原因 |
|------|------|
| `getstdTasklist()` | 读 `PM Tasklist` 表（不同 spreadsheet） |
| `writeback_task()` | 写 `Shift_*` 表（不同 spreadsheet） |
| `getAllshiftData()` | 读交接班数据（不同 spreadsheet） |
| `getFilteredFailureReportData()` | 读 `Shift_*` 表（不同 spreadsheet） |
| `migrateToInspectionRecords()` | 一次性迁移函数，已执行完毕 |
| `saveAPT/upload_addTask` 中 APT 表操作 | APT 表在交接班 spreadsheet 中 |
