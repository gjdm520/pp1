// 深拷贝对象
exports.deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof RegExp) return new RegExp(obj);
    
    const clone = Array.isArray(obj) ? [] : {};
    
    Object.keys(obj).forEach(key => {
        clone[key] = this.deepClone(obj[key]);
    });
    
    return clone;
};

// 合并对象
exports.merge = (...objects) => {
    return objects.reduce((result, obj) => {
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                result[key] = this.merge(result[key] || {}, obj[key]);
            } else {
                result[key] = obj[key];
            }
        });
        return result;
    }, {});
};

// 获取对象指定路径的值
exports.get = (obj, path, defaultValue = undefined) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result === undefined ? defaultValue : result;
};

// 设置对象指定路径的值
exports.set = (obj, path, value) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
};

// 删除对象指定路径的值
exports.unset = (obj, path) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            return false;
        }
        current = current[key];
    }
    
    return delete current[keys[keys.length - 1]];
};

// 扁平化对象
exports.flatten = (obj, prefix = '') => {
    const result = {};
    
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, this.flatten(value, newKey));
        } else {
            result[newKey] = value;
        }
    });
    
    return result;
};

// 过滤对象属性
exports.pick = (obj, keys) => {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};

// 排除对象属性
exports.omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};

// 重命名对象属性
exports.renameKeys = (obj, keysMap) => {
    return Object.keys(obj).reduce((result, key) => {
        const newKey = keysMap[key] || key;
        result[newKey] = obj[key];
        return result;
    }, {});
};

// 对象转查询字符串
exports.toQueryString = (obj) => {
    return Object.entries(obj)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return value
                    .map(item => `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`)
                    .join('&');
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
};

// 查询字符串转对象
exports.fromQueryString = (queryString) => {
    if (!queryString) return {};
    
    return queryString
        .replace(/^\?/, '')
        .split('&')
        .reduce((result, param) => {
            const [key, value] = param.split('=').map(decodeURIComponent);
            
            if (key.endsWith('[]')) {
                const arrayKey = key.slice(0, -2);
                (result[arrayKey] = result[arrayKey] || []).push(value);
            } else {
                result[key] = value;
            }
            
            return result;
        }, {});
};

// 检查对象是否为空
exports.isEmpty = (obj) => {
    if (!obj) return true;
    return Object.keys(obj).length === 0;
};

// 比较两个对象是否相等
exports.isEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    if (obj1 === null || obj2 === null) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
        keys2.includes(key) && this.isEqual(obj1[key], obj2[key])
    );
}; 