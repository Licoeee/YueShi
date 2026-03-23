import type {
  MerchantCreamType,
  MerchantEnabledConfigIdsByTier,
  MerchantProductConfigAdjustmentMap,
  MerchantProductBatchEditInput,
  MerchantProductDraftInput,
  MerchantProductLayer,
  MerchantProductRecord,
} from '../../../types/merchant-product'
import type {
  MerchantDefaultPriceConfigItem,
  MerchantDefaultPricingSnapshot,
  MerchantPriceTier,
} from '../../../types/merchant-default-pricing'
import type { ProductSpecSize } from '../../../types/product'
import { CUSTOMER_IMAGE_PLACEHOLDER } from '../../utils/customer-image-fallback'
import {
  flattenMerchantDefaultPricingSnapshot,
  isDefaultPricingItemCompatible,
  loadStoredMerchantDefaultPricing,
  resolveMerchantDefaultPriceByConfigId,
  resolveMerchantPriceTierFromLayer,
} from '../../utils/merchant-default-pricing-storage'
import {
  MERCHANT_PRODUCT_ID_COUNTER_KEY,
  batchEditMerchantProducts,
  createMerchantProduct,
  deleteRecycledMerchantProduct,
  deleteMerchantProduct,
  loadStoredMerchantProducts,
  resolveMerchantProductEnabledConfigIdsByTier,
  resolveMerchantProductEnabledPricingItems,
  resolveMerchantProductConfiguredPrice,
  restoreMerchantProduct,
  splitMerchantProductsByRecycleState,
  updateMerchantProduct,
} from '../../utils/merchant-product-storage'

type ProductEditorMode = 'create' | 'edit'
type BatchEditPhase = 'idle' | 'selecting' | 'editing'

interface SpecOption {
  value: ProductSpecSize
  label: string
}

interface CreamOption {
  value: MerchantCreamType
  label: string
}

interface LayerOption {
  value: MerchantProductLayer
  label: string
}

interface MerchantProductDisplayRecord extends MerchantProductRecord {
  specSummary: string
  layerSummary: string
  creamSummary: string
  priceSummary: string
  recycleLeftDays: number
  coverImageUrl: string
  deletedSummary: string
}

interface ProductSelectionChangeDetail {
  value?: unknown
}

interface ProductToggleChangeDetail {
  checked?: unknown
}

