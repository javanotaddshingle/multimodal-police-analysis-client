<template>
    <div class="page-container">
        <div class="page-header">
            <h1 class="page-title">历史案件</h1>
            <p class="page-desc">查看、检索与管理已分析的历史案件记录，点击案件可查看完整分析报告</p>
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

        <!-- 列表 -->
        <template v-else>
            <!-- 统计概览 -->
            <div class="stats-row">
                <div class="stat-card">
                    <span class="stat-num">{{ stats.total }}</span>
                    <span class="stat-label">全部案件</span>
                </div>
                <div class="stat-card stat-fraud">
                    <span class="stat-num">{{ stats.fraud }}</span>
                    <span class="stat-label">涉嫌诈骗</span>
                </div>
                <div class="stat-card stat-safe">
                    <span class="stat-num">{{ stats.safe }}</span>
                    <span class="stat-label">未发现诈骗</span>
                </div>
                <div class="stat-card stat-deepfake">
                    <span class="stat-num">{{ stats.deepfake }}</span>
                    <span class="stat-label">AI 换脸</span>
                </div>
            </div>

            <!-- 工具栏 -->
            <div class="toolbar">
                <div class="search-box">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input v-model="keyword" type="text"
                        placeholder="搜索案件编号 / 受害者 / 嫌疑人 / 诈骗类型 / 内容" />
                </div>
                <div class="filter-chips">
                    <button v-for="f in filters" :key="f.value" class="filter-chip"
                        :class="{ 'filter-chip--active': statusFilter === f.value }"
                        @click="statusFilter = f.value">
                        {{ f.label }}
                    </button>
                </div>
                <button class="btn-refresh" @click="loadCases" title="刷新列表">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    刷新
                </button>
            </div>

            <!-- 批量操作栏 -->
            <div class="batch-bar" v-if="selectedIds.length > 0">
                <label class="batch-select-all">
                    <input type="checkbox" :checked="allFilteredSelected" @change="toggleSelectAll" />
                    全选当前结果
                </label>
                <span class="batch-count">已选 {{ selectedIds.length }} 项</span>
                <button class="btn-batch btn-batch--danger" @click="deleteCases(selectedIds)" :disabled="deleting">
                    {{ deleting ? '删除中...' : '删除选中' }}
                </button>
                <button class="btn-batch" @click="clearSelection" :disabled="deleting">取消选择</button>
            </div>

            <!-- 无匹配结果 -->
            <div v-if="filteredCases.length === 0" class="state-box">
                <p class="state-text">未找到匹配的案件，可调整搜索关键词或筛选条件</p>
            </div>

            <!-- 案件列表 -->
            <div v-else class="case-list">
                <div v-for="c in filteredCases" :key="c.case_id" class="case-card"
                    :class="{ 'case-card--selected': isSelected(c.case_id) }"
                    @click="openCase(c.case_id)">
                    <div class="case-card-header">
                        <div class="case-card-title-row">
                            <label class="case-check" @click.stop>
                                <input type="checkbox" :checked="isSelected(c.case_id)"
                                    @change="toggleSelect(c.case_id)" :disabled="deleting" />
                            </label>
                            <span class="case-id">{{ displayCaseName(c.case_id) }}</span>
                        </div>
                        <div class="case-card-actions">
                            <span class="case-time">{{ formatTime(c.created_at) }}</span>
                            <button class="case-delete-btn" @click.stop="deleteCases([c.case_id])"
                                :disabled="deleting" title="删除该案件记录">
                                删除
                            </button>
                        </div>
                    </div>
                    <div class="case-tags">
                        <span v-if="c.victim" class="tag tag-victim">受害者：{{ c.victim }}</span>
                        <span v-if="c.suspect" class="tag tag-suspect">嫌疑人：{{ c.suspect }}</span>
                        <span v-if="c.deepfake_alert" class="tag tag-deepfake">⚠ AI 换脸</span>
                        <span v-if="c.judgment && c.judgment.is_fraud" class="tag tag-fraud">诈骗：{{ c.judgment.fraud_type || '未知类型' }}（{{ c.judgment.confidence }}）</span>
                        <span v-else-if="c.judgment" class="tag tag-safe">未发现诈骗</span>
                    </div>
                    <p class="case-summary">{{ c.chat_history || '（无内容摘要）' }}</p>
                    <span class="case-detail-hint">点击查看分析报告 →</span>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { displayCaseName } from '../utils/format'

