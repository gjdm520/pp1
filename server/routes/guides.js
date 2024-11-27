const express = require('express');
const router = express.Router();
const Guide = require('../models/guide');
const Comment = require('../models/comment');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { cache } = require('../middleware/cache');
const { validate } = require('../middleware/validate');
const User = require('../models/user');
const Report = require('../models/report');
const GuideHistory = require('../models/guideHistory');
const GuideSuggestion = require('../models/guideSuggestion');
const Notification = require('../models/notification');
const emailUtil = require('../utils/emailUtil');
const Log = require('../models/log');
const exportQueue = require('../utils/exportQueue');
const locationUtil = require('../utils/locationUtil');
const imageUtil = require('../utils/imageUtil');
const uploadUtil = require('../utils/uploadUtil');
const aiUtil = require('../utils/aiUtil');
const Question = require('../models/question');
const Spot = require('../models/spot');
const weatherUtil = require('../utils/weatherUtil');
const dateUtil = require('../utils/dateUtil');
const calendarUtil = require('../utils/calendarUtil');
const ttsUtil = require('../utils/ttsUtil');
const qrcodeUtil = require('../utils/qrcodeUtil');
const Review = require('../models/review');
const transportUtil = require('../utils/transportUtil');
const timeUtil = require('../utils/timeUtil');
const routeUtil = require('../utils/routeUtil');
const GuideOptimization = require('../models/guideOptimization');

// 创建攻略
router.post('/', auth, upload.array('images', 5), async (req, res) => {
    try {
        const guideData = {
            ...req.body,
            author: req.user.userId,
            images: req.files?.map(file => ({
                url: `/uploads/${file.filename}`,
                caption: file.originalname
            }))
        };

        const guide = new Guide(guideData);
        await guide.save();

        res.status(201).json({
            success: true,
            data: guide
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建攻略失败',
            error: error.message
        });
    }
});

// 获取攻略列表
router.get('/', cache({ expire: 300 }), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            category,
            duration,
            budget,
            season
        } = req.query;

        // 构建查询条件
        const query = { status: 'published' };
        
        if (category) query.category = category;
        if (season) query.bestSeasons = season;
        
        if (duration) {
            const [min, max] = duration.split('-').map(Number);
            query['duration.days'] = { $gte: min, $lte: max };
        }
        
        if (budget) {
            const [min, max] = budget.split('-').map(Number);
            query['budget.min'] = { $gte: min };
            query['budget.max'] = { $lte: max };
        }

        const guides = await Guide.find(query)
            .populate('author', 'nickname avatar')
            .sort(sort)
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

// 获取攻略详情
router.get('/:id', cache({ expire: 300 }), async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('author', 'nickname avatar')
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '略不存在'
            });
        }

        // 增加访问量
        await guide.incrementViewCount();

        res.json({
            success: true,
            data: guide
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取攻略详情失败',
            error: error.message
        });
    }
});

// 更新攻略
router.put('/:id', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权修改此攻略'
            });
        }

        Object.assign(guide, req.body);
        await guide.save();

        res.json({
            success: true,
            data: guide
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新攻略失败',
            error: error.message
        });
    }
});

// 删除攻略
router.delete('/:id', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此攻略'
            });
        }

        await guide.remove();

        res.json({
            success: true,
            message: '攻略已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除攻略失败',
            error: error.message
        });
    }
});

// 点赞攻略
router.post('/:id/like', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        await guide.incrementLikeCount();

        res.json({
            success: true,
            message: '点赞成功',
            data: {
                likeCount: guide.likeCount
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

// 获取攻略评论
router.get('/:id/comments', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const comments = await Comment.find({
            guide: req.params.id,
            status: 'active'
        })
            .populate('user', 'nickname avatar')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Comment.countDocuments({
            guide: req.params.id,
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
            message: '获取评论失败',
            error: error.message
        });
    }
});

// 取热门攻略
router.get('/hot', cache({ expire: 3600 }), async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const guides = await Guide.find({ status: 'published' })
            .sort('-viewCount -likeCount')
            .populate('author', 'nickname avatar')
            .limit(Number(limit));

        res.json({
            success: true,
            data: guides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取热门攻略失败',
            error: error.message
        });
    }
});

// 获取推荐攻略
router.get('/recommended', cache({ expire: 1800 }), async (req, res) => {
    try {
        const { limit = 6 } = req.query;
        const userId = req.user?.userId;

        let recommendedGuides;

        if (userId) {
            // 基于用户兴趣推荐
            const userInterests = await getUserInterests(userId);
            recommendedGuides = await Guide.find({
                status: 'published',
                category: { $in: userInterests.categories },
                'destinations.spot': { $in: userInterests.spots }
            })
                .populate('author', 'nickname avatar')
                .populate('destinations.spot', 'name location')
                .sort('-rating -viewCount')
                .limit(Number(limit));
        } else {
            // 基于热度推荐
            recommendedGuides = await Guide.find({ status: 'published' })
                .populate('author', 'nickname avatar')
                .populate('destinations.spot', 'name location')
                .sort('-viewCount -rating')
                .limit(Number(limit));
        }

        res.json({
            success: true,
            data: recommendedGuides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取推荐攻略失败',
            error: error.message
        });
    }
});

// 获取用户兴趣
async function getUserInterests(userId) {
    // 获取用户浏览历史
    const viewHistory = await Log.find({
        user: userId,
        type: 'view',
        module: 'guide'
    }).sort('-createdAt').limit(50);

    // 获取用户收藏
    const favorites = await User.findById(userId).select('favoriteGuides');

    // 获取相关攻略
    const guideIds = [
        ...viewHistory.map(log => log.metadata.guideId),
        ...favorites.favoriteGuides
    ];

    const guides = await Guide.find({
        _id: { $in: guideIds }
    }).select('category destinations.spot');

    // 统计兴趣
    const categoryCount = {};
    const spotCount = {};

    guides.forEach(guide => {
        categoryCount[guide.category] = (categoryCount[guide.category] || 0) + 1;
        guide.destinations.forEach(dest => {
            spotCount[dest.spot] = (spotCount[dest.spot] || 0) + 1;
        });
    });

    // 获取top3类别和景点
    const categories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

    const spots = Object.entries(spotCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([spotId]) => spotId);

    return { categories, spots };
}

// 获取热门目的地
router.get('/hot-destinations', cache({ expire: 3600 }), async (req, res) => {
    try {
        const destinations = await Guide.aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$destinations' },
            {
                $group: {
                    _id: '$destinations.spot',
                    count: { $sum: 1 },
                    guides: { $push: '$_id' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 6 }
        ]);

        // 填充景点信息
        await Spot.populate(destinations, {
            path: '_id',
            select: 'name location images description'
        });

        res.json({
            success: true,
            data: destinations.map(d => ({
                spot: d._id,
                guideCount: d.count,
                guides: d.guides
            }))
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取热门目的地失败',
            error: error.message
        });
    }
});

// 获取攻略统计数据
router.get('/stats', cache({ expire: 7200 }), async (req, res) => {
    try {
        const [totalGuides, totalAuthors, totalDestinations] = await Promise.all([
            Guide.countDocuments({ status: 'published' }),
            Guide.distinct('author').length,
            Guide.distinct('destinations.spot').length
        ]);

        // 获取平均评分
        const ratings = await Guide.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalGuides,
                totalAuthors,
                totalDestinations,
                averageRating: ratings[0]?.avgRating || 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取统计数据失败',
            error: error.message
        });
    }
});

