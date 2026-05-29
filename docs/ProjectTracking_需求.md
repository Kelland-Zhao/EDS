# ProjectTracking.html 修改需求

---

## 待办需求

---

### 需求1：实际完成日期填写未来日期的处理

**问题描述：**
计划日期已到期，用户填写了一个未来的实际完成日期，系统误判为"已完成"。

**改动范围：**

#### 前端 `ProjectTracking-js.html`
- `saveChanges()` 保存前，遍历所有 actualDate，检测到 `actualDate > today` 时：
  - 用 SweetAlert2 弹出确认框，列出受影响的里程碑名称 + 填写日期
  - 标题：⚠️ 实际完成日期异常 / Actual Date Warning
  - 提示：以下里程碑的实际完成日期晚于今日，该节点将显示为「计划时间推迟」，确认继续保存吗？
  - 按钮：确认保存 / Confirm　｜　返回修改 / Cancel
- Gantt 渲染逻辑新增状态：
  - `actualDate <= today` → 绿色 ◆ 已完成 / Done（原逻辑不变）
  - `actualDate > today` → 橙色 ◆ 计划时间推迟 / Planned Delayed

#### 前端 `ProjectTracking.html`
- 图例新增橙色 ◆ 计划时间推迟 / Planned Delayed

#### 后端 `Code.js`
- `sendProjectUpdateNotification()`：里程碑日期变更表格中，若新 actualDate > 发送时间，在该行加「⚠️ 计划时间推迟」标注

---

### 需求2：计划日期变更历史追踪

**问题描述：**
计划日期被修改后直接覆盖，无法追溯变更记录（如从 1-1 推迟到 2-2）。

**改动范围：**

#### 后端 Google Sheet（已用 MCP 创建）
- 新增 sheet：`ProjectTracking_History`（sheetId: 853082385）
- 表头（A1:G1）：项目名称 | 里程碑 | 原计划日期 | 新计划日期 | 修改人 | 修改时间 | 备注

#### 后端 `Code.js`
- `updateProjectTracking()` 检测到 plannedDate 变更时，追加一行到 `ProjectTracking_History`
- `sendPlannedDateChangeNotification()` 邮件里程碑表格补充原计划日期列：**原计划 → 新计划**

#### 前端 `ProjectTracking-js.html`
- Gantt 表中，有计划日期变更历史的里程碑显示 🔄 图标
- 点击 🔄 图标弹出弹窗，展示该里程碑的历史变更记录表：
  原计划日期 | 新计划日期 | 修改人 | 修改时间

---

### 需求3：普通用户申请推迟计划日期（邮件审批流）

**权限层级设计（2级）：**

| 权限值（BH列） | 说明 | 计划日期 | 状态 | 实际完成日期 |
|---|---|---|---|---|
| `管理员` | 管理员 | 直接修改 | 直接修改 | 直接修改 |
| 空 | 普通用户 | 需提交申请审批 | 不可修改 | 直接修改 |

- 移除 `超级用户` 层级，`checkProjectPermission()` 中删除 `perm === '超级用户'` 的判断
- 权限表 BH 列中现有 `超级用户` 值需手动改为 `管理员`

**问题描述：**
普通用户无法直接修改计划日期，需要上级审批后才能推迟。管理员可直接修改（已有）。

**审批流程：**
1. 普通用户在更新弹窗中点击计划日期旁的「申请推迟 / Request Delay」按钮
2. 弹出申请表单，填写：目标推迟日期 + 推迟原因
3. 提交后后端生成唯一 token，写入 `ProjectTracking_Approvals` sheet
4. 发送审批邮件给上级，邮件含两个样式化链接按钮：✅ 批准 / Approve 和 ❌ 拒绝 / Reject
5. 上级点击链接 → 触发 `doGet()` → 验证 token → 执行对应逻辑 → 浏览器显示结果页
6. 批准：更新 plannedDate，写入 `ProjectTracking_History`，通知申请人已批准
7. 拒绝：不更新数据，通知申请人已拒绝
8. token 一次性，重复点击显示"已处理"

**改动范围：**

#### 权限表 Google Sheet（需 MCP 新增列）
- 表 ID：`1F7G3WOY5xM4fEYZ1s5RKulY4kJhqCZ9HefthmiVkraM`，sheet：`userID`
- 在现有 60 列（A~BH）末尾新增第 61 列 **BI（index 60）**：`直线上级邮箱 / Supervisor Email`
- 第1行（模块行）：填 `EDS`
- 第2行（字段名行）：填 `直线上级邮箱 / Supervisor Email`
- 数据由管理员手动维护，填写各用户直线上级的 Gmail 地址
- 后端读取时通过 `permVals[i][60]` 获取该用户的上级邮箱

#### 后端 Google Sheet（需 MCP 创建）
- 新增 sheet：`ProjectTracking_Approvals`
- 表头：Token | 项目名称 | 里程碑 | 原计划日期 | 申请新日期 | 申请人 | 申请人邮箱 | 上级邮箱 | 推迟原因 | 状态 | 申请时间 | 处理时间

#### 后端 `Code.js`
- 新增 `requestPlannedDateDelay(dataStr)` 函数：
  - 生成 token（`Utilities.getUuid()`）
  - 写入 `ProjectTracking_Approvals`
  - 发送审批邮件给上级（含批准/拒绝链接）
- `doGet(e)` 增加对 `action=approve` / `action=reject` + `token=xxx` 的处理：
  - 验证 token 是否存在且状态为"待审批"
  - 批准：更新 plannedDate，写 `ProjectTracking_History`，发通知邮件给申请人，返回批准结果页
  - 拒绝：更新状态为"已拒绝"，发通知邮件给申请人，返回拒绝结果页
  - token 已处理：返回"已处理"提示页

#### 前端 `ProjectTracking-js.html`
- 更新弹窗里，普通用户的计划日期旁显示「申请推迟 / Request Delay」按钮
- 点击弹出 SweetAlert2 表单：目标日期（date input）+ 推迟原因（textarea）
- 提交后调用后端 `requestPlannedDateDelay()`，显示"申请已提交"提示

#### 邮件内容（审批邮件）
- 标题：【审批申请】计划日期推迟 / Planned Date Delay Request - {项目名}
- 正文：项目 | 里程碑 | 原计划 | 申请推迟到 | 申请人 | 推迟原因
- 按钮：✅ 批准 / Approve（绿色）｜ ❌ 拒绝 / Reject（红色）

---

## 已完成需求

- 邮件样式统一（V20260521.02）：sendProjectUpdateNotification / sendPlannedDateChangeNotification 改造为富样式 HTML，日期格式统一 YYYY-MM-DD

