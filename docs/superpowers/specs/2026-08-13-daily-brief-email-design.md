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
| 11 | 直线上级体现 | 邮件内容按 Supervisor（直线上级）分组展示，主管一眼找到自己下属的清单；直线上级均已在 userID 中注明 Supervisor 权限（BK 列），本就在收件人内，不额外扩展收件人。**直线上级取自考勤表当月 sheet 的「直接上司」列（值为主管姓名）**，不使用 userID 表 BI 列 |

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
   - 解析每人直线上级：考勤表当月 sheet「直接上司」列（见 4.7 考勤表数据源）；
     先按工号匹配（AttendanceSync sapID vs sheet 工号列），无工号再按姓名匹配；
     直接上司为空 → 归入「未配置直线上级」分组
3. B 类汇总：
   - 合并任务中 dueDate < today 且 status ∉ {已完成, 已取消}
   - 输出：任务编号/标题/负责人/协作人/截止日期/超期天数/状态
   - 聚合出涉及的责任人（owner+collaborator）用于收件人计算
   - 每条任务按主负责人（首个 owner，无 owner 则首个 collaborator）的直线上级归属分组
     （同样查考勤表当月 sheet，工号优先、姓名兜底）；
     无直线上级 → 「未配置直线上级」分组
4. 收件人计算：
   - 扫描 userID 表：BK 列(62) ∈ {admin, supervisor} → 取邮箱列(9)
   - ∪ B 类任务涉及的 owner/collaborator 的 SAPID 对应邮箱
   - 去重、去空
5. 渲染 HTML（buildBriefEmailHtml_）→ MailApp.sendEmail({to, subject, htmlBody})
6. writeTaskLog_ 记录发送结果：Action='dailyBrief'，TargetType='DailyBrief'，TargetID=today（日期），含 A/B 清单人数、收件人数、成功/失败
```

### 4.3 邮件内容

- **主题**（固定）：`【EDS人员工作安排&任务完成情况】`
- **段一 今日在岗未安排人员**：按 Supervisor（直线上级）分组展示
  - 每个分组标题：直线上级姓名（如 `张三（主管）`），其下为下属清单表格：姓名 / SAPID / 车间 / 工序 / 班次
  - 组内按姓名排序；分组按直线上级姓名排序；「未配置直线上级」组放最后
  - 整段为空时显示 `✓ 今日全员已安排`
- **段二 超期未关闭任务**：同样按 Supervisor（任务主负责人的直线上级）分组展示
  - 分组下为任务表格：任务编号 / 标题 / 负责人 / 截止日期 / 超期天数
  - 整段为空时显示 `✓ 无超期任务`
- 尾部：`进入 EDS 系统` 链接（releaseWebPage 裸 exec 地址，不带 `?v=` 参数 → doGet fallback 到登录页 home_new_1.0，登录后进入导航页）
  - **不放工作台深链**：工作台页面身份读自 sessionStorage（按标签页隔离），邮件新开标签页无会话，深链会得到空身份白页且不回落到登录页
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
| 考勤表当月 sheet 不存在或读失败 | 直线上级无法解析 → 全部归入「未配置直线上级」组，邮件照发 |
| 直线上级列中的人员不在当月 sheet（如已离职） | 工号/姓名都匹配不到 → 归入「未配置直线上级」组 |
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
| Supervisor 分组 | 同一直线上级的多名下属未安排 → 出现在同一分组；「直接上司」列为空的人员 → 「未配置直线上级」组 |
| 考勤表解析 | 用 2026.06（直接上司在 BG 列）和 2026.08（BJ 列）分别验证：按表头名定位列，两种列位置都正确解析出主管姓名 |
| 当月 sheet 缺失 | 模拟 sheet 名不存在 → 邮件照发，全部归「未配置直线上级」组 |
| 空清单 | 人工构造空场景 → 收到"全员已安排"确认邮件 |
| 触发器 | Run `ensureDailyBriefTrigger_()` 两次 → 仅存在一个触发器 |

### 4.7 考勤表数据源（直线上级来源）

直线上级取自考勤表（E&E 电子考勤记录），非 userID 表：

| 项目 | 内容 |
|---|---|
| Spreadsheet ID | `1dMON_DEcAUH9xRsfOkEF37fIN7DuyVHfNwOoUyd-V-0` |
| Sheet 名 | 月度 sheet，如 `2026.08`；**命名不统一**：`2026.8`/`2026.08`/`2026.08月` 均出现过，另有 `2026.当月` 汇总 sheet |
| 解析规则 | 遍历 `getSheets()`，正则 `^(20\d{2})\.(\d{1,2})月?$` 匹配，取 年+月 == 当天 的 sheet |
| 表头结构 | 前 3 行为多层表头（星期/年份/月份），**第 4 行为语义表头**，数据自第 5 行起 |
| 关键列 | 工号（B，索引 1）、姓名（C，索引 2）、工序（D，索引 3）、班别（E，索引 4）、**直接上司（值为主管姓名）**、轮休 |
| 列位置不稳定 | 直接上司列逐月漂移：2026.06 在 BG（索引 58）、2026.07/08 在 BJ（索引 61）→ **必须按表头名定位**（在第 4 行扫描找到 `直接上司` 所在列索引），不能写死 |
| 匹配键 | 员工按工号匹配（AttendanceSync sapID / Tasks 成员 SAPID vs sheet 工号列），无工号时按姓名匹配（sheet 姓名列） |
| 特例 | 部分工序（如 S&C）的直接上司值填的是工序名占位（如 `S&C`），非人名——照常作为分组标题显示 |

## 5. 改动清单

| 文件 | 改动 |
|---|---|
| Code.js | 新增 `ATTENDANCE_SS_ID` 常量、`getAttendanceMonthSheet_()`（月度 sheet 解析）、`getSupervisorFromAttendance_()`（按表头名定位「直接上司」列并匹配员工）、`ensureDailyBriefTrigger_()`、`sendDailyBrief()`、`buildBriefEmailHtml_()`、收件人/清单汇总辅助函数；`doGet` 挂接 1 行。全部集中在任务安排模块区（Code.js:11406 附近） |
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
