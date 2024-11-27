class SystemSettings {
    constructor() {
        this.currentSection = 'basic';
        this.init();
    }

    init() {
        this.initNavigation();
        this.loadSettings();
        this.initFormSubmission();
        this.initLogoUpload();
    }

    // 初始化导航
    initNavigation() {
        const navLinks = document.querySelectorAll('.settings-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });
    }

    // 切换设置部分
    switchSection(section) {
        // 更新导航状态
        document.querySelectorAll('.settings-nav a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${section}`);
        });

        // 更新内容显示
        document.querySelectorAll('.settings-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === section);
        });

        this.currentSection = section;
    }

    // 加载设置
    async loadSettings() {
        try {
            const response = await fetch('/api/admin/settings');
            const data = await response.json();

            if (data.success) {
                this.populateSettings(data.data);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
            this.showError('加载设置失败，请重试');
        }
    }

    // 填充设置数据
    populateSettings(settings) {
        // 基本设置
        document.querySelector('input[name="siteName"]').value = settings.siteName || '';
        document.querySelector('textarea[name="siteDescription"]').value = settings.siteDescription || '';
        document.querySelector('input[name="contactEmail"]').value = settings.contactEmail || '';
        document.querySelector('input[name="contactPhone"]').value = settings.contactPhone || '';
        
        // Logo预览
        if (settings.logo) {
            document.getElementById('logoPreview').src = settings.logo;
        }

        // 安全设置
        settings.passwordPolicy?.forEach(policy => {
            document.querySelector(`input[name="passwordPolicy"][value="${policy}"]`).checked = true;
        });

        settings.loginSecurity?.forEach(security => {
            document.querySelector(`input[name="loginSecurity"][value="${security}"]`).checked = true;
        });

        // 内容设置
        settings.contentReview?.forEach(review => {
            document.querySelector(`input[name="contentReview"][value="${review}"]`).checked = true;
        });

        document.querySelector('textarea[name="sensitiveWords"]').value = 
            settings.sensitiveWords?.join('\n') || '';

        // 支付设置
        document.querySelector('input[name="alipayAppId"]').value = settings.alipay?.appId || '';
        document.querySelector('input[name="wechatAppId"]').value = settings.wechat?.appId || '';
    }

    // 初始化表单提交
    initFormSubmission() {
        document.querySelectorAll('.settings-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveSettings(e.target);
            });
        });
    }

    // 保存设置
    async saveSettings(form) {
        try {
            const formData = new FormData(form);
            const settings = {};

            // 根据不同的设置部分处理数据
            switch (this.currentSection) {
                case 'basic':
                    settings.basic = {
                        siteName: formData.get('siteName'),
                        siteDescription: formData.get('siteDescription'),
                        contactEmail: formData.get('contactEmail'),
                        contactPhone: formData.get('contactPhone')
                    };
                    break;
                case 'security':
                    settings.security = {
                        passwordPolicy: Array.from(formData.getAll('passwordPolicy')),
                        loginSecurity: Array.from(formData.getAll('loginSecurity'))
                    };
                    break;
                // ... 其他设置部分的处理
            }

            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('设置保存成功');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showError('保存设置失败，请重试');
        }
    }

    // 初始化Logo上传
    initLogoUpload() {
        const logoInput = document.getElementById('logoInput');
        logoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('logo', file);

                    const response = await fetch('/api/admin/settings/logo', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.success) {
                        document.getElementById('logoPreview').src = data.data.url;
                        this.showSuccess('Logo上传成功');
                    }
                } catch (error) {
                    console.error('Logo上传失败:', error);
                    this.showError('Logo上传失败，请重试');
                }
            }
        });
    }

    // 显示成功提示
    showSuccess(message) {
        // TODO: 实现成功提示组件
        alert(message);
    }

    // 显示错误提示
    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }
}

// 初始化系统设置
document.addEventListener('DOMContentLoaded', () => {
    new SystemSettings();
}); 