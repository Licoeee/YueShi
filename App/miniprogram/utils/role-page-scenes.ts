import type { RoleType } from '../../types/role'

export interface RolePageSceneCell {
  title: string
  note: string
  description: string
}

export interface RolePageSceneCellsSection {
  kind: 'cells'
  cells: RolePageSceneCell[]
}

export interface RolePageSceneAdminRoleSwitcherSection {
  kind: 'admin-role-switcher'
  title: string
  note: string
  description: string
}

export interface RolePageScenePreviewReturnSection {
  kind: 'preview-return'
  cells: RolePageSceneCell[]
  buttonLabel: string
  note: string
}

export type RolePageSceneSection =
  | RolePageSceneCellsSection
  | RolePageSceneAdminRoleSwitcherSection
  | RolePageScenePreviewReturnSection

export interface RolePageScene {
  path: string
  roleType: RoleType
  eyebrow: string
  title: string
  description: string
  showPreviewModeTag: boolean
  sections: RolePageSceneSection[]
}

const ROLE_PAGE_SCENES: Record<string, RolePageScene> = {
  '/pages/customer/home/home': {
    path: '/pages/customer/home/home',
    roleType: 'customer',
    eyebrow: 'CUSTOMER HOME',
    title: '顾客端首页',
    description: '2.4 阶段先完成角色隔离与入口稳定，后续会在这里承接瀑布流选品与快捷加购。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '今日推荐', note: '规划中', description: '后续接入瀑布流商品卡与排序筛选能力。' },
          { title: '快捷加购', note: '规划中', description: '后续将直接唤起规格选择弹层。' },
        ],
      },
    ],
  },
  '/pages/customer/cart/cart': {
    path: '/pages/customer/cart/cart',
    roleType: 'customer',
    eyebrow: 'CUSTOMER CART',
    title: '顾客购物车',
    description: '这里将承接加购商品、规格确认与结算入口，当前先补齐顾客端底部导航结构。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '待结算商品', note: '0', description: '后续接入购物车商品列表与规格摘要。' },
          { title: '优惠信息', note: '规划中', description: '后续承接满减、备注与结算联动。' },
        ],
      },
    ],
  },
  '/pages/customer/orders/orders': {
    path: '/pages/customer/orders/orders',
    roleType: 'customer',
    eyebrow: 'CUSTOMER ORDERS',
    title: '顾客订单',
    description: '这里将承接订单列表、订单详情和备注二次编辑能力，当前先完成角色入口与导航隔离。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '待支付订单', note: '0', description: '后续接入真实订单数据。' },
          { title: '待取货订单', note: '0', description: '状态锁定规则将在 3.4 阶段接入。' },
        ],
      },
    ],
  },
  '/pages/customer/profile/profile': {
    path: '/pages/customer/profile/profile',
    roleType: 'customer',
    eyebrow: 'CUSTOMER PROFILE',
    title: '顾客端我的',
    description: '该页面将承接地址簿、偏好设置和角色展示信息。当前先提供顾客端导航锚点。',
    showPreviewModeTag: true,
    sections: [
      {
        kind: 'preview-return',
        cells: [
          { title: '手机号管理', note: '规划中', description: '后续接入结算手机号默认值设置。' },
          { title: '取货提醒', note: '规划中', description: '后续接入订阅消息开关。' },
        ],
        buttonLabel: '返回管理员视角',
        note: '当前是管理员预览，点击可回到管理员首页。',
      },
    ],
  },
  '/pages/merchant/products/products': {
    path: '/pages/merchant/products/products',
    roleType: 'merchant',
    eyebrow: 'MERCHANT PRODUCTS',
    title: '商家商品管理',
    description: '该页面将承接商品新增、编辑、回收站与批量修改能力，当前用于角色导航隔离。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '上架商品', note: '0', description: '后续接入商品列表和批量编辑工作流。' },
          { title: '回收站', note: '0', description: '7 天恢复机制将在后续任务实现。' },
        ],
      },
    ],
  },
  '/pages/merchant/orders/orders': {
    path: '/pages/merchant/orders/orders',
    roleType: 'merchant',
    eyebrow: 'MERCHANT ORDERS',
    title: '商家订单管理',
    description: '该页面是商家工作台主入口，后续接入按取货时间排序与备注高亮策略。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '今日待制作', note: '0', description: '后续接入实时订单流水。' },
          { title: '待取货提醒', note: '0', description: '超时提醒会在第六阶段接入。' },
        ],
      },
    ],
  },
  '/pages/merchant/account-book/account-book': {
    path: '/pages/merchant/account-book/account-book',
    roleType: 'merchant',
    eyebrow: 'MERCHANT ACCOUNT BOOK',
    title: '散货静态账本',
    description: '账本入口用于承接散货进价、保质期和临期预警信息，当前阶段先锁定角色导航结构。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '库存总量', note: '0', description: '后续接入散货台账记录。' },
          { title: '临期提醒', note: '0', description: '后续接入剩余 10 天自动提醒。' },
        ],
      },
    ],
  },
  '/pages/merchant/inventory/inventory': {
    path: '/pages/merchant/inventory/inventory',
    roleType: 'merchant',
    eyebrow: 'MERCHANT INVENTORY',
    title: '商家商品库存',
    description: '该页面将承接现货数量、补货提醒与库存盘点入口，当前先锁定商家端五项导航结构。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '低库存商品', note: '0', description: '后续接入库存阈值与补货提醒。' },
          { title: '盘点任务', note: '规划中', description: '后续接入库存变动流水与核对入口。' },
        ],
      },
    ],
  },
  '/pages/merchant/profile/profile': {
    path: '/pages/merchant/profile/profile',
    roleType: 'merchant',
    eyebrow: 'MERCHANT PROFILE',
    title: '商家端我的',
    description: '该页面用于承接店铺配置、消息提醒和风控入口。当前先完成商家端 TabBar 隔离锚点。',
    showPreviewModeTag: true,
    sections: [
      {
        kind: 'preview-return',
        cells: [
          { title: '店铺信息', note: '规划中', description: '后续接入店铺头像、门店名与营业状态。' },
          { title: '客户风控', note: '规划中', description: '后续接入黑名单管理页面。' },
        ],
        buttonLabel: '返回管理员视角',
        note: '当前是管理员预览，点击可回到管理员首页。',
      },
    ],
  },
  '/pages/admin/reviews/reviews': {
    path: '/pages/admin/reviews/reviews',
    roleType: 'admin',
    eyebrow: 'ADMIN REVIEWS',
    title: '管理员 · 商家审核',
    description: '审核页将承接商家入驻申请列表与验证码发放流程，当前先完成管理员导航隔离。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '待审核申请', note: '0', description: '后续接入商家申请队列。' },
          { title: '今日已通过', note: '0', description: '后续记录发放验证码明细。' },
        ],
      },
    ],
  },
  '/pages/admin/overview/overview': {
    path: '/pages/admin/overview/overview',
    roleType: 'admin',
    eyebrow: 'ADMIN OVERVIEW',
    title: '管理员 · 数据概览',
    description: '数据概览页将承接三端巡检与全局状态看板，当前先完成管理员 TabBar 第二入口。',
    showPreviewModeTag: false,
    sections: [
      {
        kind: 'cells',
        cells: [
          { title: '活跃商家', note: '0', description: '后续接入商家状态统计。' },
          { title: '今日订单', note: '0', description: '后续接入跨角色聚合数据。' },
        ],
      },
    ],
  },
  '/pages/admin/profile/profile': {
    path: '/pages/admin/profile/profile',
    roleType: 'admin',
    eyebrow: 'ADMIN PROFILE',
    title: '管理员 · 角色切换中心',
    description: '这里用于三端预览切换。切换后会重启到对应入口，确保 TabBar 实例与角色菜单同步刷新。',
    showPreviewModeTag: true,
    sections: [
      {
        kind: 'admin-role-switcher',
        title: '角色切换',
        note: '管理员专用',
        description: '点击下方按钮会重载到对应角色主页。',
      },
    ],
  },
}

export function getRolePageScene(path: string): RolePageScene {
  const scene = ROLE_PAGE_SCENES[path]
  if (scene === undefined) {
    throw new Error(`Unknown role page scene: ${path}`)
  }

  return scene
}
