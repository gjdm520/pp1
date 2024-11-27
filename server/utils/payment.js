const axios = require('axios');
const crypto = require('crypto');

// 微信支付配置
const wxpayConfig = {
    appId: process.env.WXPAY_APP_ID,
    mchId: process.env.WXPAY_MCH_ID,
    apiKey: process.env.WXPAY_API_KEY,
    notifyUrl: `${process.env.WEBSITE_URL}/api/payment/wxpay/notify`,
    tradeType: 'JSAPI'
};

// 支付宝配置
const alipayConfig = {
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY,
    notifyUrl: `${process.env.WEBSITE_URL}/api/payment/alipay/notify`,
    returnUrl: `${process.env.WEBSITE_URL}/payment/result`
};

// 生成微信支付签名
const generateWxPaySign = (params) => {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&') + `&key=${wxpayConfig.apiKey}`;

    return crypto.createHash('md5')
        .update(sortedParams)
        .digest('hex')
        .toUpperCase();
};

// 创建微信支付订单
exports.createWxPayOrder = async (orderNo, amount, description, openId) => {
    const params = {
        appid: wxpayConfig.appId,
        mch_id: wxpayConfig.mchId,
        nonce_str: crypto.randomBytes(16).toString('hex'),
        body: description,
        out_trade_no: orderNo,
        total_fee: Math.round(amount * 100), // 转换为分
        spbill_create_ip: '127.0.0.1',
        notify_url: wxpayConfig.notifyUrl,
        trade_type: wxpayConfig.tradeType,
        openid: openId
    };

    params.sign = generateWxPaySign(params);

    try {
        const response = await axios.post(
            'https://api.mch.weixin.qq.com/pay/unifiedorder',
            params,
            { headers: { 'Content-Type': 'application/xml' } }
        );

        // 解析XML响应
        const result = await parseXML(response.data);
        
        if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
            return {
                success: true,
                data: {
                    appId: wxpayConfig.appId,
                    timeStamp: Math.floor(Date.now() / 1000).toString(),
                    nonceStr: result.nonce_str,
                    package: `prepay_id=${result.prepay_id}`,
                    signType: 'MD5'
                }
            };
        } else {
            throw new Error(result.err_code_des || result.return_msg);
        }

    } catch (error) {
        console.error('创建微信支付订单失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 创建支付宝支付订单
exports.createAlipayOrder = async (orderNo, amount, description) => {
    const params = {
        app_id: alipayConfig.appId,
        method: 'alipay.trade.page.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
        version: '1.0',
        notify_url: alipayConfig.notifyUrl,
        return_url: alipayConfig.returnUrl,
        biz_content: JSON.stringify({
            out_trade_no: orderNo,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: amount.toFixed(2),
            subject: description
        })
    };

    // 生成签名
    const signContent = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    const sign = crypto.createSign('RSA-SHA256')
        .update(signContent)
        .sign(alipayConfig.privateKey, 'base64');

    params.sign = sign;

    // 构建支付链接
    const payUrl = 'https://openapi.alipay.com/gateway.do?' + 
        Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

    return {
        success: true,
        data: { payUrl }
    };
};

// 验证支付宝通知签名
exports.verifyAlipayNotify = (params) => {
    const signContent = Object.keys(params)
        .filter(key => key !== 'sign' && key !== 'sign_type')
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signContent);
    return verify.verify(alipayConfig.publicKey, params.sign, 'base64');
};

// 查询支付订单状态
exports.queryPaymentStatus = async (orderNo, paymentType) => {
    if (paymentType === 'wxpay') {
        const params = {
            appid: wxpayConfig.appId,
            mch_id: wxpayConfig.mchId,
            out_trade_no: orderNo,
            nonce_str: crypto.randomBytes(16).toString('hex')
        };

        params.sign = generateWxPaySign(params);

        try {
            const response = await axios.post(
                'https://api.mch.weixin.qq.com/pay/orderquery',
                params,
                { headers: { 'Content-Type': 'application/xml' } }
            );

            const result = await parseXML(response.data);
            return {
                success: result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS',
                status: result.trade_state,
                message: result.trade_state_desc
            };
        } catch (error) {
            console.error('查询微信支付状态失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    } else if (paymentType === 'alipay') {
        const params = {
            app_id: alipayConfig.appId,
            method: 'alipay.trade.query',
            charset: 'utf-8',
            sign_type: 'RSA2',
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
            version: '1.0',
            biz_content: JSON.stringify({
                out_trade_no: orderNo
            })
        };

        // 生成签名
        const signContent = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const sign = crypto.createSign('RSA-SHA256')
            .update(signContent)
            .sign(alipayConfig.privateKey, 'base64');

        params.sign = sign;

        try {
            const response = await axios.post('https://openapi.alipay.com/gateway.do', params);
            const result = response.data.alipay_trade_query_response;

            return {
                success: result.code === '10000',
                status: result.trade_status,
                message: result.msg
            };
        } catch (error) {
            console.error('查询支付宝支付状态失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    return {
        success: false,
        message: '不支持的支付方式'
    };
};

// 申请退款
exports.refund = async (orderNo, refundNo, amount, totalAmount, paymentType) => {
    if (paymentType === 'wxpay') {
        const params = {
            appid: wxpayConfig.appId,
            mch_id: wxpayConfig.mchId,
            nonce_str: crypto.randomBytes(16).toString('hex'),
            out_trade_no: orderNo,
            out_refund_no: refundNo,
            total_fee: Math.round(totalAmount * 100),
            refund_fee: Math.round(amount * 100)
        };

        params.sign = generateWxPaySign(params);

        try {
            const response = await axios.post(
                'https://api.mch.weixin.qq.com/secapi/pay/refund',
                params,
                {
                    headers: { 'Content-Type': 'application/xml' },
                    httpsAgent: new https.Agent({
                        pfx: fs.readFileSync(process.env.WXPAY_CERT_PATH),
                        passphrase: wxpayConfig.mchId
                    })
                }
            );

            const result = await parseXML(response.data);
            return {
                success: result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS',
                refundId: result.refund_id,
                message: result.return_msg
            };
        } catch (error) {
            console.error('微信退款失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    } else if (paymentType === 'alipay') {
        const params = {
            app_id: alipayConfig.appId,
            method: 'alipay.trade.refund',
            charset: 'utf-8',
            sign_type: 'RSA2',
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
            version: '1.0',
            biz_content: JSON.stringify({
                out_trade_no: orderNo,
                refund_amount: amount.toFixed(2),
                out_request_no: refundNo
            })
        };

        // 生成签名
        const signContent = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const sign = crypto.createSign('RSA-SHA256')
            .update(signContent)
            .sign(alipayConfig.privateKey, 'base64');

        params.sign = sign;

        try {
            const response = await axios.post('https://openapi.alipay.com/gateway.do', params);
            const result = response.data.alipay_trade_refund_response;

            return {
                success: result.code === '10000',
                refundId: result.trade_no,
                message: result.msg
            };
        } catch (error) {
            console.error('支付宝退款失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    return {
        success: false,
        message: '不支持的支付方式'
    };
}; 