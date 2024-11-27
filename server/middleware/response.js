const logger = require('../utils/logger');

// 统一响应格式中间件
exports.responseHandler = (req, res, next) => {
    // 扩展 res 对象，添加统一的响应方法
    res.success = (data = null, message = '操作成功', meta = {}) => {
        return res.json({
            success: true,
            code: 200,
            message,
            data,
            meta,
            timestamp: new Date().toISOString()
        });
    };

    res.error = (message = '操作失败', code = 500, errors = null) => {
        return res.status(code).json({
            success: false,
            code,
            message,
            errors,
            timestamp: new Date().toISOString()
        });
    };

    res.created = (data = null, message = '创建成功') => {
        return res.status(201).json({
            success: true,
            code: 201,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    };

    res.noContent = () => {
        return res.status(204).end();
    };

    res.badRequest = (message = '请求参数错误', errors = null) => {
        return res.error(message, 400, errors);
    };

    res.unauthorized = (message = '未授权') => {
        return res.error(message, 401);
    };

    res.forbidden = (message = '禁止访问') => {
        return res.error(message, 403);
    };

    res.notFound = (message = '资源不存在') => {
        return res.error(message, 404);
    };

    next();
};

// 响应拦截器中间件
exports.responseInterceptor = (req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;
    const startTime = Date.now();

    // 重写 json 方法
    res.json = function(data) {
        // 添加请求ID
        if (req.id) {
            data.requestId = req.id;
        }

        // 添加响应时间
        data.responseTime = Date.now() - startTime;

        // 记录响应日志
        logger.info('Response:', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: data.responseTime,
            requestId: req.id,
            userId: req.user?.id
        });

        return originalJson.call(this, data);
    };

    // 重写 send 方法
    res.send = function(data) {
        // 如果是字符串，转换为标准格式
        if (typeof data === 'string') {
            return originalJson.call(this, {
                success: true,
                message: data,
                timestamp: new Date().toISOString()
            });
        }
        return originalSend.call(this, data);
    };

    next();
};

// 分页响应中间件
exports.paginationHandler = (req, res, next) => {
    res.paginate = (data, total, options = {}) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const pages = Math.ceil(total / limit);

        // 设置分页响应头
        res.set({
            'X-Total-Count': total,
            'X-Page-Count': pages,
            'X-Current-Page': page,
            'X-Per-Page': limit
        });

        return res.success(data, options.message || '获取成功', {
            pagination: {
                total,
                page,
                pages,
                limit
            },
            ...options.meta
        });
    };

    next();
};

// 条件响应中间件
exports.conditionalResponse = (req, res, next) => {
    // 处理 If-None-Match 和 If-Modified-Since
    res.sendConditional = (data, options = {}) => {
        const etag = require('etag');
        const currentEtag = etag(JSON.stringify(data));
        
        // 设置缓存相关响应头
        res.set({
            'ETag': currentEtag,
            'Last-Modified': options.lastModified || new Date().toUTCString(),
            'Cache-Control': options.cacheControl || 'private, max-age=300'
        });

        // 检查条件请求
        if (req.fresh) {
            return res.status(304).end();
        }

        return res.success(data, options.message);
    };

    next();
};

// 错误响应中间件
exports.errorHandler = (err, req, res, next) => {
    // 记录错误日志
    logger.error('Error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        requestId: req.id,
        userId: req.user?.id
    });

    // 根据错误类型返回不同的响应
    if (err.name === 'ValidationError') {
        return res.badRequest('数据验证失败', err.errors);
    }

    if (err.name === 'UnauthorizedError') {
        return res.unauthorized();
    }

    if (err.name === 'ForbiddenError') {
        return res.forbidden();
    }

    if (err.name === 'NotFoundError') {
        return res.notFound();
    }

    // 默认服务器错误响应
    return res.error(
        process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
    );
};

module.exports = {
    responseHandler: exports.responseHandler,
    responseInterceptor: exports.responseInterceptor,
    paginationHandler: exports.paginationHandler,
    conditionalResponse: exports.conditionalResponse,
    errorHandler: exports.errorHandler
}; 