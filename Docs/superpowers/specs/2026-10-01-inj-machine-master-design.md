# 注塑机台主数据维护页设计文档

- 日期：2026-10-01
- 状态：设计定稿（用户已逐节确认）
- 范围：EDS 新增模块——注塑机台主数据维护页（只改不增不删）

## 1. 背景与目标

「11 - 注塑计划机台」电子表格的 Workcenter 表（ID `12MXO53wJC8s_J-IE2uGY5jx35rnUE7rxW1xvwVU-FxM`）已成为注塑机台的主数据源，下游多处按表头名读取：

- NPI 弹窗机台下拉（`loadNPIWorkcenterList`，按 Final Machine Type 过滤闲置/报废）
- 点检 RBM 机台分组（`buildWorkcenterNfcMap_`，按 New Formed Cell）
- 故障报告机台号下拉（按 Final Machine Type 排除退役机台）
- EAM 设备编号查询（`get_Equipment_No_in_EAM`）

该表 2026-09-30 由 11 列重构为 19 列，现为 20 列（A–T），并新增了 机型 / 设备类型1 / 设备类型2 / 自动化类型 / 责任人 / 备份责任人 / 工艺免检 / 点检免检 等属性列。目前这些列只能直接在 Google Sheets 里手工维护，缺少网页入口与变更审计。

目标：新增网页版维护页，支持对现有 329 行机台的属性列（M–T）做编辑、批量保存与变更审计，不改动行数。

## 2. 需求确认清单（用户逐项确认）

| 项 | 结论 |
|---|---|
| 数据源 | 「11 - 注塑计划机台」→ Workcenter 表（20 列 / 329 行） |
| 操作范围 | 只改不增不删 |
| 可编辑列 | M–T 列；A–L 列只读（仅作对照展示） |
| 权限 | 设备部全员（userID 表内人员）开放编辑，不新增权限列 |
| 变更日志 | 需要，写入 11 表新增的「变更日志」sheet |
| 导航入口 | 导航页新建顶层卡片「主数据维护」→ 弹窗「主数据维护」→ 按钮「注塑机台主数据」 |
| 编辑交互 | 方案 A：可编辑网格 + 批量保存（与 PM_MasterData 一致） |

## 3. 数据落点与列结构

### 3.1 Workcenter 表（11 表）

20 列，A 列机台号为主键：

| 列 | 表头 | 可编辑 | 说明 |
|---|---|---|---|
| A | Workcenter | 否 | 机台号，主键 |
| B | Machine Type | 否 | |
| C | 机器性能 | 否 | 3AX / 6AX / DB / 闲置 等 |
| D | New Formed Cell | 否 | 点检 RBM 分组用 |
| E | HIM/Auto | 否 | |
| F | VIM-1 | 否 | |
| G | VIM-2 | 否 | |
| H | VIM-3 | 否 | |
| I | VIM-4 | 否 | |
| J | Final Machine Type | 否 | 退役/闲置机台为 NA |
| K | 是否主设备 | 否 | |
| L | 设备编号 | 否 | EAM 设备编号 |
| M | 机型 | **是** | 下拉 |
| N | 设备类型1 | **是** | 下拉 |
| O | 设备类型2 | **是** | 下拉 |
| P | 自动化类型 | **是** | 下拉 |
| Q | 责任人 | **是** | 可搜索下拉 |
| R | 备份责任人 | **是** | 可搜索下拉 |
| S | 工艺无需检查Y/N | **是** | 复选框：勾=Y，不勾=空 |
| T | 点检无需检查Y/N | **是** | 复选框：勾=Y，不勾=空 |

### 3.2 新增 sheet（均在 11 表内）

- **机型选项**：A1 = 机型，A2 起为选项值。实现阶段用 MCP 预建并预填当前 M 列去重值；后端保留"缺失则自动创建并预填"兜底。日常增删选项由用户直接编辑此 sheet。
- **变更日志**：表头 时间 / 工号 / 姓名 / 机台号 / 字段 / 旧值 / 新值。

## 4. 枚举来源

| 列 | 来源 | 规则 |
|---|---|---|
| M 机型 | 11 表「机型选项」sheet | A2 起去重 |
| N 设备类型1、O 设备类型2、P 自动化类型 | Database_MasterData（`1bYKTK5a63yJWRHzM_UPP6b4hwF67eZKEM5dCKLWR59U`）→ Tasklist_history | O 列 Process = IM 且 M 列 Status 含「生效」→ 取 A 列 MachineType 去重 |
| Q 责任人、R 备份责任人 | userID（`1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM`）→ userID sheet | O 列 工序 = INJ 且 P 列 职位 = IDL → 取 B 列 NAME 去重 |
| S/T 免检 | 固定 | 复选框：勾选写「Y」，取消写空 |

枚举在页面加载时实时计算；枚举源为空时下拉仍显示该机台当前值，并提示去检查对应 sheet。

## 5. 权限模型

- 编辑：userID 表内所有人员（设备部）开放编辑。
- 不新增权限列，不做审批/确认流转，不做行级锁定。
- 登录与域限制沿用现有机制（Web App 以 USER_DEPLOYING 运行，DOMAIN 内可见）。

## 6. 页面设计

