// 生成随机字符串
exports.generateRandomString = (length = 8, options = {}) => {
    const {
        numbers = true,
        lowercase = true,
        uppercase = true,
        special = false
    } = options;

    let chars = '';
    if (numbers) chars += '0123456789';
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (special) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// 截取字符串
exports.truncate = (str, length = 30, suffix = '...') => {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
};

// 转换为驼峰命名
exports.toCamelCase = (str) => {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
};

// 转换为帕斯卡命名
exports.toPascalCase = (str) => {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
        .replace(/^./, c => c.toUpperCase());
};

// 转换为下划线命名
exports.toSnakeCase = (str) => {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
};

// 转换为短横线命名
exports.toKebabCase = (str) => {
    return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
};

// 首字母大写
exports.capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// 移除HTML标签
exports.stripHtml = (html) => {
    return html.replace(/<[^>]*>/g, '');
};

// 转义HTML特殊字符
exports.escapeHtml = (str) => {
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
};

// 反转义HTML特殊字符
exports.unescapeHtml = (str) => {
    const htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
    };
    return str.replace(/&(?:amp|lt|gt|quot|#39);/g, char => htmlUnescapes[char]);
};

// 格式化数字
exports.formatNumber = (number, options = {}) => {
    const {
        decimals = 2,
        decimalSeparator = '.',
        thousandsSeparator = ','
    } = options;

    const parts = parseFloat(number).toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    return parts.join(decimalSeparator);
};

// 格式化文件大小
exports.formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 生成slug
exports.generateSlug = (str) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// 计算字符串相似度（莱文斯坦距离）
exports.calculateSimilarity = (str1, str2) => {
    const m = str1.length;
    const n = str2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1,
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1
                );
            }
        }
    }

    return 1 - dp[m][n] / Math.max(m, n);
};

// 提取字符串中的数字
exports.extractNumbers = (str) => {
    return str.match(/\d+/g) || [];
};

// 提取字符串中的邮箱
exports.extractEmails = (str) => {
    return str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
};

// 提取字符串中的URL
exports.extractUrls = (str) => {
    return str.match(/https?:\/\/[^\s]+/g) || [];
}; 