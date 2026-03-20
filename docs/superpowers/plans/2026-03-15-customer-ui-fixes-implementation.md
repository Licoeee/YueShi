# Customer UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的顾客端 UI 修复稿一比一还原到微信小程序，修复购物车、提交订单、备注页、我的页、设置页的布局、按钮边界与无效时间交互。

**Architecture:** 保持现有顾客端本地闭环与三端隔离不变，只在现有页面/组件上做最小范围结构和样式调整。购物车底栏、提交订单联系区与无效时间状态通过现有页面状态驱动；按钮视觉统一通过 `t-class` 注入 TDesign 变量，不直接改内部类选择器。

**Tech Stack:** 微信小程序 WXML/WXSS/TypeScript、TDesign Miniprogram、Node `tsx --test`

---

## Chunk 1: 测试先红

### Task 1: 补齐购物车与结算页的结构断言

**Files:**
- Modify: `App/tests/customer-cart-scene.test.ts`
- Modify: `App/tests/customer-checkout-page.test.ts`

- [ ] **Step 1: 写失败测试，锁定购物车底栏和提交订单无效态结构**

补充断言：
- 购物车底栏存在固定的切换按钮、金额行、结算按钮专属类
- “取消”文案替代“取消全选”
- 结算页存在历史手机号独立入口容器
- 结算页存在无效时间提示字段与提交按钮禁用绑定

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd App
npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-checkout-page.test.ts
```

Expected:
- 至少 1 个新增断言失败，提示缺少新结构或旧文案仍存在

### Task 2: 补齐备注页、我的页、设置页结构断言

**Files:**
- Modify: `App/tests/customer-order-detail-page.test.ts`
- Modify: `App/tests/customer-profile-scene.test.ts`
- Modify: `App/tests/customer-settings-page.test.ts`

- [ ] **Step 3: 写失败测试，锁定按钮 `t-class` 与账号展示结构**

补充断言：
- 备注页按钮带有专用 `t-class`
- 我的页操作按钮带有专用 `t-class`
- 设置页“当前账号”不再走 `note="{{session.nickname}}"`，改成独立信息块

- [ ] **Step 4: 运行测试确认失败**

Run:
```bash
cd App
npm run test:file -- tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-settings-page.test.ts
```

Expected:
- 至少 1 个新增断言失败

## Chunk 2: 结构与状态实现

### Task 3: 实现购物车卡片与底栏稳定布局

**Files:**
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`

- [ ] **Step 5: 重排购物车底栏结构**

实现目标：
- 底栏拆成左侧主区 + 右侧固定 CTA
- 左侧主区拆成固定宽度“全选/取消”按钮 + 金额文案区
- `合计` 与价格同一行
- 金额区可收缩，按钮宽度固定

- [ ] **Step 6: 收敛购物车卡片尺寸和滑动删除视觉**

实现目标：
- 缩小图片与卡片 padding
- 增强选中胶囊、全选按钮、去结算按钮边界
- 删除轨道与卡片滑动态更自然

- [ ] **Step 7: 运行购物车相关测试**

Run:
```bash
cd App
npm run test:file -- tests/customer-cart-scene.test.ts
```

Expected:
- `customer-cart-scene.test.ts` PASS

### Task 4: 实现提交订单页的历史手机号入口与无效时间禁用态

**Files:**
- Modify: `App/miniprogram/pages/customer/checkout/checkout.wxml`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.wxss`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Modify: `App/miniprogram/utils/customer-pickup-slot.ts`

- [ ] **Step 8: 将历史手机号入口从输入同行挪到独立辅助区域**

实现目标：
- 输入框完整显示手机号
- 历史手机号使用独立入口，不与输入框抢宽
- 保持已有 action-sheet 选择链路

- [ ] **Step 9: 增加过去月份提示与提交按钮禁用态**

实现目标：
- 选中过去月份/过去时间时给出明确文案
- `提交订单` 在无效取货时间时禁用
- 有效时间恢复可点击

- [ ] **Step 10: 运行结算页与取货时间测试**

Run:
```bash
cd App
npm run test:file -- tests/customer-checkout-page.test.ts tests/customer-pickup-slot.test.ts
```

Expected:
- 两个测试文件 PASS

### Task 5: 实现备注页、我的页、设置页样式修复

**Files:**
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxss`
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxss`
- Modify: `App/miniprogram/pages/customer/settings/settings.wxml`
- Modify: `App/miniprogram/pages/customer/settings/settings.wxss`

- [ ] **Step 11: 给备注页按钮补齐专用 `t-class` 与暖粉橙变量**

- [ ] **Step 12: 给我的页按钮补齐专用 `t-class` 与边界层**

- [ ] **Step 13: 将设置页当前账号改为独立信息块，完整显示账号内容**

- [ ] **Step 14: 运行详情/我的/设置页测试**

Run:
```bash
cd App
npm run test:file -- tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-settings-page.test.ts
```

Expected:
- 三个测试文件 PASS

## Chunk 3: 汇总验证

### Task 6: 全量回归本轮影响面

**Files:**
- Verify only

- [ ] **Step 15: 运行本轮全部受影响测试**

Run:
```bash
cd App
npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-checkout-page.test.ts tests/customer-pickup-slot.test.ts tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-settings-page.test.ts
```

Expected:
- 全部 PASS

- [ ] **Step 16: 检查 worktree 变更范围**

Run:
```bash
git -C .worktrees/dev-20260315 status -sb
```

Expected:
- 仅包含本轮计划中的测试、页面和样式文件

- [ ] **Step 17: 如有需要，在微信开发者工具 `2.01.2510280` 做人工补测**

人工重点：
- 购物车底栏长金额不重叠
- 左滑删除可触发，右滑可收起
- 历史手机号入口不再压缩输入框
- 过去月份提示出现时提交按钮禁用
- 备注页、我的页、设置页按钮边界清晰

Plan complete and saved to `docs/superpowers/plans/2026-03-15-customer-ui-fixes-implementation.md`. Ready to execute.
