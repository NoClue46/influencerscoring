module.exports = {
  apps: [
    {
      name: 'influencerscoring',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
