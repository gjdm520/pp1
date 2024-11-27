const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Comment = require('../models/comment');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { cache } = require('../middleware/cache');
const { validate } = require('../middleware/validate');

// 创建评价
router.post('/', auth, upload.array('images', 9), validate.review, async (req, res) => {
    try {
        const reviewData = {
            ...req.body,
            user: req.user.userId,
            images: req.files?.map(file => ({
                url: `/uploads/${file.filename}`,
                caption: file.originalname
            }))
        };

        const review = new Review(reviewData);
        await review.save();

        // 更新景点评分
        await Review.calcAverageRating(review.spot);

        // 发送通知
        await Notification.create({
            user: req.user.userId,
            type: 'review',
            title: '评价发布成功',
            content: `您的评价已发布，等待审核`
        });

        res.status(201).json({
            success: true,
            data: review
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '发布评价失败',
            error: error.message
        });
    }
});

// 获取评价列表
router.get('/', cache({ expire: 300 }), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            rating,
            travelType,
            hasImages,
            spotId,
            userId
        } = req.query;

        // 构建查询条件
        const query = { status: 'approved' };
        
        if (rating) query.rating = Number(rating);
        if (travelType) query.travelType = travelType;
        if (hasImages === 'true') query['images.0'] = { $exists: true };
        if (spotId) query.spot = spotId;
        if (userId) query.user = userId;

        const reviews = await Review.find(query)
            .populate('user', 'nickname avatar')
            .populate('spot', 'name location')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Review.countDocuments(query);

        // 获取评分分布
        const ratingDistribution = await Review.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                reviews,
                ratingDistribution,
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

// 获取评价详情
router.get('/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('user', 'nickname avatar')
            .populate('spot', 'name location images')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'nickname avatar'
                }
            });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        res.json({
            success: true,
            data: review
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取评价详情失败',
            error: error.message
        });
    }
});

// 更新评价
router.put('/:id', auth, upload.array('images', 9), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        // 检查权限
        if (review.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权修改此评价'
            });
        }

        // 更新评价内容
        Object.assign(review, req.body);

        // 处理新上传的图片
        if (req.files?.length) {
            const newImages = req.files.map(file => ({
                url: `/uploads/${file.filename}`,
                caption: file.originalname
            }));
            review.images = [...review.images, ...newImages];
        }

        await review.save();

        // 更新景点评分
        await Review.calcAverageRating(review.spot);

        res.json({
            success: true,
            data: review
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新评价失败',
            error: error.message
        });
    }
});

// 删除评价
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        // 检查权限
        if (review.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此评价'
            });
        }

        await review.remove();

        // 更新景点评分
        await Review.calcAverageRating(review.spot);

        res.json({
            success: true,
            message: '评价已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除评价失败',
            error: error.message
        });
    }
});

// 点赞评价
router.post('/:id/like', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        await review.incrementLikeCount();

        res.json({
            success: true,
            data: {
                likeCount: review.likeCount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '点赞失败',
            error: error.message
        });
    }
});

module.exports = router; 