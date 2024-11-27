const helmet = require('helmet');
const csrf = require('csurf');
const { rateLimit } = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// 基本安全中间件配置
exports.basicSecurity = [
    // 使用 helmet 设置各种 HTTP 头
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', 'blob:', '*.alicdn.com'],
                connectSrc: ["'self'", process.env.API_URL],
                fontSrc: ["'self'", 'data:', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }),

    // 防止 MongoDB 注入
    mongoSanitize({
        replaceWith: '_'
    }),

    // 防止 XSS 攻击
    xss(),

    // 防止 HTTP 参数污染
    hpp()
];

// CSRF 保护中间件
exports.csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// CSRF Token 中间件
exports.csrfToken = (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
};

// SQL 注入防护中间件
exports.sqlInjectionProtection = (req, res, next) => {
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|WHERE)\b|\-\-|;)/i;
    
    const checkForSQLInjection = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string' && sqlPattern.test(obj[key])) {
                return true;
            } else if (typeof obj[key] === 'object') {
                return checkForSQLInjection(obj[key]);
            }
        }
        return false;
    };

    if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query)) {
        return res.status(403).json({
            success: false,
            message: '检测到潜在的SQL注入攻击'
        });
    }

    next();
};

// 文件上传安全中间件
exports.uploadSecurity = (req, res, next) => {
    // 检查文件类型白名单
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (req.file && !allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            message: '不支持的文件类型'
        });
    }

    // 检查文件大小
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file && req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            message: '文件大小超出限制'
        });
    }

    next();
};

// API 密钥验证中间件
exports.apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: '缺少 API 密钥'
        });
    }

    // 验证 API 密钥
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            success: false,
            message: '无效的 API 密钥'
        });
    }

    next();
};

// 请求来源验证中间件
exports.refererCheck = (req, res, next) => {
    const referer = req.headers.referer || req.headers.referrer;
    const allowedDomains = [
        process.env.FRONTEND_URL,
        'localhost',
        process.env.DOMAIN
    ];

    if (referer) {
        const refererUrl = new URL(referer);
        if (!allowedDomains.some(domain => refererUrl.hostname.includes(domain))) {
            return res.status(403).json({
                success: false,
                message: '非法的请求来源'
            });
        }
    }

    next();
};

// 错误处理中间件
exports.securityErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'CSRF 令牌无效'
        });
    }

    next(err);
}; 