class BlindBox {
    constructor() {
        this.selectedType = null;
        this.preferences = {
            budget: 2000,
            travelDate: null,
            themes: []
        };
        this.isDrawing = false;
        this.init();
    }

    init() {
        this.initTypeSelection();
        this.initPreferences();
        this.initDrawButton();
        this.loadCases();
        this.initFAQ();
    }

    // 初始化盲盒类型选择
    initTypeSelection() {
        const typeCards = document.querySelectorAll('.type-card');
        typeCards.forEach(card => {
            card.addEventListener('click', () => {
                typeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedType = card.dataset.type;
                
                // 更新预算范围
                const budgetRange = document.querySelector('.budget-slider input');
                switch(this.selectedType) {
                    case 'weekend':
                        budgetRange.min = 500;
                        budgetRange.max = 2000;
                        break;
                    case 'holiday':
                        budgetRange.min = 1000;
                        budgetRange.max = 5000;
                        break;
                    case 'adventure':
                        budgetRange.min = 3000;
                        budgetRange.max = 10000;
                        break;
                }
                this.updateBudgetValue(budgetRange.value);
            });
        });
    }

    // 初始化偏好设置
    initPreferences() {
        // 预算滑块
        const budgetSlider = document.querySelector('.budget-slider input');
        budgetSlider.addEventListener('input', (e) => {
            this.updateBudgetValue(e.target.value);
        });

        // 出行日期
        const dateInput = document.querySelector('.travel-date');
        const today = new Date();
        dateInput.min = today.toISOString().split('T')[0];
        dateInput.addEventListener('change', (e) => {
            this.preferences.travelDate = e.target.value;
        });

        // 主题标签
        document.querySelectorAll('.theme-tag input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.preferences.themes.push(checkbox.value);
                } else {
                    this.preferences.themes = this.preferences.themes.filter(t => t !== checkbox.value);
                }
            });
        });
    }

    // 更新预算显示
    updateBudgetValue(value) {
        this.preferences.budget = Number(value);
        document.querySelector('.budget-value').textContent = `¥${value}`;
    }

    // 初始化抽取按钮
    initDrawButton() {
        const drawButton = document.querySelector('.draw-button');
        drawButton.addEventListener('click', () => {
            if (!this.validateDraw()) return;
            if (this.isDrawing) return;

            this.startDrawAnimation();
            this.drawBlindBox();
        });

        // 初始化结果弹窗按钮
        document.querySelector('.confirm-btn').addEventListener('click', () => this.confirmBooking());
        document.querySelector('.redraw-btn').addEventListener('click', () => this.redrawBox());
    }

    // 验证抽取条件
    validateDraw() {
        if (!this.selectedType) {
            this.showError('请选择盲盒类型');
            return false;
        }
        if (!this.preferences.travelDate) {
            this.showError('请选择出行日期');
            return false;
        }
        if (!this.checkLogin()) {
            return false;
        }
        return true;
    }

    // 开始抽取动画
    startDrawAnimation() {
        this.isDrawing = true;
        const boxWrapper = document.querySelector('.box-wrapper');
        boxWrapper.classList.add('opening');
        
        // 添加抖动动画
        boxWrapper.style.animation = 'shake 0.5s ease-in-out';
        
        // 播放音效
        this.playDrawSound();
    }

    // 抽取盲盒
    async drawBlindBox() {
        try {
            const response = await fetch('/api/blindbox/draw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type: this.selectedType,
                    preferences: this.preferences
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setTimeout(() => {
                    this.showResult(data.data);
                }, 1500); // 等待动画完成
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('抽取失败:', error);
            this.showError('抽取失败，请稍后重试');
        } finally {
            this.isDrawing = false;
        }
    }

    // 显示抽取结果
    showResult(result) {
        const modal = document.querySelector('.result-modal');
        const destinationInfo = modal.querySelector('.destination-info');
        
        destinationInfo.innerHTML = `
            <div class="destination-image">
                <img src="${result.destination.images[0]}" alt="${result.destination.name}">
            </div>
            <h3>${result.destination.name}</h3>
            <p class="destination-desc">${result.destination.description}</p>
            <div class="destination-details">
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${result.destination.location.province} ${result.destination.location.city}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${result.duration}天行程</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-coins"></i>
                    <span>￥${result.price}</span>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    // 确认预订
    async confirmBooking() {
        // TODO: 实现预订逻辑
        window.location.href = '/order/create.html';
    }

    // 重新抽取
    redrawBox() {
        document.querySelector('.result-modal').style.display = 'none';
        document.querySelector('.box-wrapper').classList.remove('opening');
        this.drawBlindBox();
    }

    // 加载案例展示
    async loadCases() {
        try {
            const response = await fetch('/api/blindbox/cases');
            const data = await response.json();

            if (data.success) {
                const caseGrid = document.querySelector('.case-grid');
                caseGrid.innerHTML = data.data.map(this.renderCaseCard).join('');
            }
        } catch (error) {
            console.error('加载案例失败:', error);
        }
    }

    // 渲染案例卡片
    renderCaseCard(caseData) {
        return `
            <div class="case-card">
                <div class="case-image">
                    <img src="${caseData.images[0]}" alt="${caseData.title}">
                </div>
                <div class="case-content">
                    <h3>${caseData.title}</h3>
                    <p>${caseData.description}</p>
                    <div class="case-user">
                        <img src="${caseData.user.avatar}" alt="${caseData.user.nickname}">
                        <span>${caseData.user.nickname}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 初始化FAQ
    initFAQ() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const icon = question.querySelector('i');
                
                answer.style.maxHeight = answer.style.maxHeight ? null : answer.scrollHeight + 'px';
                icon.classList.toggle('fa-chevron-up');
                icon.classList.toggle('fa-chevron-down');
            });
        });
    }

    // 播放音效
    playDrawSound() {
        const audio = new Audio('/sounds/draw.mp3');
        audio.play().catch(() => {}); // 忽略自动播放限制错误
    }

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

    // 显示错误信息
    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    new BlindBox();
}); 