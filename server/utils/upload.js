const OSS = require('ali-oss');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

// 创建OSS客户端
const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET
});

// 处理图片并上传到OSS
exports.uploadImage = async (file, options = {}) => {
    try {
        const { 
            width, 
            height, 
            quality = 80,
            format = 'jpeg',
            watermark = true,
            folder = 'images'
        } = options;

        // 读取图片
        let image = sharp(file.path);

        // 获取图片信息
        const metadata = await image.metadata();

        // 调整图片大小
        if (width || height) {
            image = image.resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // 添加水印
        if (watermark) {
            const watermarkPath = path.join(__dirname, '../../public/images/watermark.png');
            image = image.composite([{
                input: watermarkPath,
                gravity: 'southeast'
            }]);
        }

        // 转换格式和压缩
        image = image.toFormat(format, { quality });

        // 生成文件名
        const filename = `${folder}/${uuidv4()}.${format}`;
        
        // 处理后的图片buffer
        const buffer = await image.toBuffer();

        // 上传到OSS
        const result = await client.put(filename, buffer);

        // 删除临时文件
        await promisify(fs.unlink)(file.path);

        return {
            success: true,
            url: result.url,
            filename,
            size: buffer.length,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        };

    } catch (error) {
        console.error('图片上传失败:', error);
        // 删除临时文件
        if (file.path && fs.existsSync(file.path)) {
            await promisify(fs.unlink)(file.path);
        }
        return {
            success: false,
            message: error.message
        };
    }
};

// 上传普通文件到OSS
exports.uploadFile = async (file, folder = 'files') => {
    try {
        // 生成文件名
        const ext = path.extname(file.originalname);
        const filename = `${folder}/${uuidv4()}${ext}`;

        // 上传到OSS
        const result = await client.put(filename, file.path);

        // 删除临时文件
        await promisify(fs.unlink)(file.path);

        return {
            success: true,
            url: result.url,
            filename,
            size: file.size
        };

    } catch (error) {
        console.error('文件上传失败:', error);
        // 删除临时文件
        if (file.path && fs.existsSync(file.path)) {
            await promisify(fs.unlink)(file.path);
        }
        return {
            success: false,
            message: error.message
        };
    }
};

// 从OSS删除文件
exports.deleteFile = async (filename) => {
    try {
        await client.delete(filename);
        return {
            success: true
        };
    } catch (error) {
        console.error('文件删除失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 生成OSS临时访问链接
exports.generateSignedUrl = async (filename, expires = 3600) => {
    try {
        const url = await client.signatureUrl(filename, {
            expires
        });
        return {
            success: true,
            url
        };
    } catch (error) {
        console.error('生成临时访问链接失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 批量删除文件
exports.deleteFiles = async (filenames) => {
    try {
        await client.deleteMulti(filenames);
        return {
            success: true
        };
    } catch (error) {
        console.error('批量删除文件失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 检查文件是否存在
exports.fileExists = async (filename) => {
    try {
        await client.head(filename);
        return true;
    } catch (error) {
        return false;
    }
};

// 获取文件元信息
exports.getFileInfo = async (filename) => {
    try {
        const result = await client.head(filename);
        return {
            success: true,
            data: result.res.headers
        };
    } catch (error) {
        console.error('获取文件信息失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}; 