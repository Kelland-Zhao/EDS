# Resource Gantt — Show Idle Workers on Y-Axis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all attendance personnel on the Gantt chart Y-axis, including those without tasks, so managers can identify idle workers at a glance.

**Architecture:** Backend-driven — `loadResourceGanttData` adds attendance-only people to groups with `hasTasks: false`. Frontend removes the `tasks.length > 0` filter, sorts (tasks first, idle last), adds "空闲 Idle" label, and provides a toggle to switch between "all" and "tasks only".

**Tech Stack:** Google Apps Script (Code.js), jQuery, Bootstrap 5.3.1

## Global Constraints

- Group assignment for idle workers must use `internalGroup` from the userID table (via `inferResourceGroup_`)
- Toggle defaults to "all personnel" (showing idle workers)
- Idle label color: `#fd7e14` (orange, matching existing CM task bar color)
- Sort within each group: has-tasks first, idle second

---

### Task 1: Backend — Add attendance-only people to groups

**Files:**
- Modify: `Code.js:12473-12497` (add `hasTasks: true` to existing person entries)

**Interfaces:**
- Produces: `person.hasTasks` boolean field on every person object

- [ ] **Step 1: Add `hasTasks: true` to existing task-based person entries**

In `Code.js`, line 12473-12480, add `hasTasks: true` to the person object created when a person is first added via a task:

```javascript
// Before (lines 12473-12480):
        if (!group.people[memberID]) {
          group.people[memberID] = {
            sapID: memberID,
            name: person.name || memberID,
            workshop: person.workshop || task.workshop || '',
            process: person.process || task.process || '',
            tasks: []
          };
        }

// After:
        if (!group.people[memberID]) {
          group.people[memberID] = {
            sapID: memberID,
            name: person.name || memberID,
            workshop: person.workshop || task.workshop || '',
            process: person.process || task.process || '',
            hasTasks: true,
            tasks: []
          };
        }
```

- [ ] **Step 2: Verify the edit is syntactically correct**

Check that the `Code.js` edit doesn't break syntax (no missing commas, braces balanced).

---

### Task 2: Backend — Insert attendance-only people loop

**Files:**
- Modify: `Code.js:12497` (after the task iteration block, before the groups serialization)

**Interfaces:**
- Consumes: `staffLookup`, `groupMap`, `days` from the existing function scope
- Consumes: `inferResourceGroup_()` function
- Produces: Additional entries in `groupMap[key].people` with `hasTasks: false`, `tasks: []`

- [ ] **Step 1: Insert the attendance-only loop**

After line 12497 (`});` closing the task iteration), add:

```javascript
    // ---- 补充考勤但无任务的人员（空闲标记） ----
    Object.keys(staffLookup).forEach(function (key) {
      const staff = staffLookup[key];
      // 无 internalGroup 的人不在项目管理范围内，跳过
      if (!staff.internalGroup) return;
      // 检查是否已在任何分组中（已有任务的人不重复添加）
      let alreadyExists = false;
      Object.keys(groupMap).forEach(function (gk) {
        if (groupMap[gk].people[key]) alreadyExists = true;
      });
      if (alreadyExists) return;

      const groupKey = inferResourceGroup_(staff, null);
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = { key: groupKey, name: groupKey, en: groupKey, people: {}, dailyCounts: {} };
        days.forEach(function (d) { groupMap[groupKey].dailyCounts[d] = 0; });
      }
      groupMap[groupKey].people[key] = {
        sapID: key,
        name: staff.name || key,
        workshop: staff.workshop || '',
        process: staff.process || '',
        hasTasks: false,
        tasks: []
      };
    });
```

- [ ] **Step 2: Verify syntax**

Ensure the inserted code block doesn't break surrounding syntax.

---

### Task 3: Frontend — Toggle button in toolbar

**Files:**
- Modify: `EDS_ResourceGantt.html:105-106` (add toggle after refresh button)

- [ ] **Step 1: Add toggle button HTML**

After line 105 (the refresh button), add:

```html
      <button class="btn btn-sm btn-outline-secondary" id="toggleIdleBtn" style="margin-left:auto;">
        <i class="bi bi-people-fill"></i> 全部人员<br><small>All Personnel</small>
      </button>
```

- [ ] **Step 2: Add toggle button CSS style for active state**

