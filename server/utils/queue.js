const Bull = require('bull');
const config = require('./config');
const logger = require('./logger');
const emailUtil = require('./email');
const smsUtil = require('./sms');
const uploadUtil = require('./upload');

// 创建队列
const createQueue = (name, options = {}) => {
    const queue = new Bull(name, {
        redis: config.redis,
        prefix: 'queue',
        ...options
    });

    // 监听队列事件
    queue.on('error', error => {
        logger.error(`队列错误 [${name}]:`, error);
    });

    queue.on('failed', (job, error) => {
        logger.error(`任务失败 [${name}] #${job.id}:`, error);
    });

    queue.on('completed', job => {
        logger.info(`任务完成 [${name}] #${job.id}`);
    });

    return queue;
};

// 邮件队列
const emailQueue = createQueue('email', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    }
});

// 处理邮件发送任务
emailQueue.process(async job => {
    const { type, data } = job.data;
    
    switch (type) {
        case 'verification':
            await emailUtil.sendVerifyCode(data.email, data.code);
            break;
        case 'welcome':
            await emailUtil.sendWelcome(data.email, data.user);
            break;
        case 'order':
            await emailUtil.sendOrderConfirmation(data.email, data.order);
            break;
        case 'notification':
            await emailUtil.sendNotification(data.email, data.title, data.content);
            break;
        default:
            throw new Error(`未知的邮件类型: ${type}`);
    }
});

// 短信队列
const smsQueue = createQueue('sms', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    }
});

// 处理短信发送任务
smsQueue.process(async job => {
    const { type, data } = job.data;
    
    switch (type) {
        case 'verification':
            await smsUtil.sendVerifyCode(data.phone, data.code);
            break;
        case 'order':
            await smsUtil.sendOrderNotification(data.phone, data.orderNo);
            break;
        case 'notification':
            await smsUtil.sendNotification(data.phone, data.content);
            break;
        default:
            throw new Error(`未知的短信类型: ${type}`);
    }
});

// 导出队列
const exportQueue = createQueue('export', {
    defaultJobOptions: {
        attempts: 2,
        timeout: 300000 // 5分钟超时
    }
});

// 处理导出任务
exportQueue.process(async job => {
    const { type, data } = job.data;
    
    switch (type) {
        case 'guide':
            const guide = await Guide.findById(data.guideId)
                .populate('author')
                .populate('destinations.spot');
            
            const exportFile = await exportUtil.exportGuide(guide, data.format);
            const uploadResult = await uploadUtil.uploadToOSS(exportFile, {
                folder: 'exports',
                filename: `guide-${guide._id}-${Date.now()}.${data.format}`
            });

            // 发送通知
            await Notification.create({
                user: data.userId,
                type: 'export',
                title: '导出完成',
                content: `攻略《${guide.title}》导出完成，点击下载`,
                link: uploadResult.url
            });
            break;

        case 'orders':
            // 处理订单导出...
            break;

        default:
            throw new Error(`未知的导出类型: ${type}`);
    }
});

// 图片处理队列
const imageQueue = createQueue('image', {
    defaultJobOptions: {
        attempts: 2,
        timeout: 60000 // 1分钟超时
    }
});

// 处理图片任务
imageQueue.process(async job => {
    const { type, data } = job.data;
    
    switch (type) {
        case 'resize':
            await uploadUtil.resizeImage(data.file, data.options);
            break;
        case 'watermark':
            await uploadUtil.addWatermark(data.file, data.options);
            break;
        case 'optimize':
            await uploadUtil.optimizeImage(data.file, data.options);
            break;
        default:
            throw new Error(`未知的图片处理类型: ${type}`);
    }
});

// 统计分析队列
const analyticsQueue = createQueue('analytics', {
    defaultJobOptions: {
        attempts: 1,
        timeout: 600000 // 10分钟超时
    }
});

// 处理统计分析任务
analyticsQueue.process(async job => {
    const { type, data } = job.data;
    
    switch (type) {
        case 'daily':
            await analyticsUtil.generateDailyReport(data.date);
            break;
        case 'weekly':
            await analyticsUtil.generateWeeklyReport(data.startDate, data.endDate);
            break;
        case 'monthly':
            await analyticsUtil.generateMonthlyReport(data.year, data.month);
            break;
        default:
            throw new Error(`未知的统计类型: ${type}`);
    }
});

// 优雅关闭
const gracefulShutdown = async () => {
    await Promise.all([
        emailQueue.close(),
        smsQueue.close(),
        exportQueue.close(),
        imageQueue.close(),
        analyticsQueue.close()
    ]);
    logger.info('所有队列已关闭');
};

process.on('SIGTERM', gracefulShutdown);

module.exports = {
    emailQueue,
    smsQueue,
    exportQueue,
    imageQueue,
    analyticsQueue,
    gracefulShutdown
}; 