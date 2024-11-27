class GuidesPage {
    constructor() {
        this.currentPage = 1;
        this.currentCategory = 'all';
        this.filters = {
            duration: [],
            budget: [],
            season: [],
            travelType: []
        };
        this.sortBy = 'newest';
        this.init();
    }

    init() {
        this.initCategoryTabs();
        this.initFilters();
        this.initSort();
        this.initPagination();
        this.loadGuides();
        this.loadFeaturedAuthors();
    }

    // 初始化分类标签
    initCategoryTabs() {
        const tabs = document.querySelectorAll('.category-tabs a');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.currentPage = 1;
                this.loadGuides();
            });
        });
    }

    // 初始化筛选器
    initFilters() {
        document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const filterType = this.getFilterType(checkbox);
                if (checkbox.checked) {
                    this.filters[filterType].push(checkbox.value);
                } else {
                    this.filters[filterType] = this.filters[filterType].filter(v => v !== checkbox.value);
                }
                this.currentPage = 1;
                this.loadGuides();
            });
        });
    }

    // 获取筛选类型
    getFilterType(checkbox) {
        const group = checkbox.closest('.filter-group');
        const title = group.querySelector('h3').textContent.toLowerCase();
        if (title.includes('天数')) return 'duration';
        if (title.includes('预算')) return 'budget';
        if (title.includes('季节')) return 'season';
        if (title.includes('方式')) return 'travelType';
        return '';
    }

    // 初始化排序
    initSort() {
        const sortSelect = document.querySelector('.guides-sort select');
        sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.loadGuides();
        });
    }

    // 初始化分页
    initPagination() {
        const prevBtn = document.querySelector('.prev-page');
        const nextBtn = document.querySelector('.next-page');
        const pageNumbers = document.querySelector('.page-numbers');

        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadGuides();
            }
        });

        nextBtn.addEventListener('click', () => {
            this.currentPage++;
            this.loadGuides();
        });

        pageNumbers.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN' && !e.target.textContent.includes('...')) {
                this.currentPage = Number(e.target.textContent);
                this.loadGuides();
            }
        });
    }

    // 加载攻略列表
    async loadGuides() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                sort: this.sortBy,
                category: this.currentCategory,
                ...this.filters.duration.length && { duration: this.filters.duration.join(',') },
                ...this.filters.budget.length && { budget: this.filters.budget.join(',') },
                ...this.filters.season.length && { season: this.filters.season.join(',') },
                ...this.filters.travelType.length && { travelType: this.filters.travelType.join(',') }
            });

            const response = await fetch(`/api/guides?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderGuides(data.data);
                this.updatePagination(data.data.pagination);
                this.updateGuidesCount(data.data.pagination.total);
            }
        } catch (error) {
            console.error('加载攻略失败:', error);
            this.showError('加载攻略失败，请稍后重试');
        }
    }

    // 渲染攻略列表
    renderGuides(data) {
        const guidesList = document.querySelector('.guides-list');
        guidesList.innerHTML = data.guides.map(guide => this.renderGuideCard(guide)).join('');
    }

    // 渲染攻略卡片
    renderGuideCard(guide) {
        return `
            <article class="guide-card">
                <div class="guide-image" style="background-image: url('${guide.coverImage}');">
                    <div class="guide-category">${guide.category}</div>
                </div>
                <div class="guide-content">
                    <div class="guide-meta">
                        <span>${guide.duration.days}天${guide.duration.nights}晚</span>
                        <span>预算 ¥${guide.budget.min}-${guide.budget.max}</span>
                    </div>
                    <h3 class="guide-title">${guide.title}</h3>
                    <p class="guide-excerpt">${guide.summary}</p>
                    <div class="guide-footer">
                        <div class="author-info">
                            <img src="${guide.author.avatar}" alt="${guide.author.nickname}" class="author-avatar">
                            <span>${guide.author.nickname}</span>
                        </div>
                        <div class="guide-stats">
                            <span><i class="fas fa-eye"></i> ${this.formatNumber(guide.viewCount)}</span>
                            <span><i class="fas fa-heart"></i> ${this.formatNumber(guide.likeCount)}</span>
                            <span><i class="fas fa-comment"></i> ${this.formatNumber(guide.commentCount)}</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    // 加载推荐作者
    async loadFeaturedAuthors() {
        try {
            const response = await fetch('/api/users/featured-authors');
            const data = await response.json();

            if (data.success) {
                this.renderFeaturedAuthors(data.data);
            }
        } catch (error) {
            console.error('加载推荐作者失败:', error);
        }
    }

    // 渲染推荐作者
    renderFeaturedAuthors(authors) {
        const authorsList = document.querySelector('.authors-list');
        authorsList.innerHTML = authors.map(author => `
            <div class="author-card">
                <img src="${author.avatar}" alt="${author.nickname}" class="author-avatar">
                <h3>${author.nickname}</h3>
                <p>${author.bio || '这个作者很懒，什么都没写~'}</p>
                <div class="author-stats">
                    <span>${this.formatNumber(author.guideCount)} 篇攻略</span>
                    <span>${this.formatNumber(author.followers)} 粉丝</span>
                </div>
                <button class="follow-btn" data-id="${author._id}">
                    ${author.isFollowed ? '已关注' : '+ 关注'}
                </button>
            </div>
        `).join('');

        // 添加关注按钮事件
        this.initFollowButtons();
    }

    // 初始化关注按钮
    initFollowButtons() {
        document.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!this.isLoggedIn()) {
                    location.href = '/auth/login.html';
                    return;
                }

                try {
                    const response = await fetch(`/api/users/${btn.dataset.id}/follow`, {
                        method: 'POST'
                    });
                    const data = await response.json();

                    if (data.success) {
                        btn.textContent = data.data.isFollowed ? '已关注' : '+ 关注';
                    }
                } catch (error) {
                    console.error('关注操作失败:', error);
                }
            });
        });
    }

    // 更新分页
    updatePagination(pagination) {
        const { total, page, pages } = pagination;
        const prevBtn = document.querySelector('.prev-page');
        const nextBtn = document.querySelector('.next-page');
        const pageNumbers = document.querySelector('.page-numbers');

        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === pages;

        let pageHTML = '';
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
                pageHTML += `<span class="${i === page ? 'active' : ''}">${i}</span>`;
            } else if (i === page - 2 || i === page + 2) {
                pageHTML += `<span>...</span>`;
            }
        }
        pageNumbers.innerHTML = pageHTML;
    }

    // 更新攻略数量
    updateGuidesCount(total) {
        document.querySelector('.guides-count strong').textContent = total;
    }

    // 格式化数字
    formatNumber(num) {
        return num > 999 ? (num/1000).toFixed(1) + 'k' : num;
    }

    // 检查登录状态
    isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    // 显示错误信息
    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    new GuidesPage();
}); 