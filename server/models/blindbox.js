const mongoose = require('mongoose');

const blindboxSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, '请选择盲盒类型'],
        enum: ['weekend', 'vacation', 'adventure']
    },
    name: {
        type: String,
        required: [true, '请输入盲盒名称'],
        trim: true,
        maxlength: [50, '名称不能超过50个字符']
    },
    description: {
        type: String,
        required: [true, '请输入盲盒描述'],
        maxlength: [1000, '描述不能超过1000个字符']
    },
    price: {
        type: Number,
        required: [true, '请输入价格'],
        min: [0, '价格不能小于0']
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
    destinations: [{
        spot: {
            type: mongoose.Schema.ObjectId,
            ref: 'Spot',
            required: [true, '请选择目的地']
        },
        probability: {
            type: Number,
            required: [true, '请设置抽中概率'],
            min: [0, '概率不能小于0'],
            max: [100, '概率不能大于100']
        }
    }],
    activities: [{
        name: String,
        description: String,
        duration: String
    }],
    includes: [{
        type: String,
        enum: ['hotel', 'flight', 'transport', 'guide', 'meals', 'tickets']
    }],
    excludes: [{
        type: String,
        trim: true
    }],
    notes: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'soldout'],
        default: 'active'
    },
    stock: {
        type: Number,
        min: [0, '库存不能小于0'],
        default: 0
    },
    soldCount: {
        type: Number,
        default: 0
    },
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
blindboxSchema.index({ type: 1, status: 1 });
blindboxSchema.index({ price: 1 });
blindboxSchema.index({ rating: -1 });
blindboxSchema.index({ soldCount: -1 });

// 虚拟字段：评价数
blindboxSchema.virtual('reviewCount', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'blindbox',
    count: true
});

// 更新时间中间件
blindboxSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 静态方法：随机抽取盲盒
blindboxSchema.statics.drawBox = async function(type) {
    const boxes = await this.find({ 
        type, 
        status: 'active',
        stock: { $gt: 0 }
    }).populate('destinations.spot');

    if (!boxes.length) {
        throw new Error('暂无可用盲盒');
    }

    // 根据概率抽取目的地
    const box = boxes[Math.floor(Math.random() * boxes.length)];
    const totalProb = box.destinations.reduce((sum, dest) => sum + dest.probability, 0);
    let random = Math.random() * totalProb;
    
    let selectedDest = null;
    for (const dest of box.destinations) {
        random -= dest.probability;
        if (random <= 0) {
            selectedDest = dest;
            break;
        }
    }

    return {
        box,
        destination: selectedDest
    };
};

// 实例方法：减少库存
blindboxSchema.methods.decreaseStock = async function(quantity = 1) {
    if (this.stock < quantity) {
        throw new Error('库存不足');
    }
    
    this.stock -= quantity;
    this.soldCount += quantity;
    
    if (this.stock === 0) {
        this.status = 'soldout';
    }
    
    return this.save();
};

const Blindbox = mongoose.model('Blindbox', blindboxSchema);

module.exports = Blindbox; 