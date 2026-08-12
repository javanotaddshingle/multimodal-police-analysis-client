<template>
    <div class="page-container">
        <div class="page-header">
            <h1 class="page-title">历史案件</h1>
            <p class="page-desc">查看和管理已分析的历史案件记录</p>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="state-box">
            <p class="state-text">加载中...</p>
        </div>

        <!-- 加载失败 -->
        <div v-else-if="error" class="state-box">
            <p class="state-text state-error">加载失败：{{ error }}</p>
        </div>

        <!-- 空态 -->
        <div v-else-if="cases.length === 0" class="empty-state">
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
            </div>
            <h3>暂无历史案件</h3>
            <p>完成案件分析后，记录将自动保存到此处</p>
            <router-link to="/" class="btn-primary-link">前往分析</router-link>
        </div>

        <!-- 案件列表 -->
        <div v-else class="case-list">
            <div v-for="c in cases" :key="c.case_id" class="case-card" @click="toggleDetail(c.case_id)">
                <div class="case-card-header">
                    <span class="case-id">{{ c.case_id }}</span>
                    <span class="case-time">{{ formatTime(c.created_at) }}</span>
                </div>
                <div class="case-tags">
                    <span v-if="c.victim" class="tag tag-victim">受害者：{{ c.victim }}</span>
                    <span v-if="c.suspect" class="tag tag-suspect">嫌疑人：{{ c.suspect }}</span>
                    <span v-if="c.deepfake_alert" class="tag tag-deepfake">⚠ AI 换脸</span>
                    <span v-if="c.judgment && c.judgment.is_fraud" class="tag tag-fraud">诈骗：{{ c.judgment.fraud_type || '未知类型' }}（{{ c.judgment.confidence }}）</span>
                    <span v-else-if="c.judgment" class="tag tag-safe">未发现诈骗</span>
                </div>
                <p class="case-summary">{{ c.chat_history || '（无内容摘要）' }}</p>
                <span class="case-detail-hint">{{ selectedCaseId === c.case_id ? '收起详情 ▲' : '点击查看研判结果 ▼' }}</span>

                <!-- 展开详情：研判结果 -->
                <div v-if="selectedCaseId === c.case_id" class="case-detail">
                    <div v-if="detailLoading" class="detail-note">加载研判结果...</div>
                    <div v-else-if="detailError" class="detail-note detail-error">{{ detailError }}</div>
                    <div v-else-if="detail" class="detail-body">
                        <div class="detail-section">
                            <h4>研判结果</h4>
                            <div class="detail-grid">
                                <div class="detail-item"><span class="detail-label">是否诈骗</span><span class="detail-value">{{ detail.judgment?.is_fraud ? '是' : '否' }}</span></div>
                                <div class="detail-item"><span class="detail-label">诈骗类型</span><span class="detail-value">{{ detail.judgment?.fraud_type || '—' }}</span></div>
                                <div class="detail-item"><span class="detail-label">置信度</span><span class="detail-value">{{ detail.judgment?.confidence || '—' }}（{{ detail.judgment?.confidence_score ?? '—' }}）</span></div>
                                <div class="detail-item"><span class="detail-label">AI 换脸</span><span class="detail-value">{{ detail.judgment?.deepfake_alert ? '⚠ 检测到' : '未检测到' }}</span></div>
                                <div class="detail-item"><span class="detail-label">研判时间</span><span class="detail-value">{{ detail.judgment?.timestamp || '—' }}</span></div>
                            </div>
                            <p class="detail-reason"><span class="detail-label">研判理由：</span>{{ detail.judgment?.reason || '—' }}</p>
                            <p class="detail-reason"><span class="detail-label">预警建议：</span>{{ detail.judgment?.warning || '—' }}</p>
                            <div v-if="detail.judgment?.similar_cases && detail.judgment.similar_cases.length" class="detail-similar">
                                <span class="detail-label">相似案例：</span>
                                <div v-for="(s, i) in detail.judgment.similar_cases" :key="i" class="similar-item">
                                    <span class="similar-score">[{{ s.score }}]</span> {{ s.content }}
                                </div>
                            </div>
                        </div>
                        <div class="detail-section">
                            <h4>案件内容</h4>
                            <p class="detail-chat">{{ detail.chat_history || '（无内容摘要）' }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const cases = ref([])
const loading = ref(true)
const error = ref('')

const selectedCaseId = ref('')
const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

function formatTime(ts) {
    if (!ts) return '未知时间'
    const d = new Date(Number(ts))
    if (isNaN(d.getTime())) return String(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadDetail(caseId) {
    detailLoading.value = true
    detailError.value = ''
    detail.value = null
    try {
        const res = await axios.get(`/api/v1/history/${encodeURIComponent(caseId)}`)
        detail.value = res.data
    } catch (e) {
        detailError.value = (e.response && e.response.data && e.response.data.detail) || e.message || '加载失败'
    } finally {
        detailLoading.value = false
    }
}

function toggleDetail(caseId) {
    if (selectedCaseId.value === caseId) {
        selectedCaseId.value = ''
        detail.value = null
        return
    }
    selectedCaseId.value = caseId
    loadDetail(caseId)
}

onMounted(async () => {
    try {
        const res = await axios.get('/api/v1/history')
        cases.value = res.data.cases || []
    } catch (e) {
        error.value = e.message || '网络错误'
    } finally {
        loading.value = false
    }
})
</script>

<style scoped>
.page-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px 60px;
}

.page-header {
    margin-bottom: 32px;
}

.page-title {
    font-size: 28px;
    font-weight: 700;
    color: #1a2332;
    margin-bottom: 6px;
}

.page-desc {
    font-size: 14px;
    color: #64748b;
}

.state-box {
    background: #fff;
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
}

.state-text {
    font-size: 14px;
    color: #64748b;
}

.state-error {
    color: #dc2626;
}

.empty-state {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
    padding: 64px 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.empty-icon {
    width: 64px;
    height: 64px;
    background: #f1f5f9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    margin-bottom: 8px;
}

.empty-icon svg {
    width: 28px;
    height: 28px;
}

.empty-state h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
}

.empty-state p {
    font-size: 14px;
    color: #94a3b8;
    max-width: 300px;
}

.btn-primary-link {
    display: inline-block;
    margin-top: 8px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: box-shadow 0.2s, transform 0.2s;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary-link:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.45);
    transform: translateY(-1px);
}

.case-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.case-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
    padding: 20px 24px;
    transition: box-shadow 0.2s;
}

