/**
 * Costa College — Main App JavaScript
 * Handles: Dynamic header/footer loading, hero slider, mobile menu, scroll animations, header scroll effect
 */

// ── Dynamic Layout Loader ────────────────────────────────────────────
async function loadLayout() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (headerPlaceholder) {
    let headerContent = '';
    // Try to load from global variable first (for file:// protocol support without server)
    if (typeof HEADER_HTML !== 'undefined') {
      headerContent = HEADER_HTML;
    } else {
      try {
        const res = await fetch('components/header.html');
        if (res.ok) {
          headerContent = await res.text();
        }
      } catch (err) {
        console.error('Error cargando header via fetch:', err);
      }
    }

    if (headerContent) {
      headerPlaceholder.innerHTML = headerContent;
      
      // Dynamically highlight active menu link
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const navLinks = headerPlaceholder.querySelectorAll('.main-nav > a, .main-nav .nav-dropdown > a');
      
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Match index.html or root path
        if (href === currentPath) {
          link.classList.add('active');
        } else if ((currentPath === '' || currentPath === 'index.html') && href === 'index.html') {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }

  if (footerPlaceholder) {
    let footerContent = '';
    // Try to load from global variable first (for file:// protocol support without server)
    if (typeof FOOTER_HTML !== 'undefined') {
      footerContent = FOOTER_HTML;
    } else {
      try {
        const res = await fetch('components/footer.html');
        if (res.ok) {
          footerContent = await res.text();
        }
      } catch (err) {
        console.error('Error cargando footer via fetch:', err);
      }
    }

    if (footerContent) {
      footerPlaceholder.innerHTML = footerContent;
    }
  }
}

// ── Header & Navigation Interactions ─────────────────────────────────
function initHeaderInteractions() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      const isOpen = mainNav.classList.toggle('open');
      if (!isOpen) {
        mainNav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      }
    });

    mainNav.querySelectorAll('a:not(.nav-dropdown > a)').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('open');
        mainNav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      });
    });

    const dropdowns = mainNav.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(dropdown => {
      const link = dropdown.querySelector('a');
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = dropdown.classList.contains('open');
          dropdowns.forEach(d => d.classList.remove('open'));
          if (!isOpen) {
            dropdown.classList.add('open');
          }
        }
      });
    });
  }

  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }
}

// ── Document Ready Handler ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load shared layouts
  await loadLayout();
  
  // 2. Initialize layout dependencies
  initHeaderInteractions();

  // 3. Render featured news on home page
  renderFeaturedNews();

  // ── Hero Slider ──────────────────────────────────────────────────
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let currentSlide = 0;
  let slideInterval;

  function goToSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    currentSlide = index;
    if (slides[currentSlide]) slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % slides.length);
  }

  if (slides.length > 1) {
    slideInterval = setInterval(nextSlide, 5000);
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        clearInterval(slideInterval);
        goToSlide(parseInt(dot.dataset.slide));
        slideInterval = setInterval(nextSlide, 5000);
      });
    });

    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        clearInterval(slideInterval);
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
        slideInterval = setInterval(nextSlide, 5000);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        clearInterval(slideInterval);
        nextSlide();
        slideInterval = setInterval(nextSlide, 5000);
      });
    }
  }

  // ── Scroll Animations (Intersection Observer) ───────────────────
  const animElements = document.querySelectorAll('.animate-on-scroll');
  if (animElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    animElements.forEach(el => observer.observe(el));
  }

  // ── Smooth Scroll for Anchor Links (re-query dynamic layout) ──────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
        window.scrollTo({
          top: target.offsetTop - offset - 20,
          behavior: 'smooth'
        });
      }
    });
  });
});

