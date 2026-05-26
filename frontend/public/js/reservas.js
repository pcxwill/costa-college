/**
 * Costa College — Reservas Module
 * Calendar, availability, reservation CRUD, admin panel
 */

let CONFIG = { bloques_horarios: [], dependencias: [], ventana_agendamiento_meses: 3 };
let selectedDate = null;
let selectedDependencia = null;
let misReservasData = [];

// ── Wait for auth then init ─────────────────────────────────────────
const initInterval = setInterval(() => {
  if (currentUser && userProfile) {
    clearInterval(initInterval);
    initDashboard();
  }
}, 200);

// Timeout fallback
setTimeout(() => clearInterval(initInterval), 10000);

async function initDashboard() {
  document.getElementById('dashboardApp').style.display = 'block';

  // Set user info
  document.getElementById('userName').textContent = userProfile.nombre || 'Profesor';
  document.getElementById('userRole').textContent = userProfile.rol || 'profesor';
  document.getElementById('userAvatar').textContent = (userProfile.nombre || 'P')[0].toUpperCase();

  // Show admin section if admin
  if (userProfile.rol === 'admin') {
    document.getElementById('adminSection').classList.remove('hidden');
    document.getElementById('navAdmin').classList.remove('hidden');
    document.getElementById('navAdmin').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('adminSection').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Load config
  await loadConfig();

  // Init calendar
  initCalendar();

  // Populate form selects
  populateFormSelects();

  // Load my reservations
  await loadMyReservations();

  // Setup form
  setupReservationForm();
  setupAsignarEquiposForm();

  // Setup admin tabs
  setupAdminTabs();

  // Set today's date as admin filter default
  const adminFiltroFecha = document.getElementById('adminFiltroFecha');
  if (adminFiltroFecha) adminFiltroFecha.value = todayStr();

  startLiveClock();
  hideLoading();
}

// ── Load Config ─────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch(`${API_URL}/config`);
    CONFIG = await res.json();
  } catch (e) {
    console.error('Error loading config:', e);
    // Fallback config
    CONFIG = {
      bloques_horarios: [
        { id: 1, horario: '07:45 - 08:30' }, { id: 2, horario: '08:30 - 09:15' },
        { id: 3, horario: '09:30 - 10:15' }, { id: 4, horario: '10:15 - 11:00' },
        { id: 5, horario: '11:15 - 12:00' }, { id: 6, horario: '12:00 - 12:45' },
        { id: 7, horario: '13:00 - 13:45' }, { id: 8, horario: '13:45 - 14:30' }
      ],
      dependencias: [
        { id: 'carro_nuevo_1', nombre: 'Carro 1 Chromebook Nuevo', modelo: 'Acer 311', unidades: 50 },
        { id: 'carro_nuevo_2', nombre: 'Carro 2 Chromebook Nuevo', modelo: 'Acer 311', unidades: 50 },
        { id: 'carro_basica', nombre: 'Carro Chromebook Básica', modelo: 'Asus CX1100CN', unidades: 30 },
        { id: 'carro_media', nombre: 'Carro Chromebook E.Media', modelo: 'Asus CM3200FM1', unidades: 30 },
        { id: 'sala_computacion', nombre: 'Sala de Computación', modelo: '-', unidades: null }
      ],
      ventana_agendamiento_meses: 3
    };
  }
}

// ── Calendar ────────────────────────────────────────────────────────
let calYear, calMonth;

function initCalendar() {
  const today = new Date();
  calYear = today.getFullYear();
  calMonth = today.getMonth();
  renderCalendar();

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
}

function renderCalendar() {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  document.getElementById('calMonthYear').textContent = `${months[calMonth]} ${calYear}`;

  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + CONFIG.ventana_agendamiento_meses);

  const firstDay = new Date(calYear, calMonth, 1);
  let startDay = firstDay.getDay() - 1; // Monday = 0
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Empty cells
  for (let i = 0; i < startDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day empty';
    daysContainer.appendChild(cell);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(calYear, calMonth, day);
    const dateStr = formatDate(date);
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.textContent = day;

    // Check if today
    if (date.getTime() === today.getTime()) cell.classList.add('today');

    // Check if selected
    if (selectedDate === dateStr) cell.classList.add('selected');

    // Check if disabled (past or beyond 3 months)
    if (date < today || date > maxDate) {
      cell.classList.add('disabled');
    } else {
      // Weekend check (Sat=6, Sun=0)
      const dow = date.getDay();
      if (dow === 0 || dow === 6) {
        cell.classList.add('disabled');
      } else {
        cell.addEventListener('click', () => selectDate(dateStr));
      }
    }

    daysContainer.appendChild(cell);
  }
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  document.getElementById('formFecha').value = dateStr;
  renderCalendar();
  loadAvailability(dateStr);
}

