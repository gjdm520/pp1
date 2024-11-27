const Redis = require('ioredis');
const { promisify } = require('util');

// Redis客户端配置
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: process.env.REDIS_PREFIX || 'app:'
};

// 创建Redis客户端
const redis = new Redis(redisConfig);

// 默认缓存时间（秒）
const DEFAULT_EXPIRE = 3600;

// 设置缓存
exports.set = async (key, value, expire = DEFAULT_EXPIRE) => {
    try {
        const stringValue = JSON.stringify(value);
        if (expire) {
            await redis.setex(key, expire, stringValue);
        } else {
            await redis.set(key, stringValue);
        }
        return true;
    } catch (error) {
        console.error('Cache set error:', error);
        return false;
    }
};

// 获取缓存
exports.get = async (key) => {
    try {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
};

// 删除缓存
exports.del = async (key) => {
    try {
        await redis.del(key);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error);
        return false;
    }
};

// 批量删除缓存
exports.delMulti = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length) {
            await redis.del(keys);
        }
        return true;
    } catch (error) {
        console.error('Cache multi delete error:', error);
        return false;
    }
};

// 设置哈希表字段
exports.hset = async (key, field, value, expire = DEFAULT_EXPIRE) => {
    try {
        const stringValue = JSON.stringify(value);
        await redis.hset(key, field, stringValue);
        if (expire) {
            await redis.expire(key, expire);
        }
        return true;
    } catch (error) {
        console.error('Cache hset error:', error);
        return false;
    }
};

// 获取哈希表字段
exports.hget = async (key, field) => {
    try {
        const value = await redis.hget(key, field);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Cache hget error:', error);
        return null;
    }
};

// 删除哈希表字段
exports.hdel = async (key, field) => {
    try {
        await redis.hdel(key, field);
        return true;
    } catch (error) {
        console.error('Cache hdel error:', error);
        return false;
    }
};

// 获取哈希表所有字段
exports.hgetall = async (key) => {
    try {
        const data = await redis.hgetall(key);
        Object.keys(data).forEach(field => {
            data[field] = JSON.parse(data[field]);
        });
        return data;
    } catch (error) {
        console.error('Cache hgetall error:', error);
        return {};
    }
};

// 设置列表
exports.lpush = async (key, value, expire = DEFAULT_EXPIRE) => {
    try {
        const stringValue = JSON.stringify(value);
        await redis.lpush(key, stringValue);
        if (expire) {
            await redis.expire(key, expire);
        }
        return true;
    } catch (error) {
        console.error('Cache lpush error:', error);
        return false;
    }
};

// 获取列表
exports.lrange = async (key, start = 0, stop = -1) => {
    try {
        const data = await redis.lrange(key, start, stop);
        return data.map(item => JSON.parse(item));
    } catch (error) {
        console.error('Cache lrange error:', error);
        return [];
    }
};

// 设置集合
exports.sadd = async (key, value, expire = DEFAULT_EXPIRE) => {
    try {
        const stringValue = JSON.stringify(value);
        await redis.sadd(key, stringValue);
        if (expire) {
            await redis.expire(key, expire);
        }
        return true;
    } catch (error) {
        console.error('Cache sadd error:', error);
        return false;
    }
};

// 获取集合
exports.smembers = async (key) => {
    try {
        const data = await redis.smembers(key);
        return data.map(item => JSON.parse(item));
    } catch (error) {
        console.error('Cache smembers error:', error);
        return [];
    }
};

// 设置有序集合
exports.zadd = async (key, score, value, expire = DEFAULT_EXPIRE) => {
    try {
        const stringValue = JSON.stringify(value);
        await redis.zadd(key, score, stringValue);
        if (expire) {
            await redis.expire(key, expire);
        }
        return true;
    } catch (error) {
        console.error('Cache zadd error:', error);
        return false;
    }
};

// 获取有序集合
exports.zrange = async (key, start = 0, stop = -1, withScores = false) => {
    try {
        const options = withScores ? ['WITHSCORES'] : [];
        const data = await redis.zrange(key, start, stop, ...options);
        if (withScores) {
            const result = [];
            for (let i = 0; i < data.length; i += 2) {
                result.push({
                    value: JSON.parse(data[i]),
                    score: parseFloat(data[i + 1])
                });
            }
            return result;
        }
        return data.map(item => JSON.parse(item));
    } catch (error) {
        console.error('Cache zrange error:', error);
        return [];
    }
};

// 清理过期缓存
exports.cleanExpired = async () => {
    try {
        const keys = await redis.keys(`${redisConfig.keyPrefix}*`);
        let cleaned = 0;

        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl <= 0) {
                await redis.del(key);
                cleaned++;
            }
        }

        return cleaned;
    } catch (error) {
        console.error('Cache clean error:', error);
        return 0;
    }
};

// 导出Redis客户端实例
exports.redis = redis; 