<template>
  <div class="app-layout">
    <aside class="sidebar">
      <nav class="menu">
        <div id="title">
          警务研判系统
        </div>

        <div class="home">
          <strong>
            <router-link to="/" class="menu-item">首页</router-link>
          </strong>
          <strong>
            <router-link to="/history" class="menu-item">历史案件</router-link>
          </strong>
        </div>
      </nav>
    </aside>

    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style lang="css" scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
.sidebar {
  width: 240px;
  background: #2d3748;   /* 深色背景 */
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  /* flex-shrink: 0;        防止被压缩 */
}
.logo {
  padding: 0 24px 30px 24px;
  border-bottom: 1px solid #4a5568;
}
.menu {
  display: flex;
  flex-direction: column;
  height: 100%; /* 让菜单容器撑满侧边栏高度 */
  padding-top: 20px; /* 顶部的内边距，让内容离顶有一点距离 */
  color: aqua;
  flex: 1;
  padding: 0 24px;
}
.menu-item {
  display: flex;         /* 使用 Flex 布局方便居中 */
  justify-content: center; /* 水平居中 */
  align-items: center;   /* 垂直居中 (如果高度固定可省略) */
  
  margin: 24px 0px 6px 0px;
  padding: 10px 16px;
  color: #e2e8f0;
  text-decoration: none; /* 核心：去掉下划线 */
  border: 1px solid darkcyan;
  border-radius: 6px;
  transition: all 0.2s;
}
.menu-item:hover {
  background: #4a5568;
  border-color: #718096;
}
/* .spring {
  flex: 1;
} */
#title {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  color: #e2e8f0;
  text-size-adjust: 10px;
  font-size:28px
}

.main-content {
  flex: 1;
  height: 100vh; 
  padding: 10px;
  overflow-y: auto;
}

</style>
