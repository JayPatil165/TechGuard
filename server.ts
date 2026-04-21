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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API route for Hybrid Analysis
  app.post("/api/analyze", async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    try {
      // 1. Local Deep Learning Analysis (Python Component)
      const localResult = await new Promise((resolve) => {
        // We use a safe string character escape for the command line
        const escapedText = text.replace(/"/g, '\\"');
        exec(`python3 model_engine.py "${escapedText}"`, (error, stdout, stderr) => {
          if (error) {
            console.error("Local Model Error:", stderr);
            resolve({ status: "error", message: "Local model failed" });
          } else {
            try {
              resolve(JSON.parse(stdout));
            } catch (e) {
              resolve({ status: "error", message: "Parsing failed" });
            }
          }
        });
      });

      // 2. Remote AI Reasoning (Gemini API)
      const prompt = `You are a Senior Computer Solutions Expert. Analyze the following computer-related problem and provide a structured technical solution. 
      Input description: "${text}"
      
      Requirements:
      - problemSummary: Short summary of the detected problem.
      - rootCause: Likely technical reason for the issue.
      - solutions: Array of objects with title, steps (array), explanation, and difficulty (Easy/Intermediate/Advanced).
      - resources: Array of objects with label, url, and type (Documentation/Video/Download/Article).
      - urgency: High, Medium, or Low.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const aiData = JSON.parse(response.text);

      // Combine Results
      const finalResult = {
        ...aiData,
        localAnalysis: localResult
      };

      res.json(finalResult);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Analysis failed" });
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
