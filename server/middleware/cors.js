const cors = require('cors');

// CORS配置选项
const corsOptions = {
    // 允许的来源列表
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:8080'
        ];
        
        // 允许没有origin的请求（比如移动端APP）
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('不允许的跨域请求'));
        }
    },

    // 允许的请求方法
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // 允许的请求头
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token'
    ],

    // 允许发送凭证
    credentials: true,

    // 预检请求的缓存时间（秒）
    maxAge: 86400,

    // 是否公开自定义响应头
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// 创建CORS中间件
const corsMiddleware = cors(corsOptions);

// 预检请求处理中间件
const preflightHandler = (req, res, next) => {
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        // 设置预检响应头
        res.header('Access-Control-Max-Age', '86400');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token'
        );
        return res.status(204).end();
    }
    next();
};

// 动态CORS配置中间件
const dynamicCors = (options = {}) => {
    const defaultOptions = {
        ...corsOptions,
        ...options
    };

    return (req, res, next) => {
        // 动态设置允许的域名
        const requestOrigin = req.header('Origin');
        if (options.whitelist && Array.isArray(options.whitelist)) {
            if (options.whitelist.includes(requestOrigin)) {
                res.header('Access-Control-Allow-Origin', requestOrigin);
            }
        }

        // 设置其他CORS头
        res.header('Access-Control-Allow-Credentials', defaultOptions.credentials);
        res.header('Access-Control-Allow-Methods', defaultOptions.methods.join(', '));
        res.header('Access-Control-Allow-Headers', defaultOptions.allowedHeaders.join(', '));
        res.header('Access-Control-Expose-Headers', defaultOptions.exposedHeaders.join(', '));

        // 处理预检请求
        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Max-Age', defaultOptions.maxAge);
            return res.status(204).end();
        }

        next();
    };
};

// 错误处理中间件
const corsErrorHandler = (err, req, res, next) => {
    if (err.message === '不允许的跨域请求') {
        return res.status(403).json({
            success: false,
            message: '不允许的跨域请求'
        });
    }
    next(err);
};

// 安全头部中间件
const securityHeaders = (req, res, next) => {
    // 设置安全相关的响应头
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 如果是HTTPS请求，设置HSTS
    if (req.secure) {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
};

module.exports = {
    corsMiddleware,
    preflightHandler,
    dynamicCors,
    corsErrorHandler,
    securityHeaders,
    // 导出配置供其他模块使用
    corsOptions
}; 