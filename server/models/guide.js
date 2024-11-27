const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, '请输入攻略标题'],
        trim: true,
        maxlength: [100, '标题不能超过100个字符']
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '请指定作者']
    },
    content: {
        type: String,
        required: [true, '请输入攻略内容'],
        maxlength: [50000, '内容不能超过50000个字符']
    },
    summary: {
        type: String,
        required: [true, '请输入攻略简介'],
        maxlength: [500, '简介不能超过500个字符']
    },
    category: {
        type: String,
        required: [true, '请选择攻略类型'],
        enum: ['domestic', 'overseas', 'roadtrip', 'family', 'honeymoon', 'food']
    },
    duration: {
        days: {
            type: Number,
            required: [true, '请输入行程天数'],
            min: [1, '行程天数不能小于1天']
        },
        nights: {
            type: Number,
            required: [true, '请输入行程晚数']
        }
    },
    budget: {
        min: {
            type: Number,
            required: [true, '请输入最低预算']
        },
        max: {
            type: Number,
            required: [true, '请输入最高预算']
        },
        currency: {
            type: String,
            default: 'CNY'
        }
    },
    bestSeasons: [{
        type: String,
        enum: ['spring', 'summer', 'autumn', 'winter']
    }],
    destinations: [{
        spot: {
            type: mongoose.Schema.ObjectId,
            ref: 'Spot'
        },
        dayNumber: Number,
        duration: String,
        description: String
    }],
    tips: [{
        category: {
            type: String,
            enum: ['traffic', 'accommodation', 'food', 'shopping', 'other']
        },
        content: String
    }],
    images: [{
        url: String,
        caption: String,
        isMain: Boolean
    }],
    tags: [{
        type: String,
        trim: true
    }],
    viewCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
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
guideSchema.index({ title: 'text', content: 'text', summary: 'text' });
guideSchema.index({ category: 1, status: 1 });
guideSchema.index({ author: 1, status: 1 });
guideSchema.index({ 'destinations.spot': 1 });
guideSchema.index({ viewCount: -1 });
guideSchema.index({ likeCount: -1 });

// 虚拟字段：评论数
guideSchema.virtual('commentCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'guide',
    count: true
});

// 更新时间中间件
guideSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 静态方法：搜索攻略
guideSchema.statics.search = async function(query) {
    return this.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
};

// 实例方法：增加访问量
guideSchema.methods.incrementViewCount = async function() {
    this.viewCount += 1;
    return this.save();
};

// 实例方法：增加点赞数
guideSchema.methods.incrementLikeCount = async function() {
    this.likeCount += 1;
    return this.save();
};

// 实例方法：减少点赞数
guideSchema.methods.decrementLikeCount = async function() {
    if (this.likeCount > 0) {
        this.likeCount -= 1;
        return this.save();
    }
    return this;
};

const Guide = mongoose.model('Guide', guideSchema);

module.exports = Guide; 