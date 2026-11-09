import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import { config } from './config';
import { router } from './routes';
import { authRouter } from './authRoutes';
import { errorHandler, notFound, requestId, issueCsrfToken, csrfProtection } from './middleware';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Request ID + security headers (Helmet). HSTS is intentionally NOT enabled here;
  // enable it only once the deployment is confirmed to serve HTTPS end-to-end.
  app.use(requestId);
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind v4 uses inline styles via CSS
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", config.corsOrigins.length ? config.corsOrigins[0] : 'http://localhost:5173'],
        frameAncestors: ["'none'"],
      },
    }),
  );

  // Session-based authentication (opt-in via AUTH_ENABLED).
  if (config.auth.enabled) {
    requireSessionSecret();
    app.use(
      session({
        name: config.auth.cookieName,
        secret: config.auth.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: config.isProd,
          maxAge: config.auth.cookieMaxAgeMs,
          path: '/',
        },
        rolling: true,
      }),
    );
  }

  // CORS: explicit allowlist only. Never reflect arbitrary origins; never wildcard with credentials.
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (e.g. curl, mobile native) only in non-production.
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id', 'X-CSRF-Token'],
      exposedHeaders: ['X-Request-Id', 'X-AI-Mode', 'X-Audio-Mock', 'X-CSRF-Token'],
      credentials: config.auth.enabled,
    }),
  );

  app.use(express.json({ limit: '120kb' }));

  // Issue a CSRF token on every response when sessions are active.
  if (config.auth.enabled) {
    app.use(issueCsrfToken);
  }

  app.use('/api/auth', authRouter);
  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function requireSessionSecret(): void {
  if (!config.auth.sessionSecret) {
    throw new Error('AUTH_SESSION_SECRET must be set when AUTH_ENABLED=true.');
  }
}
