// 全局消息中心（侧端弹出信息栏）的响应式状态
// 通知持久化到 localStorage：页面刷新后通知与在途提交不丢失
// 在途案件由「历史记录轮询」兜底对账：案件入库且带研判结果即视为完成，
// 不依赖 HTTP 响应是否送达（响应丢失时通知也能正确收敛为「分析完成」）
import { reactive, watch } from 'vue'
import axios from 'axios'
import { displayCaseName } from './utils/format'

export type NotifyType = 'success' | 'error' | 'info'

export interface NotifyItem {
  id: number
  type: NotifyType
  title: string
  message: string
  time: string
  caseId?: string
  /** 是否仍在后台分析中（刷新后用于恢复在途提交） */
  analyzing?: boolean
  /** 提交时的原始案件名称（分析中通知用于刷新后匹配历史记录） */
  submissionName?: string
  /** 提交时间戳（毫秒），刷新后按时间窗匹配历史记录 */
  ts?: number
  /** 已进入刷新恢复流程（避免重复处理） */
  recovered?: boolean
  read: boolean
}

const STORAGE_KEY = 'mpia_notify_items'

const state = reactive({
  items: [] as NotifyItem[],
  open: false,
})

let nextId = 1

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
  } catch {
    /* 存储失败（如超出配额）时静默降级 */
  }
}

// 任何变更自动持久化
watch(() => state.items, () => persist(), { deep: true })

// 页面加载时恢复上次会话的通知
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      state.items.splice(0, state.items.length, ...arr)
      nextId = (arr.reduce((m: number, i: { id: number }) => Math.max(m, i.id), 0) || 0) + 1
    }
  }
} catch {
  /* 数据损坏时忽略 */
}

// ========== 在途案件对账轮询（10s 一次，直到没有在途案件） ==========
let pollTimer: number | null = null
let pollCount = 0
const POLL_INTERVAL = 10000
const POLL_MAX = 120 // 最多轮询 20 分钟，之后提示可能中断

function stopPoller() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollOnce() {
  pollCount++
  const pending = state.items.filter(i => i.analyzing && i.ts && i.submissionName)
  if (pending.length === 0) {
    stopPoller()
    return
  }
  try {
    const res = await axios.get('/api/v1/history?limit=50')
    const cases = res.data.cases || []
    for (const item of pending) {
      // 案件入库且带研判结果（judgment）才算完成，避免在研判落地前误报完成
      const hit = cases.find((c: any) =>
        c.judgment &&
        c.created_at &&
        c.created_at >= (item.ts || 0) - 120000 &&
        displayCaseName(c.case_id) === item.submissionName
      )
      if (hit) {
        const j = hit.judgment || {}
        const verdict = j.is_fraud ? '涉嫌诈骗' : '暂未发现诈骗'
        const conf = j.confidence_score != null ? `置信度 ${j.confidence_score}` : ''
        Object.assign(item, {
          analyzing: false,
          recovered: false,
          type: 'success',
          title: '分析完成',
          caseId: hit.case_id,
          message: `案件：${displayCaseName(hit.case_id)}\n${verdict}${conf ? ' · ' + conf : ''}\n结果已同步到历史记录\n点击「查看完整报告」查看结果`,
        })
      }
    }
  } catch {
    /* 网络波动，下一轮继续 */
  }
  if (pollCount >= POLL_MAX) {
    state.items.forEach(i => {
      if (i.analyzing) {
        Object.assign(i, {
          analyzing: false,
          recovered: false,
          type: 'info',
          title: '结果未找到',
          message: '长时间未在历史记录中找到该案件，分析可能已被中断，请到「历史案件」页查看或重新提交',
        })
      }
    })
    stopPoller()
  }
}

/** 确保在途案件对账轮询在运行（幂等）。 */
export function ensureAnalyzingPoller() {
  if (pollTimer !== null) return
  pollTimer = window.setInterval(pollOnce, POLL_INTERVAL)
  // 立即跑一次，减少等待
  void pollOnce()
}

// 页面加载时恢复上次会话的通知；在途案件提示「后台进行中」并启动对账轮询
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      state.items.splice(0, state.items.length, ...arr)
      nextId = (arr.reduce((m: number, i: { id: number }) => Math.max(m, i.id), 0) || 0) + 1
      const now = Date.now()
      state.items.forEach(i => {
        if (i.analyzing) {
          // 已超过 20 分钟的在途案件不再等待轮询（大概率已中断）
          if (i.ts && now - i.ts > POLL_MAX * POLL_INTERVAL) {
            Object.assign(i, {
              analyzing: false,
              type: 'info',
              title: '结果未找到',
              message: `案件：${i.submissionName || ''}\n提交已超过 20 分钟仍未完成，可能已被中断，请到「历史案件」页查看或重新提交`,
            })
          } else {
            Object.assign(i, {
              recovered: true,
              message: `案件：${i.submissionName || ''}\n页面已刷新，分析仍在后台进行，完成后将自动更新...`,
            })
          }
        }
      })
    }
  }
} catch {
  /* 数据损坏时忽略 */
}

// 启动全局对账轮询（刷新后自动恢复在途提交）
ensureAnalyzingPoller()

export const notifyState = state

export interface NotifyPayload {
  type: NotifyType
  title: string
  message: string
  caseId?: string
  analyzing?: boolean
  submissionName?: string
}

export function pushNotify(payload: NotifyPayload): NotifyItem {
  const item: NotifyItem = {
    id: nextId++,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    caseId: payload.caseId,
    analyzing: payload.analyzing,
    submissionName: payload.submissionName,
    ts: Date.now(),
    read: false,
  }
  state.items.unshift(item)
  // 最多保留 50 条，避免无限增长
  if (state.items.length > 50) {
    state.items.pop()
  }
  state.open = true
  return item
}

export function updateNotify(id: number, patch: Partial<Omit<NotifyItem, 'id' | 'time' | 'read'>>) {
  const item = state.items.find(x => x.id === id)
  if (item) {
    Object.assign(item, patch)
  }
}

export function togglePanel() {
  state.open = !state.open
}

export function openPanel() {
  state.open = true
}

export function closePanel() {
  state.open = false
}

export function markAllRead() {
  state.items.forEach(i => {
    i.read = true
  })
}

export function removeItem(id: number) {
  const i = state.items.findIndex(x => x.id === id)
  if (i >= 0) {
    state.items.splice(i, 1)
  }
}
