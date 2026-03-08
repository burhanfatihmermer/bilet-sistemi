import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tickets.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    attendee_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checked_in_at DATETIME
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/tickets", (req, res) => {
    try {
      const tickets = db.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.post("/api/tickets", (req, res) => {
    const { attendee_name, email } = req.body;
    if (!attendee_name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const id = uuidv4();
    try {
      db.prepare("INSERT INTO tickets (id, attendee_name, email) VALUES (?, ?, ?)")
        .run(id, attendee_name, email);
      const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
      res.status(201).json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.post("/api/tickets/check-in", (req, res) => {
    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: "Ticket ID is required" });
    }

    try {
      const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.status === 'checked_in') {
        return res.status(400).json({ 
          error: "Already checked in", 
          attendee_name: ticket.attendee_name,
          checked_in_at: ticket.checked_in_at 
        });
      }

      const now = new Date().toISOString();
      db.prepare("UPDATE tickets SET status = 'checked_in', checked_in_at = ? WHERE id = ?")
        .run(now, ticketId);
      
      const updatedTicket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
      res.json({ message: "Check-in successful", ticket: updatedTicket });
    } catch (error) {
      res.status(500).json({ error: "Check-in failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
