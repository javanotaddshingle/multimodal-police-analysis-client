// 案件编号展示工具

/**
 * 将后端返回的 case_id（原始案件名称 + "_" + 16 位小写十六进制唯一后缀）
 * 转换为仅含案件名称的展示文本。
 * 旧数据（无后缀）原样返回；空值返回空字符串。
 */
export function displayCaseName(caseId: string | null | undefined): string {
  if (!caseId) return ''
  return String(caseId).replace(/_[0-9a-f]{16}$/, '')
}
