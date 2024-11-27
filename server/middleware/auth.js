const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const response = require('../utils/response');
const User = require('../models/user');
const Token = require('../models/token');
const logger = require('../utils/logger');

// 验证JWT令牌
exports.verifyToken = async (req, res, next) => {
    try {
        // 从请求头获取token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return response.unauthorized(res);
        }

        // 验证token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // 检查token是否在黑名单中
        const isBlacklisted = await Token.exists({
            token,
            type: 'blacklist'
        });

        if (isBlacklisted) {
            return response.unauthorized(res, 'token已失效');
        }

        // 获取用户信息
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return response.unauthorized(res, '用户不存在');
        }

        // 将用户信息添加到请求对象
        req.user = user;
        req.token = token;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return response.unauthorized(res, '无效的token');
        }
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'token已过期');
        }
        next(error);
    }
};

// 检查用户角色
exports.checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return response.unauthorized(res);
        }

        if (!roles.includes(req.user.role)) {
            return response.forbidden(res);
        }

        next();
    };
};

// 检查资源所有权
exports.checkOwnership = (modelName) => {
    return async (req, res, next) => {
        try {
            const Model = require(`../models/${modelName}`);
            const resource = await Model.findById(req.params.id);

            if (!resource) {
                return response.notFound(res);
            }

            if (resource.user?.toString() !== req.user._id.toString()) {
                return response.forbidden(res);
            }

            req.resource = resource;
            next();

        } catch (error) {
            next(error);
        }
    };
};

// 限制访问频率
exports.rateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15分钟
        max = 100, // 最大请求数
        message = '请求过于频繁，请稍后再试'
    } = options;

    const cache = require('../utils/cache');
    const CACHE_PREFIX = 'rateLimit:';

    return async (req, res, next) => {
        const key = `${CACHE_PREFIX}${req.ip}`;

        try {
            // 获取当前时间窗口的请求次数
            let current = await cache.get(key) || 0;

            if (current >= max) {
                return response.error(res, message, 429);
            }

            // 增加请求次数
            await cache.set(key, current + 1, Math.ceil(windowMs / 1000));
            next();

        } catch (error) {
            logger.error('访问频率限制检查失败:', error);
            next();
        }
    };
};

// 记录用户活动
exports.trackActivity = async (req, res, next) => {
    if (req.user) {
        try {
            await User.findByIdAndUpdate(req.user._id, {
                lastActiveAt: new Date(),
                lastIp: req.ip
            });
        } catch (error) {
            logger.error('记录用户活动失败:', error);
        }
    }
    next();
};

// 检查用户状态
exports.checkUserStatus = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    if (req.user.status === 'banned') {
        return response.forbidden(res, '账号已被禁用');
    }

    if (req.user.status === 'inactive') {
        return response.forbidden(res, '请先激活账号');
    }

    next();
};

// 刷新令牌
exports.refreshToken = async (req, res, next) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return response.unauthorized(res, '请提供刷新令牌');
    }

    try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return response.unauthorized(res, '用户不存在');
        }

        // 生成新的访问令牌
        const accessToken = jwt.sign(
            { userId: user._id },
            config.jwt.secret,
            { expiresIn: config.jwt.accessExpire }
        );

        res.json({
            success: true,
            data: { accessToken }
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, '刷新令牌已过期');
        }
        next(error);
    }
}; 