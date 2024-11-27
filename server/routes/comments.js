const express = require('express');
const router = express.Router();
const Comment = require('../models/comment');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// 创建评论
router.post('/', auth, async (req, res) => {
    try {
        const commentData = {
            ...req.body,
            user: req.user.userId
        };

        const comment = new Comment(commentData);
        await comment.save();

        // 填充用户信息后返回
        await comment.populate('user', 'nickname avatar');

        res.status(201).json({
            success: true,
            data: comment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '发表评论失败',
            error: error.message
        });
    }
});

// 回复评论
router.post('/:id/reply', auth, async (req, res) => {
    try {
        const parentComment = await Comment.findById(req.params.id);
        
        if (!parentComment) {
            return res.status(404).json({
                success: false,
                message: '原评论不存在'
            });
        }

        const replyData = {
            ...req.body,
            user: req.user.userId,
            parentComment: req.params.id,
            review: parentComment.review,
            guide: parentComment.guide
        };

        const reply = new Comment(replyData);
        await reply.save();

        // 填充用户信息后返回
        await reply.populate('user', 'nickname avatar');

        res.status(201).json({
            success: true,
            data: reply
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '回复评论失败',
            error: error.message
        });
    }
});

// 获取评论回复列表
router.get('/:id/replies', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const replies = await Comment.find({
            parentComment: req.params.id,
            status: 'active'
        })
            .populate('user', 'nickname avatar')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments({
            parentComment: req.params.id,
            status: 'active'
        });

        res.json({
            success: true,
            data: {
                replies,
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
            message: '获取回复列表失败',
            error: error.message
        });
    }
});

// 点赞评论
router.post('/:id/like', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: '评论不存在'
            });
        }

        await comment.incrementLikeCount();

        res.json({
            success: true,
            message: '点赞成功',
            data: {
                likeCount: comment.likeCount
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

// 删除评论
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: '评论不存在'
            });
        }

        // 检查权限
        if (comment.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此评论'
            });
        }

        // 软删除评论
        comment.status = 'deleted';
        await comment.save();

        res.json({
            success: true,
            message: '评论已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除评论失败',
            error: error.message
        });
    }
});

module.exports = router; 