interface ProductInputDetail {
  value?: unknown
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface ChooseMediaSuccessCallbackResult {
  tempFiles: Array<{
    tempFilePath: string
  }>
}

interface ProductImageDataset {
  imageIndex?: unknown
}

interface ConfigPriceInputDataset {
  configId?: unknown
  tier?: unknown
}

interface PricingConfigItemView {
  id: string
  label: string
  basePriceLabel: string
  adjustmentInput: string
  selected: boolean
}

interface PricingGroupView {
  tier: MerchantPriceTier
  title: string
  selectedCount: number
  items: PricingConfigItemView[]
}

interface MerchantProductsSceneData {
  activeProducts: MerchantProductDisplayRecord[]
  leftColumnProducts: MerchantProductDisplayRecord[]
  rightColumnProducts: MerchantProductDisplayRecord[]
  recycleProducts: MerchantProductDisplayRecord[]
  productSearchKeyword: string
  visibleProductCount: number
  emptyDescription: string
  selectedProductIds: string[]
  selectedProductMap: Record<string, boolean>
  batchEditPhase: BatchEditPhase
  batchPhaseLabel: string
  batchPhaseValue: string
  batchEditorVisible: boolean
  productEditorVisible: boolean
  recyclePopupVisible: boolean
  productEditorMode: ProductEditorMode
  editingProductId: string
  nextProductIdPreview: string
  productTitleInput: string
  productDescriptionInput: string
  productSpecSizes: ProductSpecSize[]
  productLayers: MerchantProductLayer[]
  productCreamTypes: MerchantCreamType[]
  productEnabledConfigIdsByTier: MerchantEnabledConfigIdsByTier
  productPriceAdjustmentInputs: Record<string, string>
  productPricingGroups: PricingGroupView[]
  productImageUrls: string[]
  batchPriceInput: string
  batchSpecSizes: ProductSpecSize[]
  batchLayers: MerchantProductLayer[]
  batchCreamTypes: MerchantCreamType[]
  batchEnabledConfigIdsByTier: MerchantEnabledConfigIdsByTier
  batchPriceAdjustmentInputs: Record<string, string>
  batchPricingGroups: PricingGroupView[]
  specOptions: SpecOption[]
  layerOptions: LayerOption[]
  creamOptions: CreamOption[]
  selectionCircleIcons: string[]
  confirmDialogVisible: boolean
  confirmDialogTitle: string
  confirmDialogContent: string
  confirmDialogConfirmText: string
  confirmDialogMode: 'delete-product' | 'delete-recycle-product' | ''
  pendingDeleteProductId: string
  pendingRecycleDeleteProductId: string
  confirmDialogReturnToRecycle: boolean
  validationDialogVisible: boolean
  validationMissingFields: string[]
}

const SPEC_OPTIONS: SpecOption[] = [
  { value: '6-inch', label: '6 寸' },
  { value: '8-inch', label: '8 寸' },
  { value: '10-inch', label: '10 寸' },
  { value: '12-inch', label: '12 寸' },
  { value: '14-inch', label: '14 寸' },
  { value: '16-inch', label: '16 寸' },
]

const SPEC_LABEL_MAP: Record<ProductSpecSize, string> = {
  '6-inch': '6 寸',
  '8-inch': '8 寸',
  '10-inch': '10 寸',
  '12-inch': '12 寸',
  '14-inch': '14 寸',
  '16-inch': '16 寸',
}

const LAYER_OPTIONS: LayerOption[] = [
  { value: '1-layer', label: '1 层' },
  { value: '2-layer', label: '2 层' },
  { value: '3-layer', label: '3 层' },
]

const LAYER_LABEL_MAP: Record<MerchantProductLayer, string> = {
  '1-layer': '1 层',
  '2-layer': '2 层',
  '3-layer': '3 层',
}

const PRICING_GROUP_LABEL_MAP: Record<MerchantPriceTier, string> = {
  single: '单层加价',
  double: '双层加价',
  triple: '三层加价',
}

const CREAM_OPTIONS: CreamOption[] = [
  { value: 'animal-cream-i', label: '动物奶油i' },
  { value: 'dairy-cream', label: '乳脂奶油' },
  { value: 'naked-cake', label: '裸蛋糕' },
]

const CREAM_LABEL_MAP: Record<MerchantCreamType, string> = {
  'animal-cream-i': '动物奶油i',
  'dairy-cream': '乳脂奶油',
  'naked-cake': '裸蛋糕',
}

const SELECTION_CIRCLE_ICONS = [
  '/assets/icons/common/selection-circle-checked.svg',
  '/assets/icons/common/selection-circle-unchecked.svg',
]

function parseInputValue(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as ProductInputDetail).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

function parsePopupVisible(detail: unknown): boolean {
  if (typeof detail === 'boolean') {
    return detail
  }

  if (typeof detail !== 'object' || detail === null || !('visible' in detail)) {
    return false
  }

  return (detail as PopupVisibleChangeDetail).visible === true
}

function normalizeSpecSizes(rawValue: unknown): ProductSpecSize[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const values = rawValue.filter((item): item is ProductSpecSize =>
    item === '6-inch' ||
    item === '8-inch' ||
    item === '10-inch' ||
    item === '12-inch' ||
    item === '14-inch' ||
    item === '16-inch',
  )

  return Array.from(new Set(values))
}

function normalizeLayers(rawValue: unknown): MerchantProductLayer[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const values = rawValue.filter((item): item is MerchantProductLayer =>
    item === '1-layer' ||
    item === '2-layer' ||
    item === '3-layer',
  )

  return Array.from(new Set(values))
}

function normalizeCreamTypeSelection(rawValue: unknown): MerchantCreamType[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const values = rawValue.filter((item): item is MerchantCreamType =>
    item === 'animal-cream-i' || item === 'dairy-cream' || item === 'naked-cake',
  )

  return Array.from(new Set(values))
}

function createEmptyEnabledConfigIdsByTier(): MerchantEnabledConfigIdsByTier {
  return {
    single: [],
    double: [],
    triple: [],
  }
}

function collectEnabledConfigIds(enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier): string[] {
  return [
    ...enabledConfigIdsByTier.single,
    ...enabledConfigIdsByTier.double,
    ...enabledConfigIdsByTier.triple,
  ]
}

function hasEnabledConfigIds(enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier): boolean {
  return collectEnabledConfigIds(enabledConfigIdsByTier).length > 0
}

function resolveLayerFromTier(tier: MerchantPriceTier): MerchantProductLayer {
  if (tier === 'triple') {
    return '3-layer'
  }

  if (tier === 'double') {
    return '2-layer'
  }

  return '1-layer'
}

function updateEnabledConfigIdsByTier(
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
  tier: MerchantPriceTier,
  configId: string,
  selected: boolean,
): MerchantEnabledConfigIdsByTier {
  const nextIds = selected
    ? Array.from(new Set([...enabledConfigIdsByTier[tier], configId]))
    : enabledConfigIdsByTier[tier].filter((value) => value !== configId)

  return {
    ...enabledConfigIdsByTier,
    [tier]: nextIds,
  }
}

function buildSummaryFromEnabledPricingItems(
  product: MerchantProductRecord,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): Pick<MerchantProductDisplayRecord, 'specSummary' | 'layerSummary' | 'creamSummary'> {
  const pricingItems = resolveMerchantProductEnabledPricingItems(product, pricingSnapshot)
  if (pricingItems.length === 0) {
    return {
      specSummary: formatSpecSummary(product.specSizes),
      layerSummary: formatLayerSummary(product.layers),
      creamSummary: formatCreamSummary(product.creamTypes),
    }
  }

  const specSet = new Set<ProductSpecSize>()
  const layerSet = new Set<MerchantProductLayer>()
  const creamSet = new Set<MerchantCreamType>()

  pricingItems.forEach((item) => {
    item.sizes.forEach((size) => specSet.add(size))
    layerSet.add(resolveLayerFromTier(item.tier))
    creamSet.add(item.creamType)
  })

  return {
    specSummary: formatSpecSummary(SPEC_OPTIONS.map((item) => item.value).filter((size) => specSet.has(size))),
    layerSummary: formatLayerSummary(LAYER_OPTIONS.map((item) => item.value).filter((layer) => layerSet.has(layer))),
    creamSummary: formatCreamSummary(CREAM_OPTIONS.map((item) => item.value).filter((creamType) => creamSet.has(creamType))),
  }
}

function formatSpecSummary(specSizes: ProductSpecSize[]): string {
  return specSizes.map((size) => SPEC_LABEL_MAP[size]).join(' / ')
}

function formatLayerSummary(layers: MerchantProductLayer[]): string {
  return layers.map((layer) => LAYER_LABEL_MAP[layer]).join(' / ')
}

function formatCreamSummary(creamTypes: MerchantCreamType[]): string {
  return creamTypes.map((creamType) => CREAM_LABEL_MAP[creamType]).join(' / ')
}

function normalizeImageUrls(rawValue: unknown): string[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const imageUrls = rawValue
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return Array.from(new Set(imageUrls))
}

function resolveRecycleLeftDays(product: MerchantProductRecord, now: Date): number {
  if (product.recycleMeta === undefined) {
    return 0
  }

  const expireTime = new Date(product.recycleMeta.recoverExpiresAt).getTime()
  if (Number.isNaN(expireTime)) {
    return 0
  }

  const remainingMs = expireTime - now.getTime()
  if (remainingMs <= 0) {
    return 0
  }

  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
}

function resolveCoverImageUrl(rawUrl: string): string {
  if (rawUrl.length === 0) {
    return CUSTOMER_IMAGE_PLACEHOLDER
  }

  if (rawUrl.startsWith('/assets/') || rawUrl.startsWith('http') || rawUrl.startsWith('wxfile://')) {
    return rawUrl
  }

  return CUSTOMER_IMAGE_PLACEHOLDER
}

function formatDateTime(isoText: string): string {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function mapProductToDisplay(
  product: MerchantProductRecord,
  now: Date,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): MerchantProductDisplayRecord {
  const summary = buildSummaryFromEnabledPricingItems(product, pricingSnapshot)

  return {
    ...product,
    specSummary: summary.specSummary,
    layerSummary: summary.layerSummary,
    creamSummary: summary.creamSummary,
    priceSummary: `¥${product.basePrice} 起`,
    recycleLeftDays: resolveRecycleLeftDays(product, now),
    coverImageUrl: resolveCoverImageUrl(product.coverImage),
    deletedSummary: product.recycleMeta === undefined ? '--' : formatDateTime(product.recycleMeta.deletedAt),
  }
}

function parsePriceInput(priceInput: string): number | null {
  const price = Number(priceInput)
  if (!Number.isFinite(price) || price <= 0) {
    return null
  }

  return Math.round(price)
}

function parseAdjustmentInput(priceInput: string): number | null {
  const price = Number(priceInput)
  if (!Number.isFinite(price) || price < 0) {
    return null
  }

  return Math.round(price)
}

function resolveCardWeight(product: MerchantProductDisplayRecord): number {
  return (
    product.description.length * 5 +
    product.specSizes.length * 12 +
    product.layers.length * 10 +
    product.creamTypes.length * 10 +
    product.id.length * 8
  )
}

function buildProductWaterfallColumns(
  products: MerchantProductDisplayRecord[],
): [MerchantProductDisplayRecord[], MerchantProductDisplayRecord[]] {
  const leftColumn: MerchantProductDisplayRecord[] = []
  const rightColumn: MerchantProductDisplayRecord[] = []
  let leftWeight = 0
  let rightWeight = 0

  products.forEach((product) => {
    const cardWeight = resolveCardWeight(product)
    if (leftWeight <= rightWeight) {
      leftColumn.push(product)
      leftWeight += cardWeight
      return
    }

    rightColumn.push(product)
    rightWeight += cardWeight
  })

  return [leftColumn, rightColumn]
}

function parseCounterValue(rawValue: unknown): number {
  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue > 0) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

function parseProductSequence(productId: string): number {
  const matched = /^A(\d+)$/.exec(productId)
  if (matched === null) {
    return 0
  }

  const sequence = Number(matched[1])
  if (!Number.isInteger(sequence) || sequence <= 0) {
    return 0
  }

  return sequence
}

function resolveNextProductIdPreview(products: MerchantProductRecord[]): string {
  const maxSequence = products.reduce((currentMax, product) => Math.max(currentMax, parseProductSequence(product.id)), 0)
  const storedCounter = parseCounterValue(wx.getStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY))
  const nextSequence = Math.max(maxSequence, storedCounter) + 1

  return `A${String(nextSequence).padStart(3, '0')}`
}

function buildSelectedProductMap(productIds: string[]): Record<string, boolean> {
  return productIds.reduce<Record<string, boolean>>((selectedMap, productId) => {
    if (productId.length > 0) {
      selectedMap[productId] = true
    }

    return selectedMap
  }, {})
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLocaleLowerCase()
}

function filterProductsByKeyword(
  products: MerchantProductDisplayRecord[],
  keyword: string,
): MerchantProductDisplayRecord[] {
  const normalizedKeyword = normalizeKeyword(keyword)
  if (normalizedKeyword.length === 0) {
    return products
  }

  return products.filter((product) => {
    const haystacks = [
      product.id,
      product.title,
      product.description,
      product.specSummary,
      product.layerSummary,
      product.creamSummary,
    ]
    return haystacks.some((field) => field.toLocaleLowerCase().includes(normalizedKeyword))
  })
}

function buildVisibleProductPatch(
  products: MerchantProductDisplayRecord[],
  keyword: string,
): Pick<MerchantProductsSceneData, 'leftColumnProducts' | 'rightColumnProducts' | 'visibleProductCount' | 'emptyDescription'> {
  const visibleProducts = filterProductsByKeyword(products, keyword)
  const [leftColumnProducts, rightColumnProducts] = buildProductWaterfallColumns(visibleProducts)

  return {
    leftColumnProducts,
    rightColumnProducts,
    visibleProductCount: visibleProducts.length,
    emptyDescription:
      products.length === 0
        ? '暂无可管理商品'
        : visibleProducts.length === 0
          ? '未找到匹配商品'
          : '暂无可管理商品',
  }
}

function buildBatchPhasePatch(
  batchEditPhase: BatchEditPhase,
  selectedCount: number,
): Pick<MerchantProductsSceneData, 'batchEditPhase' | 'batchPhaseLabel' | 'batchPhaseValue'> {
  if (batchEditPhase === 'editing') {
    return {
      batchEditPhase,
      batchPhaseLabel: '批量修改中',
      batchPhaseValue: `已选 ${selectedCount} 件`,
    }
  }

  if (batchEditPhase === 'selecting') {
    return {
      batchEditPhase,
      batchPhaseLabel: '选择商品中',
      batchPhaseValue:
        selectedCount === 0 ? '请选择商品后再次点击批量编辑' : `已选 ${selectedCount} 件，再次点击批量编辑进入修改`,
    }
  }

  return {
    batchEditPhase,
    batchPhaseLabel: '',
    batchPhaseValue: '',
  }
}

function buildEditorSelectionPatch(
  specSizes: ProductSpecSize[],
  layers: MerchantProductLayer[],
  creamTypes: MerchantCreamType[],
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
): Pick<
  MerchantProductsSceneData,
  'productSpecSizes' | 'productLayers' | 'productCreamTypes' | 'productEnabledConfigIdsByTier'
> {
  return {
    productSpecSizes: specSizes,
    productLayers: layers,
    productCreamTypes: creamTypes,
    productEnabledConfigIdsByTier: enabledConfigIdsByTier,
  }
}

function buildBatchSelectionPatch(
  specSizes: ProductSpecSize[],
  layers: MerchantProductLayer[],
  creamTypes: MerchantCreamType[],
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
): Pick<
  MerchantProductsSceneData,
  'batchSpecSizes' | 'batchLayers' | 'batchCreamTypes' | 'batchEnabledConfigIdsByTier'
> {
  return {
    batchSpecSizes: specSizes,
    batchLayers: layers,
    batchCreamTypes: creamTypes,
    batchEnabledConfigIdsByTier: enabledConfigIdsByTier,
  }
}

function buildEmptyConfigAdjustmentInputMap(): Record<string, string> {
  return {}
}

function resolveCompatiblePricingItems(
  pricingSnapshot: MerchantDefaultPricingSnapshot,
  specSizes: ProductSpecSize[],
  layers: MerchantProductLayer[],
  creamTypes: MerchantCreamType[],
): MerchantDefaultPriceConfigItem[] {
  const allowedTiers = new Set(layers.map((layer) => resolveMerchantPriceTierFromLayer(layer)))

  return flattenMerchantDefaultPricingSnapshot(pricingSnapshot).filter((item) => {
    if (!allowedTiers.has(item.tier)) {
      return false
    }

    return isDefaultPricingItemCompatible(item, specSizes, creamTypes)
  })
}

function resolveConfigAdjustmentInput(
  product: MerchantProductRecord | null,
  configItem: MerchantDefaultPriceConfigItem,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
  existingInputMap: Record<string, string>,
): string {
  const existingInput = existingInputMap[configItem.id]
  if (typeof existingInput === 'string') {
    return existingInput
  }

  if (product === null) {
    return '0'
  }

  const totalPrice = resolveMerchantProductConfiguredPrice(product, configItem.id, pricingSnapshot)
  const defaultPrice = resolveMerchantDefaultPriceByConfigId(pricingSnapshot, configItem.id)
  return String(Math.max(totalPrice - defaultPrice, 0))
}

function buildPricingGroups(
  pricingSnapshot: MerchantDefaultPricingSnapshot,
  specSizes: ProductSpecSize[],
  layers: MerchantProductLayer[],
  creamTypes: MerchantCreamType[],
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
  inputMap: Record<string, string>,
  product: MerchantProductRecord | null = null,
): {
  groups: PricingGroupView[]
  nextInputMap: Record<string, string>
  nextEnabledConfigIdsByTier: MerchantEnabledConfigIdsByTier
} {
  const compatibleItems = resolveCompatiblePricingItems(pricingSnapshot, specSizes, layers, creamTypes)
  const tierOrder: MerchantPriceTier[] = ['single', 'double', 'triple']
  const nextInputMap: Record<string, string> = {}
  const nextEnabledConfigIdsByTier = createEmptyEnabledConfigIdsByTier()

  const groups = tierOrder.reduce<PricingGroupView[]>((result, tier) => {
    if (!layers.includes(resolveLayerFromTier(tier))) {
      return result
    }

    const tierItems = compatibleItems.filter((item) => item.tier === tier)
    const selectedConfigIds = new Set(enabledConfigIdsByTier[tier])
    const viewItems = tierItems.map((item) => {
      const adjustmentInput = resolveConfigAdjustmentInput(product, item, pricingSnapshot, inputMap)
      nextInputMap[item.id] = adjustmentInput
      if (selectedConfigIds.has(item.id)) {
        nextEnabledConfigIdsByTier[tier].push(item.id)
      }
      return {
        id: item.id,
        label: item.label,
        basePriceLabel: `基础价 ¥${resolveMerchantDefaultPriceByConfigId(pricingSnapshot, item.id)}`,
        adjustmentInput,
        selected: selectedConfigIds.has(item.id),
      }
    })

    result.push({
      tier,
      title: PRICING_GROUP_LABEL_MAP[tier],
      selectedCount: viewItems.filter((item) => item.selected).length,
      items: viewItems,
    })
    return result
  }, [])

  return {
    groups,
    nextInputMap,
    nextEnabledConfigIdsByTier,
  }
}

function buildConfigAdjustmentMap(
  inputMap: Record<string, string>,
  groups: PricingGroupView[],
  requireSelectionByGroup: boolean,
): { adjustments: MerchantProductConfigAdjustmentMap; missingFields: string[] } {
  const adjustments: MerchantProductConfigAdjustmentMap = {}
  const missingFields: string[] = []

  groups.forEach((group) => {
    const selectedItems = group.items.filter((item) => item.selected)
    if (requireSelectionByGroup && selectedItems.length === 0) {
      missingFields.push(`${group.title}至少选择一项`)
      return
    }

    selectedItems.forEach((item) => {
      const rawInput = (inputMap[item.id] ?? '').trim()
      if (rawInput.length === 0) {
        missingFields.push(`${item.label}加价`)
        return
      }

      const parsedPrice = parseAdjustmentInput(rawInput)
      if (parsedPrice === null) {
        missingFields.push(`${item.label}加价（请输入 0 或正整数）`)
        return
      }

      adjustments[item.id] = parsedPrice
    })
  })

  return {
    adjustments,
    missingFields,
  }
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    activeProducts: [],
    leftColumnProducts: [],
    rightColumnProducts: [],
    recycleProducts: [],
    productSearchKeyword: '',
    visibleProductCount: 0,
    emptyDescription: '暂无可管理商品',
    selectedProductIds: [],
    selectedProductMap: {},
    ...buildBatchPhasePatch('idle', 0),
    batchEditorVisible: false,
    productEditorVisible: false,
    recyclePopupVisible: false,
    productEditorMode: 'create',
    editingProductId: '',
    nextProductIdPreview: 'A001',
    productTitleInput: '',
    productDescriptionInput: '',
    productSpecSizes: ['6-inch'],
    productLayers: ['1-layer'],
    productCreamTypes: ['dairy-cream'],
    productEnabledConfigIdsByTier: createEmptyEnabledConfigIdsByTier(),
    productPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
    productPricingGroups: [],
    productImageUrls: [],
    batchPriceInput: '',
    batchSpecSizes: [],
    batchLayers: [],
    batchCreamTypes: [],
    batchEnabledConfigIdsByTier: createEmptyEnabledConfigIdsByTier(),
    batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
    batchPricingGroups: [],
    specOptions: SPEC_OPTIONS,
    layerOptions: LAYER_OPTIONS,
    creamOptions: CREAM_OPTIONS,
    selectionCircleIcons: [...SELECTION_CIRCLE_ICONS],
    confirmDialogVisible: false,
    confirmDialogTitle: '',
    confirmDialogContent: '',
    confirmDialogConfirmText: '',
    confirmDialogMode: '',
    pendingDeleteProductId: '',
    pendingRecycleDeleteProductId: '',
    confirmDialogReturnToRecycle: false,
    validationDialogVisible: false,
    validationMissingFields: [],
  } as MerchantProductsSceneData,

