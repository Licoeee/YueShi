export const CUSTOMER_IMAGE_PLACEHOLDER = '/assets/images/placeholders/cake-default.png'

export function resolveCakeImageUrl(rawUrl: string | null | undefined): string {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return CUSTOMER_IMAGE_PLACEHOLDER
  }

  if (rawUrl.startsWith('/assets/')) {
    return rawUrl
  }

  return CUSTOMER_IMAGE_PLACEHOLDER
}
