class Auth {
    constructor() {
        this.init();
        this.isLoading = false;
    }

    init() {
        this.bindLoginForm();
        this.bindRegisterForm();
        this.bindPasswordToggles();
        this.bindSocialLogin();
        this.bindVerifyCode();
        this.bindPasswordStrength();
    }

    bindLoginForm() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
            
            // 记住密码功能
            const remember = document.getElementById('remember');
            if (remember) {
                const savedUsername = localStorage.getItem('savedUsername');
                if (savedUsername) {
                    document.getElementById('username').value = savedUsername;
                    remember.checked = true;
                }
            }
        }
    }

    bindRegisterForm() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    bindPasswordToggles() {
        const toggles = document.querySelectorAll('.toggle-password');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const input = button.parentElement.querySelector('input');
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    bindSocialLogin() {
        const wechatBtn = document.querySelector('.social-btn.wechat');
        const qqBtn = document.querySelector('.social-btn.qq');

        if (wechatBtn) {
            wechatBtn.addEventListener('click', () => this.handleSocialLogin('wechat'));
        }
        if (qqBtn) {
            qqBtn.addEventListener('click', () => this.handleSocialLogin('qq'));
        }
    }

    bindVerifyCode() {
        const verifyBtn = document.querySelector('.verify-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.handleVerifyCode());
        }
    }

    bindPasswordStrength() {
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        try {
            this.isLoading = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

            // 模拟API请求
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (remember && remember.checked) {
                localStorage.setItem('savedUsername', username);
            } else {
                localStorage.removeItem('savedUsername');
            }

            this.setAuthToken('dummy_token');
            this.showMessage('登录成功', 'success');
            
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);

        } catch (error) {
            this.showMessage(error.message || '登录失败，请重试', 'error');
        } finally {
            this.isLoading = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>登录</span><i class="fas fa-arrow-right"></i>';
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const phone = document.getElementById('phone').value;
        const verifyCode = document.getElementById('verifyCode').value;
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!this.validatePhone(phone)) {
            this.showMessage('请输入正确的手机号', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致', 'error');
            return;
        }

        try {
            this.isLoading = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';

            // 模拟API请求
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showMessage('注册成功', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            this.showMessage(error.message || '注册失败，请重试', 'error');
        } finally {
            this.isLoading = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>注册</span><i class="fas fa-arrow-right"></i>';
        }
    }

    async handleVerifyCode() {
        if (this.isLoading) return;

        const phone = document.getElementById('phone').value;
        if (!this.validatePhone(phone)) {
            this.showMessage('请输入正确的手机号', 'error');
            return;
        }

        const btn = document.querySelector('.verify-btn');
        let countdown = 60;

        try {
            this.isLoading = true;
            btn.disabled = true;

            // 模拟发送验证码
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showMessage('验证码已发送', 'success');

            const timer = setInterval(() => {
                btn.textContent = `${countdown}秒后重试`;
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    btn.disabled = false;
                    btn.textContent = '获取验证码';
                    this.isLoading = false;
                }
            }, 1000);

        } catch (error) {
            this.showMessage('发送失败，请重试', 'error');
            btn.disabled = false;
            btn.textContent = '获取验证码';
            this.isLoading = false;
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.password-strength');
        if (!strengthBar) return;

        let strength = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        strength = Object.values(checks).filter(Boolean).length;

        const colors = ['#ddd', '#ff4d4d', '#ffd700', '#90EE90', '#00ff00'];
        strengthBar.style.background = `linear-gradient(to right, ${colors[strength]} ${strength * 20}%, #ddd 0%)`;
    }

    validatePhone(phone) {
        return /^1[3-9]\d{9}$/.test(phone);
    }

    handleSocialLogin(platform) {
        this.showMessage(`正在跳转到${platform}登录...`, 'info');
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

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    isLoggedIn() {
        return !!this.getAuthToken();
    }

    logout() {
        localStorage.removeItem('authToken');
        window.location.href = '/auth/login.html';
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化认证系统
document.addEventListener('DOMContentLoaded', () => {
    const auth = new Auth();
}); 