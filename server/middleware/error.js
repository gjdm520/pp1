const Log = require('../models/log');

// 错误处理中间件
exports.errorHandler = async (err, req, res, next) => {
    // 记录错误日志
    try {
        await Log.error(err, {
            module: 'api',
            path: req.path,
            method: req.method,
            ip: req.ip,
            user: req.user?.userId
        });
    } catch (logError) {
        console.error('日志记录失败:', logError);
    }

    // 处理常见错误类型
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: '数据验证失败',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: '无效的ID格式'
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: '数据重复'
        });
    }

    // 开发环境返回详细错误信息
    const error = process.env.NODE_ENV === 'development' ? {
        message: err.message,
        stack: err.stack,
        ...err
    } : {
        message: '服务器内部错误'
    };

    res.status(err.status || 500).json({
        success: false,
        ...error
    });
};

// 404错误处理
exports.notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在'
    });
};

// 异步错误处理包装器
exports.asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 请求参数验证中间件
exports.validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: '参数验证失败',
                errors: error.details.map(detail => detail.message)
            });
        }
        next();
    };
};

// 响应格式化中间件
exports.formatResponse = (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
        // 如果已经是标准格式就直接返回
        if (data && (data.success !== undefined)) {
            return originalJson.call(this, data);
        }

        // 包装成标准格式
        return originalJson.call(this, {
            success: true,
            data
        });
    };
    next();
};

// 请求超时中间件
exports.timeout = (seconds = 30) => {
    return (req, res, next) => {
        const timeout = seconds * 1000;
        
        // 设置超时定时器
        const timeoutId = setTimeout(() => {
            const err = new Error('请求超时');
            err.status = 408;
            next(err);
        }, timeout);

        // 清理定时器
        res.on('finish', () => {
            clearTimeout(timeoutId);
        });

        next();
    };
};

// 跨域处理中间件
exports.cors = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};

// 安全头部中间件
exports.security = (req, res, next) => {
    // XSS防护
    res.header('X-XSS-Protection', '1; mode=block');
    // 点击劫持防护
    res.header('X-Frame-Options', 'DENY');
    // MIME类型嗅探防护
    res.header('X-Content-Type-Options', 'nosniff');
    // 严格传输安全
    if (process.env.NODE_ENV === 'production') {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
}; 