Add to the `<style>` block (after line 27, the `.group-tab.active` rule):

```css
    #toggleIdleBtn.active { background:#E60012; color:#fff; border-color:#E60012; }
```

---

### Task 4: Frontend — Toggle logic, sorting, idle label

**Files:**
- Modify: `EDS_ResourceGantt-js.html:5-6` (add toggle state variable)
- Modify: `EDS_ResourceGantt-js.html:12-13` (bind toggle click)
- Modify: `EDS_ResourceGantt-js.html:116` (remove/change filter, add sort)
- Modify: `EDS_ResourceGantt-js.html:133-138` (add idle label)

- [ ] **Step 1: Add toggle state variable**

After line 5 (`let activeGroupKey = '';`), add:

```javascript
let showAllPersonnel = true;
```

- [ ] **Step 2: Bind toggle button click**

After line 12 (`$('#startDate, #daysCount').on('change', loadResourceGantt);`), add:

```javascript
  $('#toggleIdleBtn').on('click', function () {
    showAllPersonnel = !showAllPersonnel;
    $(this).toggleClass('active', showAllPersonnel);
    $(this).html(showAllPersonnel
      ? '<i class="bi bi-people-fill"></i> 全部人员<br><small>All Personnel</small>'
      : '<i class="bi bi-person-check-fill"></i> 仅任务人员<br><small>With Tasks</small>');
    renderGantt();
  });
```

- [ ] **Step 3: Replace filter with sort + toggle filter**

Replace line 116:

```javascript
// Before:
  const people = Object.values(merged.people || {}).filter(function (p) { return (p.tasks || []).length > 0; });

// After:
  let people = Object.values(merged.people || {});
  if (!showAllPersonnel) {
    people = people.filter(function (p) { return (p.tasks || []).length > 0; });
  }
  // 排序：有任务在上，空闲在下
  people.sort(function (a, b) {
    const aHas = (a.tasks || []).length > 0 ? 1 : 0;
    const bHas = (b.tasks || []).length > 0 ? 1 : 0;
    return bHas - aHas;
  });
```

- [ ] **Step 4: Update empty-state message for mixed case**

Replace line 127-131 (the empty check):

```javascript
// Before:
  if (people.length === 0) {
    html += '</div><div class="empty-state">当前组暂无任务 / No tasks in this group</div>';
    $('#ganttRoot').html(html);
    return;
  }

// After:
  if (people.length === 0) {
    html += '</div><div class="empty-state">当前组暂无人员 / No personnel in this group</div>';
    $('#ganttRoot').html(html);
    return;
  }
```

- [ ] **Step 5: Add idle label to names**

In the `people.forEach` block, modify lines 134-137 to add an idle label for people without tasks:

```javascript
// Before (lines 134-137):
    const groupLabel = person.groupName ? '<small style="color:#E60012;">' + escapeHtml(person.groupName) + '</small>' : '';
    html += '<div class="gantt-name">' + escapeHtml(person.name || person.sapID || '--')
      + groupLabel
      + '<small>' + escapeHtml([person.workshop, person.process].filter(Boolean).join(' / ')) + '</small></div>';

// After:
    const groupLabel = person.groupName ? '<small style="color:#E60012;">' + escapeHtml(person.groupName) + '</small>' : '';
    const idleLabel = !person.hasTasks && (person.tasks || []).length === 0
      ? ' <span style="color:#fd7e14;font-size:11px;">空闲 <small>Idle</small></span>' : '';
    html += '<div class="gantt-name">' + escapeHtml(person.name || person.sapID || '--')
      + idleLabel
      + groupLabel
      + '<small>' + escapeHtml([person.workshop, person.process].filter(Boolean).join(' / ')) + '</small></div>';
```

---

### Task 5: Verification

- [ ] **Step 1: Push to GAS and test**

```bash
# Use push-to-gas skill to deploy
```

- [ ] **Step 2: Verify behavior**
  - Open the Resource Gantt page
  - Confirm idle workers appear with "空闲 Idle" label in orange
  - Confirm idle workers are sorted below workers with tasks
  - Click toggle button → confirm it switches to "仅任务人员" and hides idle workers
  - Click toggle again → confirm it switches back to "全部人员" and shows idle workers
  - Switch between group tabs → confirm toggle works consistently across groups
