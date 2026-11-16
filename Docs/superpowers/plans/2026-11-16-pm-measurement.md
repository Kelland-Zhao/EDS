# PM 保养任务测量记录与校验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让保养任务按配置记录单点/多点测量值，照片先上传后结束，后端按工单快照校验，并修复完成状态冲突。

**Architecture:** 配置在 Tasklist-MoC 的保养任务清单编辑/新建页维护，随任务清单审批生效，存进 `Tasklist_history` 的任务 JSON；EDS 的 PM 执行页读取生效清单，工单开始时复制快照，结束时前后端按快照校验；照片元数据存任务 JSON，照片文件存 Drive。

**Tech Stack:** Google Apps Script (V8)、HtmlService、Bootstrap 5.3.1、jQuery 3.6.4、DataTables 1.13.6、SweetAlert2、Node `node --test`。

**Spec:** `docs/superpowers/specs/2026-11-16-pm-measurement-design.md`

## Global Constraints

- 两个仓库：EDS `/Users/kelland/gas-projects/EQU-Digital-System`；Tasklist-MoC `/Users/kelland/gas-projects/Tasklist-MoC`。
- 本次只改本地代码与测试；不改真实 Google 数据、不部署。
- 测试命令：`node --test <file>.test.mjs`；语法检查：`node --check Code.js`。
- 不拆分任务编号；FCS-43 保持一条任务。
- 旧工单判定：任务 JSON 没有 `Measurement Points` → 跳过测量校验。
- 本版「重新打开」指重新进入 `Ongoing` 草稿继续填写；已完成工单重新打开不在本次范围。
- 未完成任务（`taskStatus = false`）不要求照片或测量值，走「原因 + 后续措施」。
- `Photo Required` 对所有任务生效，默认 `N`；每任务最多 3 张照片。
- `LL/HH` 允许空；空 → 待判定。
- 多点限值：每个测点分别与 LL/HH 对比，任一点超限 → 不合格；Total 只展示。
- `taskStatus` 为唯一完成字段；`Task Status` 仅旧数据读取；冲突显示「待核实」。
- 本版不落 `exceptionStatus`。
- 超限时 `note` 必填（异常措施）后才能结束。
- PdM 趋势：每个测点写一行；不新增物理单位列；只在 End 成功后写，草稿不写。
- 提交格式：`VYYYYMMDD.XX_描述`；序号跨天连续。

## Review Focus

- 旧工单（有 `PdM?`、无 `Measurement Points`）必须能正常结束，不被测量校验卡住。
- 未勾选完成的任务不能被要求补读数或照片。
- 数值解析必须接受 `0`，拒绝 `正常`、`284abc`、空值。
- 照片上传失败/重试/重复点击/重新打开后保存都不能丢关联，也不能把已有照片覆盖成「无图片」。
- 两个完成字段冲突时必须显示「待核实」，不能静默选一个。

---

## Phase 1：EDS 安全修复（不依赖新配置）

### Task 1: 后端状态/照片/旧字段校验纯函数

**Files:**
- Modify: `Code.js`（新增纯函数，放在 `saveData_tasklist` 前）
- Test: `pm-measurement-backend.test.mjs`

**Interfaces:**
- `pmTaskDoneState_(task) -> {done:boolean, conflict:boolean}`
  - `taskStatus` 存在时以它为准；否则读 `Task Status`；两者都存在且不同 → `conflict: true`。
- `pmTaskEndErrors_(tasks) -> Array<{row:number, taskNo:string, field:string, message:string}>`
  - 只检查 `done === true` 的任务。
  - `Photo Required === 'Y'` 且 `photos` 无 `status === 'success'` → field `Photo`。
  - `PdM?` 为是、没有 `Measurement Points`、`valueAndNote` 为空 → field `Value`。
  - 冲突不加入 errors（由展示层显示待核实）。
- `pmPhotoSuccess_(task) -> boolean`
- `pmIsPdMYes_(value) -> boolean`（接受 `是/ Yes`、`是`、`Yes`）

- [ ] **Step 1: 写失败测试**

