
---

## 最新进展 (2026-04-23 更新)

### 方案 6：使用 weapp-tailwindcss Vite 插件 ❌ 失败

**操作**：
```typescript
import { UnifiedViteWeappTailwindcssPlugin } from "weapp-tailwindcss/vite";

export default defineConfig({
  plugins: [
    uni(),
    UnifiedViteWeappTailwindcssPlugin(),
  ],
});
```

**结果**：插件加载成功，构建无报错，但 Tailwind 类未被处理。

**原因分析**：
- UniApp 的构建流程可能绕过了 Vite 的 CSS 处理阶段
- weapp-tailwindcss 的 Vite 插件与 UniApp 的 uni() 插件存在冲突

### 方案 7：使用 weapp-tailwindcss CLI ❌ 未测试

weapp-tailwindcss v3 提供 CLI 工具 `weapp-tw`：
```bash
npx weapp-tw input.css -o output.wxss
```

**状态**：理论上可行，但需要修改构建流程

---

## 最终结论

### 推荐方案：放弃 Tailwind CSS，改用纯 SCSS + 内联样式

**理由**：
1. **兼容性**：Tailwind CSS 的 JIT 模式与微信小程序 WXSS 存在根本性冲突
2. **复杂性**：weapp-tailwindcss 需要与多个构建工具链协同工作
3. **维护成本**：版本更新可能导致重新配置

**替代方案**：
1. 使用 SCSS 定义语义化样式类
2. 使用内联 `style` 属性处理动态值
3. 利用 Tailwind 的语义化配置（colors, spacing 等）指导 SCSS 变量定义

### 工作量评估

| 任务 | 预估时间 |
|------|---------|
| 将所有 Tailwind 类转换为 SCSS 类或内联样式 | 2-4 小时 |
| 移除 Tailwind 依赖 | 1 小时 |
| 测试验证 | 1 小时 |

---

## 下一步决策

请确认：
1. 是否接受放弃 Tailwind CSS，改用纯 SCSS？
2. 还是希望继续尝试其他 Tailwind 兼容方案？
