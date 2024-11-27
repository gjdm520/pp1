const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

// 连接选项
const options = {
    ...config.database.options,
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
};

// 连接数据库
exports.connect = async () => {
    try {
        await mongoose.connect(config.database.uri, options);
        logger.info('数据库连接成功');

        // 监听连接事件
        mongoose.connection.on('error', error => {
            logger.error('数据库错误:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('数据库连接断开');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('数据库重新连接成功');
        });

        // 优雅关闭
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('数据库连接已关闭');
                process.exit(0);
            } catch (error) {
                logger.error('关闭数据库连接失败:', error);
                process.exit(1);
            }
        });

        return mongoose.connection;

    } catch (error) {
        logger.error('数据库连接失败:', error);
        process.exit(1);
    }
};

// 事务包装器
exports.withTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await callback(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// 批量操作包装器
exports.bulkOperation = async (model, operations, options = {}) => {
    try {
        const result = await model.bulkWrite(operations, {
            ordered: false,
            ...options
        });
        return result;
    } catch (error) {
        logger.error('批量操作失败:', error);
        throw error;
    }
};

// 分页查询包装器
exports.paginate = async (model, query = {}, options = {}) => {
    const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        select,
        populate
    } = options;

    try {
        const skip = (page - 1) * limit;
        const countPromise = model.countDocuments(query);
        const docsPromise = model.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select(select)
            .populate(populate);

        const [total, docs] = await Promise.all([countPromise, docsPromise]);

        return {
            docs,
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit)
        };

    } catch (error) {
        logger.error('分页查询失败:', error);
        throw error;
    }
};

// 聚合查询包装器
exports.aggregate = async (model, pipeline = [], options = {}) => {
    try {
        const result = await model.aggregate(pipeline).option(options);
        return result;
    } catch (error) {
        logger.error('聚合查询失败:', error);
        throw error;
    }
};

// 缓存查询包装器
exports.cachedQuery = async (model, query, options = {}) => {
    const {
        key,
        ttl = 3600,
        refresh = false
    } = options;

    // 如果没有指定缓存键，直接执行查询
    if (!key) {
        return query.exec();
    }

    const cache = require('./cache');
    
    try {
        // 如果强制刷新或没有缓存，执行查询
        if (refresh) {
            const result = await query.exec();
            await cache.set(key, result, ttl);
            return result;
        }

        // 尝试获取缓存
        const cached = await cache.get(key);
        if (cached) {
            return cached;
        }

        // 缓存不存在，执行查询并缓存结果
        const result = await query.exec();
        await cache.set(key, result, ttl);
        return result;

    } catch (error) {
        logger.error('缓存查询失败:', error);
        // 如果缓存操作失败，仍然返回查询结果
        return query.exec();
    }
};

// 导出mongoose实例
exports.mongoose = mongoose; 