# NPI 机型模板固化改造 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工艺参数页改为表驱动动态渲染：按任务机型（中间层）从 NPI_Templates / NPI_MachineMap 组装模板，替代 196 字段硬编码，记录存储改键值快照并向后兼容旧数组记录。

**Architecture:** 后端新增一个模板数据接口（读两张表 + CacheService 6h）；前端工艺参数页替换渲染器（卡组合 → 区块 → 字段，分段一行多输入）；存储字段键值对象 + templateRef，旧 196 数组读取时转换。机台清单带中间层，任务 machineModel 存中间层。

**Tech Stack:** Google Apps Script, Bootstrap 5.3.1, jQuery, SweetAlert2（无新依赖）

**Spec:** `Docs/superpowers/specs/2026-07-24-npi-test-management-design.md`（「机型模板固化改造」章节）

## Global Constraints

- 前端表头/标签双语：`中文<br><small>English</small>`；Navbar 用 `中文 / English`
- 数据 key 纯英文（字段key、JSON 键、缓存 key）
- 后端返回统一 `JSON.stringify({success, data|message})`，Route.path 注册
- 缓存一律 CacheService.getScriptCache()，上限 6h（21600 秒）
- 模板表只读「状态=已确认」行；NPI_MachineMap 只读「状态=已确认」行
- 测试模式：node vm 从真实源文件提取函数（balanced-brace parsing），夹具用真实数据；GAS 集成行为用 dev 部署人工验证
- commit 格式 `VYYYY-MM-DD.XX_中文描述`（push-to-github skill）

---

### Task 1: 后端模板数据接口 + 热流道行修正

**Files:**
- Modify: `Code.js`（追加函数 + Route 注册）
- Data: EDS_NPI_Data `NPI_Templates`（热流道行拆成 位置+温度 两行，python 脚本改）

**Interfaces:**
- Produces: `loadNPITemplateData()` → JSON 字符串 `{success, data: {cards, machineMap}}`
  - `cards`: `{ "<卡名>": [{sec, secEn, cn, en, key, type, unit, lo, hi, dept, preset, segs: string[], note}] }`（行序=渲染序）
  - `machineMap`: `{ byRaw: {"HT160": "HIM", ...}, byDisplay: {"6AX": [{card:"HIM",count:1,order:1},{card:"VIM",count:3,order:2},{card:"6AX自动化",count:1,order:3}], ...} }`

- [ ] **Step 1: 修正 NPI_Templates 热流道行**（数据准备，python 脚本）
  当前 FCS/ENG 卡热流道为 1 行（key=hotRunner, 分段=group1-12）；旧表单实际是每点位「位置 select + 温度 number」24 个输入（key `hotRunner_pos_N` / `hotRunner_temp_N`）。改为 2 行，保持旧 key 兼容：

  | 字段名 CN | EN | key | type | 单位 | 分段 |
  |---|---|---|---|---|---|
  | 热流道位置 | Hot Runner Position | hotRunner_pos | select | | 1,2,...,12 |
  | 热流道温度 | Hot Runner Temp | hotRunner_temp | number | ℃ | 1,2,...,12 |

  用 python + service account 更新这两行（找到 FCS/ENG 卡 区块=热流道 的行，删除重写）。

- [ ] **Step 2: 写失败测试**（node vm 提取 `loadNPITemplateData`，stub SpreadsheetApp）
  `/tmp/npi-template-test.js`：从 Code.js 提取函数，注入 fake `SpreadsheetApp.openById().getSheetByName()` 返回夹具行（含已确认/暂缓混合、多卡、分段逗号串）；断言：
  - 暂缓行被过滤；卡片行序保持
  - `segs` 为数组（"1,2" → ["1","2"]）
  - machineMap 组装正确：6AX 展开为 3 张 VIM；byRaw 映射 13 个原始机型
  运行：`node /tmp/npi-template-test.js`，预期 FAIL（函数未定义）。

