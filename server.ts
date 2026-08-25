import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import multer from "multer";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Environment Secret (Server-side only)
const SITE_PIN = process.env.PRIVATE_SITE_PIN || "1881";
const SESSION_COOKIE_NAME = "our_story_session";
const SESSION_SECRET_TOKEN = Buffer.from(`our-story-secret-${SITE_PIN}`).toString("base64");
const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for audio/video/images
  }
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Static Uploads Serving
app.use("/uploads", express.static(UPLOADS_DIR));

// Auth Verification Helper
function isAuthenticated(req: Request): boolean {
  const sessionToken = req.cookies[SESSION_COOKIE_NAME];
  return sessionToken === SESSION_SECRET_TOKEN;
}

// ==========================================
// 1. AUTHENTICATION API ROUTES
// ==========================================

// Check current session
app.get("/api/auth/session", (req: Request, res: Response) => {
  if (isAuthenticated(req)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

// Login endpoint
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ 
      success: false, 
      message: "Lütfen bir şifre girin." 
    });
  }

  // Strict server-side comparison
  if (pin.trim() === SITE_PIN.trim()) {
    // Set secure HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(SESSION_COOKIE_NAME, SESSION_SECRET_TOKEN, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/"
    });

    return res.json({ 
      success: true, 
      message: "Hoş geldiniz." 
    });
  }

  return res.status(401).json({ 
    success: false, 
    message: "Hatalı şifre." 
  });
});

// Logout endpoint
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: "/"
  });
  return res.json({ success: true, message: "Çıkış yapıldı." });
});

// ==========================================
// 2. ADMIN CMS & UPLOAD ROUTES
// ==========================================

app.get("/api/admin/db", (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.json({});
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    return res.json(JSON.parse(data));
  } catch (error) {
    return res.status(500).json({ error: "Failed to read database" });
  }
});

app.post("/api/admin/db", (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(req.body, null, 2), "utf8");
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to write database" });
  }
});

// Upload Single File (Audio, Image, etc.)
app.post("/api/admin/upload", (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ error: err.message || "File upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// YouTube Metadata Fetcher Helper
app.get("/api/admin/youtube-info", async (req: Request, res: Response) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing url query parameter" });
  }

  // Extract YouTube ID
  let videoId = "";
  const match = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    videoId = match[1];
  }

  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return res.json({
        videoId,
        title: data.title || "YouTube Track",
        author: data.author_name || "YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      });
    } else {
      return res.json({
        videoId,
        title: "YouTube Track",
        author: "YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      });
    }
  } catch (error) {
    return res.json({
      videoId,
      title: "YouTube Track",
      author: "YouTube",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    });
  }
});

// ==========================================
// 3. VITE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Couples Memory Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