  lifetimes: {
    attached(): void {
      this.syncProducts()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncProducts()
    },
  },

  methods: {
    syncProducts(): void {
      const now = new Date()
      const pricingSnapshot = loadStoredMerchantDefaultPricing(wx)
      const products = loadStoredMerchantProducts()
      const splitState = splitMerchantProductsByRecycleState(products, now)
      const activeProducts = splitState.activeProducts.map((product) => mapProductToDisplay(product, now, pricingSnapshot))
      const activeIdSet = new Set(activeProducts.map((product) => product.id))
      const selectedProductIds = this.data.selectedProductIds.filter((id) => activeIdSet.has(id))
      const nextBatchPhase =
        this.data.batchEditPhase === 'idle'
          ? 'idle'
          : selectedProductIds.length === 0 && this.data.batchEditorVisible
            ? 'selecting'
            : this.data.batchEditPhase

      this.setData({
        activeProducts,
        recycleProducts: splitState.recycleProducts.map((product) => mapProductToDisplay(product, now, pricingSnapshot)),
        selectedProductIds,
        selectedProductMap: buildSelectedProductMap(selectedProductIds),
        batchEditorVisible: nextBatchPhase === 'editing' && selectedProductIds.length > 0,
        nextProductIdPreview: resolveNextProductIdPreview(splitState.retainedProducts),
        ...buildVisibleProductPatch(activeProducts, this.data.productSearchKeyword),
        ...buildBatchPhasePatch(nextBatchPhase, selectedProductIds.length),
      })
    },

    updateSelectedProductIds(selectedProductIds: string[]): void {
      const activeIdSet = new Set(this.data.activeProducts.map((product) => product.id))
      const nextSelectedProductIds = Array.from(
        new Set(selectedProductIds.filter((productId) => productId.length > 0 && activeIdSet.has(productId))),
      )

      this.setData({
        selectedProductIds: nextSelectedProductIds,
        selectedProductMap: buildSelectedProductMap(nextSelectedProductIds),
        ...buildBatchPhasePatch(this.data.batchEditPhase, nextSelectedProductIds.length),
      })
    },

    refreshProductPricingGroups(product: MerchantProductRecord | null = null): void {
      const pricingSnapshot = loadStoredMerchantDefaultPricing(wx)
      const { groups, nextInputMap, nextEnabledConfigIdsByTier } = buildPricingGroups(
        pricingSnapshot,
        this.data.productSpecSizes,
        this.data.productLayers,
        this.data.productCreamTypes,
        this.data.productEnabledConfigIdsByTier,
        this.data.productPriceAdjustmentInputs,
        product,
      )

      this.setData({
        productPricingGroups: groups,
        productEnabledConfigIdsByTier: nextEnabledConfigIdsByTier,
        productPriceAdjustmentInputs: nextInputMap,
      })
    },

    refreshBatchPricingGroups(): void {
      const pricingSnapshot = loadStoredMerchantDefaultPricing(wx)
      const { groups, nextInputMap, nextEnabledConfigIdsByTier } = buildPricingGroups(
        pricingSnapshot,
        this.data.batchSpecSizes,
        this.data.batchLayers,
        this.data.batchCreamTypes,
        this.data.batchEnabledConfigIdsByTier,
        this.data.batchPriceAdjustmentInputs,
        null,
      )

      this.setData({
        batchPricingGroups: groups,
        batchEnabledConfigIdsByTier: nextEnabledConfigIdsByTier,
        batchPriceAdjustmentInputs: nextInputMap,
      })
    },

    handleProductSearchChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      const productSearchKeyword = parseInputValue(event.detail)
      this.setData({
        productSearchKeyword,
        ...buildVisibleProductPatch(this.data.activeProducts, productSearchKeyword),
      })
    },

