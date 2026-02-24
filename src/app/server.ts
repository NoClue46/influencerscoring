import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { registerJobsRoutes } from '@/app/http/routes/jobs-routes.js';

export function createServerApp(): Hono {
    const app = new Hono();
    app.use(logger());

    app.onError((err, c) => {
        console.error(`[${c.req.method}] ${c.req.url} — ${err.message}`, err.stack);
        return c.json({ error: 'Internal Server Error' }, 500);
    });

    registerJobsRoutes(app);
    return app;
}
