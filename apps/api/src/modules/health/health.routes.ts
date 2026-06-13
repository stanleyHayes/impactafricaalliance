import { Router } from 'express';
import mongoose from 'mongoose';

/** Liveness/readiness probe consumed by Render's health check. */
export const createHealthRouter = (): Router => {
  const router = Router();
  router.get('/', (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'ok' : 'degraded',
      db: dbConnected ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });
  return router;
};
