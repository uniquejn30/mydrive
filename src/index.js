import express from "express";
import bcrypt from "bcryptjs";
import { protectedRoute, generateToken } from "./middleware.js";
import { db } from "./db/db.js";
import { users, files } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { s3Helper } from "./s3.js";
import dotenv from "dotenv";
import path from "path";
import si from "systeminformation";

const __dirname = path.resolve();

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.use(express.json());

//frontend routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signin.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

//backend routes
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
      })
      .returning();
    const user = result[0];

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: "User created successfully",
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/signIn", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Get user from database
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    const user = result[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/metrics", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const temp = await si.cpuTemperature();
    const metrics = { cpu, mem, temp };
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

app.get("/files", protectedRoute, async (req, res) => {
  try {
    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, req.user.id))
      .orderBy(files.uploadedAt);

    res.json({ files: userFiles });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

app.delete("/files/:id", protectedRoute, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const result = await db.select().from(files).where(eq(files.id, fileId));
    const file = result[0];

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.userId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this file" });
    }

    await db.delete(files).where(eq(files.id, fileId));

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

app.get("/upload", protectedRoute, async (req, res) => {
  try {
    const { filename, contentType } = req.query;

    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const key = s3Helper.generateFileKey(req.user.id, filename);
    const { uploadUrl, expiresIn } = await s3Helper.generateUploadUrl(
      key,
      contentType
    );

    res.json({
      uploadUrl,
      key,
      expiresIn,
      message: "Upload URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

app.post("/files/confirm", protectedRoute, async (req, res) => {
  try {
    const { filename, size, key } = req.body;

    if (!filename || !size || !key) {
      return res
        .status(400)
        .json({ error: "Filename, size, and key are required" });
    }

    const result = await db
      .insert(files)
      .values({
        name: filename,
        size,
        key,
        userId: req.user.id,
      })
      .returning();
    const file = result[0];

    res.status(201).json({
      message: "File metadata saved successfully",
      file,
    });
  } catch (error) {
    console.error("Error saving file metadata:", error);
    res.status(500).json({ error: "Failed to save file metadata" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
