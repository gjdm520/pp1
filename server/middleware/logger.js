const Log = require('../models/log');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志流
const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'),
    { flags: 'a' }
);

// 自定义日志格式
morgan.token('user-id', (req) => req.user?.userId || 'anonymous');
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('error', (req, res) => res.locals.error || '');

const logFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body :error';

// 请求日志中间件
exports.accessLogger = morgan(logFormat, {
    stream: accessLogStream,
    skip: (req) => req.path === '/health' || req.path.startsWith('/static/')
});

// API请求日志中间件
exports.apiLogger = async (req, res, next) => {
    const start = Date.now();

    // 保存原始的json方法
    const originalJson = res.json;
    let responseBody;

    // 重写json方法以捕获响应内容
    res.json = function(body) {
        responseBody = body;
        return originalJson.call(this, body);
    };

    res.on('finish', async () => {
        const duration = Date.now() - start;

        try {
            await Log.create({
                level: 'info',
                module: 'api',
                message: `${req.method} ${req.path}`,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime: duration,
                requestBody: req.body,
                responseBody: responseBody,
                user: req.user?.userId,
                metadata: {
                    headers: req.headers,
                    query: req.query,
                    params: req.params
                }
            });
        } catch (error) {
            console.error('API日志记录失败:', error);
        }
    });

    next();
};

// 错误日志中间件
exports.errorLogger = async (err, req, res, next) => {
    try {
        await Log.create({
            level: 'error',
            module: 'api',
            message: err.message,
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack
            },
            ip: req.ip,
            method: req.method,
            path: req.path,
            statusCode: err.status || 500,
            user: req.user?.userId
        });
    } catch (logError) {
        console.error('错误日志记录失败:', logError);
    }

    next(err);
};

// 慢请求日志中间件
exports.slowLogger = (threshold = 1000) => {
    return async (req, res, next) => {
        const start = Date.now();

        res.on('finish', async () => {
            const duration = Date.now() - start;
            if (duration >= threshold) {
                try {
                    await Log.create({
                        level: 'warn',
                        module: 'performance',
                        message: `慢请求: ${req.method} ${req.path} (${duration}ms)`,
                        ip: req.ip,
                        method: req.method,
                        path: req.path,
                        responseTime: duration,
                        user: req.user?.userId
                    });
                } catch (error) {
                    console.error('慢请求日志记录失败:', error);
                }
            }
        });

        next();
    };
};

// 日志清理任务
exports.cleanupLogs = async (days = 30) => {
    try {
        const date = new Date();
        date.setDate(date.getDate() - days);

        const result = await Log.deleteMany({
            createdAt: { $lt: date }
        });

        console.log(`清理了 ${result.deletedCount} 条过期日志`);
    } catch (error) {
        console.error('日志清理失败:', error);
    }
};

// 每天执行一次日志清理
setInterval(exports.cleanupLogs, 24 * 60 * 60 * 1000); 