// ── Populate Form ───────────────────────────────────────────────────
function populateFormSelects() {
  const depSelect = document.getElementById('formDependencia');
  const bloqueSelect = document.querySelector('.bloque-select');
  const adminDepSelect = document.getElementById('adminFiltroDep');

  CONFIG.dependencias.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep.id;
    opt.textContent = `${dep.nombre} ${dep.modelo !== '-' ? `(${dep.modelo})` : ''}`;
    depSelect.appendChild(opt);

    if (adminDepSelect) {
      const opt2 = opt.cloneNode(true);
      adminDepSelect.appendChild(opt2);
    }
  });

  CONFIG.bloques_horarios.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `Bloque ${b.id}: ${b.horario}`;
    if (bloqueSelect) bloqueSelect.appendChild(opt);
  });

  depSelect.addEventListener('change', () => {
    selectedDependencia = depSelect.value;
    if (selectedDate) loadAvailability(selectedDate);
  });
}

// ── Availability ────────────────────────────────────────────────────
async function loadAvailability(fecha) {
  const depId = document.getElementById('formDependencia').value;
  document.getElementById('availDate').textContent = fecha;

  try {
    let url = `${API_URL}/reservas/disponibilidad?fecha=${fecha}`;
    if (depId) url += `&dependencia_id=${depId}`;

    const res = await apiFetch(url.replace(API_URL, ''));
    const data = await res.json();

    renderAvailability(data, depId);
  } catch (e) {
    console.error('Error loading availability:', e);
  }
}

function renderAvailability(data, filterDepId) {
  const tbody = document.getElementById('availBody');
  tbody.innerHTML = '';

  const deps = filterDepId
    ? [data.disponibilidad[filterDepId]].filter(Boolean)
    : Object.values(data.disponibilidad || {});

  if (deps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:var(--space-8);">Sin datos</td></tr>';
    return;
  }

  deps.forEach(dep => {
    // Dependency header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<td colspan="7" style="background:var(--navy);color:var(--white);font-weight:600;padding:var(--space-3) var(--space-4);font-size:var(--text-sm);">💻 ${dep.nombre} ${dep.modelo !== '-' ? `— ${dep.modelo} (${dep.unidades} u.)` : ''}</td>`;
    tbody.appendChild(headerRow);

    dep.bloques.forEach(bloque => {
      const row = document.createElement('tr');
      if (bloque.disponible) {
        row.className = 'slot-available';
        row.innerHTML = `
          <td><strong>B${bloque.id}</strong></td>
          <td>${bloque.horario}</td>
          <td><span class="badge badge-success">Disponible</span></td>
          <td>—</td><td>—</td><td>—</td><td>—</td>
        `;
        row.addEventListener('click', () => {
          const fechaSel = document.getElementById('formFecha').value;
          if (fechaSel <= todayStr()) {
            showToast('Las reservas no pueden realizarse el mismo día.', 'warning');
            return;
          }

          document.getElementById('formDependencia').value = dep.id;

          const selects = Array.from(document.querySelectorAll('.bloque-select'));
          if (selects.some(s => s.value == bloque.id)) {
            showToast(`El bloque ${bloque.id} ya está en la selección.`, 'warning');
            return;
          }

          let emptySelect = selects.find(s => s.value === '');
          if (!emptySelect) {
            window.addBloqueRow();
            const newSelects = document.querySelectorAll('.bloque-select');
            emptySelect = newSelects[newSelects.length - 1];
          }

          emptySelect.value = bloque.id;
          document.getElementById('formCurso').focus();
          showToast(`Bloque ${bloque.id} agregado. Complete el formulario.`, 'info');
        });
      } else {
        const r = bloque.reserva;
        const isMine = r && currentUser && r.profesor_uid === currentUser.uid;

        if (isMine) {
          row.className = 'slot-occupied slot-mine';
          row.style.backgroundColor = 'rgba(201, 168, 76, 0.12)';
          row.style.borderLeft = '4px solid var(--gold)';
          row.innerHTML = `
            <td><strong>B${bloque.id}</strong></td>
            <td>${bloque.horario}</td>
            <td style="vertical-align: middle;">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 2px 0;">
                <span class="badge" style="background-color: var(--gold); color: white; margin: 0; font-size: 0.75rem; font-weight: 600;">Tu Reserva</span>
                <button class="btn btn-danger btn-sm" onclick="cancelReservation('${r.id}')" style="padding: 2px 6px; font-size: 0.65rem; width: 100%; white-space: nowrap; line-height: 1.2;">Cancelar</button>
              </div>
            </td>
            <td><strong>${r.profesor}</strong></td>
            <td><strong>${r.curso}</strong></td>
            <td><strong>${r.asignatura}</strong></td>
            <td><strong>${r.actividad}</strong></td>
          `;
        } else {
          row.className = 'slot-occupied';
          row.innerHTML = `
            <td><strong>B${bloque.id}</strong></td>
            <td>${bloque.horario}</td>
            <td><span class="badge badge-danger">Ocupado</span></td>
            <td>${r ? r.profesor : '—'}</td>
            <td>${r ? r.curso : '—'}</td>
            <td>${r ? r.asignatura : '—'}</td>
            <td>${r ? r.actividad : '—'}</td>
          `;
        }
      }
      tbody.appendChild(row);
    });
  });
}

