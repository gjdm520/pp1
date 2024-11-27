const express = require('express');
const router = express.Router();
const Spot = require('../models/spot');
const Review = require('../models/review');
const { auth } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');

// 获取景点列表
router.get('/', cache({ expire: 300 }), async (req, res) => {
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
            season,
            keyword
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

        if (keyword) {
            query.$or = [
                { name: new RegExp(keyword, 'i') },
                { description: new RegExp(keyword, 'i') }
            ];
        }

        // 执行查询
        const spots = await Spot.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('reviewCount')
            .populate('favoriteCount');

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

// 获取热门景点
router.get('/hot', cache({ expire: 3600 }), async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const spots = await Spot.find({ status: 'active' })
            .sort('-visitCount -rating')
            .limit(Number(limit))
            .populate('reviewCount');

        res.json({
            success: true,
            data: spots
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取热门景点失败',
            error: error.message
        });
    }
});

// 获取景点详情
router.get('/:id', cache({ expire: 300 }), async (req, res) => {
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

        res.json({
            success: true,
            data: spot
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取景点详情失败',
            error: error.message
        });
    }
});

// 获取景点评价
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

        const reviews = await Review.find(query)
            .populate('user', 'nickname avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

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

// 获取相似景点
router.get('/:id/similar', cache({ expire: 3600 }), async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        
        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '景点不存在'
            });
        }

        // 查找相似景点
        const similarSpots = await Spot.find({
            _id: { $ne: spot._id },
            status: 'active',
            $or: [
                { category: spot.category },
                { 'location.city': spot.location.city },
                { bestSeasons: { $in: spot.bestSeasons } }
            ]
        })
            .sort('-rating')
            .limit(6)
            .populate('reviewCount');

        res.json({
            success: true,
            data: similarSpots
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取相似景点失败',
            error: error.message
        });
    }
});

// 收藏景点
router.post('/:id/favorite', auth, async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        
        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '景点不存在'
            });
        }

        const user = await User.findById(req.user.userId);
        const isFavorited = user.favorites.includes(spot._id);

        if (isFavorited) {
            // 取消收藏
            user.favorites = user.favorites.filter(
                id => id.toString() !== spot._id.toString()
            );
        } else {
            // 添加收藏
            user.favorites.push(spot._id);
        }

        await user.save();

        res.json({
            success: true,
            data: {
                favorited: !isFavorited
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '操作失败',
            error: error.message
        });
    }
});

module.exports = router; 