const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Comment = require('../models/comment');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// 获取评价列表
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            rating,
            travelType,
            hasImages,
            spotId
        } = req.query;

        // 构建查询条件
        const query = { status: 'approved' };
        
        if (rating) query.rating = Number(rating);
        if (travelType) query.travelType = travelType;
        if (hasImages === 'true') query['images.0'] = { $exists: true };
        if (spotId) query.spot = spotId;

        // 执行查询
        const reviews = await Review.find(query)
            .populate('user', 'nickname avatar')
            .populate('spot', 'name location')
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

// 创建评价
router.post('/', auth, upload.array('images', 5), async (req, res) => {
    try {
        const reviewData = {
            ...req.body,
            user: req.user.userId,
            images: req.files?.map(file => ({
                url: `/uploads/${file.filename}`,
                caption: file.originalname
            })) || []
        };

        const review = new Review(reviewData);
        await review.save();

        res.status(201).json({
            success: true,
            data: review
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建评价失败',
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

        review.likeCount += 1;
        await review.save();

        res.json({
            success: true,
            message: '点赞成功',
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

// 评论评价
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        const comment = new Comment({
            user: req.user.userId,
            review: review._id,
            content: req.body.content
        });

        await comment.save();

        // 填充用户信息
        await comment.populate('user', 'nickname avatar');

        res.status(201).json({
            success: true,
            data: comment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '评论失败',
            error: error.message
        });
    }
});

// 获取评价的评论列表
router.get('/:id/comments', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const comments = await Comment.find({
            review: req.params.id,
            status: 'active'
        })
            .populate('user', 'nickname avatar')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // 获取总数
        const total = await Comment.countDocuments({
            review: req.params.id,
            status: 'active'
        });

        res.json({
            success: true,
            data: {
                comments,
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
            message: '获取评论列表失败',
            error: error.message
        });
    }
});

// 商家回复评价
router.post('/:id/reply', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: '评价不存在'
            });
        }

        // TODO: 检查商家权限

        review.replyFromBusiness = {
            content: req.body.content,
            repliedAt: new Date(),
            repliedBy: req.user.userId
        };

        await review.save();

        res.json({
            success: true,
            data: review
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '回复失败',
            error: error.message
        });
    }
});

module.exports = router; 