// 获取相关攻略
router.get('/:id/related', cache({ expire: 1800 }), async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取相同类别或目的地的攻略
        const relatedGuides = await Guide.find({
            _id: { $ne: guide._id },
            status: 'published',
            $or: [
                { category: guide.category },
                { 'destinations.spot': { $in: guide.destinations.map(d => d.spot) } }
            ]
        })
            .populate('author', 'nickname avatar')
            .sort('-viewCount')
            .limit(6);

        res.json({
            success: true,
            data: relatedGuides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取相关攻略失败',
            error: error.message
        });
    }
});

// 收藏攻略
router.post('/:id/favorite', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        const user = await User.findById(req.user.userId);
        const isFavorited = user.favoriteGuides.includes(guide._id);

        if (isFavorited) {
            // 取消收藏
            user.favoriteGuides = user.favoriteGuides.filter(
                id => id.toString() !== guide._id.toString()
            );
            guide.favoriteCount--;
        } else {
            // 添加收藏
            user.favoriteGuides.push(guide._id);
            guide.favoriteCount++;
        }

        await Promise.all([user.save(), guide.save()]);

        res.json({
            success: true,
            data: {
                favorited: !isFavorited,
                favoriteCount: guide.favoriteCount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '操作失败',
            error: error.message
        });
    }
});

// 分享攻略
router.post('/:id/share', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        guide.shareCount++;
        await guide.save();

        res.json({
            success: true,
            data: {
                shareCount: guide.shareCount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '分享失败',
            error: error.message
        });
    }
});

// 获取攻略统计数据
router.get('/:id/stats', cache({ expire: 300 }), async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        const stats = {
            viewCount: guide.viewCount,
            likeCount: guide.likeCount,
            commentCount: await Comment.countDocuments({ guide: guide._id }),
            shareCount: guide.shareCount,
            favoriteCount: guide.favoriteCount
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取统计数据失败',
            error: error.message
        });
    }
});

// 获取攻略目录
router.get('/:id/toc', cache({ expire: 3600 }), async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .select('content');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 从内容中提取标题生成目录
        const toc = guide.content.match(/#{2,4}\s[^\n]+/g)?.map(heading => {
            const level = heading.match(/#/g).length - 1;
            const text = heading.replace(/#{2,4}\s/, '');
            return { level, text };
        }) || [];

        res.json({
            success: true,
            data: toc
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取目录失败',
            error: error.message
        });
    }
});

// 获取攻略打印版本
router.get('/:id/print', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('author', 'nickname')
            .populate('destinations.spot', 'name location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 生成打印友好的版本
        const printVersion = {
            title: guide.title,
            author: guide.author.nickname,
            createdAt: guide.createdAt,
            summary: guide.summary,
            content: guide.content,
            destinations: guide.destinations.map(d => ({
                name: d.spot.name,
                location: `${d.spot.location.province} ${d.spot.location.city}`,
                duration: d.duration
            })),
            tips: guide.tips,
            budget: guide.budget,
            bestSeasons: guide.bestSeasons
        };

        res.json({
            success: true,
            data: printVersion
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取打印版本失败',
            error: error.message
        });
    }
});

// 举报攻略
router.post('/:id/report', auth, validate.report, async (req, res) => {
    try {
        const { reason, description } = req.body;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 创建举报记录
        await Report.create({
            type: 'guide',
            target: guide._id,
            user: req.user.userId,
            reason,
            description,
            status: 'pending'
        });

        res.json({
            success: true,
            message: '举报已提交'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '举报失败',
            error: error.message
        });
    }
});

// 获取攻略修改历史
router.get('/:id/history', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // �����查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看改历史'
            });
        }

        const history = await GuideHistory.find({ guide: guide._id })
            .sort('-createdAt')
            .select('updatedFields updatedAt');

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取修改历史失败',
            error: error.message
        });
    }
});

// 获取攻略草稿
router.get('/drafts', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-updatedAt'
        } = req.query;

        const drafts = await Guide.find({
            author: req.user.userId,
            status: 'draft'
        })
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Guide.countDocuments({
            author: req.user.userId,
            status: 'draft'
        });

        res.json({
            success: true,
            data: {
                drafts,
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
            message: '获取草稿列表失败',
            error: error.message
        });
    }
});

// 保存草稿
router.post('/drafts', auth, async (req, res) => {
    try {
        const guideData = {
            ...req.body,
            author: req.user.userId,
            status: 'draft'
        };

        const guide = new Guide(guideData);
        await guide.save();

        res.status(201).json({
            success: true,
            data: guide
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '保存草稿失败',
            error: error.message
        });
    }
});

// 获取攻略分类统计
router.get('/categories/stats', cache({ expire: 3600 }), async (req, res) => {
    try {
        const stats = await Guide.aggregate([
            {
                $match: { status: 'published' }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取分类统计失败',
            error: error.message
        });
    }
});

// 获取攻略季节推荐
router.get('/seasons/recommended', async (req, res) => {
    try {
        const currentMonth = new Date().getMonth() + 1;
        let currentSeason;

        // 判断当前季节
        if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
        else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
        else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = 'autumn';
        else currentSeason = 'winter';

        // 获取当季推荐攻略
        const guides = await Guide.find({
            status: 'published',
            bestSeasons: currentSeason
        })
            .sort('-rating -viewCount')
            .populate('author', 'nickname avatar')
            .limit(6);

        res.json({
            success: true,
            data: {
                season: currentSeason,
                guides
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取季节推荐失败',
            error: error.message
        });
    }
});

// 批量更新攻略状态
router.put('/batch/status', auth, async (req, res) => {
    try {
        const { guideIds, status } = req.body;

        if (!guideIds || !guideIds.length) {
            return res.status(400).json({
                success: false,
                message: '请选择要更新的攻略'
            });
        }

        // 验证权限
        const guides = await Guide.find({
            _id: { $in: guideIds },
            author: req.user.userId
        });

        if (guides.length !== guideIds.length) {
            return res.status(403).json({
                success: false,
                message: '包含无权操作的攻略'
            });
        }

        // 批量更新状态
        await Guide.updateMany(
            { _id: { $in: guideIds } },
            { status }
        );

        res.json({
            success: true,
            message: '状态更新成功'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '批量更新状态失败',
            error: error.message
        });
    }
});

// 获取攻略协作者列表
router.get('/:id/collaborators', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('collaborators', 'nickname avatar email');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无查看协作者'
            });
        }

        res.json({
            success: true,
            data: guide.collaborators
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取协作者列表失败',
            error: error.message
        });
    }
});

// 添加协作者
router.post('/:id/collaborators', auth, async (req, res) => {
    try {
        const { email } = req.body;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权添加协作者'
            });
        }

        // 查找要添加的用户
        const collaborator = await User.findOne({ email });
        if (!collaborator) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 检查是否已是协作者
        if (guide.collaborators.includes(collaborator._id)) {
            return res.status(400).json({
                success: false,
                message: '该用户已是协作者'
            });
        }

        // 添加协作者
        guide.collaborators.push(collaborator._id);
        await guide.save();

        // 发送通知
        await Notification.create({
            user: collaborator._id,
            type: 'guide',
            title: '攻略协作邀请',
            content: `您已被邀请协作攻略《${guide.title}》`
        });

        // 发送邮件通知
        await emailUtil.sendCollaborationInvite(collaborator.email, {
            guideName: guide.title,
            inviter: req.user.nickname
        });

        res.json({
            success: true,
            message: '协作者添加成功'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '添加协作者失败',
            error: error.message
        });
    }
});

