const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { auth } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// 获取用户通知列表
router.get('/', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            isRead
        } = req.query;

        // 构建查询条件
        const query = { user: req.user.userId };
        if (type) query.type = type;
        if (isRead !== undefined) query.isRead = isRead === 'true';

        const notifications = await Notification.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Notification.countDocuments(query);

        res.json({
            success: true,
            data: {
                notifications,
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
            message: '获取通知列表失败',
            error: error.message
        });
    }
});

// 获取未读通知数量
router.get('/unread-count', auth, cache({ expire: 60 }), async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            user: req.user.userId,
            isRead: false
        });

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取未读通知数量失败',
            error: error.message
        });
    }
});

// 标记通知为已读
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: '通知不存在'
            });
        }

        // 检查权限
        if (notification.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权操作此通知'
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            message: '已标记为已读'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '标记已读失败',
            error: error.message
        });
    }
});

// 批量标记通知为已读
router.put('/read-all', auth, async (req, res) => {
    try {
        const { notificationIds } = req.body;

        if (notificationIds && notificationIds.length > 0) {
            // 标记指定通知为已读
            await Notification.markManyAsRead(req.user.userId, notificationIds);
        } else {
            // 标记所有未读通知为已读
            await Notification.updateMany(
                {
                    user: req.user.userId,
                    isRead: false
                },
                {
                    $set: {
                        isRead: true,
                        readAt: new Date()
                    }
                }
            );
        }

        res.json({
            success: true,
            message: '已全部标记为已读'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '批量标记已读失败',
            error: error.message
        });
    }
});

// 删除通知
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: '通知不存在'
            });
        }

        // 检查权限
        if (notification.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此通知'
            });
        }

        await notification.remove();

        res.json({
            success: true,
            message: '通知已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除通知失败',
            error: error.message
        });
    }
});

// 批量删除通知
router.delete('/batch', auth, async (req, res) => {
    try {
        const { notificationIds } = req.body;

        if (!notificationIds || !notificationIds.length) {
            return res.status(400).json({
                success: false,
                message: '请选择要删除的通知'
            });
        }

        await Notification.deleteMany({
            _id: { $in: notificationIds },
            user: req.user.userId
        });

        res.json({
            success: true,
            message: '通知已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '批量删除通知失败',
            error: error.message
        });
    }
});

module.exports = router; 