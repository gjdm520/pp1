const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['verify', 'reset', 'refresh'],
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    expireAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 索引
tokenSchema.index({ token: 1 });
tokenSchema.index({ user: 1, type: 1 });

// 静态方法：生成验证码
tokenSchema.statics.generateVerifyCode = function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 静态方法：生成重置密码令牌
tokenSchema.statics.generateResetToken = function() {
    return require('crypto').randomBytes(32).toString('hex');
};

// 静态方法：创建验证码
tokenSchema.statics.createVerifyCode = async function(userId) {
    const code = this.generateVerifyCode();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期

    return this.create({
        user: userId,
        token: code,
        type: 'verify',
        expireAt
    });
};

// 静态方法：创建重置密码令牌
tokenSchema.statics.createResetToken = async function(userId) {
    const token = this.generateResetToken();
    const expireAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时有效期

    return this.create({
        user: userId,
        token,
        type: 'reset',
        expireAt
    });
};

// 静态方法：创建刷新令牌
tokenSchema.statics.createRefreshToken = async function(userId) {
    const token = this.generateResetToken();
    const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天有效期

    return this.create({
        user: userId,
        token,
        type: 'refresh',
        expireAt
    });
};

// 静态方法：验证并使用令牌
tokenSchema.statics.verifyAndUse = async function(token, type) {
    const tokenDoc = await this.findOne({
        token,
        type,
        used: false,
        expireAt: { $gt: new Date() }
    });

    if (!tokenDoc) {
        throw new Error('令牌无效或已过期');
    }

    tokenDoc.used = true;
    await tokenDoc.save();

    return tokenDoc;
};

// 静态方法：清理过期令牌
tokenSchema.statics.cleanExpired = async function() {
    return this.deleteMany({
        expireAt: { $lt: new Date() }
    });
};

// 实例方法：检查是否过期
tokenSchema.methods.isExpired = function() {
    return this.expireAt < new Date();
};

// 实例方法：使用令牌
tokenSchema.methods.use = async function() {
    if (this.used) {
        throw new Error('令牌已被使用');
    }
    if (this.isExpired()) {
        throw new Error('令牌已过期');
    }

    this.used = true;
    return this.save();
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token; 