// 移除协作者
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权移除协作者'
            });
        }

        // 移除协作者
        guide.collaborators = guide.collaborators.filter(
            id => id.toString() !== req.params.userId
        );
        await guide.save();

        // 发送通知
        await Notification.create({
            user: req.params.userId,
            type: 'guide',
            title: '移除协作权限',
            content: `您已被移除攻略《${guide.title}》的协作权限`
        });

        res.json({
            success: true,
            message: '协作者移除成功'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '移除协作者失败',
            error: error.message
        });
    }
});

// 获取攻略修订建议
router.get('/:id/suggestions', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        const suggestions = await GuideSuggestion.find({
            guide: guide._id,
            status: 'pending'
        })
            .populate('user', 'nickname avatar')
            .sort('-createdAt');

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取修订建议失败',
            error: error.message
        });
    }
});

// 提交修订建议
router.post('/:id/suggestions', auth, async (req, res) => {
    try {
        const { content, description } = req.body;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 创建修订建议
        const suggestion = await GuideSuggestion.create({
            guide: guide._id,
            user: req.user.userId,
            content,
            description,
            status: 'pending'
        });

        // 通知作者
        await Notification.create({
            user: guide.author,
            type: 'guide',
            title: '新的修订建议',
            content: `您的攻略《${guide.title}》收到了新的修订建议`
        });

        res.status(201).json({
            success: true,
            data: suggestion
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '提交修订建议失败',
            error: error.message
        });
    }
});

// 处理修订建议
router.put('/:id/suggestions/:suggestionId', auth, async (req, res) => {
    try {
        const { action } = req.body; // accept 或 reject
        const guide = await Guide.findById(req.params.id);
        const suggestion = await GuideSuggestion.findById(req.params.suggestionId);

        if (!guide || !suggestion) {
            return res.status(404).json({
                success: false,
                message: '攻略或修订建议不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权处理修订建议'
            });
        }

        if (action === 'accept') {
            // 接受修订
            guide.content = suggestion.content;
            guide.markModified('content');
            await guide.save();

            suggestion.status = 'accepted';
            await suggestion.save();

            // 记录修改历史
            await GuideHistory.create({
                guide: guide._id,
                user: suggestion.user,
                type: 'suggestion',
                content: suggestion.content
            });
        } else {
            // 拒绝修订
            suggestion.status = 'rejected';
            await suggestion.save();
        }

        // 通知提交者
        await Notification.create({
            user: suggestion.user,
            type: 'guide',
            title: '修订建议处理结果',
            content: `您对攻略《${guide.title}》的修订建议已被${action === 'accept' ? '接受' : '拒绝'}`
        });

        res.json({
            success: true,
            message: action === 'accept' ? '修订已接受' : '修订已拒绝'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '处理修订建议失败',
            error: error.message
        });
    }
});

// 导出攻略
router.get('/:id/export', auth, async (req, res) => {
    try {
        const { format = 'pdf' } = req.query;
        const guide = await Guide.findById(req.params.id)
            .populate('author', 'nickname')
            .populate('destinations.spot', 'name location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 将导出任务添加到队列
        const job = await exportQueue.add('guide', {
            guideId: guide._id,
            format,
            userId: req.user.userId
        });

        // 发送通知
        await Notification.create({
            user: req.user.userId,
            type: 'export',
            title: '攻略导出开始',
            content: `攻略《${guide.title}》开始导出，完成后将通知您`
        });

        res.json({
            success: true,
            data: {
                jobId: job.id,
                message: '导出任务已添加到队列'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建导出任务失败',
            error: error.message
        });
    }
});

// 获取攻略版本对比
router.get('/:id/versions/compare', auth, async (req, res) => {
    try {
        const { version1, version2 } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        const [v1, v2] = await Promise.all([
            GuideHistory.findById(version1),
            GuideHistory.findById(version2)
        ]);

        if (!v1 || !v2) {
            return res.status(404).json({
                success: false,
                message: '版本不存在'
            });
        }

        // 使用差异对比算法比较内容
        const diff = require('diff').diffChars(v1.content, v2.content);

        res.json({
            success: true,
            data: {
                diff,
                v1: {
                    updatedAt: v1.createdAt,
                    updatedBy: v1.user
                },
                v2: {
                    updatedAt: v2.createdAt,
                    updatedBy: v2.user
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '版本对比失败',
            error: error.message
        });
    }
});

// 获取攻略数据分析
router.get('/:id/analytics', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看数据分析'
            });
        }

        // 获取各项统计数据
        const [viewStats, likeStats, commentStats] = await Promise.all([
            // 浏览量统计
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        'metadata.guideId': guide._id,
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // 点赞统计
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        type: 'like',
                        'metadata.guideId': guide._id,
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // 评论统计
            Comment.aggregate([
                {
                    $match: {
                        guide: guide._id,
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                viewStats,
                likeStats,
                commentStats
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取数据分析失败',
            error: error.message
        });
    }
});

// 获取攻略推荐路线
router.get('/:id/routes', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'name location coordinates');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 使用地图���务计算最优路线
        const spots = guide.destinations.map(d => ({
            id: d.spot._id,
            name: d.spot.name,
            location: d.spot.location,
            coordinates: d.spot.coordinates,
            duration: d.duration,
            dayNumber: d.dayNumber
        }));

        // 按天数分组
        const routesByDay = spots.reduce((acc, spot) => {
            const day = spot.dayNumber || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(spot);
            return acc;
        }, {});

        // 为每天的景点算最优访问顺序
        const optimizedRoutes = await Promise.all(
            Object.entries(routesByDay).map(async ([day, daySpots]) => {
                // 使用高德地图API计算路线
                const route = await locationUtil.calculateOptimalRoute(daySpots);
                return {
                    day: Number(day),
                    spots: route.spots,
                    distance: route.distance,
                    duration: route.duration,
                    polyline: route.polyline
                };
            })
        );

        res.json({
            success: true,
            data: optimizedRoutes
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取推荐路线失败',
            error: error.message
        });
    }
});

// 生成攻略封面图
router.post('/:id/cover', auth, upload.single('image'), async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权修改封面'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请上传图片'
            });
        }

        // 处理图片
        const processedImage = await imageUtil.processGuideCover(req.file.path, {
            width: 1200,
            height: 630,
            text: guide.title,
            author: req.user.nickname,
            logo: true
        });

        // 上传到OSS
        const result = await uploadUtil.uploadToOSS(processedImage, {
            folder: 'guide-covers',
            filename: `${guide._id}-${Date.now()}.jpg`
        });

        // 更新攻略封面
        guide.coverImage = result.url;
        await guide.save();

        res.json({
            success: true,
            data: {
                coverUrl: guide.coverImage
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成封面失败',
            error: error.message
        });
    }
});

// 生成攻略摘要
router.post('/:id/summary', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 使用AI生成多种类型的摘要
        const summaries = await Promise.all([
            // 短摘要 (50字以内)
            aiUtil.generateSummary(guide.content, {
                maxLength: 50,
                style: 'concise'
            }),
            // 中等摘要 (200字以内)
            aiUtil.generateSummary(guide.content, {
                maxLength: 200,
                style: 'informative'
            }),
            // 长摘要 (500字以内)
            aiUtil.generateSummary(guide.content, {
                maxLength: 500,
                style: 'detailed'
            })
        ]);

        // 提取关键词和亮点
        const analysis = await aiUtil.analyzeContent(guide.content, {
            keywords: true,
            highlights: true,
            topics: true
        });

        // 更新攻略信息
        guide.summary = summaries[1]; // 使用中等长度的摘要作为默认摘要
        guide.keywords = analysis.keywords;
        guide.highlights = analysis.highlights;
        await guide.save();

        res.json({
            success: true,
            data: {
                summaries: {
                    short: summaries[0],
                    medium: summaries[1],
                    long: summaries[2]
                },
                analysis
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成摘要失败',
            error: error.message
        });
    }
});

