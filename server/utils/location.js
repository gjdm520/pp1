const axios = require('axios');

// 高德地图配置
const amapConfig = {
    key: process.env.AMAP_KEY,
    baseUrl: 'https://restapi.amap.com/v3'
};

// 地球半径（单位：千米）
const EARTH_RADIUS = 6371;

// 计算两点之间的距离（km）
exports.calculateDistance = (lat1, lng1, lat2, lng2) => {
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const a = radLat1 - radLat2;
    const b = (lng1 * Math.PI) / 180 - (lng2 * Math.PI) / 180;
    
    const s = 2 * Math.asin(Math.sqrt(
        Math.pow(Math.sin(a/2), 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b/2), 2)
    ));
    
    return s * EARTH_RADIUS;
};

// 地理编码（地址转坐标）
exports.geocode = async (address) => {
    try {
        const response = await axios.get(`${amapConfig.baseUrl}/geocode/geo`, {
            params: {
                key: amapConfig.key,
                address,
                output: 'JSON'
            }
        });

        if (response.data.status === '1' && response.data.geocodes.length > 0) {
            const location = response.data.geocodes[0].location.split(',');
            return {
                success: true,
                data: {
                    longitude: parseFloat(location[0]),
                    latitude: parseFloat(location[1]),
                    formattedAddress: response.data.geocodes[0].formatted_address,
                    province: response.data.geocodes[0].province,
                    city: response.data.geocodes[0].city,
                    district: response.data.geocodes[0].district
                }
            };
        }

        return {
            success: false,
            message: '地址解析失败'
        };

    } catch (error) {
        console.error('地理编码失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 逆地理编码（坐标转地址）
exports.reverseGeocode = async (latitude, longitude) => {
    try {
        const response = await axios.get(`${amapConfig.baseUrl}/geocode/regeo`, {
            params: {
                key: amapConfig.key,
                location: `${longitude},${latitude}`,
                output: 'JSON'
            }
        });

        if (response.data.status === '1') {
            const result = response.data.regeocode;
            return {
                success: true,
                data: {
                    formattedAddress: result.formatted_address,
                    province: result.addressComponent.province,
                    city: result.addressComponent.city,
                    district: result.addressComponent.district,
                    street: result.addressComponent.street,
                    streetNumber: result.addressComponent.streetNumber
                }
            };
        }

        return {
            success: false,
            message: '坐标解析失败'
        };

    } catch (error) {
        console.error('逆地理编码失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 计算行车路线
exports.calculateRoute = async (origin, destination, type = 'drive') => {
    try {
        const response = await axios.get(`${amapConfig.baseUrl}/direction/${type}`, {
            params: {
                key: amapConfig.key,
                origin: typeof origin === 'string' ? origin : `${origin.longitude},${origin.latitude}`,
                destination: typeof destination === 'string' ? destination : `${destination.longitude},${destination.latitude}`,
                output: 'JSON'
            }
        });

        if (response.data.status === '1' && response.data.route) {
            const route = response.data.route;
            return {
                success: true,
                data: {
                    distance: parseFloat(route.paths[0].distance) / 1000, // 转换为公里
                    duration: parseInt(route.paths[0].duration) / 60, // 转换为分钟
                    tolls: route.paths[0].tolls || 0,
                    steps: route.paths[0].steps.map(step => step.instruction)
                }
            };
        }

        return {
            success: false,
            message: '路线规划失败'
        };

    } catch (error) {
        console.error('路线规划失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 搜索周边POI
exports.searchNearby = async (latitude, longitude, keyword, radius = 1000) => {
    try {
        const response = await axios.get(`${amapConfig.baseUrl}/place/around`, {
            params: {
                key: amapConfig.key,
                location: `${longitude},${latitude}`,
                keywords: keyword,
                radius,
                output: 'JSON'
            }
        });

        if (response.data.status === '1') {
            return {
                success: true,
                data: response.data.pois.map(poi => ({
                    id: poi.id,
                    name: poi.name,
                    type: poi.type,
                    distance: parseFloat(poi.distance),
                    address: poi.address,
                    location: {
                        longitude: parseFloat(poi.location.split(',')[0]),
                        latitude: parseFloat(poi.location.split(',')[1])
                    }
                }))
            };
        }

        return {
            success: false,
            message: '搜索失败'
        };

    } catch (error) {
        console.error('搜索周边POI失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// 获取行政区划信息
exports.getDistricts = async (keywords, subdistrict = 1) => {
    try {
        const response = await axios.get(`${amapConfig.baseUrl}/config/district`, {
            params: {
                key: amapConfig.key,
                keywords,
                subdistrict,
                output: 'JSON'
            }
        });

        if (response.data.status === '1' && response.data.districts.length > 0) {
            return {
                success: true,
                data: response.data.districts
            };
        }

        return {
            success: false,
            message: '获取行政区划失败'
        };

    } catch (error) {
        console.error('获取行政区划失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}; 