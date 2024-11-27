class ReviewsManager {
    constructor() {
        this.init();
        this.isLoading = false;
    }

    init() {
        this.bindFilterTags();
        this.bindSort();
        this.bindLikeButtons();
        this.bindCommentButtons();
        this.bindPagination();
    }

    bindFilterTags() {
        const tags = document.querySelectorAll('.filter-tags .tag');
        tags.forEach(tag => {
            tag.addEventListener('click', () => {
                if (this.isLoading) return;
                tags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                this.updateReviewsList();
            });
        });
    }

    bindSort() {
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                if (this.isLoading) return;
                this.updateReviewsList();
            });
        }
    }

    bindLikeButtons() {
        const likeButtons = document.querySelectorAll('.like-btn');
        likeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.checkLogin()) return;
                
                const count = parseInt(btn.querySelector('span').textContent.match(/\d+/)[0]);
                if (btn.classList.contains('liked')) {
                    btn.classList.remove('liked');
                    btn.querySelector('span').textContent = `👍 有帮助 (${count - 1})`;
                } else {
                    btn.classList.add('liked');
                    btn.querySelector('span').textContent = `👍 有帮助 (${count + 1})`;
                    this.showMessage('感谢您的支持！', 'success');
                }
            });
        });
    }

    bindCommentButtons() {
        const commentButtons = document.querySelectorAll('.comment-btn');
        commentButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.checkLogin()) return;
                
                // 显示评论框
                this.showCommentBox(btn.closest('.review-card'));
            });
        });
    }

    bindPagination() {
        const prevBtn = document.querySelector('.prev-page');
        const nextBtn = document.querySelector('.next-page');
        const pageNumbers = document.querySelectorAll('.page-numbers span');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changePage('prev'));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changePage('next'));
        }
        pageNumbers.forEach(num => {
            num.addEventListener('click', (e) => this.goToPage(e.target));
        });
    }

    changePage(direction) {
        if (this.isLoading) return;
        
        const currentPage = document.querySelector('.page-numbers span.active');
        const pages = document.querySelectorAll('.page-numbers span');
        const currentIndex = Array.from(pages).indexOf(currentPage);

        if (direction === 'prev' && currentIndex > 0) {
            this.goToPage(pages[currentIndex - 1]);
        } else if (direction === 'next' && currentIndex < pages.length - 1) {
            this.goToPage(pages[currentIndex + 1]);
        }
    }

    goToPage(pageElement) {
        if (this.isLoading || pageElement.textContent === '...') return;

        const pages = document.querySelectorAll('.page-numbers span');
        pages.forEach(p => p.classList.remove('active'));
        pageElement.classList.add('active');

        const prevBtn = document.querySelector('.prev-page');
        const nextBtn = document.querySelector('.next-page');
        const currentIndex = Array.from(pages).indexOf(pageElement);

        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex === pages.length - 1;

        this.updateReviewsList();
    }

    showCommentBox(reviewCard) {
        // 移除已存在的评论框
        const existingBox = document.querySelector('.comment-box');
        if (existingBox) existingBox.remove();

        const commentBox = document.createElement('div');
        commentBox.className = 'comment-box';
        commentBox.innerHTML = `
            <textarea placeholder="写下你的评论..."></textarea>
            <div class="comment-actions">
                <button class="cancel-btn">取消</button>
                <button class="submit-btn">发表评论</button>
            </div>
        `;

        // 插入评论框
        reviewCard.querySelector('.review-footer').after(commentBox);

        // 绑定事件
        const textarea = commentBox.querySelector('textarea');
        const cancelBtn = commentBox.querySelector('.cancel-btn');
        const submitBtn = commentBox.querySelector('.submit-btn');

        cancelBtn.addEventListener('click', () => commentBox.remove());
        submitBtn.addEventListener('click', () => this.submitComment(textarea.value, reviewCard));

        // 自动聚焦
        textarea.focus();
    }

    async submitComment(content, reviewCard) {
        if (!content.trim()) {
            this.showMessage('请输入评论内容', 'error');
            return;
        }

        try {
            // 模拟API请求
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 更新评论数
            const commentBtn = reviewCard.querySelector('.comment-btn span');
            const count = parseInt(commentBtn.textContent.match(/\d+/)[0]);
            commentBtn.textContent = `💬 评论 (${count + 1})`;

            // 移除评论框
            reviewCard.querySelector('.comment-box').remove();

            this.showMessage('评论发表成功', 'success');

        } catch (error) {
            this.showMessage('评论发表失败，请重试', 'error');
        }
    }

    async updateReviewsList() {
        if (this.isLoading) return;
        this.isLoading = true;

        const reviewsList = document.querySelector('.reviews-list');
        reviewsList.style.opacity = '0.5';
        reviewsList.style.pointerEvents = 'none';

        try {
            // 模拟API请求
            await new Promise(resolve => setTimeout(resolve, 500));

            // 恢复列表状态
            reviewsList.style.opacity = '1';
            reviewsList.style.pointerEvents = 'auto';

        } catch (error) {
            this.showMessage('加载失败，请重试', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    checkLogin() {
        // 检查登录状态
        const isLoggedIn = localStorage.getItem('authToken');
        if (!isLoggedIn) {
            this.showMessage('请先登录', 'info');
            setTimeout(() => {
                window.location.href = '../auth/login.html';
            }, 1500);
            return false;
        }
        return true;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        Object.assign(messageDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            borderRadius: '4px',
            backgroundColor: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
            color: 'white',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'slideIn 0.3s ease-out'
        });

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const reviewsManager = new ReviewsManager();
}); 