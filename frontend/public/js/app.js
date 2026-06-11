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

