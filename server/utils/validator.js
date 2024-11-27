const validator = require('validator');

// 验证手机号
exports.isValidPhone = (phone) => {
    return /^1[3-9]\d{9}$/.test(phone);
};

// 验证密码强度
exports.checkPasswordStrength = (password) => {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    const strength = Object.values(checks).filter(Boolean).length;
    let message = '';

    if (strength < 3) {
        message = '密码强度较弱，建议包含大小写字母、数字和特殊字符';
    } else if (strength < 4) {
        message = '密码强度中等';
    } else {
        message = '密码强度很好';
    }

    return {
        strength,
        checks,
        message,
        isValid: strength >= 3
    };
};

// 验证身份证号
exports.isValidIdCard = (idCard) => {
    // 18位身份证号码验证
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
        return false;
    }

    // 加权因子
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    // 校验码
    const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    // 计算校验位
    const sum = [...idCard]
        .slice(0, 17)
        .reduce((acc, cur, idx) => acc + parseInt(cur) * weights[idx], 0);
    
    const checkCode = codes[sum % 11];
    return checkCode === idCard.slice(-1).toUpperCase();
};

// 验证邮箱
exports.isValidEmail = (email) => {
    return validator.isEmail(email);
};

// 验证URL
exports.isValidUrl = (url) => {
    return validator.isURL(url, {
        protocols: ['http', 'https'],
        require_protocol: true
    });
};

// 验证金额
exports.isValidAmount = (amount) => {
    return validator.isFloat(amount.toString(), {
        min: 0.01,
        max: 999999.99,
        locale: 'en-US'
    });
};

// 验证日期
exports.isValidDate = (date, options = {}) => {
    const { 
        minDate = null,
        maxDate = null,
        format = 'YYYY-MM-DD'
    } = options;

    if (!validator.isDate(date, { format })) {
        return false;
    }

    const dateObj = new Date(date);
    
    if (minDate && dateObj < new Date(minDate)) {
        return false;
    }
    
    if (maxDate && dateObj > new Date(maxDate)) {
        return false;
    }

    return true;
};

// 验证文件大小
exports.isValidFileSize = (size, maxSize) => {
    return size <= maxSize;
};

// 验证文件类型
exports.isValidFileType = (mimetype, allowedTypes) => {
    return allowedTypes.includes(mimetype);
};

// 验证字符串长度
exports.isValidLength = (str, options = {}) => {
    const {
        min = 0,
        max = Infinity
    } = options;

    const length = str.length;
    return length >= min && length <= max;
};

// 验证经纬度
exports.isValidCoordinates = (lat, lng) => {
    return validator.isLatLong(`${lat},${lng}`);
};

// 验证中文姓名
exports.isValidChineseName = (name) => {
    return /^[\u4e00-\u9fa5]{2,}$/.test(name);
};

// 验证英文姓名
exports.isValidEnglishName = (name) => {
    return /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/.test(name);
};

// 验证护照号码
exports.isValidPassport = (passport) => {
    return /^[A-Z]\d{8}$/.test(passport);
};

// 验证营业执照号
exports.isValidBusinessLicense = (license) => {
    return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(license);
};

// 验证统一社会信用代码
exports.isValidSocialCreditCode = (code) => {
    return /^[0-9A-HJ-NPQRTUWXY]{18}$/.test(code);
};

// 验证银行卡号
exports.isValidBankCard = (card) => {
    return validator.isCreditCard(card);
}; 