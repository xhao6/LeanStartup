// cloudfunctions/subscription/utils/response.js
function success(data) {
  return { success: true, data }
}

function error(message, code = 'INTERNAL_ERROR') {
  return { success: false, error: message, code }
}

module.exports = { success, error }
