const cloud = require('wx-server-sdk')
const {
  normalizeOpenId,
  parseRoleDirectory,
  pickRoleDirectoryDocument,
} = require('./role-directory')

const ROLE_DIRECTORY_COLLECTION = 'role_directory'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

async function readRoleDirectory() {
  const db = cloud.database()
  const response = await db
    .collection(ROLE_DIRECTORY_COLLECTION)
    .limit(20)
    .get()

  return parseRoleDirectory(pickRoleDirectoryDocument(response.data))
}

exports.main = async () => {
  const context = cloud.getWXContext()
  const openId = normalizeOpenId(context.OPENID)
  if (openId === null) {
    return {
      openId: '',
      role: 'customer',
    }
  }

  const directory = await readRoleDirectory()
  if (directory.admins.includes(openId)) {
    return {
      openId,
      role: 'admin',
    }
  }

  const merchant = directory.merchants.find((item) => item.openId === openId)
  if (merchant !== undefined) {
    return {
      openId,
      role: 'merchant',
      merchantName: merchant.shopName,
    }
  }

  return {
    openId,
    role: 'customer',
  }
}
