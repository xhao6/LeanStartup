# 云端云函数清理指南

## 待删除的云函数

**函数名**: `syncCaseData`

**原因**: 已弃用，使用 `syncCaseDataPublic` 代替

## 手动删除步骤

### 方式一：CloudBase 控制台删除

1. 打开 [CloudBase 控制台 - 云函数](https://tcb.cloud.tencent.com/dev?envId=lean-startup-d2gkuop3af0aed5c0#/scf)
2. 找到 `syncCaseData` 函数
3. 点击函数名称进入详情页
4. 点击"删除"按钮
5. 确认删除

### 方式二：使用腾讯云 SCF 控制台

1. 打开 [云函数控制台](https://console.cloud.tencent.com/scf)
2. 选择命名空间：`lean-startup-d2gkuop3af0aed5c0`
3. 找到 `syncCaseData` 函数
4. 点击"删除"按钮
5. 确认删除

## 删除后验证

```bash
# 查询云函数列表
npx tcb fn list

# 或使用 CloudBase CLI
tcb functions list
```

确认列表中不再包含 `syncCaseData`。

## 相关文件清理

本地代码已删除：
- ✅ `cloudfunctions/syncCaseData/` 
- ✅ `_shared/copy-shared.js` 中的引用

## 替代方案

数据同步请使用：
- **syncCaseDataPublic** - 外部脚本数据同步
- 支持批量导入、数据修复、运维脚本
