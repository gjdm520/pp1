const express = require('express');
const router = express.Router();
const Spot = require('../models/spot');
const Review = require('../models/review');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// 获取景点列表
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-rating',
            category,
            city,
            province,
            minPrice,
            maxPrice,
            season
        } = req.query;

        // 构建查询条件
        const query = { status: 'active' };
        
        if (category) query.category = category;
        if (city) query['location.city'] = city;
        if (province) query['location.province'] = province;
        if (season) query.bestSeasons = season;
        
        if (minPrice || maxPrice) {
            query['price.adult'] = {};
            if (minPrice) query['price.adult'].$gte = Number(minPrice);
            if (maxPrice) query['price.adult'].$lte = Number(maxPrice);
        }

        // 执行查询
        const spots = await Spot.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('reviewCount')
            .populate('favoriteCount');

        // 获取总数
        const total = await Spot.countDocuments(query);

        res.json({
            success: true,
            data: {
                spots,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取景点列表失败',
            error: error.message
        });
    }
});

// 获取景点详情
router.get('/:id', async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id)
            .populate('reviewCount')
            .populate('favoriteCount');

        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '景点不存在'
            });
        }

        // 增加访问量
        await spot.incrementVisitCount();

        // 获取评价
        const reviews = await Review.find({ spot: spot._id })
            .populate('user', 'nickname avatar')
            .sort('-createdAt')
            .limit(5);

        res.json({
            success: true,
            data: {
                spot,
                reviews
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取景点详情失败',
            error: error.message
        });
    }
});

// 搜索景点
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const spots = await Spot.search(q);

        res.json({
            success: true,
            data: spots
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '搜索失败',
            error: error.message
        });
    }
});

// 收藏景点
router.post('/:id/favorite', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const spotId = req.params.id;

        // 检查是否已收藏
        const isFavorited = user.favorites.includes(spotId);
        
        if (isFavorited) {
            // 取消收藏
            user.favorites = user.favorites.filter(id => id.toString() !== spotId);
            await user.save();

            res.json({
                success: true,
                message: '已取消收藏'
            });
        } else {
            // 添加收藏
            user.favorites.push(spotId);
            await user.save();

            res.json({
                success: true,
                message: '收藏成功'
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '操作失败',
            error: error.message
        });
    }
});

// 上传景点图片
router.post('/:id/images', auth, upload.array('images', 5), async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '景点不存在'
            });
        }

        // 处理上传的图片
        const images = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            caption: file.originalname
        }));

        spot.images.push(...images);
        await spot.save();

        res.json({
            success: true,
            data: spot.images
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传失败',
            error: error.message
        });
    }
});

// 获取景点评价列表
router.get('/:id/reviews', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            rating,
            hasImages
        } = req.query;

        // 构建查询条件
        const query = { 
            spot: req.params.id,
            status: 'approved'
        };
        
        if (rating) query.rating = Number(rating);
        if (hasImages === 'true') query['images.0'] = { $exists: true };

        // 执行查询
        const reviews = await Review.find(query)
            .populate('user', 'nickname avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // 获取总数
        const total = await Review.countDocuments(query);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取评价列表失败',
            error: error.message
        });
    }
});

module.exports = router; 