// ── Reservation Form ────────────────────────────────────────────────
function setupReservationForm() {
  document.getElementById('reservaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitReserva');
    const fecha = document.getElementById('formFecha').value;
    const dependencia_id = document.getElementById('formDependencia').value;
    const selects = document.querySelectorAll('.bloque-select');
    const bloques = Array.from(selects).map(s => parseInt(s.value)).filter(b => !isNaN(b));
    const uniqueBloques = [...new Set(bloques)];

    const curso = document.getElementById('formCurso').value;
    const asignatura = document.getElementById('formAsignatura').value;
    const actividad = document.getElementById('formActividad').value;

    if (!fecha) { showToast('Seleccione una fecha en el calendario', 'warning'); return; }

    if (fecha <= todayStr()) {
      showToast('No se pueden realizar reservas el mismo día', 'warning');
      return;
    }

    if (!dependencia_id) { showToast('Seleccione una dependencia', 'warning'); return; }
    if (uniqueBloques.length === 0) { showToast('Seleccione al menos un bloque horario', 'warning'); return; }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    let successCount = 0;
    let errorMsgs = [];

    try {
      await Promise.all(uniqueBloques.map(async (bloque) => {
        const res = await apiFetch('/reservas', {
          method: 'POST',
          body: JSON.stringify({ fecha, bloque, dependencia_id, curso, asignatura, actividad })
        });
        const data = await res.json();
        if (res.ok) {
          successCount++;
        } else {
          errorMsgs.push(`B${bloque}: ${data.message || data.error || 'Error'}`);
        }
      }));

      if (successCount > 0) {
        showToast(`✅ ${successCount} bloque(s) reservado(s) exitosamente`, 'success');
        document.getElementById('reservaForm').reset();

        // Remove extra block rows
        document.querySelectorAll('.bloque-row:not(:first-child)').forEach(r => r.remove());

        document.getElementById('formFecha').value = fecha; // Keep date
        await loadMyReservations();
        loadAvailability(fecha);
      }

      if (errorMsgs.length > 0) {
        showToast('Errores: ' + errorMsgs.join(', '), 'error', 6000);
      }
    } catch (e) {
      showToast('Error de conexión con el servidor', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Reservar';
  });
}

// ── My Reservations ─────────────────────────────────────────────────
async function loadMyReservations() {
  try {
    const res = await apiFetch('/reservas');
    const data = await res.json();
    misReservasData = data.reservas || [];
    renderMyReservations();
    updateStats();
  } catch (e) {
    console.error('Error loading reservations:', e);
  }
}

function getReservationStatus(reservaFecha, horarioStr) {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  if (reservaFecha < todayStr) return 'finalized';
  if (reservaFecha > todayStr) return 'upcoming';

  const parts = horarioStr.split('-');
  if (parts.length !== 2) return 'upcoming';
  const [startStr, endStr] = parts.map(p => p.trim());

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes > endMinutes) {
    return 'finalized';
  } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return 'active';
  } else {
    return 'upcoming';
  }
}