// 获取攻略相关问答
router.get('/:id/qa', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt'
        } = req.query;

        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        const questions = await Question.find({
            guide: guide._id,
            status: 'active'
        })
            .populate('user', 'nickname avatar')
            .populate('answers.user', 'nickname avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Question.countDocuments({
            guide: guide._id,
            status: 'active'
        });

        res.json({
            success: true,
            data: {
                questions,
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
            message: '获取问答失败',
            error: error.message
        });
    }
});

// 获取攻略推荐景点
router.get('/:id/recommended-spots', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取当前攻略中的景点类别和地区
        const currentSpots = guide.destinations.map(d => d.spot);
        const categories = [...new Set(currentSpots.map(s => s.category))];
        const regions = [...new Set(currentSpots.map(s => s.location.city))];

        // 查找相关推荐景点
        const recommendedSpots = await Spot.find({
            _id: { $nin: currentSpots.map(s => s._id) },
            $or: [
                { category: { $in: categories } },
                { 'location.city': { $in: regions } }
            ],
            status: 'active'
        })
            .sort('-rating -visitCount')
            .limit(6);

        res.json({
            success: true,
            data: recommendedSpots
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取推荐景点失败',
            error: error.message
        });
    }
});

// 获取攻略天气信息
router.get('/:id/weather', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取所有目的地的天气预报
        const weatherPromises = guide.destinations.map(async dest => {
            const weather = await weatherUtil.getForecast(dest.spot.location);
            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                weather
            };
        });

        const weatherData = await Promise.all(weatherPromises);

        // 按天数分组
        const weatherByDay = weatherData.reduce((acc, data) => {
            const day = data.dayNumber || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(data);
            return acc;
        }, {});

        res.json({
            success: true,
            data: weatherByDay
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取天气信息失败',
            error: error.message
        });
    }
});

// 生成行程日历
router.post('/:id/calendar', auth, async (req, res) => {
    try {
        const { startDate } = req.body;
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 生成日历事件
        const events = guide.destinations.map(dest => ({
            title: dest.spot.name,
            start: dateUtil.addDays(new Date(startDate), (dest.dayNumber - 1) || 0),
            duration: dest.duration,
            location: dest.spot.location,
            description: dest.description || '',
            type: 'spot'
        }));

        // 如果有其他行程安排，也添加到日历
        if (guide.schedule) {
            guide.schedule.forEach(item => {
                events.push({
                    title: item.title,
                    start: dateUtil.addDays(new Date(startDate), (item.dayNumber - 1) || 0),
                    duration: item.duration,
                    description: item.description,
                    type: item.type
                });
            });
        }

        // 生成iCal格式的日历文件
        const calendar = await calendarUtil.generateICalendar({
            title: guide.title,
            events,
            organizer: {
                name: req.user.nickname,
                email: req.user.email
            }
        });

        res.json({
            success: true,
            data: {
                events,
                icalData: calendar
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成行程日历失败',
            error: error.message
        });
    }
});

// 获取攻略费用预算
router.get('/:id/budget', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'price');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 计算各项费用
        const budget = {
            tickets: guide.destinations.reduce((sum, dest) => 
                sum + (dest.spot.price.adult || 0), 0),
            accommodation: guide.budget.accommodation || 0,
            transportation: guide.budget.transportation || 0,
            food: guide.budget.food || 0,
            other: guide.budget.other || 0
        };

        budget.total = Object.values(budget).reduce((a, b) => a + b, 0);

        // 获取人均费用范围
        const perPerson = {
            min: Math.floor(budget.total * 0.8),
            max: Math.ceil(budget.total * 1.2)
        };

        res.json({
            success: true,
            data: {
                breakdown: budget,
                perPerson,
                currency: 'CNY'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取费用预算失败',
            error: error.message
        });
    }
});

// 获取攻略交通信息
router.get('/:id/transportation', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取相邻景点间的交通信息
        const transportInfo = [];
        for (let i = 0; i < guide.destinations.length - 1; i++) {
            const from = guide.destinations[i].spot;
            const to = guide.destinations[i + 1].spot;

            // 获取多种交通方式的路线
            const routes = await locationUtil.getTransportRoutes(
                from.location.coordinates,
                to.location.coordinates,
                {
                    types: ['driving', 'transit', 'walking'],
                    alternatives: true
                }
            );

            transportInfo.push({
                from: {
                    id: from._id,
                    name: from.name,
                    location: from.location
                },
                to: {
                    id: to._id,
                    name: to.name,
                    location: to.location
                },
                routes
            });
        }

        res.json({
            success: true,
            data: transportInfo
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取交通信息失败',
            error: error.message
        });
    }
});

// 生成攻略分享卡片
router.post('/:id/share-card', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('author', 'nickname avatar')
            .populate('destinations.spot', 'name images');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 生成分享卡片图片
        const cardData = {
            title: guide.title,
            author: guide.author.nickname,
            avatar: guide.author.avatar,
            coverImage: guide.coverImage || guide.destinations[0]?.spot.images[0],
            duration: `${guide.duration.days}天${guide.duration.nights}晚`,
            spotCount: guide.destinations.length,
            qrcode: `${process.env.WEBSITE_URL}/guides/${guide._id}`
        };

        const shareCard = await imageUtil.generateShareCard(cardData, {
            template: 'guide',
            width: 800,
            height: 1000
        });

        // 上传到OSS
        const result = await uploadUtil.uploadToOSS(shareCard, {
            folder: 'share-cards',
            filename: `guide-${guide._id}-${Date.now()}.jpg`
        });

        res.json({
            success: true,
            data: {
                imageUrl: result.url
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成分享卡片失败',
            error: error.message
        });
    }
});

