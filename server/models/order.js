const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNo: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, '订单必须关联用户']
    },
    type: {
        type: String,
        enum: ['spot', 'blindbox'],
        required: [true, '请选择订单类型']
    },
    spot: {
        type: mongoose.Schema.ObjectId,
        ref: 'Spot'
    },
    blindbox: {
        type: mongoose.Schema.ObjectId,
        ref: 'Blindbox'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: [true, '请输入订单金额']
    },
    quantity: {
        type: Number,
        required: [true, '请输入购买数量'],
        min: [1, '数量不能小于1']
    },
    visitDate: {
        type: Date,
        required: [true, '请选择游玩日期']
    },
    contactName: {
        type: String,
        required: [true, '请输入联系人姓名']
    },
    contactPhone: {
        type: String,
        required: [true, '请输入联系电话']
    },
    visitors: [{
        name: String,
        idType: {
            type: String,
            enum: ['id', 'passport']
        },
        idNumber: String
    }],
    payment: {
        method: {
            type: String,
            enum: ['wechat', 'alipay', 'card']
        },
        transactionId: String,
        paidAt: Date
    },
    refund: {
        amount: Number,
        reason: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed']
        },
        refundedAt: Date
    },
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 索引
orderSchema.index({ orderNo: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ visitDate: 1 });

// 生成订单号
orderSchema.pre('save', async function(next) {
    if (this.isNew) {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNo = `${year}${month}${day}${random}`;
    }
    next();
});

// 更新时间中间件
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// 虚拟字段：订单状态文本
orderSchema.virtual('statusText').get(function() {
    const statusMap = {
        pending: '待支付',
        paid: '已支付',
        confirmed: '已确认',
        completed: '已完成',
        cancelled: '已取消',
        refunded: '已退款'
    };
    return statusMap[this.status];
});

// 实例方法：取消订单
orderSchema.methods.cancel = async function() {
    if (this.status !== 'pending') {
        throw new Error('只能取消待支付的订单');
    }
    this.status = 'cancelled';
    return this.save();
};

// 实例方法：申请退款
orderSchema.methods.requestRefund = async function(reason) {
    if (this.status !== 'paid' && this.status !== 'confirmed') {
        throw new Error('当前订单状态不可申请退款');
    }
    this.refund = {
        amount: this.amount,
        reason,
        status: 'pending'
    };
    return this.save();
};

// 实例方法：确认支付
orderSchema.methods.confirmPayment = async function(paymentData) {
    if (this.status !== 'pending') {
        throw new Error('订单状态错误');
    }
    this.status = 'paid';
    this.payment = {
        ...paymentData,
        paidAt: new Date()
    };
    return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 