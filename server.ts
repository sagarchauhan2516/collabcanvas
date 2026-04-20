import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import { GoogleGenAI, Type as GeminiType } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // Security: Max payload 10mb prevents memory crash on image uploads
  app.use(express.json({ limit: "10mb" }));

  // Security: Rate limiter for AI endpoint
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    limit: 50, // 50 requests per 15 mins per IP
    message: { error: "Too many requests, please try again later." },
  });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Endpoint to run AI generation securely server-side
  app.post("/api/generate", apiLimiter, async (req, res) => {
    const { prompt, style, image, elements, mode } = req.body;
    
    if (!prompt && !image) {
      return res.status(400).json({ error: "Missing prompt or image" });
    }

    try {
      const parts: any[] = [{
        text: mode === 'refine' 
          ? `REFINE the current design based on these instructions: "${prompt}". 
             CURRENT ELEMENTS: ${JSON.stringify(elements)}
             
             Rules for Refinement:
             1. You can modify existing elements (keep their IDs) or add new ones.
             2. Maintain the existing style (${style || 'modern'}).
             3. If the user asks for a change, prioritize that over keeping everything same.
             4. Return the FULL updated list of elements.`
          : `Create a professional ${style || 'modern'} diagram or layout for: "${prompt}".`
      }];

      if (image) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: image.split(',')[1]
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: `You are an elite UX/UI Designer and Systems Architect. 
          STYLE: ${(style || 'modern').toUpperCase()}
          
          CORE RULES:
          - Use professional color palettes.
          - Use 'rect' for containers, 'diamond' for decisions, 'database' for storage.
          - Use 'image' for logos or photos if specified in the prompt.
          - Use 'emoji' for icons or visual accents (e.g., '🚀' for launch).
          - CONNECTIONS: Use 'arrow' elements to connect pieces.
          - SPACING: Use consistent padding and margins.
          - VALIDATION: Ensure all returned JSON elements strictly follow the schema.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: GeminiType.ARRAY,
            items: {
              type: GeminiType.OBJECT,
              properties: {
                id: { type: GeminiType.STRING },
                type: { type: GeminiType.STRING },
                x: { type: GeminiType.NUMBER },
                y: { type: GeminiType.NUMBER },
                width: { type: GeminiType.NUMBER },
                height: { type: GeminiType.NUMBER },
                radius: { type: GeminiType.NUMBER },
                points: { type: GeminiType.ARRAY, items: { type: GeminiType.NUMBER } },
                stroke: { type: GeminiType.STRING },
                strokeWidth: { type: GeminiType.NUMBER },
                fill: { type: GeminiType.STRING },
                text: { type: GeminiType.STRING },
                src: { type: GeminiType.STRING },
                fontSize: { type: GeminiType.NUMBER },
                fontFamily: { type: GeminiType.STRING },
                fontStyle: { type: GeminiType.STRING },
                cornerRadius: { type: GeminiType.NUMBER },
                fillType: { type: GeminiType.STRING },
                gradientColors: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING } },
                shadowBlur: { type: GeminiType.NUMBER },
                shadowColor: { type: GeminiType.STRING },
                opacity: { type: GeminiType.NUMBER },
                locked: { type: GeminiType.BOOLEAN }
              },
              required: ['type', 'x', 'y']
            }
          }
        }
      });

      if (!response.text) throw new Error("No response text from AI");
      const generatedElements = JSON.parse(response.text);
      res.json(generatedElements);

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate design" });
    }
  });

  // Endpoint to convert canvas elements to code
  app.post("/api/generate-code", apiLimiter, async (req, res) => {
    const { elements, format } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: "Missing or invalid elements array" });
    }

    try {
      const parts = [{
        text: `You are an expert Frontend Developer and Systems Engineer.
        Convert the following abstract canvas elements (structured as JSON rectangles, text, arrows, etc.) into functional, production-ready code.
        Format requested: ${format || 'React (Tailwind)'}
        
        CANVAS ELEMENTS:
        ${JSON.stringify(elements)}
        
        INSTRUCTIONS:
        1. Analyze the spatial relationships (x, y, width, height) to determine layout structure (rows, columns, absolute vs flexbox).
        2. Analyze connections (arrows/lines) if this is a flowchart.
        3. Output ONLY valid markdown with the code block. DO NOT SURROUND IT WITH EXPLANATORY TEXT.
        4. If it is React, use Tailwind CSS for styling and output a single functional component.`
      }];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: `You are an elite code generator.`
        }
      });

      if (!response.text) throw new Error("No response text from AI");
      
      // Clean up markdown block if present
      let code = response.text.trim();
      
      res.json({ code });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate code" });
    }
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? process.env.PUBLIC_URL : "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e7, // 10MB
  });

  const PORT = 3000;
  let canvasElements: any[] = [];
  const users: Record<string, any> = {};

  // Security: Simple rate limit array for sockets
  const socketRateLimits = new Map<string, number[]>();

  const isRateLimited = (socketId: string, limit: number, windowMs: number) => {
    const now = Date.now();
    let timestamps = socketRateLimits.get(socketId) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);
    
    if (timestamps.length >= limit) return true;
    
    timestamps.push(now);
    socketRateLimits.set(socketId, timestamps);
    return false;
  };

  // Basic Validation Helper
  const validateElement = (el: any) => {
    if (!el || typeof el !== 'object') return false;
    if (typeof el.id !== 'string') return false;
    if (typeof el.type !== 'string') return false;
    if (typeof el.x !== 'number' || typeof el.y !== 'number') return false;
    if (JSON.stringify(el).length > 2000000) return false; // Hard cap on sizes!
    return true;
  };

  io.on("connection", (socket) => {
    socket.emit("init", { elements: canvasElements });

    socket.on("join", (userData) => {
      users[socket.id] = { ...userData, id: socket.id };
      io.emit("users:update", Object.values(users));
    });

    socket.on("element:add", (element) => {
      if (isRateLimited(socket.id, 50, 1000)) return; // Max 50 adds per second
      if (!validateElement(element)) return;

      canvasElements.push(element);
      socket.broadcast.emit("element:added", element);
    });

    socket.on("element:update", (updatedElement) => {
      if (isRateLimited(socket.id, 100, 1000)) return; // Updates can be frequent (drag)
      if (!validateElement(updatedElement)) return;

      canvasElements = canvasElements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      );
      socket.broadcast.emit("element:updated", updatedElement);
    });

    socket.on("element:delete", (elementId) => {
      if (isRateLimited(socket.id, 20, 1000)) return;
      canvasElements = canvasElements.filter((el) => el.id !== elementId);
      socket.broadcast.emit("element:deleted", elementId);
    });

    socket.on("cursor:move", (pos) => {
      if (isRateLimited(socket.id, 50, 500)) return;
      if (users[socket.id]) {
        users[socket.id].cursor = pos;
        socket.broadcast.emit("cursor:moved", { userId: socket.id, cursor: pos });
      }
    });

    socket.on("canvas:clear", () => {
      if (isRateLimited(socket.id, 2, 60000)) return; // Heavily rate-limit clear
      canvasElements = [];
      io.emit("canvas:cleared");
    });

    socket.on("canvas:sync", (elements) => {
      if (isRateLimited(socket.id, 10, 10000)) return;
      if (!Array.isArray(elements) || elements.length > 5000) return; // Cap at 5000
      const validElements = elements.filter(validateElement);
      canvasElements = validElements;
      socket.broadcast.emit("init", { elements: canvasElements });
    });

    socket.on("disconnect", () => {
      socketRateLimits.delete(socket.id);
      delete users[socket.id];
      io.emit("users:update", Object.values(users));
    });
  });

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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
