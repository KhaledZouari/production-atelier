import jwt from 'jsonwebtoken';
export const auth = (roles = []) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (roles.length && !roles.includes(decoded.role)) return res.status(403).json({ message: 'Accès refusé' });
    req.user = decoded; next();
  } catch { res.status(401).json({ message: 'Token invalide' }); }
};