新文件对：`INJ_MachineMaster.html` + `INJ_MachineMaster-js.html`，技术栈沿用 Bootstrap 5 + DataTables + Select2 + SweetAlert2，双语标题规范沿用 Docs/UI规范.md。

- **工具栏**：机台号搜索框；筛选下拉（机型 / 设备类型1 / 责任人 / 免检状态）；按钮：保存、撤销更改、刷新、变更日志。
- **表体**：20 列横向滚动；A–L 浅灰底只读；M–P 为下拉、Q–R 为可搜索下拉、S–T 为复选框。
- **改动反馈**：改过的单元格黄底高亮；页脚显示「待保存 N 项」；有未保存改动时关页/刷新拦截提示。
- **保存**：批量提交 → SweetAlert 确认 → 成功后刷新高亮并重新拉取数据。
- **变更日志**：弹窗显示最近 200 条（倒序），支持按机台号关键字过滤。

## 7. 后端函数与写入策略

### 7.1 函数清单（Code.js 新增）

| 函数 | 职责 |
|---|---|
| `loadINJMachineMaster()` + `Route.path("INJ_MachineMaster", ...)` | 渲染页面 |
| `get_MachineMasterData()` | 读 Workcenter 全部 20 列 + 三个枚举源 + 变更日志最近 N 条 |
| `save_MachineMasterData(changes, userCode, userName)` | 冲突校验 → 写 M–T → 写日志 → 返回 `{ok, applied, conflicts}` |
| `get_MachineMasterAuditLog(limit)` | 变更日志查询（倒序） |

### 7.2 纯函数（便于 Node 测试）

| 函数 | 职责 |
|---|---|
| `filterMachineTypesFromTasklist_(rows)` | Process=IM 且 Status 含「生效」→ 去重 MachineType |
| `filterINJIDLNames_(rows)` | 工序=INJ 且 职位=IDL → 去重姓名 |
| `applyMachineMasterChanges_(currentBlock, changes, headers)` | 冲突校验 + 产出新块与日志条目 |
| `locateWorkcenterRows_(rows)` | 机台号 → 行号索引 |

### 7.3 写入策略（关键：不整行回写）

1. 前端只提交字段级改动：`[{机台号, 字段, 旧值, 新值}]`。
2. 后端保存时重新读取 Workcenter 的 M–T 块，逐字段冲突校验：
   - 表中现值 == 提交旧值 → 应用新值、生成日志条目；
   - 表中现值 != 提交旧值（他人已改）→ 跳过该字段，计入冲突清单返回。
3. 校验通过后一次性写回 M–T 整块（单次 `setValues`，只碰 M–T，绝不触碰 A–L）。无改动不写。
4. 变更日志批量一次写入。
5. 冲突校验用的「旧值」取自页面加载时的值，无需额外传输快照。

### 7.4 批量提交容量保护

`google.script.run` 入参有 5 万字符限制（本项目已有踩坑记录）。前端改动条数超过约 300 条时自动分批提交，每批独立冲突校验，全部成功后统一刷新；任一批失败则保留前端改动并提示。

## 8. 错误处理

| 场景 | 处理 |
|---|---|
| Workcenter 表头缺列 | 页面报错，不渲染表格 |
| 枚举源为空/读不到 | 下拉仍显示当前值，黄条提示检查对应 sheet |
| 保存抛异常 | 报错且不清空前端改动，可重试 |
| 机台号重复行 | 加载时告警；保存只写第一个匹配行并提示 |
| 字段冲突 | 跳过该字段，黄条列出冲突明细并刷新对应行显示 |

## 9. 导航入口

- Navigation.html：新增顶层卡片 id `MasterData`（文案「主数据维护 / Master Data Maintenance」，位置在「点检」卡片之前）；新增弹窗 `masterDataModal`。
- 弹窗内按钮 id `INJ_MachineMaster`（文案「注塑机台主数据 / IM Machine Master Data」），点击新标签页打开 `?v=INJ_MachineMaster`，传参 ID/Name/Process/Workshop 与其它模块一致。
- Navigation_js.html：新增卡片点击打开弹窗、弹窗按钮跳转两个事件处理器。

## 10. 测试策略

- TDD：四个纯函数先写 Node 测试，fixture 取生产表真实行值（Tasklist_history 的 生效/IM 行、userID 的 INJ+IDL 行、Workcenter 真实机台行）。
- 页面 `node --check` 语法检查。
- 推送 GAS 后浏览器功能验证：加载、编辑、保存、冲突、免检勾选、筛选、日志、关页拦截。
- 真表验证：改动落库后确认 Workcenter 对应单元格与变更日志记录正确，并确认 A–L 未被触碰。
- 部署生产前需用户确认。

## 11. 明确不做（YAGNI）

- 新增/删除机台行、编辑 A–L 列。
- 审批/确认流转、行级锁定。
- 历史版本回滚。
- 往 Workcenter 表写 data validation 规则（校验只在页面层）。
- 邮件通知、定时触发器。
- 机型选项 sheet 的页面内维护（直接编辑该 sheet）。

## 12. 前置与配置

- ⏳ 11 表新增两个 sheet（机型选项、变更日志）：实现阶段用 MCP 预建并预填机型现值。
- ✅ 不需要新增 userID 权限列。
- ✅ 不需要定时触发器（纯交互页面）。
- 导航入口在 Navigation.html 代码内，非 MCP 菜单配置。
