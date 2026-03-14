# Customer Orders Status Tabs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为顾客订单列表补齐四状态切换能力，并保证现有详情跳转、备注高亮、空状态不回退。

**Architecture:** 保持订单仓储和订单详情页不变，只在 `customer-orders-scene` 内新增状态归桶、当前筛选状态和派生列表。使用 TDesign `tag` 作为选择态筛选 UI，避免引入 `t-tabs` 的额外依赖链。

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program, TypeScript strict mode, `tsx` + `node:test`.

---

## Chunk 1: Tests First

### Task 1: 补充订单列表状态选择区的结构化测试

**Files:**
- Modify: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: 为四个状态标签、状态映射和切换处理补测试**

```ts
test('customer orders scene exposes four status filter tags', () => {
  assert.match(wxml, /待确认/)
  assert.match(wxml, /待制作/)
  assert.match(wxml, /待取货/)
  assert.match(wxml, /已完成/)
})
```

```ts
test('customer orders scene tracks the active tab and derives visible orders', () => {
  assert.match(source, /activeTab/)
  assert.match(source, /visibleOrders/)
  assert.match(source, /handleTabChange/)
})
```

- [ ] **Step 2: 运行聚焦测试并确认先失败**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: FAIL，因为当前订单组件还没有兼容当前基线的状态筛选实现。

## Chunk 2: Minimal Implementation

### Task 2: 在订单场景中实现 TDesign tag 选择态筛选

**Files:**
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.ts`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxml`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxss`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.json`

- [ ] **Step 1: 新增 tab 类型、状态映射和派生列表**

```ts
type CustomerOrderTabKey = 'pending-confirmation' | 'in-production' | 'ready-for-pickup' | 'completed'

function resolveOrderTabKey(status: OrderStatus): CustomerOrderTabKey {
  // 状态展示层归桶
}
```

- [ ] **Step 2: 接入 `t-tag` 选择态并绑定切换事件**

```xml
<view wx:for="{{orderTabs}}" wx:key="value" data-tab-key="{{item.value}}" bindtap="handleTabChange">
  <t-tag theme="{{activeTab === item.value ? 'primary' : 'default'}}" variant="light">
    {{item.label}}
  </t-tag>
</view>
```

- [ ] **Step 3: 将列表渲染切换到 `visibleOrders`**

```xml
<view class="customer-orders-scene__empty" wx:if="{{visibleOrders.length === 0}}">
```

- [ ] **Step 4: 重新运行聚焦测试**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: PASS.

## Chunk 3: Regression Verification

### Task 3: 跑回归验证

**Files:**
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: 运行订单管理聚焦测试**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS.

- [ ] **Step 2: 运行全量测试**

Run:

```bash
npm --prefix App run test
```

Expected: PASS.

- [ ] **Step 3: 运行 TypeScript 类型检查**

Run:

```bash
npm exec -- tsc --noEmit -p tsconfig.json
```

Working directory: `App`

Expected: PASS.

- [ ] **Step 4: 在微信开发者工具 `2.01.2510280` 补测**

操作步骤：

```text
1. 打开顾客端订单页，确认默认选中“待确认”。
2. 分别点击“待制作”“待取货”“已完成”状态标签。
3. 检查每个 tab 下是否只显示对应状态订单。
4. 准备一笔已取消订单，确认它仍能在“待确认”中看到，且标签显示“已取消”。
5. 点击任一订单卡片，确认仍可进入订单详情页。
```

预期效果：

```text
- 四个状态标签可见且可切换。
- 切换后列表立即按状态过滤。
- 空 tab 显示空状态而不是旧列表。
- 已取消订单不会消失，只是在“待确认”中保留“已取消”标签。
- 订单详情跳转能力不回退。
```
