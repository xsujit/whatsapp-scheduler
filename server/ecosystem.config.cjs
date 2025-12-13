module.exports = {
    apps: [
        {
            name: 'wa-scheduler-api',
            script: 'src/bin/server.js',
            interpreter: 'node',
            instances: 1,
            env: {
                NODE_ENV: 'production',
            },
            max_memory_restart: '300M',
            restart_delay: 3000,
        },
        {
            name: 'wa-scheduler-worker',
            script: 'src/bin/worker.js',
            interpreter: 'node',
            instances: 1,
            env: {
                NODE_ENV: 'production',
            },
            max_memory_restart: '512M', // Give worker more RAM for image processing/baileys
            restart_delay: 5000,
        }
    ]
};