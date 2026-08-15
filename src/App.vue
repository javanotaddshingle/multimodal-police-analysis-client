<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-area">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="logo-text">
            <span class="logo-title">警务研判系统</span>
            <span class="logo-subtitle">多模态综合分析平台</span>
          </div>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="nav-label">首页分析</span>
        </router-link>

        <router-link to="/history" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="nav-label">历史案件</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-info">
          <span class="footer-version">v1.0.0</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
  <NotifyPanel />
</template>

<script>
import NotifyPanel from '@/components/NotifyPanel.vue'

export default {
  name: 'App',
  components: {
    NotifyPanel,
  },
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f0f2f5;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: linear-gradient(180deg, #1a2332 0%, #15202b 100%);
  color: #c8d6e5;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.sidebar-header {
  padding: 28px 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}

.logo-subtitle {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  letter-spacing: 0.5px;
}

/* ========== 导航菜单 ========== */
.nav-menu {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.nav-item--active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.15) 100%);
  color: #60a5fa;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  opacity: 0.8;
}

.nav-item--active .nav-icon {
  opacity: 1;
}

/* ========== 侧边栏底部 ========== */
.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-version {
  font-size: 12px;
  color: #475569;
}

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f0f2f5;
}

/* 自定义滚动条 */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: #c1c9d2;
  border-radius: 3px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #a0aab4;
}
</style>
