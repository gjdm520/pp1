const Joi = require('joi');
const { BadRequestError } = require('../utils/errors');

// 通用验证中间件
exports.validate = (schema) => {
    return (req, res, next) => {
        const validationOptions = {
            abortEarly: false,  // 返回所有错误
            allowUnknown: true, // 允许未知字段
            stripUnknown: true  // 删除未知字段
        };

        const { error, value } = schema.validate(req.body, validationOptions);
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.badRequest('参数验证失败', errors);
        }

        // 用验证后的值替换请求体
        req.body = value;
        next();
    };
};

// 常用验证规则
exports.rules = {
    id: Joi.string().hex().length(24),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
    password: Joi.string().min(6).max(30),
    date: Joi.date().iso(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    url: Joi.string().uri(),
    boolean: Joi.boolean(),
    array: Joi.array(),
    object: Joi.object()
};

// 用户相关验证
exports.userSchemas = {
    register: Joi.object({
        phone: exports.rules.phone.required(),
        password: exports.rules.password.required(),
        email: exports.rules.email,
        nickname: Joi.string().min(2).max(20),
        verifyCode: Joi.string().length(6).required()
    }),

    login: Joi.object({
        username: Joi.alternatives().try(
            exports.rules.phone,
            exports.rules.email
        ).required(),
        password: exports.rules.password.required(),
        remember: exports.rules.boolean
    }),

    updateProfile: Joi.object({
        nickname: Joi.string().min(2).max(20),
        avatar: exports.rules.url,
        email: exports.rules.email,
        bio: Joi.string().max(200)
    })
};

// 攻略相关验证
exports.guideSchemas = {
    create: Joi.object({
        title: Joi.string().min(5).max(100).required(),
        content: Joi.string().min(100).required(),
        summary: Joi.string().max(500),
        category: Joi.string().valid(
            'domestic', 
            'overseas', 
            'roadtrip', 
            'family', 
            'honeymoon', 
            'food'
        ).required(),
        duration: Joi.object({
            days: Joi.number().integer().min(1).required(),
            nights: Joi.number().integer().min(0).required()
        }).required(),
        budget: Joi.object({
            min: Joi.number().min(0).required(),
            max: Joi.number().min(0).required(),
            currency: Joi.string().default('CNY')
        }).required(),
        destinations: Joi.array().items(
            Joi.object({
                spot: exports.rules.id.required(),
                duration: Joi.number().min(0.5),
                description: Joi.string().max(500),
                tips: Joi.string().max(500)
            })
        ).min(1).required()
    }),

    update: Joi.object({
        title: Joi.string().min(5).max(100),
        content: Joi.string().min(100),
        summary: Joi.string().max(500),
        category: Joi.string().valid(
            'domestic', 
            'overseas', 
            'roadtrip', 
            'family', 
            'honeymoon', 
            'food'
        ),
        duration: Joi.object({
            days: Joi.number().integer().min(1),
            nights: Joi.number().integer().min(0)
        }),
        budget: Joi.object({
            min: Joi.number().min(0),
            max: Joi.number().min(0),
            currency: Joi.string()
        }),
        destinations: Joi.array().items(
            Joi.object({
                spot: exports.rules.id,
                duration: Joi.number().min(0.5),
                description: Joi.string().max(500),
                tips: Joi.string().max(500)
            })
        ).min(1)
    })
};

// 评论相关验证
exports.commentSchemas = {
    create: Joi.object({
        content: Joi.string().min(1).max(500).required(),
        parentComment: exports.rules.id,
        review: exports.rules.id,
        guide: exports.rules.id
    }).xor('review', 'guide')
};

// 订单相关验证
exports.orderSchemas = {
    create: Joi.object({
        type: Joi.string().valid('spot', 'blindbox').required(),
        spotId: Joi.when('type', {
            is: 'spot',
            then: exports.rules.id.required()
        }),
        blindboxId: Joi.when('type', {
            is: 'blindbox',
            then: exports.rules.id.required()
        }),
        quantity: Joi.number().integer().min(1).max(10).required(),
        visitDate: exports.rules.date.required(),
        contactName: Joi.string().required(),
        contactPhone: exports.rules.phone.required(),
        remark: Joi.string().max(200)
    })
};

module.exports = {
    validate: exports.validate,
    rules: exports.rules,
    userSchemas: exports.userSchemas,
    guideSchemas: exports.guideSchemas,
    commentSchemas: exports.commentSchemas,
    orderSchemas: exports.orderSchemas
}; 