```js
// pm-measurement-backend.test.mjs
test('旧工单 PdM 任务数值为空时结束校验报错', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' },
  ]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'Value');
});

test('旧工单没有 Measurement Points 时不做数字校验', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '125' },
  ]);
  assert.deepEqual(errors, []);
});

test('Photo Required=Y 且无成功照片时报错', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', taskStatus: true, 'Photo Required': 'Y', photos: [] },
  ]);
  assert.equal(errors[0].field, 'Photo');
});

test('未完成任务不要求数值或照片', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: false, 'Photo Required': 'Y' },
  ]);
  assert.deepEqual(errors, []);
});

test('taskStatus 与 Task Status 冲突时标记 conflict', () => {
  assert.deepEqual(pmTaskDoneState_({ taskStatus: true, 'Task Status': false }), { done: true, conflict: true });
  assert.deepEqual(pmTaskDoneState_({ 'Task Status': true }), { done: true, conflict: false });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: FAIL（`pmTaskEndErrors_ is not defined` 或断言失败）

- [ ] **Step 3: 实现纯函数**

在 `Code.js` 中实现上述五个函数；不要读写表格，不要依赖前端。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Code.js pm-measurement-backend.test.mjs
git commit -m "VYYYYMMDD.XX_新增结束校验纯函数"
```

### Task 2: `saveData_tasklist` 结束校验接入

**Files:**
- Modify: `Code.js:4584`（`saveData_tasklist`，`Status == "End"` 分支）
- Test: `pm-measurement-backend.test.mjs`

**Interfaces:**
- 测试使用 `pm-verify-backend.test.mjs` 的 fake sheet 模式（`globalThis.SpreadsheetApp` + `fakeSheet(rows)`），在测试文件内建 `Tasklist_history` 行和 `getPMSheet` 所需 sheet。
- `saveData_tasklist(data, confirmUser)` 在 `Status == "End"` 时：
  - 解析 `data["任务明细"]`。
  - `pmTaskEndErrors_(tasks)` 非空 → 返回 `{ok:false, code:'MEASUREMENT_VALIDATION', errors}`，不写任何单元格。
  - 通过 → 继续原有写入，返回 `"提交成功"`。
- 成功返回保持字符串 `"提交成功"`；失败返回对象。

- [ ] **Step 1: 写失败测试**

```js
test('End 有缺失测量时后端拒绝写入', () => {
  setupFakePmSheet();
  const res = saveData_tasklist({
    'PM No.': 'PM-001', 'SheetName': 'IM-TB1', Status: 'End',
    '任务明细': JSON.stringify([{ 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' }]),
    EndDate: '2026-11-16', EndTime: '10:00',
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, 'MEASUREMENT_VALIDATION');
  assert.equal(ws.values.length, 1); // 只保留表头
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: FAIL（当前会返回“提交成功”并写入）

- [ ] **Step 3: 接入校验**

在 `Status == "End"` 分支最前面解析并校验；错误直接返回对象；不要提前写 EndDate/EndTime/Status。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Code.js pm-measurement-backend.test.mjs
git commit -m "VYYYYMMDD.XX_后端结束校验接入"
```

### Task 3: PM_Task 结束流程改为「先校验、再传图、最后提交」

**Files:**
- Modify: `PM_Task-js_1.0.html`（`executeSubmissionProcess`、`TASK_FIELDS`、`dataSubmit` 返回处理）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- 前端纯函数（放入 `PM_Task-js_1.0.html`，可被提取测试）：
  - `pmTaskEndErrors_(tasks)`：与后端同名同规则。
  - `pmPhotoKey_(pmNo, taskNo, name) -> string`
  - `pmMergePhotos_(existing, incoming) -> Array`：按 key 去重，保留已有；最多保留 3 张。
- `executeSubmissionProcess` 流程：
  1. 构造任务数组（含 `taskStatus`、`valueAndNote`、`photos`）。
  2. `pmTaskEndErrors_` 非空 → 弹窗列出错误，return，不改 PmStatus。
  3. 上传本次照片，拿到 fileId；合并进任务 `photos`。
  4. `dataSubmit(Status=End)`；失败则提示并保持未完成。
  5. 成功后才写 `PmStatus = 已完成`、绿色背景、`PmEnd` disabled、sessionStorage。

