/**
 * Middleware de autenticación — verifica JWT de Firebase.
 * Adjunta req.user con uid, email y nombre del profesor.
 */
module.exports = function createAuthMiddleware(firebaseAuth, isMock) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación requerido. Formato: Bearer <token>',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decoded = await firebaseAuth.verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        nombre: decoded.name || decoded.email?.split('@')[0] || 'Profesor',
      };
      next();
    } catch (error) {
      console.error('[Auth] Token inválido:', error.message);
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token de autenticación es inválido o ha expirado.',
      });
    }
  };
};
