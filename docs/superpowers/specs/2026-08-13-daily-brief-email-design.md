# EDS 人员工作安排&任务完成情况 早会邮件提醒 设计文档

版本：V20260813.01
日期：2026-08-13
适用系统：EDS Equipment Data System
所属模块：任务安排 / Daily Work Arrangement

## 1. 背景与目标

任务安排模块已实现今日工作台、任务列表、任务规划甘特图、我的任务四个页面，但存在两个闭环缺口：

| 缺口 | 现状 |
|---|---|
| A 类：在岗但未安排工作任务 | 数据上甘特图已有"空闲标记"逻辑，但仅页面被动可见，无任何主动提醒 |
| B 类：已布置任务未关闭（超期） | 工作台可看到超期任务，但主管不打开页面就不知道 |

本设计新增一封**每日早会邮件**，主动推送两类清单，形成"排班 → 派工 → 执行 → 关闭"的管理闭环。

## 2. 需求决策（已与用户确认）

| # | 决策点 | 结论 |
|---|---|---|
| 1 | 提醒渠道 | Gmail 邮件（必须）。企业微信不做（覆盖面不足，待定） |
| 2 | A 类收件人 | 主管+管理员：userID 表 BK 列（索引 62）`任务安排权限` ∈ {admin, supervisor} |
| 3 | 发送时机 | 每天一次，早会前 07:45 |
| 4 | A 类判定规则 | 手动任务（Tasks 表）+ PM 合成任务都算；当天（planStartDate ≤ today ≤ dueDate）作为 owner 或 collaborator 有任一重叠任务即视为"已安排"；与工作台 todayTasks 口径一致 |
| 5 | B 类触发规则 | 仅超期任务：dueDate < today 且状态 ∉ {已完成, 已取消} |
| 6 | B 类收件人 | 任务 owner + collaborator，与主管/管理员同为收件人 |
| 7 | 邮件结构 | 两类合并一封日报 |
| 8 | 例外机制 | 复用任务机制：任务类型下拉新增「机动/待命」选项，给机动人员建任务即视为已安排 |
| 9 | 空内容处理 | 两份清单都为空也发确认邮件（"全员已安排、无超期任务"），主管可确认系统正常运行 |
| 10 | 邮件主题 | `【EDS人员工作安排&任务完成情况】`（固定，不加日期；Gmail 自动归入同一会话串） |

## 3. 方案选型

| 方案 | 说明 | 结论 |
|---|---|---|
| 一：GAS 日触发器 + 单函数日报 | `ScriptApp` 日触发器每天 07:45 调用 `sendDailyBrief()`，复用现有 load* 函数汇总，收件人实时扫描 userID 表 | **采用** |
| 二：分钟级触发器 + TaskConfig 配置时间 | 每 10 分钟触发器查配置时间到点发送 | 不采用（常驻触发器耗配额，为改时间这一低频需求过度设计） |
| 三：打开工作台时兜底发送 | 靠用户打开页面检查"今天是否已发" | 不采用（周末/无人打开则断发，不可靠） |

发送时间固定为 07:45 业务约定；如需调整，修改触发器注册代码后重新部署即可。

## 4. 执行设计

### 4.1 触发链路

- 新增幂等函数 `ensureDailyBriefTrigger_()`：
  - 查 `ScriptApp.getProjectTriggers()` 是否已存在 `sendDailyBrief` 触发器，存在则直接返回；
  - 不存在则 `ScriptApp.newTrigger('sendDailyBrief').timeBased().everyDays(1).atHour(7).atMinute(45).create()`
- 挂接点：`doGet` 路由注册之后调用一次（Code.js:167 前加 1 行）。任何人打开任意页面都会做幂等检查，触发器具备自修复能力
- 部署后需有人打开一次任意页面（或手动 Run 一次 `ensureDailyBriefTrigger_`）触发器才装上

### 4.2 `sendDailyBrief()` 主流程