// ── Render Featured News ─────────────────────────────────────────────
// ── Render Featured News ─────────────────────────────────────────────
async function renderFeaturedNews() {
  const grid = document.getElementById("featuredNewsGrid");
  if (!grid) return;

  const storedNews = localStorage.getItem("costa_news");
  let newsList = [];
  if (!storedNews) {
    // Default seed
    const defaultNews = [
      {
        id: "diciembre-2025",
        title: "Costa al Día — Edición Diciembre",
        category: "comunidad",
        date: "15 de Diciembre del 2025",
        summary: "Resumen de las actividades y logros del último mes del año escolar.",
        image: "assets/images/costa-al-dia.png",
        isDefaultImage: true,
        content: "<p>Estimada comunidad de Costa College, nos complace presentar la última edición del año de nuestro boletín Costa al Día.</p><p>Diciembre ha sido un mes lleno de emociones, marcado por la finalización de los procesos académicos, las ceremonias de graduación de nuestros diferentes ciclos y las actividades de cierre de talleres artísticos y deportivos.</p><p>Queremos agradecer el esfuerzo constante de todos los alumnos, profesores y el apoyo de las familias que hicieron de este 2025 un año escolar excepcional. ¡Les deseamos unas felices y reparadoras vacaciones!</p>"
      },
      {
        id: "despedida-4to-medio",
        title: "Despedida 4to Medio",
        category: "comunidad",
        date: "20 de Noviembre del 2025",
        summary: "Especial despedida de nuestra generación de cuarto medio.",
        image: "assets/images/costa-al-dia.png",
        isDefaultImage: true,
        content: "<p>Con profunda emoción despedimos a nuestra Generación de Cuartos Medios 2025 en su tradicional ceremonia de Licenciatura.</p><p>El gimnasio del colegio se vistió de gala para recibir a estudiantes, apoderados y docentes en un acto solemne marcado por los discursos de despedida, las premiaciones académicas y de trayectoria de los alumnos, y el último pase de lista.</p><p>Costa College les desea el mayor de los éxitos en los nuevos rumbos que emprenderán en la educación superior. Recuerden llevar siempre en alto los valores de nuestra institución.</p>"
      },
      {
        id: "septiembre-2025",
        title: "Costa al Día — Edición Septiembre",
        category: "comunidad",
        date: "10 de Septiembre del 2025",
        summary: "Celebración de fiestas patrias y actividades del mes.",
        image: "assets/images/costa-al-dia.png",
        isDefaultImage: true,
        content: "<p>Septiembre llenó de colores y tradiciones los patios de Costa College. Celebramos las Fiestas Patrias con nuestra tradicional Gala Folclórica.</p><p>Estudiantes de todos los niveles deleitaron a los asistentes con bailes tradicionales de las distintas zonas de nuestro país. Además, se desarrollaron competencias de juegos típicos chilenos y compartimos una jornada de convivencia y alegría.</p><p>Felicitamos a los profesores de Educación Física y de Música por la excelente organización y preparación de los estudiantes.</p>"
      },
      {
        id: "robotica-senior",
        title: "Proyecto de Robótica Destaca en Senior School",
        category: "academico",
        date: "25 de Octubre del 2025",
        summary: "Nuestros estudiantes de enseñanza media diseñan soluciones de automatización en tecnología.",
        image: "",
        isDefaultImage: true,
        content: "<p>Los alumnos de Senior School presentaron sus proyectos finales del electivo de Robótica y Programación.</p><p>Utilizando microcontroladores y programación en C++, los grupos desarrollaron prototipos funcionales orientados a la sustentabilidad, tales como sistemas de riego automatizado para los jardines del colegio y sensores de ahorro energético en salas de clase.</p><p>El profesor del área destacó la capacidad de innovación de los jóvenes y el alto nivel de resolución de problemas técnicos demostrado durante el semestre.</p>"
      },
      {
        id: "interescolar-atletismo",
        title: "Gran Desempeño en Interescolar de Atletismo",
        category: "deportes",
        date: "18 de Noviembre del 2025",
        summary: "Costa College obtiene múltiples medallas en la competencia regional.",
        image: "",
        isDefaultImage: true,
        content: "<p>Nuestra delegación de atletismo tuvo una sobresaliente participación en el torneo interescolar celebrado el pasado fin de semana.</p><p>Destacamos el primer lugar obtenido en la posta 4x100 metros damas categoría intermedia, así como notables marcas individuales en salto largo y lanzamiento de bala.</p><p>Felicitamos a todos nuestros deportistas por representar con garra, disciplina y juego limpio los colores de Costa College.</p>"
      }
    ];
    localStorage.setItem("costa_news", JSON.stringify(defaultNews));
    newsList = defaultNews;
  } else {
    newsList = JSON.parse(storedNews);
  }

  // Draw initial cards
  const drawCards = (list) => {
    const featured = list.slice(0, 3);
    grid.innerHTML = "";

    featured.forEach(article => {
      const card = document.createElement("a");
      card.href = `noticias.html?id=${article.id}`;
      card.className = "news-card animate-on-scroll";
      
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
          <span class="news-card-link">Leer más →</span>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  // Draw cached news first
  drawCards(newsList);

  // Live Sync with Firestore if available
  const firebaseConfig = {
    apiKey: "AIzaSyA5sJWxVkCEbp1TozQUQcSNrfejfQFLVXw",
    authDomain: "costa-college.firebaseapp.com",
    projectId: "costa-college",
    storageBucket: "costa-college.firebasestorage.app",
    messagingSenderId: "344726618765",
    appId: "1:344726618765:web:9a8ed9a46a6798aa87d8c4"
  };

  if (typeof firebase !== "undefined") {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      const db = firebase.firestore();
      const snapshot = await db.collection("news").get();
      if (!snapshot.empty) {
        const firestoreNews = [];
        snapshot.forEach(doc => {
          firestoreNews.push({ id: doc.id, ...doc.data() });
        });

        firestoreNews.sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeB - timeA;
        });

        localStorage.setItem("costa_news", JSON.stringify(firestoreNews));
        drawCards(firestoreNews);
      }
    } catch (e) {
      console.error("Error al sincronizar noticias destacadas desde Firestore:", e);
    }
  }
}

// ── Toast Notification System ───────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

