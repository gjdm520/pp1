const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Token = require('../models/token');
const { auth } = require('../middleware/auth');

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { phone, password } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该手机号已被注册'
            });
        }

        // 创建新用户
        const user = new User({
            phone,
            password,
            nickname: `用户${Math.floor(Math.random() * 10000)}`
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: '注册成功'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '注册失败',
            error: error.message
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({
            $or: [{ phone: username }, { email: username }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 生成Token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 生成刷新Token
        const refreshToken = await Token.createRefreshToken(user._id);

        // 更新最后登录时间
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                refreshToken: refreshToken.token,
                user: {
                    id: user._id,
                    nickname: user.nickname,
                    avatar: user.avatar,
                    phone: user.phone,
                    email: user.email
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '登录失败',
            error: error.message
        });
    }
});

// 发送验证码
router.post('/verify-code', async (req, res) => {
    try {
        const { phone } = req.body;

        // 检查是否频繁发送
        const recentToken = await Token.findOne({
            user: phone,
            type: 'verify',
            createdAt: { $gt: new Date(Date.now() - 60000) } // 1分钟内
        });

        if (recentToken) {
            return res.status(429).json({
                success: false,
                message: '请稍后再试'
            });
        }

        // 生成验证码
        const verifyToken = await Token.createVerifyCode(phone);

        // TODO: 调用短信服务发送验证码
        console.log('验证码:', verifyToken.token);

        res.json({
            success: true,
            message: '验证码已发送'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '发送失败',
            error: error.message
        });
    }
});

// 刷新Token
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // 验证刷新Token
        const tokenDoc = await Token.verifyAndUse(refreshToken, 'refresh');
        if (!tokenDoc) {
            return res.status(401).json({
                success: false,
                message: '无效的刷新Token'
            });
        }

        // 生成新的访问Token
        const newToken = jwt.sign(
            { userId: tokenDoc.user },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 生成新的刷新Token
        const newRefreshToken = await Token.createRefreshToken(tokenDoc.user);

        res.json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken.token
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '刷新Token失败',
            error: error.message
        });
    }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('favorites');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取用户信息失败',
            error: error.message
        });
    }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['nickname', 'avatar', 'email'];
        
        // 过滤不允许的更新字段
        Object.keys(updates).forEach(key => {
            if (!allowedUpdates.includes(key)) {
                delete updates[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新失败',
            error: error.message
        });
    }
});

module.exports = router; 