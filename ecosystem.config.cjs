const productionEnv = {
  NODE_ENV: "production",
  PORT: "3001",
  HOSTNAME: "0.0.0.0",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://tiangong:tiangong_password@localhost:5433/tiangong_interview",
};

module.exports = {
  apps: [
    {
      name: "tiangong-interview",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3001",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: productionEnv,
      env_production: productionEnv,
    },
  ],
};
