const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const PORT = 5000;

const db = require('./database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

const SECRET_KEY = "IUGGEOZIJFPZFJUVEBOZNOIHPMAQNXBCJFILZPPS";

const TOKEN_BLACKLIST = new Set();

const baseURL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

const defaultAvatarPath = '/uploads/avatars/default.png';

// Enable CORS for frontend
const corsOriginsEnv = process.env.CORS_ORIGINS || 'http://localhost:5173';
const allowedOrigins = corsOriginsEnv.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: false
}));

app.use(express.json());

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(403).json({ error: "Missing token." });

  if (TOKEN_BLACKLIST.has(token)) return res.status(401).json({ error: "Invalid token." });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token." });
    req.user = decoded; 
    next();
  });
};

// API Status
app.get('/api/status', (req, res) => {
  res.json({ 
    message: "Backend is responding !",
    status: "Connected" 
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: '1h' }
      );

      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: "Invalid credentials." })
    }
  });
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, name, surname, email } = req.body;

  if (!username) {
    return res.status(400).json({ error: "username is required." });
  }
  if (!password) {
    return res.status(400).json({ error: "password is required." });
  }

  // Validate username format: only lowercase letters, dots and underscores
  const usernameRegex = /^[a-z._0-9]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: "Username can only contain lowercase letters, dots (.) and underscores (_)" });
  }

  // Validate username length
  if (username.length > 32) {
    return res.status(400).json({ error: "Username must not exceed 32 characters" });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `INSERT INTO users (username, password, name, surname, email, avatar) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [username, hashedPassword, name, surname, email, defaultAvatarPath], function(err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(400).json({ error: "This username is already taken" });
        }
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ 
        success: true, 
        message: "User successfully created.",
        userId: this.lastID 
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Error occured during password hash" });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) TOKEN_BLACKLIST.add(token);
  res.json({ success: true });
});

// Check username availability
app.get('/api/check-username', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  const query = "SELECT COUNT(*) AS count FROM users WHERE username = ?";

  db.get(query, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const isAvailable = row.count === 0;
    
    res.json({ 
      username, 
      available: isAvailable 
    });
  });
});

// Get profile
app.get('/api/profile', verifyToken, (req, res) => {
  const userId = req.user.userId;

  const query = "SELECT id, username, name, surname, email, avatar FROM users WHERE id = ?"
  
  db.get(query, [userId], (err, user) => {
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        email: user.email,
        avatar: user.avatar ? baseURL + user.avatar : baseURL + defaultAvatarPath
      })
    }
  })
})

// Update profile 
app.post('/api/profile/update', verifyToken, upload.single('avatar'), (req, res) => {
  const userId = req.user.userId;
  const { id, name, surname, email, removeAvatar } = req.body;

  if (userId != id) {
    res.json({ success: false, message: "Session user id and request user id does not correspond." })
  }

  const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
  const shouldRemoveAvatar = removeAvatar === 'true';

  db.get('SELECT avatar FROM users WHERE id = ?', [id], (getErr, user) => {
    if (getErr) return res.status(500).json({ error: getErr.message });

    const currentAvatar = user?.avatar;

    let query = 'UPDATE users SET name = ?, surname = ?, email = ?';
    const params = [name, surname, email];

    if (shouldRemoveAvatar) {
      query += ', avatar = NULL';
    } else if (avatarPath) {
      query += ', avatar = ?';
      params.push(avatarPath);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });

      if (shouldRemoveAvatar && currentAvatar && currentAvatar !== defaultAvatarPath) {
        const filePath = path.resolve(__dirname, '..', currentAvatar.replace(/^\/+/, ''));
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') {
            console.error('Error deleting avatar file:', unlinkErr);
          }
        });
      }

      res.json({ success: true, message: "Profile updated" });
    });
  });
});

// Products list
app.get('/api/products', (req, res) => {
  const query = `SELECT p.id, p.name, p.image_path, p.description, p.created_at, p.owner_id,
    u.username AS owner_username
    FROM products p
    LEFT JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Products create
app.post('/api/products', verifyToken, (req, res) => {
  const { name, imagePath, description } = req.body;
  const ownerId = req.user.userId;

  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const createdAt = new Date().toISOString();
  const query = `INSERT INTO products (name, image_path, description, created_at, owner_id)
    VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [name, imagePath || null, description || null, createdAt, ownerId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      success: true,
      id: this.lastID,
      name,
      image_path: imagePath || null,
      description: description || null,
      created_at: createdAt,
      owner_id: ownerId
    });
  });
});

// Products update
app.put('/api/products/:id', verifyToken, (req, res) => {
  const productId = req.params.id;
  const { name, imagePath, description } = req.body;
  const ownerId = req.user.userId;

  if (!name && !imagePath && !description) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  db.get('SELECT owner_id FROM products WHERE id = ?', [productId], (getErr, product) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.owner_id !== ownerId) {
      return res.status(403).json({ error: 'Not allowed to edit this product.' });
    }

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (imagePath !== undefined) {
      updates.push('image_path = ?');
      params.push(imagePath || null);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }

    const updateQuery = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    params.push(productId);

    db.run(updateQuery, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Products delete
app.delete('/api/products/:id', verifyToken, (req, res) => {
  const productId = req.params.id;
  const ownerId = req.user.userId;

  db.get('SELECT owner_id FROM products WHERE id = ?', [productId], (getErr, product) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.owner_id !== ownerId) {
      return res.status(403).json({ error: 'Not allowed to delete this product.' });
    }

    db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});