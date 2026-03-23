# 第四阶段商家端管理（4.1~4.4）Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有顾客/管理员链路的前提下，完成商家端订单流水线、商品管理与回收站、散货静态账本、客户黑名单风控，并把黑名单门禁接入顾客提交订单路径。

**Architecture:** 保持现有“页面壳 + role-page-scene 场景组件”架构不变；为商家端新增独立 scene 组件承载业务 UI。数据层以本地存储仓储工具为中心（merchant-order、merchant-product、merchant-account-book、merchant-blacklist），并在顾客下单仓储中注入黑名单校验，做到最小侵入与可测。

**Tech Stack:** 微信小程序 TypeScript 严格模式、TDesign 组件（Calendar/Dialog/Input/Cell/Tag/Checkbox/Image/DateTimePicker 等）、本地 `wx.setStorageSync` 仓储、Node `tsx --test` 自动化测试。

---

## Chunk 1: 结构接入与商家订单流水线（4.1）

### Task 1: 场景路由从占位切换到商家业务组件

**Files:**
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.ts`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.wxml`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.json`
- Test: `App/tests/role-page-scene.test.ts`

- [ ] **Step 1: 先写/补充断言，要求商家三页不再走占位渲染，而是独立 scene 组件**
- [ ] **Step 2: 在 role-page-scene 中新增 merchant renderMode 分支与组件注册**
- [ ] **Step 3: 运行 scene 相关测试，确保顾客链路无回归**

### Task 2: 订单流水线数据工具（排序 + 按日筛选）

**Files:**
- Create: `App/miniprogram/utils/merchant-order-pipeline.ts`
- Test: `App/tests/merchant-order-pipeline.test.ts`

- [ ] **Step 1: 先写失败测试（按取货时间近到远排序、按日期过滤）**
- [ ] **Step 2: 实现纯函数工具：`buildMerchantOrderPipeline`、`filterMerchantOrdersByDate`**
- [ ] **Step 3: 运行新增测试并修正边界（无效日期/空列表）**

### Task 3: 商家订单 scene（Calendar 历史/未来筛选 + 备注高亮）

**Files:**
- Create: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Create: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Create: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Create: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json`
- Test: `App/tests/merchant-orders-scene.test.ts`

- [ ] **Step 1: 先写结构断言（Calendar、备注高亮类、取货时间展示）**
- [ ] **Step 2: 实现场景逻辑：读取订单快照、排序、筛选日期、清除筛选**
- [ ] **Step 3: 实现场景 UI：备注订单淡粉背景，筛选状态可见**
- [ ] **Step 4: 运行对应测试并回归现有订单测试**

---

## Chunk 2: 商品管理与批量（4.2）

### Task 4: 商品仓储与回收站能力

**Files:**
- Create: `App/types/merchant-product.d.ts`
- Create: `App/miniprogram/utils/merchant-product-storage.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 先写失败测试（新增、编辑、删除入回收站、7 天过期清理、恢复）**
- [ ] **Step 2: 实现仓储解析、初始化种子、回收站 TTL 清理函数**
- [ ] **Step 3: 运行测试，确认回收站与恢复行为稳定**

### Task 5: 商品批量编辑能力

**Files:**
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 补充失败测试（统一价格、规格多选批量覆盖）**
- [ ] **Step 2: 实现批量编辑函数（按选中 ID 应用价格/规格）**
- [ ] **Step 3: 运行测试覆盖空参数与部分匹配边界**

### Task 6: 商家商品管理 scene（新增/编辑/删除/批量/回收站）

**Files:**
- Create: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Create: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Create: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Create: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.json`
- Test: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 先写页面结构断言（新增、批量、回收站入口与弹层）**
- [ ] **Step 2: 接入仓储读写，完成新增/编辑/删除流程**
- [ ] **Step 3: 接入批量编辑弹层（统一价格 + 规格多选）并应用到选中商品**
- [ ] **Step 4: 接入回收站列表与恢复、过期提示**
- [ ] **Step 5: 运行测试，验证 UI 结构与关键方法绑定**

---

## Chunk 3: 散货账本 + 黑名单风控（4.3~4.4）

### Task 7: 散货账本仓储与临期计算

**Files:**
- Create: `App/types/merchant-account-book.d.ts`
- Create: `App/miniprogram/utils/merchant-account-book-storage.ts`
- Test: `App/tests/merchant-account-book-storage.test.ts`

- [ ] **Step 1: 先写失败测试（记录增改删、剩余天数、10 天临期识别）**
- [ ] **Step 2: 实现账本仓储、日期计算与临期列表导出**
- [ ] **Step 3: 运行测试，校验空值/过期/临界 10 天边界**

### Task 8: 商家账本 scene（照片、进价、保质期、订阅提醒触发）

**Files:**
- Create: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.ts`
- Create: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxml`
- Create: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss`
- Create: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.json`
- Test: `App/tests/merchant-account-book-scene.test.ts`

- [ ] **Step 1: 先写结构断言（记录表单、图片、临期提醒区、订阅按钮）**
- [ ] **Step 2: 接入选择图片、进价与保质期录入、账本保存**
- [ ] **Step 3: 实现“剩余 10 天”提醒与订阅消息请求触发入口**
- [ ] **Step 4: 运行测试并保留兼容性说明（云端推送后置时的本地行为）**

### Task 9: 黑名单仓储 + 页面 + 下单门禁

**Files:**
- Create: `App/miniprogram/utils/merchant-blacklist-storage.ts`
- Create: `App/miniprogram/pages/merchant/blacklist/blacklist.ts`
- Create: `App/miniprogram/pages/merchant/blacklist/blacklist.wxml`
- Create: `App/miniprogram/pages/merchant/blacklist/blacklist.wxss`
- Create: `App/miniprogram/pages/merchant/blacklist/blacklist.json`
- Modify: `App/miniprogram/app.json`
- Modify: `App/miniprogram/utils/customer-order-repository.ts`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Test: `App/tests/merchant-blacklist-storage.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`
- Test: `App/tests/merchant-blacklist-page.test.ts`

- [ ] **Step 1: 先写黑名单仓储失败测试（新增/去重/移除）**
- [ ] **Step 2: 实现黑名单页面与 OpenID 拉黑/解除拉黑能力**
- [ ] **Step 3: 在商家入口（商家我的）增加黑名单跳转触发**
- [ ] **Step 4: 在顾客提交订单数据路径接入黑名单拦截并回传明确错误**
- [ ] **Step 5: 运行测试，确认“被拉黑用户无法下单”生效且不影响未拉黑用户**

---

## Chunk 4: 回归与交付

### Task 10: 自动化回归 + 微信补测清单

**Files:**
- Modify (if needed): `App/tests/*.test.ts`
- Docs suggestion only (不落盘): `docs/TODO.md`、`docs/PRD.md`

- [ ] **Step 1: 运行 `npm test` 全量回归并记录结果**
- [ ] **Step 2: 整理微信开发者工具 2.01.2510280 人工回归步骤（操作步骤 + 预期效果）**
- [ ] **Step 3: 检查是否存在临时调试打印；若有，先移除再交付**
- [ ] **Step 4: 输出风险与文档更新建议（不提前修改 TODO）**
