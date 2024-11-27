const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, '请输入手机号'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^1[3-9]\d{9}$/.test(v);
            },
            message: '请输入正确的手机号'
        }
    },
    password: {
        type: String,
        required: [true, '请输入密码'],
        minlength: [8, '密码长度不能小于8位'],
        select: false
    },
    nickname: {
        type: String,
        trim: true,
        maxlength: [20, '昵称长度不能超过20个字符']
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    email: {
        type: String,
        validate: [validator.isEmail, '请输入正确的邮箱地址']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    favorites: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Spot'
    }],
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

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 生成验证码方法
userSchema.methods.generateVerifyCode = function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 虚拟字段：评论数
userSchema.virtual('reviewCount', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'user',
    count: true
});

// 虚拟字段：收藏数
userSchema.virtual('favoriteCount', {
    ref: 'Spot',
    localField: 'favorites',
    foreignField: '_id',
    count: true
});

const User = mongoose.model('User', userSchema);

module.exports = User; 