import type { MerchantInventoryRecord } from '../../../types/merchant-inventory'
import type { OrderRecord } from '../../../types/order'
import { loadStoredCustomerOrders } from '../../utils/customer-order-storage'
import {
  buildMerchantFundLedger,
  resolveFundRecordDateLabel,
  type MerchantFundLedgerPoint,
  type MerchantFundLedgerRecordItem,
  type MerchantFundRangeMode,
} from '../../utils/merchant-fund-ledger'
import { loadStoredMerchantInventoryRecords } from '../../utils/merchant-inventory-storage'

interface MerchantFundChartSegment {
  left: string
  top: string
  width: string
  rotateDeg: string
  color: string
}

interface MerchantFundChartDot {
  key: string
  left: string
  top: string
  color: string
}

interface MerchantAccountBookRecordDisplay extends MerchantFundLedgerRecordItem {
  amountLabel: string
  dateLabel: string
}

interface MerchantAccountBookSceneData {
  rangeMode: MerchantFundRangeMode
  totalIncome: number
  totalExpense: number
  netIncome: number
  incomeSegments: MerchantFundChartSegment[]
  expenseSegments: MerchantFundChartSegment[]
  incomeDots: MerchantFundChartDot[]
  expenseDots: MerchantFundChartDot[]
  chartMax: number
  chartMid: number
  xLabels: string[]
  selectedPointKey: string
  selectedPointLabel: string
  selectedPointIncome: number
  selectedPointExpense: number
  selectedPointNet: number
  pointDetails: MerchantFundPointDetail[]
  records: MerchantAccountBookRecordDisplay[]
}

interface RangeButtonEventDataset {
  mode?: unknown
}

interface ChartPointEventDataset {
  key?: unknown
}

interface MerchantFundPointDetail {
  key: string
  label: string
  income: number
  expense: number
}

const CHART_LEFT_PADDING = 4
const CHART_RIGHT_PADDING = 4
const CHART_TOP_PADDING = 8
const CHART_BOTTOM_PADDING = 10

function resolveRangeMode(rawValue: unknown): MerchantFundRangeMode | null {
  if (rawValue === 'day' || rawValue === 'week' || rawValue === 'month') {
    return rawValue
  }

  return null
}

function resolveChartCoordinates(values: number[], maxValue: number): Array<{ x: number; y: number }> {
  const usableWidth = 100 - CHART_LEFT_PADDING - CHART_RIGHT_PADDING
  const usableHeight = 100 - CHART_TOP_PADDING - CHART_BOTTOM_PADDING

  return values.map((value, index) => {
    const ratio = values.length <= 1 ? 0 : index / (values.length - 1)
    const x = CHART_LEFT_PADDING + usableWidth * ratio
    const y = CHART_TOP_PADDING + usableHeight - (value / Math.max(maxValue, 1)) * usableHeight

    return {
      x,
      y,
    }
  })
}

function resolveChartSegments(
  coordinates: Array<{ x: number; y: number }>,
  color: string,
): MerchantFundChartSegment[] {
  if (coordinates.length < 2) {
    return []
  }

  return coordinates.slice(0, -1).map((point, index) => {
    const nextPoint = coordinates[index + 1]
    const dx = nextPoint.x - point.x
    const dy = nextPoint.y - point.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI

    return {
      left: `${point.x}%`,
      top: `${point.y}%`,
      width: `${distance}%`,
      rotateDeg: `${rotateDeg}deg`,
      color,
    }
  })
}

function resolveChartDots(
  points: MerchantFundLedgerPoint[],
  coordinates: Array<{ x: number; y: number }>,
  color: string,
): MerchantFundChartDot[] {
  return coordinates.map((point, index) => ({
    key: points[index]?.key ?? '',
    left: `${point.x}%`,
    top: `${point.y}%`,
    color,
  }))
}

function mapLedgerRecord(record: MerchantFundLedgerRecordItem): MerchantAccountBookRecordDisplay {
  const symbol = record.type === 'income' ? '+' : '-'

  return {
    ...record,
    amountLabel: `${symbol} ¥${record.amount}`,
    dateLabel: resolveFundRecordDateLabel(record.occurredAt),
  }
}

function resolvePointDetails(points: MerchantFundLedgerPoint[]): MerchantFundPointDetail[] {
  return points.map((point) => ({
    key: point.key,
    label: point.label,
    income: point.income,
    expense: point.expense,
  }))
}

