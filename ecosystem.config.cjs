module.exports = {
  apps: [
    {
      name: 'influencerscoring',
      cwd: __dirname,
      script: 'src/index.ts',
      interpreter: '/home/planmasta/.bun/bin/bun',
      log_file: '/home/planmasta/inf/app.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
