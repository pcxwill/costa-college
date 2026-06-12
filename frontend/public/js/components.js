const HEADER_HTML = `<!-- Quick Links Bar -->
<div class="quick-bar">
  <div class="quick-bar-inner">
    <a href="https://costacollege.cl/iquique/circulares/" target="_blank">📋 Circulares</a>
    <a href="https://schoolnet.colegium.com/webapp/es_CL/login" target="_blank">🖥️ SchoolNet</a>
    <a href="https://costacollege.cl/iquique/admision/" target="_blank" class="quick-cta">Admisión</a>
  </div>
</div>

<!-- Header -->
<header class="site-header" id="header">
  <div class="header-inner">
    <a href="index.html" class="logo">
      <img src="assets/images/logo.png" alt="Costa College" style="height: 52px; width: auto;">
    </a>

    <nav class="main-nav" id="mainNav">
      <a href="index.html">Inicio</a>

      <div class="nav-dropdown">
        <a href="#">Quiénes Somos <span class="arrow">▾</span></a>
        <div class="nav-dropdown-menu">
          <a href="mision-vision.html">Misión y Visión</a>
          <a href="mensaje-director.html">Mensaje del Director</a>
          <a href="equipo-directivo.html">Equipo Directivo</a>
          <a href="docentes.html">Docentes</a>
          <a href="convivencia-escolar.html">Convivencia Escolar</a>
        </div>
      </div>

      <div class="nav-dropdown">
        <a href="#">Ciclos <span class="arrow">▾</span></a>
        <div class="nav-dropdown-menu">
          <a href="infant-school.html">Infant School</a>
          <a href="junior-school.html">Junior School</a>
          <a href="senior-school.html">Senior School</a>
        </div>
      </div>

      <a href="noticias.html">Noticias</a>
      <a href="index.html#documentos">Documentos</a>
      <a href="index.html#contacto">Contacto</a>
      <a href="https://growthmetrics-prod.web.app/" target="_blank" class="nav-cta">🔒 Intranet</a>
    </nav>

    <button class="menu-toggle" id="menuToggle" aria-label="Abrir menú">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;

const FOOTER_HTML = `<!-- Footer -->
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo-container">
          <img src="assets/images/logo.png" alt="Costa College Escudo" style="height: 50px; width: auto;">
        </a>
        <p>Educación bilingüe de excelencia en Iquique, Chile. Formando el futuro con valores, conocimiento y habilidades para la vida.</p>
        <div class="footer-social-list">
          <a href="https://www.instagram.com/costacollegeoficial/" target="_blank" class="footer-social-link"
            title="Instagram">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span>Instagram</span>
          </a>
          <a href="https://www.instagram.com/infantcostacollege/" target="_blank" class="footer-social-link"
            title="Instagram Infant">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span>Instagram Infant</span>
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Ciclos</h4>
        <ul>
          <li><a href="infant-school.html">Infant School</a></li>
          <li><a href="junior-school.html">Junior School</a></li>
          <li><a href="senior-school.html">Senior School</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Departamentos</h4>
        <ul>
          <li><a href="https://costacollege.cl/iquique/departamento-de-convivencia-escolar/">Convivencia Escolar</a>
          </li>
          <li><a href="https://costacollege.cl/iquique/departamento-de-ingles-y-plan-bilingue/">Inglés y
              Bilingüismo</a></li>
          <li><a href="https://costacollege.cl/iquique/departamento-de-talleres-extra-escolares/">Talleres
              Extraescolares</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Comunidad</h4>
        <ul>
          <li><a href="https://costacollege.cl/iquique/ceal/">CEAL</a></li>
          <li><a href="https://costacollege.cl/iquique/centro-de-padres/">Centro de Padres</a></li>
          <li><a href="noticias.html">Noticias</a></li>
          <li><a href="https://growthmetrics-prod.web.app/" target="_blank">Intranet</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Costa College Iquique. Todos los derechos reservados.</p>
    </div>
  </div>
</footer>

<!-- Floating WhatsApp Widget -->
<a href="https://wa.me/56944097215" class="whatsapp-float" target="_blank" rel="noopener noreferrer"
  aria-label="Contactar por WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.805-9.8.001-2.597-1.006-5.04-2.835-6.87C16.417 2.106 13.977.996 11.383.996c-5.409 0-9.809 4.399-9.813 9.804-.001 2.03.532 4.022 1.545 5.768L2.096 20.89l4.551-1.736zm10.741-6.183c-.292-.146-1.727-.852-1.995-.95-.266-.098-.46-.146-.653.146-.193.292-.748.95-.917 1.144-.168.193-.338.217-.63.071-.292-.146-1.233-.454-2.348-1.45-1.107-.986-1.854-2.203-2.072-2.568-.218-.365-.023-.563.15-.736.155-.155.338-.39.507-.584.168-.194.225-.33.338-.552.112-.222.056-.415-.028-.562-.084-.148-.654-1.573-.897-2.155-.236-.569-.477-.491-.653-.5-.17-.008-.364-.01-.559-.01-.194 0-.51.072-.777.364-.266.292-1.018.995-1.018 2.428 0 1.432 1.042 2.814 1.187 3.008.145.193 2.05 3.13 4.965 4.385.694.299 1.237.477 1.66.612.697.222 1.332.191 1.834.116.56-.084 1.727-.706 1.972-1.389.244-.683.244-1.267.17-1.389-.074-.122-.272-.219-.564-.365z" />
  </svg>
</a>\n`;
