# Merchant Orders Calendar Range Revert Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅撤回商家订单页上次新增的日历范围限制显式绑定，保留订单页其他近期功能改动不变。

**Architecture:** 精确回撤 `calendarMinDate` / `calendarMaxDate` / `calendarValue` 及其 WXML 绑定与测试断言，不触碰搜索、状态流转、弹窗或场景保活修复。

**Tech Stack:** 微信小程序、TypeScript、Node `node:test`

---

### Task 1: 精确回撤订单页日期范围改动
- [ ] 回查 merchant orders 组件与测试中上次新增的日期范围字段
- [ ] 仅移除 `minDate` / `maxDate` / `value` 绑定及对应数据字段、辅助函数、测试断言
- [ ] 运行 `npx tsx --test tests/merchant-orders-scene.test.ts` 与 `npx tsc --noEmit`
