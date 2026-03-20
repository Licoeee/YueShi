const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

function normalizeText(rawValue) {
  if (typeof rawValue !== 'string') {
    return ''
  }

  return rawValue.trim()
}

function createSessionTicket(openId, loginAt) {
  const randomPart = Math.random().toString(36).slice(2, 12)
  return `${openId}.${loginAt}.${randomPart}`
}

exports.main = async (event = {}) => {
  const context = cloud.getWXContext()
  const openId = normalizeText(context.OPENID)
  const loginCode = normalizeText(event.loginCode)
  const loginAt = Date.now()

  if (openId.length === 0 || loginCode.length === 0) {
    return {
      openId: '',
      sessionTicket: '',
      loginAt,
    }
  }

  return {
    openId,
    sessionTicket: createSessionTicket(openId, loginAt),
    loginAt,
  }
}
