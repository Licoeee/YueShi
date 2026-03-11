# 第一阶段项目基座复盘

## 1. 阶段结论

- 完成日期：2026-03-10 至 2026-03-11
- 稳定提交：`3c0a667` `完成第一阶段项目基座并修复真机调试`
- 当前结论：第一阶段“项目基座”已完成，微信开发者工具与真机调试均已由大帅确认通过。

第一阶段不是单纯把首页换成了一个新界面，而是把后续所有页面都会依赖的基础约束先定死了：TDesign 全局接入、品牌主题变量、业务类型声明、微信开发者工具编译配置，以及真机调试兼容基线。

## 2. 实际落地改动

### 2.1 TDesign 与主题基座

- `App/miniprogram/app.json`
  - 全局注册 `t-button`、`t-cell`、`t-cell-group`、`t-divider`、`t-icon`、`t-search`、`t-tag`
  - 开启 `glass-easel` 与 `requiredComponents` 惰性加载
- `App/miniprogram/t-design.json`
  - 固化品牌色、圆角、阴影的主题清单
- `App/miniprogram/app.wxss`
  - 沉淀 `--color-sunset`、`--color-peach`、`--color-pink`、`--radius-lg`、`--glow-effect`
  - 同步映射到 TDesign 变量，避免页面层重复硬编码

### 2.2 首页项目基座预览

- `App/miniprogram/pages/index/index.{json,ts,wxml,wxss}`
  - 替换默认模板页
  - 使用 TDesign 组件展示第一阶段检查点、三端角色预览与后续扩展入口
  - 通过固定背景层解决长页面滚动时的渐变断层问题

### 2.3 TypeScript 类型与编译边界

- `App/types/role.d.ts`
- `App/types/order.d.ts`
- `App/types/product.d.ts`
- `App/types/user.d.ts`
  - 补齐角色、订单、商品、用户的领域声明
- `App/tsconfig.json`
  - 保持严格模式
  - 显式包含 `types/**/*.d.ts`
  - 排除 `miniprogram_npm` 与依赖目录，避免把生成产物拉进类型检查
- `App/typings/types/wx/lib.wx.app.d.ts`
  - 修正应用级类型定义，保证项目 TS 基线可用

### 2.4 微信开发者工具兼容修正

- `App/project.config.json`
  - `setting.es6 = true`
- `App/project.private.config.json`
  - `setting.showES6CompileOption = true`

这两个配置不是“顺手调一下”，而是第一阶段能否真机调试的关键前置条件。

### 2.5 TDesign 图标兼容补丁

- `App/miniprogram/miniprogram_npm/tdesign-miniprogram/icon/icon.wxss`
- `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/icon/icon.wxss`
  - 都移除了 `@font-face`
  - 保证 `构建 npm` 后源包与产物保持一致

说明：

- 仓库里仍有 `t.woff` 文件残留，它们来自中间验证方案。
- 当前稳定方案不再依赖这些字体文件参与首页渲染。
- 真正生效的关键是“去掉字体加载依赖 + 当前首屏不触发字体图标渲染”。

## 3. Bug 复盘

### Bug 1：真机调试报 `Unexpected token import`

### 现象

点击“真机调试”时，微信开发者工具报错：

- `invalid file: miniprogram_npm/tdesign-miniprogram/button/button.js`
- `SyntaxError: Unexpected token {import{__decorate}from"tslib"...`

### 根因

TDesign 的 `miniprogram_npm` 产物包含 ES Module 语法，但项目配置里没有开启 ES6 编译，导致微信开发者工具在真机调试链路里无法正确处理依赖产物。

### 最终修复

- 在 `App/project.config.json` 中开启 `setting.es6 = true`
- 在 `App/project.private.config.json` 中打开 `setting.showES6CompileOption = true`

### 后续必须避免

- 不要假设“装了 TDesign + 开了 TypeScript 插件”就一定能真机调试。
- 只要引入或升级 `miniprogram_npm` 依赖，就要复查 `App/project.config.json` 的 `setting.es6` 是否仍为 `true`。
- 如果换机器、重装微信开发者工具、重新导入项目，也要把这项当成首轮检查项。

### Bug 2：TDesign 图标字体导致远程/本地字体加载失败

### 现象

先后出现过两类错误：

- 远程字体失败：`Failed to load font https://tdesign.gtimg.com/icon/0.4.1/fonts/t.woff`
- 本地字体失败：`Failed to load local font resource ... do-not-use-local-path ...`

### 根因

TDesign `t-icon` 默认依赖字体图标方案。这个方案在微信开发者工具 `2.01.2510280` 的当前调试链路上并不稳定：

- 远程字体依赖网络环境
- 组件样式里的本地字体路径在渲染层也可能被拦截

问题本质不是“字体文件没下到本地”，而是“当前平台链路不适合把首屏渲染建立在字体图标上”。

