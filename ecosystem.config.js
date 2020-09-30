const os = require('os')

module.exports = {
  apps: [
      {
        port: 8813,
        name: 'colyseus',
        script: 'ts-node',
        // exec_interpreter: "ts-node",
        args: 'index.ts',
        watch: false,
        instances: os.cpus().length,
        exec_mode: 'fork',
        // log_file: '/var/log/pm2/pm2.log',
        log_date_format: 'YYYY-MM-DD HH:mm Z',
        time: true,
        env: {
            DEBUG: 'colyseus:errors',
            NODE_ENV: 'production',
        }
      },
      {
        port: 80,
        name: 'proxy',
        script: './node_modules/@colyseus/proxy/bin/proxy',
        instances: 1, // os.cpus().length,
        exec_mode: 'cluster',
        // log_file: '/var/log/pm2/proxy.log',
        log_date_format: 'YYYY-MM-DD HH:mm Z',
        time: true,
        env: {
          PORT: 80,
          REDIS_URL: "redis://172.17.0.1:6379/0"
        }
      }
    ]
}