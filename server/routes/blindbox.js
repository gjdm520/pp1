const express = require('express');
const router = express.Router();
const Blindbox = require('../models/blindbox');
const Order = require('../models/order');
const { auth } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// 获取盲盒列表
router.get('/', cache({ expire: 300 }), async (req, res) => {
    try {
        const {
            type,
            minPrice,
            maxPrice,
            duration,
            page = 1,
            limit = 10
        } = req.query;

        // 构建查询条件
        const query = { status: 'active', stock: { $gt: 0 } };
        
        if (type) query.type = type;
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        
        if (duration) {
            const [min, max] = duration.split('-').map(Number);
            query['duration.days'] = { $gte: min, $lte: max };
        }

        const boxes = await Blindbox.find(query)
            .populate('destinations.spot', 'name location images')
            .sort('-soldCount')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Blindbox.countDocuments(query);

        res.json({
            success: true,
            data: {
                boxes,
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
            message: '获取盲盒列表失败',
            error: error.message
        });
    }
});

// 抽取盲盒
router.post('/draw', auth, async (req, res) => {
    try {
        const { type, preferences = {} } = req.body;

        // 获取符合条件的盲盒
        const result = await Blindbox.drawBox(type, preferences);

        if (!result) {
            return res.status(400).json({
                success: false,
                message: '暂无可用盲盒'
            });
        }

        // 记录抽取历史
        await BlindboxDraw.create({
            user: req.user.userId,
            box: result.box._id,
            destination: result.destination,
            preferences
        });

        res.json({
            success: true,
            data: {
                box: result.box,
                destination: result.destination
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '抽取盲盒失败',
            error: error.message
        });
    }
});

// 预订盲盒
router.post('/:id/book', auth, async (req, res) => {
    try {
        const box = await Blindbox.findById(req.params.id);
        if (!box) {
            return res.status(404).json({
                success: false,
                message: '盲盒不存在'
            });
        }

        const {
            quantity = 1,
            visitDate,
            contactName,
            contactPhone,
            visitors
        } = req.body;

        // 检查库存
        if (box.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: '库存不足'
            });
        }

        // 创建订单
        const order = new Order({
            user: req.user.userId,
            type: 'blindbox',
            blindbox: box._id,
            amount: box.price * quantity,
            quantity,
            visitDate: new Date(visitDate),
            contactName,
            contactPhone,
            visitors
        });

        await order.save();

        // 减少库存
        await box.decreaseStock(quantity);

        res.status(201).json({
            success: true,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '预订失败',
            error: error.message
        });
    }
});

// 获取盲盒详情
router.get('/:id', cache({ expire: 300 }), async (req, res) => {
    try {
        const box = await Blindbox.findById(req.params.id)
            .populate('destinations.spot', 'name location images price');

        if (!box) {
            return res.status(404).json({
                success: false,
                message: '盲盒不存在'
            });
        }

        // 获取销售统计
        const stats = await Order.aggregate([
            {
                $match: {
                    blindbox: box._id,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                ...box.toObject(),
                stats: stats[0] || { totalSales: 0, totalRevenue: 0 }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取盲盒详情失败',
            error: error.message
        });
    }
});

// 获取盲盒评价
router.get('/:id/reviews', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt'
        } = req.query;

        const reviews = await Review.find({
            blindbox: req.params.id,
            status: 'approved'
        })
            .populate('user', 'nickname avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Review.countDocuments({
            blindbox: req.params.id,
            status: 'approved'
        });

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
            message: '获取评价失败',
            error: error.message
        });
    }
});

// 获取推荐盲盒
router.get('/:id/recommendations', cache({ expire: 1800 }), async (req, res) => {
    try {
        const box = await Blindbox.findById(req.params.id);
        
        if (!box) {
            return res.status(404).json({
                success: false,
                message: '盲盒不存在'
            });
        }

        // 基于类型和价格范围推荐
        const recommendations = await Blindbox.find({
            _id: { $ne: box._id },
            status: 'active',
            stock: { $gt: 0 },
            type: box.type,
            price: {
                $gte: box.price * 0.8,
                $lte: box.price * 1.2
            }
        })
            .populate('destinations.spot', 'name location images')
            .limit(6);

        res.json({
            success: true,
            data: recommendations
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取推荐盲盒失败',
            error: error.message
        });
    }
});

module.exports = router; 