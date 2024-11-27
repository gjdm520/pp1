class AboutManager {
    constructor() {
        this.init();
        this.isLoading = false;
    }

    init() {
        this.bindContactForm();
        this.addScrollAnimations();
        this.bindSocialLinks();
    }

    bindContactForm() {
        const form = document.querySelector('.contact-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!this.validateEmail(email)) {
            this.showMessage('请输入正确的邮箱地址', 'error');
            return;
        }

        try {
            this.isLoading = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

            // 模拟API请求
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showMessage('消息发送成功，我们会尽快回复您！', 'success');
            e.target.reset();

        } catch (error) {
            this.showMessage('发送失败，请稍后重试', 'error');
        } finally {
            this.isLoading = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '发送消息';
        }
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    addScrollAnimations() {
        const elements = document.querySelectorAll('.company-intro, .value-card, .team-member');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2
        });

        elements.forEach(element => {
            observer.observe(element);
        });
    }

    bindSocialLinks() {
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = link.querySelector('i').classList.contains('fa-weixin') ? '微信' : '微博';
                this.showQRCode(platform);
            });
        });
    }

    showQRCode(platform) {
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.innerHTML = `
            <div class="qr-content">
                <h3>扫描${platform}二维码</h3>
                <div class="qr-image" style="background: linear-gradient(45deg, #3498db, #2ecc71);"></div>
                <p>使用${platform}扫描上方二维码</p>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加动画样式
        modal.style.animation = 'fadeIn 0.3s ease-out';

        // 绑定关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModal = () => {
            modal.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
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
    const aboutManager = new AboutManager();
}); 