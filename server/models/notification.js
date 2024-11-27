const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '通知必须关联用户']
    },
    type: {
        type: String,
        enum: ['system', 'order', 'review', 'comment', 'promotion'],
        required: [true, '请指定通知类型']
    },
    title: {
        type: String,
        required: [true, '请输入通知标题'],
        trim: true,
        maxlength: [100, '标题不能超过100个字符']
    },
    content: {
        type: String,
        required: [true, '请输入通知内容'],
        trim: true,
        maxlength: [1000, '内容不能超过1000个字符']
    },
    link: {
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    expireAt: {
        type: Date
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 索引
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// 实例方法：标记为已读
notificationSchema.methods.markAsRead = async function() {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        return this.save();
    }
    return this;
};

// 实例方法：标记为未读
notificationSchema.methods.markAsUnread = async function() {
    if (this.isRead) {
        this.isRead = false;
        this.readAt = null;
        return this.save();
    }
    return this;
};

// 静态方法：批量标记为已读
notificationSchema.statics.markManyAsRead = async function(userId, notificationIds) {
    return this.updateMany(
        {
            _id: { $in: notificationIds },
            user: userId,
            isRead: false
        },
        {
            $set: {
                isRead: true,
                readAt: new Date()
            }
        }
    );
};

// 静态方法：获取用户未读通知数量
notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        user: userId,
        isRead: false
    });
};

// 静态方法：清理过期通知
notificationSchema.statics.cleanExpired = async function() {
    return this.deleteMany({
        expireAt: { $lt: new Date() }
    });
};

// 静态方法：发送系统通知
notificationSchema.statics.sendSystemNotification = async function(users, title, content, options = {}) {
    const notifications = users.map(userId => ({
        user: userId,
        type: 'system',
        title,
        content,
        priority: options.priority || 'normal',
        expireAt: options.expireAt,
        metadata: options.metadata
    }));

    return this.insertMany(notifications);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 