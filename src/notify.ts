// 全局消息中心（侧端弹出信息栏）的响应式状态
import { reactive } from 'vue'

export type NotifyType = 'success' | 'error' | 'info'

export interface NotifyItem {
  id: number
  type: NotifyType
  title: string
  message: string
  time: string
  caseId?: string
  read: boolean
}

const state = reactive({
  items: [] as NotifyItem[],
  open: false,
})

let nextId = 1

export const notifyState = state

export interface NotifyPayload {
  type: NotifyType
  title: string
  message: string
  caseId?: string
}

export function pushNotify(payload: NotifyPayload): NotifyItem {
  const item: NotifyItem = {
    id: nextId++,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    caseId: payload.caseId,
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
