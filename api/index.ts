import express from "express";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// For Vercel Serverless environment, we need to locate the DB in /tmp 
// because the rest of the filesystem is read-only.
// In dev (or local), we use tickets.db
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
const dbFile = isProd ? "/tmp/tickets.db" : "tickets.db";

const db = new Database(dbFile);

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

const app = express();
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

// Admin: Bulk Insert Tickets
app.post("/api/tickets/bulk", (req, res) => {
  const { tickets } = req.body;
  if (!Array.isArray(tickets)) {
    return res.status(400).json({ error: "Format hatası. Liste 'tickets' anahtarı altında bir dizi (array) olmalıdır." });
  }

  const insertTicket = db.prepare(
    "INSERT OR IGNORE INTO tickets (id, attendee_name, email) VALUES (?, ?, ?)"
  );

  const insertMany = db.transaction((ticketsArray: any[]) => {
    let insertedCount = 0;
    for (const t of ticketsArray) {
      // Required fields
      if (t.id && t.attendee_name && t.email) {
        const info = insertTicket.run(t.id, t.attendee_name, t.email);
        if (info.changes > 0) insertedCount++;
      }
    }
    return insertedCount;
  });

  try {
    const insertedCount = insertMany(tickets);
    res.status(201).json({ message: "Toplu ekleme başarılı", insertedCount });
  } catch (error) {
    console.error("Bulk Insert Error:", error);
    res.status(500).json({ error: "Biletler eklenirken bir veritabanı hatası oluştu" });
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

export default app;
