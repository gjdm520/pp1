const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { auth } = require('../middleware/auth');
const paymentUtil = require('../utils/payment');
const { validate } = require('../middleware/validate');
const Notification = require('../models/notification');
const Log = require('../models/log');

// 创建支付订单
router.post('/create', auth, validate.payment, async (req, res) => {
    try {
        const { orderId, paymentMethod } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查订单所有者
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权操作此订单'
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
        const paymentOrder = await paymentUtil.createPaymentOrder({
            orderId: order._id,
            orderNo: order.orderNo,
            amount: order.amount,
            subject: `订单${order.orderNo}`,
            method: paymentMethod,
            userId: req.user.userId,
            notifyUrl: `${process.env.API_BASE_URL}/payment/notify/${paymentMethod}`
        });

        res.json({
            success: true,
            data: paymentOrder
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建支付订单失败',
            error: error.message
        });
    }
});

// 支付结果查询
router.get('/query/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查订单所有者
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查询此订单'
            });
        }

        // 查询支付状态
        const paymentStatus = await paymentUtil.queryPaymentStatus(order.paymentInfo.transactionId);

        res.json({
            success: true,
            data: paymentStatus
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '查询支付状态失败',
            error: error.message
        });
    }
});

// 支付回调通知处理
router.post('/notify/:method', async (req, res) => {
    try {
        const { method } = req.params;
        const notifyData = req.body;

        // 验证通知数据
        const verifyResult = await paymentUtil.verifyNotify(method, notifyData);
        if (!verifyResult.success) {
            return res.status(400).send('验证失败');
        }

        // 处理支付结果
        const { orderId, status, transactionId, amount } = verifyResult.data;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('订单不存在');
        }

        if (status === 'success') {
            // 更新订单状态
            order.status = 'paid';
            order.paymentInfo = {
                method,
                transactionId,
                paidAmount: amount,
                paidAt: new Date()
            };
            await order.save();

            // 记录支付日志
            await Log.create({
                module: 'payment',
                type: 'success',
                data: {
                    orderId,
                    method,
                    transactionId,
                    amount
                }
            });

            // 发送支付成功通知
            await Notification.create({
                user: order.user,
                type: 'order',
                title: '支付成功',
                content: `订单 ${order.orderNo} 支付成功`
            });
        }

        res.send('success');

    } catch (error) {
        console.error('支付回调处理失败:', error);
        res.status(500).send('处理失败');
    }
});

// 申请退款
router.post('/refund', auth, validate.refund, async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查订单所有者
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权申请退款'
            });
        }

        // 检查订单状态
        if (order.status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: '订单状态不允许退款'
            });
        }

        // 更新订单状态
        order.status = 'refund_pending';
        order.refundInfo = {
            reason,
            requestTime: new Date(),
            requestUser: req.user.userId
        };
        await order.save();

        // 通知管理员
        await Notification.create({
            user: null, // 发送给所有管理员
            type: 'refund',
            title: '新的退款申请',
            content: `订单 ${order.orderNo} 申请退款，原因：${reason}`
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