const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['info', 'warn', 'error', 'debug'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    module: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    ip: String,
    userAgent: String,
    method: String,
    path: String,
    statusCode: Number,
    responseTime: Number,
    requestBody: Object,
    responseBody: Object,
    error: {
        name: String,
        message: String,
        stack: String
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60 // 30天后自动删除
    }
}, {
    timestamps: true
});

// 索引
logSchema.index({ level: 1, createdAt: -1 });
logSchema.index({ module: 1, createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ statusCode: 1 });
logSchema.index({ 'error.name': 1 });

// 静态方法：记录信息日志
logSchema.statics.info = async function(message, options = {}) {
    return this.create({
        level: 'info',
        message,
        ...options
    });
};

// 静态方法：记录警告日志
logSchema.statics.warn = async function(message, options = {}) {
    return this.create({
        level: 'warn',
        message,
        ...options
    });
};

// 静态方法：记录错误日志
logSchema.statics.error = async function(error, options = {}) {
    return this.create({
        level: 'error',
        message: error.message,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        ...options
    });
};

// 静态方法：记录调试日志
logSchema.statics.debug = async function(message, options = {}) {
    if (process.env.NODE_ENV !== 'development') return;
    
    return this.create({
        level: 'debug',
        message,
        ...options
    });
};

// 静态方法：记录API请求日志
logSchema.statics.logRequest = async function(req, res, responseTime) {
    return this.create({
        level: 'info',
        module: 'api',
        message: `${req.method} ${req.path}`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        requestBody: req.body,
        user: req.user?._id
    });
};

// 静态方法：获取最近的错误日志
logSchema.statics.getRecentErrors = async function(limit = 10) {
    return this.find({ level: 'error' })
        .sort('-createdAt')
        .limit(limit)
        .populate('user', 'nickname');
};

// 静态方法：获取模块统计信息
logSchema.statics.getModuleStats = async function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { 
                    $gte: startDate, 
                    $lte: endDate 
                }
            }
        },
        {
            $group: {
                _id: '$module',
                count: { $sum: 1 },
                errors: {
                    $sum: { 
                        $cond: [{ $eq: ['$level', 'error'] }, 1, 0]
                    }
                },
                avgResponseTime: { $avg: '$responseTime' }
            }
        }
    ]);
};

// 静态方法：清理过期日志
logSchema.statics.cleanOldLogs = async function(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.deleteMany({
        createdAt: { $lt: date }
    });
};

const Log = mongoose.model('Log', logSchema);

module.exports = Log; 