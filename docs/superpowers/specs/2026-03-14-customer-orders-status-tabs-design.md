# Customer Orders Status Tabs Design

## Goal

补齐顾客订单列表页的状态切换能力，让用户可以在 `待确认 / 待制作 / 待取货 / 已完成` 四个主状态之间切换查看订单。

## Root Cause

当前 `customer-orders-scene` 只渲染一个扁平订单列表：

- 没有状态分组
- 没有当前选中 tab 状态
- 没有任何切换控件

因此问题不是样式失效，而是订单列表缺少状态筛选能力。

## Product Decisions

### Tab Model

订单页新增四个主 tab：

- `待确认`
- `待制作`
- `待取货`
- `已完成`

### Status Mapping

不改底层订单状态模型，只在列表展示层做归桶：

- `pending-payment` -> `待确认`
- `paid` -> `待确认`
- `cancelled` -> `待确认`
- `in-production` -> `待制作`
- `ready-for-pickup` -> `待取货`
- `completed` -> `已完成`

将 `cancelled` 归入 `待确认` 的原因是当前页面只新增四个主 tab，若直接排除会导致已取消订单在列表中不可达。卡片仍保留 `已取消` 状态标签，不会伪装成待确认。

### UI Strategy

遵循项目的 TDesign 约束，使用：

- `t-tag`
- `t-empty`

不使用 `t-tabs` / `t-tab-panel`。原因是它们会顺带引入 `t-sticky`、`t-badge`、`t-icon` 和字体资源，和项目当前“小程序关键路径不依赖 TDesign 字体图标”的稳定基线冲突，也更容易在微信开发者工具 `2.01.2510280` 下触发额外的工具侧资源/安全校验问题。

状态切换区改为一排可点击的 TDesign `tag` 选择态。它仍然满足“全量使用 TDesign 组件库”的要求，同时依赖链更短、兼容风险更低。

## Module Changes

### `customer-orders-scene.ts`

- 增加 tab 类型与默认 tab
- 增加状态到 tab 的映射函数
- 保留原始 `orders`
- 新增派生 `visibleOrders`
- 增加 `activeTab`
- 增加 tab 切换处理函数

### `customer-orders-scene.wxml`

- 在列表上方增加 TDesign `tag` 选择态入口
- 空状态基于当前 tab 的 `visibleOrders` 判断
- 列表渲染改为遍历 `visibleOrders`

### `customer-orders-scene.wxss`

- 增加 tab 容器和间距样式
- 保持现有卡片视觉语言

## Testing Strategy

### Structural Tests

- 断言订单页包含四个 tab 文案
- 断言组件存在 `activeTab`
- 断言组件存在状态映射和筛选逻辑
- 断言组件绑定 tab 切换事件

### Regression Scope

- 订单卡片点击进入详情不回退
- 备注高亮卡片不回退
- 空状态仍可展示

## Manual Verification

微信开发者工具 `2.01.2510280` 中验证：

1. 顾客进入订单页时默认停留在 `待确认`
2. 点击四个 tab 时，列表按状态切换
3. `待取货` 只显示 `ready-for-pickup`
4. `已完成` 只显示 `completed`
5. 已取消订单仍能在 `待确认` tab 中看到，且状态标签显示为 `已取消`
