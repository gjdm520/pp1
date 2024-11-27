const Joi = require('joi');
const response = require('../utils/response');

// 创建验证中间件
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));
            return response.validationError(res, errors);
        }

        next();
    };
};

// 通用验证规则
const rules = {
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
const userSchemas = {
    // 注册验证
    register: Joi.object({
        phone: rules.phone.required(),
        password: rules.password.required(),
        email: rules.email,
        nickname: Joi.string().min(2).max(20),
        verifyCode: Joi.string().length(6).required()
    }),

    // 登录验证
    login: Joi.object({
        username: Joi.alternatives().try(rules.phone, rules.email).required(),
        password: rules.password.required(),
        remember: rules.boolean
    }),

    // 更新个人信息验证
    updateProfile: Joi.object({
        nickname: Joi.string().min(2).max(20),
        avatar: rules.url,
        email: rules.email,
        gender: Joi.string().valid('male', 'female', 'other'),
        birthday: rules.date,
        location: Joi.string().max(100)
    }),

    // 修改密码验证
    changePassword: Joi.object({
        oldPassword: rules.password.required(),
        newPassword: rules.password.required(),
        confirmPassword: Joi.ref('newPassword')
    })
};

// 评论相关验证
const commentSchemas = {
    // 创建评论验证
    create: Joi.object({
        content: Joi.string().min(1).max(500).required(),
        parentId: rules.id,
        resourceType: Joi.string().valid('spot', 'guide', 'review').required(),
        resourceId: rules.id.required()
    }),

    // 更新评论验证
    update: Joi.object({
        content: Joi.string().min(1).max(500).required()
    })
};

// 评价相关验证
const reviewSchemas = {
    // 创建评价验证
    create: Joi.object({
        spotId: rules.id.required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        content: Joi.string().min(10).max(1000).required(),
        images: Joi.array().items(rules.url).max(9),
        tags: Joi.array().items(Joi.string()).max(5),
        visitDate: rules.date.required()
    }),

    // 更新评价验证
    update: Joi.object({
        rating: Joi.number().integer().min(1).max(5),
        content: Joi.string().min(10).max(1000),
        images: Joi.array().items(rules.url).max(9),
        tags: Joi.array().items(Joi.string()).max(5)
    })
};

// 订单相关验证
const orderSchemas = {
    // 创建订单验证
    create: Joi.object({
        type: Joi.string().valid('spot', 'blindbox').required(),
        spotId: Joi.when('type', {
            is: 'spot',
            then: rules.id.required()
        }),
        blindboxId: Joi.when('type', {
            is: 'blindbox',
            then: rules.id.required()
        }),
        quantity: Joi.number().integer().min(1).max(10).required(),
        visitDate: rules.date.required(),
        contactName: Joi.string().required(),
        contactPhone: rules.phone.required(),
        remark: Joi.string().max(200)
    }),

    // 更新订单验证
    update: Joi.object({
        visitDate: rules.date,
        quantity: Joi.number().integer().min(1).max(10),
        contactName: Joi.string(),
        contactPhone: rules.phone,
        remark: Joi.string().max(200)
    })
};

// 导出验证中间件和验证规则
module.exports = {
    validate,
    rules,
    schemas: {
        user: userSchemas,
        comment: commentSchemas,
        review: reviewSchemas,
        order: orderSchemas
    }
}; 