function renderMyReservations() {
  const container = document.getElementById('misReservas');
  if (misReservasData.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:var(--space-4);">No tienes reservas.</p>';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isDebugTest = urlParams.has('debug') || urlParams.has('test');

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Ordenar reservas: En curso primero, Activas después, Finalizadas al último
  const sortedReservas = [...misReservasData].sort((a, b) => {
    const statusA = getReservationStatus(a.fecha, a.bloque_horario);
    const statusB = getReservationStatus(b.fecha, b.bloque_horario);
    const score = { 'active': 0, 'upcoming': 1, 'finalized': 2 };
    
    if (score[statusA] !== score[statusB]) {
      return score[statusA] - score[statusB];
    }
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.bloque - b.bloque;
  });

  container.innerHTML = sortedReservas.map(r => {
    const [y, m, d] = r.fecha.split('-');
    const status = getReservationStatus(r.fecha, r.bloque_horario);

    let badgeHtml = '';
    let actionsHtml = '';

    if (status === 'finalized') {
      badgeHtml = `<span class="badge" style="background-color: #6c757d; color: white; user-select: none;">Finalizada</span>`;
      if (isDebugTest) {
        actionsHtml = `<button class="btn btn-navy btn-sm" onclick="openAsignarModal('${r.id}', '${r.curso}', '${r.asignatura}', '${r.fecha}')" style="margin-right:4px;">Asignar (Debug)</button>`;
      }
    } else if (status === 'active') {
      badgeHtml = `<span class="badge" style="background-color: #007bff; color: white; animation: pulse 1.5s infinite; user-select: none;">En Curso</span>`;
      actionsHtml = `
        <button class="btn btn-navy btn-sm" onclick="openAsignarModal('${r.id}', '${r.curso}', '${r.asignatura}', '${r.fecha}')" style="margin-right:4px;">Asignar Equipos</button>
        <button class="btn btn-danger btn-sm" onclick="cancelReservation('${r.id}')">Cancelar</button>
      `;
    } else {
      badgeHtml = `<span class="badge badge-success" style="user-select: none;">Activa</span>`;
      const debugBtn = isDebugTest ? `
        <button class="btn btn-navy btn-sm" onclick="openAsignarModal('${r.id}', '${r.curso}', '${r.asignatura}', '${r.fecha}')" style="margin-right:4px;">Asignar (Debug)</button>
      ` : '';
      actionsHtml = `
        ${debugBtn}
        <button class="btn btn-danger btn-sm" onclick="cancelReservation('${r.id}')">Cancelar</button>
      `;
    }

    return `
      <div class="reserva-card" style="${status === 'finalized' ? 'opacity: 0.75; background: var(--bg-body); border-color: rgba(0,0,0,0.05);' : ''}">
        <div class="reserva-info">
          <div class="reserva-date-badge" style="${status === 'finalized' ? 'background: #6c757d; box-shadow: none;' : ''}">
            <span class="day">${parseInt(d)}</span>
            <span class="month">${months[parseInt(m) - 1]}</span>
          </div>
          <div class="reserva-details">
            <h4 style="${status === 'finalized' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${r.dependencia_nombre || r.dependencia_id}</h4>
            <p>Bloque ${r.bloque} (${r.bloque_horario}) · ${r.curso} · ${r.asignatura} · ${r.actividad}</p>
          </div>
        </div>
        <div class="reserva-meta" style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
          ${badgeHtml}
          <div style="display:flex; gap:4px;">
            ${actionsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function cancelReservation(id) {
  if (!confirm('¿Está seguro de cancelar esta reserva?')) return;
  try {
    const res = await apiFetch(`/reservas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Reserva cancelada', 'success');
      await loadMyReservations();
      if (selectedDate) loadAvailability(selectedDate);
    } else {
      const data = await res.json();
      showToast(data.error || 'Error', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

function updateStats() {
  const today = todayStr();
  document.getElementById('statMisReservas').textContent = misReservasData.length;
  document.getElementById('statHoy').textContent = misReservasData.filter(r => r.fecha === today).length;

  // This week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);
  const swStr = formatDate(startOfWeek);
  const ewStr = formatDate(endOfWeek);
  document.getElementById('statSemana').textContent = misReservasData.filter(r => r.fecha >= swStr && r.fecha <= ewStr).length;
}

// ── Admin ───────────────────────────────────────────────────────────
function setupAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');

      if (tab.dataset.tab === 'tabUsuarios') loadUsers();
      if (tab.dataset.tab === 'tabAsignaciones') loadAsignaciones();
    });
  });

  if (userProfile?.rol === 'admin') loadUsers();
}

