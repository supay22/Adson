import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("minhasorte.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS daily_predictions (
    date TEXT PRIMARY KEY,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS winner_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Daily Predictions endpoints
  app.get("/api/predictions/daily", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const prediction = db.prepare("SELECT * FROM daily_predictions WHERE date = ?").get(today) as any;
    if (prediction) {
      res.json(JSON.parse(prediction.data));
    } else {
      res.status(404).json({ error: "No predictions for today" });
    }
  });

  app.post("/api/predictions/daily", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = req.body;
    try {
      const stmt = db.prepare("INSERT OR REPLACE INTO daily_predictions (date, data) VALUES (?, ?)");
      stmt.run(today, JSON.stringify(data));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save predictions" });
    }
  });

  // Auth endpoints
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
      const result = stmt.run(username, password);
      res.json({ id: result.lastInsertRowid, username, role: 'user' });
    } catch (error) {
      res.status(400).json({ error: "Usuário já existe" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Community endpoints
  app.get("/api/community/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT posts.*, users.username 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      ORDER BY created_at DESC
    `).all();
    res.json(posts);
  });

  app.post("/api/community/posts", (req, res) => {
    const { user_id, content } = req.body;
    const stmt = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
    const result = stmt.run(user_id, content);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/community/posts/:id", (req, res) => {
    const { id } = req.params;
    const { user_id, role } = req.body; // In a real app, this would be from a session/token
    
    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as any;
    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (role === 'admin' || post.user_id === user_id) {
      db.prepare("DELETE FROM posts WHERE id = ?").run(id);
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Sem permissão" });
    }
  });

  // Winner Comments endpoints
  app.get("/api/winner-comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM winner_comments ORDER BY created_at DESC").all();
    res.json(comments);
  });

  app.post("/api/winner-comments", (req, res) => {
    const { content } = req.body;
    const stmt = db.prepare("INSERT INTO winner_comments (content) VALUES (?)");
    const result = stmt.run(content);
    const newComment = db.prepare("SELECT * FROM winner_comments WHERE id = ?").get(result.lastInsertRowid);
    res.json(newComment);
  });

  // API to fetch lottery results with history
  app.get("/api/lottery/:type", async (req, res) => {
    const { type } = req.params;
    try {
      // Fetch latest
      const latestResponse = await axios.get(`https://loteriascaixa-api.herokuapp.com/api/${type}/latest`);
      const latest = latestResponse.data;
      const contestNumber = latest.concurso;

      // Fetch previous 2
      const history = [latest];
      for (let i = 1; i <= 2; i++) {
        try {
          const prevResponse = await axios.get(`https://loteriascaixa-api.herokuapp.com/api/${type}/${contestNumber - i}`);
          history.push(prevResponse.data);
        } catch (e) {
          console.warn(`Could not fetch history for ${type} contest ${contestNumber - i}`);
        }
      }

      res.json(history);
    } catch (error) {
      console.error("Error fetching lottery data:", error);
      res.status(500).json({ error: "Failed to fetch lottery data" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
