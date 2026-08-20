<script lang="ts">
interface InputItem {
  type: string;
  content: string;
  timestamp: string;
  file_name: string;
  file_path: string;
}
// 定义输入数据结构


import { Base64 } from 'js-base64';
import axios from 'axios';
import { ensureAnalyzingPoller, pushNotify, updateNotify } from '../notify';
import { displayCaseName } from '../utils/format';

const DRAFT_KEY = 'mpia_form_draft'

export default {
  data() {
    return {
      case_id: '' as string,
      temp_text: '' as string,
      inputs: [] as InputItem[],
      readingFile: false,
    }
  },

  watch: {
    case_id() { this.saveDraft() },
    temp_text() { this.saveDraft() },
    inputs: { handler() { this.saveDraft() }, deep: true },
  },

  methods: {
    saveDraft() {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          case_id: this.case_id,
          temp_text: this.temp_text,
          inputs: this.inputs,
        }))
      } catch {
        /* 草稿过大（如大文件 base64）超出配额时静默跳过 */
      }
    },
    restoreDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const d = JSON.parse(raw)
        if (!d || !Array.isArray(d.inputs)) return
        this.case_id = d.case_id || ''
        this.temp_text = d.temp_text || ''
        this.inputs = d.inputs
      } catch {
        /* 数据损坏时忽略 */
      }
    },
    clearDraft() {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    },
    handleBeforeUnload(event: Event) {
      if (this.case_id.trim() !== '' || this.temp_text.trim() !== '' || this.inputs.length > 0) {
        event.preventDefault();
      }
    },
    getFileCategory(type: string): string {
      if (!type) return '未知'
      return type.split('/')[0] || '未知'
    },
    // 获取文件类型的显示标签
    getFileTypeLabel(type: string): string {
      const category: string = this.getFileCategory(type)
      const map: Record<string, string> = {
        'image': '图片',
        'video': '视频',
        'audio': '音频',
        'text': '文本',
        'application': '文件',
      }
      return map[category] || '文件'
    },
    // 获取文件类型的图标颜色
    getFileTypeColor(type: string): string {
      const category: string = this.getFileCategory(type)
      const map: Record<string, string> = {
        'image': '#3b82f6',
        'video': '#8b5cf6',
        'audio': '#f59e0b',
        'text': '#10b981',
        'application': '#6b7280',
      }
      return map[category] || '#6b7280'
    },
    isValidCaseId(caseId: string): boolean {
      const trimmed = caseId.trim();
      if (trimmed === "." || trimmed === "..") {
        return false;
      }
      const pattern = /^[a-zA-Z0-9一-鿿\-:()\[\]{}\_.]+$/;
      return pattern.test(trimmed);
    },
    getBase64(ms: string) {
      return Base64.encode(ms)
    },
    getOriginalContent(ms: string) {
      return Base64.decode(ms)
    },

    // 读取文件分块为 base64（大文件逐块读取，避免一次性编码冻结页面）
    _readChunkBase64(slice: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const bytes = new Uint8Array(reader.result as ArrayBuffer)
          let bin = ''
          for (let i = 0; i < bytes.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
          }
          resolve(btoa(bin))
        }
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsArrayBuffer(slice)
      })
    },
    async readFileAsDataURL(file: File): Promise<string> {
      const mime = file.type || 'application/octet-stream'
      // 小文件直接读，开销可忽略
      if (file.size <= 30 * 1024 * 1024) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('文件读取失败: ' + file.name))
          reader.readAsDataURL(file)
        })
      }
      // 大文件（>30MB）：6MB 分块读取编码，块间让出主线程，页面保持可响应。
      // 注意：块大小必须是 3 的倍数——base64 按 3 字节一组编码，块长不是 3 的倍数
      // 会导致分块拼接后字节错位、文件损坏（此前 8MB 块导致大视频上传后无法解码）
      const CHUNK = 6 * 1024 * 1024
      let out = 'data:' + mime + ';base64,'
      for (let offset = 0; offset < file.size; offset += CHUNK) {
        out += await this._readChunkBase64(file.slice(offset, Math.min(offset + CHUNK, file.size)))
        await new Promise(r => setTimeout(r, 0))
      }
      return out
    },

    // 暂时硬编码公网服务地址
    async uploadVideo(file: File): Promise<string> {
      const baseUrl = 'http://8.156.85.152:8000'
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${baseUrl}/api/v1/upload/video`, {
        method: 'POST',
        body: formData,
      })

      if(!response.ok) {
        throw new Error(`上传失败, HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if(!result.success || !result.videoUrl) {
        throw new Error('上传失败，服务器返回格式不正确')
      }
      return result.videoUrl
    },

    async handleFileChange(event: Event) {
      const input = event.target as HTMLInputElement
      const files = input.files
      if (!files || files.length == 0) return

      this.readingFile = true
      try {
        for (var i = 0; i < files.length; i++) {
          const file = files[i]
          if (!file) continue
          if (file.size > 200 * 1024 * 1024) {
            alert(`文件过大：${file.name}（${(file.size / 1024 / 1024).toFixed(0)}MB），请上传小于 200MB 的文件`)
            continue
          }
          const rawType = file.type || 'application/octet-stream'
          // 后端只接受 image / video / audio / text，从 MIME 中提取主类别
          const fileType = rawType.split('/')[0] || 'text'


          let content: string
          if (fileType === 'video') {
            // 视频文件传到公网服务器获取URL
            try {
              content = await this.uploadVideo(file)
            } catch (e: any) {
              alert(`视频上传失败: ${file.name}, ${e.message || '其他错误'}`)
              continue
            }
          } else if (fileType === 'text') {
            // 如果是文本文件， 则直接使用原文而不进行编码
            content = await file.text()
          } else {
            // 其他文件保持原来不变
            // content用base64编码后传给后端
            content = await this.readFileAsDataURL(file)
          }
          // 测试
          console.log('================')
          console.log(content)
          console.log('================')

          this.inputs.push({
            type: fileType,
            content: content,
            timestamp: '',
            file_name: file.name || '',
            file_path: '',
          })
        }
      } catch (e: any) {
        alert('文件读取失败：' + (e.message || '未知错误'))
      } finally {
        this.readingFile = false
        // 重置 input 以允许重复选择同一文件
        input.value = ''
      }
    },
    submit_text() {
      if (this.temp_text.trim() === '') {
        alert('请输入文本内容')
        return
      }
      this.inputs.push({
        type: 'text',
        content: this.temp_text,
        timestamp: '',
        file_name: '',
        file_path: '',
      })
      this.temp_text = ''
    },
    deleteSubmitItem(index: number) {
      this.inputs.splice(index, 1)
    },
    // 格式化后端错误信息
    formatError(err: any): string {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        return '请求失败，请检查后端服务是否启动'
      }
      const status = err.response.status
      const detail = err.response.data?.detail
      if (status === 400) {
        if (Array.isArray(detail)) {
          return '请求参数错误：\n' + detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('\n')
        }
        return `请求参数错误：${detail || '请检查输入数据格式'}`
      }
      if (status === 500) {
        return `服务器内部错误：${detail || '未知异常'}`
      }
      return `请求失败（${status}）：${detail || '未知错误'}`
    },
    // 格式化毫秒为可读时间
    formatMs(ms: number): string {
      if (ms < 1000) return ms + 'ms'
      return (ms / 1000).toFixed(2) + 's'
    },
    submit() {
      if (this.case_id.trim() === '') {
        alert('请填写案件名称!')
        return
      }
      if (this.inputs.length === 0) {
        alert('请至少提交一条信息!')
        return
      }
      if (!this.isValidCaseId(this.case_id)) {
        alert('案件名称不合法，请重新填写!')
        return
      }

      const payload = {
        case_id: this.case_id.trim(),
        inputs: this.inputs,
      }
      // 材料统计：多文件将按顺序分析，全部完成后统一出结果
      const typeNames: Record<string, string> = { image: '图片', video: '视频', audio: '音频', text: '文本' }
      const countByType = payload.inputs.reduce((acc: Record<string, number>, it) => {
        const key = typeNames[it.type] || it.type
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      const materialSummary = Object.entries(countByType)
        .map(([k, v]) => `${k} ${v} 项`)
        .join('、')

      // 所有加载/结果信息交给侧边栏，卡片立即清空，可马上继续提交
      const hasVideo = payload.inputs.some((it: any) => it.type === 'video')
      const runningNotify = pushNotify({
        type: 'info',
        title: '分析中',
        message: `案件：${payload.case_id}\n共 ${payload.inputs.length} 项材料（${materialSummary}），将顺序分析，全部完成后统一出结果，请稍候...${hasVideo ? '\n（检测到视频，将自动压缩后分析，请耐心等待）' : ''}`,
        analyzing: true,
        submissionName: payload.case_id,
      })
      // 进度提示：每 5 秒刷新已等待时长，避免看起来像卡死；
      // 案件完成（无论响应是否送达，由轮询对账收敛）后自动停止
      const startedAt = Date.now()
      const ticker = window.setInterval(() => {
        if (!runningNotify.analyzing) {
          window.clearInterval(ticker)
          return
        }
        const secs = Math.round((Date.now() - startedAt) / 1000)
        const tip = secs < 120
          ? '分析中，请耐心等待（视频分析通常需要 1-3 分钟）'
          : '分析仍在进行，请继续等待'
        updateNotify(runningNotify.id, {
          message: `案件：${payload.case_id}\n共 ${payload.inputs.length} 项材料，顺序分析中...\n已等待 ${secs} 秒，${tip}`,
        })
      }, 5000)
      // 在途案件对账轮询兜底：即使响应丢失，案件入库带研判结果后也会标记完成
      ensureAnalyzingPoller()
      this.case_id = ''
      this.temp_text = ''
      this.inputs = []
      this.clearDraft()

      // 后台异步分析，不阻塞卡片，可同时提交多个案件
      axios.post('/api/v1/pipeline', payload)
        .then((res) => {
          window.clearInterval(ticker)
          const r = res.data
          const verdict = r.judgment && r.judgment.is_fraud ? '涉嫌诈骗' : '暂未发现诈骗'
          const confidence = r.judgment && r.judgment.confidence_score != null
            ? `置信度 ${r.judgment.confidence_score}`
            : ''
          const deepfake = r.deepfake_detected ? '⚠ 已检测到深伪' : ''
          const message = [
            `案件：${displayCaseName(r.case_id)}`,
            `${verdict}${confidence ? ` · ${confidence}` : ''}`,
            deepfake,
            `材料：${materialSummary}`,
            `耗时：${this.formatMs(r.elapsed_ms || 0)}`,
          ].filter(Boolean).join('\n')
          updateNotify(runningNotify.id, {
            type: 'success',
            title: '分析完成',
            message,
            caseId: r.case_id,
            analyzing: false,
          })
        })
        .catch((err: any) => {
          console.error('请求失败:', err)
          window.clearInterval(ticker)
          updateNotify(runningNotify.id, {
            type: 'error',
            title: '分析失败',
            message: this.formatError(err),
            analyzing: false,
          })
        })
    },
  },
  mounted() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    // 页面刷新后：恢复未提交的表单草稿（在途分析结果由 notify.ts 全局轮询对账）
    this.restoreDraft()
    ensureAnalyzingPoller()
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },

}
</script>

