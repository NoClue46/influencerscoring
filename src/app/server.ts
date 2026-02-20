import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { registerJobsRoutes } from '@/app/http/routes/jobs-routes.js';

export function createServerApp(): Hono {
    const app = new Hono();
    app.use(logger());
    registerJobsRoutes(app);
    return app;
}