- [ ] **Step 1: 写失败测试**

```js
test('前端结束校验与后端同规则', () => {
  const errors = pmTaskEndErrors_([
    { 'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true, valueAndNote: '' },
  ]);
  assert.equal(errors[0].field, 'Value');
});

test('照片按工单+任务+文件名去重且保留已有', () => {
  const existing = [{ fileId: 'a', name: 'x.jpg', status: 'success' }];
  const merged = pmMergePhotos_(existing, [
    { fileId: 'b', name: 'x.jpg', status: 'success' },
    { fileId: 'c', name: 'y.jpg', status: 'success' },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].fileId, 'a');
  assert.equal(merged[1].fileId, 'c');
});

test('照片最多保留 3 张', () => {
  const existing = [{ fileId: 'a', name: '1.jpg', status: 'success' }];
  const merged = pmMergePhotos_(existing, [
    { fileId: 'b', name: '2.jpg', status: 'success' },
    { fileId: 'c', name: '3.jpg', status: 'success' },
    { fileId: 'd', name: '4.jpg', status: 'success' },
  ]);
  assert.equal(merged.length, 3);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现前端纯函数并改造结束流程**

先加纯函数；再调整 `executeSubmissionProcess` 顺序与失败分支；`TASK_FIELDS` 加入 `PdM?`、`Photo Required`、`photos`，避免被白名单丢弃。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_Task-js_1.0.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_结束流程先校验后传图"
```

### Task 4: 草稿保存（Ongoing）先上传照片再保存

**Files:**
- Modify: `PM_Task-js_1.0.html:2700-2790`（Ongoing 保存分支）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- 复用 Task 3 的 `pmMergePhotos_`。
- 草稿保存：上传本次照片 → 合并 `photos` → `dataSubmit(Status=Ongoing)`；上传失败只提示，不阻断草稿保存；已成功的照片必须保留。

- [ ] **Step 1: 写失败测试**

```js
test('草稿合并已有照片时不清空', () => {
  const existing = [{ fileId: 'a', name: 'x.jpg', status: 'success' }];
  assert.equal(pmMergePhotos_(existing, []).length, 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 改造 Ongoing 保存顺序**

先上传、后 `dataSubmit`；失败不覆盖已有 `photos`。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_Task-js_1.0.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_草稿保存保留照片"
```

### Task 5: 状态冲突展示

**Files:**
- Create: `PM_Common_js.html`（PM 页面共享纯函数）
- Modify: `PM_RecordQuery.html`、`PM_Production_Confirm.html`（引入共享 include）
- Modify: `PM_RecordQuery-js.html`（任务明细渲染）
- Modify: `PM_Procduction_Confirm-js.html`（备注/任务明细渲染）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- 共享 include 提供 `pmTaskStatusLabel_(task) -> string`：冲突 → `待核实 / Verify`；否则 `已完成 / Done` 或 `未完成 / Pending`。
- 两个 HTML 页面在各自 `-js` include 之前加入 `<?!=include("PM_Common_js") ?>`。
- 两页在任务明细/备注中使用该函数；冲突时保留原始字段值，不修改数据。
- 测试从 `PM_Common_js.html` 提取 `pmTaskStatusLabel_`。

- [ ] **Step 1: 写失败测试**

```js
test('完成状态冲突显示待核实', () => {
  assert.equal(pmTaskStatusLabel_({ taskStatus: true, 'Task Status': false }), '待核实 / Verify');
  assert.equal(pmTaskStatusLabel_({ taskStatus: true }), '已完成 / Done');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现并接入两页**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_RecordQuery-js.html PM_Procduction_Confirm-js.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_完成状态冲突显示待核实"
```

---

## Phase 2：Tasklist-MoC 配置维护

### Task 6: 配置解析/校验纯函数

**Files:**
- Create: `Measurement_Config_JS.html`（Tasklist-MoC 共享 include）
- Modify: `Tasklist_MoC_Modify.html`、`Tasklist_Create.html`（引入共享 include）
- Test: `tasklist-pdm-config.test.mjs`（从 `Measurement_Config_JS.html` 提取函数）

