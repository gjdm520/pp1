const path = require('path');

// 配置
const config = {
    // 应用配置
    app: {
        debug: process.env.APP_DEBUG === 'true'
    },

    // 数据库配置
    database: {
        uri: process.env.DATABASE_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },

    // JWT配置
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    },

    // 邮件配置
    mail: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        },
        from: process.env.MAIL_FROM || '探索旅途 <no-reply@example.com>'
    },

    // 短信配置
    sms: {
        accessKeyId: process.env.SMS_ACCESS_KEY_ID,
        accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
        signName: process.env.SMS_SIGN_NAME,
        templateCode: process.env.SMS_TEMPLATE_CODE
    },

    // 支付配置
    payment: {
        // 微信支付
        wxpay: {
            appId: process.env.WXPAY_APP_ID,
            mchId: process.env.WXPAY_MCH_ID,
            apiKey: process.env.WXPAY_API_KEY,
            certPath: process.env.WXPAY_CERT_PATH,
            notifyUrl: process.env.WXPAY_NOTIFY_URL
        },
        // 支付宝
        alipay: {
            appId: process.env.ALIPAY_APP_ID,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            publicKey: process.env.ALIPAY_PUBLIC_KEY,
            notifyUrl: process.env.ALIPAY_NOTIFY_URL
        }
    },

    // 高德地图配置
    amap: {
        key: process.env.AMAP_KEY,
        secretKey: process.env.AMAP_SECRET_KEY
    },

    // 和风天气配置
    weather: {
        key: process.env.WEATHER_KEY
    },

    // 日志配置
    log: {
        dir: path.join(__dirname, '../../logs'),
        level: process.env.LOG_LEVEL || 'info',
        maxFiles: process.env.LOG_MAX_FILES || '30d',
        maxSize: process.env.LOG_MAX_SIZE || '20m'
    },

    // 缓存配置
    cache: {
        ttl: parseInt(process.env.CACHE_TTL) || 3600,
        prefix: process.env.CACHE_PREFIX || 'cache:'
    },

    // 安全配置
    security: {
        // CORS配置
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: process.env.CORS_CREDENTIALS === 'true'
        },
        // 限流配置
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100
        },
        // 密码加密
        bcrypt: {
            saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
        }
    },

    // 第三方登录配置
    oauth: {
        // 微信登录
        wechat: {
            appId: process.env.WECHAT_APP_ID,
            appSecret: process.env.WECHAT_APP_SECRET
        },
        // QQ登录
        qq: {
            appId: process.env.QQ_APP_ID,
            appKey: process.env.QQ_APP_KEY
        }
    }
};

// 根据环境加载特定配置
const envConfig = {
    development: {
        app: {
            debug: true
        }
    },
    production: {
        app: {
            debug: false
        }
    },
    test: {
        app: {
            debug: true
        },
        database: {
            uri: process.env.MONGODB_TEST_URI
        }
    }
};

// 合并环境配置
const currentEnv = process.env.NODE_ENV || 'development';
Object.assign(config, envConfig[currentEnv] || {});

// 验证必要的配置项
const validateConfig = () => {
    const required = [
        'jwt.secret',
        'database.uri',
        'mail.host',
        'mail.user',
        'mail.pass'
    ];

    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
        return !value;
    });

    if (missing.length) {
        throw new Error(`Missing required config: ${missing.join(', ')}`);
    }
};

// 导出配置
module.exports = {
    ...config,
    validateConfig
}; 