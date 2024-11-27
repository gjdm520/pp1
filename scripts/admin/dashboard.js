class AdminDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.initCharts();
        this.initRealtimeUpdates();
        this.loadRecentOrders();
        this.loadRecentReviews();
        this.initEventListeners();
    }

    // 加载仪表盘数据
    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard/stats');
            const data = await response.json();

            if (data.success) {
                this.updateStatCards(data.data);
            }
        } catch (error) {
            console.error('加载仪表盘数据失败:', error);
            this.showError('加载数据失败，请刷新页面重试');
        }
    }

    // 更新统计卡片
    updateStatCards(stats) {
        // 更新用户统计
        document.querySelector('.stat-card.users .stat-value')
            .textContent = this.formatNumber(stats.userCount);
        
        // 更新订单统计
        document.querySelector('.stat-card.orders .stat-value')
            .textContent = this.formatNumber(stats.orderCount);
        
        // 更新收入统计
        document.querySelector('.stat-card.revenue .stat-value')
            .textContent = `¥${this.formatNumber(stats.totalRevenue)}`;
        
        // 更新攻略统计
        document.querySelector('.stat-card.guides .stat-value')
            .textContent = this.formatNumber(stats.guideCount);

        // 更新增长率
        this.updateGrowthRate('.users', stats.userGrowth);
        this.updateGrowthRate('.orders', stats.orderGrowth);
        this.updateGrowthRate('.revenue', stats.revenueGrowth);
        this.updateGrowthRate('.guides', stats.guideGrowth);
    }

    // 更新增长率显示
    updateGrowthRate(selector, growth) {
        const element = document.querySelector(`${selector} .stat-change`);
        const isIncrease = growth > 0;
        
        element.className = `stat-change ${isIncrease ? 'increase' : 'decrease'}`;
        element.innerHTML = `
            <i class="fas fa-arrow-${isIncrease ? 'up' : 'down'}"></i>
            ${Math.abs(growth)}% 较上月
        `;
    }

    // 初始化图表
    initCharts() {
        // 收入趋势图
        this.charts.revenue = new Chart(
            document.getElementById('revenueChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '收入',
                        data: [],
                        borderColor: '#3498db',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );

        // 用户增长图
        this.charts.users = new Chart(
            document.getElementById('userGrowthChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '新增用户',
                        data: [],
                        backgroundColor: '#2ecc71'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );

        this.updateCharts();
    }

    // 更新图表数据
    async updateCharts() {
        try {
            const response = await fetch('/api/admin/dashboard/charts');
            const data = await response.json();

            if (data.success) {
                // 更新收入趋势
                this.charts.revenue.data.labels = data.data.revenue.labels;
                this.charts.revenue.data.datasets[0].data = data.data.revenue.data;
                this.charts.revenue.update();

                // 更新用户增长
                this.charts.users.data.labels = data.data.users.labels;
                this.charts.users.data.datasets[0].data = data.data.users.data;
                this.charts.users.update();
            }
        } catch (error) {
            console.error('更新图表数据失败:', error);
        }
    }

    // 加载最近订单
    async loadRecentOrders() {
        try {
            const response = await fetch('/api/admin/dashboard/recent-orders');
            const data = await response.json();

            if (data.success) {
                const tbody = document.querySelector('.recent-orders tbody');
                tbody.innerHTML = data.data.map(order => `
                    <tr>
                        <td>${order.orderNo}</td>
                        <td>
                            <div class="user-info">
                                <img src="${order.user.avatar}" alt="${order.user.nickname}">
                                ${order.user.nickname}
                            </div>
                        </td>
                        <td>¥${order.amount}</td>
                        <td>
                            <span class="status-badge ${order.status}">
                                ${this.getOrderStatusText(order.status)}
                            </span>
                        </td>
                        <td>${this.formatDate(order.createdAt)}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('加载最近订单失败:', error);
        }
    }

    // 加载最近评价
    async loadRecentReviews() {
        try {
            const response = await fetch('/api/admin/dashboard/recent-reviews');
            const data = await response.json();

            if (data.success) {
                const reviewList = document.querySelector('.review-list');
                reviewList.innerHTML = data.data.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <img src="${review.user.avatar}" alt="${review.user.nickname}">
                            <span>${review.user.nickname}</span>
                        </div>
                        <div class="review-content">${review.content}</div>
                        <div class="review-meta">
                            <span>${this.formatDate(review.createdAt)}</span>
                            <span>${review.spot.name}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('加载最近评价失败:', error);
        }
    }

    // 初始化实时更新
    initRealtimeUpdates() {
        // 每5分钟更新一次数据
        setInterval(() => {
            this.loadDashboardData();
            this.updateCharts();
        }, 5 * 60 * 1000);

        // 每分钟更新一次最近数据
        setInterval(() => {
            this.loadRecentOrders();
            this.loadRecentReviews();
        }, 60 * 1000);
    }

    // 初始化事件监听
    initEventListeners() {
        // 通知点击事件
        document.querySelector('.notifications').addEventListener('click', () => {
            // TODO: 显示通知列表
        });

        // 用户菜单点击事件
        document.querySelector('.admin-user').addEventListener('click', () => {
            // TODO: 显示用户菜单
        });
    }

    // 工具方法
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getOrderStatusText(status) {
        const statusMap = {
            pending: '待支付',
            paid: '已支付',
            completed: '已完成',
            cancelled: '已取消',
            refunded: '已退款'
        };
        return statusMap[status] || status;
    }

    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化仪表盘
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
}); 