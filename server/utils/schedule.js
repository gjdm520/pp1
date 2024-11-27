const schedule = require('node-schedule');
const logger = require('./logger');
const cache = require('./cache');
const database = require('./database');
const Log = require('../models/log');
const Token = require('../models/token');
const Notification = require('../models/notification');
const Order = require('../models/order');
const { analyticsQueue } = require('./queue');

// 定时任务管理器
class ScheduleManager {
    constructor() {
        this.jobs = new Map();
    }

    // 添加定时任务
    addJob(name, rule, callback) {
        try {
            const job = schedule.scheduleJob(name, rule, async () => {
                try {
                    logger.info(`开始执行定时任务: ${name}`);
                    await callback();
                    logger.info(`定时任务执行完成: ${name}`);
                } catch (error) {
                    logger.error(`定时任务执行失败: ${name}`, error);
                }
            });

            this.jobs.set(name, job);
            logger.info(`定时任务添加成功: ${name}`);
        } catch (error) {
            logger.error(`定时任务添加失败: ${name}`, error);
        }
    }

    // 取消定时任务
    cancelJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.cancel();
            this.jobs.delete(name);
            logger.info(`定时任务已取消: ${name}`);
        }
    }

    // 获取所有定时任务
    getJobs() {
        return Array.from(this.jobs.keys());
    }
}

// 创建调度管理器实例
const scheduler = new ScheduleManager();

// 日志清理任务 - 每天凌晨3点执行
scheduler.addJob('cleanLogs', '0 3 * * *', async () => {
    const days = 30; // 保留30天的日志
    const date = new Date();
    date.setDate(date.getDate() - days);

    const result = await Log.deleteMany({
        createdAt: { $lt: date }
    });

    logger.info(`清理了 ${result.deletedCount} 条过期日志`);
});

// 过期Token清理任务 - 每小时执行
scheduler.addJob('cleanTokens', '0 * * * *', async () => {
    const result = await Token.deleteMany({
        expireAt: { $lt: new Date() }
    });

    logger.info(`清理了 ${result.deletedCount} 条过期Token`);
});

// 订单状态检查任务 - 每5分钟执行
scheduler.addJob('checkOrders', '*/5 * * * *', async () => {
    // 检查超时未支付的订单
    const expiredOrders = await Order.find({
        status: 'pending',
        createdAt: { 
            $lt: new Date(Date.now() - 30 * 60 * 1000) // 30分钟未支付
        }
    });

    for (const order of expiredOrders) {
        order.status = 'cancelled';
        order.cancelReason = '支付超时自动取消';
        await order.save();

        // 发送通知
        await Notification.create({
            user: order.user,
            type: 'order',
            title: '订单已取消',
            content: `订单 ${order.orderNo} 因超时未支付已自动取消`
        });
    }

    logger.info(`处理了 ${expiredOrders.length} 个超时订单`);
});

// 缓存清理任务 - 每天凌晨2点执行
scheduler.addJob('cleanCache', '0 2 * * *', async () => {
    const cleanedKeys = await cache.cleanExpired();
    logger.info(`清理了 ${cleanedKeys} 个过期缓存`);
});

// 数据库备份任务 - 每天凌晨4点执行
scheduler.addJob('databaseBackup', '0 4 * * *', async () => {
    try {
        await database.backup({
            path: `backups/db-${new Date().toISOString().split('T')[0]}.gz`
        });
        logger.info('数据库备份完成');
    } catch (error) {
        logger.error('数据库备份失败:', error);
    }
});

// 统计报表生成任务
// 每天凌晨1点生成日报
scheduler.addJob('dailyReport', '0 1 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await analyticsQueue.add('daily', {
        date: yesterday
    });
});

// 每周一凌晨1点生成周报
scheduler.addJob('weeklyReport', '0 1 * * 1', async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    await analyticsQueue.add('weekly', {
        startDate,
        endDate
    });
});

// 每月1号凌晨1点生成月报
scheduler.addJob('monthlyReport', '0 1 1 * *', async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    await analyticsQueue.add('monthly', {
        year,
        month
    });
});

// 系统状态检查任务 - 每30分钟执行
scheduler.addJob('systemHealthCheck', '*/30 * * * *', async () => {
    try {
        // 检查数据库连接
        await database.mongoose.connection.db.admin().ping();
        
        // 检查Redis连接
        await cache.redis.ping();
        
        // 检查磁盘空间
        const diskSpace = await system.checkDiskSpace();
        if (diskSpace.usedPercentage > 90) {
            logger.warn('磁盘空间使用率过高:', diskSpace);
        }
        
        // 检查内存使用
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
            logger.warn('内存使用率过高:', memoryUsage);
        }

        logger.info('系统状态检查正常');
    } catch (error) {
        logger.error('系统状态检查异常:', error);
    }
});

// 优雅关闭
process.on('SIGTERM', () => {
    scheduler.getJobs().forEach(name => {
        scheduler.cancelJob(name);
    });
    logger.info('所有定时任务已停止');
});

module.exports = scheduler; 