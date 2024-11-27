class ReviewManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.selectedReviews = new Set();
        this.filters = {
            search: '',
            type: '',
            status: '',
            rating: ''
        };
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadStats();
        await this.loadReviews();
        this.initModals();
    }

    // 初始化事件监听
    initEventListeners() {
        // 搜索和筛选
        document.querySelector('.search-input').addEventListener('input', 
            debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadReviews();
            }, 500)
        );

        document.querySelector('.type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.loadReviews();
        });

        document.querySelector('.status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadReviews();
        });

        document.querySelector('.rating-filter').addEventListener('change', (e) => {
            this.filters.rating = e.target.value;
            this.currentPage = 1;
            this.loadReviews();
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

    // 加载统计数据
    async loadStats() {
        try {
            const response = await fetch('/api/admin/reviews/stats');
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
        statCards[0].textContent = stats.totalReviews;
        statCards[1].textContent = stats.pendingReviews;
        statCards[2].textContent = stats.averageRating.toFixed(1);
    }

    // 加载评论列表
    async loadReviews() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`/api/admin/reviews?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderReviews(data.data.reviews);
                this.updatePagination(data.data.pagination);
            }
        } catch (error) {
            console.error('加载评论列表失败:', error);
            this.showError('加载评论列表失败，请重试');
        }
    }

    // 渲染评论列表
    renderReviews(reviews) {
        const reviewsList = document.querySelector('.reviews-list');
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="user-info">
                        <img src="${review.user.avatar}" alt="${review.user.nickname}" class="user-avatar">
                        <div class="user-details">
                            <span class="user-name">${review.user.nickname}</span>
                            <span class="review-time">${this.formatDate(review.createdAt)}</span>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${this.generateStars(review.rating)}
                    </div>
                </div>
                <div class="review-content">${review.content}</div>
                ${review.images?.length ? `
                    <div class="review-images">
                        ${review.images.map(image => `
                            <div class="review-image">
                                <img src="${image}" alt="评论图片">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="review-meta">
                    <div class="review-target">
                        <span>${this.getTypeLabel(review.type)}</span>
                        <span>·</span>
                        <span>${review.target.name}</span>
                    </div>
                    <div class="review-actions">
                        <button class="btn btn-sm" onclick="reviewManagement.showReviewModal('${review._id}')">
                            <i class="fas fa-check-circle"></i> 审核
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="reviewManagement.deleteReview('${review._id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 生成星级评分
    generateStars(rating) {
        return `
            ${'<i class="fas fa-star"></i>'.repeat(rating)}
            ${'<i class="far fa-star"></i>'.repeat(5 - rating)}
        `;
    }

    // 显示审核弹窗
    async showReviewModal(reviewId) {
        try {
            const response = await fetch(`/api/admin/reviews/${reviewId}`);
            const data = await response.json();

            if (data.success) {
                const modal = document.getElementById('reviewModal');
                const review = data.data;

                modal.querySelector('.review-detail').innerHTML = `
                    <div class="user-info">
                        <img src="${review.user.avatar}" alt="${review.user.nickname}" class="user-avatar">
                        <div class="user-details">
                            <span class="user-name">${review.user.nickname}</span>
                            <span class="review-time">${this.formatDate(review.createdAt)}</span>
                        </div>
                    </div>
                    <div class="review-rating">${this.generateStars(review.rating)}</div>
                    <div class="review-content">${review.content}</div>
                `;

                modal.dataset.reviewId = reviewId;
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('获取评论详情失败:', error);
            this.showError('获取评论详情失败');
        }
    }

    // 提交审核
    async submitReview() {
        try {
            const modal = document.getElementById('reviewModal');
            const reviewId = modal.dataset.reviewId;
            const result = document.querySelector('select[name="reviewResult"]').value;
            const comment = document.querySelector('textarea[name="reviewComment"]').value;

            const response = await fetch(`/api/admin/reviews/${reviewId}/review`, {
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
                this.loadReviews();
                this.loadStats();
                this.showSuccess('审核提交成功');
            }
        } catch (error) {
            console.error('提交审核失败:', error);
            this.showError('提交审核失败');
        }
    }

    // 工具方法
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
            spot: '景点评论',
            guide: '攻略评论',
            blindbox: '盲盒评论'
        };
        return typeMap[type] || type;
    }

    // 其他辅助方法...
}

// 初始化评论管理
let reviewManagement;
document.addEventListener('DOMContentLoaded', () => {
    reviewManagement = new ReviewManagement();
}); 