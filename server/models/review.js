const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '评价必须关联用户']
    },
    spot: {
        type: mongoose.Schema.ObjectId,
        ref: 'Spot',
        required: [true, '评价必须关联景点']
    },
    rating: {
        type: Number,
        required: [true, '请给出评分'],
        min: [1, '评分不能低于1分'],
        max: [5, '评分不能高于5分']
    },
    content: {
        type: String,
        required: [true, '请填写评价内容'],
        trim: true,
        maxlength: [1000, '评价内容不能超过1000个字符']
    },
    images: [{
        url: String,
        caption: String
    }],
    visitDate: {
        type: Date,
        required: [true, '请选择游玩日期']
    },
    travelType: {
        type: String,
        enum: ['family', 'friends', 'couple', 'business', 'solo'],
        required: [true, '请选择出行类型']
    },
    pros: [{
        type: String,
        trim: true
    }],
    cons: [{
        type: String,
        trim: true
    }],
    tips: {
        type: String,
        trim: true,
        maxlength: [500, '建议不能超过500个字符']
    },
    likeCount: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    replyFromBusiness: {
        content: String,
        repliedAt: Date,
        repliedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
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
reviewSchema.index({ spot: 1, user: 1 }, { unique: true });
reviewSchema.index({ spot: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

// 虚拟字段：评论数
reviewSchema.virtual('commentCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'review',
    count: true
});

// 更新时间中间件
reviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 静态方法：计算景点平均评分
reviewSchema.statics.calcAverageRating = async function(spotId) {
    const stats = await this.aggregate([
        {
            $match: { spot: spotId }
        },
        {
            $group: {
                _id: '$spot',
                avgRating: { $avg: '$rating' },
                ratingCount: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await mongoose.model('Spot').findByIdAndUpdate(spotId, {
            rating: Math.round(stats[0].avgRating * 10) / 10,
            ratingCount: stats[0].ratingCount
        });
    } else {
        await mongoose.model('Spot').findByIdAndUpdate(spotId, {
            rating: 0,
            ratingCount: 0
        });
    }
};

// 保存后更新景点评分
reviewSchema.post('save', function() {
    this.constructor.calcAverageRating(this.spot);
});

// 删除后更新景点评分
reviewSchema.post('remove', function() {
    this.constructor.calcAverageRating(this.spot);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 