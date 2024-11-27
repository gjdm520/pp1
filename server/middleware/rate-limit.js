const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../utils/cache').redis;
const Log = require('../models/log');

// 创建限流存储
const createLimiterStore = () => {
    if (process.env.NODE_ENV === 'production') {
        return new RedisStore({
            prefix: 'rate-limit:',
            client: redis
        });
    }
    return undefined; // 开发环境使用内存存储
};

// 通用限流中间件
exports.generalLimiter = rateLimit({
    store: createLimiterStore(),
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 100次请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    handler: async (req, res, next, options) => {
        // 记录限流日志
        await Log.create({
            level: 'warn',
            module: 'rate-limit',
            message: '请求频率超限',
            ip: req.ip,
            path: req.path,
            method: req.method,
            user: req.user?.id
        });
        res.status(429).json(options.message);
    }
});

// API限流中间件
exports.apiLimiter = rateLimit({
    store: createLimiterStore(),
    windowMs: 60 * 1000, // 1分钟
    max: 60, // 限制每个IP每分钟60次请求
    message: {
        success: false,
        message: 'API请求过于频繁，请稍后再试'
    }
});

// 登录限流中间件
exports.loginLimiter = rateLimit({
    store: createLimiterStore(),
    windowMs: 60 * 60 * 1000, // 1小时
    max: 5, // 限制每个IP每小时5次失败尝试
    skipSuccessfulRequests: true, // 成功的请求不计入限制
    message: {
        success: false,
        message: '登录失败次数过多，请1小时后再试'
    }
});

// 验证码限流中间件
exports.verifyCodeLimiter = rateLimit({
    store: createLimiterStore(),
    windowMs: 60 * 1000, // 1分钟
    max: 1, // 限制每个IP每分钟1次请求
    message: {
        success: false,
        message: '验证码发送过于频繁，请稍后再试'
    }
});

// 上传限流中间件
exports.uploadLimiter = rateLimit({
    store: createLimiterStore(),
    windowMs: 60 * 60 * 1000, // 1小时
    max: 30, // 限制每个IP每小时30次上传
    message: {
        success: false,
        message: '上传次数过多，请稍后再试'
    }
});

// 动态限流中间件生成器
exports.createDynamicLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000, // 默认1分钟
        max = 30,            // 默认30次
        message = '请求过于频繁，请稍后再试',
        keyGenerator = (req) => req.ip // 默认使用IP作为键
    } = options;

    return rateLimit({
        store: createLimiterStore(),
        windowMs,
        max,
        keyGenerator,
        message: {
            success: false,
            message
        },
        skip: (req) => {
            // 可以根据需要跳过某些请求的限流
            return req.user?.role === 'admin';
        }
    });
};

// IP黑名单中间件
exports.blacklistMiddleware = async (req, res, next) => {
    const blacklist = await redis.smembers('ip:blacklist');
    if (blacklist.includes(req.ip)) {
        return res.status(403).json({
            success: false,
            message: '您的IP已被封禁'
        });
    }
    next();
};

// 导出限流配置
exports.rateLimitConfig = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    }
}; 