```
1. today = 今天（Session.getScriptTimeZone，Asia/Hong_Kong）
2. A 类汇总（与工作台/甘特图同源）：
   - loadAttendanceSync(today)；空则降级 loadIMStaffByDate(today)
   - 只保留 attendanceStatus = 在岗 的人
   - 读取全部任务：loadTasks({_forceRefresh:true}) + loadAllPMTasks({_forceRefresh:true})
     （强制刷新跳过小时/天级缓存，保证早会数据准确）
   - 对每名在岗人员检查：是否存在任务区间与 today 重叠
     且该人是 owner 或 collaborator → 有则跳过
   - 一条任务都没有 → 进入 A 清单（姓名/SAPID/车间/工序/班次）
3. B 类汇总：
   - 合并任务中 dueDate < today 且 status ∉ {已完成, 已取消}
   - 输出：任务编号/标题/负责人/协作人/截止日期/超期天数/状态
   - 聚合出涉及的责任人（owner+collaborator）用于收件人计算
4. 收件人计算：
   - 扫描 userID 表：BK 列(62) ∈ {admin, supervisor} → 取邮箱列(9)
   - ∪ B 类任务涉及的 owner/collaborator 的 SAPID 对应邮箱
   - 去重、去空
5. 渲染 HTML（buildBriefEmailHtml_）→ MailApp.sendEmail({to, subject, htmlBody})
6. writeTaskLog_ 记录发送结果：Action='dailyBrief'，含 A/B 清单人数、收件人数、成功/失败
```

### 4.3 邮件内容

- **主题**（固定）：`【EDS人员工作安排&任务完成情况】`
- **段一 今日在岗未安排人员**：表格 姓名 / SAPID / 车间 / 工序 / 班次
  - 为空时显示 `✓ 今日全员已安排`
- **段二 超期未关闭任务**：表格 任务编号 / 标题 / 负责人 / 截止日期 / 超期天数
  - 为空时显示 `✓ 无超期任务`
- 尾部：`打开今日工作台` 链接（releaseWebPage + `?v=EDS_TodayDashboard`）
- 风格：双语（中/英），红色表头，与系统现有邮件（如故障报告通知）一致

### 4.4 例外机制：机动/待命任务类型

- [EDS_TaskList.html] 与 [EDS_TodayDashboard.html] 的任务类型下拉新增：
  `<option value="机动/待命">机动/待命 / Standby</option>`
- 后端零改动（Tasks 表 taskType 为自由文本列）
- 主管给机动人员建一条当天「机动/待命」任务 → 系统视为已安排 → 不进 A 清单；
  工作台/甘特图同步可见该人员当日为机动状态，闭环透明
- 任务列表筛选按钮组不新增「机动」筛选（机动任务量少，避免界面噪音）

### 4.5 边界与错误处理

| 情况 | 处理 |
|---|---|
| 无 admin/supervisor 或所有邮箱缺失 | writeTaskLog_ 记录后跳过发送，不抛错 |
| AttendanceSync 和 IM 排班均无数据 | A 段显示"今日无出勤数据"，不误报全员未安排 |
| B 类任务责任人无邮箱 | 从收件人剔除，仅主管/管理员收到 |
| MailApp.sendEmail 异常 | try/catch + console.error + writeTaskLog_ 记录失败 |
| 缓存干扰 | 汇总阶段统一传 `_forceRefresh: true` |

### 4.6 测试验证

| 场景 | 验证方法 |
|---|---|
| 全链路 | 从 GAS 编辑器手动 Run `sendDailyBrief()`，检查收件箱收到邮件 |
| A 类判定 | 造一名在岗无任务人员 → 出现在段一；给其建任务 → 消失 |
| B 类判定 | 造一条 dueDate 为昨天的未完成任务 → 出现在段二；改状态为已完成 → 消失 |
| 例外机制 | 建「机动/待命」任务 → 该人员不出现在段一 |
| 空清单 | 人工构造空场景 → 收到"全员已安排"确认邮件 |
| 触发器 | Run `ensureDailyBriefTrigger_()` 两次 → 仅存在一个触发器 |

## 5. 改动清单

| 文件 | 改动 |
|---|---|
| Code.js | 新增 `ensureDailyBriefTrigger_()`、`sendDailyBrief()`、`buildBriefEmailHtml_()`、收件人/清单汇总辅助函数；`doGet` 挂接 1 行。全部集中在任务安排模块区（Code.js:11406 附近） |
| EDS_TaskList.html | 任务类型下拉 +机动/待命 |
| EDS_TodayDashboard.html | 任务类型下拉 +机动/待命 |

## 6. 不做（YAGNI）

- 企业微信机器人推送（覆盖面不足，待定）
- 邮件点击"一键忽略/一键派工"交互（复杂度高，后续扩展）
- TaskConfig 可配置发送时间（低频需求，改代码重新部署即可）
- 按班次分时段发送（每日一封已覆盖早会场景）

## 7. 版本记录

| 版本 | 日期 | 说明 |
|---|---|---|
| V20260813.01 | 2026-08-13 | 新增早会闭环邮件提醒设计 |
