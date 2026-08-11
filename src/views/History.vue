<template>
    <div class="page-container">
        <div class="page-header">
            <h1 class="page-title">历史案件</h1>
            <p class="page-desc">查看和管理已分析的历史案件记录</p>
        </div>

        <div class="empty-state">
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
    </div>
</template>

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
