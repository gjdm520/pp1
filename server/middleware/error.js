const response = require('../utils/response');
const logger = require('../utils/logger');

// 错误处理中间件
exports.errorHandler = (err, req, res, next) => {
    // 记录错误日志
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });

    // 处理验证错误
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => ({
            field: error.path,
            message: error.message
        }));
        return response.validationError(res, errors);
    }

    // 处理MongoDB错误
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        if (err.code === 11000) {
            return response.error(res, '数据已存在', 409);
        }
        return response.error(res, '数据库操作失败', 500);
    }

    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') {
        return response.unauthorized(res, '无效的token');
    }
    if (err.name === 'TokenExpiredError') {
        return response.unauthorized(res, 'token已过期');
    }

    // 处理文件上传错误
    if (err.name === 'MulterError') {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return response.error(res, '文件大小超出限制', 400);
            case 'LIMIT_FILE_COUNT':
                return response.error(res, '文件数量超出限制', 400);
            case 'LIMIT_UNEXPECTED_FILE':
                return response.error(res, '不支持的文件类型', 400);
            default:
                return response.error(res, '文件上传失败', 400);
        }
    }

    // 处理请求超时
    if (err.name === 'TimeoutError') {
        return response.error(res, '请求超时', 408);
    }

    // 处理权限错误
    if (err.name === 'PermissionError') {
        return response.forbidden(res, err.message);
    }

    // 处理业务逻辑错误
    if (err.name === 'BusinessError') {
        return response.error(res, err.message, err.status || 400);
    }

    // 处理第三方API错误
    if (err.name === 'ExternalAPIError') {
        logger.error('External API Error:', {
            service: err.service,
            endpoint: err.endpoint,
            response: err.response
        });
        return response.error(res, '外部服务暂时不可用', 503);
    }

    // 处理其他错误
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message;

    return response.error(res, message, statusCode);
};

// 404错误处理
exports.notFoundHandler = (req, res) => {
    return response.notFound(res, '请求的资源不存在');
};

// 自定义错误类
class BusinessError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'BusinessError';
        this.status = status;
    }
}

class PermissionError extends Error {
    constructor(message = '没有权限执行此操作') {
        super(message);
        this.name = 'PermissionError';
    }
}

class ExternalAPIError extends Error {
    constructor(message, service, endpoint, response) {
        super(message);
        this.name = 'ExternalAPIError';
        this.service = service;
        this.endpoint = endpoint;
        this.response = response;
    }
}

// 导出自定义错误类
exports.BusinessError = BusinessError;
exports.PermissionError = PermissionError;
exports.ExternalAPIError = ExternalAPIError;

// 异步错误包装器
exports.asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// 请求超时处理
exports.timeout = (seconds = 30) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            const err = new Error('请求超时');
            err.name = 'TimeoutError';
            next(err);
        }, seconds * 1000);

        res.on('finish', () => {
            clearTimeout(timer);
        });

        next();
    };
}; 