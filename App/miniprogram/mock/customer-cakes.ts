import type { CakeDetail } from '../../types/product'

export const CUSTOMER_CAKES: CakeDetail[] = [
  {
    id: 'cake-cloud',
    title: '云朵鲜奶生日蛋糕',
    category: 'birthday-cake',
    description: '轻盈鲜奶油包裹柔软蛋糕胚，适合奶白、柔和、庆生氛围的蛋糕主视觉。',
    basePrice: 168,
    monthlySales: 82,
    status: 'active',
    coverImage: 'https://example.invalid/cake-cloud-cover.jpg',
    gallery: [
      {
        url: 'https://example.invalid/cake-cloud-cover.jpg',
        alt: '云朵鲜奶生日蛋糕封面图',
        width: 1080,
        height: 1420,
      },
      {
        url: 'https://example.invalid/cake-cloud-gallery-2.jpg',
        alt: '云朵鲜奶生日蛋糕侧面图',
        width: 1080,
        height: 1240,
      },
    ],
    specs: [
      { id: 'cake-cloud-6', label: '6 英寸', size: '6-inch', price: 168, stock: 12, isDefault: true },
      { id: 'cake-cloud-8', label: '8 英寸', size: '8-inch', price: 198, stock: 8, isDefault: false },
      { id: 'cake-cloud-10', label: '10 英寸', size: '10-inch', price: 238, stock: 5, isDefault: false },
    ],
    detailImages: [
      {
        url: 'https://example.invalid/cake-cloud-detail-1.jpg',
        alt: '云朵鲜奶生日蛋糕详情图 1',
        width: 1080,
        height: 1440,
      },
      {
        url: 'https://example.invalid/cake-cloud-detail-2.jpg',
        alt: '云朵鲜奶生日蛋糕详情图 2',
        width: 1080,
        height: 1368,
      },
      {
        url: 'https://example.invalid/cake-cloud-detail-3.jpg',
        alt: '云朵鲜奶生日蛋糕详情图 3',
        width: 1080,
        height: 1200,
      },
    ],
    layerOptions: [
      { id: 'single', label: '单层', layers: 1 },
      { id: 'double', label: '双层', layers: 2 },
      { id: 'triple', label: '三层', layers: 3 },
    ],
    sizePlans: [
      { id: 'cake-cloud-single-6', label: '6 英寸', layers: 1, sizes: ['6-inch'], price: 168, isDefault: true },
      { id: 'cake-cloud-single-8', label: '8 英寸', layers: 1, sizes: ['8-inch'], price: 198, isDefault: false },
      { id: 'cake-cloud-double-84', label: '8 + 4 英寸', layers: 2, sizes: ['8-inch', '6-inch'], price: 288, isDefault: true },
      { id: 'cake-cloud-triple-864', label: '8 + 6 + 4 英寸', layers: 3, sizes: ['8-inch', '6-inch', '6-inch'], price: 388, isDefault: true },
    ],
    creamOptions: [
      { id: 'fresh', label: '轻乳脂鲜奶油', priceDelta: 0, isDefault: true },
      { id: 'sea-salt', label: '海盐奶油', priceDelta: 18, isDefault: false },
      { id: 'peach', label: '桃乌龙奶油', priceDelta: 22, isDefault: false },
    ],
  },
  {
    id: 'cake-peach',
    title: '蜜桃日落双层蛋糕',
    category: 'birthday-cake',
    description: '偏桃橙渐变的轻熟风生日蛋糕，适合双层庆生场景。',
    basePrice: 238,
    monthlySales: 37,
    status: 'active',
    coverImage: 'https://example.invalid/cake-peach-cover.jpg',
    gallery: [
      {
        url: 'https://example.invalid/cake-peach-cover.jpg',
        alt: '蜜桃日落双层蛋糕封面图',
        width: 1080,
        height: 1180,
      },
    ],
    specs: [
      { id: 'cake-peach-6', label: '6 英寸', size: '6-inch', price: 238, stock: 6, isDefault: true },
      { id: 'cake-peach-8', label: '8 英寸', size: '8-inch', price: 268, stock: 4, isDefault: false },
    ],
    detailImages: [
      {
        url: 'https://example.invalid/cake-peach-detail-1.jpg',
        alt: '蜜桃日落双层蛋糕详情图 1',
        width: 1080,
        height: 1280,
      },
      {
        url: 'https://example.invalid/cake-peach-detail-2.jpg',
        alt: '蜜桃日落双层蛋糕详情图 2',
        width: 1080,
        height: 1360,
      },
    ],
    layerOptions: [
      { id: 'single', label: '单层', layers: 1 },
      { id: 'double', label: '双层', layers: 2 },
    ],
    sizePlans: [
      { id: 'cake-peach-single-6', label: '6 英寸', layers: 1, sizes: ['6-inch'], price: 238, isDefault: true },
      { id: 'cake-peach-single-8', label: '8 英寸', layers: 1, sizes: ['8-inch'], price: 268, isDefault: false },
      { id: 'cake-peach-double-84', label: '8 + 4 英寸', layers: 2, sizes: ['8-inch', '6-inch'], price: 358, isDefault: true },
    ],
    creamOptions: [
      { id: 'peach', label: '桃乌龙奶油', priceDelta: 0, isDefault: true },
      { id: 'fresh', label: '轻乳脂鲜奶油', priceDelta: 12, isDefault: false },
    ],
  },
  {
    id: 'cake-mist',
    title: '暖雾香草蛋糕',
    category: 'birthday-cake',
    description: '香草风味偏轻柔，适合小型聚会与日常庆祝。',
    basePrice: 158,
    monthlySales: 61,
    status: 'active',
    coverImage: 'https://example.invalid/cake-mist-cover.jpg',
    gallery: [
      {
        url: 'https://example.invalid/cake-mist-cover.jpg',
        alt: '暖雾香草蛋糕封面图',
        width: 1080,
        height: 1100,
      },
    ],
    specs: [
      { id: 'cake-mist-6', label: '6 英寸', size: '6-inch', price: 158, stock: 9, isDefault: true },
      { id: 'cake-mist-8', label: '8 英寸', size: '8-inch', price: 188, stock: 7, isDefault: false },
    ],
    detailImages: [
      {
        url: 'https://example.invalid/cake-mist-detail-1.jpg',
        alt: '暖雾香草蛋糕详情图 1',
        width: 1080,
        height: 1320,
      },
    ],
    layerOptions: [
      { id: 'single', label: '单层', layers: 1 },
    ],
    sizePlans: [
      { id: 'cake-mist-single-6', label: '6 英寸', layers: 1, sizes: ['6-inch'], price: 158, isDefault: true },
      { id: 'cake-mist-single-8', label: '8 英寸', layers: 1, sizes: ['8-inch'], price: 188, isDefault: false },
    ],
    creamOptions: [
      { id: 'vanilla', label: '香草奶油', priceDelta: 0, isDefault: true },
      { id: 'fresh', label: '轻乳脂鲜奶油', priceDelta: 10, isDefault: false },
    ],
  },
]
