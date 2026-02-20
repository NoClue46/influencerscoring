import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createServerApp } from '@/app/server.js';
import { startCronJobs, stopCronJobs } from '@/modules/pipeline/application/stages/index.js';

const app = createServerApp();
const server = serve({ fetch: app.fetch, port: 4141 });

await startCronJobs();

process.on('SIGINT', () => {
    stopCronJobs();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    stopCronJobs();
    server.close((err?: Error) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        process.exit(0);
    });
});