    handleClearProductSearch(): void {
      this.setData({
        productSearchKeyword: '',
        ...buildVisibleProductPatch(this.data.activeProducts, ''),
      })
    },

    handleOpenRecyclePopup(): void {
      this.setData({
        recyclePopupVisible: true,
      })
    },

    handleRecyclePopupVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      this.setData({
        recyclePopupVisible: parsePopupVisible(event.detail),
      })
    },

    handleCloseRecyclePopup(): void {
      this.setData({
        recyclePopupVisible: false,
      })
    },

    handleBatchEditTrigger(): void {
      if (this.data.batchEditPhase === 'editing') {
        return
      }

      if (this.data.batchEditPhase === 'idle') {
        this.setData({
          selectedProductIds: [],
          selectedProductMap: {},
          ...buildBatchPhasePatch('selecting', 0),
        })
        return
      }

      if (this.data.selectedProductIds.length === 0) {
        wx.showToast({
          title: '请先勾选商品，再次点击进入批量修改',
          icon: 'none',
        })
        return
      }

      this.setData({
        batchEditorVisible: true,
        batchPriceInput: '',
        ...buildBatchSelectionPatch([], [], [], createEmptyEnabledConfigIdsByTier()),
        batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        batchPricingGroups: [],
        ...buildBatchPhasePatch('editing', this.data.selectedProductIds.length),
      })
      this.refreshBatchPricingGroups()
    },

    handleExitBatchEdit(): void {
      this.setData({
        selectedProductIds: [],
        selectedProductMap: {},
        batchEditorVisible: false,
        batchPriceInput: '',
        ...buildBatchSelectionPatch([], [], [], createEmptyEnabledConfigIdsByTier()),
        batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        batchPricingGroups: [],
        ...buildBatchPhasePatch('idle', 0),
      })
    },

    handleToggleProductSelection(event: WechatMiniprogram.CustomEvent<ProductToggleChangeDetail>): void {
      if (this.data.batchEditPhase === 'idle') {
        return
      }

      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      const checked = event.detail.checked === true
      const selectedIds = checked
        ? [...this.data.selectedProductIds, productId]
        : this.data.selectedProductIds.filter((selectedProductId) => selectedProductId !== productId)

      this.updateSelectedProductIds(selectedIds)
    },

    handleOpenCreateEditor(): void {
      this.setData({
        productEditorVisible: true,
        productEditorMode: 'create',
        editingProductId: '',
        productTitleInput: '',
        productDescriptionInput: '',
        ...buildEditorSelectionPatch(['6-inch'], ['1-layer'], ['dairy-cream'], createEmptyEnabledConfigIdsByTier()),
        productPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        productPricingGroups: [],
        productImageUrls: [],
        validationDialogVisible: false,
        validationMissingFields: [],
      })
      this.refreshProductPricingGroups()
    },

    handleOpenEditEditor(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      const targetProduct = this.data.activeProducts.find((product) => product.id === productId)
      if (targetProduct === undefined) {
        return
      }

      const pricingSnapshot = loadStoredMerchantDefaultPricing(wx)
      const enabledConfigIdsByTier = resolveMerchantProductEnabledConfigIdsByTier(targetProduct, pricingSnapshot)

      this.setData({
        productEditorVisible: true,
        productEditorMode: 'edit',
        editingProductId: targetProduct.id,
        productTitleInput: targetProduct.title,
        productDescriptionInput: targetProduct.description,
        ...buildEditorSelectionPatch(
          targetProduct.specSizes,
          targetProduct.layers,
          targetProduct.creamTypes,
          enabledConfigIdsByTier,
        ),
        productPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        productPricingGroups: [],
        productImageUrls: targetProduct.imageUrls,
        validationDialogVisible: false,
        validationMissingFields: [],
      })
      this.refreshProductPricingGroups(targetProduct)
    },

    handleProductEditorVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      this.setData({
        productEditorVisible: parsePopupVisible(event.detail),
      })
    },

    handleCloseProductEditor(): void {
      this.setData({
        productEditorVisible: false,
      })
    },

    handleCloseValidationDialog(): void {
      this.setData({
        validationDialogVisible: false,
        validationMissingFields: [],
      })
    },

    handleValidationDialogVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      if (parsePopupVisible(event.detail)) {
        return
      }

      this.handleCloseValidationDialog()
    },

    handleConfirmDialogVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      if (parsePopupVisible(event.detail)) {
        return
      }

      this.handleCloseConfirmDialog()
    },

    handleProductTitleChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      this.setData({
        productTitleInput: parseInputValue(event.detail),
      })
    },

    handleProductDescriptionChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      this.setData({
        productDescriptionInput: parseInputValue(event.detail),
      })
    },

    handleProductSpecChange(event: WechatMiniprogram.CustomEvent<ProductSelectionChangeDetail>): void {
      const productSpecSizes = normalizeSpecSizes(event.detail.value)
      this.setData({
        productSpecSizes,
      })
      this.refreshProductPricingGroups()
    },

    handleProductLayerChange(event: WechatMiniprogram.CustomEvent<ProductSelectionChangeDetail>): void {
      this.setData({
        productLayers: normalizeLayers(event.detail.value),
      })
      this.refreshProductPricingGroups()
    },

    handleProductCreamChange(event: WechatMiniprogram.CustomEvent<{ value?: unknown }>): void {
      this.setData({
        productCreamTypes: normalizeCreamTypeSelection(event.detail.value),
      })
      this.refreshProductPricingGroups()
    },

    handleToggleAllSpecSizes(): void {
      this.setData({
        productSpecSizes: this.data.productSpecSizes.length === SPEC_OPTIONS.length ? [] : SPEC_OPTIONS.map((item) => item.value),
      })
      this.refreshProductPricingGroups()
    },

    handleToggleAllLayers(): void {
      this.setData({
        productLayers: this.data.productLayers.length === LAYER_OPTIONS.length ? [] : LAYER_OPTIONS.map((item) => item.value),
      })
      this.refreshProductPricingGroups()
    },

    handleToggleAllCreamTypes(): void {
      this.setData({
        productCreamTypes: this.data.productCreamTypes.length === CREAM_OPTIONS.length ? [] : CREAM_OPTIONS.map((item) => item.value),
      })
      this.refreshProductPricingGroups()
    },

    handleToggleTierConfigItem(event: WechatMiniprogram.CustomEvent<ProductToggleChangeDetail>): void {
      const dataset = event.currentTarget.dataset as ConfigPriceInputDataset
      const tier = dataset.tier
      const configId = dataset.configId
      if (
        (tier !== 'single' && tier !== 'double' && tier !== 'triple') ||
        typeof configId !== 'string' ||
        configId.length === 0
      ) {
        return
      }

      this.setData({
        productEnabledConfigIdsByTier: updateEnabledConfigIdsByTier(
          this.data.productEnabledConfigIdsByTier,
          tier,
          configId,
          event.detail.checked === true,
        ),
      })
      this.refreshProductPricingGroups()
    },

    handleProductConfigPriceChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      const configId = (event.currentTarget.dataset as ConfigPriceInputDataset).configId
      if (typeof configId !== 'string' || configId.length === 0) {
        return
      }

      this.setData({
        productPriceAdjustmentInputs: {
          ...this.data.productPriceAdjustmentInputs,
          [configId]: parseInputValue(event.detail),
        },
      })
    },

    handleChooseProductImage(): void {
      wx.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result: ChooseMediaSuccessCallbackResult): void => {
          const nextImageUrls = normalizeImageUrls(
            result.tempFiles.map((file) => file.tempFilePath).filter((filePath) => filePath.length > 0),
          )
          if (nextImageUrls.length === 0) {
            return
          }

          this.setData({
            productImageUrls: normalizeImageUrls([...this.data.productImageUrls, ...nextImageUrls]).slice(0, 9),
          })
        },
      })
    },

    handlePreviewProductImage(event: WechatMiniprogram.BaseEvent): void {
      const imageIndex = (event.currentTarget.dataset as ProductImageDataset).imageIndex
      if (typeof imageIndex !== 'number') {
        return
      }

      const currentImageUrl = this.data.productImageUrls[imageIndex]
      if (typeof currentImageUrl !== 'string' || currentImageUrl.length === 0 || this.data.productImageUrls.length === 0) {
        return
      }

      wx.previewImage({
        current: currentImageUrl,
        urls: this.data.productImageUrls,
      })
    },

    handleRemoveProductImage(event: WechatMiniprogram.BaseEvent): void {
      const imageIndex = (event.currentTarget.dataset as ProductImageDataset).imageIndex
      if (typeof imageIndex !== 'number') {
        return
      }

      this.setData({
        productImageUrls: this.data.productImageUrls.filter((_, index) => index !== imageIndex),
      })
    },

    handleSetPrimaryProductImage(event: WechatMiniprogram.BaseEvent): void {
      const imageIndex = (event.currentTarget.dataset as ProductImageDataset).imageIndex
      if (typeof imageIndex !== 'number') {
        return
      }

      const targetImageUrl = this.data.productImageUrls[imageIndex]
      if (typeof targetImageUrl !== 'string' || targetImageUrl.length === 0) {
        return
      }

      const nextImageUrls = [
        targetImageUrl,
        ...this.data.productImageUrls.filter((imageUrl, index) => index !== imageIndex && imageUrl !== targetImageUrl),
      ]

      this.setData({
        productImageUrls: nextImageUrls,
      })
    },

    collectMissingRequiredFields(): { missingFields: string[]; draftInput: MerchantProductDraftInput | null } {
      const title = this.data.productTitleInput.trim()
      const description = this.data.productDescriptionInput.trim()
      const missingFields: string[] = []

      if (title.length === 0) {
        missingFields.push('商品名称')
      }

      if (this.data.productImageUrls.length === 0) {
        missingFields.push('商品图片')
      }

      if (this.data.productSpecSizes.length === 0) {
        missingFields.push('规格多选')
      }

      if (this.data.productLayers.length === 0) {
        missingFields.push('层数选择')
      }

      if (this.data.productCreamTypes.length === 0) {
        missingFields.push('奶油类型')
      }

      if (this.data.productPricingGroups.length === 0) {
        missingFields.push('默认价格配置')
      }

      const configAdjustments = buildConfigAdjustmentMap(
        this.data.productPriceAdjustmentInputs,
        this.data.productPricingGroups,
        true,
      )

      missingFields.push(...configAdjustments.missingFields)

      if (missingFields.length > 0) {
        return {
          missingFields: Array.from(new Set(missingFields)),
          draftInput: null,
        }
      }

      return {
        missingFields: [],
        draftInput: {
          title,
          description,
          specSizes: this.data.productSpecSizes,
          layers: this.data.productLayers,
          creamTypes: this.data.productCreamTypes,
          creamType: this.data.productCreamTypes[0] ?? 'dairy-cream',
          enabledConfigIdsByTier: this.data.productEnabledConfigIdsByTier,
          priceAdjustmentsByConfigId: configAdjustments.adjustments,
          sizePriceAdjustments: {},
          layerPriceAdjustments: {},
          creamPriceAdjustments: {},
          imageUrls: this.data.productImageUrls,
          coverImage: this.data.productImageUrls[0] ?? '',
        },
      }
    },

    handleSaveProduct(): void {
      const { missingFields, draftInput } = this.collectMissingRequiredFields()
      if (missingFields.length > 0 || draftInput === null) {
        this.setData({
          validationDialogVisible: true,
          validationMissingFields: missingFields,
        })
        return
      }

      if (this.data.productEditorMode === 'create') {
        createMerchantProduct(wx, draftInput)
      } else {
        updateMerchantProduct(wx, this.data.editingProductId, draftInput)
      }

      this.setData({
        productEditorVisible: false,
      })

      this.syncProducts()
      wx.showToast({
        title: this.data.productEditorMode === 'create' ? '已新增商品' : '已更新商品',
        icon: 'success',
      })
    },

    handleDeleteProduct(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      this.setData({
        confirmDialogVisible: true,
        confirmDialogMode: 'delete-product',
        confirmDialogTitle: '删除商品',
        confirmDialogContent: '删除后商品会进入回收站，可在 7 天内恢复。',
        confirmDialogConfirmText: '确认删除',
        pendingDeleteProductId: productId,
        confirmDialogReturnToRecycle: false,
      })
    },

    handleDeleteRecycleProductPermanently(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      this.setData({
        recyclePopupVisible: false,
        confirmDialogVisible: true,
        confirmDialogMode: 'delete-recycle-product',
        confirmDialogTitle: '永久删除商品',
        confirmDialogContent: '永久删除后无法恢复，回收站中的该商品会被彻底清除。',
        confirmDialogConfirmText: '永久删除',
        pendingRecycleDeleteProductId: productId,
        confirmDialogReturnToRecycle: true,
      })
    },

    handleCloseConfirmDialog(): void {
      const shouldReturnToRecycle =
        this.data.confirmDialogReturnToRecycle && this.data.confirmDialogMode === 'delete-recycle-product'

      this.setData({
        confirmDialogVisible: false,
        confirmDialogMode: '',
        confirmDialogTitle: '',
        confirmDialogContent: '',
        confirmDialogConfirmText: '',
        pendingDeleteProductId: '',
        pendingRecycleDeleteProductId: '',
        confirmDialogReturnToRecycle: false,
        recyclePopupVisible: shouldReturnToRecycle,
      })
    },

    handleConfirmProductDialog(): void {
      if (this.data.confirmDialogMode === 'delete-product' && this.data.pendingDeleteProductId) {
        const productId = this.data.pendingDeleteProductId
        deleteMerchantProduct(wx, productId)
        this.syncProducts()
        wx.showToast({
          title: '已将商品移至回收站',
          icon: 'none',
        })
        this.handleCloseConfirmDialog()
        return
      }

      if (this.data.confirmDialogMode === 'delete-recycle-product' && this.data.pendingRecycleDeleteProductId) {
        deleteRecycledMerchantProduct(wx, this.data.pendingRecycleDeleteProductId)
        this.syncProducts()
        wx.showToast({
          title: '已永久删除商品',
          icon: 'none',
        })
      }

      this.handleCloseConfirmDialog()
    },

    handleBatchEditorVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      const visible = parsePopupVisible(event.detail)
      if (!visible) {
        this.setData({
          batchEditorVisible: false,
          batchPriceInput: '',
          ...buildBatchSelectionPatch([], [], [], createEmptyEnabledConfigIdsByTier()),
          batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
          batchPricingGroups: [],
          ...buildBatchPhasePatch('selecting', this.data.selectedProductIds.length),
        })
        return
      }

      this.setData({
        batchEditorVisible: true,
        ...buildBatchPhasePatch('editing', this.data.selectedProductIds.length),
      })
    },

    handleCloseBatchEditor(): void {
      this.setData({
        batchEditorVisible: false,
        batchPriceInput: '',
        ...buildBatchSelectionPatch([], [], [], createEmptyEnabledConfigIdsByTier()),
        batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        batchPricingGroups: [],
        ...buildBatchPhasePatch('selecting', this.data.selectedProductIds.length),
      })
    },

    handleBatchPriceChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      this.setData({
        batchPriceInput: parseInputValue(event.detail),
      })
    },

    handleBatchSpecChange(event: WechatMiniprogram.CustomEvent<ProductSelectionChangeDetail>): void {
      this.setData({
        batchSpecSizes: normalizeSpecSizes(event.detail.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleBatchLayerChange(event: WechatMiniprogram.CustomEvent<ProductSelectionChangeDetail>): void {
      this.setData({
        batchLayers: normalizeLayers(event.detail.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleBatchCreamChange(event: WechatMiniprogram.CustomEvent<{ value?: unknown }>): void {
      this.setData({
        batchCreamTypes: normalizeCreamTypeSelection(event.detail.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleToggleAllBatchSpecSizes(): void {
      this.setData({
        batchSpecSizes: this.data.batchSpecSizes.length === SPEC_OPTIONS.length ? [] : SPEC_OPTIONS.map((item) => item.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleToggleAllBatchLayers(): void {
      this.setData({
        batchLayers: this.data.batchLayers.length === LAYER_OPTIONS.length ? [] : LAYER_OPTIONS.map((item) => item.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleToggleAllBatchCreamTypes(): void {
      this.setData({
        batchCreamTypes: this.data.batchCreamTypes.length === CREAM_OPTIONS.length ? [] : CREAM_OPTIONS.map((item) => item.value),
      })
      this.refreshBatchPricingGroups()
    },

    handleToggleBatchTierConfigItem(event: WechatMiniprogram.CustomEvent<ProductToggleChangeDetail>): void {
      const dataset = event.currentTarget.dataset as ConfigPriceInputDataset
      const tier = dataset.tier
      const configId = dataset.configId
      if (
        (tier !== 'single' && tier !== 'double' && tier !== 'triple') ||
        typeof configId !== 'string' ||
        configId.length === 0
      ) {
        return
      }

      this.setData({
        batchEnabledConfigIdsByTier: updateEnabledConfigIdsByTier(
          this.data.batchEnabledConfigIdsByTier,
          tier,
          configId,
          event.detail.checked === true,
        ),
      })
      this.refreshBatchPricingGroups()
    },

    handleBatchConfigPriceChange(event: WechatMiniprogram.CustomEvent<ProductInputDetail>): void {
      const configId = (event.currentTarget.dataset as ConfigPriceInputDataset).configId
      if (typeof configId !== 'string' || configId.length === 0) {
        return
      }

      this.setData({
        batchPriceAdjustmentInputs: {
          ...this.data.batchPriceAdjustmentInputs,
          [configId]: parseInputValue(event.detail),
        },
      })
    },

    handleApplyBatchEdit(): void {
      if (this.data.selectedProductIds.length === 0) {
        wx.showToast({
          title: '请先勾选商品',
          icon: 'none',
        })
        return
      }

      const priceText = this.data.batchPriceInput.trim()
      const hasPricePatch = priceText.length > 0
      const parsedPrice = hasPricePatch ? parsePriceInput(priceText) : null
      if (hasPricePatch && parsedPrice === null) {
        wx.showToast({
          title: '统一价格格式无效',
          icon: 'none',
        })
        return
      }

      const hasSpecPatch = this.data.batchSpecSizes.length > 0
      const hasLayerPatch = this.data.batchLayers.length > 0
      const batchCreamTypes = this.data.batchCreamTypes
      const hasCreamPatch = batchCreamTypes.length > 0
      const hasEnabledConfigPatch = hasEnabledConfigIds(this.data.batchEnabledConfigIdsByTier)
      const configAdjustments = buildConfigAdjustmentMap(
        this.data.batchPriceAdjustmentInputs,
        this.data.batchPricingGroups,
        false,
      )
      const hasConfigAdjustmentPatch = Object.keys(configAdjustments.adjustments).length > 0

      if (configAdjustments.missingFields.length > 0) {
        wx.showToast({
          title: '请补全已选项对应加价',
          icon: 'none',
        })
        return
      }

      if (
        !hasPricePatch &&
        !hasSpecPatch &&
        !hasLayerPatch &&
        !hasCreamPatch &&
        !hasEnabledConfigPatch &&
        !hasConfigAdjustmentPatch
      ) {
        wx.showToast({
          title: '请至少选择一项修改内容',
          icon: 'none',
        })
        return
      }

      const batchInput: MerchantProductBatchEditInput = {
        productIds: this.data.selectedProductIds,
      }

      if (hasPricePatch && parsedPrice !== null) {
        batchInput.basePrice = parsedPrice
      }

      if (hasSpecPatch) {
        batchInput.specSizes = this.data.batchSpecSizes
      }

      if (hasLayerPatch) {
        batchInput.layers = this.data.batchLayers
      }

      if (hasCreamPatch) {
        batchInput.creamTypes = batchCreamTypes
        batchInput.creamType = batchCreamTypes[0]
      }

      if (hasEnabledConfigPatch) {
        batchInput.enabledConfigIdsByTier = this.data.batchEnabledConfigIdsByTier
      }

      if (hasConfigAdjustmentPatch) {
        batchInput.priceAdjustmentsByConfigId = configAdjustments.adjustments
      }

      batchEditMerchantProducts(wx, batchInput)
      this.setData({
        batchEditorVisible: false,
        selectedProductIds: [],
        selectedProductMap: {},
        batchPriceInput: '',
        ...buildBatchSelectionPatch([], [], [], createEmptyEnabledConfigIdsByTier()),
        batchPriceAdjustmentInputs: buildEmptyConfigAdjustmentInputMap(),
        batchPricingGroups: [],
        ...buildBatchPhasePatch('idle', 0),
      })

      this.syncProducts()
      wx.showToast({
        title: '批量修改完成',
        icon: 'success',
      })
    },

    handleRestoreProduct(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      restoreMerchantProduct(wx, productId)
      this.syncProducts()
      wx.showToast({
        title: '已恢复商品',
        icon: 'success',
      })
    },
  },
})
