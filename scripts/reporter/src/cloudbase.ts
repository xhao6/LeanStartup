import cloudbase from "@cloudbase/node-sdk"
import { config } from "./config.js"

let _app: ReturnType<typeof cloudbase.init> | null = null

export function getCloudBase() {
  if (!_app) {
    _app = cloudbase.init({
      env: config.ENV_ID,
      secretId: config.SECRET_ID,
      secretKey: config.SECRET_KEY,
    })
  }
  return _app
}

export function getDatabase() {
  return getCloudBase().database()
}
