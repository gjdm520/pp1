require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// 导入中间件
const { errorHandler } = require('./middleware/error');
const { rateLimiter } = require('./middleware/rate-limit');
const { corsMiddleware } = require('./middleware/cors');
const { loggerMiddleware } = require('./middleware/logger');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const spotRoutes = require('./routes/spots');
const guideRoutes = require('./routes/guides');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

const app = express();

// 数据库连接
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.error('MongoDB connection error:', err));

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsMiddleware));
app.use(helmet());
app.use(compression());
app.use(loggerMiddleware);
app.use(rateLimiter);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// 错误处理
app.use(errorHandler);

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在'
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // 设置缓存清理定时任务
    const { cleanupCache } = require('./middleware/cache');
    setInterval(() => {
        cleanupCache().catch(err => {
            console.error('定时清理缓存失败:', err);
        });
    }, 24 * 60 * 60 * 1000);
});

module.exports = app; 