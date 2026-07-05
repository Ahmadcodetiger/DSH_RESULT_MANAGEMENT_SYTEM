import dotenv from 'dotenv';
import dns from 'dns';

// Force DNS lookup to prefer IPv4 over IPv6 to resolve connection timeout issues
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { resolveTenant } from './middleware/tenantResolver';
import apiRouter from './routes/api';

// Validate required environment variables at startup
if (!process.env.MONGO_URI) {
  console.error('WARNING: MONGO_URI is not set in environment variables. Database will not connect.');
}
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not set in environment variables.');
  // JWT_SECRET is truly critical — authentication won't work without it
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL ERROR: JWT_SECRET is not set in environment variables.');
  }
}

const app = express();

// Middleware
app.use(helmet());

// Configure CORS allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    // In development mode, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, allow configured origins AND any *.smartschool.africa subdomain
    if (
      allowedOrigins.includes(origin) ||
      /\.smartschool\.africa$/.test(new URL(origin).hostname)
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support larger bulk uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB is connected before handling API requests (critical for serverless)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error('Database connection failed for request:', err.message);
    res.status(503).json({ message: 'Service temporarily unavailable. Database connection failed.' });
  }
});

// Tenant Resolution — resolves tenant from subdomain, custom domain, or X-Tenant-ID header
// This runs on ALL /api requests so tenant context is always available
app.use('/api', resolveTenant);

// Route mounting
app.use('/api', apiRouter);

// Base route health check
app.get('/', async (req, res) => {
  // Try to connect, but don't fail the health check if it doesn't work
  try {
    await connectDB();
  } catch (err: any) {
    console.error('Health check DB connection failed:', err.message);
  }
  res.status(200).json({
    status: 'healthy',
    service: 'SmartSchool Africa API',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Only start the HTTP server in local/non-Vercel environments
if (process.env.VERCEL !== '1') {
  (async () => {
    try {
      await connectDB();
    } catch (err: any) {
      console.warn('Warning: could not connect to MongoDB. Starting server anyway for local development. Error:', err && err.message ? err.message : err);
    }

    app.listen(process.env.PORT || 5000, () => {
      console.log(`SmartSchool Africa API running in ${process.env.NODE_ENV || 'development'} mode on port ${process.env.PORT || 5000}`);
    });
  })();
}

// Export for Vercel serverless
export default app;
