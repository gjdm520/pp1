const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Order = require('../models/order');
const Review = require('../models/review');
const Guide = require('../models/guide');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { cache } = require('../middleware/cache');

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('favorites');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取用户信息失败',
            error: error.message
        });
    }
});

// 更新用户信息
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
    try {
        const updates = {
            ...req.body
        };

        if (req.file) {
            updates.avatar = `/uploads/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新用户信息失败',
            error: error.message
        });
    }
});

// 获取用户订单列表
router.get('/orders', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status
        } = req.query;

        const query = { user: req.user.userId };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('spot')
            .populate('blindbox')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            data: {
                orders,
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
            message: '获取订单列表失败',
            error: error.message
        });
    }
});

// 获取用户评价列表
router.get('/reviews', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const reviews = await Review.find({ user: req.user.userId })
            .populate('spot')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Review.countDocuments({ user: req.user.userId });

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

// 获取用户攻略列表
router.get('/guides', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status
        } = req.query;

        const query = { author: req.user.userId };
        if (status) query.status = status;

        const guides = await Guide.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Guide.countDocuments(query);

        res.json({
            success: true,
            data: {
                guides,
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
            message: '获取攻略列表失败',
            error: error.message
        });
    }
});

// 收藏/取消收藏景点
router.post('/favorites/:spotId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const spotId = req.params.spotId;

        const isFavorited = user.favorites.includes(spotId);
        
        if (isFavorited) {
            user.favorites = user.favorites.filter(id => id.toString() !== spotId);
            await user.save();

            res.json({
                success: true,
                message: '已取消收藏'
            });
        } else {
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

// 获取用户收藏列表
router.get('/favorites', auth, cache({ expire: 300 }), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const user = await User.findById(req.user.userId)
            .populate({
                path: 'favorites',
                options: {
                    skip: (page - 1) * limit,
                    limit: Number(limit)
                }
            });

        const total = user.favorites.length;

        res.json({
            success: true,
            data: {
                favorites: user.favorites,
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
            message: '获取收藏列表失败',
            error: error.message
        });
    }
});

module.exports = router; 