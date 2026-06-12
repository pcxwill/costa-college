/**
 * Costa College — Blog & News Manager
 * Handles: Dynamic loading, category filtering, reading modal, press login, and article administration.
 */
// Default Seed Articles
const DEFAULT_NEWS = [];

// State Manager
let newsList = [];
let currentFilter = "all";
let editingArticleId = null;

// Firebase Init
const firebaseConfig = {
  apiKey: "AIzaSyA5sJWxVkCEbp1TozQUQcSNrfejfQFLVXw",
  authDomain: "costa-college.firebaseapp.com",
  projectId: "costa-college",
  storageBucket: "costa-college.firebasestorage.app",
  messagingSenderId: "344726618765",
  appId: "1:344726618765:web:9a8ed9a46a6798aa87d8c4"
};

let db = null;
if (typeof firebase !== "undefined") {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log("[Firebase] Firestore inicializado desde el cliente.");
  } catch (e) {
    console.error("Error al inicializar Firebase Firestore:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize News Data
  initNewsData();

  // Find latest month and set as initial filter
  const availableMonths = getAvailableMonths();
  if (availableMonths.length > 0) {
    currentFilter = availableMonths[0].label;
  } else {
    currentFilter = "";
  }

  // Initial Render
  renderNewsGrid();
  renderFilterButtons();

  // Setup UI Listeners
  setupEventListeners();

  // Check Deep Linking (URL Query ?id=...)
  checkDeepLink();

  // Check login state
  checkLoginState();
});

// Initialize News from LocalStorage or Seed Data
async function initNewsData() {
  const storedNews = localStorage.getItem("costa_news");
  if (!storedNews) {
    newsList = [];
  } else {
    newsList = JSON.parse(storedNews);
  }

  // Load from Firestore if available
  if (db) {
    try {
      const snapshot = await db.collection("news").get();
      const firestoreNews = [];
      snapshot.forEach(doc => {
        firestoreNews.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort chronologically/by timestamp
      firestoreNews.sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return timeB - timeA;
      });

      newsList = firestoreNews;
      localStorage.setItem("costa_news", JSON.stringify(newsList));
      
      // Re-render and select latest month
      const availableMonths = getAvailableMonths();
      if (availableMonths.length > 0) {
        if (!currentFilter || !availableMonths.some(m => m.label === currentFilter)) {
          currentFilter = availableMonths[0].label;
        }
      } else {
        currentFilter = "";
      }
      renderFilterButtons();
      renderNewsGrid();
      
      // If on admin panel, re-render list too
      if (typeof renderAdminNewsList === "function") {
        renderAdminNewsList();
      }
    } catch (e) {
      console.error("Error al sincronizar con Firestore:", e);
    }
  }
}

