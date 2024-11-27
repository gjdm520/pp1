class OrderManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.filters = {
            search: '',
            type: '',
            status: '',
            startDate: '',
            endDate: ''
        };
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadStats();
        await this.loadOrders();
        this.initModals();
    }

    // 初始化事件监听
    initEventListeners() {
        // 搜索和筛选
        document.querySelector('.search-input').addEventListener('input', 
            debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            }, 500)
        );

        document.querySelector('.type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.loadOrders();
        });

        document.querySelector('.status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadOrders();
        });

        // 日期范围选择
        document.querySelector('.start-date').addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
            this.loadOrders();
        });

        document.querySelector('.end-date').addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
            this.loadOrders();
        });

        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportOrders();
        });

        // 退款处理按钮
        document.getElementById('submitRefund').addEventListener('click', () => {
            this.handleRefund();
        });
    }

    // 加载统计数据
    async loadStats() {
        try {
            const response = await fetch('/api/admin/orders/stats');
            const data = await response.json();

            if (data.success) {
                this.updateStats(data.data);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }

    // 更新统计数据显示
    updateStats(stats) {
        const statCards = document.querySelectorAll('.stat-card .stat-value');
        statCards[0].textContent = stats.todayOrders;
        statCards[1].textContent = `¥${this.formatNumber(stats.todayRevenue)}`;
        statCards[2].textContent = stats.pendingRefunds;
    }

    // 加载订单列表
    async loadOrders() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`/api/admin/orders?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderOrders(data.data.orders);
                this.updatePagination(data.data.pagination);
            }
        } catch (error) {
            console.error('加载订单列表失败:', error);
            this.showError('加载订单列表失败，请重试');
        }
    }

    // 渲染订单列表
    renderOrders(orders) {
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.orderNo}</td>
                <td>
                    <div class="user-info">
                        <img src="${order.user.avatar}" alt="${order.user.nickname}" class="user-avatar">
                        <div>
                            <div>${order.user.nickname}</div>
                            <div class="user-contact">${order.contactPhone}</div>
                        </div>
                    </div>
                </td>
                <td>${this.getTypeLabel(order.type)}</td>
                <td>¥${this.formatNumber(order.amount)}</td>
                <td>${this.getPaymentLabel(order.paymentMethod)}</td>
                <td>
                    <span class="status-badge ${order.status}">
                        ${this.getStatusLabel(order.status)}
                    </span>
                </td>
                <td>${this.formatDate(order.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="orderManagement.viewOrder('${order._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.status === 'refunding' ? `
                            <button class="action-btn" onclick="orderManagement.showRefundModal('${order._id}')">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 查看订单详情
    async viewOrder(orderId) {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`);
            const data = await response.json();

            if (data.success) {
                this.showOrderDetail(data.data);
            }
        } catch (error) {
            console.error('获取订单详情失败:', error);
            this.showError('获取订单详情失败');
        }
    }

    // 显示订单详情
    showOrderDetail(order) {
        const modal = document.getElementById('orderDetailModal');
        modal.querySelector('.modal-body').innerHTML = `
            <div class="order-detail-section">
                <h3>基本信息</h3>
                <div class="detail-grid">
                    <div>订单号：${order.orderNo}</div>
                    <div>下单时间：${this.formatDate(order.createdAt)}</div>
                    <div>订单状态：${this.getStatusLabel(order.status)}</div>
                    <div>支付方式：${this.getPaymentLabel(order.paymentMethod)}</div>
                </div>
            </div>
            <div class="order-detail-section">
                <h3>用户信息</h3>
                <div class="detail-grid">
                    <div>用户名：${order.user.nickname}</div>
                    <div>联系电话：${order.contactPhone}</div>
                    <div>联系邮箱：${order.user.email}</div>
                </div>
            </div>
            <div class="order-detail-section">
                <h3>订单内容</h3>
                <div class="order-items">
                    ${this.renderOrderItems(order)}
                </div>
            </div>
            ${order.refundInfo ? `
                <div class="order-detail-section">
                    <h3>退款信息</h3>
                    <div class="detail-grid">
                        <div>申请时间：${this.formatDate(order.refundInfo.requestTime)}</div>
                        <div>退款金额：¥${this.formatNumber(order.refundInfo.amount)}</div>
                        <div>退款原因：${order.refundInfo.reason}</div>
                        <div>处理状态：${this.getRefundStatusLabel(order.refundInfo.status)}</div>
                    </div>
                </div>
            ` : ''}
        `;

        modal.style.display = 'block';
    }

    // 导出订单数据
    async exportOrders() {
        try {
            const params = new URLSearchParams(this.filters);
            const response = await fetch(`/api/admin/orders/export?${params}`);
            const blob = await response.blob();
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('导出订单失败:', error);
            this.showError('导出订单失败');
        }
    }

    // 工具方法
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    formatDate(date) {
        return new Date(date).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getTypeLabel(type) {
        const typeMap = {
            spot: '景点门票',
            guide: '攻略购买',
            blindbox: '盲盒旅行'
        };
        return typeMap[type] || type;
    }

    getStatusLabel(status) {
        const statusMap = {
            pending: '待支付',
            paid: '已支付',
            completed: '已完成',
            refunding: '退款中',
            refunded: '已退款',
            cancelled: '已取消'
        };
        return statusMap[status] || status;
    }

    getPaymentLabel(method) {
        const methodMap = {
            alipay: '支付宝',
            wechat: '微信支付',
            unionpay: '银联支付'
        };
        return methodMap[method] || method;
    }
}

// 初始化订单管理
let orderManagement;
document.addEventListener('DOMContentLoaded', () => {
    orderManagement = new OrderManagement();
}); 