const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 根据文件类型创建子目录
        let subDir = 'others';
        if (file.mimetype.startsWith('image/')) {
            subDir = 'images';
        } else if (file.mimetype.startsWith('video/')) {
            subDir = 'videos';
        }

        const targetDir = path.join(uploadDir, subDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        cb(null, targetDir);
    },
    filename: function(req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = {
        'image/jpeg': true,
        'image/png': true,
        'image/gif': true,
        'image/webp': true,
        'video/mp4': true,
        'video/webm': true
    };

    if (allowedTypes[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'), false);
    }
};

// 创建multer实例
exports.upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 默认5MB
        files: 5 // 最多同时上传5个文件
    }
});

// 错误处理中间件
exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '文件大小超出限制'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: '文件数量超出限制'
            });
        }
    }

    if (err.message === '不支持的文件类型') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
};

// 图片处理中间件
exports.processImage = async (req, res, next) => {
    if (!req.file && !req.files) return next();

    try {
        const sharp = require('sharp');
        const files = req.files || [req.file];

        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) continue;

            const image = sharp(file.path);
            const metadata = await image.metadata();

            // 调整图片大小
            if (metadata.width > 1920) {
                await image
                    .resize(1920, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .toFile(file.path + '_resized');

                fs.unlinkSync(file.path);
                fs.renameSync(file.path + '_resized', file.path);
            }

            // 添加水印
            if (req.query.watermark !== 'false') {
                await image
                    .composite([{
                        input: path.join(__dirname, '../../public/images/watermark.png'),
                        gravity: 'southeast',
                        blend: 'over'
                    }])
                    .toFile(file.path + '_watermarked');

                fs.unlinkSync(file.path);
                fs.renameSync(file.path + '_watermarked', file.path);
            }

            // 保存元数据
            file.metadata = metadata;
        }

        next();

    } catch (error) {
        next(error);
    }
};

// 清理临时文件中间件
exports.cleanupOnError = (err, req, res, next) => {
    if (req.file) {
        fs.unlinkSync(req.file.path);
    }
    if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
    }
    next(err);
}; 