const router = useRouter()

const cases = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const keyword = ref('')
const statusFilter = ref('all')
const selectedIds = ref<string[]>([])
const deleting = ref(false)

const filters = [
    { value: 'all', label: '全部' },
    { value: 'fraud', label: '涉嫌诈骗' },
    { value: 'safe', label: '未发现诈骗' },
    { value: 'deepfake', label: 'AI 换脸' },
]

const stats = computed(() => {
    const list = cases.value
    return {
        total: list.length,
        fraud: list.filter(c => c.judgment && c.judgment.is_fraud).length,
        safe: list.filter(c => c.judgment && !c.judgment.is_fraud).length,
        deepfake: list.filter(c => c.deepfake_alert).length,
    }
})

const filteredCases = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return cases.value.filter(c => {
        if (statusFilter.value === 'fraud' && !(c.judgment && c.judgment.is_fraud)) return false
        if (statusFilter.value === 'safe' && !(c.judgment && !c.judgment.is_fraud)) return false
        if (statusFilter.value === 'deepfake' && !c.deepfake_alert) return false
        if (kw) {
            const haystack = [displayCaseName(c.case_id), c.case_id, c.victim, c.suspect, c.judgment?.fraud_type, c.chat_history]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            if (!haystack.includes(kw)) return false
        }
        return true
    })
})

const allFilteredSelected = computed(() =>
    filteredCases.value.length > 0 &&
    filteredCases.value.every(c => selectedIds.value.includes(c.case_id))
)

function formatTime(ts: string) {
    if (!ts) return '未知时间'
    const d = new Date(Number(ts))
    if (isNaN(d.getTime())) return String(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isSelected(caseId: string): boolean {
    return selectedIds.value.includes(caseId)
}

function toggleSelect(caseId: string) {
    const i = selectedIds.value.indexOf(caseId)
    if (i >= 0) {
        selectedIds.value.splice(i, 1)
    } else {
        selectedIds.value.push(caseId)
    }
}

function toggleSelectAll() {
    const ids = filteredCases.value.map(c => c.case_id)
    if (allFilteredSelected.value) {
        selectedIds.value = selectedIds.value.filter(id => !ids.includes(id))
    } else {
        ids.forEach(id => {
            if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
        })
    }
}

function clearSelection() {
    selectedIds.value = []
}

function openCase(caseId: string) {
    router.push(`/history/${encodeURIComponent(caseId)}`)
}

async function loadCases() {
    loading.value = true
    error.value = ''
    try {
        const res = await axios.get('/api/v1/history')
        cases.value = res.data.cases || []
    } catch (e: any) {
        error.value = e.message || '网络错误'
    } finally {
        loading.value = false
    }
}

async function deleteCases(ids: string[]) {
    if (ids.length === 0 || deleting.value) return
    const items = ids.map(id => {
        const c = cases.value.find(x => x.case_id === id)
        return { id, label: displayCaseName(c ? c.case_id : id) }
    })
    const first = items[0]
    const label = items.length === 1 && first ? `案件 ${first.label}` : `选中的 ${items.length} 个案件`
    if (!window.confirm(`确认删除${label}？该操作不可恢复。`)) return
    deleting.value = true
    try {
        const results = await Promise.all(items.map(async (item) => {
            try {
                await axios.delete(`/api/v1/history/${encodeURIComponent(item.id)}`)
                return { id: item.id, label: item.label, ok: true, msg: '' }
            } catch (e: any) {
                return { id: item.id, label: item.label, ok: false, msg: (e.response && e.response.data && e.response.data.detail) || e.message || '未知错误' }
            }
        }))
        const failed = results.filter(r => !r.ok)
        if (failed.length > 0) {
            alert(`删除失败 ${failed.length} 项：\n` + failed.map(f => `${f.label}: ${f.msg}`).join('\n'))
        }
        const deletedSet = new Set(results.filter(r => r.ok).map(r => r.id))
        cases.value = cases.value.filter(c => !deletedSet.has(c.case_id))
        selectedIds.value = selectedIds.value.filter(id => !deletedSet.has(id))
    } finally {
        deleting.value = false
    }
}

onMounted(loadCases)
</script>

<style scoped>
.page-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px 60px;
}

.page-header {
    margin-bottom: 24px;
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

/* ========== 统计概览 ========== */
.stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
}

.stat-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.stat-num {
    font-size: 26px;
    font-weight: 700;
    color: #1a2332;
    line-height: 1;
}

.stat-label {
    font-size: 13px;
    color: #64748b;
}

.stat-fraud .stat-num {
    color: #dc2626;
}

.stat-safe .stat-num {
    color: #16a34a;
}

.stat-deepfake .stat-num {
    color: #d97706;
}

/* ========== 工具栏 ========== */
.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.search-box {
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0 12px;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.search-box:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
    width: 16px;
    height: 16px;
    color: #94a3b8;
    flex-shrink: 0;
}

.search-box input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    padding: 10px 0;
    font-size: 14px;
    color: #1e293b;
    font-family: inherit;
}