// Render the Main News Cards Grid
function renderNewsGrid() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const filteredNews = newsList.filter(article => {
    const { label } = getMonthAndYear(article.date);
    return label === currentFilter;
  });

  if (filteredNews.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: var(--space-12) 0; color: rgba(255,255,255,0.4);">
        <p style="font-size: var(--text-md);">No hay noticias disponibles para este mes.</p>
      </div>
    `;
    return;
  }

  filteredNews.forEach(article => {
    const card = document.createElement("a");
    card.href = "#";
    card.className = "news-card";
    card.dataset.id = article.id;
    
    // Choose image source
    const imgSrc = article.image || "assets/images/costa-al-dia.png";
    const imgClass = article.isDefaultImage || !article.image ? "logo-contain" : "";

    card.innerHTML = `
      <div class="news-card-img">
        <img src="${imgSrc}" class="${imgClass}" alt="${article.title}">
      </div>
      <div class="news-card-body">
        <div class="news-card-date">${article.date}</div>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <span class="news-card-link">Leer artículo completo →</span>
      </div>
    `;

    card.addEventListener("click", (e) => {
      e.preventDefault();
      openArticleModal(article.id);
    });

    grid.appendChild(card);
  });
}

// Filter Navigation Setup
function getMonthAndYear(dateStr) {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const yearMatch = dateStr.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  
  let month = "";
  for (const m of months) {
    if (dateStr.toLowerCase().includes(m.toLowerCase())) {
      month = m;
      break;
    }
  }
  if (!month) {
    month = months[new Date().getMonth()];
  }
  return { month, year, label: `${month} ${year}` };
}

function getAvailableMonths() {
  const monthsMap = {};
  newsList.forEach(article => {
    const { month, year, label } = getMonthAndYear(article.date);
    const key = `${year}-${month}`;
    monthsMap[key] = { month, year, label };
  });

  const monthOrder = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return Object.values(monthsMap).sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
  });
}

function renderFilterButtons() {
  const container = document.getElementById("filterContainer");
  if (!container) return;

  container.innerHTML = "";

  const availableMonths = getAvailableMonths();
  if (availableMonths.length === 0) return;

  availableMonths.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    if (m.label === currentFilter) {
      btn.classList.add("active");
    }
    btn.dataset.filter = m.label;
    btn.textContent = m.label;
    container.appendChild(btn);
  });
}

function updateFilterButtons() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === currentFilter);
  });
}

function setupEventListeners() {
  // Category Filters
  const filterContainer = document.getElementById("filterContainer");
  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (btn) {
        currentFilter = btn.dataset.filter;
        updateFilterButtons();
        renderNewsGrid();
      }
    });
  }

  // Modals close buttons
  document.querySelectorAll(".modal-close, .modal-backdrop").forEach(element => {
    element.addEventListener("click", (e) => {
      // If backdrop is clicked, make sure it's the backdrop itself, not content
      if (e.target.classList.contains("modal-backdrop") || e.target.closest(".modal-close")) {
        closeAllModals();
      }
    });
  });

  // Prevent closing when clicking inside modal content
  document.querySelectorAll(".modal-content").forEach(content => {
    content.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  // Login form submit
  const loginForm = document.getElementById("pressLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handlePressLogin();
    });
  }

  // Admin Create Article form submit
  const createArticleForm = document.getElementById("createArticleForm");
  if (createArticleForm) {
    createArticleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleCreateArticle();
    });
  }

  // Cancel Edit button
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      cancelEdit();
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      handlePressLogout();
    });
  }

  // Login Open button
  const openLoginBtn = document.getElementById("openLoginBtn");
  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal("loginModal");
    });
  }
}

// Modal actions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.classList.remove("open");
  });
  document.body.style.overflow = ""; // Restore scroll
  
  // Clean URL parameter when closing reading modal to prevent opening again on reload
  const url = new URL(window.location);
  url.searchParams.delete("id");
  window.history.pushState({}, '', url);
}

// Helper to transform Drive PDF URL to embeddable URL
function getEmbeddablePdfUrl(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  return url;
}

// Open Article in Fluid Reading Modal
function openArticleModal(id) {
  const article = newsList.find(a => a.id === id);
  if (!article) return;

  const modalBody = document.getElementById("readingModalBody");
  if (!modalBody) return;

  const imgSrc = article.image || "assets/images/costa-al-dia.png";
  const imgClass = article.isDefaultImage || !article.image ? "logo-contain" : "";

  let pdfSectionHTML = "";
  if (article.pdfUrl) {
    const embedUrl = getEmbeddablePdfUrl(article.pdfUrl);
    pdfSectionHTML = `
      <div class="pdf-viewer-section" style="margin-top: var(--space-8); border-top: 1px solid var(--gray-200); padding-top: var(--space-6);">
        <h3 style="font-family: var(--font-heading); margin-bottom: var(--space-4); color: var(--navy); font-size: var(--text-lg);">Documento Diario/Boletín PDF</h3>
        <div class="pdf-viewer-container" style="position: relative; width: 100%; height: 600px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--gray-300); background: #f5f5f5; box-shadow: var(--shadow-sm);">
          <iframe src="${embedUrl}" width="100%" height="100%" allow="autoplay" style="border: none;"></iframe>
        </div>
        <div style="margin-top: var(--space-4); text-align: center;">
          <a href="${article.pdfUrl}" target="_blank" class="btn btn-outline-gold" style="padding: var(--space-2) var(--space-6); display: inline-flex; align-items: center; gap: var(--space-2); text-decoration: none; font-size: var(--text-sm);">
            <span>📥</span> Abrir Documento en Nueva Pestaña
          </a>
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <article>
      <header class="article-header">
        <div class="article-meta">
          <span class="category-tag">${getFriendlyCategory(article.category)}</span>
          <span>•</span>
          <span>${article.date}</span>
        </div>
        <h1 class="article-title">${article.title}</h1>
      </header>
      <div class="article-image">
        <img src="${imgSrc}" class="${imgClass}" alt="${article.title}">
      </div>
      <div class="article-text">
        ${article.content}
      </div>
      ${pdfSectionHTML}
    </article>
  `;

  // Update URL for deep linking sharing
  const url = new URL(window.location);
  url.searchParams.set("id", id);
  window.history.pushState({}, '', url);

  openModal("readingModal");
}

function getFriendlyCategory(category) {
  const categories = {
    academico: "Académico",
    deportes: "Deportes",
    comunidad: "Comunidad"
  };
  return categories[category] || category;
}

// Deep Linking Check
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    openArticleModal(id);
  }
}

// Check if User is Press Writer
function checkLoginState() {
  const isLoggedIn = localStorage.getItem("press_logged_in") === "true";
  const adminPanelSection = document.getElementById("adminPanelSection");
  const openLoginWrapper = document.getElementById("openLoginWrapper");

  if (isLoggedIn) {
    if (adminPanelSection) adminPanelSection.style.display = "block";
    if (openLoginWrapper) openLoginWrapper.style.display = "none";
    renderAdminNewsList();
  } else {
    if (adminPanelSection) adminPanelSection.style.display = "none";
    if (openLoginWrapper) openLoginWrapper.style.display = "block";
  }
}

// Authenticate Press User
function handlePressLogin() {
  const usernameInput = document.getElementById("pressUsername");
  const passwordInput = document.getElementById("pressPassword");

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  const isPrensa = username === "prensa" || username === "prensa@costacollege.cl";
  const isSoporte = username === "soporte" || username === "soporte@costacollege.cl";

  // Simple check for simulation
  if (
    (isPrensa && password === "costaprensa2026") ||
    (isSoporte && password === "costasoporte2026")
  ) {
    localStorage.setItem("press_logged_in", "true");

    // Intenta iniciar sesión en Firebase Auth en segundo plano
    if (typeof firebase !== "undefined" && firebase.auth) {
      const email = isPrensa ? "prensa@costacollege.cl" : "soporte@costacollege.cl";
      firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
        console.log("[Firebase Auth] Sesión iniciada con éxito en la nube.");
      }).catch(err => {
        console.warn("[Firebase Auth] No se pudo iniciar sesión en Firebase. Se usará el modo offline/reglas públicas:", err.message);
      });
    }

    checkLoginState();
    closeAllModals();
    
    // Clear inputs
    usernameInput.value = "";
    passwordInput.value = "";
    
    if (typeof showToast === "function") {
      showToast("Sesión iniciada correctamente como Administración de Prensa.", "success");
    } else {
      alert("Sesión iniciada correctamente.");
    }
  } else {
    if (typeof showToast === "function") {
      showToast("Credenciales incorrectas. Intente nuevamente.", "error");
    } else {
      alert("Credenciales incorrectas.");
    }
  }
}

// Logout Press User
function handlePressLogout() {
  localStorage.removeItem("press_logged_in");

  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().signOut().catch(err => {
      console.warn("[Firebase Auth] Error al cerrar sesión en Firebase:", err.message);
    });
  }

  checkLoginState();
  if (typeof showToast === "function") {
    showToast("Sesión de Prensa cerrada.", "info");
  }
}

// Admin: Render News Lists to manage deletion and editing
function renderAdminNewsList() {
  const listContainer = document.getElementById("adminNewsItems");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  newsList.forEach(article => {
    const item = document.createElement("div");
    item.className = "admin-news-item";
    item.innerHTML = `
      <div style="overflow: hidden; text-overflow: ellipsis; padding-right: var(--space-4); flex-grow: 1;">
        <h4>${article.title}</h4>
        <span style="font-size: var(--text-xs); color: var(--gray-500);">${getFriendlyCategory(article.category)} | ${article.date}</span>
      </div>
      <div style="display: flex; gap: var(--space-2); flex-shrink: 0;">
        <button class="btn-edit" data-id="${article.id}" style="background: var(--navy); color: var(--gold); border: 1px solid var(--gold); padding: var(--space-1.5) var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 600; cursor: pointer; transition: all var(--transition-fast);">Editar</button>
        <button class="btn-danger" data-id="${article.id}">Eliminar</button>
      </div>
    `;

    item.querySelector(".btn-edit").addEventListener("click", () => {
      startEditArticle(article.id);
    });

    item.querySelector(".btn-danger").addEventListener("click", () => {
      if (confirm(`¿Está seguro de que desea eliminar la noticia "${article.title}"?`)) {
        handleDeleteArticle(article.id);
      }
    });

    listContainer.appendChild(item);
  });
}

// Admin: Helper to convert HTML back to raw text for textarea
function convertHTMLToRaw(html) {
  let text = html;
  text = text.replace(/<\/p>\s*<p>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<p>/gi, "").replace(/<\/p>/gi, "");
  return text.trim();
}

// Admin: Start Edit Mode
function startEditArticle(id) {
  const article = newsList.find(a => a.id === id);
  if (!article) return;

  editingArticleId = id;

  // Populate form fields
  document.getElementById("artTitle").value = article.title;
  document.getElementById("artCategory").value = article.category;
  document.getElementById("artSummary").value = article.summary;
  document.getElementById("artImage").value = article.image || "";
  document.getElementById("artPdfUrl").value = article.pdfUrl || "";
  document.getElementById("artContent").value = convertHTMLToRaw(article.content);

  // Update form header/title and action buttons
  const submitBtn = document.getElementById("submitArticleBtn");
  if (submitBtn) submitBtn.textContent = "Guardar Cambios";

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) cancelBtn.style.display = "inline-block";

  // Scroll to the form
  const formElement = document.getElementById("adminPanelSection");
  if (formElement) {
    formElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Admin: Cancel Edit Mode
function cancelEdit() {
  editingArticleId = null;

  // Reset form
  const form = document.getElementById("createArticleForm");
  if (form) form.reset();

  // Reset action buttons
  const submitBtn = document.getElementById("submitArticleBtn");
  if (submitBtn) submitBtn.textContent = "Publicar Noticia";

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) cancelBtn.style.display = "none";
}

// Admin: Create or Edit News Article
async function handleCreateArticle() {
  const title = document.getElementById("artTitle").value.trim();
  const category = document.getElementById("artCategory").value;
  const summary = document.getElementById("artSummary").value.trim();
  const image = document.getElementById("artImage").value.trim();
  const pdfUrl = document.getElementById("artPdfUrl").value.trim();
  const contentRaw = document.getElementById("artContent").value.trim();

  if (!title || !summary || !contentRaw) {
    if (typeof showToast === "function") {
      showToast("Por favor complete todos los campos obligatorios.", "error");
    }
    return;
  }

  // Build HTML Content from line breaks
  const contentHTML = contentRaw
    .split("\n\n")
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  if (editingArticleId) {
    // Editing Mode
    const articleIndex = newsList.findIndex(a => a.id === editingArticleId);
    if (articleIndex !== -1) {
      // Keep existing id and date, but update other fields
      newsList[articleIndex].title = title;
      newsList[articleIndex].category = category;
      newsList[articleIndex].summary = summary;
      newsList[articleIndex].image = image;
      newsList[articleIndex].pdfUrl = pdfUrl;
      newsList[articleIndex].isDefaultImage = !image;
      newsList[articleIndex].content = contentHTML;

      localStorage.setItem("costa_news", JSON.stringify(newsList));

      // Update in Firestore
      if (db) {
        const articleToSave = { ...newsList[articleIndex] };
        if (!articleToSave.timestamp) {
          articleToSave.timestamp = Date.now();
        }
        db.collection("news").doc(editingArticleId).set(articleToSave).catch(err => {
          console.error("Error al actualizar noticia en Firestore:", err);
          if (typeof showToast === "function") {
            showToast("Error en Firebase: Permiso denegado. Configura las Reglas en Firebase Console.", "error");
          }
        });
      }

      // Make sure the active filter is set to the edited article's month
      const { label } = getMonthAndYear(newsList[articleIndex].date);
      currentFilter = label;

      if (typeof showToast === "function") {
        showToast("Noticia actualizada correctamente.", "success");
      }
    }
    cancelEdit();
  } else {
    // Creation Mode
    const today = new Date();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dateStr = `${today.getDate()} de ${monthNames[today.getMonth()]} del ${today.getFullYear()}`;

    // ID based on title slug
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with -
      .substring(0, 40) + "-" + Math.floor(Math.random() * 1000);

    const timestamp = Date.now();
    const newArticle = {
      id,
      title,
      category,
      date: dateStr,
      summary,
      image,
      pdfUrl,
      isDefaultImage: !image,
      content: contentHTML,
      timestamp
    };

    newsList.unshift(newArticle);
    localStorage.setItem("costa_news", JSON.stringify(newsList));

    // Save to Firestore
    if (db) {
      db.collection("news").doc(id).set(newArticle).catch(err => {
        console.error("Error al guardar noticia en Firestore:", err);
        if (typeof showToast === "function") {
          showToast("Error en Firebase: Permiso denegado. Configura las Reglas en Firebase Console.", "error");
        }
      });
    }

    // Set filter to the month of the new article (current month)
    const { label } = getMonthAndYear(dateStr);
    currentFilter = label;

    // Reset Form
    document.getElementById("createArticleForm").reset();

    if (typeof showToast === "function") {
      showToast("Noticia publicada correctamente.", "success");
    }
  }

  // Re-render
  renderFilterButtons();
  renderNewsGrid();
  renderAdminNewsList();
}

// Admin: Delete News Article
function handleDeleteArticle(id) {
  newsList = newsList.filter(article => article.id !== id);
  localStorage.setItem("costa_news", JSON.stringify(newsList));
  
  if (db) {
    db.collection("news").doc(id).delete().catch(err => {
      console.error("Error al eliminar noticia de Firestore:", err);
      if (typeof showToast === "function") {
        showToast("Error en Firebase: Permiso denegado al eliminar. Configura las Reglas en Firebase Console.", "error");
      }
    });
  }

  // Re-evaluate filter if current one is now empty
  const availableMonths = getAvailableMonths();
  if (availableMonths.length > 0) {
    const stillExists = availableMonths.some(m => m.label === currentFilter);
    if (!stillExists) {
      currentFilter = availableMonths[0].label;
    }
  } else {
    currentFilter = "";
  }

  // Re-render
  renderFilterButtons();
  renderNewsGrid();
  renderAdminNewsList();

  if (typeof showToast === "function") {
    showToast("Noticia eliminada correctamente.", "info");
  }
}
