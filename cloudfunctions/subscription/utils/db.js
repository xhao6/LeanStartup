// cloudfunctions/subscription/utils/db.js
const tcb = require('@cloudbase/node-sdk')

let _db = null
let _app = null

function getApp() {
  if (!_app) {
    _app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  }
  return _app
}

function getDb() {
  if (!_db) {
    _db = getApp().database()
  }
  return _db
}

function collection(name) {
  return getDb().collection(name)
}

module.exports = { getApp, getDb, collection }
