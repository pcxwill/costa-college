const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA5sJWxVkCEbp1TozQUQcSNrfejfQFLVXw",
  authDomain: "costa-college.firebaseapp.com",
  projectId: "costa-college",
  storageBucket: "costa-college.firebasestorage.app",
  messagingSenderId: "344726618765",
  appId: "1:344726618765:web:9a8ed9a46a6798aa87d8c4"
};

async function test() {
  console.log("Inicializando Firebase client...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log("Intentando leer colección 'news'...");
    const snapshot = await getDocs(collection(db, "news"));
    console.log(`Leídos ${snapshot.size} documentos.`);
    snapshot.forEach(doc => {
      console.log(`- Documento ID: ${doc.id}, Datos:`, doc.data());
    });

    console.log("Intentando escribir un documento de prueba...");
    const testDocRef = doc(db, "news", "test-connection-" + Date.now());
    await setDoc(testDocRef, {
      title: "Prueba de conexión",
      date: new Date().toISOString()
    });
    console.log("¡Escritura exitosa!");
  } catch (err) {
    console.error("Error en Firebase client:", err);
  }
}

test();
