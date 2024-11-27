class SpotManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.totalPages = 0;
        this.filters = {
            search: '',
            category: '',
            location: ''
        };
        this.imageFiles = new Map();
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.loadLocations();
        await this.loadSpots();
        this.initModals();
        this.initImageUpload();
    }

    // 初始化事件监听
    initEventListeners() {
        // 搜索和筛选
        document.querySelector('.search-input').addEventListener('input', 
            debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadSpots();
            }, 500)
        );

        document.querySelector('.category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadSpots();
        });

        document.querySelector('.location-filter').addEventListener('change', (e) => {
            this.filters.location = e.target.value;
            this.currentPage = 1;
            this.loadSpots();
        });

        // 添加景点按钮
        document.getElementById('addSpotBtn').addEventListener('click', () => {
            this.showSpotModal();
        });

        // 保存景点按钮
        document.getElementById('saveSpot').addEventListener('click', () => {
            this.saveSpot();
        });

        // 省份选择联动
        document.querySelector('select[name="province"]').addEventListener('change', (e) => {
            this.updateCityOptions(e.target.value);
        });
    }

    // 加载地区数据
    async loadLocations() {
        try {
            const response = await fetch('/api/admin/locations');
            const data = await response.json();

            if (data.success) {
                this.renderLocationOptions(data.data);
            }
        } catch (error) {
            console.error('加载地区数据失败:', error);
        }
    }

    // 渲染地区选项
    renderLocationOptions(locations) {
        const provinceSelect = document.querySelector('select[name="province"]');
        const locationFilter = document.querySelector('.location-filter');

        // 渲染省份选项
        const provinceOptions = locations.map(province => 
            `<option value="${province.code}">${province.name}</option>`
        ).join('');

        provinceSelect.innerHTML += provinceOptions;
        locationFilter.innerHTML += provinceOptions;
    }

    // 更新城市选项
    updateCityOptions(provinceCode) {
        const citySelect = document.querySelector('select[name="city"]');
        citySelect.innerHTML = '<option value="">选择城市</option>';

        if (!provinceCode) return;

        // 这里应该根据省份代码获取对应的城市列表
        // TODO: 实现城市数据加载
    }

    // 加载景点列表
    async loadSpots() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`/api/admin/spots?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderSpots(data.data.spots);
                this.updatePagination(data.data.pagination);
            }
        } catch (error) {
            console.error('加载景点列表失败:', error);
            this.showError('加载景点列表失败，请重试');
        }
    }

    // 渲染景点列表
    renderSpots(spots) {
        const spotsGrid = document.querySelector('.spots-grid');
        spotsGrid.innerHTML = spots.map(spot => `
            <div class="spot-card">
                <div class="spot-image">
                    <img src="${spot.images[0]}" alt="${spot.name}">
                    <span class="spot-category">${this.getCategoryLabel(spot.category)}</span>
                </div>
                <div class="spot-content">
                    <div class="spot-header">
                        <h3 class="spot-title">${spot.name}</h3>
                        <span class="spot-status ${spot.status}">
                            ${this.getStatusLabel(spot.status)}
                        </span>
                    </div>
                    <div class="spot-info">
                        <span><i class="fas fa-map-marker-alt"></i> ${spot.location.province} ${spot.location.city}</span>
                        <span><i class="fas fa-ticket-alt"></i> ¥${spot.price.adult} 起</span>
                        <span><i class="fas fa-clock"></i> ${spot.openTime}-${spot.closeTime}</span>
                    </div>
                    <div class="spot-actions">
                        <button class="btn btn-sm" onclick="spotManagement.editSpot('${spot._id}')">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-sm" onclick="spotManagement.toggleSpotStatus('${spot._id}')">
                            <i class="fas fa-${spot.status === 'active' ? 'eye-slash' : 'eye'}"></i>
                            ${spot.status === 'active' ? '下架' : '上架'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="spotManagement.deleteSpot('${spot._id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 初始化图片上传
    initImageUpload() {
        const imageInput = document.getElementById('spotImages');
        const preview = document.querySelector('.image-preview');

        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const id = Date.now() + Math.random();
                    this.imageFiles.set(id, file);

                    preview.innerHTML += `
                        <div class="preview-item" data-id="${id}">
                            <img src="${e.target.result}" alt="预览图片">
                            <span class="remove-image" onclick="spotManagement.removeImage('${id}')">
                                &times;
                            </span>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // 移除预览图片
    removeImage(id) {
        this.imageFiles.delete(id);
        document.querySelector(`.preview-item[data-id="${id}"]`).remove();
    }

    // 保存景点
    async saveSpot() {
        try {
            const form = document.getElementById('spotForm');
            const formData = new FormData(form);

            // 添加图片文件
            this.imageFiles.forEach((file, id) => {
                formData.append('images', file);
            });

            const response = await fetch('/api/admin/spots', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.closeModals();
                this.loadSpots();
                this.showSuccess('景点保存成功');
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('保存景点失败:', error);
            this.showError('保存景点失败，请重试');
        }
    }

    // 工具方法
    getCategoryLabel(category) {
        const categoryMap = {
            natural: '自然风光',
            cultural: '人文古迹',
            leisure: '休闲娱乐',
            adventure: '探险体验'
        };
        return categoryMap[category] || category;
    }

    getStatusLabel(status) {
        const statusMap = {
            active: '正常',
            inactive: '已下架'
        };
        return statusMap[status] || status;
    }

    // 其他方法保持不变...
}

// 初始化景点管理
let spotManagement;
document.addEventListener('DOMContentLoaded', () => {
    spotManagement = new SpotManagement();
}); 