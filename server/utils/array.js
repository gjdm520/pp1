// 数组去重
exports.unique = (arr) => {
    return [...new Set(arr)];
};

// 数组扁平化
exports.flatten = (arr, depth = Infinity) => {
    return arr.flat(depth);
};

// 数组分块
exports.chunk = (arr, size = 1) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

// 数组随机打乱
exports.shuffle = (arr) => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// 获取数组交集
exports.intersection = (...arrays) => {
    return arrays.reduce((result, arr) => 
        result.filter(item => arr.includes(item))
    );
};

// 获取数组并集
exports.union = (...arrays) => {
    return [...new Set(arrays.flat())];
};

// 获取数组差集
exports.difference = (arr1, arr2) => {
    return arr1.filter(item => !arr2.includes(item));
};

// 数组分组
exports.groupBy = (arr, key) => {
    return arr.reduce((result, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        (result[group] = result[group] || []).push(item);
        return result;
    }, {});
};

// 数组排序
exports.sortBy = (arr, key, order = 'asc') => {
    const sorted = [...arr].sort((a, b) => {
        const valueA = typeof key === 'function' ? key(a) : a[key];
        const valueB = typeof key === 'function' ? key(b) : b[key];
        
        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
};

// 获取数组中的最大值
exports.max = (arr, key) => {
    if (key) {
        return arr.reduce((max, item) => {
            const value = typeof key === 'function' ? key(item) : item[key];
            return value > max ? value : max;
        }, -Infinity);
    }
    return Math.max(...arr);
};

// 获取数组中的最小值
exports.min = (arr, key) => {
    if (key) {
        return arr.reduce((min, item) => {
            const value = typeof key === 'function' ? key(item) : item[key];
            return value < min ? value : min;
        }, Infinity);
    }
    return Math.min(...arr);
};

// 数组求和
exports.sum = (arr, key) => {
    if (key) {
        return arr.reduce((sum, item) => {
            const value = typeof key === 'function' ? key(item) : item[key];
            return sum + (value || 0);
        }, 0);
    }
    return arr.reduce((sum, num) => sum + (num || 0), 0);
};

// 数组求平均值
exports.average = (arr, key) => {
    if (arr.length === 0) return 0;
    return this.sum(arr, key) / arr.length;
};

// 数组分页
exports.paginate = (arr, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    return {
        data: arr.slice(startIndex, endIndex),
        pagination: {
            total: arr.length,
            page,
            totalPages: Math.ceil(arr.length / limit),
            hasNext: endIndex < arr.length,
            hasPrev: page > 1
        }
    };
};

// 数组转树形结构
exports.arrayToTree = (arr, idKey = 'id', parentKey = 'parentId', childrenKey = 'children') => {
    const tree = [];
    const map = {};
    
    // 创建节点映射
    arr.forEach(item => {
        map[item[idKey]] = { ...item, [childrenKey]: [] };
    });
    
    // 构建树形结构
    arr.forEach(item => {
        const node = map[item[idKey]];
        if (item[parentKey] && map[item[parentKey]]) {
            map[item[parentKey]][childrenKey].push(node);
        } else {
            tree.push(node);
        }
    });
    
    return tree;
};

// 树形结构转数组
exports.treeToArray = (tree, childrenKey = 'children') => {
    const result = [];
    const stack = [...tree];
    
    while (stack.length) {
        const node = stack.pop();
        const children = node[childrenKey];
        delete node[childrenKey];
        result.push(node);
        
        if (children && children.length) {
            stack.push(...children);
        }
    }
    
    return result;
}; 