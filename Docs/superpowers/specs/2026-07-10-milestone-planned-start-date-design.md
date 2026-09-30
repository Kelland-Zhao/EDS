# 里程碑增加「计划开始日期」— 设计文档

**日期**: 2026-07-10  
**版本**: V20260710.01  
**状态**: 已确认

---

## 1. 背景

当前所有里程碑/事项仅有「计划日期」（实际语义为计划**完成**日期），缺少计划开始日期。用户希望在里程碑级别同时记录时间跨度的起点和终点，并在甘特图、CI/Kaizen checklist 中展示。

## 2. 核心改动

为每个里程碑/事项新增 `plannedStart`（计划开始日期）字段。

### 2.1 数据结构

```json
// 旧
{ "name": "...", "planned": "2026-07-15", "actual": "", "owner": "", "ownerEmail": "", "status": "" }

// 新
{ "name": "...", "plannedStart": "2026-07-01", "planned": "2026-07-15", "actual": "", "owner": "", "ownerEmail": "", "status": "" }
```

- `plannedStart` 为空字符串 `""` 表示未填写（兼容旧数据）
- `planned` 字段名不变，语义保持为「计划完成日期」
- 新字段为**选填**，旧数据留空不影响现有功能

### 2.2 适用范围

- 新品/新自动化项目 → 里程碑节点
- CI 项目 → follow-up 事项
- Kaizen 项目 → follow-up 事项

**所有类型均适用。**

## 3. 前端改动

### 3.1 Add 弹窗

| 场景 | 文件 | 函数 | 改动 |
|------|------|------|------|
| 里程碑行 | ProjectTracking-js.html | `addMilestoneRow()` | 名称、责任人之间加「计划开始」date input |
| CI follow-up 行 | ProjectTracking-js.html | `addFollowupRow()` | 事项、责任人之间加「计划开始」date input |
| 提示文字 | ProjectTracking.html | 行 358/369 | 更新为「事项 + 责任人 + 计划开始 + 计划完成」 |

行布局（里程碑 → `add-ms-row`）：
```
[名称 textarea] [责任人 select2] [计划开始 date] [计划完成 date] [删除 btn]
```

行布局（CI follow-up → `ci-fu-row`）：
```
[事项 textarea] [责任人 select2] [计划开始 date] [计划完成 date] [状态 select] [删除 btn]
```

### 3.2 Update 弹窗

| 场景 | 函数 | 改动 |
|------|------|------|
| 表头 | `updateMilestonesThead()` | 在「责任人」和「计划日期」之间加 `<th>计划开始<br><small>Start</small></th>` |
| 行渲染 | `addUpdateMilestoneRow()` | 在 owner select 和 planned input 之间加 `upd-ms-start` date input |
| 数据收集 | `saveUpdates()` | 读取 `.upd-ms-start` 值，写入 `plannedStart` |
| 旧数据读取 | `openUpdateModal()` | 从 milestone JSON 中读取 `plannedStart` 传入行渲染 |

### 3.3 甘特图

| 函数 | 改动 |
|------|------|
| `renderSingleProjectGantt()` | 日期范围计算纳入 `plannedStart`；渲染逻辑改为条状图 |

**条状图逻辑**：
- 有 `plannedStart` 且可解析 → 横条从 `plannedStart` 到 `planned`，按里程碑状态着色
- 无 `plannedStart`（旧数据） → 仅在 `planned` 日期显示 ◆ 菱形标记（保持现有行为）
- 条状颜色：绿=已完成、红=逾期、橙=推迟、灰=待完成
- 条状高度占行高 60%，垂直居中

### 3.4 CI/Kaizen Checklist 展开表格

| 函数 | 改动 |
|------|------|
| `renderCIChecklist()` | 表头加「计划开始 / Start」列，数据行渲染 `ms.plannedStart` |

表头顺序：
```
事项 / Item | 责任人 / Owner | 计划开始 / Start | 计划完成 / Due | 实际完成 / Actual | 状态 / Status
```

### 3.5 提交逻辑

| 函数 | 改动 |
|------|------|
| `submitAddProject()` | CI 路径收集 `.ci-fu-start`；新品路径收集 `.add-ms-start`；写入 `plannedStart` |
| `saveUpdates()` | 读取 `.upd-ms-start`，写入 `plannedStart` 到里程碑数组 |

### 3.6 CSS

新增样式（ProjectTracking.html `<style>` 块）：
- `upd-ms-start` 列宽度约 115px（与 planned 列一致）
- 条状图 bar 样式（`.gantt-bar`）：圆角、半透明、状态色
- 响应式：date input 在小屏不折行

## 4. 后端改动

### 4.1 `addProject()` (Code.js:13007)

`msJsonArr` 构建时新增 `plannedStart` 字段：

```javascript
return {
  name: ms.name || '',
  plannedStart: ms.plannedStart || '',  // 新增
  planned: ms.planned || 'NA',
  actual: ms.actual || '',
  owner: ms.owner || '',
  ownerEmail: ms.ownerEmail || '',
  status: ms.status || ''
};
```

### 4.2 `updateProjectTracking()` (Code.js:10820)

- 里程碑替换路径：保留前端传入的 `plannedStart`
- 实际日期更新路径（仅更新 actual）：保留原有 `plannedStart`

### 4.3 `parseMilestonesJSON_()` (Code.js:10765)

**无需改动** — JSON 解析天然兼容新增字段。

### 4.4 通知邮件函数

`sendProjectCreationNotification()` 等涉及里程碑展示的邮件，里程碑列表中加入计划开始日期。具体格式：每个里程碑显示 `计划开始 → 计划完成`。

## 5. 兼容性

- 旧里程碑无 `plannedStart` → 字段值为空字符串 `""`
- UI 中 date input 为空不显示（placeholder 为空）
- 甘特图中旧数据降级为 ◆ 菱形标记
- 不影响现有项目的查询、筛选、状态计算

## 6. 验收标准

1. ✅ Add 弹窗中新品/自动化里程碑行有「计划开始」输入框
2. ✅ Add 弹窗中 CI/Kaizen follow-up 行有「计划开始」输入框
3. ✅ Update 弹窗表格有「计划开始」列，可编辑
4. ✅ 甘特图中填写了开始日期的里程碑显示为横条
5. ✅ 甘特图中无开始日期的旧里程碑仍显示菱形标记
6. ✅ CI/Kaizen checklist 展开表有「计划开始」列
7. ✅ 新增项目保存后，数据库中包含 `plannedStart` 字段
8. ✅ 编辑旧项目不会破坏已有数据
9. ✅ 旧项目编辑时可为里程碑补充计划开始日期

## 7. 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `ProjectTracking.html` | CSS 新增、提示文字更新 |
| `ProjectTracking-js.html` | 6 个函数改动、甘特图渲染逻辑重构 |
| `Code.js` | `addProject()` 和 `updateProjectTracking()` 适配新字段 |
