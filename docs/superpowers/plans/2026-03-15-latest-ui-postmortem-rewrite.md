# Latest UI Postmortem Rewrite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于当前最新、正确的顾客端 UI 实现，重写此前失真的复盘结论，并同步修正文档口径，避免后续继续沿用中间态分析。

**Architecture:** 先以当前代码为唯一事实来源，提炼“真实解决方式”和“之前反复修不住的根因”，再分别落到流程规范、视觉规范和需求验收文档。只改文档，不改功能代码，也不提前变更 TODO 完成状态。

**Tech Stack:** Markdown、Git、微信小程序现有 WXML/WXSS/TS 实现

---

## Chunk 1: 事实基线与计划固化

### Task 1: 核对最新实现证据

**Files:**
- Modify: `docs/superpowers/plans/2026-03-15-latest-ui-postmortem-rewrite.md`
- Reference: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Reference: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`
- Reference: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Reference: `App/miniprogram/pages/customer/checkout/checkout.wxml`
- Reference: `App/miniprogram/pages/customer/checkout/checkout.wxss`
- Reference: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Reference: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Reference: `App/miniprogram/pages/customer/order-detail/order-detail.wxss`
- Reference: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Reference: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxss`
- Reference: `App/miniprogram/pages/customer/settings/settings.wxml`
- Reference: `App/miniprogram/pages/customer/settings/settings.wxss`

- [ ] **Step 1: 抽取当前实现证据**

记录以下事实：
- 购物车底栏已改为 `grid` 约束，按钮区固定宽度，金额区占剩余空间。
- 动态字号只作为金额极限收敛的补充，不再承担主布局职责。
- 关键动作区域大量使用自定义 action shell，而不是继续依赖 `t-button` 变体调参。
- 历史手机号入口已从输入框中解耦为独立入口。
- `pickupWarning` 与 `submitDisabled` 已形成同源状态闭环。
- 设置页“当前账号”已改为独立信息卡承载长文本。

- [ ] **Step 2: 提炼复盘主结论**

结论必须覆盖：
- 上一版分析为什么错：基于中间态，不是最终态。
- 之前反复修不住的根因：在旧骨架内持续微调、把按钮变量误当唯一解、未拆辅助入口、缺少极限内容验证。
- 最新实现为什么能收敛：先重建布局契约，再做视觉层级和状态闭环。

## Chunk 2: 文档口径重写

### Task 2: 更新流程规则文档

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 修正 UI 修复方法论**

新增或重写以下规则：
- 连续两轮以上微调仍不稳定时，必须升级为“布局骨架重建”。
- 关键动作若被组件内建盒模型拖累，必须先判断是否允许采用自定义 action shell。
- 复盘与验收必须以最新代码状态为准，禁止用中间态截图或中间稿反推最终结论。

- [ ] **Step 2: 保留已有有效红线**

保留但重新组织：
- 极限内容验算。
- 设计改版后同步校验测试断言。
- 按钮、状态、布局需要同源约束，不允许只修表象。

### Task 3: 更新视觉规范文档

**Files:**
- Modify: `docs/STYLE_GUIDE.md`

- [ ] **Step 1: 重写关键页面布局规范**

补充：
- 购物车底栏采用“固定动作区 + 弹性金额区”的稳定布局原则。
- 长金额处理优先靠布局收敛，再配合字号降级，禁止让 CTA 受内容长度挤压。
- 辅助入口（如历史手机号）不能复用主输入容器。

- [ ] **Step 2: 重写动作控件规范**

补充：
- 当 TDesign Button 变量无法提供稳定边界和盒模型时，可保留 TDesign 组件生态，但用自定义 action shell 承载视觉与点击区域。
- action shell 需统一暖粉橙层级、边框、阴影、禁用态与危险态。
- 长文本信息优先进入独立卡片或信息块，不再挤进 `t-cell note`。

### Task 4: 更新需求口径文档

**Files:**
- Modify: `docs/PRD.md`

- [ ] **Step 1: 修正顾客端关键页面验收口径**

明确：
- 搜索 ID 本轮仍只保留文档待办。
- 购物车底栏验收以“金额不挤压按钮、合计与金额同行、全选按钮宽度稳定、滑删可用”为准。
- 结算页验收以“历史手机号独立入口 + 错误时间提示和提交禁用联动”为准。
- 备注、我的、设置页验收以“按钮边界清晰、账号信息完整、操作层级稳定”为准。

- [ ] **Step 2: 对齐本轮现实边界**

明确这轮仍是“本地持久化 + 前端闭环”，不把云端联动写成已完成能力。

## Chunk 3: 自查与交付

### Task 5: 自查 diff

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/STYLE_GUIDE.md`
- Modify: `docs/PRD.md`
- Create: `docs/superpowers/plans/2026-03-15-latest-ui-postmortem-rewrite.md`

- [ ] **Step 1: 查看文档 diff**

Run: `git -C E:\CodeBase\Learning\YueShi\.worktrees\dev-20260315 diff -- AGENTS.md docs/STYLE_GUIDE.md docs/PRD.md docs/superpowers/plans/2026-03-15-latest-ui-postmortem-rewrite.md`
Expected: 仅出现计划文件和三份文档的口径改写。

- [ ] **Step 2: 复核未误改其他文件**

Run: `git -C E:\CodeBase\Learning\YueShi\.worktrees\dev-20260315 status -sb`
Expected: 新增/修改集中在计划文件和目标文档；其余未跟踪预览图、配置文件保持原样不动。
