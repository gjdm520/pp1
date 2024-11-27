const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别定义
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// 日志级别颜色
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// 设置日志格式
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// 控制台输出格式
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');

// 创建日志记录器
const logger = winston.createLogger({
    levels,
    format,
    transports: [
        // 错误日志
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m'
        }),
        
        // 应用日志
        new DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '20m'
        }),
        
        // 访问日志
        new DailyRotateFile({
            filename: path.join(logDir, 'access-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'http',
            maxFiles: '30d',
            maxSize: '20m'
        })
    ]
});

// 非生产环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// 添加日志颜色
winston.addColors(colors);

// 错误日志
exports.error = (message, meta = {}) => {
    logger.error(message, { ...meta, timestamp: new Date() });
};

// 警告日志
exports.warn = (message, meta = {}) => {
    logger.warn(message, { ...meta, timestamp: new Date() });
};

// 信息日志
exports.info = (message, meta = {}) => {
    logger.info(message, { ...meta, timestamp: new Date() });
};

// HTTP请求日志
exports.http = (message, meta = {}) => {
    logger.http(message, { ...meta, timestamp: new Date() });
};

// 调试日志
exports.debug = (message, meta = {}) => {
    logger.debug(message, { ...meta, timestamp: new Date() });
};

// 记录API请求日志
exports.logRequest = (req, res, responseTime) => {
    const meta = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id
    };

    logger.http(`${req.method} ${req.url}`, meta);
};

// 记录错误日志
exports.logError = (error, req = null) => {
    const meta = {
        stack: error.stack,
        code: error.code,
        ...(req && {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id
        })
    };

    logger.error(error.message, meta);
};

// 记录数据库操作日志
exports.logDB = (operation, collection, query, duration) => {
    logger.debug('Database Operation', {
        operation,
        collection,
        query,
        duration
    });
};

// 记录缓存操作日志
exports.logCache = (operation, key, duration) => {
    logger.debug('Cache Operation', {
        operation,
        key,
        duration
    });
};

// 记录性能日志
exports.logPerformance = (label, duration) => {
    logger.info('Performance Metric', {
        label,
        duration,
        timestamp: new Date()
    });
};

// 记录安全事件
exports.logSecurity = (event, meta = {}) => {
    logger.warn('Security Event', {
        event,
        ...meta,
        timestamp: new Date()
    });
};

// 导出日志实例
exports.logger = logger; 