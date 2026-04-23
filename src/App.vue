<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { initCloudBase, checkEnvironment } from "./utils/cloudbase";
import './styles/tailwind-generated.css'

onLaunch(async () => {
  console.log("App Launch");

  // 检查云开发环境配置
  if (checkEnvironment()) {
    try {
      // 初始化云开发
      const success = await initCloudBase();
      if (success) {
        console.log("云开发初始化成功");
      } else {
        console.warn("云开发初始化失败");
      }
    } catch (error) {
      console.error("云开发初始化异常:", error);
    }
  } else {
    console.warn("云开发环境ID未配置，请在 src/utils/cloudbase.ts 中配置");
  }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* Global styles are defined in src/styles/global.scss */
</style>
