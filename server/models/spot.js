const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '请输入景点名称'],
        trim: true,
        maxlength: [50, '景点名称不能超过50个字符']
    },
    description: {
        type: String,
        required: [true, '请输入景点描述'],
        maxlength: [2000, '描述不能超过2000个字符']
    },
    location: {
        city: {
            type: String,
            required: [true, '请输入所在城市']
        },
        province: {
            type: String,
            required: [true, '请输入所在省份']
        },
        address: {
            type: String,
            required: [true, '请输入详细地址']
        },
        coordinates: {
            type: [Number],
            required: [true, '请输入地理坐标'],
            index: '2dsphere'
        }
    },
    category: {
        type: String,
        required: [true, '请选择景点类型'],
        enum: ['natural', 'cultural', 'leisure', 'adventure']
    },
    price: {
        adult: {
            type: Number,
            required: [true, '请输入成人票价']
        },
        child: {
            type: Number,
            required: [true, '请输入儿童票价']
        },
        student: {
            type: Number,
            required: [true, '请输入学生票价']
        }
    },
    images: [{
        url: String,
        caption: String,
        isMain: Boolean
    }],
    openingHours: {
        type: String,
        required: [true, '请输入开放时间']
    },
    contactPhone: {
        type: String,
        required: [true, '请输入联系电话']
    },
    features: [{
        type: String,
        enum: ['parking', 'restaurant', 'wifi', 'toilet', 'guide']
    }],
    recommendedDuration: {
        type: String,
        required: [true, '请输入建议游玩时长']
    },
    bestSeasons: [{
        type: String,
        enum: ['spring', 'summer', 'autumn', 'winter']
    }],
    rating: {
        type: Number,
        min: [0, '评分不能低于0'],
        max: [5, '评分不能高于5'],
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    visitCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'closed'],
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
spotSchema.index({ name: 'text', description: 'text' });
spotSchema.index({ 'location.city': 1, 'location.province': 1 });
spotSchema.index({ category: 1, status: 1 });
spotSchema.index({ rating: -1 });

// 虚拟字段：评论数
spotSchema.virtual('reviewCount', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'spot',
    count: true
});

// 虚拟字段：收藏数
spotSchema.virtual('favoriteCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'favorites',
    count: true
});

// 更新时间中间件
spotSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 静态方法：搜索景点
spotSchema.statics.search = async function(query) {
    return this.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
};

// 实例方法：增加访问量
spotSchema.methods.incrementVisitCount = async function() {
    this.visitCount += 1;
    return this.save();
};

const Spot = mongoose.model('Spot', spotSchema);

module.exports = Spot; 