function resolveDefaultSelectedPointKey(points: MerchantFundPointDetail[]): string {
  const lastNonZeroPoint = [...points].reverse().find((point) => point.income > 0 || point.expense > 0)
  if (lastNonZeroPoint !== undefined) {
    return lastNonZeroPoint.key
  }

  return points[points.length - 1]?.key ?? ''
}

function resolveSelectedPoint(points: MerchantFundPointDetail[], pointKey: string): MerchantFundPointDetail | null {
  if (pointKey.length === 0) {
    return null
  }

  return points.find((point) => point.key === pointKey) ?? null
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    rangeMode: 'day',
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
    incomeSegments: [],
    expenseSegments: [],
    incomeDots: [],
    expenseDots: [],
    chartMax: 0,
    chartMid: 0,
    xLabels: [],
    selectedPointKey: '',
    selectedPointLabel: '',
    selectedPointIncome: 0,
    selectedPointExpense: 0,
    selectedPointNet: 0,
    pointDetails: [],
    records: [],
  } as MerchantAccountBookSceneData,

  lifetimes: {
    attached(): void {
      this.syncLedger()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncLedger()
    },
  },

  methods: {
    loadOrders(): OrderRecord[] {
      return loadStoredCustomerOrders()
    },

    loadInventoryRecords(): MerchantInventoryRecord[] {
      return loadStoredMerchantInventoryRecords()
    },

    syncLedger(rangeMode?: MerchantFundRangeMode): void {
      const currentRangeMode = rangeMode ?? this.data.rangeMode
      const ledger = buildMerchantFundLedger(this.loadOrders(), this.loadInventoryRecords(), currentRangeMode)
      const pointDetails = resolvePointDetails(ledger.points)
      const maxValue = Math.max(1, ...ledger.points.map((point) => point.income), ...ledger.points.map((point) => point.expense))
      const incomeCoordinates = resolveChartCoordinates(
        ledger.points.map((point) => point.income),
        maxValue,
      )
      const expenseCoordinates = resolveChartCoordinates(
        ledger.points.map((point) => point.expense),
        maxValue,
      )
      const selectedPointKey = resolveSelectedPoint(pointDetails, this.data.selectedPointKey) === null
        ? resolveDefaultSelectedPointKey(pointDetails)
        : this.data.selectedPointKey
      const selectedPoint = resolveSelectedPoint(pointDetails, selectedPointKey)

      this.setData({
        rangeMode: currentRangeMode,
        totalIncome: ledger.totalIncome,
        totalExpense: ledger.totalExpense,
        netIncome: ledger.netIncome,
        incomeSegments: resolveChartSegments(incomeCoordinates, '#ff8b6b'),
        expenseSegments: resolveChartSegments(expenseCoordinates, '#d16f7a'),
        incomeDots: resolveChartDots(ledger.points, incomeCoordinates, '#ff8b6b'),
        expenseDots: resolveChartDots(ledger.points, expenseCoordinates, '#d16f7a'),
        chartMax: maxValue,
        chartMid: Math.floor(maxValue / 2),
        xLabels: ledger.points.map((point) => point.label),
        selectedPointKey,
        selectedPointLabel: selectedPoint?.label ?? '',
        selectedPointIncome: selectedPoint?.income ?? 0,
        selectedPointExpense: selectedPoint?.expense ?? 0,
        selectedPointNet: (selectedPoint?.income ?? 0) - (selectedPoint?.expense ?? 0),
        pointDetails,
        records: ledger.records.map(mapLedgerRecord),
      })
    },

    handleRangeModeChange(event: WechatMiniprogram.BaseEvent): void {
      const nextMode = resolveRangeMode((event.currentTarget.dataset as RangeButtonEventDataset).mode)
      if (nextMode === null || nextMode === this.data.rangeMode) {
        return
      }

      this.syncLedger(nextMode)
    },

    handleChartPointTap(event: WechatMiniprogram.BaseEvent): void {
      const pointKey = (event.currentTarget.dataset as ChartPointEventDataset).key
      if (typeof pointKey !== 'string' || pointKey.length === 0 || pointKey === this.data.selectedPointKey) {
        return
      }

      const point = resolveSelectedPoint(this.data.pointDetails, pointKey)
      if (point === null) {
        return
      }

      this.setData({
        selectedPointKey: point.key,
        selectedPointLabel: point.label,
        selectedPointIncome: point.income,
        selectedPointExpense: point.expense,
        selectedPointNet: point.income - point.expense,
      })
    },
  },
})
