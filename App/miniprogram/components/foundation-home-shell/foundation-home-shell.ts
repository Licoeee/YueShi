import type { RoleType } from '../../../types/role'

interface FoundationCheckItem {
  key: string
  title: string
  note: string
  description: string
}

interface RolePreviewCard {
  role: RoleType
  title: string
  description: string
}

interface FoundationShellData {
  keyword: string
  stageTags: string[]
  foundationChecks: FoundationCheckItem[]
  roleCards: RolePreviewCard[]
}

const foundationShellData: FoundationShellData = {
  keyword: '',
  stageTags: ['TDesign 全局接入', 'TS 类型声明', '主题变量统一'],
  foundationChecks: [
    {
      key: 'tdesign',
      title: 'TDesign 组件注册',
      note: 'app.json / 全局 usingComponents',
      description: '基础按钮、搜索、标签、单元格组件统一在应用入口注册，后续页面直接复用。',
    },
    {
      key: 'typing',
      title: '业务类型声明',
      note: 'App/types/*.d.ts',
      description: '角色、订单、商品、用户四类声明补齐，为后续云函数与页面逻辑提供稳定边界。',
    },
    {
      key: 'theme',
      title: '品牌主题变量',
      note: 'app.wxss + t-design.json',
      description: '日落橙、晨曦桃、淡粉色与圆角、发光阴影已沉淀为全局变量和主题清单。',
    },
  ],
  roleCards: [
    {
      role: 'customer',
      title: '顾客端',
      description: '承接首页选购、下单、订单管理，后续直接复用当前搜索与卡片风格。',
    },
    {
      role: 'merchant',
      title: '商家端',
      description: '承接订单流水线、商品管理与账本能力，重点依赖统一状态类型和主题色。',
    },
    {
      role: 'admin',
      title: '管理员端',
      description: '承接商家审核与版本巡检，后续可基于角色声明直接切换入口与导航。',
    },
  ],
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    mode: {
      type: String,
      value: 'page',
    },
  },

  data: foundationShellData,
})
