const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '评论必须关联用户']
    },
    content: {
        type: String,
        required: [true, '请填写评论内容'],
        trim: true,
        maxlength: [500, '评论内容不能超过500个字符']
    },
    // 评论可以关联到景点评价或旅游攻略
    review: {
        type: mongoose.Schema.ObjectId,
        ref: 'Review'
    },
    guide: {
        type: mongoose.Schema.ObjectId,
        ref: 'Guide'
    },
    // 支持回复其他评论
    parentComment: {
        type: mongoose.Schema.ObjectId,
        ref: 'Comment'
    },
    likeCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'hidden', 'deleted'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 索引
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ review: 1, createdAt: -1 });
commentSchema.index({ guide: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// 虚拟字段：回复数
commentSchema.virtual('replyCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment',
    count: true
});

// 更新时间中间件
commentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 实例方法：增加点赞数
commentSchema.methods.incrementLikeCount = async function() {
    this.likeCount += 1;
    return this.save();
};

// 实例方法：减少点赞数
commentSchema.methods.decrementLikeCount = async function() {
    if (this.likeCount > 0) {
        this.likeCount -= 1;
        return this.save();
    }
    return this;
};

// 静态方法：获取评论树
commentSchema.statics.getCommentTree = async function(parentId = null, maxDepth = 3) {
    const comments = await this.find({ parentComment: parentId })
        .populate('user', 'nickname avatar')
        .sort('-createdAt');

    if (maxDepth <= 0) return comments;

    for (let comment of comments) {
        comment.replies = await this.getCommentTree(comment._id, maxDepth - 1);
    }

    return comments;
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 