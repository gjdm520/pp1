const axios = require('axios');

// 和风天气配置
const weatherConfig = {
    key: process.env.WEATHER_KEY,
    baseUrl: 'https://api.qweather.com/v7'
};

// 获取实时天气
exports.getNowWeather = async (location) => {
    try {
        const response = await axios.get(`${weatherConfig.baseUrl}/weather/now`, {
            params: {
                key: weatherConfig.key,
                location: typeof location === 'string' ? location : `${location.longitude},${location.latitude}`
            }
        });

        if (response.data.code === '200') {
            const now = response.data.now;
            return {
                success: true,
                data: {
                    temp: parseInt(now.temp),
                    feelsLike: parseInt(now.feelsLike),
                    icon: now.icon,
                    text: now.text,
                    windDir: now.windDir,
                    windScale: now.windScale,
                    humidity: parseInt(now.humidity),
                    precip: parseFloat(now.precip),
                    updateTime: now.obsTime
                }
            };
        }

        return {
            success: false,
            message: '获取天气失败'
        };

    } catch (error) {
        console.error('获取实时天气失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 获取天气预报
exports.getForecast = async (location, days = 3) => {
    try {
        const response = await axios.get(`${weatherConfig.baseUrl}/weather/${days}d`, {
            params: {
                key: weatherConfig.key,
                location: typeof location === 'string' ? location : `${location.longitude},${location.latitude}`
            }
        });

        if (response.data.code === '200') {
            return {
                success: true,
                data: response.data.daily.map(day => ({
                    date: day.fxDate,
                    tempMax: parseInt(day.tempMax),
                    tempMin: parseInt(day.tempMin),
                    iconDay: day.iconDay,
                    textDay: day.textDay,
                    iconNight: day.iconNight,
                    textNight: day.textNight,
                    windDir: day.windDir,
                    windScale: day.windScale,
                    humidity: parseInt(day.humidity),
                    precip: parseFloat(day.precip),
                    uvIndex: parseInt(day.uvIndex)
                }))
            };
        }

        return {
            success: false,
            message: '获取天气预报失败'
        };

    } catch (error) {
        console.error('获取天气预报失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 获取生活指数
exports.getLifeIndices = async (location, type = '1,2,3,5,6,8,9,10') => {
    try {
        const response = await axios.get(`${weatherConfig.baseUrl}/indices/1d`, {
            params: {
                key: weatherConfig.key,
                location: typeof location === 'string' ? location : `${location.longitude},${location.latitude}`,
                type
            }
        });

        if (response.data.code === '200') {
            return {
                success: true,
                data: response.data.daily.map(index => ({
                    type: index.type,
                    name: index.name,
                    level: index.level,
                    category: index.category,
                    text: index.text
                }))
            };
        }

        return {
            success: false,
            message: '获取生活指数失败'
        };

    } catch (error) {
        console.error('获取生活指数失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 获取空气质量
exports.getAirQuality = async (location) => {
    try {
        const response = await axios.get(`${weatherConfig.baseUrl}/air/now`, {
            params: {
                key: weatherConfig.key,
                location: typeof location === 'string' ? location : `${location.longitude},${location.latitude}`
            }
        });

        if (response.data.code === '200') {
            const now = response.data.now;
            return {
                success: true,
                data: {
                    aqi: parseInt(now.aqi),
                    category: now.category,
                    primary: now.primary,
                    pm2p5: parseInt(now.pm2p5),
                    pm10: parseInt(now.pm10),
                    no2: parseInt(now.no2),
                    so2: parseInt(now.so2),
                    co: parseFloat(now.co),
                    o3: parseInt(now.o3)
                }
            };
        }

        return {
            success: false,
            message: '获取空气质量失败'
        };

    } catch (error) {
        console.error('获取空气质量失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 获取天气预警
exports.getWarning = async (location) => {
    try {
        const response = await axios.get(`${weatherConfig.baseUrl}/warning/now`, {
            params: {
                key: weatherConfig.key,
                location: typeof location === 'string' ? location : `${location.longitude},${location.latitude}`
            }
        });

        if (response.data.code === '200') {
            return {
                success: true,
                data: response.data.warning.map(warn => ({
                    id: warn.id,
                    sender: warn.sender,
                    pubTime: warn.pubTime,
                    title: warn.title,
                    type: warn.type,
                    level: warn.level,
                    text: warn.text
                }))
            };
        }

        return {
            success: false,
            message: '获取天气预警失败'
        };

    } catch (error) {
        console.error('获取天气预警失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}; 