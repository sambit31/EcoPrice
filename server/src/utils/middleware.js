const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW,
  max: process.env.RATE_LIMIT_MAX
});

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { limiter, auth };