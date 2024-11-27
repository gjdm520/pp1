// 响应状态码
const STATUS_CODES = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 422,
    INTERNAL_ERROR: 500
};

// 成功响应
exports.success = (res, data = null, message = '操作成功', meta = {}) => {
    return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        code: STATUS_CODES.SUCCESS,
        message,
        data,
        meta
    });
};

// 创建成功响应
exports.created = (res, data = null, message = '创建成功', meta = {}) => {
    return res.status(STATUS_CODES.CREATED).json({
        success: true,
        code: STATUS_CODES.CREATED,
        message,
        data,
        meta
    });
};

// 错误响应
exports.error = (res, message = '操作失败', code = STATUS_CODES.INTERNAL_ERROR, errors = null) => {
    return res.status(code).json({
        success: false,
        code,
        message,
        errors
    });
};

// 参数验证错误响应
exports.validationError = (res, errors) => {
    return res.status(STATUS_CODES.VALIDATION_ERROR).json({
        success: false,
        code: STATUS_CODES.VALIDATION_ERROR,
        message: '参数验证失败',
        errors: Array.isArray(errors) ? errors : [errors]
    });
};

// 未授权响应
exports.unauthorized = (res, message = '请先登录') => {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        code: STATUS_CODES.UNAUTHORIZED,
        message
    });
};

// 禁止访问响应
exports.forbidden = (res, message = '没有权限') => {
    return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        code: STATUS_CODES.FORBIDDEN,
        message
    });
};

// 资源不存在响应
exports.notFound = (res, message = '资源不存在') => {
    return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        code: STATUS_CODES.NOT_FOUND,
        message
    });
};

// 资源冲突响应
exports.conflict = (res, message = '资源已存在') => {
    return res.status(STATUS_CODES.CONFLICT).json({
        success: false,
        code: STATUS_CODES.CONFLICT,
        message
    });
};

// 分页响应
exports.paginate = (res, data, pagination, message = '获取成功') => {
    return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        code: STATUS_CODES.SUCCESS,
        message,
        data,
        pagination: {
            total: pagination.total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(pagination.total / pagination.limit)
        }
    });
};

// 列表响应
exports.list = (res, data, meta = {}, message = '获取成功') => {
    return res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        code: STATUS_CODES.SUCCESS,
        message,
        data,
        meta
    });
};

// 导出状态码
exports.STATUS_CODES = STATUS_CODES;

// 响应拦截器
exports.responseInterceptor = (req, res, next) => {
    // 保存原始的json方法
    const originalJson = res.json;

    // 重写json方法
    res.json = function(data) {
        // 添加请求ID
        if (req.id) {
            data.requestId = req.id;
        }

        // 添加响应时间
        data.timestamp = new Date().toISOString();

        // 添加API版本
        data.apiVersion = process.env.API_VERSION || '1.0';

        return originalJson.call(this, data);
    };

    next();
};

// 错误处理中间件
exports.errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // 处理验证错误
    if (err.name === 'ValidationError') {
        return this.validationError(res, Object.values(err.errors).map(e => e.message));
    }

    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') {
        return this.unauthorized(res, '无效的token');
    }

    // 处理权限错误
    if (err.name === 'PermissionError') {
        return this.forbidden(res, err.message);
    }

    // 处理其他错误
    return this.error(res, err.message || '服务器内部错误');
}; 