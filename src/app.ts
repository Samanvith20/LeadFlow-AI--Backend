import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();

// Security Middleware
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors());

// Response Compression
app.use(compression());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'LeadFlow AI Backend Running' });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'LeadFlow AI Backend is healthy' });
});

// 404 Handler (Catch-all for undefined routes)
app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

export default app;