<template>
  <!-- ========== 提交页面 ========== -->
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">多模态案件分析</h1>
      <p class="page-desc">上传图片、视频、音频或文本材料，系统将自动进行深度伪造检测与诈骗研判；提交完成后可直接继续录入下一案件</p>
    </div>

    <div class="form-card">
      <!-- 案件名称 -->
      <div class="form-section">
        <label class="form-label">
          案件名称
          <span class="required-mark">*</span>
        </label>
        <input type="text" v-model="case_id" class="form-input"
          placeholder="请输入案件编号或名称，例如：ZA-2024-001" />
        <p class="form-hint error" v-if="case_id !== '' && !isValidCaseId(case_id)">
          案件名称包含不合法字符，仅支持字母、数字、中文及 -:()[]{}_.
        </p>
      </div>

      <!-- 文件上传 -->
      <div class="form-section">
        <label class="form-label">
          上传证据材料
          <span class="required-mark">*</span>
        </label>
        <p class="form-hint">支持图片、视频、音频及 .txt 文本文件，可一次多选；多文件将按顺序分析，全部完成后统一出结果</p>
        <label class="upload-trigger" for="file-upload">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>点击选择文件</span>
        </label>
        <input id="file-upload" type="file" accept="image/*,video/*,audio/*,.txt" @change="handleFileChange"
          class="file-input-hidden" multiple />
        <p v-if="readingFile" class="form-hint reading-tip">正在读取文件，大文件可能需要几秒，请稍候...</p>
      </div>

      <!-- 文本输入 -->
      <div class="form-section">
        <label class="form-label">文本信息录入</label>
        <p class="form-hint">可手动输入或粘贴涉案聊天记录、短信、邮件等文本信息</p>
        <div class="text-input-row">
          <textarea v-model="temp_text" class="form-textarea"
            placeholder="请输入涉案文本信息，例如：聊天记录、转账留言、短信内容等..."></textarea>
          <button @click="submit_text" class="btn btn-secondary"
            :disabled="temp_text.trim() === ''">
            添加文本
          </button>
        </div>
      </div>

      <!-- 已选材料列表 -->
      <div class="form-section" v-if="inputs.length > 0">
        <label class="form-label">
          已选材料列表
          <span class="file-count">(共 {{ inputs.length }} 条)</span>
        </label>
        <div class="file-list">
          <div class="file-item" v-for="(item, index) in inputs" :key="index">
            <span class="file-type-badge" :style="{ background: getFileTypeColor(item.type) }">
              {{ getFileTypeLabel(item.type) }}
            </span>
            <span class="file-preview-text">
              {{ item.file_name || item.content.substring(0, 60) + '...' }}
            </span>
            <button @click="deleteSubmitItem(index)" class="btn-delete" title="删除此项">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button @click="submit" class="btn btn-primary">
          上传并分析{{ inputs.length > 0 ? '（' + inputs.length + ' 项）' : '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面容器 ========== */
.page-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 60px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a2332;
  margin-bottom: 8px;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
}

/* ========== 表单卡片 ========== */
.form-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  padding: 32px;
}

