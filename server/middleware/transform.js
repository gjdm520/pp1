const { camelCase, snakeCase } = require('lodash');

// 数据转换工具
const transformObject = (obj, transformer) => {
    if (Array.isArray(obj)) {
        return obj.map(item => transformObject(item, transformer));
    }

    if (obj !== null && typeof obj === 'object') {
        const transformed = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const transformedKey = transformer(key);
                transformed[transformedKey] = transformObject(obj[key], transformer);
            }
        }
        return transformed;
    }

    return obj;
};

// 请求数据转换中间件（snake_case 转 camelCase）
exports.transformRequest = (options = {}) => {
    const {
        excludePaths = [],
        excludeFields = []
    } = options;

    return (req, res, next) => {
        // 检查是否需要跳过转换
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // 转换请求体
        if (req.body && typeof req.body === 'object') {
            req.body = transformObject(req.body, key => {
                if (excludeFields.includes(key)) {
                    return key;
                }
                return camelCase(key);
            });
        }

        // 转换查询参数
        if (req.query && typeof req.query === 'object') {
            req.query = transformObject(req.query, key => {
                if (excludeFields.includes(key)) {
                    return key;
                }
                return camelCase(key);
            });
        }

        next();
    };
};

// 响应数据转换中间件（camelCase 转 snake_case）
exports.transformResponse = (options = {}) => {
    const {
        excludePaths = [],
        excludeFields = []
    } = options;

    return (req, res, next) => {
        // 检查是否需要跳过转换
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // 保存原始的 json 方法
        const originalJson = res.json;

        // 重写 json 方法
        res.json = function(data) {
            // 转换响应数据
            const transformed = transformObject(data, key => {
                if (excludeFields.includes(key)) {
                    return key;
                }
                return snakeCase(key);
            });

            return originalJson.call(this, transformed);
        };

        next();
    };
};

// 数据脱敏中间件
exports.dataMasking = (fields = {}) => {
    const maskValue = (value, type) => {
        switch (type) {
            case 'phone':
                return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
            case 'email':
                return value.replace(/(.{3}).*(@.*)/, '$1***$2');
            case 'idCard':
                return value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
            case 'bankCard':
                return value.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
            case 'name':
                return value.substring(0, 1) + '*'.repeat(value.length - 1);
            case 'custom':
                return '*'.repeat(value.length);
            default:
                return value;
        }
    };

    return (req, res, next) => {
        const originalJson = res.json;

        res.json = function(data) {
            const mask = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(item => mask(item));
                }

                if (obj !== null && typeof obj === 'object') {
                    const masked = { ...obj };
                    for (const [field, type] of Object.entries(fields)) {
                        if (masked[field]) {
                            masked[field] = maskValue(masked[field], type);
                        }
                    }
                    return masked;
                }

                return obj;
            };

            const maskedData = mask(data);
            return originalJson.call(this, maskedData);
        };

        next();
    };
};

// 数据格式化中间件
exports.formatData = (formatters = {}) => {
    return (req, res, next) => {
        const originalJson = res.json;

        res.json = function(data) {
            const format = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(item => format(item));
                }

                if (obj !== null && typeof obj === 'object') {
                    const formatted = { ...obj };
                    for (const [field, formatter] of Object.entries(formatters)) {
                        if (formatted[field] !== undefined) {
                            formatted[field] = formatter(formatted[field]);
                        }
                    }
                    return formatted;
                }

                return obj;
            };

            const formattedData = format(data);
            return originalJson.call(this, formattedData);
        };

        next();
    };
};

module.exports = {
    transformRequest: exports.transformRequest,
    transformResponse: exports.transformResponse,
    dataMasking: exports.dataMasking,
    formatData: exports.formatData
}; 