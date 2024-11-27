const Redis = require('ioredis');
const crypto = require('crypto');
const { redis } = require('../utils/cache');
const logger = require('../utils/logger');

// 生成缓存键
const generateCacheKey = (req, prefix) => {
    const parts = [
        prefix,
        req.path,
        JSON.stringify(req.query),
        req.user?.id || 'anonymous'
    ];
    return parts.join(':');
};

// 缓存中间件
exports.cacheMiddleware = (options = {}) => {
    const {
        prefix = 'api:',
        expire = 3600,
        exclude = [],
        onlyGet = true
    } = options;

    return async (req, res, next) => {
        // 只缓存GET请求
        if (onlyGet && req.method !== 'GET') {
            return next();
        }

        // 检查是否在排除列表中
        if (exclude.some(pattern => req.path.match(pattern))) {
            return next();
        }

        // 生成缓存键
        const key = generateCacheKey(req, prefix);

        try {
            // 尝试获取缓存
            const cached = await redis.get(key);
            if (cached) {
                logger.debug('Cache hit:', key);
                return res.json(cached);
            }

            // 保存原始的json方法
            const originalJson = res.json;

            // 重写json方法以缓存响应
            res.json = function(data) {
                // 缓存成功的响应
                if (data.success !== false) {
                    redis.set(key, data, expire).catch(err => {
                        logger.error('Cache set error:', err);
                    });
                }
                return originalJson.call(this, data);
            };

            next();

        } catch (error) {
            logger.error('Cache middleware error:', error);
            next();
        }
    };
};

// 清除缓存中间件
exports.clearCache = (pattern) => {
    return async (req, res, next) => {
        try {
            await redis.delMulti(pattern);
            next();
        } catch (error) {
            logger.error('Cache clear error:', error);
            next();
        }
    };
};

// 缓存预热中间件
exports.warmupCache = (options = {}) => {
    const {
        getData,
        getKey,
        expire = 3600
    } = options;

    return async (req, res, next) => {
        try {
            const key = getKey(req);
            const data = await getData(req);
            await redis.set(key, data, expire);
            next();
        } catch (error) {
            logger.error('Cache warmup error:', error);
            next();
        }
    };
};

// 条件缓存中间件
exports.conditionalCache = (condition, options = {}) => {
    return async (req, res, next) => {
        if (await condition(req)) {
            return exports.cacheMiddleware(options)(req, res, next);
        }
        next();
    };
};

// 缓存标记中间件
exports.cacheTag = (tag) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        res.json = function(data) {
            if (data.success !== false) {
                const key = generateCacheKey(req, 'tag:' + tag);
                redis.sadd(key, req.originalUrl).catch(err => {
                    logger.error('Cache tag error:', err);
                });
            }
            return originalJson.call(this, data);
        };
        next();
    };
};

// 按标记清除缓存中间件
exports.clearCacheByTag = (tag) => {
    return async (req, res, next) => {
        try {
            const key = 'tag:' + tag;
            const urls = await redis.smembers(key);
            await Promise.all([
                redis.del(key),
                ...urls.map(url => redis.del('api:' + url))
            ]);
            next();
        } catch (error) {
            logger.error('Clear cache by tag error:', error);
            next();
        }
    };
};

// 缓存统计中间件
exports.cacheStats = () => {
    return async (req, res, next) => {
        const start = Date.now();
        const originalJson = res.json;

        res.json = function(data) {
            const duration = Date.now() - start;
            logger.info('Cache stats:', {
                path: req.path,
                duration,
                hit: !!data._fromCache
            });
            return originalJson.call(this, data);
        };

        next();
    };
};

// 清理过期缓存函数
exports.cleanupCache = async () => {
    try {
        const keys = await redis.keys('cache:*');
        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl <= 0) {
                await redis.del(key);
            }
        }
        logger.info('清理过期缓存完成');
    } catch (error) {
        logger.error('清理过期缓存失败:', error);
    }
};

// 监听Redis连接事件
redis.on('connect', () => {
    console.log('Redis连接成功');
});

redis.on('error', (error) => {
    console.error('Redis连接错误:', error);
}); 