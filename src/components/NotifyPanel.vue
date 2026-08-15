<template>
  <div>
    <!-- 悬浮按钮 -->
    <button class="notify-fab" @click="togglePanel" title="消息中心">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unread > 0" class="notify-badge">{{ unread > 99 ? '99+' : unread }}</span>
    </button>

    <!-- 遮罩 -->
    <div v-if="notifyState.open" class="notify-overlay" @click="closePanel"></div>

    <!-- 侧端弹出信息栏 -->
    <aside class="notify-panel" :class="{ 'notify-panel--open': notifyState.open }">
      <div class="notify-header">
        <span class="notify-title">消息中心</span>
        <button class="notify-header-btn" @click="markAllRead" :disabled="notifyState.items.length === 0">
          全部已读
        </button>
        <button class="notify-close" @click="closePanel" title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="notify-body">
        <div v-if="notifyState.items.length === 0" class="notify-empty">
          <p>暂无消息</p>
        </div>
        <div v-for="item in notifyState.items" :key="item.id" class="notify-item"
          :class="[`notify-item--${item.type}`, { 'notify-item--unread': !item.read }]">
          <button class="notify-item-remove" @click="removeItem(item.id)" title="删除该消息">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div class="notify-item-top">
            <span class="notify-item-title">{{ item.title }}</span>
            <span class="notify-item-time">{{ item.time }}</span>
          </div>
          <p class="notify-item-msg">{{ item.message }}</p>
          <div v-if="item.caseId" class="notify-item-actions">
            <button class="notify-link" @click="viewDetail(item.caseId)">
              查看完整报告 →
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  notifyState,
  togglePanel,
  closePanel,
  markAllRead,
  removeItem,
} from '../notify'

const router = useRouter()

const unread = computed(() => notifyState.items.filter(i => !i.read).length)

function viewDetail(caseId: string) {
  closePanel()
  router.push(`/history/${encodeURIComponent(caseId)}`)
}
</script>

<style scoped>
/* ========== 悬浮按钮 ========== */
.notify-fab {
  position: fixed;
  right: 20px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45);
  z-index: 1000;
  transition: transform 0.2s, box-shadow 0.2s;
}

.notify-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.55);
}

.notify-fab svg {
  width: 24px;
  height: 24px;
}

.notify-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}

/* ========== 遮罩 ========== */
.notify-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 1001;
}

/* ========== 侧端面板 ========== */
.notify-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 380px;
  max-width: 92vw;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  z-index: 1002;
  transform: translateX(105%);
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
}

.notify-panel--open {
  transform: translateX(0);
}

.notify-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.notify-title {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: #1a2332;
}

.notify-header-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #475569;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.notify-header-btn:hover {
  background: #f1f5f9;
}

.notify-header-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notify-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.notify-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.notify-close svg {
  width: 16px;
  height: 16px;
}

/* ========== 消息列表 ========== */
.notify-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notify-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}

.notify-item {
  position: relative;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
  background: #f8fafc;
}

.notify-item--success {
  border-left-color: #16a34a;
}

.notify-item--error {
  border-left-color: #ef4444;
}

.notify-item--info {
  border-left-color: #3b82f6;
}

.notify-item--unread {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.notify-item--unread::after {
  content: '';
  position: absolute;
  top: 14px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
}

.notify-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding-right: 24px;
}

.notify-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.notify-item-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.notify-item-msg {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-line;
}

.notify-item-actions {
  margin-top: 8px;
}

.notify-link {
  border: none;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.notify-link:hover {
  background: #dbeafe;
}

.notify-item-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  border-radius: 4px;
}

.notify-item-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.notify-item-remove svg {
  width: 12px;
  height: 12px;
}

@media (max-width: 768px) {
  .notify-fab {
    right: 14px;
    bottom: 16px;
    width: 46px;
    height: 46px;
  }
}
</style>
