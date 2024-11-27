const nodemailer = require('nodemailer');

// 创建邮件发送器
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// 发送验证码邮件
exports.sendVerifyCode = async (email, code) => {
    const mailOptions = {
        from: `"探索旅途" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '验证码 - 探索旅途',
        html: `
            <div style="padding: 20px; background: #f5f5f5;">
                <h2 style="color: #333;">您好！</h2>
                <p>您的验证码是：<strong style="color: #3498db; font-size: 20px;">${code}</strong></p>
                <p>验证码有效期为10分钟，请尽快使用。</p>
                <p style="color: #666; margin-top: 20px;">如果这不是您的操作，请忽略此邮件。</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// 发送密码重置邮件
exports.sendResetPassword = async (email, token) => {
    const resetLink = `${process.env.WEBSITE_URL}/auth/reset-password?token=${token}`;
    
    const mailOptions = {
        from: `"探索旅途" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '重置密码 - 探索旅途',
        html: `
            <div style="padding: 20px; background: #f5f5f5;">
                <h2 style="color: #333;">密码重置请求</h2>
                <p>您收到此邮件是因为您（或其他人）请求重置密码。</p>
                <p>请点击下面的链接重置密码：</p>
                <a href="${resetLink}" 
                   style="display: inline-block; 
                          padding: 10px 20px; 
                          background: #3498db; 
                          color: white; 
                          text-decoration: none; 
                          border-radius: 4px;
                          margin: 20px 0;">
                    重置密码
                </a>
                <p>此链接将在1小时后失效。</p>
                <p style="color: #666;">如果这不是您的操作，请忽略此邮件。</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// 发送订单确认邮件
exports.sendOrderConfirmation = async (email, order) => {
    const mailOptions = {
        from: `"探索旅途" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '订单确认 - 探索旅途',
        html: `
            <div style="padding: 20px; background: #f5f5f5;">
                <h2 style="color: #333;">订单确认</h2>
                <p>您的订单已确认，订单号：${order.orderNo}</p>
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="color: #333;">订单详情</h3>
                    <p>景点：${order.spot?.name || order.blindbox?.name}</p>
                    <p>游玩日期：${new Date(order.visitDate).toLocaleDateString()}</p>
                    <p>数量：${order.quantity}人</p>
                    <p>总金额：¥${order.amount}</p>
                </div>
                <p>如有任何问题，请联系我们的客服。</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// 发送系统通知邮件
exports.sendSystemNotification = async (email, title, content) => {
    const mailOptions = {
        from: `"探索旅途" <${process.env.SMTP_USER}>`,
        to: email,
        subject: title,
        html: `
            <div style="padding: 20px; background: #f5f5f5;">
                <h2 style="color: #333;">${title}</h2>
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    ${content}
                </div>
                <p style="color: #666;">此邮件由系统自动发送，请勿回复。</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// 验证邮件配置
exports.verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('邮件服务器连接成功');
        return true;
    } catch (error) {
        console.error('邮件服务器连接失败:', error);
        return false;
    }
}; 