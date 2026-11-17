# EDS Task Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 EDS 增加仅 Kelland 可访问的只读自动任务看板。  
**Architecture:** EDS 读取 ScheduledTask 配置及日志；使用独立后端文件处理权限、字段映射、计划和汇总，通过现有路由及导航进入页面。  
**Tech Stack:** Google Apps Script、HTML、现有 Bootstrap/jQuery、Node.js `node:test`。  
**Spec:** `../specs/2026-11-17-task-monitor-design.md`

## Global Constraints

- 遵循设计文档全部访问限制、状态定义、读取边界及只读要求。
- 复用当前干净 checkout，不新增依赖或 worktree。
- 不推送、不发布，不修改其他模块行为。

## Review Focus

- 空身份或伪造前端身份无法读取数据。
- 业务超期、处理中成功日志不会误计为执行失败或完成次数。
- 跨日、多时间点及手动日志不会错误抵消到期提示。
- 缺字段、日志截断及无效时间不生成确定结论。
- 读取失败和无权限使用不同的数据清理方式。

## Task 1：后端权限与数据映射

**Files:** 新增 `TaskMonitor.js`、`task-monitor.test.mjs`。

**Interfaces:**  
`checkTaskMonitorAccess()` 返回访问许可；`taskMonitorRequireAccess_()` 拒绝无权限调用；`taskMonitorReadSources_()` 返回经过字段校验的配置及日志。

- [ ] 先写权限、表头缺失／重复及业务状态分类测试，运行确认因功能未实现而失败。
- [ ] 实现最小后端，确保读取数据前完成身份校验。
- [ ] 运行测试确认通过，并以 mock 检查没有业务数据写入。

## Task 2：计划和看板数据接口

**Files:** 更新 `TaskMonitor.js`、`task-monitor.test.mjs`。

**Interfaces:**  
`getTaskMonitorData(days)` 返回任务、日志、概览、配置错误及数据覆盖信息；仅接受1、7、30天。

- [ ] 先写跨月跨年、多时间点、手动日志、15分钟提示及覆盖不足测试，确认失败。
- [ ] 实现计划搜索、日志筛选和汇总，完整性不足时抑制缺日志判断。
- [ ] 运行测试确认通过。

## Task 3：页面与 EDS 入口

**Files:** 新增 `TaskMonitor.html`、`TaskMonitor-js.html`；修改 `Code.js`、`Navigation.html`、`Navigation_js.html`、`appsscript.json`。

**Interfaces:**  
新增 `TaskMonitor` 路由；页面和导航调用访问查询，页面通过 `getTaskMonitorData(days)` 取得数据。

- [ ] 先写路由、入口及前端交互测试，确认失败。
- [ ] 实现三个视图、搜索筛选、详情、刷新及错误状态。
- [ ] 加入仅本人可见的导航入口、后台页面检查及邮箱 scope。
- [ ] 验证筛选、详情、刷新、安全转义和无权限清空；可用时进行浏览器检查。

## Task 4：回归与交付

- [ ] 运行 `node --test *.test.mjs`，报告全部失败，包括既有失败。
- [ ] 运行 `git diff --check`，核对改动范围、只读接口及业务逻辑保持情况。
- [ ] 提供本地实现结果、验证证据及线上未验证项，交用户审阅后再处理部署。