.form-section {
  margin-bottom: 28px;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.required-mark {
  color: #ef4444;
  margin-left: 2px;
}

.form-hint {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 2px;
  margin-bottom: 10px;
}

.form-hint.error {
  color: #ef4444;
}

.reading-tip {
  color: #1d4ed8;
  font-weight: 500;
  animation: readingPulse 1.2s ease-in-out infinite;
}

@keyframes readingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ========== 输入框 ========== */
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  font-family: inherit;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #fff;
}

.form-input::placeholder {
  color: #94a3b8;
}

.form-input:disabled,
.form-textarea:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

/* ========== 文件上传 ========== */
.upload-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  transition: all 0.2s;
  background: #f8fafc;
}

.upload-trigger:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.upload-icon {
  width: 20px;
  height: 20px;
}

.file-input-hidden {
  display: none;
}

/* ========== 文本输入 ========== */
.text-input-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.form-textarea {
  flex: 1;
  min-height: 72px;
  max-height: 160px;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #fff;
}

.form-textarea::placeholder {
  color: #94a3b8;
}

/* ========== 文件列表 ========== */
.file-count {
  font-weight: 400;
  color: #64748b;
  font-size: 13px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
}

.file-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.file-preview-text {
  flex: 1;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.15s;
}

.btn-delete svg {
  width: 16px;
  height: 16px;
}

.btn-delete:hover {
  background: #fef2f2;
  color: #ef4444;
}

.btn-delete:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== 按钮 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.45);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.form-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-container {
    padding: 16px 12px 40px;
  }

  .form-card {
    padding: 20px;
  }

  .page-title {
    font-size: 22px;
  }

  .text-input-row {
    flex-direction: column;
  }
}
</style>
