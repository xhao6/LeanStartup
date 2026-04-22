// cloudfunctions/_shared/response.js

function success(data) {
  return { success: true, data }
}

function error(message, code) {
  return { success: false, error: message, code: code || 'UNKNOWN' }
}

module.exports = { success, error }
