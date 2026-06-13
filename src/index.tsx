// src/index.tsx — application entry
import { Hono } from 'hono';
import type { Env } from './lib/db';
import pub from './routes/public';
import api from './routes/api';
import admin from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

app.route('/api', api);
app.route('/admin', admin);
app.route('/', pub);

export default app;