- [ ] **Step 3: 实现 `loadNPITemplateData`**（Code.js 追加，样式沿用现有函数）

```javascript
// NPI 模板表驱动：读 NPI_Templates（已确认行）+ NPI_MachineMap（已确认行），6h 缓存
function loadNPITemplateData() {
  try {
    var cache = CacheService.getScriptCache();
    var CKEY = 'NPI_TEMPLATE_CACHE_v1';
    var cached = cache.get(CKEY);
    if (cached) return cached;
    var ss = SpreadsheetApp.openById(NPI_SS_ID);
    var tplWs = ss.getSheetByName('NPI_Templates');
    var mapWs = ss.getSheetByName('NPI_MachineMap');
    if (!tplWs || !mapWs) return JSON.stringify({ success: false, message: 'Template sheets missing' });
    // 模板行：A卡 B工序 C区块 D区块EN E字段CN F字段EN G字段key H类型 I单位 J下限 K上限 L检查部门 M预设值 N分段 O状态 P备注
    var cards = {};
    var tplData = tplWs.getDataRange().getValues();
    for (var i = 1; i < tplData.length; i++) {
      var r = tplData[i];
      var card = String(r[0] || '').trim();
      var status = String(r[14] || '').trim();
      if (!card || status !== '已确认') continue;
      if (!cards[card]) cards[card] = [];
      cards[card].push({
        sec: String(r[2] || '').trim(), secEn: String(r[3] || '').trim(),
        cn: String(r[4] || '').trim(), en: String(r[5] || '').trim(),
        key: String(r[6] || '').trim(), type: String(r[7] || '').trim(),
        unit: String(r[8] || '').trim(), lo: String(r[9] || '').trim(), hi: String(r[10] || '').trim(),
        dept: String(r[11] || '').trim(), preset: String(r[12] || '').trim(),
        segs: String(r[13] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      });
    }
    // 机型映射：A原始机型 B中间层 C工序 D卡 E卡数 F排序 G状态 H备注
    var byRaw = {}, byDisplay = {};
    var mapData = mapWs.getDataRange().getValues();
    for (var m = 1; m < mapData.length; m++) {
      var rr = mapData[m];
      var st2 = String(rr[6] || '').trim();
      if (st2 !== '已确认') continue;
      var raw = String(rr[0] || '').trim(), disp = String(rr[1] || '').trim();
      var card2 = String(rr[3] || '').trim(), count = parseInt(rr[4] || '1', 10), order = parseInt(rr[5] || '1', 10);
      if (!raw || !disp || !card2) continue;
      byRaw[raw] = disp;
      if (!byDisplay[disp]) byDisplay[disp] = [];
      byDisplay[disp].push({ card: card2, count: count, order: order });
    }
    var out = JSON.stringify({ success: true, data: { cards: cards, machineMap: { byRaw: byRaw, byDisplay: byDisplay } } });
    cache.put(CKEY, out, 21600);
    return out;
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
```

- [ ] **Step 4: 跑测试转绿** → `node /tmp/npi-template-test.js` PASS
- [ ] **Step 5: Route 注册**（doGet/路由区，照现有惯例）`Route.path('loadNPITemplateData', ...)`
- [ ] **Step 6: Commit**（连同 Task 1 的 sheet 修正不提交——sheet 不在 git；只 commit Code.js）

---

### Task 2: 机台清单带中间层 + 任务存储中间层 + 旧任务迁移

**Files:**
- Modify: `Code.js`（loadNPIWorkcenterList 追加 displayModel）
- Modify: `NPI_TaskModal-js.html`（机台选中带中间层、编辑回填映射）
- Data: `NPI_TestTasks` machineModel 列迁移（python 一次性脚本）

**Interfaces:**
- Consumes: `loadNPITemplateData` 的 machineMap.byRaw（Task 1）
- Produces: `loadNPIWorkcenterList` 每台机返回 `{id, text, model(原始), displayModel(中间层), raw}`

