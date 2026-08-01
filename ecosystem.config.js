module.exports = {
  apps: [
    {
      name: "dhaka-automobiles",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3025,
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      time: true,
    },
  ],
};
