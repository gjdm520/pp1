const moment = require('moment');

// 格式化日期
exports.formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return moment(date).format(format);
};

// 获取当前时间戳
exports.now = () => {
    return moment().valueOf();
};

// 计算两个日期之间的差值
exports.diffDays = (date1, date2) => {
    return moment(date1).diff(moment(date2), 'days');
};

// 检查日期是否在范围内
exports.isDateInRange = (date, startDate, endDate) => {
    const momentDate = moment(date);
    return momentDate.isBetween(startDate, endDate, 'day', '[]');
};

// 获取指定月份的天数
exports.getDaysInMonth = (year, month) => {
    return moment(`${year}-${month}`, 'YYYY-MM').daysInMonth();
};

// 获取日期范围
exports.getDateRange = (startDate, endDate, format = 'YYYY-MM-DD') => {
    const dates = [];
    const start = moment(startDate);
    const end = moment(endDate);

    while (start.isSameOrBefore(end)) {
        dates.push(start.format(format));
        start.add(1, 'days');
    }

    return dates;
};

// 获取相对时间描述
exports.getRelativeTime = (date) => {
    return moment(date).fromNow();
};

// 添加时间
exports.addTime = (date, amount, unit = 'days') => {
    return moment(date).add(amount, unit).toDate();
};

// 减少时间
exports.subtractTime = (date, amount, unit = 'days') => {
    return moment(date).subtract(amount, unit).toDate();
};

// 获取本周的开始和结束日期
exports.getWeekRange = (date = new Date()) => {
    const start = moment(date).startOf('week');
    const end = moment(date).endOf('week');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

// 获取本月的开始和结束日期
exports.getMonthRange = (date = new Date()) => {
    const start = moment(date).startOf('month');
    const end = moment(date).endOf('month');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

// 获取季度的开始和结束日期
exports.getQuarterRange = (date = new Date()) => {
    const start = moment(date).startOf('quarter');
    const end = moment(date).endOf('quarter');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

// 获取年份的开始和结束日期
exports.getYearRange = (date = new Date()) => {
    const start = moment(date).startOf('year');
    const end = moment(date).endOf('year');
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

// 检查是否为工作日
exports.isWorkday = (date) => {
    const day = moment(date).day();
    return day !== 0 && day !== 6;
};

// 获取下一个工作日
exports.getNextWorkday = (date) => {
    let nextDay = moment(date).add(1, 'days');
    while (!this.isWorkday(nextDay)) {
        nextDay.add(1, 'days');
    }
    return nextDay.toDate();
};

// 计算工作日天数
exports.getWorkdays = (startDate, endDate) => {
    let count = 0;
    const start = moment(startDate);
    const end = moment(endDate);

    while (start.isSameOrBefore(end)) {
        if (this.isWorkday(start)) {
            count++;
        }
        start.add(1, 'days');
    }

    return count;
};

// 格式化持续时间
exports.formatDuration = (milliseconds) => {
    return moment.duration(milliseconds).humanize();
};

// 解析日期字符串
exports.parseDate = (dateString, format = 'YYYY-MM-DD') => {
    const parsed = moment(dateString, format);
    return parsed.isValid() ? parsed.toDate() : null;
};

// 获取农历日期
exports.getLunarDate = (date) => {
    // 需要额外的农历转换库支持
    // 这里仅作为示例
    return {
        year: '2024',
        month: '正月',
        day: '初一',
        festival: '春节'
    };
}; 