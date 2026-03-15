export type SwipeDirection = '' | 'horizontal' | 'vertical'
export type SwipeEndState = 'open' | 'closed'

export interface GetSwipeDirectionInput {
  deltaX: number
  deltaY: number
  minDistance?: number
}

export interface ResolveSwipeOffsetInput {
  startOffset: number
  deltaX: number
  actionWidth: number
}

export interface ResolveSwipeEndStateInput {
  startOffset: number
  offset: number
  actionWidth: number
  thresholdRatio?: number
}

const DEFAULT_MIN_DISTANCE = 10
const DEFAULT_THRESHOLD_RATIO = 0.3

export function getSwipeDirection(input: GetSwipeDirectionInput): SwipeDirection {
  const minDistance = input.minDistance ?? DEFAULT_MIN_DISTANCE
  const offsetX = Math.abs(input.deltaX)
  const offsetY = Math.abs(input.deltaY)

  if (offsetX > offsetY && offsetX > minDistance) {
    return 'horizontal'
  }

  if (offsetY > offsetX && offsetY > minDistance) {
    return 'vertical'
  }

  return ''
}

export function clampSwipeOffset(offset: number, actionWidth: number): number {
  return Math.min(Math.max(offset, 0), Math.max(actionWidth, 0))
}

export function resolveSwipeOffset(input: ResolveSwipeOffsetInput): number {
  return clampSwipeOffset(input.startOffset - input.deltaX, input.actionWidth)
}

export function resolveSwipeEndState(input: ResolveSwipeEndStateInput): SwipeEndState {
  const actionWidth = Math.max(input.actionWidth, 0)
  const thresholdRatio = input.thresholdRatio ?? DEFAULT_THRESHOLD_RATIO

  if (actionWidth === 0) {
    return 'closed'
  }

  if (input.startOffset >= actionWidth) {
    return input.offset >= actionWidth * (1 - thresholdRatio) ? 'open' : 'closed'
  }

  return input.offset > actionWidth * thresholdRatio ? 'open' : 'closed'
}
