import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import { GoogleGenAI, Type as GeminiType } from "@google/genai";
import * as dotenv from 'dotenv';
import helmet from "helmet";
import { body, validationResult } from "express-validator";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sanitizes a string by stripping HTML tags and script-injection patterns.
 * Prevents XSS via canvas text elements or AI prompts.
 */
const sanitizeText = (text: string): string => {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .substring(0, 5000); // Hard cap
};

async function startServer() {
  const app = express();

  // ─── Security middleware ────────────────────────────────────────────────────

  // Helmet sets a wide range of security-relevant HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "wss:",
            "ws:",
            "https://api.iconify.design",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
            "https://firestore.googleapis.com",
            "https://www.googleapis.com",
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Security: Max payload 10mb prevents memory crash on image uploads
  app.use(express.json({ limit: "10mb" }));

  // CORS configuration
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.PUBLIC_URL || ''].filter(Boolean)
    : ['http://localhost:3001', 'http://127.0.0.1:3001'];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (process.env.NODE_ENV !== "production") {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ─── Rate limiting ──────────────────────────────────────────────────────────

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    limit: 50,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // ─── Input validation middleware ────────────────────────────────────────────

  const validateGenerateRequest = [
    body('prompt').optional().isString().isLength({ max: 2000 }).trim(),
    body('style').optional().isString().isIn(['modern', 'minimal', 'corporate', 'creative', 'technical', 'playful']),
    body('mode').optional().isString().isIn(['new', 'refine']),
    body('elements').optional().isArray({ max: 5000 }),
  ];

  const validateCodeRequest = [
    body('elements').isArray({ min: 1, max: 5000 }),
    body('format').optional().isString().isLength({ max: 100 }),
  ];

  // ─── AI Generation Endpoint ─────────────────────────────────────────────────

  app.post("/api/generate", apiLimiter, validateGenerateRequest, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid request parameters", details: errors.array() });
    }

    const { prompt, style, image, elements, mode } = req.body;
    
    if (!prompt && !image) {
      return res.status(400).json({ error: "Missing prompt or image" });
    }

    // Sanitize user-provided text
    const sanitizedPrompt = prompt ? sanitizeText(prompt) : '';

    try {
      const parts: any[] = [{
        text: mode === 'refine' 
          ? `REFINE the current design based on these instructions: "${sanitizedPrompt}". 
             CURRENT ELEMENTS: ${JSON.stringify(elements)}
             
             Rules for Refinement:
             1. You can modify existing elements (keep their IDs) or add new ones.
             2. Maintain the existing style (${style || 'modern'}).
             3. If the user asks for a change, prioritize that over keeping everything same.
             4. Return the FULL updated list of elements.`
          : `Create a professional ${style || 'modern'} diagram or layout for: "${sanitizedPrompt}".`
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
        model: "gemini-2.0-flash",
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
      console.error('[API /generate]', e.message);
      res.status(500).json({ error: e.message || "Failed to generate design" });
    }
  });

  // ─── Canvas-to-Code Endpoint ────────────────────────────────────────────────

  app.post("/api/generate-code", apiLimiter, validateCodeRequest, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid request parameters", details: errors.array() });
    }

    const { elements, format } = req.body;

    try {
      const sanitizedFormat = format ? sanitizeText(format) : 'React (Tailwind)';
      const parts = [{
        text: `You are an expert Frontend Developer and Systems Engineer.
        Convert the following abstract canvas elements (structured as JSON rectangles, text, arrows, etc.) into functional, production-ready code.
        Format requested: ${sanitizedFormat}
        
        CANVAS ELEMENTS:
        ${JSON.stringify(elements)}
        
        INSTRUCTIONS:
        1. Analyze the spatial relationships (x, y, width, height) to determine layout structure (rows, columns, absolute vs flexbox).
        2. Analyze connections (arrows/lines) if this is a flowchart.
        3. Output ONLY valid markdown with the code block. DO NOT SURROUND IT WITH EXPLANATORY TEXT.
        4. If it is React, use Tailwind CSS for styling and output a single functional component.`
      }];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: `You are an elite code generator.`
        }
      });

      if (!response.text) throw new Error("No response text from AI");
      
      const code = response.text.trim();
      res.json({ code });

    } catch (e: any) {
      console.error('[API /generate-code]', e.message);
      res.status(500).json({ error: e.message || "Failed to generate code" });
    }
  });

  // ─── Health check ───────────────────────────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "CollabCanvas API",
    });
  });

  // ─── Socket.io ──────────────────────────────────────────────────────────────

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? allowedOrigins : "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e7, // 10MB
  });

  const PORT = parseInt(process.env.PORT || '3001');
  let canvasElements: any[] = [];
  const users: Record<string, any> = {};

  // Security: Simple rate limit map for sockets
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

  /** Validates a canvas element to prevent bad data from entering shared state. */
  const validateElement = (el: any): boolean => {
    if (!el || typeof el !== 'object') return false;
    if (typeof el.id !== 'string' || el.id.length > 50) return false;
    if (typeof el.type !== 'string' || el.type.length > 30) return false;
    if (typeof el.x !== 'number' || typeof el.y !== 'number') return false;
    if (!isFinite(el.x) || !isFinite(el.y)) return false;
    if (JSON.stringify(el).length > 2000000) return false; // Hard cap on sizes
    return true;
  };

  io.on("connection", (socket) => {
    socket.emit("init", { elements: canvasElements });

    socket.on("join", (userData) => {
      // Sanitize user name from socket events
      const safeName = typeof userData?.name === 'string'
        ? sanitizeText(userData.name).substring(0, 50)
        : 'Anonymous';
      users[socket.id] = { ...userData, name: safeName, id: socket.id };
      io.emit("users:update", Object.values(users));
    });

    socket.on("element:add", (element) => {
      if (isRateLimited(socket.id, 50, 1000)) return;
      if (!validateElement(element)) return;

      canvasElements.push(element);
      socket.broadcast.emit("element:added", element);
    });

    socket.on("element:update", (updatedElement) => {
      if (isRateLimited(socket.id, 100, 1000)) return;
      if (!validateElement(updatedElement)) return;

      canvasElements = canvasElements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      );
      socket.broadcast.emit("element:updated", updatedElement);
    });

    socket.on("element:delete", (elementId) => {
      if (isRateLimited(socket.id, 20, 1000)) return;
      if (typeof elementId !== 'string' || elementId.length > 50) return;
      canvasElements = canvasElements.filter((el) => el.id !== elementId);
      socket.broadcast.emit("element:deleted", elementId);
    });

    socket.on("cursor:move", (pos) => {
      if (isRateLimited(socket.id, 50, 500)) return;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
      if (!isFinite(pos.x) || !isFinite(pos.y)) return;
      if (users[socket.id]) {
        users[socket.id].cursor = pos;
        socket.broadcast.emit("cursor:moved", { userId: socket.id, cursor: pos });
      }
    });

    socket.on("canvas:clear", () => {
      if (isRateLimited(socket.id, 2, 60000)) return;
      canvasElements = [];
      io.emit("canvas:cleared");
    });

    socket.on("canvas:sync", (elements) => {
      if (isRateLimited(socket.id, 10, 10000)) return;
      if (!Array.isArray(elements) || elements.length > 5000) return;
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

  // ─── Static / Dev middleware ────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
    }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[CollabCanvas] Server running on http://localhost:${PORT}`);
  });
}

startServer();
