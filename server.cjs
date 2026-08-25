var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
var SITE_PIN = process.env.PRIVATE_SITE_PIN || "1881";
var SESSION_COOKIE_NAME = "our_story_session";
var SESSION_SECRET_TOKEN = Buffer.from(`our-story-secret-${SITE_PIN}`).toString("base64");
var DB_PATH = import_path.default.join(process.cwd(), "src", "data", "db.json");
var UPLOADS_DIR = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOADS_DIR)) {
  import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path.default.extname(file.originalname).toLowerCase();
    const safeName = import_path.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100MB limit for audio/video/images
  }
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((0, import_cookie_parser.default)());
app.use("/uploads", import_express.default.static(UPLOADS_DIR));
function isAuthenticated(req) {
  const sessionToken = req.cookies[SESSION_COOKIE_NAME];
  return sessionToken === SESSION_SECRET_TOKEN;
}
app.get("/api/auth/session", (req, res) => {
  if (isAuthenticated(req)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});
app.post("/api/auth/login", (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== "string") {
    return res.status(400).json({
      success: false,
      message: "L\xFCtfen bir \u015Fifre girin."
    });
  }
  if (pin.trim() === SITE_PIN.trim()) {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(SESSION_COOKIE_NAME, SESSION_SECRET_TOKEN, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      path: "/"
    });
    return res.json({
      success: true,
      message: "Ho\u015F geldiniz."
    });
  }
  return res.status(401).json({
    success: false,
    message: "Hatal\u0131 \u015Fifre."
  });
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: "/"
  });
  return res.json({ success: true, message: "\xC7\u0131k\u0131\u015F yap\u0131ld\u0131." });
});
app.get("/api/admin/db", (req, res) => {
  try {
    if (!import_fs.default.existsSync(DB_PATH)) {
      return res.json({});
    }
    const data = import_fs.default.readFileSync(DB_PATH, "utf8");
    return res.json(JSON.parse(data));
  } catch (error) {
    return res.status(500).json({ error: "Failed to read database" });
  }
});
app.post("/api/admin/db", (req, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const dir = import_path.default.dirname(DB_PATH);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(req.body, null, 2), "utf8");
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to write database" });
  }
});
app.post("/api/admin/upload", (req, res, next) => {
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
app.get("/api/admin/youtube-info", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing url query parameter" });
  }
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
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3e3
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Couples Memory Server] Running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
