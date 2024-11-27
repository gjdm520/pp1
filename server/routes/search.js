const express = require('express');
const router = express.Router();
const Spot = require('../models/spot');
const Guide = require('../models/guide');
const Review = require('../models/review');
const { cache } = require('../middleware/cache');

// 全局搜索
router.get('/', cache({ expire: 300 }), async (req, res) => {
    try {
        const {
            q, // 搜索关键词
            type = 'all', // 搜索类型: all, spot, guide, review
            page = 1,
            limit = 10,
            sort = 'relevance' // relevance, newest
        } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: '请输入搜索关键词'
            });
        }

        let results = [];
        let total = 0;

        // 根据搜索类型执行不同的搜索
        switch (type) {
            case 'spot':
                // 搜索景点
                results = await Spot.find(
                    { $text: { $search: q } },
                    { score: { $meta: 'textScore' } }
                )
                    .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : '-createdAt')
                    .skip((page - 1) * limit)
                    .limit(Number(limit));
                
                total = await Spot.countDocuments({ $text: { $search: q } });
                break;

            case 'guide':
                // 搜索攻略
                results = await Guide.find(
                    { $text: { $search: q } },
                    { score: { $meta: 'textScore' } }
                )
                    .populate('author', 'nickname avatar')
                    .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : '-createdAt')
                    .skip((page - 1) * limit)
                    .limit(Number(limit));
                
                total = await Guide.countDocuments({ $text: { $search: q } });
                break;

            case 'review':
                // 搜索评价
                results = await Review.find(
                    { $text: { $search: q } },
                    { score: { $meta: 'textScore' } }
                )
                    .populate('user', 'nickname avatar')
                    .populate('spot', 'name location')
                    .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : '-createdAt')
                    .skip((page - 1) * limit)
                    .limit(Number(limit));
                
                total = await Review.countDocuments({ $text: { $search: q } });
                break;

            case 'all':
            default:
                // 搜索所有类型
                const [spots, guides, reviews] = await Promise.all([
                    Spot.find(
                        { $text: { $search: q } },
                        { score: { $meta: 'textScore' } }
                    ).limit(3),
                    
                    Guide.find(
                        { $text: { $search: q } },
                        { score: { $meta: 'textScore' } }
                    )
                        .populate('author', 'nickname avatar')
                        .limit(3),
                    
                    Review.find(
                        { $text: { $search: q } },
                        { score: { $meta: 'textScore' } }
                    )
                        .populate('user', 'nickname avatar')
                        .populate('spot', 'name location')
                        .limit(3)
                ]);

                results = {
                    spots,
                    guides,
                    reviews
                };

                total = spots.length + guides.length + reviews.length;
                break;
        }

        res.json({
            success: true,
            data: {
                results,
                pagination: type === 'all' ? null : {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '搜索失败',
            error: error.message
        });
    }
});

// 搜索建议
router.get('/suggestions', cache({ expire: 60 }), async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q) {
            return res.json({
                success: true,
                data: []
            });
        }

        // 从各个集合中获取搜索建议
        const [spotSuggestions, guideSuggestions] = await Promise.all([
            Spot.find(
                { $text: { $search: q } },
                { score: { $meta: 'textScore' } }
            )
                .select('name location')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit),

            Guide.find(
                { $text: { $search: q } },
                { score: { $meta: 'textScore' } }
            )
                .select('title')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
        ]);

        // 合并并格式化建议结果
        const suggestions = [
            ...spotSuggestions.map(spot => ({
                type: 'spot',
                id: spot._id,
                text: spot.name,
                subtext: `${spot.location.province} ${spot.location.city}`
            })),
            ...guideSuggestions.map(guide => ({
                type: 'guide',
                id: guide._id,
                text: guide.title
            }))
        ];

        // 按相关性排序并限制数量
        suggestions.sort((a, b) => b.score - a.score);
        suggestions.splice(limit);

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取搜索建议失败',
            error: error.message
        });
    }
});

module.exports = router; 