- [ ] **Step 1: 写失败测试**（node vm 提取 loadNPIWorkcenterList 中新增的映射逻辑——把映射抽为独立纯函数 `mapRawModelToDisplay_(rawModel, byRaw)`，夹具含 HT160→HIM、未知值回退原值）
- [ ] **Step 2: 实现**：`mapRawModelToDisplay_` + loadNPIWorkcenterList 每行追加 `displayModel`（byRaw 查不到则 = 原始值）。注意 loadNPIWorkcenterList 当前返回 JSON 结构，保持字段追加不影响旧调用方。
- [ ] **Step 3: NPI_TaskModal-js.html 改动**：
  - 机台 option：`data-model` 改为中间层值（displayModel），原始值放 `data-raw`
  - `#newMachineNo change`：`$('#newMachineModel').val(opt.data('model'))` 不变（data-model 已是中间层）
  - 编辑回填（openEditModal）：任务存的 machineModel 已是中间层直接填；若值是旧原始值（13 个旧值之一），用页面缓存的 machineMap.byRaw 转中间层再填
  - 页面初始化时拉取一次 `loadNPITemplateData()` 缓存 machineMap（Task 3 也要用，可共用）
- [ ] **Step 4: 旧任务迁移（python 一次性）**：读 NPI_TestTasks 全表，machineModel 列按映射替换：ENG/FCS→FCS/ENG、HT160/HT250/HT250 W→HIM、H Auto/H Auto S→H Auto、6AX→6AX、3AX→3AX、FT400→VIM、DB→OMNI-DB、DP→DP、HS→HS；已是中间层值的跳过。**列号先在 createNPITestTask 中确认**（23 列 appendRow 中 machineModel 的位置）。执行后抽样验证。
- [ ] **Step 5: 测试转绿 + Commit**

---

### Task 3: 工艺参数页动态渲染（核心）

**Files:**
- Modify: `NPI_ProcessRecord-js.html`（渲染器重写，删除硬编码模板）
- Modify: `NPI_ProcessRecord.html`（若表单容器有硬编码结构则同步）

**Interfaces:**
- Consumes: `loadNPITemplateData()`（Task 1）；任务对象 `{processType, machineModel}`（中间层）
- Produces: `renderTemplate(cardList)`、`collectRecordFields()` → 键值对象、`fillRecordFields(obj)`、`convertOldFieldsToObject(arr)`、`buildPositionMap(cardRows)`

**渲染规则（全 Task 依据）：**
- 卡组合：`byDisplay[中间层]`，按 order 排序；count>1 的卡展开 count 个实例，实例名 `{card}#{i}`（i=1..count），每实例渲染开关（复用 barrel-toggle 样式），默认实例 1 开、其余关（用户开几张填几张）
- 组合内仅 1 张卡（count=1）：不渲染卡级开关
- 存储 key 规则：组合卡数 >1 → `{orderIdx}_{字段key}`（orderIdx=该卡在组合展开序列中的序号 1-based）；单卡 → 字段key 原样
  - 分段行：`{baseKey}_{seg}`（FC 的 baseKey 如 `barrel_barrelA_35`，seg `1段` → `barrel_barrelA_35_1段` 与旧 fieldKeyMap 一致）
- 字段渲染：`segs` 非空 → 一行多输入（placeholder=seg）；type=number → `input type=number step=any min=0`；type=select → 暂按文本输入渲染（选项待定义，备注）；字段名=备注 → textarea rows=3；工艺卡编号 → readonly
- 热流道（FC 卡）：按 sheet 两行渲染成旧式表格（位置 select 用 HOT_RUNNER_POSITIONS + 温度 number），保留「增加/减少点位」按钮（新增点位 key `hotRunner_temp_{n}` 自然落入对象存储）
- 默认禁用区块（保持旧 UX）：`DEFAULT_DISABLED_SECTIONS = {'FCS/ENG': ['炮筒B','炮筒C','炮筒D']}`——该卡渲染时对应区块加 barrel-toggle，默认关；HOT_RUNNER_POSITIONS 常量保留
- 卡片内区块顺序=行序首现；区块折叠用 Bootstrap accordion（沿用现有结构）

