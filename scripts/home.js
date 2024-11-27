class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.loadHotSpots();
        this.loadFeaturedGuides();
        this.loadReviews();
        this.initCarousel();
        this.initSubscribe();
    }

    // 加载热门景点
    async loadHotSpots() {
        try {
            const response = await fetch('/api/spots/hot');
            const data = await response.json();

            if (data.success) {
                const spotsGrid = document.querySelector('.spots-grid');
                spotsGrid.innerHTML = data.data.map(spot => this.renderSpotCard(spot)).join('');
            }
        } catch (error) {
            console.error('加载热门景点失败:', error);
        }
    }

    // 渲染景点卡片
    renderSpotCard(spot) {
        return `
            <div class="spot-card">
                <div class="spot-image" style="background-image: url('${spot.images[0]}');">
                    <div class="spot-tag">${spot.category}</div>
                </div>
                <div class="spot-info">
                    <div class="spot-header">
                        <h3>${spot.name}</h3>
                        <span class="rating">${spot.rating} <i class="fas fa-star"></i></span>
                    </div>
                    <p class="spot-desc">${spot.description}</p>
                    <div class="spot-meta">
                        <span class="location"><i class="fas fa-map-marker-alt"></i> ${spot.location.city}</span>
                        <span class="price">¥${spot.price.adult}起</span>
                    </div>
                    <a href="/spots/detail.html?id=${spot._id}" class="spot-btn">查看详情</a>
                </div>
            </div>
        `;
    }

    // 加载精选攻略
    async loadFeaturedGuides() {
        try {
            const response = await fetch('/api/guides/featured');
            const data = await response.json();

            if (data.success) {
                const guidesGrid = document.querySelector('.guides-grid');
                guidesGrid.innerHTML = data.data.map(guide => this.renderGuideCard(guide)).join('');
            }
        } catch (error) {
            console.error('加载精选攻略失败:', error);
        }
    }

    // 渲染攻略卡片
    renderGuideCard(guide) {
        return `
            <div class="guide-card">
                <div class="guide-image" style="background-image: url('${guide.coverImage}');"></div>
                <div class="guide-content">
                    <div class="guide-meta">
                        <span class="guide-category">${guide.category}</span>
                        <span class="guide-duration">${guide.duration.days}天${guide.duration.nights}晚</span>
                    </div>
                    <h3>${guide.title}</h3>
                    <p class="guide-desc">${guide.summary}</p>
                    <div class="guide-footer">
                        <div class="author">
                            <img src="${guide.author.avatar}" alt="${guide.author.nickname}">
                            <span>${guide.author.nickname}</span>
                        </div>
                        <div class="guide-stats">
                            <span><i class="fas fa-eye"></i> ${guide.viewCount}</span>
                            <span><i class="fas fa-heart"></i> ${guide.likeCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 加载用户评价
    async loadReviews() {
        try {
            const response = await fetch('/api/reviews/featured');
            const data = await response.json();

            if (data.success) {
                const reviewsSlider = document.querySelector('.reviews-slider');
                reviewsSlider.innerHTML = data.data.map(review => this.renderReviewCard(review)).join('');
            }
        } catch (error) {
            console.error('加载用户评价失败:', error);
        }
    }

    // 渲染评价卡片
    renderReviewCard(review) {
        return `
            <div class="review-card">
                <div class="review-header">
                    <img src="${review.user.avatar}" alt="${review.user.nickname}" class="user-avatar">
                    <div class="user-info">
                        <h4>${review.user.nickname}</h4>
                        <div class="rating">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                        </div>
                    </div>
                </div>
                <p class="review-content">${review.content}</p>
                <div class="review-footer">
                    <span class="spot-name">${review.spot.name}</span>
                    <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }

    // 初始化轮播图
    initCarousel() {
        const carousel = new Carousel(document.querySelector('.carousel'));
    }

    // 初始化订阅功能
    initSubscribe() {
        const form = document.querySelector('.subscribe-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.querySelector('input').value;

            try {
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                if (data.success) {
                    alert('订阅成功！');
                    form.reset();
                }
            } catch (error) {
                console.error('订阅失败:', error);
                alert('订阅失败，请稍后重试');
            }
        });
    }
}

// 初始化首页
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
}); 