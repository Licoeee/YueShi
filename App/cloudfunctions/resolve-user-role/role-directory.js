const DEFAULT_ROLE_DIRECTORY = {
  admins: [],
  merchants: [],
}

function normalizeOpenId(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }

  const openId = rawValue.trim()
  if (openId.length === 0) {
    return null
  }

  return openId
}

function normalizeShopName(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }

  const shopName = rawValue.trim()
  if (shopName.length === 0) {
    return null
  }

  return shopName
}

function pickRoleDirectoryDocument(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return null
  }

  const defaultDocument = documents.find((item) => item && item._id === 'default')
  if (defaultDocument !== undefined) {
    return defaultDocument
  }

  return documents[0] || null
}

function parseRoleDirectory(rawValue) {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return DEFAULT_ROLE_DIRECTORY
  }

  const admins = Array.isArray(rawValue.admins)
    ? Array.from(new Set(rawValue.admins.map(normalizeOpenId).filter((value) => value !== null)))
    : []

  const merchants = Array.isArray(rawValue.merchants)
    ? rawValue.merchants
        .map((item) => {
          if (typeof item !== 'object' || item === null) {
            return null
          }

          const openId = normalizeOpenId(item.openId)
          const shopName = normalizeShopName(item.shopName)
          if (openId === null || shopName === null) {
            return null
          }

          return {
            openId,
            shopName,
          }
        })
        .filter((value) => value !== null)
    : []

  return {
    admins,
    merchants,
  }
}

module.exports = {
  normalizeOpenId,
  pickRoleDirectoryDocument,
  parseRoleDirectory,
}