- [ ] **Step 1: 写失败测试**（node vm，纯函数部分）
  - `composeCardList(byDisplay, display)` → 6AX → `[{card:'HIM',idx:1},{card:'VIM',idx:2},{card:'VIM',idx:3},{card:'VIM',idx:4},{card:'6AX自动化',idx:5}]`；单卡 → 无 idx
  - `fieldKeyFor(composed, row, seg)` → 6AX 下 `2_vim_info_cycle`；单卡下 `him_info_cycle`；FC 分段 `barrel_barrelA_35_1段`
  - `buildPositionMap(fcRows)`：走行序+分段展开给 pos（产品信息 8 个 → 炮筒A 39 输入 → … → 热流道 24 输入（位置+温度各 12）→ 合模 15 → 开模 16 → 顶出 17 → 备注 1）；断言几个锚点 key 的 pos（`productInfo_9`=0、`barrel_barrelA_35_1段`=8、`hotRunner_temp_1`=8+39*3+28、`remarks_122`=最后一个）
- [ ] **Step 2: 跑测试确认 FAIL**
- [ ] **Step 3: 实现渲染器**（NPI_ProcessRecord-js.html 内替换 TEMPLATE_SECTIONS 相关代码）
  - 删：`TEMPLATE_SECTIONS`、`buildFieldIndex`、`renderAccordion`、`renderSectionBody`、`renderFieldRow`、`renderAuxEquip`、`renderHotRunner`（重写为表驱动版）、`rebuildFieldIndex`、`addSegment/removeSegment`（分段静态化，不再动态增减——分段增减改为改表）
  - 增：`composeCardList`、`fieldKeyFor`、`renderTemplate`、`renderTemplateSection`、`renderTemplateRow`、`renderHotRunnerTable(card)`、`setSectionEnabled`
  - `selectTask` 流程改：拉取模板数据（页面级缓存一次）→ 按 `(currentTask.processType || 'IM', currentTask.machineModel)` 组合 → `renderTemplate`；machineModel 为空（旧任务无机型）→ 提示并回退 FC 卡渲染
- [ ] **Step 4: 辅助功能适配**：`fillTestData` 按 `data-unit`/key 推断（温度→200 等，沿用现有推断表）；`clearFormFields`、`setFormReadonly` 保持通用
- [ ] **Step 5: 测试转绿 + Commit**

---

### Task 4: 键值存储 + 旧记录兼容 + 历史

**Files:**
- Modify: `NPI_ProcessRecord-js.html`（collectRecordFields/fillRecordFields/convertOldFieldsToObject）
- Modify: `Code.js`（saveNPIProcessRecord 写 templateRef 第 10 列；loadNPIProcessRecordData/History 返回 templateRef）

**Interfaces:**
- Produces: `collectRecordFields()` → `{fields: {"key": "val", ...}, templateRef: {display, processType, cards: [{card, count}]}}`
- Consumes: `buildPositionMap`（Task 3）

- [ ] **Step 1: 写失败测试**（node vm）
  - `collectRecordFields` 无法直接测（DOM）；测 `convertOldFieldsToObject(arr, fcRows, positionMap)`：
    - 合成 196 数组（pos 0='TEST', pos 8='200'）→ 对象 `{productInfo_9:'TEST', barrel_barrelA_35_1段:'200'}`
    - 数组尾部「旧设备遗留位」（clampingEject 结束～remarks 之间的 pos）→ `aux_legacy_{n}` 键保留值
    - 对象输入原样返回
  - `fieldsForSave(fieldsObj, templateRef)` → 组装 recordData