async function loadUsers() {
  try {
    const res = await apiFetch('/admin/usuarios');
    const data = await res.json();
    window.usersData = data.usuarios || [];
    const tbody = document.getElementById('usersBody');
    if (window.usersData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios</td></tr>';
      return;
    }
    tbody.innerHTML = window.usersData.map(u => `
      <tr>
        <td><strong>${u.nombre}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.rol === 'admin' ? 'badge-warning' : 'badge-info'}">${u.rol}</span></td>
        <td><span class="badge ${u.activo !== false ? 'badge-success' : 'badge-danger'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn btn-navy btn-sm" style="margin-right:4px;" onclick="showEditUserModal('${u.uid}')">Editar</button>
          <button class="btn btn-navy btn-sm" style="margin-right:4px;" onclick="showChangePasswordModal('${u.uid}')">Clave</button>
          ${u.uid === currentUser.uid ? '<em class="text-muted text-sm">Tú</em>' :
        (u.activo !== false
          ? `<button class="btn btn-warning btn-sm" onclick="deactivateUser('${u.uid}')">Desactivar</button>`
          : `<button class="btn btn-danger btn-sm" onclick="deleteUserPermanent('${u.uid}')">Borrar</button>`)}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error loading users:', e);
  }
}

function showCreateUserModal() {
  document.getElementById('createUserModal').classList.add('show');
  document.getElementById('createUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const rol = document.getElementById('newUserRole').value;

    try {
      const res = await apiFetch('/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password, rol })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Usuario creado exitosamente', 'success');
        closeModal('createUserModal');
        document.getElementById('createUserForm').reset();
        loadUsers();
      } else {
        showToast(data.error || 'Error al crear usuario', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  };
}

function showChangePasswordModal(uid) {
  document.getElementById('cpUid').value = uid;
  document.getElementById('changePasswordForm').reset();
  document.getElementById('changePasswordModal').classList.add('show');

  document.getElementById('changePasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('cpNewPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const res = await apiFetch(`/admin/usuarios/${uid}`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Contraseña actualizada exitosamente', 'success');
        closeModal('changePasswordModal');
      } else {
        showToast(data.error || 'Error al actualizar contraseña', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
    btn.disabled = false;
  };
}

function showEditUserModal(uid) {
  const user = window.usersData.find(u => u.uid === uid);
  if (!user) return;

  document.getElementById('editUid').value = uid;
  document.getElementById('editUserName').value = user.nombre;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserRole').value = user.rol;
  document.getElementById('editUserStatus').value = user.activo !== false ? 'true' : 'false';

  document.getElementById('editUserModal').classList.add('show');

  document.getElementById('editUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
      nombre: document.getElementById('editUserName').value,
      email: document.getElementById('editUserEmail').value,
      rol: document.getElementById('editUserRole').value,
      activo: document.getElementById('editUserStatus').value === 'true'
    };

    try {
      const res = await apiFetch(`/admin/usuarios/${uid}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Usuario actualizado exitosamente', 'success');
        closeModal('editUserModal');
        loadUsers();
      } else {
        showToast(data.error || 'Error al actualizar usuario', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
    btn.disabled = false;
  };
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

async function deactivateUser(uid) {
  if (!confirm('¿Desactivar este usuario?')) return;
  try {
    const res = await apiFetch(`/admin/usuarios/${uid}`, { method: 'DELETE' });
    if (res.ok) { showToast('Usuario desactivado', 'success'); loadUsers(); }
    else { const d = await res.json(); showToast(d.error, 'error'); }
  } catch (e) { showToast('Error de conexión', 'error'); }
}

async function deleteUserPermanent(uid) {
  if (!confirm('¿Está seguro de eliminar este usuario PERMANENTEMENTE? Esta acción no se puede deshacer.')) return;
  try {
    const res = await apiFetch(`/admin/usuarios/${uid}/permanente`, { method: 'DELETE' });
    if (res.ok) { showToast('Usuario eliminado', 'success'); loadUsers(); }
    else { const d = await res.json(); showToast(d.error, 'error'); }
  } catch (e) { showToast('Error de conexión', 'error'); }
}

async function loadAllReservations() {
  const fecha = document.getElementById('adminFiltroFecha').value;
  const depId = document.getElementById('adminFiltroDep').value;
  if (!fecha) { showToast('Seleccione una fecha', 'warning'); return; }

  try {
    let url = `/reservas/todas?fecha_inicio=${fecha}&fecha_fin=${fecha}`;
    if (depId) url += `&dependencia_id=${depId}`;
    const res = await apiFetch(url);
    const data = await res.json();
    const tbody = document.getElementById('allReservasBody');

    if (!data.reservas || data.reservas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay reservas para esta fecha</td></tr>';
      return;
    }

    tbody.innerHTML = data.reservas.map(r => `
      <tr>
        <td>${r.fecha}</td>
        <td>${r.dependencia_nombre || r.dependencia_id}</td>
        <td>B${r.bloque}</td>
        <td>${r.bloque_horario}</td>
        <td>${r.profesor_nombre}</td>
        <td>${r.curso}</td>
        <td>${r.asignatura}</td>
        <td>${r.actividad}</td>
        <td><button class="btn btn-danger btn-sm" onclick="adminDeleteReservation('${r.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  } catch (e) { showToast('Error cargando reservas', 'error'); }
}

async function adminDeleteReservation(id) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  try {
    const res = await apiFetch(`/admin/reservas/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Reserva eliminada', 'success'); loadAllReservations(); }
  } catch (e) { showToast('Error', 'error'); }
}

async function runManualCleanup() {
  if (!confirm('¿Ejecutar limpieza de reservas pasadas?')) return;
  try {
    const res = await apiFetch('/admin/limpieza', { method: 'POST' });
    const data = await res.json();
    showToast(data.mensaje || `${data.eliminados} registros eliminados`, 'success');
  } catch (e) { showToast('Error', 'error'); }
}

// ── Utilities ───────────────────────────────────────────────────────
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() { return formatDate(new Date()); }

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// Row adding for multiple blocks
window.addBloqueRow = function () {
  const container = document.getElementById('bloquesContainer');
  const firstSelect = container.querySelector('.bloque-select');
  if (!firstSelect) return;

  const newRow = document.createElement('div');
  newRow.className = 'bloque-row';
  newRow.style.cssText = 'display: flex; gap: var(--space-2); margin-bottom: var(--space-2);';

  const newSelect = firstSelect.cloneNode(true);
  newSelect.value = '';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-danger';
  removeBtn.style.padding = '0 var(--space-3)';
  removeBtn.textContent = '-';
  removeBtn.title = 'Quitar bloque';
  removeBtn.onclick = function () { newRow.remove(); };

  newRow.appendChild(newSelect);
  newRow.appendChild(removeBtn);
  container.appendChild(newRow);
};

// ── Asignaciones de Chromebooks Frontend ──────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('show');
}

async function openAsignarModal(reservaId, curso, asignatura, fecha) {
  document.getElementById('asignarReservaId').value = reservaId;
  document.getElementById('asignarEquiposTitle').textContent = `Asignación de Chromebooks — ${curso}`;
  document.getElementById('asignarEquiposDetails').textContent = `Clase: ${asignatura} · Fecha: ${fecha}`;

  const tbody = document.getElementById('asignarEquiposTableBody');
  tbody.innerHTML = '<tr><td colspan="2" class="text-center" style="padding:var(--space-4);">Cargando alumnos...</td></tr>';
  openModal('asignarEquiposModal');

  try {
    // 1. Obtener listado de estudiantes del curso
    const studentsRes = await fetch(`${API_URL}/estudiantes/${encodeURIComponent(curso)}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('jwt')}` }
    });
    const studentsData = await studentsRes.json();
    const alumnosList = studentsData.alumnos || [];

    // 2. Obtener asignación previa de Chromebooks (si existe)
    const assignRes = await fetch(`${API_URL}/asignaciones/reserva/${reservaId}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('jwt')}` }
    });
    const assignData = await assignRes.json();
    const existingAlumnos = assignData.asignacion ? assignData.asignacion.alumnos : [];

    if (alumnosList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted" style="padding:var(--space-4);">No hay alumnos registrados para este curso.</td></tr>';
      return;
    }

    tbody.innerHTML = alumnosList.map((nombre, index) => {
      const existing = existingAlumnos.find(a => a.nombre === nombre);
      const chromebookNum = existing ? existing.chromebook : '';
      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: var(--space-2) var(--space-3); font-size: 0.9rem; font-family: var(--font-body); color: var(--text-main);">${nombre}</td>
          <td style="padding: var(--space-2) var(--space-3); text-align: center;">
            <input type="number" name="chromebook_${index}" data-nombre="${nombre}" class="form-input" 
                   value="${chromebookNum}" placeholder="--" min="1" max="100"
                   style="width: 80px; text-align: center; padding: 4px; margin: 0 auto; display: block; height: 32px;">
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error al abrir modal de asignaciones:', error);
    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger" style="padding:var(--space-4);">Error al cargar alumnos.</td></tr>';
  }
}

function setupAsignarEquiposForm() {
  const form = document.getElementById('asignarEquiposForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reservaId = document.getElementById('asignarReservaId').value;
    const tbody = document.getElementById('asignarEquiposTableBody');
    const inputs = tbody.querySelectorAll('input[type="number"]');
    const alumnos = [];

    inputs.forEach(input => {
      const nombre = input.dataset.nombre;
      const chromebook = input.value.trim();
      alumnos.push({ nombre, chromebook });
    });

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';

    try {
      const res = await apiFetch('/asignaciones', {
        method: 'POST',
        body: JSON.stringify({ reserva_id: reservaId, alumnos })
      });
      if (res.ok) {
        showToast('✅ Asignación guardada correctamente.', 'success');
        closeModal('asignarEquiposModal');
        const activeTab = document.querySelector('.admin-tab.active');
        if (activeTab && activeTab.dataset.tab === 'tabAsignaciones') {
          loadAsignaciones();
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al guardar asignación.', 'error');
      }
    } catch (error) {
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

async function loadAsignaciones() {
  const tbody = document.getElementById('asignacionesTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:var(--space-6);">Cargando asignaciones...</td></tr>';
  
  try {
    const res = await apiFetch('/admin/asignaciones');
    if (!res.ok) throw new Error('Error al cargar asignaciones');
    const data = await res.json();
    window.asignacionesData = data.asignaciones || [];

    if (window.asignacionesData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:var(--space-8);">No hay asignaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = window.asignacionesData.map(a => {
      const count = a.alumnos.filter(st => st.chromebook && st.chromebook.trim() !== '').length;
      return `
        <tr>
          <td><strong>${a.fecha}</strong></td>
          <td>Bloque ${a.bloque} (${a.bloque_horario})</td>
          <td>${a.dependencia_nombre || a.dependencia_id}</td>
          <td>${a.profesor_nombre}</td>
          <td><span class="badge badge-info">${a.curso}</span></td>
          <td>${a.asignatura}</td>
          <td><strong style="color:var(--color-primary);">${count}</strong> / ${a.alumnos.length} asignados</td>
          <td>
            <button class="btn btn-navy btn-sm" onclick="verDetalleAsignacion('${a.reserva_id}')">Ver Detalle</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger" style="padding:var(--space-6);">Error al cargar datos de asignaciones.</td></tr>';
  }
}

async function verDetalleAsignacion(reservaId) {
  const asignacion = window.asignacionesData.find(a => a.reserva_id === reservaId);
  if (!asignacion) return;
  openAsignarModal(reservaId, asignacion.curso, asignacion.asignatura, asignacion.fecha);
}

function exportAsignacionesCSV() {
  if (!window.asignacionesData || window.asignacionesData.length === 0) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += 'Fecha;Bloque;Horario;Dependencia;Profesor;Curso;Asignatura;Alumno;Chromebook\n';

  window.asignacionesData.forEach(a => {
    a.alumnos.forEach(alumno => {
      const row = [
        a.fecha,
        `Bloque ${a.bloque}`,
        a.bloque_horario,
        a.dependencia_nombre || a.dependencia_id,
        a.profesor_nombre,
        a.curso,
        a.asignatura,
        alumno.nombre,
        alumno.chromebook || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(';');
      csvContent += row + '\n';
    });
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte_chromebooks_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function startLiveClock() {
  const clockEl = document.getElementById('clockTime');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
  update();
  setInterval(update, 1000);
}
