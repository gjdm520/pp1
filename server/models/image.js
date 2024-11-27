const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: [true, '请提供文件名']
    },
    originalname: {
        type: String,
        required: [true, '请提供原始文件名']
    },
    mimetype: {
        type: String,
        required: [true, '请提供文件类型']
    },
    size: {
        type: Number,
        required: [true, '请提供文件大小']
    },
    url: {
        type: String,
        required: [true, '请提供访问URL']
    },
    path: {
        type: String,
        required: [true, '请提供存储路径']
    },
    type: {
        type: String,
        enum: ['spot', 'guide', 'review', 'avatar'],
        required: [true, '请指定图片类型']
    },
    refId: {
        type: mongoose.Schema.ObjectId,
        refPath: 'refModel',
        required: [true, '请指定关联ID']
    },
    refModel: {
        type: String,
        required: [true, '请指定关联模型'],
        enum: ['Spot', 'Guide', 'Review', 'User']
    },
    uploadedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '请指定上传用户']
    },
    isMain: {
        type: Boolean,
        default: false
    },
    caption: String,
    status: {
        type: String,
        enum: ['pending', 'active', 'deleted'],
        default: 'active'
    },
    metadata: {
        width: Number,
        height: Number,
        format: String,
        exif: Object
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 索引
imageSchema.index({ refId: 1, type: 1 });
imageSchema.index({ uploadedBy: 1, createdAt: -1 });
imageSchema.index({ status: 1 });

// 静态方法：设置主图
imageSchema.statics.setMainImage = async function(refId, imageId) {
    // 先取消当前的主图
    await this.updateMany(
        { refId, isMain: true },
        { isMain: false }
    );
    
    // 设置新的主图
    return this.findByIdAndUpdate(imageId, { isMain: true });
};

// 静态方法：批量删除
imageSchema.statics.batchDelete = async function(imageIds) {
    return this.updateMany(
        { _id: { $in: imageIds } },
        { status: 'deleted' }
    );
};

// 静态方法：获取实体的所有图片
imageSchema.statics.getEntityImages = async function(refId, type) {
    return this.find({
        refId,
        type,
        status: 'active'
    }).sort({ isMain: -1, createdAt: -1 });
};

// 实例方法：软删除
imageSchema.methods.softDelete = async function() {
    this.status = 'deleted';
    return this.save();
};

// 实例方法：更新元数据
imageSchema.methods.updateMetadata = async function(metadata) {
    this.metadata = {
        ...this.metadata,
        ...metadata
    };
    return this.save();
};

// 中间件：删除文件
imageSchema.pre('remove', async function(next) {
    try {
        // 这里可以添加删除实际文件的逻辑
        // 比如从OSS或本地文件系统删除
        next();
    } catch (error) {
        next(error);
    }
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image; 