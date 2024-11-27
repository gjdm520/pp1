const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const response = require('../utils/response');
const payment = require('../utils/payment');
const notification = require('../models/notification');
const emailUtil = require('../utils/email');
const smsUtil = require('../utils/sms');

// 创建订单
router.post('/', auth, async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            user: req.user.userId,
            status: 'pending'
        };

        const order = new Order(orderData);
        await order.save();

        // 发送订单确认通知
        await notification.create({
            user: req.user.userId,
            type: 'order',
            title: '订单创建成功',
            content: `订单号: ${order.orderNo}`
        });

        // 发送邮件通知
        await emailUtil.sendOrderConfirmation(req.user.email, order);

        res.status(201).json({
            success: true,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建订单失败',
            error: error.message
        });
    }
});

// 获取订单列表
router.get('/', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            type
        } = req.query;

        // 构建查询条件
        const query = { user: req.user.userId };
        if (status) query.status = status;
        if (type) query.type = type;

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

// 获取订单详情
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('spot')
            .populate('blindbox')
            .populate('user', 'nickname phone email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查权限
        if (order.user._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看此订单'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取订单详情失败',
            error: error.message
        });
    }
});

// 取消订单
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查权限
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权取消此订单'
            });
        }

        await order.cancel();

        // 发送取消通知
        await notification.create({
            user: req.user.userId,
            type: 'order',
            title: '订单已取消',
            content: `订单号: ${order.orderNo}`
        });

        res.json({
            success: true,
            message: '订单已取消'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '取消订单失败',
            error: error.message
        });
    }
});

// 支付订单
router.post('/:id/pay', auth, async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查订单状态
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: '订单状态错误'
            });
        }

        // 创建支付订单
        const paymentResult = await payment.createPayment(order, paymentMethod);

        res.json({
            success: true,
            data: paymentResult
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建支付失败',
            error: error.message
        });
    }
});

// 申请退款
router.post('/:id/refund', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        await order.requestRefund(reason);

        // 发送退款申请通知
        await notification.create({
            user: req.user.userId,
            type: 'order',
            title: '退款申请已提交',
            content: `订单号: ${order.orderNo}`
        });

        res.json({
            success: true,
            message: '退款申请已提交'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '申请退款失败',
            error: error.message
        });
    }
});

module.exports = router; 