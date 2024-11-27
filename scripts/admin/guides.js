class GuideManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.selectedGuides = new Set();
        this.filters = {
            search: '',
            category: '',
            status: ''
        };
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadGuides();
        this.initModals();
    }

    // 初始化事件监听
    initEventListeners() {
        // 搜索和筛选
        document.querySelector('.search-input').addEventListener('input', 
            debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadGuides();
            }, 500)
        );

        document.querySelector('.category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadGuides();
        });

        document.querySelector('.status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadGuides();
        });

        // 全选功能
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const guideId = checkbox.getAttribute('data-guide-id');
                if (e.target.checked) {
                    this.selectedGuides.add(guideId);
                } else {
                    this.selectedGuides.delete(guideId);
                }
            });
            this.updateBatchButtons();
        });

        // 批量操作按钮
        document.getElementById('batchApproveBtn').addEventListener('click', () => {
            this.batchApprove();
        });

        document.getElementById('batchRejectBtn').addEventListener('click', () => {
            this.batchReject();
        });

        // 提交审核按钮
        document.getElementById('submitReview').addEventListener('click', () => {
            this.submitReview();
        });
    }

    // 加载攻略列表
    async loadGuides() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`/api/admin/guides?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderGuides(data.data.guides);
                this.updatePagination(data.data.pagination);
            }
        } catch (error) {
            console.error('加载攻略列表失败:', error);
            this.showError('加载攻略列表失败，请重试');
        }
    }

    // 渲染攻略列表
    renderGuides(guides) {
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = guides.map(guide => `
            <tr>
                <td>
                    <input type="checkbox" 
                           data-guide-id="${guide._id}" 
                           ${this.selectedGuides.has(guide._id) ? 'checked' : ''}>
                </td>
                <td class="guide-title">${guide.title}</td>
                <td>
                    <div class="author-info">
                        <img src="${guide.author.avatar}" alt="${guide.author.nickname}" class="author-avatar">
                        <span>${guide.author.nickname}</span>
                    </div>
                </td>
                <td>${this.getCategoryLabel(guide.category)}</td>
                <td>
                    <span class="status-badge ${guide.status}">
                        ${this.getStatusLabel(guide.status)}
                    </span>
                </td>
                <td>${this.formatDate(guide.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="guideManagement.viewGuide('${guide._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="guideManagement.reviewGuide('${guide._id}')">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button class="action-btn" onclick="guideManagement.deleteGuide('${guide._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 重新绑定checkbox事件
        this.bindCheckboxEvents();
    }

    // 查看攻略详情
    async viewGuide(guideId) {
        try {
            const response = await fetch(`/api/admin/guides/${guideId}`);
            const data = await response.json();

            if (data.success) {
                window.open(`/guides/detail.html?id=${guideId}`, '_blank');
            }
        } catch (error) {
            console.error('获取攻略详情失败:', error);
            this.showError('获取攻略详情失败');
        }
    }

    // 审核攻略
    async reviewGuide(guideId) {
        try {
            const response = await fetch(`/api/admin/guides/${guideId}`);
            const data = await response.json();

            if (data.success) {
                this.showReviewModal(data.data);
            }
        } catch (error) {
            console.error('获取攻略信息失败:', error);
            this.showError('获取攻略信息失败');
        }
    }

    // 显示审核弹窗
    showReviewModal(guide) {
        const modal = document.getElementById('reviewModal');
        const preview = modal.querySelector('.guide-preview');
        
        preview.innerHTML = `
            <h3>${guide.title}</h3>
            <div class="guide-meta">
                <span>作者：${guide.author.nickname}</span>
                <span>类别：${this.getCategoryLabel(guide.category)}</span>
                <span>创建时间：${this.formatDate(guide.createdAt)}</span>
            </div>
            <div class="guide-content">
                ${guide.content}
            </div>
        `;

        modal.style.display = 'block';
        modal.dataset.guideId = guide._id;
    }

    // 提交审核
    async submitReview() {
        try {
            const modal = document.getElementById('reviewModal');
            const guideId = modal.dataset.guideId;
            const result = document.querySelector('select[name="reviewResult"]').value;
            const comment = document.querySelector('textarea[name="reviewComment"]').value;

            const response = await fetch(`/api/admin/guides/${guideId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: result,
                    comment
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeModals();
                this.loadGuides();
                this.showSuccess('审核提交成功');
            }
        } catch (error) {
            console.error('提交审核失败:', error);
            this.showError('提交审核失败');
        }
    }

    // 批量通过
    async batchApprove() {
        if (this.selectedGuides.size === 0) {
            this.showError('请选择要审核的攻略');
            return;
        }

        if (confirm('确定要批量通过选中的攻略吗？')) {
            try {
                const response = await fetch('/api/admin/guides/batch-approve', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        guideIds: Array.from(this.selectedGuides)
                    })
                });

                const data = await response.json();

                if (data.success) {
                    this.selectedGuides.clear();
                    this.loadGuides();
                    this.showSuccess('批量通过成功');
                }
            } catch (error) {
                console.error('批量通过失败:', error);
                this.showError('批量通过失败');
            }
        }
    }

    // 工具方法
    getCategoryLabel(category) {
        const categoryMap = {
            domestic: '国内游',
            overseas: '境外游',
            food: '美食攻略',
            photography: '摄影攻略',
            budget: '省钱攻略'
        };
        return categoryMap[category] || category;
    }

    getStatusLabel(status) {
        const statusMap = {
            published: '已发布',
            draft: '草稿',
            pending: '待审核',
            rejected: '已拒绝'
        };
        return statusMap[status] || status;
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

    // 其他辅助方法...
}

// 初始化攻略管理
let guideManagement;
document.addEventListener('DOMContentLoaded', () => {
    guideManagement = new GuideManagement();
}); 