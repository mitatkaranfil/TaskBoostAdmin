import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  try {
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          console.error('Vite Error:', msg);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (e) {
    console.error('Error setting up Vite:', e);
    throw e;
  }
}

export function serveStatic(app: Express) {
  const publicPath = path.resolve(__dirname, "..", "client", "public");
  
  if (!fs.existsSync(publicPath)) {
    console.log('Public directory not found. Creating...');
    fs.mkdirSync(publicPath, { recursive: true });
  }

  return (req: any, res: any) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  };
}