.search-box input::placeholder {
    color: #94a3b8;
}

.filter-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.filter-chip {
    padding: 6px 14px;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    background: #fff;
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.filter-chip:hover {
    border-color: #3b82f6;
    color: #3b82f6;
}

.filter-chip--active {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #1d4ed8;
    font-weight: 600;
}

.btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #475569;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.btn-refresh svg {
    width: 14px;
    height: 14px;
}

.btn-refresh:hover {
    background: #f1f5f9;
    color: #1e293b;
}

/* ========== 批量操作栏 ========== */
.batch-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    padding: 10px 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.batch-select-all {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #1e40af;
    cursor: pointer;
    user-select: none;
}

.batch-select-all input {
    width: 15px;
    height: 15px;
    accent-color: #2563eb;
    cursor: pointer;
    margin: 0;
}

.batch-count {
    font-size: 13px;
    color: #1e40af;
    font-weight: 600;
}

.btn-batch {
    padding: 6px 14px;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    background: #fff;
    color: #1d4ed8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.btn-batch:hover {
    background: #dbeafe;
}

.btn-batch--danger {
    border-color: #fecaca;
    color: #dc2626;
}

.btn-batch--danger:hover {
    background: #fee2e2;
}

.btn-batch:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ========== 案件列表 ========== */
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
    transition: box-shadow 0.2s, border-color 0.2s;
    border: 1px solid transparent;
    cursor: pointer;
}

.case-card:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.case-card--selected {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.case-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.case-card-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.case-check {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
}

.case-check input {
    width: 15px;
    height: 15px;
    accent-color: #2563eb;
    cursor: pointer;
    margin: 0;
}

.case-id {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.case-card-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.case-time {
    font-size: 13px;
    color: #94a3b8;
}

.case-delete-btn {
    padding: 4px 10px;
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: #fff;
    color: #dc2626;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.case-delete-btn:hover {
    background: #fef2f2;
}

.case-delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

.tag-record {
    background: #f8fafc;
    color: #64748b;
    font-family: monospace;
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

    .stats-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .stat-card {
        padding: 12px 8px;
    }

    .stat-num {
        font-size: 20px;
    }

    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-chips {
        justify-content: center;
    }

    .btn-refresh {
        justify-content: center;
    }
}
</style>
