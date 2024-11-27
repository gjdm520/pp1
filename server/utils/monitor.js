const OSS = require('ali-oss');
const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET
});

// 监控OSS使用情况
exports.checkOSSUsage = async () => {
    try {
        const usage = await client.getBucketInfo();
        logger.info('OSS Usage:', {
            storage: usage.bucket.storageClass,
            dataRedundancyType: usage.bucket.dataRedundancyType
        });
    } catch (error) {
        logger.error('Check OSS usage failed:', error);
    }
};

// 监控服务器状态
exports.checkServerStatus = async () => {
    const usage = process.cpuUsage();
    const memory = process.memoryUsage();
    
    logger.info('Server Status:', {
        cpu: usage,
        memory: {
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
        }
    });
}; 