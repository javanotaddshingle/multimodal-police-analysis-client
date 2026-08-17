<template>
    <div class="page-container">
        <!-- 顶部栏 -->
        <div class="result-topbar">
            <button @click="backToList" class="btn btn-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                返回历史列表
            </button>
            <h2 class="result-title">案件分析报告</h2>
            <div></div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="state-box">
            <p class="state-text">加载中...</p>
        </div>

        <!-- 加载失败 -->
        <div v-else-if="error" class="state-box">
            <p class="state-text state-error">加载失败：{{ error }}</p>
        </div>

        <!-- 报告内容 -->
        <div v-else-if="detail" class="result-content">
            <!-- 1. 案件基础信息卡片 -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>案件基础信息</h3>
                </div>
                <div class="info-card-body">
                    <div class="info-row">
                        <span class="info-label">案件名称</span>
                        <span class="info-value mono">{{ displayCaseName(detail.case_id) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">创建时间</span>
                        <span class="info-value">{{ formatTime(detail.created_at) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">深度伪造检测</span>
                        <span class="info-value">
                            <span :class="detail.deepfake_alert ? 'badge badge-danger' : 'badge badge-success'">
                                {{ detail.deepfake_alert ? '已检测到深伪' : '未检测到深伪' }}
                            </span>
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">受害者</span>
                        <span class="info-value">{{ detail.victim || '—' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">嫌疑人</span>
                        <span class="info-value">{{ detail.suspect || '—' }}</span>
                    </div>
                </div>
            </div>

            <!-- 1.5 事件关系图谱卡片 -->
            <div class="info-card" v-if="detail.graph && detail.graph.nodes && detail.graph.nodes.length > 0">
                <div class="info-card-header">
                    <h3>事件关系图谱</h3>
                </div>
                <div class="info-card-body">
                    <KnowledgeGraph :graph="detail.graph" :victim="detail.victim" :suspect="detail.suspect" />
                </div>
            </div>

            <!-- 2. 智能研判卡片 -->
            <div class="info-card" v-if="detail.judgment">
                <div class="info-card-header info-card-header--primary">
                    <h3>智能研判分析</h3>
                </div>
                <div class="info-card-body">
                    <div class="judgment-verdict"
                        :class="detail.judgment.is_fraud ? 'verdict-fraud' : 'verdict-safe'">
                        <span class="verdict-text">
                            {{ detail.judgment.is_fraud ? '涉嫌诈骗' : '暂未发现诈骗' }}
                        </span>
                        <span class="verdict-confidence">
                            置信度 {{ detail.judgment.confidence_score }}
                        </span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">诈骗类型</span>
                        <span class="info-value">{{ detail.judgment.fraud_type || '未识别' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">研判可信度</span>
                        <span class="info-value">{{ detail.judgment.confidence }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">分析理由</span>
                        <span class="info-value">{{ detail.judgment.reason }}</span>
                    </div>

                    <div class="warning-block" v-if="detail.judgment.warning">
                        <span class="warning-block-label">防骗提醒</span>
                        <p>{{ detail.judgment.warning }}</p>
                    </div>

                    <!-- 相似案例 -->
                    <div class="sub-section"
                        v-if="detail.judgment.similar_cases && detail.judgment.similar_cases.length > 0">
                        <h4 class="sub-section-title">相似历史案例参考</h4>
                        <div class="similar-cases-grid">
                            <div v-for="(caseItem, idx) in detail.judgment.similar_cases" :key="idx"
                                class="similar-case-card">
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

            <!-- 3. 案件内容卡片 -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>案件内容</h3>
                </div>
                <div class="info-card-body">
                    <p class="detail-chat">{{ detail.chat_history || '（无内容摘要）' }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { displayCaseName } from '../utils/format'
import KnowledgeGraph from '../components/KnowledgeGraph.vue'

const props = defineProps<{
    caseId: string
}>()

const router = useRouter()
const detail = ref<any>(null)
const loading = ref(true)
const error = ref('')

function formatTime(ts: string) {
    if (!ts) return '未知时间'
    const d = new Date(Number(ts))
    if (isNaN(d.getTime())) return String(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function backToList() {
    router.push('/history')
}

onMounted(async () => {
    try {
        const res = await axios.get(`/api/v1/history/${encodeURIComponent(props.caseId)}`)
        detail.value = res.data
    } catch (e: any) {
        error.value = (e.response && e.response.data && e.response.data.detail) || e.message || '加载失败'
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
    font-family: inherit;
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

.info-card-header--primary {
    background: #eff6ff;
    border-bottom-color: #bfdbfe;
}

.info-card-header--primary h3 {
    color: #1e40af;
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

/* ========== 案件内容 ========== */
.detail-chat {
    font-size: 14px;
    line-height: 1.8;
    color: #475569;
    white-space: pre-wrap;
}

@media (max-width: 768px) {
    .page-container {
        padding: 16px 12px 40px;
    }

    .result-title {
        font-size: 17px;
    }
}
</style>
