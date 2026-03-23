const authService = require('./auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await authService.register({ name, email, password });
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken();
    await authService.saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await authService.login({ email, password });
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken();
    await authService.saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const user = await authService.rotateRefreshToken(token);
    const accessToken = authService.generateAccessToken(user);
    const newRefreshToken = authService.generateRefreshToken();
    await authService.saveRefreshToken(user.id, newRefreshToken);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
