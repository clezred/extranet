const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const db = new sqlite3.Database('./extranet.db', (err) => {
  if (err) {
    console.error("Error opening database.", err.message);
  } else {
    console.log('Connected to database.');
  }
});

// Init database user table and admin
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    surname TEXT,
    email TEXT,
    avatar TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_path TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.get("PRAGMA table_info(products)", (err, row) => {
    if (err || !row) return;
    db.all("PRAGMA table_info(products)", (listErr, rows) => {
      if (listErr) return;
      const hasOwnerId = rows.some((col) => col.name === 'owner_id');
      if (!hasOwnerId) {
        db.run("ALTER TABLE products ADD COLUMN owner_id INTEGER");
      }
    });
  });

  const stmt = db.prepare("INSERT OR IGNORE INTO users (username, name) VALUES (?, ?)");
  stmt.run("admin", "Administrateur");
  stmt.finalize();
  const passwordClair = "admin123";

  bcrypt.hash(passwordClair, saltRounds, (err, hash) => {
    db.run("UPDATE users SET password =  ? WHERE username = ?", [hash, "admin"]);
  });

  // Required users for Pentest
  const stmtU1 = db.prepare("INSERT OR IGNORE INTO users (username, name) VALUES (?, ?)");
  stmtU1.run("user1", "Utilisateur1");
  stmtU1.finalize();

  const stmtU2 = db.prepare("INSERT OR IGNORE INTO users (username, name) VALUES (?, ?)");
  stmtU2.run("user2", "Utilisateur2");
  stmtU2.finalize();

  const passwordClairU = "user123";

  bcrypt.hash(passwordClairU, saltRounds, (err, hash) => {
    db.run("UPDATE users SET password =  ? WHERE username = ?", [hash, "user1"]);
    db.run("UPDATE users SET password =  ? WHERE username = ?", [hash, "user2"]);
  });
});

module.exports = db;