// 获取攻略相似度检查
router.post('/:id/similarity-check', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }

        // 查找相似攻略
        const similarGuides = await Guide.aggregate([
            {
                $match: {
                    _id: { $ne: guide._id },
                    status: 'published'
                }
            },
            {
                $addFields: {
                    similarity: {
                        $multiply: [
                            {
                                $divide: [
                                    { $size: { $setIntersection: ['$destinations.spot', guide.destinations.map(d => d.spot)] } },
                                    { $size: '$destinations.spot' }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            {
                $match: {
                    similarity: { $gt: 30 } // 相似度大于30%
                }
            },
            {
                $sort: { similarity: -1 }
            },
            {
                $limit: 5
            }
        ]);

        // 填充相似攻略的详细信息
        await Guide.populate(similarGuides, [
            { path: 'author', select: 'nickname' },
            { path: 'destinations.spot', select: 'name' }
        ]);

        res.json({
            success: true,
            data: similarGuides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '相似度检查失败',
            error: error.message
        });
    }
});

// 获取攻略餐饮推荐
router.get('/:id/restaurants', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取所有目的地周边的餐厅推荐
        const restaurantPromises = guide.destinations.map(async dest => {
            const { coordinates } = dest.spot.location;
            const restaurants = await locationUtil.searchNearby(coordinates, {
                type: 'restaurant',
                radius: 1000,  // 1公里范围内
                limit: 5,
                sort: 'rating'
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                restaurants: restaurants.map(r => ({
                    name: r.name,
                    address: r.address,
                    rating: r.rating,
                    price: r.price,
                    cuisine: r.cuisine,
                    distance: r.distance,
                    photos: r.photos,
                    openingHours: r.openingHours
                }))
            };
        });

        const restaurantData = await Promise.all(restaurantPromises);

        // 按天数分组
        const restaurantsByDay = restaurantData.reduce((acc, data) => {
            const day = data.dayNumber || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(data);
            return acc;
        }, {});

        res.json({
            success: true,
            data: restaurantsByDay
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取餐饮推荐失败',
            error: error.message
        });
    }
});

// 生成攻略行程检查清单
router.get('/:id/checklist', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 生成行程检查清单
        const checklist = {
            documents: [
                { item: '身份证', essential: true },
                { item: '信用卡', essential: true },
                { item: '景区门票', essential: true },
                { item: '酒店预订确认', essential: true }
            ],
            clothing: guide.destinations.map(dest => {
                const season = dest.spot.bestSeasons[0];
                return {
                    category: '衣物',
                    items: weatherUtil.getClothingRecommendations(season)
                };
            })[0],
            electronics: [
                { item: '手机充电器', essential: true },
                { item: '充电宝', essential: true },
                { item: '相机', essential: false },
                { item: '转换插头', essential: false }
            ],
            toiletries: [
                { item: '牙刷牙膏', essential: true },
                { item: '洗漱用品', essential: true },
                { item: '防晒霜', essential: false },
                { item: '个人药品', essential: false }
            ],
            custom: guide.checklist || []
        };

        res.json({
            success: true,
            data: checklist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成检查清单失败',
            error: error.message
        });
    }
});

// 生成攻略紧急联系信息
router.get('/:id/emergency-contacts', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取所有目的地的紧急联系信息
        const emergencyContacts = await Promise.all(
            guide.destinations.map(async dest => {
                const { city, province } = dest.spot.location;
                const contacts = await locationUtil.getEmergencyContacts(city, province);
                
                return {
                    location: `${province} ${city}`,
                    contacts: {
                        police: contacts.police,
                        hospital: contacts.hospital,
                        tourism: contacts.tourism,
                        embassy: contacts.embassy
                    }
                };
            })
        );

        // 添加通用紧急联系方式
        const generalContacts = {
            police: '110',
            ambulance: '120',
            fire: '119',
            traffic: '122'
        };

        res.json({
            success: true,
            data: {
                general: generalContacts,
                local: emergencyContacts
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取紧急联系信息失败',
            error: error.message
        });
    }
});

// 获取攻略住宿推荐
router.get('/:id/accommodations', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取每个目的地的住宿推荐
        const accommodationPromises = guide.destinations.map(async dest => {
            const { coordinates } = dest.spot.location;
            const hotels = await locationUtil.searchHotels(coordinates, {
                radius: 3000,  // 3公里范围内
                priceRange: guide.budget.accommodation,
                rating: 4,     // 4星以上
                limit: 5
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                hotels: hotels.map(h => ({
                    name: h.name,
                    type: h.type,
                    rating: h.rating,
                    price: h.price,
                    address: h.address,
                    distance: h.distance,
                    facilities: h.facilities,
                    photos: h.photos,
                    bookingUrl: h.bookingUrl
                }))
            };
        });

        const accommodationData = await Promise.all(accommodationPromises);

        // 按天数分组
        const accommodationsByDay = accommodationData.reduce((acc, data) => {
            const day = data.dayNumber || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(data);
            return acc;
        }, {});

        res.json({
            success: true,
            data: accommodationsByDay
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取住宿推荐失败',
            error: error.message
        });
    }
});

// 生成攻略语音导览
router.post('/:id/audio-guide', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 为每个景点生成语音导览
        const audioPromises = guide.destinations.map(async dest => {
            // 生成景点介绍文本
            const introText = await aiUtil.generateSpotIntroduction(dest.spot, {
                style: 'conversational',
                length: 'medium',
                includeHistory: true,
                includeTips: true
            });

            // 将文本转换为语音
            const audioFile = await ttsUtil.textToSpeech(introText, {
                language: 'zh-CN',
                voice: 'female',
                format: 'mp3'
            });

            // 上传音频文件
            const result = await uploadUtil.uploadToOSS(audioFile, {
                folder: 'audio-guides',
                filename: `spot-${dest.spot._id}-${Date.now()}.mp3`
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                audioUrl: result.url,
                duration: audioFile.duration,
                transcript: introText
            };
        });

        const audioGuides = await Promise.all(audioPromises);

        // 更新攻略的音频导览信息
        guide.audioGuides = audioGuides;
        await guide.save();

        res.json({
            success: true,
            data: audioGuides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成语音导览失败',
            error: error.message
        });
    }
});

// 获取攻略本地体验推荐
router.get('/:id/local-experiences', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取每个目的地的本地体验
        const experiencePromises = guide.destinations.map(async dest => {
            const { city } = dest.spot.location;
            const experiences = await locationUtil.searchLocalExperiences(city, {
                categories: ['culture', 'food', 'craft', 'activity'],
                limit: 5
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                experiences: experiences.map(exp => ({
                    title: exp.title,
                    category: exp.category,
                    description: exp.description,
                    duration: exp.duration,
                    price: exp.price,
                    rating: exp.rating,
                    location: exp.location,
                    photos: exp.photos,
                    bookingInfo: exp.bookingInfo,
                    hostInfo: exp.hostInfo
                }))
            };
        });

        const experienceData = await Promise.all(experiencePromises);

        res.json({
            success: true,
            data: experienceData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取本地体验推荐失败',
            error: error.message
        });
    }
});

// 获取攻略交通卡信息
router.get('/:id/transport-cards', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取所有目的地城市的交通卡信息
        const cities = [...new Set(
            guide.destinations.map(dest => dest.spot.location.city)
        )];

        const transportCards = await Promise.all(
            cities.map(async city => {
                const cardInfo = await locationUtil.getTransportCardInfo(city);
                return {
                    city,
                    cards: cardInfo.map(card => ({
                        name: card.name,
                        type: card.type,
                        coverage: card.coverage,
                        price: card.price,
                        validity: card.validity,
                        purchaseLocations: card.purchaseLocations,
                        rechargeLocations: card.rechargeLocations,
                        supportedTransport: card.supportedTransport,
                        notes: card.notes
                    }))
                };
            })
        );

        res.json({
            success: true,
            data: transportCards
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取交通卡信息失败',
            error: error.message
        });
    }
});

// 生成攻略时间线
router.get('/:id/timeline', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot')
            .populate('author', 'nickname avatar');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 构建时间线数据
        const timeline = [];

        // 添加创建事件
        timeline.push({
            type: 'create',
            date: guide.createdAt,
            user: guide.author,
            content: `创建了攻略《${guide.title}》`
        });

        // 添加修改历史
        const history = await GuideHistory.find({ guide: guide._id })
            .populate('user', 'nickname avatar')
            .sort('createdAt');

        history.forEach(record => {
            timeline.push({
                type: 'update',
                date: record.createdAt,
                user: record.user,
                content: `更新了${record.updatedFields.join('、')}`
            });
        });

        // 添加评论事件
        const comments = await Comment.find({ guide: guide._id })
            .populate('user', 'nickname avatar')
            .sort('createdAt');

        comments.forEach(comment => {
            timeline.push({
                type: 'comment',
                date: comment.createdAt,
                user: comment.user,
                content: comment.content
            });
        });

        // 按时间排序
        timeline.sort((a, b) => b.date - a.date);

        res.json({
            success: true,
            data: timeline
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取时间线失败',
            error: error.message
        });
    }
});

