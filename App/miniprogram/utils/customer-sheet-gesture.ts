export interface DetailLiftGestureInput {
  startY: number
  endY: number
  threshold: number
}

export function shouldLiftToDetail(input: DetailLiftGestureInput): boolean {
  const deltaY = input.endY - input.startY

  return deltaY <= input.threshold * -1
}
