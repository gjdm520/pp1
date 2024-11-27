class UserManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.selectedUsers = new Set();
        this.filters = {
            search: '',
            role: '',
            status: ''
        };
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadUsers();
        this.initModals();
    }

    // 初始化事件监听
    initEventListeners() {
        // 搜索和筛选
        document.querySelector('.search-input').addEventListener('input', 
            debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 500)
        );

        document.querySelector('.role-filter').addEventListener('change', (e) => {
            this.filters.role = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        document.querySelector('.status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // 全选功能
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const userId = checkbox.getAttribute('data-user-id');
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
            });
            this.updateBatchActions();
        });

        // 分页控制
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadUsers();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadUsers();
            }
        });

        // 添加用户按钮
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showUserModal();
        });

        // 保存用户按钮
        document.getElementById('saveUser').addEventListener('click', () => {
            this.saveUser();
        });
    }

    // 加载用户列表
    async loadUsers() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`/api/admin/users?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderUsers(data.data.users);
                this.updatePagination(data.data.pagination);
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            this.showError('加载用户列表失败，请重试');
        }
    }

    // 渲染用户列表
    renderUsers(users) {
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <input type="checkbox" 
                           data-user-id="${user._id}" 
                           ${this.selectedUsers.has(user._id) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="user-info">
                        <img src="${user.avatar}" alt="${user.nickname}" class="user-avatar">
                        <div class="user-details">
                            <span class="user-name">${user.nickname}</span>
                            <span class="user-email">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td>${this.getRoleLabel(user.role)}</td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <span class="status-badge ${user.status}">
                        ${this.getStatusLabel(user.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="userManagement.editUser('${user._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="userManagement.viewUserDetail('${user._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="userManagement.toggleUserStatus('${user._id}')">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 重新绑定checkbox事件
        this.bindCheckboxEvents();
    }

    // 更新分页
    updatePagination(pagination) {
        this.totalPages = pagination.pages;
        const pageNumbers = document.querySelector('.page-numbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // 更新按钮状态
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;

        // 生成页码
        let pageHTML = '';
        for (let i = 1; i <= this.totalPages; i++) {
            if (
                i === 1 || 
                i === this.totalPages || 
                (i >= this.currentPage - 1 && i <= this.currentPage + 1)
            ) {
                pageHTML += `
                    <span class="${i === this.currentPage ? 'active' : ''}" 
                          onclick="userManagement.goToPage(${i})">
                        ${i}
                    </span>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                pageHTML += '<span>...</span>';
            }
        }
        pageNumbers.innerHTML = pageHTML;
    }

    // 初始化模态框
    initModals() {
        // 关闭按钮事件
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }

    // 显示用户编辑模态框
    showUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = modal.querySelector('.modal-header h2');
        const form = document.getElementById('userForm');

        title.textContent = userId ? '编辑用户' : '添加用户';
        form.reset();

        if (userId) {
            // 加载用户数据
            this.loadUserData(userId);
        }

        modal.style.display = 'block';
    }

    // 关闭所有模态框
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // 保存用户
    async saveUser() {
        try {
            const form = document.getElementById('userForm');
            const formData = new FormData(form);
            const userData = Object.fromEntries(formData.entries());

            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                this.closeModals();
                this.loadUsers();
                this.showSuccess('用户保存成功');
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('保存用户失败:', error);
            this.showError('保存用户失败，请重试');
        }
    }

    // 工具方法
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getRoleLabel(role) {
        const roleMap = {
            user: '普通用户',
            guide: '攻略作者',
            admin: '管理员'
        };
        return roleMap[role] || role;
    }

    getStatusLabel(status) {
        const statusMap = {
            active: '正常',
            banned: '已封禁',
            unverified: '未验证'
        };
        return statusMap[status] || status;
    }

    showError(message) {
        // TODO: 实现错误提示组件
        alert(message);
    }

    showSuccess(message) {
        // TODO: 实现成功提示组件
        alert(message);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初始化用户管理
let userManagement;
document.addEventListener('DOMContentLoaded', () => {
    userManagement = new UserManagement();
}); 