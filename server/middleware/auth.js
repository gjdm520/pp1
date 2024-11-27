const jwt = require('jsonwebtoken');
const User = require('../models/user');

// 认证中间件
exports.auth = async (req, res, next) => {
    try {
        // 获取token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }

        // 验证token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 查找用户
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 将用户信息添加到请求对象
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '登录已过期，请重新登录'
            });
        }

        res.status(401).json({
            success: false,
            message: '认证失败',
            error: error.message
        });
    }
};

// 管理员权限中间件
exports.admin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '需要管理员权限'
            });
        }

        next();

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '权限验证失败',
            error: error.message
        });
    }
};

// 商家权限中间件
exports.business = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (user.role !== 'business' && user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '需要商家权限'
            });
        }

        next();

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '权限验证失败',
            error: error.message
        });
    }
};

// 访问频率限制中间件
exports.rateLimit = (limit, minutes) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const userRequests = requests.get(ip) || [];

        // 清理过期请求
        const validRequests = userRequests.filter(time => now - time < minutes * 60 * 1000);
        
        if (validRequests.length >= limit) {
            return res.status(429).json({
                success: false,
                message: '请求过于频繁，请稍后再试'
            });
        }

        validRequests.push(now);
        requests.set(ip, validRequests);

        next();
    };
};

// 日志中间件
exports.logger = async (req, res, next) => {
    const start = Date.now();

    res.on('finish', async () => {
        const duration = Date.now() - start;

        try {
            await Log.create({
                level: 'info',
                module: 'api',
                message: `${req.method} ${req.path}`,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime: duration,
                user: req.user?.userId
            });
        } catch (error) {
            console.error('日志记录失败:', error);
        }
    });

    next();
}; 