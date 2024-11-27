const Core = require('@alicloud/pop-core');

// 创建阿里云SMS客户端
const client = new Core({
    accessKeyId: process.env.SMS_ACCESS_KEY_ID,
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
});

// 发送验证码短信
exports.sendVerifyCode = async (phone, code) => {
    const params = {
        PhoneNumbers: phone,
        SignName: process.env.SMS_SIGN_NAME,
        TemplateCode: process.env.SMS_TEMPLATE_CODE,
        TemplateParam: JSON.stringify({ code })
    };

    try {
        const result = await client.request('SendSms', params, { method: 'POST' });
        if (result.Code === 'OK') {
            return {
                success: true,
                message: '验证码发送成功'
            };
        } else {
            throw new Error(result.Message);
        }
    } catch (error) {
        console.error('短信发送失败:', error);
        return {
            success: false,
            message: error.message || '验证码发送失败'
        };
    }
};

// 发送订单通知短信
exports.sendOrderNotification = async (phone, orderNo) => {
    const params = {
        PhoneNumbers: phone,
        SignName: process.env.SMS_SIGN_NAME,
        TemplateCode: process.env.SMS_ORDER_TEMPLATE_CODE,
        TemplateParam: JSON.stringify({ orderNo })
    };

    try {
        const result = await client.request('SendSms', params, { method: 'POST' });
        return result.Code === 'OK';
    } catch (error) {
        console.error('订单通知短信发送失败:', error);
        return false;
    }
};

// 发送退款通知短信
exports.sendRefundNotification = async (phone, orderNo, amount) => {
    const params = {
        PhoneNumbers: phone,
        SignName: process.env.SMS_SIGN_NAME,
        TemplateCode: process.env.SMS_REFUND_TEMPLATE_CODE,
        TemplateParam: JSON.stringify({ orderNo, amount })
    };

    try {
        const result = await client.request('SendSms', params, { method: 'POST' });
        return result.Code === 'OK';
    } catch (error) {
        console.error('退款通知短信发送失败:', error);
        return false;
    }
};

// 发送系统通知短信
exports.sendSystemNotification = async (phone, message) => {
    const params = {
        PhoneNumbers: phone,
        SignName: process.env.SMS_SIGN_NAME,
        TemplateCode: process.env.SMS_SYSTEM_TEMPLATE_CODE,
        TemplateParam: JSON.stringify({ message })
    };

    try {
        const result = await client.request('SendSms', params, { method: 'POST' });
        return result.Code === 'OK';
    } catch (error) {
        console.error('系统通知短信发送失败:', error);
        return false;
    }
};

// 批量发送短信
exports.sendBatchSms = async (phones, templateCode, templateParam) => {
    const params = {
        PhoneNumberJson: JSON.stringify(phones),
        SignNameJson: JSON.stringify(Array(phones.length).fill(process.env.SMS_SIGN_NAME)),
        TemplateCode: templateCode,
        TemplateParamJson: JSON.stringify(Array(phones.length).fill(templateParam))
    };

    try {
        const result = await client.request('SendBatchSms', params, { method: 'POST' });
        return result.Code === 'OK';
    } catch (error) {
        console.error('批量短信发送失败:', error);
        return false;
    }
};

// 查询短信发送状态
exports.querySendStatus = async (phone, date) => {
    const params = {
        PhoneNumber: phone,
        SendDate: date,
        PageSize: 10,
        CurrentPage: 1
    };

    try {
        const result = await client.request('QuerySendDetails', params, { method: 'POST' });
        return result.SmsSendDetailDTOs.SmsSendDetailDTO;
    } catch (error) {
        console.error('查询短信状态失败:', error);
        return [];
    }
};

// 添加短信模板
exports.addSmsTemplate = async (templateType, templateName, templateContent, remark) => {
    const params = {
        TemplateType: templateType,
        TemplateName: templateName,
        TemplateContent: templateContent,
        Remark: remark
    };

    try {
        const result = await client.request('AddSmsTemplate', params, { method: 'POST' });
        return {
            success: true,
            templateCode: result.TemplateCode
        };
    } catch (error) {
        console.error('添加短信模板失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 删除短信模板
exports.deleteSmsTemplate = async (templateCode) => {
    const params = {
        TemplateCode: templateCode
    };

    try {
        const result = await client.request('DeleteSmsTemplate', params, { method: 'POST' });
        return result.Code === 'OK';
    } catch (error) {
        console.error('删除短信模板失败:', error);
        return false;
    }
}; 