### 走过的弯路

- 直接使用远程 `t.woff`
- 把 `t.woff` 下载到本地并改为本地路径引用

这两条路都没有形成稳定基线。

### 最终修复

- 删除两份 `icon.wxss` 里的 `@font-face`
- 首页去掉显式 `t-icon`
- `t-search` 显式传 `leftIcon=""`，避免默认搜索图标
- 使用普通视图元素替代装饰性图标

### 后续必须避免

- 当前项目基线默认视为“首屏不可靠支持 TDesign 字体图标”。
- 后续页面如果使用 `t-icon`，或者使用带默认图标的 TDesign 组件，必须先验证真机调试是否稳定。
- 对不需要图标的组件，显式关闭相关图标属性，不要吃默认值。
- 任何对第三方包样式的补丁，都必须同时修改：
  - `App/miniprogram/node_modules/...`
  - `App/miniprogram/miniprogram_npm/...`
- 否则一旦执行“构建 npm”，运行时行为会回退。

### Bug 3：长页面滚动时背景渐变断层

### 现象

页面下滑后，背景渐变出现衔接不上、像“切了一截”的感觉。

### 根因

渐变背景挂在全局 `page` 上时，视觉上更接近“视口背景”，不是“整页连续背景”。内容滚动后，就容易出现拼接感。

### 最终修复

- 页面增加固定背景层 `.foundation-page__background`
- 内容层 `.foundation-page__content` 置于背景层之上
- 全局 `page` 只保留纯色 fallback

### 后续必须避免

- 只要页面有长滚动内容，就不要把复杂渐变直接挂在 `page` 上。
- 长页面渐变必须拆成“固定背景层 + 相对定位内容层”。
- 视觉规范写的是渐变效果，工程实现必须考虑滚动载体，不能机械照抄到全局背景。

## 4. 这次沉淀出的默认开发规则

后续开发默认按下面几条执行，不再重复试错：

1. 新接入或升级 `miniprogram_npm` 依赖后，先检查 `App/project.config.json` 的 `setting.es6`。
2. 任何首屏或关键页面，默认不要依赖字体图标才能成立；能关闭默认 icon 就先关闭。
3. 长滚动页面的渐变背景，统一使用固定背景层实现。
4. 修第三方包兼容问题时，源包和生成包必须同步补丁。
5. 需要大帅在微信开发者工具补测时，必须同时提供：
   - 具体操作步骤
   - 每一步预期看到的结果

第 5 条不是沟通偏好，而是质量控制要求。没有“步骤 + 预期结果”，测试反馈就不可判定，问题也无法高效回溯。

## 5. 验证记录

### 自动校验

执行过并通过：

```powershell
npx -y -p typescript tsc --noEmit -p App\tsconfig.json
```

### 人工校验环境

- 微信开发者工具：`2.01.2510280`
- 基础库：`3.14.3`
- 校验范围：
  - 首页 TDesign 组件渲染
  - 真机调试是否还能触发编译错误
  - 是否还有字体加载报错
  - 长页面滚动时背景是否连续

### 最终确认结果

大帅已确认：

- 首页组件渲染正常
- 真机调试通过
- 字体相关报错消失
- 背景滚动连续
- 第一阶段任务完成

## 6. 对第二阶段的直接影响

第二阶段“欢迎页与身份引擎”开始前，默认承接以下前提：

- 可以直接复用现有品牌变量与玻璃态卡片基线
- 可以继续基于 `App/types/*.d.ts` 扩展身份、订单和商品逻辑
- 新页面若使用 TDesign 图标，必须先把兼容策略单独验证掉
- 欢迎页若使用复杂背景或长内容过渡，仍需沿用“固定背景层”做法

## 7. 微信开发者工具回归模板

后续再请大帅补测时，至少按下面模板给出步骤与预期：

1. 打开微信开发者工具 `2.01.2510280`，确认载入目录是 `App`
   - 预期：项目正常打开，无导入失败提示
2. 如果本次改动涉及依赖、`miniprogram_npm` 或第三方包补丁，先执行一次“构建 npm”
   - 预期：构建完成，无新增编译错误
3. 点击“编译”，进入对应页面并观察首屏
   - 预期：页面正常渲染，无 `Unexpected token import`、无字体加载报错
4. 对长页面执行下滑操作，至少滚动一个完整屏高
   - 预期：背景连续，无渐变断层、无明显拼接感
5. 点击“真机调试”
   - 预期：连接成功，控制台不再出现字体资源失败或依赖语法解析失败

如果某次改动引入了图标能力，还要额外补一条：

- 检查所有显式或默认 icon 的组件表现
  - 预期：图标可见且不触发新的字体资源报错；若该页面采用禁用 icon 策略，则应完全不出现图标占位