- [ ] **Step 2: 实现**
  - `collectRecordFields`：遍历 `.npi-field`（data-key 已在渲染时定好，含实例前缀与分段后缀），跳过禁用区块/禁用卡实例内输入，组装对象
  - `fillRecordFields(fields)`：`Array.isArray(fields)` → 先 `convertOldFieldsToObject`；再按 `[data-key]` 回填（含热流道位置 select 与颜色联动）
  - `convertOldFieldsToObject(arr)`：用 FC 卡行（页面已缓存模板数据）buildPositionMap；`aux_legacy` 区段 = pos 在顶出结束与备注 key 之间且无映射的
  - saveRecord：传 `{recordID, testTaskID, fields: obj, templateRef, operatorSAPID}`
  - Code.js saveNPIProcessRecord：字段 JSON 照写第 5 列；第 10 列写 `JSON.stringify(templateRef)`（列号=10，即 J；先确认该列无历史用途）；load 两个函数返回 `templateRef`
- [ ] **Step 3: 测试转绿 + Commit**

---

### Task 5: 回归验证（dev 部署 + 人工清单）

**Files:** 无代码（发现问题则小修）

- [ ] **Step 1: clasp push + dev 验证**（dev 始终指向最新代码）
- [ ] **Step 2: 人工清单**（记录验证结果到 ledger）
  1. 工艺参数页新建 FC 任务 → 表单与旧版一致（含炮筒B/C/D 开关、热流道 12 点位位置选择+温度）
  2. 保存/加载/编辑 FC 记录 → 数据往返一致；**加载一条旧 FC 记录** → 字段正确显示（重点：热流道与配套设备区段，如与实际有偏差按 aux_legacy 呈现并在 ledger 记录）
  3. HIM/VIM/OMNI-DB/DP/HS 任务 → 对应模板渲染、保存加载正常
  4. 6AX 任务 → HIM 卡 + 3 张 VIM 卡开关 + 自动化卡；只开 VIM#2 → 保存后仅该实例有值
  5. H Auto / 3AX 任务 → 组合渲染正常
  6. 任务弹窗：选 HT160 → 机型显示 HIM；编辑旧任务机型显示中间层
  7. 测试计划页/任务安排四页面 → 机型显示中间层、无报错
  8. 转正按钮 smoke（不实际提交，确认组装不报错）
- [ ] **Step 3: 问题修复循环**（如 2 的旧记录映射偏差）→ 修 → 重验

---

### Task 6: 生产部署 + 文档 + 提交

- [ ] **Step 1: 生产部署**（**必须等用户确认后再 redeploy**，deploy-gas skill）
- [ ] **Step 2: 设计文档核对**（spec「机型模板固化改造」章节与实现一致；有偏差更新 spec）
- [ ] **Step 3: Commit + push GitHub**（push-to-github skill，V 格式中文描述）

---

## 风险与已知限制

1. **旧记录 auxEquip 位置不稳定**：旧表单配套设备按用户启用顺序动态定位，无法精确重建 → 转成 `aux_legacy_{n}` 键保留值，显示在配套设备区底部（Task 4 Step 1 断言）；新记录用稳定 key（`auxEquip_moldTemp_setTemp` 等）
   - 同源问题：热流道点位若在旧表单动态增减过（非默认 12），其后的静态区段位置也会偏移 → 按同样 legacy 处理；默认 12 点位（未增减）可精确重建。Task 5 验证时用真实旧记录抽样确认，绝大多数记录应落在可精确重建路径
2. **转正 PPMS**：fields 从数组变对象，PPMS 侧解析需适配——用户维护 PPMS 侧，本计划不处理；转正入口组装不变
3. **select 类型字段暂无选项数据**：按文本输入渲染（冷却方式等），选项化后续补表
4. **分段不再动态增减**：改表即改分段（NPI_Templates 编辑分段列）
5. **机器缓存**：模板/映射修改后最长 6h 生效；调试期可临时清缓存（接口预留 cache key 常量）
