# PM 保养任务测量记录与校验设计文档

- 日期：2026-11-16
- 状态：设计定稿（关键决策已确认，待最终审阅）
- 范围：Tasklist-MoC（保养任务清单维护端）+ EQU-Digital-System（PM 执行/确认/查询端）
- 本次范围：本地代码与测试；真实 Google 业务数据、历史记录、线上部署另行处理

## 1. 背景与目标

FCS 标准保养任务「使用哥林柱拉力检测仪测量四根锁模哥林柱拉力数值，并记录」（历史 FCS-38，当前 FCS-43）在电子记录中存在：勾选完成但数值为空、四根柱只填一个 125、照片有读数但数值栏为空、taskStatus 与 Task Status 冲突等现象。这些不能直接证明未执行，但说明系统缺少完整的测量记录与校验。

目标：

1. 保养任务支持按任务配置记录测量值：不测量、单点、多点。
2. 测量值与备注分开；测点、单位、必填、照片要求由任务清单配置。
3. 后端按工单保存的配置快照校验，不信任前端；不静默用最新标准替换旧工单要求。
4. 照片先上传成功再结束保养，附件 ID 关联到任务，支持重试、去重、重新保存不丢失。
5. 完成状态、检测结论、异常处理分开；旧字段兼容，冲突显示「待核实」。
6. PdM 趋势归集与「必须测量」分开，不再依赖任务编号。

## 2. 已确认的关键决策

| 决策 | 结论 |
|---|---|
| 任务是否拆分 | 一条任务 FCS-43，多点录入；不拆成 4 条任务 |
| 测量触发条件 | 沿用现有 `PdM?`：是 = 必须测量；否 = 无需测量 |
| 配置维护位置 | Tasklist-MoC 的保养任务清单编辑页；弃用的 `PM Tasklist` sheet 不再使用 |
| 测点与位置 | 两列：`Measurement Points`（S1,S2,S3,S4）+ `Point Labels`（S1=操作侧;S2=非操作侧;...） |
| 物理单位 | 新增 `Measurement Unit`（kN / 吨力 / με）；现有 `Unit` 是测量单元，不改作物理单位 |
| 照片要求 | `Photo Required` 对所有任务生效，默认 N；每任务最多 3 张 |
| 限值 | 沿用现有 `Logic` + `LL Limited` + `HH Limited`；LL/HH 允许空，空 = 待判定 |
| 多点限值判定 | 每个测点分别与 LL/HH 对比；任一点超限即不合格；Total 只展示 |
| 超限处理 | 保留数值，标记不合格；强制填写异常措施（note）后才能结束 |
| 状态扩展 | 本版不落 `exceptionStatus`；用 `inspectionResult` + `note` 表达异常 |
| 汇总方式 | με 平均；kN/吨力求和 |
| 配置快照 | 工单开始时的任务 JSON 即快照；结束校验不读最新任务清单 |
| 旧工单判定 | 任务 JSON 没有 `Measurement Points` 的视为旧工单，跳过测量校验；有该字段才按新规则校验 |
| 未完成任务 | 照片/测量要求只针对 `taskStatus = true` 的任务；未勾选任务走「原因 + 后续措施」流程 |
| 阶段 1 测量范围 | 只校验 `PdM? = 是` 的任务 `valueAndNote` 非空，不做数字校验；数字与多点校验随阶段 3 |
| 附件存储 | 任务 JSON 内只存 fileId/名称/状态/时间，不存 base64 |
| 状态字段 | `taskStatus` 为唯一完成字段；`Task Status` 仅旧数据兼容；冲突显示「待核实」 |
| 实施顺序 | 1) EDS 保存校验/状态/照片；2) Tasklist-MoC 配置维护；3) EDS 多点执行试点 |

## 3. 数据模型

### 3.1 标准任务清单（Tasklist_history 的 Tasklist JSON）

每个保养任务增加/沿用以下平铺字段：

