import cors from 'cors';
import { config } from '../config/env';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
});
