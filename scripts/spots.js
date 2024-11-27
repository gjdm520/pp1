class SpotsPage {
    constructor() {
        this.currentPage = 1;
        this.filters = {
            destination: [],
            type: [],
            season: [],
            priceRange: {
                min: null,
                max: null
            }
        };
        this.sortBy = 'rating';
        this.init();
    }

    init() {
        this.initFilters();
        this.initSort();
        this.initPagination();
        this.loadSpots();
        this.initPriceRange();
    }

    // 初始化筛选器
    initFilters() {
        // 监听复选框变化
        document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const filterType = this.getFilterType(checkbox);
                if (checkbox.checked) {
                    this.filters[filterType].push(checkbox.value);
                } else {
                    this.filters[filterType] = this.filters[filterType].filter(v => v !== checkbox.value);
                }
                this.currentPage = 1;
                this.loadSpots();
            });
        });

        // 重置筛选按钮
        document.querySelector('.reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
    }

    // 获取筛选类型
    getFilterType(checkbox) {
        const group = checkbox.closest('.filter-group');
        const title = group.querySelector('h3').textContent.toLowerCase();
        if (title.includes('目的地')) return 'destination';
        if (title.includes('类型')) return 'type';
        if (title.includes('季节')) return 'season';
        return '';
    }

    // 初始化价格范围
    initPriceRange() {
        const minInput = document.getElementById('minPrice');
        const maxInput = document.getElementById('maxPrice');
        const rangeInput = document.getElementById('priceRange');

        // 监听输入变化
        const updatePriceRange = () => {
            this.filters.priceRange.min = minInput.value ? Number(minInput.value) : null;
            this.filters.priceRange.max = maxInput.value ? Number(maxInput.value) : null;
            this.currentPage = 1;
            this.loadSpots();
        };

        minInput.addEventListener('change', updatePriceRange);
        maxInput.addEventListener('change', updatePriceRange);
        rangeInput.addEventListener('input', (e) => {
            const value = e.target.value;
            maxInput.value = value;
            updatePriceRange();
        });
    }

    // 初始化排序
    initSort() {
        const sortSelect = document.querySelector('.spots-sort select');
        sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.loadSpots();
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
                this.loadSpots();
            }
        });

        nextBtn.addEventListener('click', () => {
            this.currentPage++;
            this.loadSpots();
        });

        pageNumbers.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN' && !e.target.textContent.includes('...')) {
                this.currentPage = Number(e.target.textContent);
                this.loadSpots();
            }
        });
    }

    // 加载景点数据
    async loadSpots() {
        try {
            // 构建查询参数
            const params = new URLSearchParams({
                page: this.currentPage,
                sort: this.sortBy,
                ...this.filters.destination.length && { destination: this.filters.destination.join(',') },
                ...this.filters.type.length && { type: this.filters.type.join(',') },
                ...this.filters.season.length && { season: this.filters.season.join(',') },
                ...this.filters.priceRange.min && { minPrice: this.filters.priceRange.min },
                ...this.filters.priceRange.max && { maxPrice: this.filters.priceRange.max }
            });

            const response = await fetch(`/api/spots?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderSpots(data.data);
                this.updatePagination(data.data.pagination);
                this.updateSpotsCount(data.data.pagination.total);
            }
        } catch (error) {
            console.error('加载景点失败:', error);
            this.showError('加载景点失败，请稍后重试');
        }
    }

    // 渲染景点列表
    renderSpots(data) {
        const spotsGrid = document.querySelector('.spots-grid');
        spotsGrid.innerHTML = data.spots.map(spot => this.renderSpotCard(spot)).join('');
    }

    // 渲染景点卡片
    renderSpotCard(spot) {
        return `
            <div class="spot-card" data-id="${spot._id}">
                <div class="spot-image" style="background-image: url('${spot.images[0]}');">
                    <div class="spot-tag">${spot.category}</div>
                    ${spot.discount ? `<div class="spot-discount">限时${spot.discount}折</div>` : ''}
                </div>
                <div class="spot-info">
                    <div class="spot-header">
                        <h3>${spot.name}</h3>
                        <div class="spot-rating">
                            <span class="rating-score">${spot.rating.toFixed(1)}</span>
                            <div class="rating-stars">
                                ${this.generateStars(spot.rating)}
                            </div>
                            <span class="review-count">(${spot.reviewCount}条评价)</span>
                        </div>
                    </div>
                    <p class="spot-desc">${spot.description}</p>
                    <div class="spot-meta">
                        <span class="location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${spot.location.province} ${spot.location.city}
                        </span>
                        <span class="price">
                            <strong>¥${spot.price.adult}</strong>/成人
                        </span>
                    </div>
                    <div class="spot-tags">
                        ${spot.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <a href="/spots/detail.html?id=${spot._id}" class="view-detail">
                        查看详情 <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
    }

    // 生成星级评分
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return `
            ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
            ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
            ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
        `;
    }

    // 更新分页
    updatePagination(pagination) {
        const { total, page, pages } = pagination;
        const prevBtn = document.querySelector('.prev-page');
        const nextBtn = document.querySelector('.next-page');
        const pageNumbers = document.querySelector('.page-numbers');

        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === pages;

        // 生成页码
        let pageHTML = '';
        for (let i = 1; i <= pages; i++) {
            if (
                i === 1 || 
                i === pages || 
                (i >= page - 1 && i <= page + 1)
            ) {
                pageHTML += `<span class="${i === page ? 'active' : ''}">${i}</span>`;
            } else if (
                i === page - 2 || 
                i === page + 2
            ) {
                pageHTML += `<span>...</span>`;
            }
        }
        pageNumbers.innerHTML = pageHTML;
    }

    // 更新景点数量
    updateSpotsCount(total) {
        document.querySelector('.spots-count strong').textContent = total;
    }

    // 重置筛选条件
    resetFilters() {
        this.filters = {
            destination: [],
            type: [],
            season: [],
            priceRange: {
                min: null,
                max: null
            }
        };

        // 重置复选框
        document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // 重置价格输入
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('priceRange').value = 0;

        this.currentPage = 1;
        this.loadSpots();
    }

    // 显示错误信息
    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    new SpotsPage();
}); 