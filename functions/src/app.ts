import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

export function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logger (brief, console only — surfaces in Cloud Logging).
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  registerRoutes(app);

  // Error handler — log and respond. No re-throw (keeps Cloud Logging clean).
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Unhandled error:", err);
    res.status(status).json({ success: false, error: message });
  });

  return app;
}