**Interfaces:**
- 两个 HTML 页面在各自 `-js` include 之前加入 `<?!=include("Measurement_Config_JS") ?>`。
- `parseMeasurementPoints_(value) -> Array<{code:string}>`：逗号分隔，去空、去重、保留顺序。
- `parsePointLabels_(value) -> Object<string,string>`：分号分隔 `code=label`。
- `validateMeasurementConfig_(task) -> Array<{field:string,message:string}>`
  - `PdM?` 为是：`Measurement Points`、`Point Labels`、`Measurement Unit` 必填；labels 覆盖全部 points；重复/漏写报错。
  - `PdM?` 为否：不校验。
- `buildPdMSummary_(task) -> string`：例如 `S1-S4 · kN`；无配置返回 `—`。

- [ ] **Step 1: 写失败测试**

```js
test('测点与位置不匹配时报配置错误', () => {
  const errors = validateMeasurementConfig_({
    'PdM?': '是/ Yes',
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧',
    'Measurement Unit': 'kN',
  });
  assert.ok(errors.some(e => e.field === 'Point Labels'));
});

test('完整配置通过并生成摘要', () => {
  const task = {
    'PdM?': '是/ Yes',
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
  };
  assert.deepEqual(validateMeasurementConfig_(task), []);
  assert.equal(buildPdMSummary_(task), 'S1-S4 · kN');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现四个纯函数**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Tasklist_MoC_Modify_JS.html tasklist-pdm-config.test.mjs
git commit -m "VYYYYMMDD.XX_测量配置解析与校验"
```

### Task 7: 编辑页表格 + PdM 配置弹窗

**Files:**
- Modify: `Tasklist_MoC_Modify_JS.html`（列定义、渲染、按钮事件、提交校验）
- Modify: `Tasklist_MoC_Modify.html`（表头分组与样式）
- Test: `tasklist-pdm-config.test.mjs`（结构断言）

**Interfaces:**
- 表格新增：预测性列、`Photo Required` 列（所有行，Y/N）、`PdM 配置` 摘要列（摘要 + 「配置」按钮）。
- 去掉原 `Unit / Component / Logic / TagName / LL Limited / HH Limited` 六个内联列。
- 弹窗字段：`Unit`、`Component`、`TagName`、`Logic`、`LL Limited`、`HH Limited`、`Measurement Points`、`Point Labels`、`Measurement Unit`。
- 保存时：`pdM? = 是` 的行调用 `validateMeasurementConfig_`；不通过列出任务编号并阻止提交。

- [ ] **Step 1: 写结构断言测试**