.case-card:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.case-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.case-id {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    font-family: monospace;
}

.case-time {
    font-size: 13px;
    color: #94a3b8;
}

.case-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
}

.tag {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 999px;
    font-weight: 500;
}

.tag-victim {
    background: #eff6ff;
    color: #1d4ed8;
}

.tag-suspect {
    background: #fef2f2;
    color: #dc2626;
}

.tag-deepfake {
    background: #fffbeb;
    color: #d97706;
}

.case-summary {
    font-size: 13px;
    line-height: 1.6;
    color: #475569;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.case-detail-hint {
    display: inline-block;
    margin-top: 10px;
    font-size: 12px;
    color: #3b82f6;
    cursor: pointer;
}

.case-detail {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
}

.detail-note {
    font-size: 13px;
    color: #64748b;
    padding: 8px 0;
}

.detail-error {
    color: #dc2626;
}

.detail-section {
    margin-bottom: 14px;
}

.detail-section h4 {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px 16px;
    margin-bottom: 8px;
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.detail-label {
    font-size: 12px;
    color: #94a3b8;
}

.detail-value {
    font-size: 13px;
    color: #1e293b;
    font-weight: 500;
}

.detail-reason {
    font-size: 13px;
    line-height: 1.7;
    color: #475569;
    margin-bottom: 6px;
}

.detail-chat {
    font-size: 13px;
    line-height: 1.7;
    color: #475569;
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
}

.detail-similar {
    margin-top: 6px;
}

.similar-item {
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
    margin-top: 4px;
}

.similar-score {
    color: #3b82f6;
    font-weight: 600;
}

.tag-fraud {
    background: #fef2f2;
    color: #dc2626;
}

.tag-safe {
    background: #f0fdf4;
    color: #16a34a;
}

@media (max-width: 768px) {
    .page-container {
        padding: 16px 12px 40px;
    }

    .page-title {
        font-size: 22px;
    }

    .empty-state {
        padding: 40px 20px;
    }
}
</style>
