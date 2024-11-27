const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Spot = require('../models/spot');
const Guide = require('../models/guide');
const Order = require('../models/order');
const Review = require('../models/review');
const Log = require('../models/log');
const { auth, checkRole } = require('../middleware/auth');

// 管理员权限中间件
const adminAuth = [auth, checkRole('admin')];

// 获取系统概览数据
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const [
            userCount,
            spotCount,
            guideCount,
            orderCount,
            todayOrderCount,
            todayRevenue,
            recentLogs
        ] = await Promise.all([
            User.countDocuments(),
            Spot.countDocuments(),
            Guide.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({
                createdAt: { $gte: new Date().setHours(0,0,0,0) }
            }),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date().setHours(0,0,0,0) },
                        status: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            Log.find({ level: 'error' })
                .sort('-createdAt')
                .limit(10)
        ]);

        res.json({
            success: true,
            data: {
                counts: {
                    users: userCount,
                    spots: spotCount,
                    guides: guideCount,
                    orders: orderCount
                },
                today: {
                    orders: todayOrderCount,
                    revenue: todayRevenue[0]?.total || 0
                },
                recentLogs
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取概览数据失败',
            error: error.message
        });
    }
});

// 用户管理相关路由
router.get('/users', adminAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            keyword,
            role,
            status
        } = req.query;

        // 构建查询条件
        const query = {};
        if (keyword) {
            query.$or = [
                { nickname: new RegExp(keyword, 'i') },
                { phone: new RegExp(keyword, 'i') },
                { email: new RegExp(keyword, 'i') }
            ];
        }
        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query)
            .select('-password')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
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
            message: '获取用户列表失败',
            error: error.message
        });
    }
});

// 更新用户状态
router.put('/users/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新用户状态失败',
            error: error.message
        });
    }
});

// 内容审核相关路由
router.get('/content/pending', adminAuth, async (req, res) => {
    try {
        const [pendingGuides, pendingReviews] = await Promise.all([
            Guide.find({ status: 'pending' })
                .populate('author', 'nickname')
                .sort('-createdAt')
                .limit(10),
            Review.find({ status: 'pending' })
                .populate('user', 'nickname')
                .populate('spot', 'name')
                .sort('-createdAt')
                .limit(10)
        ]);

        res.json({
            success: true,
            data: {
                guides: pendingGuides,
                reviews: pendingReviews
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取待审核内容失败',
            error: error.message
        });
    }
});

// 审核内容
router.post('/content/review', adminAuth, async (req, res) => {
    try {
        const { type, id, action, reason } = req.body;

        let content;
        switch (type) {
            case 'guide':
                content = await Guide.findById(id);
                break;
            case 'review':
                content = await Review.findById(id);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: '无效的内容类型'
                });
        }

        if (!content) {
            return res.status(404).json({
                success: false,
                message: '内容不存在'
            });
        }

        content.status = action === 'approve' ? 'published' : 'rejected';
        content.reviewNote = reason;
        await content.save();

        res.json({
            success: true,
            message: `内容已${action === 'approve' ? '通过' : '拒绝'}`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '审核内容失败',
            error: error.message
        });
    }
});

// 订单管理相关路由
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            status,
            startDate,
            endDate,
            keyword
        } = req.query;

        // 构建查询条件
        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        if (keyword) {
            query.$or = [
                { orderNo: new RegExp(keyword, 'i') },
                { 'contactName': new RegExp(keyword, 'i') },
                { 'contactPhone': new RegExp(keyword, 'i') }
            ];
        }

        const orders = await Order.find(query)
            .populate('user', 'nickname phone')
            .populate('spot', 'name')
            .populate('blindbox', 'name')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        // 计算订单统计数据
        const stats = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                orders,
                stats,
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

// 处理退款申请
router.post('/orders/:id/refund', adminAuth, async (req, res) => {
    try {
        const { approved, reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        if (order.status !== 'refund_pending') {
            return res.status(400).json({
                success: false,
                message: '订单状态错误'
            });
        }

        if (approved) {
            // 调用支付系统执行退款
            const refundResult = await paymentUtil.refund(order.paymentInfo.transactionId, {
                amount: order.amount,
                reason: reason || '管理员同意退款'
            });

            if (refundResult.success) {
                order.status = 'refunded';
                order.refundInfo = {
                    time: new Date(),
                    amount: order.amount,
                    reason: reason,
                    operator: req.user.userId
                };
            } else {
                throw new Error('退款执行失败');
            }
        } else {
            order.status = 'refund_rejected';
            order.refundInfo = {
                time: new Date(),
                reason: reason,
                operator: req.user.userId
            };
        }

        await order.save();

        // 发送通知给用户
        await Notification.create({
            user: order.user,
            type: 'order',
            title: `退款申请${approved ? '已通过' : '已拒绝'}`,
            content: `订单 ${order.orderNo} 的退款申请${approved ? '已通过' : '已拒绝'}${reason ? `，原因：${reason}` : ''}`
        });

        res.json({
            success: true,
            message: `退款申请已${approved ? '通过' : '拒绝'}`,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '处理退款申请失败',
            error: error.message
        });
    }
});

// 系统设置相关路由
router.get('/settings', adminAuth, async (req, res) => {
    try {
        const settings = await SystemSetting.findOne() || new SystemSetting();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取系统设置失败',
            error: error.message
        });
    }
});

router.put('/settings', adminAuth, async (req, res) => {
    try {
        const settings = await SystemSetting.findOne() || new SystemSetting();
        Object.assign(settings, req.body);
        await settings.save();

        // 更新系统缓存
        await cache.del('system:settings');

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新系统设置失败',
            error: error.message
        });
    }
});

module.exports = router; 