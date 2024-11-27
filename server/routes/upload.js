const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Image = require('../models/image');
const uploadUtil = require('../utils/upload');
const imageUtil = require('../utils/image');

// 上传单个图片
router.post('/image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的图片'
            });
        }

        // 处理图片（压缩、添加水印等）
        const processedImage = await imageUtil.processImage(req.file.path, {
            maxWidth: 1920,
            quality: 80,
            watermark: req.query.watermark !== 'false'
        });

        // 上传到OSS
        const result = await uploadUtil.uploadToOSS(processedImage, {
            folder: req.query.folder || 'images',
            filename: `${Date.now()}-${req.file.originalname}`
        });

        // 保存图片记录
        const image = await Image.create({
            filename: result.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: result.url,
            path: result.path,
            type: req.query.type || 'other',
            uploadedBy: req.user.userId
        });

        res.json({
            success: true,
            data: image
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传图片失败',
            error: error.message
        });
    }
});

// 上传多个图片
router.post('/images', auth, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files?.length) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的图片'
            });
        }

        const uploadPromises = req.files.map(async file => {
            // 处理图片
            const processedImage = await imageUtil.processImage(file.path, {
                maxWidth: 1920,
                quality: 80,
                watermark: req.query.watermark !== 'false'
            });

            // 上传到OSS
            const result = await uploadUtil.uploadToOSS(processedImage, {
                folder: req.query.folder || 'images',
                filename: `${Date.now()}-${file.originalname}`
            });

            // 创建图片记录
            return Image.create({
                filename: result.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                url: result.url,
                path: result.path,
                type: req.query.type || 'other',
                uploadedBy: req.user.userId
            });
        });

        const images = await Promise.all(uploadPromises);

        res.json({
            success: true,
            data: images
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '上传图片失败',
            error: error.message
        });
    }
});

// 删除图片
router.delete('/images/:id', auth, async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        
        if (!image) {
            return res.status(404).json({
                success: false,
                message: '图片不存在'
            });
        }

        // 检查权限
        if (image.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权删除此图片'
            });
        }

        // 从OSS删除文件
        await uploadUtil.deleteFromOSS(image.path);

        // 删除数据库记录
        await image.remove();

        res.json({
            success: true,
            message: '图片已删除'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除图片失败',
            error: error.message
        });
    }
});

// 获取上传历史
router.get('/history', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type
        } = req.query;

        const query = { uploadedBy: req.user.userId };
        if (type) query.type = type;

        const images = await Image.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Image.countDocuments(query);

        res.json({
            success: true,
            data: {
                images,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取上传历史失败',
            error: error.message
        });
    }
});

module.exports = router; 