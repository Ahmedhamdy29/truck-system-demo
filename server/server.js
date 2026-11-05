import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import truckRoutes from './routes/trucks.js';
import expenseRoutes from './routes/expenses.js';
import maintenanceRoutes from './routes/maintenance.js';
import tripRoutes from './routes/trips.js';
import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fail fast when the JWT secret is missing: tokens must never be signed or
// verified with a fallback/known secret.
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Set JWT_SECRET in the environment (see server/.env.example) and restart.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy is required when running behind a proxy (like Replit/Render)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limit on the auth endpoints most exposed to brute force:
// 10 attempts per IP per 15 minutes (in addition to the global limit above).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts from this IP, please try again later.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register-company', authLimiter);

// CORS configuration
// Default: only the local dev origins (unchanged behaviour).
// CORS_ORIGINS overrides the list with a comma-separated list.
// CORS_ALLOW_ALL_ORIGINS=true reflects any request origin — demo only:
// the demo is opened from localhost AND from forwarded Codespaces URLs,
// whose origin cannot be known in advance. Never enable it in production.
const corsAllowAllOrigins = process.env.CORS_ALLOW_ALL_ORIGINS === 'true';
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'https://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: corsAllowAllOrigins ? true : corsOrigins,
  credentials: true
}));

// Preflight requests are handled by the global cors middleware above

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware — generic message only; details go to the
// console, never to the client (not even in development).
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚛 Truck Management Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});