// 生成攻略打印版本
router.get('/:id/print-version', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot')
            .populate('author', 'nickname');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 生成打印版本内容
        const printVersion = {
            title: guide.title,
            author: guide.author.nickname,
            createdAt: guide.createdAt,
            summary: guide.summary,
            itinerary: guide.destinations.map(dest => ({
                day: dest.dayNumber,
                spot: {
                    name: dest.spot.name,
                    address: dest.spot.location.address,
                    openingHours: dest.spot.openingHours,
                    ticketInfo: dest.spot.price
                },
                duration: dest.duration,
                description: dest.description,
                tips: dest.tips
            })),
            transportation: guide.transportation,
            accommodation: guide.accommodation,
            budget: guide.budget,
            tips: guide.tips,
            emergencyContacts: guide.emergencyContacts
        };

        res.json({
            success: true,
            data: printVersion
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成打印版本失败',
            error: error.message
        });
    }
});

// 获取攻略评分分析
router.get('/:id/rating-analysis', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取评分统计
        const ratings = await Review.aggregate([
            {
                $match: { guide: guide._id }
            },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                    reviews: { $push: '$$ROOT' }
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);

        // 计算评分分布
        const distribution = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };
        
        let totalRatings = 0;
        let totalScore = 0;

        ratings.forEach(r => {
            distribution[r._id] = r.count;
            totalRatings += r.count;
            totalScore += r._id * r.count;
        });

        // 分析评价关键词
        const reviews = ratings.flatMap(r => r.reviews);
        const keywords = await aiUtil.analyzeReviewKeywords(reviews, {
            positive: true,
            negative: true,
            limit: 10
        });

        res.json({
            success: true,
            data: {
                averageRating: totalRatings ? (totalScore / totalRatings).toFixed(1) : 0,
                totalRatings,
                distribution,
                keywords
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取评分分析失败',
            error: error.message
        });
    }
});

// 生成攻略二维码
router.get('/:id/qrcode', async (req, res) => {
    try {
        const { size = 300, logo = true } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻��不存在'
            });
        }

        // 生成二维码
        const qrcode = await qrcodeUtil.generate({
            content: `${process.env.WEBSITE_URL}/guides/${guide._id}`,
            size: Number(size),
            logo: logo === 'true' ? 'logo.png' : null,
            foreground: '#000000',
            background: '#FFFFFF'
        });

        res.json({
            success: true,
            data: {
                qrcodeBase64: qrcode
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成二维码失败',
            error: error.message
        });
    }
});

// 获取攻略访问统计
router.get('/:id/visit-stats', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看访问统计'
            });
        }

        // 获取访问统计数据
        const stats = await Log.aggregate([
            {
                $match: {
                    module: 'guide',
                    'metadata.guideId': guide._id,
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    pv: { $sum: 1 },
                    uv: { $addToSet: '$metadata.userId' }
                }
            },
            {
                $project: {
                    date: '$_id',
                    pv: 1,
                    uv: { $size: '$uv' }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获��访问统计失败',
            error: error.message
        });
    }
});

// 获取��略收藏用户列表
router.get('/:id/favorite-users', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 查找收藏此攻略的用户
        const users = await User.find({
            favoriteGuides: guide._id
        })
            .select('nickname avatar bio')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments({
            favoriteGuides: guide._id
        });

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
            message: '获取收藏用户列表失败',
            error: error.message
        });
    }
});

// 生成攻略海报
router.post('/:id/poster', auth, async (req, res) => {
    try {
        const { template = 'default' } = req.body;
        const guide = await Guide.findById(req.params.id)
            .populate('author', 'nickname avatar')
            .populate('destinations.spot', 'name images');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 准备海报数据
        const posterData = {
            title: guide.title,
            author: {
                name: guide.author.nickname,
                avatar: guide.author.avatar
            },
            cover: guide.coverImage || guide.destinations[0]?.spot.images[0],
            duration: `${guide.duration.days}天${guide.duration.nights}晚`,
            destinations: guide.destinations.map(d => ({
                name: d.spot.name,
                image: d.spot.images[0]
            })).slice(0, 4),
            rating: guide.rating,
            viewCount: guide.viewCount,
            qrcode: await qrcodeUtil.generate({
                content: `${process.env.WEBSITE_URL}/guides/${guide._id}`,
                size: 200,
                format: 'png'
            })
        };

        // 生成海报
        const poster = await imageUtil.generatePoster(posterData, {
            template,
            width: 1080,
            height: 1920,
            format: 'jpg'
        });

        // 上传海报
        const result = await uploadUtil.uploadToOSS(poster, {
            folder: 'posters',
            filename: `guide-${guide._id}-${Date.now()}.jpg`
        });

        res.json({
            success: true,
            data: {
                posterUrl: result.url
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成海报失败',
            error: error.message
        });
    }
});

// 获取攻略推荐购物地点
router.get('/:id/shopping', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取每个目的地的购物推荐
        const shoppingPromises = guide.destinations.map(async dest => {
            const { coordinates } = dest.spot.location;
            const places = await locationUtil.searchNearby(coordinates, {
                type: 'shopping',
                radius: 2000,  // 2公里范围内
                categories: ['mall', 'market', 'souvenir'],
                limit: 5
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                places: places.map(p => ({
                    name: p.name,
                    type: p.type,
                    address: p.address,
                    distance: p.distance,
                    rating: p.rating,
                    openingHours: p.openingHours,
                    photos: p.photos,
                    specialties: p.specialties,
                    priceLevel: p.priceLevel
                }))
            };
        });

        const shoppingData = await Promise.all(shoppingPromises);

        res.json({
            success: true,
            data: shoppingData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取购物推荐失败',
            error: error.message
        });
    }
});

// 获取攻略相关活动
router.get('/:id/events', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 获取每个目的地的相关活动
        const eventPromises = guide.destinations.map(async dest => {
            const { city } = dest.spot.location;
            const events = await locationUtil.searchEvents(city, {
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 未来30天
                categories: ['festival', 'exhibition', 'performance', 'sports'],
                limit: 5
            });

            return {
                spotId: dest.spot._id,
                spotName: dest.spot.name,
                dayNumber: dest.dayNumber,
                events: events.map(e => ({
                    title: e.title,
                    category: e.category,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    venue: e.venue,
                    description: e.description,
                    price: e.price,
                    poster: e.poster,
                    ticketUrl: e.ticketUrl
                }))
            };
        });

        const eventData = await Promise.all(eventPromises);

        res.json({
            success: true,
            data: eventData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取相关活动失败',
            error: error.message
        });
    }
});

// 获取攻略交通预订建议
router.get('/:id/transport-booking', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'location');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 分析行程路线并提供交通建议
        const destinations = guide.destinations;
        const transportSuggestions = [];

        for (let i = 0; i < destinations.length - 1; i++) {
            const from = destinations[i].spot.location;
            const to = destinations[i + 1].spot.location;
            
            // 获取不同交通方式的建议
            const suggestions = await transportUtil.getTransportSuggestions(
                from,
                to,
                {
                    date: new Date(), // 这里应该根据实际行程日期计算
                    preferences: {
                        speed: 'balanced',
                        cost: 'balanced',
                        comfort: 'balanced'
                    }
                }
            );

            transportSuggestions.push({
                from: {
                    name: destinations[i].spot.name,
                    location: from
                },
                to: {
                    name: destinations[i + 1].spot.name,
                    location: to
                },
                suggestions
            });
        }

        res.json({
            success: true,
            data: transportSuggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取交通预订建议失败',
            error: error.message
        });
    }
});

