// server/ecosystem.config.cjs

module.exports = {
    apps: [{
        name: 'whatsapp-scheduler',
        script: 'server.js',
        interpreter: 'node',
        instances: '1',
        env: {
            NODE_ENV: 'production',
        },
        max_memory_restart: '200M',
        restart_delay: 5000,
        watch: false,
        error_file: 'pm2/err.log',
        out_file: 'pm2/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }]
};