```js
test('编辑页包含照片列与 PdM 配置按钮', () => {
  const html = fs.readFileSync('Tasklist_MoC_Modify.html', 'utf8');
  const js = fs.readFileSync('Tasklist_MoC_Modify_JS.html', 'utf8');
  assert.ok(js.includes('Photo Required'));
  assert.ok(js.includes('btn-pdm-config'));
  assert.ok(html.includes('需要照片'));
  assert.ok(html.includes('PdM 配置'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现表格列与弹窗**

- [ ] **Step 4: 运行测试确认通过 + 语法检查**

Run: `node --test tasklist-pdm-config.test.mjs`
Run: `node --input-type=module -e "import fs from 'node:fs'; import {extractScript} from './strategy-test-utils.mjs'; new Function(extractScript(fs.readFileSync('Tasklist_MoC_Modify_JS.html','utf8')))"`
Expected: PASS / 无输出

- [ ] **Step 5: 提交**

```bash
git add Tasklist_MoC_Modify.html Tasklist_MoC_Modify_JS.html tasklist-pdm-config.test.mjs
git commit -m "VYYYYMMDD.XX_编辑页PdM配置弹窗"
```

### Task 8: 新建页接入相同配置

**Files:**
- Modify: `Tasklist_Create_JS.html`（列定义、渲染、新建行默认值、提交校验）
- Modify: `Tasklist_Create.html`（表头分组）
- Test: `tasklist-pdm-config.test.mjs`

**Interfaces:**
- 新建行默认：`Photo Required: 'N'`；测量字段为空。
- PdM 配置弹窗与编辑页共用 `validateMeasurementConfig_`（`Tasklist_Create_JS.html` 需引入同一实现，或在共享 include 中提供）。

- [ ] **Step 1: 写结构断言测试**

```js
test('新建页使用单数 Technician 且有照片列', () => {
  const js = fs.readFileSync('Tasklist_Create_JS.html', 'utf8');
  assert.ok(js.includes('Photo Required'));
  assert.ok(js.includes('btn-pdm-config'));
  assert.ok(js.includes('技术员/ Technician'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现新建页配置**

- [ ] **Step 4: 运行测试确认通过 + 语法检查**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Tasklist_Create.html Tasklist_Create_JS.html tasklist-pdm-config.test.mjs
git commit -m "VYYYYMMDD.XX_新建页接入PdM配置"
```

### Task 9: 提交载荷包含新字段

**Files:**
- Modify: `Tasklist_MoC_Modify_JS.html`（`PM_FIELDS`、行比较、任务 JSON 构建）
- Modify: `Tasklist_Create_JS.html`（任务 JSON 构建、空值检查排除规则）
- Test: `tasklist-pdm-config.test.mjs`

**Interfaces:**
- 两个页面构建的任务对象必须包含：`Measurement Points`、`Point Labels`、`Measurement Unit`、`Photo Required`。
- 行比较/差异计算包含这些字段。
- 新建页空值检查不得丢弃这些字段（它们可能为空）。

- [ ] **Step 1: 写失败测试**

```js
test('任务字段数组包含测量配置', () => {
  const js = fs.readFileSync('Tasklist_MoC_Modify_JS.html', 'utf8');
  ['Measurement Points', 'Point Labels', 'Measurement Unit', 'Photo Required'].forEach(f => {
    assert.ok(js.includes(f), f);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: FAIL

- [ ] **Step 3: 更新字段数组与构建逻辑**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tasklist-pdm-config.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Tasklist_MoC_Modify_JS.html Tasklist_Create_JS.html tasklist-pdm-config.test.mjs
git commit -m "VYYYYMMDD.XX_任务JSON保存测量配置"
```

---

## Phase 3：EDS 多点执行试点

### Task 10: 测量配置解析/校验纯函数（前后端同规则）

**Files:**
- Modify: `Code.js`（后端）
- Modify: `PM_Task-js_1.0.html`（前端）
- Test: `pm-measurement-backend.test.mjs`、`pm-measurement-ui.test.mjs`

**Interfaces:**
- `pmParsePoints_(value) -> Array<{code,label}>`：points + labels 合并。
- `pmNumericValue_(value) -> number|null`：空/非数字 → null；`0` → 0。
- `pmAggregate_(values, unit) -> number`：单位含 `με` → 平均；否则求和。
- `pmPointOutOfLimit_(logic, value, ll, hh) -> boolean|null`：无限值 → null（待判定）。
- `pmMeasurementErrors_(task) -> Array<{field,message}>`：仅新配置任务（有 `Measurement Points`）；配置完整、测点齐全、数值有效。
- `pmInspectionResult_(task) -> '合格'|'不合格'|'待判定'`：每点分别判定；任一点超限 → 不合格。

- [ ] **Step 1: 写失败测试**

```js
test('0 是有效数值，正常/284abc 不是', () => {
  assert.equal(pmNumericValue_('0'), 0);
  assert.equal(pmNumericValue_('正常'), null);
  assert.equal(pmNumericValue_('284abc'), null);
});

test('任一点超限即不合格', () => {
  const task = {
    'Measurement Points': 'S1,S2',
    'Measurement Unit': 'kN',
    Logic: 'Out_of_range',
    'LL Limited': '100',
    'HH Limited': '130',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 145 }],
  };
  assert.equal(pmInspectionResult_(task), '不合格');
});

test('με 模式合计取平均', () => {
  assert.equal(pmAggregate_([100, 120], 'με'), 110);
  assert.equal(pmAggregate_([100, 120], 'kN'), 220);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-backend.test.mjs pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现前后端同规则纯函数**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-backend.test.mjs pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Code.js PM_Task-js_1.0.html pm-measurement-backend.test.mjs pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_测量解析与判定纯函数"
```

### Task 11: PM_Task 多点录入界面

**Files:**
- Modify: `PM_Task-js_1.0.html`（任务表格渲染、测量弹窗、备注）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- `pmMeasurementSummary_(task) -> string`：如 `S1 125 · S2 126 · S3 124 · S4 127`；缺失显示 `—`。
- `pmMeasurementModalHtml_(task) -> string`：按 `Point Labels` 生成数值框。
- 表格：`PdM? = 是` 且新配置的任务显示摘要 +「录入」按钮；`PdM? = 否` 不显示。
- 弹窗：数值框只收数字；备注独立；照片按 `Photo Required`。
- 保存：`measurements` 数组写回任务 JSON。

- [ ] **Step 1: 写失败测试**

```js
test('多点摘要按测点顺序显示', () => {
  const task = {
    'Measurement Points': 'S1,S2',
    'Point Labels': 'S1=操作侧;S2=非操作侧',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  };
  assert.equal(pmMeasurementSummary_(task), 'S1 125 · S2 126');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现表格渲染与弹窗**

- [ ] **Step 4: 运行测试确认通过 + 语法检查**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_Task-js_1.0.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_多点测量录入界面"
```

### Task 12: 后端完整测量校验与结果计算

**Files:**
- Modify: `Code.js`（`pmTaskEndErrors_`、`saveData_tasklist` End 分支）
- Test: `pm-measurement-backend.test.mjs`

**Interfaces:**
- `pmTaskEndErrors_` 对新配置任务调用 `pmMeasurementErrors_`；错误字段为测点代码或配置字段。
- 通过后：重算 `measurementTotal`、`inspectionResult`；超限且 `note` 为空 → field `Note` 错误。
- 旧工单（无 `Measurement Points`）跳过测量校验。

- [ ] **Step 1: 写失败测试**

```js
test('新配置缺 S3 时后端报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1,S2,S3,S4',
    'Point Labels': 'S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧',
    'Measurement Unit': 'kN',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }, { point: 'S4', value: 127 }],
  }]);
  assert.ok(errors.some(e => e.field === 'S3'));
});

test('超限且 note 为空时报错', () => {
  const errors = pmTaskEndErrors_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes', taskStatus: true,
    'Measurement Points': 'S1',
    'Point Labels': 'S1=操作侧',
    'Measurement Unit': 'kN',
    Logic: 'Out_of_range', 'LL Limited': '100', 'HH Limited': '130',
    measurements: [{ point: 'S1', value: 145 }],
    note: '',
  }]);
  assert.ok(errors.some(e => e.field === 'Note'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: FAIL

- [ ] **Step 3: 接入测量校验与结果计算**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-backend.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add Code.js pm-measurement-backend.test.mjs
git commit -m "VYYYYMMDD.XX_后端多点测量校验"
```

### Task 13: PdM 趋势改为按测点、仅 End 写入

**Files:**
- Modify: `PM_Task-js_1.0.html`（`PdMData_empty_or_not`、`PdMData`）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- `buildPdMRows_(tasks, pmNo) -> Array<Object>`：每个测点一行，`TagName` 写测点代码；只处理 `PdM? = 是` 且有 `measurements` 的任务。
- `PdMData_empty_or_not(tableData)`：筛选 `PdM? = 是` 且有 `measurements` 的任务；不再看任务编号。
- `PdMData()`：调用 `buildPdMRows_`；不新增物理单位列。
- 只在 `Status = End` 成功后调用；草稿保存不调用。

- [ ] **Step 1: 写失败测试**

```js
test('PdM 趋势按测点展开', () => {
  const rows = buildPdMRows_([{
    'Task No': 'FCS-43', 'PdM?': '是/ Yes',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  }], 'PM-001');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].TagName, 'S1');
  assert.equal(rows[1].TagName, 'S2');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现按测点展开，并移除草稿调用**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_Task-js_1.0.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_PdM趋势按测点写入"
```

### Task 14: 查询/确认页展示测量与照片

**Files:**
- Modify: `PM_Common_js.html`（新增 `pmMeasurementReportHtml_`）
- Modify: `PM_RecordQuery-js.html`
- Modify: `PM_Procduction_Confirm-js.html`
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- `pmMeasurementReportHtml_(task) -> string`：测点值、Total、`inspectionResult`、备注、照片链接。
- 查询页任务明细/报告使用该函数；确认页备注列显示测量摘要。
- 冲突状态使用 Task 5 的 `pmTaskStatusLabel_`。
- 测试从 `PM_Common_js.html` 提取 `pmMeasurementReportHtml_`。

- [ ] **Step 1: 写失败测试**

```js
test('报告显示测点、Total 与结果', () => {
  const html = pmMeasurementReportHtml_({
    'Measurement Unit': 'kN', measurementTotal: 502, inspectionResult: '合格',
    measurements: [{ point: 'S1', value: 125 }, { point: 'S2', value: 126 }],
  });
  assert.ok(html.includes('S1=125'));
  assert.ok(html.includes('502'));
  assert.ok(html.includes('合格'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现两页展示**

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PM_RecordQuery-js.html PM_Procduction_Confirm-js.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_报告展示测量记录"
```

### Task 15: FCS-43 试点 fixture 与端到端校验

**Files:**
- Create: `pm-measurement-fcs43.test.mjs`
- Modify: `pm-measurement-backend.test.mjs`（如需要）

**Interfaces:**
- fixture：FCS-43 任务，`PdM?=是`、S1~S4、`Measurement Unit=kN`、`Photo Required=Y`、`LL/HH` 空。
- 用例：
  - 缺任一测点 / 单位缺失 → 后端拒绝。
  - 四点为 0 → 有效。
  - 限值为空 → `待判定`，允许结束。
  - 照片成功 → 通过；照片失败 → 拒绝。
  - 旧工单（无 `Measurement Points`）→ 跳过测量校验。

- [ ] **Step 1: 写 fixture 与测试**
- [ ] **Step 2: 运行确认失败（如实现缺失）**
- [ ] **Step 3: 补实现或修正 fixture**
- [ ] **Step 4: 运行全部测量相关测试**

Run: `node --test pm-measurement-backend.test.mjs pm-measurement-ui.test.mjs pm-measurement-fcs43.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add pm-measurement-fcs43.test.mjs
git commit -m "VYYYYMMDD.XX_FCS43多点测量试点测试"
```

### Task 16: 兼容性核查（PersonnelAssignment / TaskEdit / 旧数据）

**Files:**
- Modify: `PersonnelAssignment_js.html`（如需要）
- Modify: `TaskEdit_js.html`（如需要）
- Test: `pm-measurement-ui.test.mjs`

**Interfaces:**
- `PersonnelAssignment` 用 `...task` 展开原任务，新字段应自动保留；测试断言生成的 `formattedTaskDetails` 含 `Measurement Points` / `Photo Required`（如原任务有）。
- `TaskEdit` 保存 `updatedData` 时不得丢弃新字段；测试断言保存载荷中的任务对象保留 `Measurement Points` / `Point Labels` / `Measurement Unit` / `Photo Required`。
- 旧数据无新字段时：不报错，执行页按 `Photo Required` 缺失 = `N`、无 `Measurement Points` = 旧工单处理。

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行确认失败或确认现状已兼容**
- [ ] **Step 3: 仅在测试失败时修改两页**
- [ ] **Step 4: 运行确认通过**

Run: `node --test pm-measurement-ui.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add PersonnelAssignment_js.html TaskEdit_js.html pm-measurement-ui.test.mjs
git commit -m "VYYYYMMDD.XX_兼容新测量字段"
```

---

## 验收与收尾

- 两个仓库分别运行全量测试：
  - EDS: `node --test *.test.mjs`
  - Tasklist-MoC: `node --test *.test.mjs`
- 语法检查：`node --check Code.js`；两个仓库的页面 JS 用 `extractScript` 做 `new Function` 解析。
- 更新两个仓库的 `项目记录.md`。
- 不部署；部署另行确认。
