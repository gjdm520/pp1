class GuideDetail {
    constructor() {
        this.guideId = this.getGuideIdFromUrl();
        this.guide = null;
        this.map = null;
        this.init();
    }

    init() {
        this.loadGuideData();
        this.initActions();
        this.initShareModal();
        this.initCommentForm();
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    // 从URL获取攻略ID
    getGuideIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    // 加载攻略数据
    async loadGuideData() {
        try {
            const response = await fetch(`/api/guides/${this.guideId}`);
            const data = await response.json();

            if (data.success) {
                this.guide = data.data;
                this.renderGuide();
                this.initMap();
                this.loadComments();
                this.loadWeather();
                this.loadRelatedGuides();
                // 增加访问量
                this.incrementViewCount();
            }
        } catch (error) {
            console.error('加载攻略失败:', error);
            this.showError('加载攻略失败，请稍后重试');
        }
    }

    // 渲染攻略内容
    renderGuide() {
        // 更新标题和meta信息
        document.title = `${this.guide.title} - 探索旅途`;
        document.querySelector('.guide-title').textContent = this.guide.title;
        document.querySelector('.guide-category').textContent = this.guide.category;
        
        // 更新统计信息
        const stats = document.querySelector('.guide-stats');
        stats.innerHTML = `
            <span><i class="fas fa-eye"></i> ${this.formatNumber(this.guide.viewCount)}</span>
            <span><i class="fas fa-heart"></i> ${this.formatNumber(this.guide.likeCount)}</span>
            <span><i class="fas fa-bookmark"></i> ${this.formatNumber(this.guide.favoriteCount)}</span>
        `;

        // 更新作者信息
        const authorInfo = document.querySelector('.author-info');
        authorInfo.querySelector('.author-avatar').src = this.guide.author.avatar;
        authorInfo.querySelector('.author-name').textContent = this.guide.author.nickname;
        authorInfo.querySelector('.publish-time').textContent = this.formatDate(this.guide.createdAt);

        // 更新封面图
        document.querySelector('.guide-cover img').src = this.guide.coverImage;

        // 生成目录
        this.generateTableOfContents();

        // 渲染正文内容
        document.querySelector('.guide-body').innerHTML = marked(this.guide.content);

        // 更新行程概要
        const summary = document.querySelector('.trip-summary');
        summary.innerHTML = `
            <h3>行程概要</h3>
            <div class="summary-item">
                <i class="fas fa-calendar-alt"></i>
                <span>行程天数：<strong>${this.guide.duration.days}天${this.guide.duration.nights}晚</strong></span>
            </div>
            <div class="summary-item">
                <i class="fas fa-coins"></i>
                <span>人均预算：<strong>¥${this.guide.budget.min}-${this.guide.budget.max}</strong></span>
            </div>
            <div class="summary-item">
                <i class="fas fa-users"></i>
                <span>适合人群：<strong>${this.guide.suitableFor.join('/')}</strong></span>
            </div>
            <div class="summary-item">
                <i class="fas fa-sun"></i>
                <span>最佳季节：<strong>${this.formatSeasons(this.guide.bestSeasons)}</strong></span>
            </div>
        `;

        // 更新按钮状态
        this.updateActionButtons();
    }

    // 生成目录
    generateTableOfContents() {
        const content = this.guide.content;
        const headings = content.match(/#{2,4}\s[^\n]+/g) || [];
        const toc = headings.map(heading => {
            const level = heading.match(/#/g).length - 1;
            const text = heading.replace(/#{2,4}\s/, '');
            const id = text.toLowerCase().replace(/\s+/g, '-');
            return `<li style="padding-left: ${(level-1)*20}px">
                <a href="#${id}">${text}</a>
            </li>`;
        });

        document.querySelector('.nav-list').innerHTML = toc.join('');
    }

    // 初始化地图
    initMap() {
        const mapContainer = document.getElementById('map');
        this.map = new google.maps.Map(mapContainer, {
            zoom: 12,
            center: this.guide.destinations[0].spot.coordinates
        });

        // 添加标记和路线
        this.addMapMarkers();
        this.drawRoute();
    }

    // 添加地图标记
    addMapMarkers() {
        this.guide.destinations.forEach((dest, index) => {
            new google.maps.Marker({
                position: dest.spot.coordinates,
                map: this.map,
                label: (index + 1).toString(),
                title: dest.spot.name
            });
        });
    }

    // 绘制路线
    drawRoute() {
        const path = this.guide.destinations.map(dest => dest.spot.coordinates);
        new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: this.map
        });
    }

    // 初始化交互事件
    initActions() {
        document.querySelector('.like-btn').addEventListener('click', () => this.handleLike());
        document.querySelector('.collect-btn').addEventListener('click', () => this.handleCollect());
        document.querySelector('.follow-btn').addEventListener('click', () => this.handleFollow());
    }

    // 处理点赞
    async handleLike() {
        if (!this.checkLogin()) return;

        try {
            const response = await fetch(`/api/guides/${this.guideId}/like`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                const likeBtn = document.querySelector('.like-btn');
                likeBtn.innerHTML = data.data.liked ? 
                    '<i class="fas fa-heart"></i> 已点赞' :
                    '<i class="far fa-heart"></i> 点赞';
                this.guide.likeCount = data.data.likeCount;
                this.updateStats();
            }
        } catch (error) {
            console.error('点赞失败:', error);
        }
    }

    // 更多方法...
    // 这里包括处理收藏、关注、评论等功能的方法
    // 以及一些工具方法如格式化日期、数字等

    // 检查登录状态
    checkLogin() {
        if (!localStorage.getItem('token')) {
            if (confirm('请先登录后再操作，是否前往登录？')) {
                window.location.href = '/auth/login.html';
            }
            return false;
        }
        return true;
    }

    // 格式化数字
    formatNumber(num) {
        return num > 999 ? (num/1000).toFixed(1) + 'k' : num;
    }

    // 格式化日期
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // 格式化季节
    formatSeasons(seasons) {
        const seasonMap = {
            spring: '春季',
            summer: '夏季',
            autumn: '秋季',
            winter: '冬季'
        };
        return seasons.map(s => seasonMap[s]).join('/');
    }

    // 显示错误信息
    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    new GuideDetail();
}); 