// 获取攻略景点开放时间建议
router.get('/:id/visiting-time', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'name openingHours peakHours visitDuration');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 分析每个景点的最佳游览时间
        const visitingTimeAnalysis = guide.destinations.map(dest => {
            const spot = dest.spot;
            
            // 分析最佳游览时段
            const bestVisitingTime = timeUtil.analyzeBestVisitingTime({
                openingHours: spot.openingHours,
                peakHours: spot.peakHours,
                visitDuration: spot.visitDuration,
                season: dateUtil.getCurrentSeason()
            });

            return {
                spotId: spot._id,
                spotName: spot.name,
                dayNumber: dest.dayNumber,
                openingHours: spot.openingHours,
                recommendedTime: bestVisitingTime.recommendedTime,
                avoidTime: bestVisitingTime.avoidTime,
                estimatedDuration: bestVisitingTime.estimatedDuration,
                tips: bestVisitingTime.tips
            };
        });

        // 生成每日行程时间安排建议
        const dailySchedule = timeUtil.generateDailySchedule(visitingTimeAnalysis);

        res.json({
            success: true,
            data: {
                visitingTimeAnalysis,
                dailySchedule
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取游览时间建议失败',
            error: error.message
        });
    }
});

// 生成攻略行程优化建议
router.post('/:id/optimize', auth, async (req, res) => {
    try {
        const { preferences } = req.body;
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 基于不同因素优化行程
        const optimization = await routeUtil.optimizeItinerary(guide.destinations, {
            preferences: preferences || {
                timeEfficiency: 0.5,
                costSaving: 0.3,
                experienceQuality: 0.2
            },
            constraints: {
                maxDailyHours: 8,
                maxTransitTime: 120, // 单位：分钟
                budgetLimit: guide.budget.total
            }
        });

        // 生成优化建议
        const suggestions = {
            routeChanges: optimization.routeChanges,
            timeAdjustments: optimization.timeAdjustments,
            costSavings: optimization.costSavings,
            qualityImprovements: optimization.qualityImprovements
        };

        // 保存优化历史
        await GuideOptimization.create({
            guide: guide._id,
            user: req.user.userId,
            preferences,
            suggestions,
            appliedChanges: false
        });

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成优化建议失败',
            error: error.message
        });
    }
});

// 获取攻略特色标签
router.get('/:id/tags', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 分析攻略内容生成标签
        const contentTags = await aiUtil.analyzeContentTags(guide.content, {
            maxTags: 5,
            categories: ['theme', 'style', 'feature']
        });

        // 分析景点特色生成标签
        const spotTags = guide.destinations.reduce((tags, dest) => {
            const spot = dest.spot;
            return [...tags, ...spot.tags || []];
        }, []);

        // 统计标签频率
        const tagFrequency = [...contentTags, ...spotTags].reduce((freq, tag) => {
            freq[tag] = (freq[tag] || 0) + 1;
            return freq;
        }, {});

        // 选择最具代表性的标签
        const representativeTags = Object.entries(tagFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);

        res.json({
            success: true,
            data: {
                contentTags,
                spotTags,
                representativeTags
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取特色标签失败',
            error: error.message
        });
    }
});

// 获取攻略照片墙
router.get('/:id/photo-wall', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot', 'images')
            .populate({
                path: 'reviews',
                select: 'images',
                match: { status: 'approved' }
            });

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 收集所有相关图片
        const photos = {
            // 景点官方图片
            official: guide.destinations.flatMap(dest => 
                dest.spot.images.map(img => ({
                    url: img,
                    type: 'official',
                    spotName: dest.spot.name
                }))
            ),
            // 用户评价图片
            reviews: guide.reviews.flatMap(review => 
                review.images.map(img => ({
                    url: img.url,
                    type: 'review',
                    author: review.user,
                    date: review.createdAt
                }))
            )
        };

        // 对图片进行分类和排序
        const categorizedPhotos = {
            scenery: photos.official.filter(p => p.type === 'official'),
            food: photos.reviews.filter(p => p.tags?.includes('food')),
            people: photos.reviews.filter(p => p.tags?.includes('people')),
            architecture: photos.official.filter(p => p.tags?.includes('architecture')),
            nature: photos.official.filter(p => p.tags?.includes('nature'))
        };

        res.json({
            success: true,
            data: {
                all: [...photos.official, ...photos.reviews],
                categorized: categorizedPhotos
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取照片墙失败',
            error: error.message
        });
    }
});

// 获取攻略月度统计
router.get('/:id/monthly-stats', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看统计数据'
            });
        }

        // 获取指定月份的统计数据
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const stats = await Promise.all([
            // 访问量统计
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        'metadata.guideId': guide._id,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfMonth: '$createdAt' },
                        views: { $sum: 1 }
                    }
                }
            ]),
            // 收藏统计
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        type: 'favorite',
                        'metadata.guideId': guide._id,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfMonth: '$createdAt' },
                        favorites: { $sum: 1 }
                    }
                }
            ]),
            // 分享统计
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        type: 'share',
                        'metadata.guideId': guide._id,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfMonth: '$createdAt' },
                        shares: { $sum: 1 }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                year,
                month,
                dailyStats: stats[0],
                favoriteStats: stats[1],
                shareStats: stats[2]
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取月度统计失败',
            error: error.message
        });
    }
});

// 获取攻略相似推荐
router.get('/:id/similar', async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id)
            .populate('destinations.spot');

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 基于多个维度计算相似度
        const similarGuides = await Guide.aggregate([
            {
                $match: {
                    _id: { $ne: guide._id },
                    status: 'published'
                }
            },
            {
                $lookup: {
                    from: 'spots',
                    localField: 'destinations.spot',
                    foreignField: '_id',
                    as: 'spotDetails'
                }
            },
            {
                $addFields: {
                    // 目的地相似度
                    destinationSimilarity: {
                        $multiply: [
                            {
                                $divide: [
                                    { $size: { $setIntersection: ['$destinations.spot', guide.destinations.map(d => d.spot._id)] } },
                                    { $size: '$destinations.spot' }
                                ]
                            },
                            0.4 // 权重
                        ]
                    },
                    // 行程天数相似度
                    durationSimilarity: {
                        $multiply: [
                            {
                                $subtract: [
                                    1,
                                    { 
                                        $abs: { 
                                            $divide: [
                                                { $subtract: ['$duration.days', guide.duration.days] },
                                                { $max: ['$duration.days', guide.duration.days] }
                                            ]
                                        }
                                    }
                                ]
                            },
                            0.3 // 权重
                        ]
                    },
                    // 预算相似度
                    budgetSimilarity: {
                        $multiply: [
                            {
                                $subtract: [
                                    1,
                                    {
                                        $abs: {
                                            $divide: [
                                                { $subtract: ['$budget.total', guide.budget.total] },
                                                { $max: ['$budget.total', guide.budget.total] }
                                            ]
                                        }
                                    }
                                ]
                            },
                            0.3 // 权重
                        ]
                    }
                }
            },
            {
                $addFields: {
                    totalSimilarity: {
                        $add: ['$destinationSimilarity', '$durationSimilarity', '$budgetSimilarity']
                    }
                }
            },
            {
                $match: {
                    totalSimilarity: { $gt: 0.5 } // 相似度阈值
                }
            },
            {
                $sort: { totalSimilarity: -1 }
            },
            {
                $limit: 6
            }
        ]);

        // 填充作者信息
        await Guide.populate(similarGuides, {
            path: 'author',
            select: 'nickname avatar'
        });

        res.json({
            success: true,
            data: similarGuides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取相似推荐失败',
            error: error.message
        });
    }
});

