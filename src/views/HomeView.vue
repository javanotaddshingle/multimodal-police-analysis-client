<script lang="ts">
// 定义从后端返回的完整数据结构
interface SimilarCase {
  content: string;
  fraud_type: string;
  score: number;
}

interface Judgment {
  case_id: string;
  is_fraud: boolean;
  fraud_type: string;
  confidence: string;
  confidence_score: number;
  reason: string;
  warning: string;
  deepfake_alert: boolean;
  similar_cases: SimilarCase[];
  timestamp: string;
  error: null | string;
}

interface Alert {
  type: string;
  level: string;
  title: string;
  message: string;
  warning: string;
  reason: string;
}

interface Stages {
  multimodal_ms: number;
  extraction_ms: number;
  storage_ms: number;
  judgment_ms: number;
  total_ms: number;
}

interface ApiResponse {
  case_id: string;
  judgment: Judgment;
  alerts: Alert[];
  deepfake_detected: boolean;
  elapsed_ms: number;
  stages: Stages;
}
// 定义从后端返回的完整数据结构


import { Base64 } from 'js-base64';
import { ref } from 'vue'
import axios from 'axios';

export default {
    data() {
        return {
            file_Info: null,
            base64Data: '' as string,
            case_id: '' as string,
            temp_text: '' as string,
            selectedFile: [] as Array<{ type: string; content: string; timestamp: string; file_name: string; file_path: string }>,
            case_result: {} as any,
            is_loading: false as boolean,
        }
    },

    methods: {
        handleBeforeUnload(event: Event) {
            if (this.selectedFile.length > 0 || this.temp_text.length > 0 || this.case_id.length > 0) {
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

        handleFileChange(event: Event) {
            const input = event.target as HTMLInputElement
            const files = input.files
            if (!files || files.length == 0) return

            for (var i = 0; i < files.length; i++) {
                const file = files[i]
                const reader = new FileReader()
                if (!file) continue
                const fileType = file.type || 'application/octet-stream'
                reader.onload = (event) => {
                    const content = event.target?.result as string
                    const timestamp = '' as string

                    this.selectedFile.push({
                        type: fileType,
                        content: content,
                        timestamp: '',
                        file_name: file.name || '',
                        file_path: '',
                    })
                }
                reader.readAsDataURL(file)
            }
            // 重置 input 以允许重复选择同一文件
            input.value = ''
        },
        submit_text() {
            if (this.temp_text.trim() === '') {
                alert('请输入文本内容')
                return
            }
            this.selectedFile.push({
                type: 'text',
                content: this.temp_text,
                timestamp: '',
                file_name: '',
                file_path: '',
            })
            this.temp_text = ''
        },
        deleteSubmitItem(index: number) {
            this.selectedFile.splice(index, 1)
        },
        // 返回提交页面
        backToSubmit() {
            this.case_result = {}
        },
        async submit() {
            if (this.case_id === '') {
                alert('请填写案件名称!')
                return
            }
            if (this.selectedFile.length === 0) {
                alert('请至少提交一条信息!')
                return
            }
            if (!this.isValidCaseId(this.case_id)) {
                alert('案件名称不合法，请重新填写!')
                return
            }

            const payload = {
                case_id: this.case_id,
                inputs: this.selectedFile,
            }

            this.is_loading = true
            try {
                const res = await axios.post('http://127.0.0.1:8000/api/v1/pipeline', payload)
                this.case_result = res.data
            } catch (err) {
                console.error('请求失败:', err)
                alert('请求失败，请检查后端服务是否启动')
            } finally {
                this.is_loading = false
            }
        },
        // 格式化毫秒为可读时间
        formatMs(ms: number): string {
            if (ms < 1000) return ms + 'ms'
            return (ms / 1000).toFixed(2) + 's'
        },
        // 获取置信度对应的颜色
        getConfidenceColor(score: number): string {
            if (score >= 0.8) return '#ef4444'
            if (score >= 0.6) return '#f59e0b'
            return '#10b981'
        },
        // 获取预警级别对应的样式
        getAlertLevelClass(level: string): string {
            const map: Record<string, string> = {
                'high': 'alert-level--high',
                'medium': 'alert-level--medium',
                'low': 'alert-level--low',
            }
            return map[level] || 'alert-level--low'
        }
    },
    mounted() {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    },
    beforeUnmount() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    },

}
</script>

<template>
    <!-- ========== 加载状态 ========== -->
    <div v-if="is_loading" class="loading-overlay">
        <div class="loading-card">
            <div class="loading-spinner"></div>
            <p class="loading-text">正在分析研判中，请稍候...</p>
            <p class="loading-hint">系统正在对提交的多模态数据进行深度分析</p>
        </div>
    </div>

    <!-- ========== 提交页面 ========== -->
    <div class="page-container" v-if="Object.keys(case_result).length === 0 && !is_loading">
        <div class="page-header">
            <h1 class="page-title">多模态案件分析</h1>
            <p class="page-desc">上传图片、视频、音频或文本材料，系统将自动进行深度伪造检测与诈骗研判</p>
        </div>

        <div class="form-card">
            <!-- 案件名称 -->
            <div class="form-section">
                <label class="form-label">
                    案件名称
                    <span class="required-mark">*</span>
                </label>
                <input
                    type="text"
                    v-model="case_id"
                    class="form-input"
                    placeholder="请输入案件编号或名称，例如：ZA-2024-001"
                />
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
                <p class="form-hint">支持图片、视频、音频及 .txt 文本文件，可多选</p>
                <label class="upload-trigger" for="file-upload">
                    <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>点击选择文件</span>
                </label>
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*,audio/*,.txt"
                    @change="handleFileChange"
                    class="file-input-hidden"
                    multiple
                />
            </div>

            <!-- 文本输入 -->
            <div class="form-section">
                <label class="form-label">文本信息录入</label>
                <p class="form-hint">可手动输入或粘贴涉案聊天记录、短信、邮件等文本信息</p>
                <div class="text-input-row">
                    <textarea
                        v-model="temp_text"
                        class="form-textarea"
                        placeholder="请输入涉案文本信息，例如：聊天记录、转账留言、短信内容等..."
                    ></textarea>
                    <button @click="submit_text" class="btn btn-secondary" :disabled="temp_text.trim() === ''">
                        添加文本
                    </button>
                </div>
            </div>

            <!-- 已选文件列表 -->
            <div class="form-section" v-if="selectedFile.length > 0">
                <label class="form-label">
                    已选材料列表
                    <span class="file-count">(共 {{ selectedFile.length }} 条)</span>
                </label>
                <div class="file-list">
                    <div class="file-item" v-for="(item, index) in selectedFile" :key="index">
                        <span
                            class="file-type-badge"
                            :style="{ background: getFileTypeColor(item.type) }"
                        >
                            {{ getFileTypeLabel(item.type) }}
                        </span>
                        <span class="file-preview-text">
                            {{ item.file_name || item.content.substring(0, 60) + '...' }}
                        </span>
                        <button @click="deleteSubmitItem(index)" class="btn-delete" title="删除此项">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 提交按钮 -->
            <div class="form-actions">
                <button @click="submit" class="btn btn-primary">
                    上传并分析
                </button>
            </div>
        </div>
    </div>

    <!-- ========== 结果展示页面 ========== -->
    <div class="page-container" v-if="Object.keys(case_result).length > 0 && !is_loading">
        <!-- 顶部栏 -->
        <div class="result-topbar">
            <button @click="backToSubmit" class="btn btn-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
                返回提交
            </button>
            <h2 class="result-title">案件分析报告</h2>
            <div></div>
        </div>

        <div class="result-content">
            <!-- 1. 案件基础信息卡片 -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>案件基础信息</h3>
                </div>
                <div class="info-card-body">
                    <div class="info-row">
                        <span class="info-label">案件编号</span>
                        <span class="info-value mono">{{ case_result.case_id }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">处理耗时</span>
                        <span class="info-value">{{ formatMs(case_result.elapsed_ms) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">深度伪造检测</span>
                        <span class="info-value">
                            <span :class="case_result.deepfake_detected ? 'badge badge-danger' : 'badge badge-success'">
                                {{ case_result.deepfake_detected ? '已检测到深伪' : '未检测到深伪' }}
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- 2. 安全预警卡片 -->
            <div class="info-card" v-if="case_result.alerts && case_result.alerts.length > 0">
                <div class="info-card-header info-card-header--warning">
                    <h3>安全预警</h3>
                    <span class="card-count">{{ case_result.alerts.length }} 条预警</span>
                </div>
                <div class="info-card-body">
                    <div v-for="(alert, index) in case_result.alerts" :key="index"
                        class="alert-item"
                        :class="getAlertLevelClass(alert.level)">
                        <div class="alert-item-header">
                            <span class="alert-title">{{ alert.title }}</span>
                            <span class="alert-level-tag" :class="getAlertLevelClass(alert.level)">
                                {{ alert.level === 'high' ? '高危' : alert.level === 'medium' ? '中危' : '低危' }}
                            </span>
                        </div>
                        <p class="alert-reason">{{ alert.reason }}</p>
                        <p class="alert-warning">{{ alert.warning }}</p>
                    </div>
                </div>
            </div>

            <!-- 3. 智能研判卡片 -->
            <div class="info-card" v-if="case_result.judgment">
                <div class="info-card-header info-card-header--primary">
                    <h3>智能研判分析</h3>
                </div>
                <div class="info-card-body">
                    <div class="judgment-verdict"
                        :class="case_result.judgment.is_fraud ? 'verdict-fraud' : 'verdict-safe'">
                        <span class="verdict-text">
                            {{ case_result.judgment.is_fraud ? '涉嫌诈骗' : '暂未发现诈骗' }}
                        </span>
                        <span class="verdict-confidence">
                            置信度 {{ case_result.judgment.confidence_score }}
                        </span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">诈骗类型</span>
                        <span class="info-value">{{ case_result.judgment.fraud_type || '未识别' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">研判可信度</span>
                        <span class="info-value">{{ case_result.judgment.confidence }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">分析理由</span>
                        <span class="info-value">{{ case_result.judgment.reason }}</span>
                    </div>

                    <div class="warning-block" v-if="case_result.judgment.warning">
                        <span class="warning-block-label">防骗提醒</span>
                        <p>{{ case_result.judgment.warning }}</p>
                    </div>

                    <!-- 相似案例 -->
                    <div class="sub-section"
                        v-if="case_result.judgment.similar_cases && case_result.judgment.similar_cases.length > 0">
                        <h4 class="sub-section-title">相似历史案例参考</h4>
                        <div class="similar-cases-grid">
                            <div v-for="(caseItem, idx) in case_result.judgment.similar_cases" :key="idx" class="similar-case-card">
                                <div class="similar-case-top">
                                    <span class="similar-case-type">{{ caseItem.fraud_type }}</span>
                                    <span class="similar-case-score">匹配度 {{ caseItem.score }}</span>
                                </div>
                                <p class="similar-case-content">{{ caseItem.content }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. 处理耗时卡片 -->
            <div class="info-card" v-if="case_result.stages">
                <div class="info-card-header">
                    <h3>处理耗时明细</h3>
                </div>
                <div class="info-card-body">
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">多模态分析</span>
                                <span class="timeline-value">{{ formatMs(case_result.stages.multimodal_ms) }}</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">特征提取</span>
                                <span class="timeline-value">{{ formatMs(case_result.stages.extraction_ms) }}</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">数据存储</span>
                                <span class="timeline-value">{{ formatMs(case_result.stages.storage_ms) }}</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">智能研判</span>
                                <span class="timeline-value">{{ formatMs(case_result.stages.judgment_ms) }}</span>
                            </div>
                        </div>
                        <div class="timeline-item timeline-item--total">
                            <div class="timeline-dot timeline-dot--total"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">总耗时</span>
                                <span class="timeline-value timeline-value--total">{{ formatMs(case_result.stages.total_ms) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
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

/* ========== 加载状态 ========== */
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.loading-card {
  text-align: center;
  padding: 48px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.loading-hint {
  font-size: 14px;
  color: #94a3b8;
}

/* ========== 结果页面 ========== */
.result-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-back:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.back-icon {
  width: 16px;
  height: 16px;
}

.result-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a2332;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ========== 信息卡片 ========== */
.info-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.info-card-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.info-card-header--warning {
  background: #fffbeb;
  border-bottom-color: #fde68a;
}

.info-card-header--warning h3 {
  color: #92400e;
}

.info-card-header--primary {
  background: #eff6ff;
  border-bottom-color: #bfdbfe;
}

.info-card-header--primary h3 {
  color: #1e40af;
}

.card-count {
  font-size: 13px;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 10px;
  border-radius: 12px;
}

.info-card-body {
  padding: 20px 24px;
}

/* ========== 信息行 ========== */
.info-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 120px;
  flex-shrink: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.info-value {
  flex: 1;
  color: #1e293b;
  font-size: 14px;
}

.info-value.mono {
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

/* ========== 徽章 ========== */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-danger {
  background: #fef2f2;
  color: #b91c1c;
}

.badge-success {
  background: #f0fdf4;
  color: #15803d;
}

/* ========== 预警条目 ========== */
.alert-item {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #e2e8f0;
}

.alert-item:last-child {
  margin-bottom: 0;
}

.alert-item.alert-level--high {
  background: #fef2f2;
  border-left-color: #ef4444;
}

.alert-item.alert-level--medium {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.alert-item.alert-level--low {
  background: #f8fafc;
  border-left-color: #3b82f6;
}

.alert-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.alert-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.alert-level-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.alert-level-tag.alert-level--high {
  background: #fee2e2;
  color: #991b1b;
}

.alert-level-tag.alert-level--medium {
  background: #fef3c7;
  color: #92400e;
}

.alert-level-tag.alert-level--low {
  background: #dbeafe;
  color: #1e40af;
}

.alert-reason {
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
  line-height: 1.5;
}

.alert-warning {
  font-size: 13px;
  color: #b91c1c;
  font-weight: 500;
  background: #fff5f5;
  padding: 8px 12px;
  border-radius: 6px;
  line-height: 1.5;
}

/* ========== 研判结果 ========== */
.judgment-verdict {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.judgment-verdict.verdict-fraud {
  background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
  border: 1px solid #fecaca;
}

.judgment-verdict.verdict-safe {
  background: linear-gradient(135deg, #f0fdf4 0%, #f5faf7 100%);
  border: 1px solid #bbf7d0;
}

.verdict-text {
  font-size: 20px;
  font-weight: 700;
}

.verdict-fraud .verdict-text {
  color: #dc2626;
}

.verdict-safe .verdict-text {
  color: #16a34a;
}

.verdict-confidence {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.warning-block {
  margin-top: 16px;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.warning-block-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.warning-block p {
  font-size: 14px;
  color: #78350f;
  line-height: 1.6;
}

/* ========== 子区块 ========== */
.sub-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.sub-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 14px;
}

.similar-cases-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.similar-case-card {
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: border-color 0.15s;
}

.similar-case-card:hover {
  border-color: #3b82f6;
}

.similar-case-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.similar-case-type {
  font-weight: 600;
  font-size: 13px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 4px;
}

.similar-case-score {
  font-size: 12px;
  color: #64748b;
}

.similar-case-content {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

/* ========== 时间线 ========== */
.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item:first-child::before {
  top: 50%;
}

.timeline-item:last-child::before {
  bottom: 50%;
}

.timeline-item--total {
  padding-top: 16px;
  margin-top: 4px;
}

.timeline-item--total::before {
  background: transparent;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #cbd5e1;
  flex-shrink: 0;
  z-index: 1;
}

.timeline-dot--total {
  background: #3b82f6;
  box-shadow: 0 0 0 2px #3b82f6;
  width: 14px;
  height: 14px;
}

.timeline-content {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.timeline-label {
  font-size: 14px;
  color: #475569;
}

.timeline-value {
  font-size: 14px;
  color: #64748b;
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
}

.timeline-value--total {
  font-weight: 700;
  color: #1d4ed8;
  font-size: 15px;
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
