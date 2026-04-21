import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Local Neural Analysis (Python Component)
  app.post("/api/local-analyze", async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    try {
      console.log("Starting local neural analysis for:", text.substring(0, 50) + "...");
      const localResult = await new Promise((resolve) => {
        const escapedText = text.replace(/"/g, '\\"');
        // Increase timeout for model loading
        exec(`python3 model_engine.py "${escapedText}"`, { timeout: 10000 }, (error, stdout, stderr) => {
          if (error) {
            console.error("Local Model Error:", stderr || error.message);
            resolve({ status: "error", message: "Local model failed or timed out" });
          } else {
            try {
              resolve(JSON.parse(stdout));
            } catch (e) {
              resolve({ status: "error", message: "Parsing failed" });
            }
          }
        });
      });

      res.json(localResult);
    } catch (err) {
      console.error("Local Analysis Error:", err);
      res.status(500).json({ error: "Local analysis failed" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "TechGuard Hybrid Engine is active" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
