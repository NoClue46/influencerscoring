module.exports = {
  apps: [
    {
      name: 'influencerscoring',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      log_file: '/home/planmasta/inf/app.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
