module.exports = {
    apps: [{
        name: "travel-website",
        script: "./server/app.js",
        watch: true,
        ignore_watch: ["node_modules", "logs"],
        instances: 1,
        exec_mode: "fork",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        },
        error_file: "./logs/err.log",
        out_file: "./logs/out.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss"
    }]
}; 