// 获取攻略用户行为分析
router.get('/:id/user-behavior', auth, async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);

        if (!guide) {
            return res.status(404).json({
                success: false,
                message: '攻略不存在'
            });
        }

        // 检查权限
        if (guide.author.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权查看行为分析'
            });
        }

        // 获取用户行为数据
        const [viewData, readingData, interactionData] = await Promise.all([
            // 浏览行为分析
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        'metadata.guideId': guide._id
                    }
                },
                {
                    $group: {
                        _id: {
                            hour: { $hour: '$createdAt' },
                            userAgent: '$userAgent'
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 阅读行为分析
            Log.aggregate([
                {
                    $match: {
                        module: 'guide',
                        type: 'read',
                        'metadata.guideId': guide._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgReadTime: { $avg: '$metadata.readTime' },
                        totalReads: { $sum: 1 },
                        completionRate: {
                            $avg: {
                                $cond: [
                                    { $gt: ['$metadata.readProgress', 0.8] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            // 互动行为分析
            {
                likes: await Log.countDocuments({
                    module: 'guide',
                    type: 'like',
                    'metadata.guideId': guide._id
                }),
                comments: await Comment.countDocuments({
                    guide: guide._id
                }),
                shares: await Log.countDocuments({
                    module: 'guide',
                    type: 'share',
                    'metadata.guideId': guide._id
                }),
                saves: await Log.countDocuments({
                    module: 'guide',
                    type: 'save',
                    'metadata.guideId': guide._id
                })
            }
        ]);

        // 处理和分析数据
        const analysis = {
            viewPattern: {
                peakHours: viewData
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(d => d._id.hour),
                deviceDistribution: viewData.reduce((acc, cur) => {
                    const device = cur._id.userAgent.includes('Mobile') ? 'mobile' : 'desktop';
                    acc[device] = (acc[device] || 0) + cur.count;
                    return acc;
                }, {})
            },
            readingBehavior: {
                averageReadTime: Math.round(readingData[0]?.avgReadTime || 0),
                totalReads: readingData[0]?.totalReads || 0,
                completionRate: Math.round((readingData[0]?.completionRate || 0) * 100)
            },
            interactionMetrics: {
                ...interactionData,
                engagementRate: (
                    (interactionData.likes + interactionData.comments * 2 + 
                     interactionData.shares * 3 + interactionData.saves * 2) /
                    (readingData[0]?.totalReads || 1)
                ).toFixed(2)
            }
        };

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取用户行为分析失败',
            error: error.message
        });
    }
});

// 获取热门推荐
router.get('/featured/popular', cache({ expire: 1800 }), async (req, res) => {
    try {
        const guides = await Guide.find({ status: 'published' })
            .populate('author', 'nickname avatar')
            .populate('destinations.spot', 'name location images')
            .sort('-viewCount -rating')
            .limit(6);

        res.json({
            success: true,
            data: guides
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取热门推荐失败',
            error: error.message
        });
    }
});

// 获取当季推荐
router.get('/featured/season', cache({ expire: 3600 }), async (req, res) => {
    try {
        // 获取当前季节
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentMonth = new Date().getMonth();
        const currentSeason = seasons[Math.floor(currentMonth / 3)];

        const guides = await Guide.find({
            status: 'published',
            bestSeasons: currentSeason
        })
            .populate('author', 'nickname avatar')
            .populate('destinations.spot', 'name location images')
            .sort('-rating -viewCount')
            .limit(6);

        // 获取季节相关信息
        const seasonInfo = {
            spring: {
                title: '春季精选',
                description: '踏青赏花，感受春天的气息',
                background: 'spring-banner.jpg'
            },
            summer: {
                title: '夏季精选',
                description: '避暑胜地，清凉一夏',
                background: 'summer-banner.jpg'
            },
            autumn: {
                title: '秋季精选',
                description: '层林尽染，秋高气爽',
                background: 'autumn-banner.jpg'
            },
            winter: {
                title: '冬季精选',
                description: '冰雪世界，温泉胜地',
                background: 'winter-banner.jpg'
            }
        };

        res.json({
            success: true,
            data: {
                guides,
                season: {
                    current: currentSeason,
                    ...seasonInfo[currentSeason]
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取当季推荐失败',
            error: error.message
        });
    }
});

// 获取主题推荐
router.get('/featured/theme', cache({ expire: 3600 }), async (req, res) => {
    try {
        const { theme = 'culture' } = req.query;

        // 并行获取数据
        const [guides, themeStats] = await Promise.all([
            Guide.find({
            status: 'published',
            category: theme
        })
            .populate('author', 'nickname avatar')
            .populate('destinations.spot', 'name location images')
            .sort('-rating -viewCount')
                .limit(6),

            Guide.aggregate([
            {
                $match: {
                    status: 'published',
                    category: theme
                }
            },
            {
                $group: {
                    _id: null,
                    totalGuides: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    totalViews: { $sum: '$viewCount' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                guides,
                stats: themeStats[0] || {
                    totalGuides: 0,
                    avgRating: 0,
                    totalViews: 0
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取主题推荐失败',
            error: error.message
        });
    }
});

// 获取主题分类统计
router.get('/theme/stats', cache({ expire: 7200 }), async (req, res) => {
    try {
        const stats = await Guide.aggregate([
            {
                $match: { status: 'published' }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取主题统计失败',
            error: error.message
        });
    }
});

// 获取攻略收藏排行
router.get('/top-favorites', cache({ expire: 3600 }), async (req, res) => {
    try {
        const guides = await Guide.find({ status: 'published' })
            .populate('author', 'nickname avatar')
            .sort('-favoriteCount -viewCount')
            .limit(10);

        res.json({
            success: true,
            data: guides
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取收藏排行失败',
            error: error.message
        });
    }
});

// 获取作者排行
router.get('/top-authors', cache({ expire: 3600 }), async (req, res) => {
    try {
        const authors = await Guide.aggregate([
            {
                $match: { status: 'published' }
            },
            {
                $group: {
                    _id: '$author',
                    guideCount: { $sum: 1 },
                    totalViews: { $sum: '$viewCount' },
                    avgRating: { $avg: '$rating' }
                }
            },
            {
                $sort: { guideCount: -1, totalViews: -1 }
            },
            {
                $limit: 10
            }
        ]);

        // 填充作者信息
        await User.populate(authors, {
            path: '_id',
            select: 'nickname avatar bio'
        });

        res.json({
            success: true,
            data: authors.map(author => ({
                user: author._id,
                guideCount: author.guideCount,
                totalViews: author.totalViews,
                avgRating: author.avgRating
            }))
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取作者排行失败',
            error: error.message
        });
    }
});

// 获取用户体验分享
router.get('/user-experiences', cache({ expire: 3600 }), async (req, res) => {
    try {
        const experiences = await Review.find({ 
            status: 'approved',
            rating: { $gte: 4 },
            images: { $exists: true, $ne: [] }
        })
            .populate('user', 'nickname avatar bio')
            .populate('spot', 'name location images')
            .sort('-likeCount -createdAt')
            .limit(6);

        res.json({
            success: true,
            data: experiences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取用户体验失败',
            error: error.message
        });
    }
});

module.exports = router; 