```json
{
  "Task No": "FCS-43",
  "Task Description": "使用哥林柱拉力检测仪测量四根锁模哥林柱拉力数值，并记录",
  "PdM?": "是/ Yes",

  "Unit": "哥林柱",
  "Component": "锁模机构",
  "Logic": "HighAlarm_Max",
  "TagName": "哥林柱拉伸变形量",
  "LL Limited": "",
  "HH Limited": "",

  "Measurement Points": "S1,S2,S3,S4",
  "Point Labels": "S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧",
  "Measurement Unit": "kN",
  "Photo Required": "Y"
}
```

规则：

- `PdM? = 否`：`Measurement Points / Point Labels / Measurement Unit` 留空；`Photo Required` 仍为 Y/N。
- `Point Labels` 必须覆盖 `Measurement Points` 全部代码；重复、漏写、格式错误 = 配置错误。
- `LL/HH` 可空；空 = 待判定。
- 配置字段随任务清单审批生效；工单开始时复制进工单任务 JSON。

### 3.2 工单任务明细（EDS `任务明细` JSON）

```json
{
  "Task No": "FCS-43",
  "PdM?": "是/ Yes",
  "Measurement Points": "S1,S2,S3,S4",
  "Point Labels": "S1=操作侧;S2=非操作侧;S3=天侧;S4=地侧",
  "Measurement Unit": "kN",
  "Photo Required": "Y",
  "Logic": "HighAlarm_Max",
  "LL Limited": "",
  "HH Limited": "",

  "taskStatus": true,
  "measurements": [
    { "point": "S1", "value": 125, "unit": "kN" },
    { "point": "S2", "value": 126, "unit": "kN" },
    { "point": "S3", "value": 124, "unit": "kN" },
    { "point": "S4", "value": 127, "unit": "kN" }
  ],
  "measurementTotal": 502,
  "note": "S1 操作侧，读数稳定",
  "photos": [
    { "fileId": "1abc...", "name": "PM-001_FCS-43_1.jpg", "status": "success", "uploadedAt": "2026-11-16 10:00:00" }
  ],
  "inspectionResult": "合格"
}
```

说明：

- 配置字段来自工单开始时的任务清单副本，是唯一可信来源。
- `measurements` 仅存测点代码、数值、单位；不存合计。
- `photos` 只存元数据；base64 只在内存中短暂存在。
- `note` 为独立备注；旧 `valueAndNote` 继续兼容读取，但 PdM 任务不再用它存测量值。
- 旧工单没有 `measurements` / 配置字段：按旧逻辑，不做测量校验。

## 4. 维护端（Tasklist-MoC 保养任务清单编辑/新建页）

### 4.1 表格

- 保留「预测性?」单选。
- 新增「需要照片 / Photo Required」列，所有任务都有，默认「否」。
- 去掉原 `Unit / Component / Logic / TagName / LL Limited / HH Limited` 六个内联列。
- 新增「PdM 配置 / PdM Setup」列：
  - `预测性 = 否` → 显示 `—`，配置按钮不可点。
  - `预测性 = 是` → 显示摘要，例如 `S1-S4 · kN` +「配置」按钮。

### 4.2 PdM 配置弹窗（仅预测性 = 是）

字段分组：

1. 测量对象：`Unit`、`Component`、`TagName`
2. 判定规则：`Logic`、`LL Limited`、`HH Limited`（LL/HH 可空）
3. 测量要求：`Measurement Points`、`Point Labels`、`Measurement Unit`

校验：

- 必填：`Unit`、`Component`、`Logic`、`TagName`、`Measurement Points`、`Point Labels`、`Measurement Unit`。
- `Point Labels` 必须覆盖所有测点代码，重复/漏写/格式错 → 不允许保存。
- `Photo Required` 在表格列维护，不在弹窗内。

### 4.3 清单提交校验

- 所有 `PdM? = 是` 的行必须完成配置；缺配置时列出任务编号并阻止提交。
- `PdM? = 否` 的行：测量相关字段为空；`Photo Required` 照常。
- 历史数据缺配置：摘要显示「待补全」，提交前必须补。

