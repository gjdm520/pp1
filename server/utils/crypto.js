const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 生成随机字符串
exports.generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// 生成随机数字
exports.generateRandomNumber = (length = 6) => {
    return Math.random().toString().slice(2, 2 + length);
};

// 生成盐值
exports.generateSalt = async (rounds = 10) => {
    return await bcrypt.genSalt(rounds);
};

// 密码加密
exports.hashPassword = async (password) => {
    const salt = await this.generateSalt();
    return await bcrypt.hash(password, salt);
};

// 密码比对
exports.comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// 生成JWT令牌
exports.generateToken = (payload, options = {}) => {
    const { 
        expiresIn = '7d',
        secret = process.env.JWT_SECRET
    } = options;

    return jwt.sign(payload, secret, { expiresIn });
};

// 验证JWT令牌
exports.verifyToken = (token, options = {}) => {
    const { secret = process.env.JWT_SECRET } = options;
    
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

// MD5加密
exports.md5 = (text) => {
    return crypto.createHash('md5')
        .update(text)
        .digest('hex');
};

// SHA256加密
exports.sha256 = (text) => {
    return crypto.createHash('sha256')
        .update(text)
        .digest('hex');
};

// AES加密
exports.aesEncrypt = (text, key = process.env.CRYPTO_KEY) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        content: encrypted,
        authTag: authTag.toString('hex')
    };
};

// AES解密
exports.aesDecrypt = (encrypted, key = process.env.CRYPTO_KEY) => {
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(key),
            Buffer.from(encrypted.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        return null;
    }
};

// 生成RSA密钥对
exports.generateKeyPair = () => {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
};

// RSA公钥加密
exports.rsaEncrypt = (text, publicKey) => {
    const buffer = Buffer.from(text);
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
};

// RSA私钥解密
exports.rsaDecrypt = (encrypted, privateKey) => {
    try {
        const buffer = Buffer.from(encrypted, 'base64');
        const decrypted = crypto.privateDecrypt(privateKey, buffer);
        return decrypted.toString('utf8');
    } catch (error) {
        return null;
    }
};

// 生成HMAC签名
exports.generateHmac = (text, secret = process.env.HMAC_SECRET) => {
    return crypto.createHmac('sha256', secret)
        .update(text)
        .digest('hex');
};

// 验证HMAC签名
exports.verifyHmac = (text, hmac, secret = process.env.HMAC_SECRET) => {
    const calculatedHmac = this.generateHmac(text, secret);
    return crypto.timingSafeEqual(
        Buffer.from(calculatedHmac),
        Buffer.from(hmac)
    );
};

// 生成UUID
exports.generateUUID = () => {
    return crypto.randomUUID();
};

// 生成安全的随机数
exports.generateSecureRandom = (min, max) => {
    const range = max - min;
    const bytes = Math.ceil(Math.log2(range) / 8);
    const maxNum = Math.pow(256, bytes);
    const maxRange = maxNum - (maxNum % range);
    
    let randomNum;
    do {
        randomNum = parseInt(crypto.randomBytes(bytes).toString('hex'), 16);
    } while (randomNum >= maxRange);
    
    return min + (randomNum % range);
}; 