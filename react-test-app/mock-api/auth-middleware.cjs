const crypto = require('crypto');

// JWT Secret (in production, this should come from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt';

// Simple JWT implementation
const createSimpleJWT = (payload, expiresIn = '24h') => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === '24h' ? 24 * 60 * 60 : 60 * 60);

  const payloadWithExp = { ...payload, exp, iat: now };
  const payloadStr = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url');

  const data = `${header}.${payloadStr}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');

  return `${data}.${signature}`;
};

const verifySimpleJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

// Load database
const loadDatabase = () => {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(__dirname, 'db.json');
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

// Save database
const saveDatabase = (db) => {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

// Determine if a route requires authentication
function isProtectedRoute(url) {
  // Protect all API routes except authentication endpoints
  if (url.startsWith('/auth/')) {
    return false; // Auth endpoints don't need JWT
  }
  if (url.startsWith('/')) {
    return true; // All other API routes need JWT
  }
  return false;
}

// Handle login
function handleLogin(request, response) {
  const { email, password } = request.body;

  if (!email || !password) {
    response.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const db = loadDatabase();
    const user = db.users.find(u => u.email === email && u.password === password);

    if (!user) {
      response.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Create JWT token with all user info for persistence
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const token = createSimpleJWT(userPayload, '24h');
    response.status(200).json({
      user: userPayload,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

// Handle registration
function handleRegister(request, response) {
  const { username, email, password, firstName, lastName } = request.body;

  if (!username || !email || !password) {
    response.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  try {
    const db = loadDatabase();

    // Check if user already exists
    const existingUser = db.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      response.status(409).json({ error: 'User already exists' });
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      username,
      email,
      password, // In production, this should be hashed
      firstName: firstName || '',
      lastName: lastName || '',
      avatar: `https://ui-avatars.com/api/?name=${firstName || username}+${lastName || ''}&background=random&size=200&color=fff&format=png`,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add user to database
    db.users.push(newUser);
    saveDatabase(db);

    // Create JWT token for the new user with all info for persistence
    const userPayload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      avatar: newUser.avatar,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    const token = createSimpleJWT(userPayload, '24h');
    response.status(201).json({
      user: userPayload,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Registration error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

// JSON Server middleware for authentication
module.exports = function authMiddleware(request, response, next) {
  const { method, url, body, headers } = request;

  // Handle auth routes
  if (url.startsWith('/auth/')) {
    if (method === 'POST') {
      if (url === '/auth/login') {
        handleLogin(request, response);
        return;
      } else if (url === '/auth/register') {
        handleRegister(request, response);
        return;
      } else {
        response.status(404).json({ error: 'Auth endpoint not found' });
        return;
      }
    }
  }

  // For protected routes, check if JWT token is valid
  if (isProtectedRoute(url)) {
    const authHeader = headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      response.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = verifySimpleJWT(token);
    if (!decoded) {
      response.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Add user info to request for use in routes
    request.user = decoded;
  }

  next();
};
