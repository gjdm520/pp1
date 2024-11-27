const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { performance } = require('perf_hooks');

// 性能监控中间件
exports.performanceMonitor = (options = {}) => {
    const {
        slowThreshold = 1000, // 慢请求阈值（毫秒）
        sampleRate = 1,      // 采样率 (0-1)
        excludePaths = [],   // 排除的路径
        includeBody = false  // 是否包含请求体
    } = options;

    return async (req, res, next) => {
        // 采样判断
        if (Math.random() > sampleRate) {
            return next();
        }

        // 路径排除
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        // 收集请求信息
        const requestData = {
            path: req.path,
            method: req.method,
            query: req.query,
            headers: req.headers,
            userId: req.user?.id,
            body: includeBody ? req.body : undefined
        };

        // 监听响应完成事件
        res.on('finish', async () => {
            const duration = performance.now() - startTime;
            const memoryDiff = {
                heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed,
                external: process.memoryUsage().external - startMemory.external
            };

            // 性能数据
            const perfData = {
                timestamp: new Date(),
                duration,
                memory: memoryDiff,
                statusCode: res.statusCode,
                request: requestData,
                slow: duration > slowThreshold
            };

            // 记录性能日志
            if (duration > slowThreshold) {
                logger.warn('Slow Request:', perfData);
            } else {
                logger.info('Request Performance:', perfData);
            }

            // 保存性能数据
            await cache.zadd('performance:requests', Date.now(), JSON.stringify(perfData));
        });

        next();
    };
};

// 内存使用监控中间件
exports.memoryMonitor = (threshold = 0.8) => {
    return (req, res, next) => {
        const memoryUsage = process.memoryUsage();
        const usedMemoryRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

        if (usedMemoryRatio > threshold) {
            logger.warn('High Memory Usage:', {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                ratio: usedMemoryRatio
            });

            // 触发垃圾回收
            if (global.gc) {
                global.gc();
            }
        }

        next();
    };
};

// 请求超时中间件
exports.timeout = (limit = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            logger.error('Request Timeout:', {
                path: req.path,
                method: req.method,
                timeout: limit
            });

            res.status(503).json({
                success: false,
                message: '请求超时',
                timeout: limit
            });
        }, limit);

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

// 资源使用监控中间件
exports.resourceMonitor = () => {
    return (req, res, next) => {
        const startUsage = process.cpuUsage();
        const startTime = process.hrtime();

        res.on('finish', () => {
            const cpuUsage = process.cpuUsage(startUsage);
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds * 1000 + nanoseconds / 1e6;

            const resourceData = {
                timestamp: new Date(),
                path: req.path,
                method: req.method,
                duration,
                cpu: {
                    user: cpuUsage.user / 1000,
                    system: cpuUsage.system / 1000
                },
                memory: process.memoryUsage()
            };

            // 记录资源使用情况
            logger.info('Resource Usage:', resourceData);
        });

        next();
    };
};

// 性能优化建议中间件
exports.performanceAdvisor = () => {
    return async (req, res, next) => {
        const startTime = Date.now();

        // 收集优化建议
        const suggestions = [];

        // 检查缓存使用
        if (!req.headers['if-none-match'] && !req.headers['if-modified-since']) {
            suggestions.push({
                type: 'cache',
                message: '建议使用条件请求头以启用客户端缓存'
            });
        }

        // 检查压缩
        if (!req.headers['accept-encoding']?.includes('gzip')) {
            suggestions.push({
                type: 'compression',
                message: '建议启用gzip压缩以减少传输大小'
            });
        }

        // 响应拦截
        const originalJson = res.json;
        res.json = function(data) {
            const duration = Date.now() - startTime;

            // 添加性能建议
            if (suggestions.length > 0) {
                logger.info('Performance Suggestions:', {
                    path: req.path,
                    duration,
                    suggestions
                });
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = {
    performanceMonitor: exports.performanceMonitor,
    memoryMonitor: exports.memoryMonitor,
    timeout: exports.timeout,
    resourceMonitor: exports.resourceMonitor,
    performanceAdvisor: exports.performanceAdvisor
}; 