## 5. 执行端（EQU-Digital-System PM_Task）

### 5.1 展示

- `PdM? = 否`：不显示测量输入；保留备注输入；按 `Photo Required` 要求照片。
- `PdM? = 是`：显示测量摘要 +「录入 / 测量」按钮；点开弹窗按 `Measurement Points` 生成数值框，每个显示 `Point Labels` 对应位置；备注独立；照片按 `Photo Required`。
- 数值框只收数字；允许 0；拒绝 `正常`、`284abc`、空值。
- 单位由 `Measurement Unit` 决定，现场不可改。
- Total 按单位自动计算：με 平均；kN/吨力求和。

### 5.2 结束保养（PmEnd）

1. 仅对 `taskStatus = true`（已勾选完成）的任务执行下列校验；未勾选任务走「原因 + 后续措施」流程，不要求照片或测量值。
2. 已勾选任务：
   - `Photo Required = Y` 且没有成功照片 → 拦截。
   - `PdM? = 是` 且任务 JSON 有 `Measurement Points`（新配置）：配置完整、所有测点有有效数值。
   - `PdM? = 是` 但任务 JSON 没有 `Measurement Points`（旧工单）：跳过测量校验，只做照片/状态校验。
3. 超限（Logic + LL/HH）：
   - LL/HH 空 → 待判定，不强制备注。
   - 超限 → 立即保留数值，标记不合格；`note` 为空则弹窗要求填写异常措施，填写后才允许结束。
4. 校验失败：列出「行号 / Task No / 缺失项」，不改变完成状态。
5. 校验通过：
   - 先上传照片，拿到 fileId 并写回任务 JSON。
   - 再调用 `dataSubmit(Status=End)`。
   - 照片或数据保存失败 → 保持未完成，允许重试；成功后才显示完成。

## 6. 后端校验（`saveData_tasklist`）

### 6.1 Status = End

逐任务校验（只对 `taskStatus = true` 的任务）：

1. `Photo Required = Y`：`photos` 至少一条 `status = success`。
2. `PdM? = 是` 且任务 JSON 有 `Measurement Points`（新配置）：
   - 配置字段完整；测点与位置一一对应。
   - `measurements` 覆盖全部测点；每个值必须是有限数字（允许 0）。
   - 单位与 `Measurement Unit` 一致。
   - 重新计算 `measurementTotal`，不信任前端传的合计。
   - 结果判定见 6.5。
3. `PdM? = 是` 但没有 `Measurement Points`（旧工单）：跳过测量校验，只做状态/照片校验。
4. 状态字段：
   - `taskStatus` 为准；缺失时兼容读取旧 `Task Status`。
   - 两者冲突 → `statusConflict = true`，报告显示「待核实」，原始值保留，不自动修改。
5. 有错误：返回结构化结果，**不写 End、不改 PmStatus Done**：

```json
{
  "ok": false,
  "code": "MEASUREMENT_VALIDATION",
  "errors": [
    { "row": 3, "taskNo": "FCS-43", "field": "S3", "message": "测点 S3 未填写" },
    { "row": 3, "taskNo": "FCS-43", "field": "Photo", "message": "缺少成功上传的照片" }
  ]
}
```

### 6.2 Status = Ongoing

- 草稿保存不拦截，允许不完整。
- 已上传成功的照片元数据保留；重复保存不得覆盖为「无图片」。

### 6.3 Status = Start

- 不校验；保存任务清单副本（含配置字段）和初始状态。

### 6.4 兼容

- 工单任务 JSON 无配置字段：按旧逻辑处理。
- 旧字段 `Task Status`、`valueAndNote` 继续可读。
- 新工单不读取最新任务清单做校验，只读工单自己的任务 JSON。

### 6.5 结果判定

