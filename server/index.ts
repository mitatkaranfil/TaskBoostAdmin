import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { PostgresStorage } from "./postgres";

// Initialize PostgreSQL storage
export const storage = new PostgresStorage();

const app = express();

// CORS ayarları
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basit test API endpoint'i
app.get("/api/test", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "API çalışıyor!",
    time: new Date().toISOString() 
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't catch our api routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      // Serve static files from dist/public in production
      const path = await import('path');
      const { dirname } = path;
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const distPath = path.resolve(__dirname, '../dist/public');
      app.use(express.static(distPath));
      
      // Handle client-side routing for SPA
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }

    // catch-all route for static files and client
    if (process.env.NODE_ENV === "development") {
      app.use(serveStatic);
    }

    // start the server
    const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    return server;

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();
