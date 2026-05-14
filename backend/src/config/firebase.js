/**
 * Firebase Admin SDK Configuration
 * Credenciales inyectadas vía variables de entorno — NUNCA en código fuente.
 */
const admin = require('firebase-admin');

let db, auth;

function initializeFirebase() {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase] Inicializado con Service Account');
    } else {
      // Modo desarrollo sin Firebase — usa un mock in-memory
      console.warn('[Firebase] ⚠️  FIREBASE_SERVICE_ACCOUNT no configurado.');
      console.warn('[Firebase] Ejecutando en modo MOCK (datos en memoria).');
      return initializeMock();
    }

    db = admin.firestore();
    auth = admin.auth();

    return { admin, db, auth, isMock: false };
  } catch (error) {
    console.error('[Firebase] Error de inicialización:', error.message);
    console.warn('[Firebase] Fallback a modo MOCK.');
    return initializeMock();
  }
}

/**
 * Mock in-memory para desarrollo local sin Firebase
 */
function initializeMock() {
  const collections = {};

  const mockDb = {
    collection: (name) => {
      if (!collections[name]) collections[name] = {};
      return {
        doc: (id) => ({
          get: async () => ({
            exists: !!collections[name][id],
            id,
            data: () => collections[name][id] || null,
          }),
          set: async (data) => {
            collections[name][id] = { ...data };
          },
          update: async (data) => {
            collections[name][id] = { ...collections[name][id], ...data };
          },
          delete: async () => {
            delete collections[name][id];
          },
          ref: { delete: async () => { delete collections[name][id]; } }
        }),
        add: async (data) => {
          const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          collections[name][id] = { ...data };
          return { id };
        },
        where: (field, op, value) => {
          return createMockQuery(name, [{ field, op, value }]);
        },
        get: async () => {
          const docs = Object.entries(collections[name] || {}).map(([id, data]) => ({
            id,
            data: () => data,
            ref: { delete: async () => { delete collections[name][id]; } }
          }));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
        orderBy: () => createMockQuery(name, []),
      };
    },
  };

  function createMockQuery(collectionName, filters) {
    return {
      where: (field, op, value) => {
        filters.push({ field, op, value });
        return createMockQuery(collectionName, filters);
      },
      orderBy: () => createMockQuery(collectionName, filters),
      limit: () => createMockQuery(collectionName, filters),
      get: async () => {
        let docs = Object.entries(collections[collectionName] || {}).map(([id, data]) => ({
          id,
          data: () => data,
          ref: { delete: async () => { delete collections[collectionName][id]; } }
        }));

        // Apply filters
        for (const filter of filters) {
          docs = docs.filter((doc) => {
            const val = doc.data()[filter.field];
            switch (filter.op) {
              case '==': return val === filter.value;
              case '!=': return val !== filter.value;
              case '<': return val < filter.value;
              case '<=': return val <= filter.value;
              case '>': return val > filter.value;
              case '>=': return val >= filter.value;
              default: return true;
            }
          });
        }

        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }

  // Mock de usuarios para desarrollo
  const mockUsers = {};
  const mockAuth = {
    verifyIdToken: async (token) => {
      // En modo mock, el token es simplemente el UID
      if (token.startsWith('mock_')) {
        const uid = token.replace('mock_', '');
        return {
          uid,
          email: mockUsers[uid]?.email || `${uid}@costacollege.cl`,
          name: mockUsers[uid]?.displayName || 'Profesor Mock',
        };
      }
      throw new Error('Token inválido');
    },
    createUser: async (data) => {
      const uid = 'user_' + Date.now();
      mockUsers[uid] = { uid, ...data };
      return { uid, ...data };
    },
    updateUser: async (uid, data) => {
      mockUsers[uid] = { ...mockUsers[uid], ...data };
      return mockUsers[uid];
    },
    deleteUser: async (uid) => {
      delete mockUsers[uid];
    },
    getUser: async (uid) => {
      if (!mockUsers[uid]) throw new Error('User not found');
      return mockUsers[uid];
    },
    listUsers: async () => {
      return { users: Object.values(mockUsers) };
    },
  };

  return { admin: null, db: mockDb, auth: mockAuth, isMock: true };
}

module.exports = { initializeFirebase };