- 无限值（`Logic` 或 `LL/HH` 缺失）→ `待判定`。
- 超限 → `不合格`；`note` 必须非空（异常措施）。
- 否则 → `合格`。
- **多点任务：每个测点分别与 LL/HH 对比；任一点超限 → 不合格。** Total 只展示，不参与判定。

## 7. 附件

- 照片存 Drive；任务 JSON 只存 `fileId / name / status / uploadedAt`。
- 每任务最多 3 张；按「工单 + Task No + 文件名」去重。
- 上传成功后才写入 `photos`；失败保留 `status = failed` 并允许重试。
- 重新保存时保留已有照片；未选择新照片不得写成「无图片」。
- 结束保养前先完成上传；照片要求未满足不能结束。

## 8. 状态字段

- `taskStatus`：执行完成（勾选框），唯一完成字段。
- `Task Status`：仅旧数据读取。
- `inspectionResult`：合格 / 不合格 / 待判定。
- 两完成字段冲突：`statusConflict = true`，报告显示「待核实」，原始值保留。
- 本版不落 `exceptionStatus` 字段；异常处理通过 `inspectionResult` + `note` 表达。

## 9. 报告与查询

- `PM_RecordQuery`：
  - 展示 S1~S4 测点值、Total、`inspectionResult`、备注、照片链接。
  - 两个完成字段冲突 → 「待核实」。
- `PM_Procduction_Confirm`：备注列显示测量摘要；超限显示不合格及异常措施。
- `PdMData` 归集：改为看 `PdM? = 是` 或 `measurements`，不再看任务编号是否含 `PDM`。
- 多点任务：**每个测点写一行**（TagName/测点代码），不额外新增物理单位列；只在结束成功后写，草稿不写。
- 「必须测量」与「纳入 PdM 趋势」：本版 `PdM? = 是` 同时表示两者；如后续需要分开，再加配置列。

## 10. 两仓库分工与实施阶段

### 阶段 1：EDS 安全修复（先做）

- `saveData_tasklist` 结束校验（缺失、无效数值、照片）。
- 状态字段统一与冲突标记。
- 照片先上传后保存、fileId 落库、重试/去重/保留。
- 不依赖新配置，现有工单也能受益。

### 阶段 2：Tasklist-MoC 配置维护

- 编辑页 PdM 配置弹窗 +「需要照片」列。
- 配置校验、提交校验。
- FCS-43 按界面维护，走审批生效。

### 阶段 3：EDS 多点执行试点

- PM 执行页按配置渲染多点输入、备注、照片、超限提示。
- FCS-43 试点；查询/报告展示测点、Total、结果、照片。

测试均在两个仓库本地运行 `node --test`，不改真实数据、不部署。

## 11. 测试计划

- FCS-43 缺少测点或单位时不能作为完整测量提交。
- 零值有效；`正常`、`284abc` 不能冒充数值。
- 绕过前端直接调 `saveData_tasklist`，后端仍能拦截。
- 超限数据保留并标记不合格；未配置限值 → 待判定。
- 超限且备注为空 → 结束被拦截；填写异常措施后可结束。
- 照片上传失败、重试、重复点击、重新打开后保存均不丢关联。
- 旧字段兼容读取；冲突显示「待核实」。
- 新测量字段经过保存、重新读取、报告生成后保持一致。

## 12. 非目标与边界

- 不拆分 FCS-43 为 4 条任务。
- 不新建独立配置表或附件表。
- 不修改现有任务编号体系。
- 不静默用最新标准替换旧工单要求。
- 不编造合格限值；无批准限值显示待判定。
- 本版「重新打开」指重新进入 `Ongoing` 草稿继续填写；已完成的保养工单重新打开不在本次范围。
- 本次不改真实 Google 数据、不部署。

## 13. 留给实现者的决定

- 测量录入用弹窗还是行内展开。
- 字段中文标签与列顺序。
- 错误提示的具体措辞。
- 校验纯函数的文件组织与测试拆分。
- 照片上传的进度/重试 UI 细节。
