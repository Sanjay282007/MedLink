    // --- STORAGE KEYS ---
    const LOCAL_STORAGE_KEY_USERS = 'medlink_registered_users';
    const LOCAL_STORAGE_KEY_SESSION = 'medlink_active_session';
    const APP_STORAGE_KEY_PREFIX = 'medlink_medicines_';
    const NOTIFICATION_PREF_KEY = 'medlink_notification_pref';

    // --- APP STATE ---
    let medicines = [];
    let currentEditingId = null;
    let activeReminder = null;
    let notificationPermission = 'default';
    let notificationPreference = 'modal';
    const SNOOZE_DURATION_MINUTES = 5;
    const LOW_STOCK_THRESHOLD = 5;
    const EXPIRY_WARNING_DAYS = 30;

    let isSignInMode = true;
    let currentUserProfile = null;
    let currentUserId = null;

    // store last generated summary text for copy/download
    let lastGeneratedSummaryText = '';

    // DOM refs
    const loadingView = document.getElementById('loading-view'); // may be null (loading removed)
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');

    const views = {
      'landing': document.getElementById('landing-view'),
      'dashboard': document.getElementById('dashboard-view'),
      'add-medicine': document.getElementById('add-medicine-view'),
      'settings': document.getElementById('settings-view')
    };

    const searchInput = document.getElementById('search-input');
    const doseTimeSelect = document.getElementById('dose-time-select');
    const scheduleTypeSelect = document.getElementById('schedule-type');
    const scheduleTimeInput = document.getElementById('schedule-time');
    const darkModeToggle = document.getElementById('darkModeToggle');

    const permissionButton = document.getElementById('permission-button');
    const permissionStatus = document.getElementById('permission-status');

    const genericModal = document.getElementById('generic-modal');
    const genericModalTitle = document.getElementById('generic-modal-title');
    const genericModalBody = document.getElementById('generic-modal-body');

    const reminderModal = document.getElementById('reminder-modal');
    const notificationSound = document.getElementById('notification-sound');
    const alarmSound = document.getElementById('alarm-sound');

    const lowStockListEl = document.getElementById('low-stock-list');
    const expiringSoonListEl = document.getElementById('expiring-soon-list');
    const lowStockThresholdText = document.getElementById('low-stock-threshold-text');
    const expiryWarningDaysText = document.getElementById('expiry-warning-days-text');
    const todayDateText = document.getElementById('today-date-text');

    // --- Simple generic modal functions ---
    function showModal(title, bodyHTML) {
      genericModalTitle.textContent = title;
      genericModalBody.innerHTML = bodyHTML || '';
      genericModal.classList.remove('hidden');
      genericModal.classList.add('flex');
    }
    function closeModal() {
      genericModal.classList.add('hidden');
      genericModal.classList.remove('flex');
      genericModalTitle.textContent = 'Message';
      genericModalBody.innerHTML = '';
    }

    // --- Helpers ---
    const getStoredUsers = () => { const data = localStorage.getItem(LOCAL_STORAGE_KEY_USERS); return data ? JSON.parse(data) : []; };
    const saveUser = (user) => { const u = getStoredUsers(); u.push(user); localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(u)); };
    const saveSession = (user) => { const sessionData = { id:user.id, email:user.email, username:user.username }; localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, JSON.stringify(sessionData)); };
    const removeSession = () => localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);

    // Auth UI toggle
    window.toggleAuthMode = () => {
      isSignInMode = !isSignInMode;
      const authTitle = document.getElementById('auth-title');
      const submitButton = document.getElementById('submit-button');
      const toggleAuthButton = document.getElementById('toggle-auth');
      const registrationFields = document.getElementById('registration-fields');
      const usernameInput = document.getElementById('username');

      if (isSignInMode) {
        authTitle.textContent = 'Sign In';
        submitButton.textContent = 'Sign In';
        toggleAuthButton.textContent = ' Sign Up';
        registrationFields.style.maxHeight = '0';
        registrationFields.style.opacity = '0';
        usernameInput.removeAttribute('required');
      } else {
        authTitle.textContent = 'Create Account';
        submitButton.textContent = 'Sign Up';
        toggleAuthButton.textContent = ' Sign In';
        registrationFields.style.maxHeight = '200px';
        registrationFields.style.opacity = '1';
        usernameInput.setAttribute('required','required');
      }
    };

    // Handle sign in / sign up
    const showAuthError = (message) => {
      const el = document.getElementById('auth-error');
      el.textContent = message;
      el.classList.remove('hidden');
      setTimeout(()=>el.classList.add('hidden'),5000);
    };

    const handleSubmit = () => {
      const email = (document.getElementById('email').value || '').trim();
      const password = (document.getElementById('password').value || '');
      const username = (document.getElementById('username').value || '').trim();

      if (isSignInMode) {
        const users = getStoredUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
          currentUserProfile = user; currentUserId = user.id; saveSession(user); showMainView('app-view');
          // load medicines for this user
          loadMedicines(); renderDashboard(); renderSummaryCards();
        } else showAuthError('Invalid email or password.');
      } else {
        if (!username || username.length < 3) return showAuthError('Username must be at least 3 characters.');
        if (password.length < 6) return showAuthError('Password must be at least 6 characters.');
        const users = getStoredUsers();
        if (users.some(u => u.email === email)) return showAuthError('An account with this email already exists.');
        const newId = Date.now().toString();
        const newUser = { id: newId, email, password, username };
        saveUser(newUser); currentUserProfile = newUser; currentUserId = newId; saveSession(newUser);
        showMainView('app-view');
      }
    };
    window.handleSubmit = handleSubmit;

    window.signOut = () => {
      // stop alarms & reminders for current user
      stopAlarm();
      activeReminder = null;
      currentUserProfile = null;
      currentUserId = null;
      removeSession();
      showMainView('auth-view');
      isSignInMode = false;
      toggleAuthMode();
    };

    // Scroll-to-section + view activation (smooth)
    function scrollToSection(sectionId) {
      // ensure app visible and render needed parts
      showMainView('app-view');
      // small delay to ensure layout & rendering
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // also activate view states for internal logic
        if (sectionId === 'dashboard-view') changeView('dashboard');
        if (sectionId === 'add-medicine-view') changeView('add-medicine');
        if (sectionId === 'settings-view') changeView('settings');
      }, 150);
    }

    // View management
    const showMainView = (viewId) => {
      if (loadingView) loadingView.classList.add('hidden');
      authView.classList.add('hidden');
      appView.classList.add('hidden');

      if (viewId === 'auth-view') authView.classList.remove('hidden');
      else if (viewId === 'app-view') {
        appView.classList.remove('hidden'); loadMedicines();
        if (medicines.length > 0) changeView('dashboard'); else changeView('landing');
      }
    };

    window.changeView = (viewId, medicineData = null) => {
      Object.keys(views).forEach(k => {
        if (views[k]) views[k].classList.remove('active');
      });
      if (views[viewId]) views[viewId].classList.add('active');

      if (viewId === 'add-medicine') prepareForm(medicineData);
      if (viewId === 'dashboard') { renderDashboard(); renderSummaryCards(); }
      if (viewId === 'settings') updateSettingsView();
    };

    // Utilities
    const formatDate = (date) => { if (!date) return ''; const d = new Date(date); return d.toISOString().split('T')[0]; };
    const getDayDifference = (date1, date2) => { const ONE_DAY = 1000*60*60*24; const diffTime = date1.getTime() - date2.getTime(); return Math.ceil(diffTime/ONE_DAY); };
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2,5);

    function copyToClipboard(text, successMessage){
      try {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showModal("Copied!", `<p style="font-size:1.05rem; color:var(--soft-green); font-weight:600;">${escapeHtml(successMessage)}</p>`);
      } catch (err) {
        console.error('Copy failed',err);
        showModal("Copy Failed", "Please copy manually:<textarea class='w-full h-24 mt-2 p-2 border rounded' readonly>"+escapeHtml(text)+"</textarea>");
      }
    }

    // sanitize simple text for HTML contexts (basic)
    function escapeHtml(str) {
      if (str === undefined || str === null) return '';
      return String(str)
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'",'&#039;');
    }

    // Storage CRUD (per-user)
    const loadMedicines = () => {
      if (!currentUserId) { medicines = []; return; }
      const key = APP_STORAGE_KEY_PREFIX + currentUserId;
      const data = localStorage.getItem(key);
      medicines = data ? JSON.parse(data) : [];
    };
    const saveMedicines = () => {
      if (!currentUserId) return;
      const key = APP_STORAGE_KEY_PREFIX + currentUserId;
      localStorage.setItem(key, JSON.stringify(medicines));
    };

    // Prepare add/edit form
    const prepareForm = (medicineData) => {
      const form = document.getElementById('medicine-form');
      const formTitle = document.getElementById('form-title');
      const saveButton = document.getElementById('save-button');

      form.reset();
      currentEditingId = null;
      scheduleTimeInput.value = '';
      doseTimeSelect.value = '';
      scheduleTypeSelect.value = '';
      document.getElementById('prescription').value = '';

      // ensure custom/time logic
      doseTimeSelect.onchange = () => {
        const val = doseTimeSelect.value;
        if (val === 'custom') {
          scheduleTimeInput.disabled = false;
          scheduleTimeInput.value = '';
          scheduleTimeInput.focus();
        } else {
          scheduleTimeInput.disabled = true;
          scheduleTimeInput.value = val; // val is HH:MM in morning/noon/night options
        }
      };

      if (medicineData) {
        formTitle.textContent = 'Edit Medicine: ' + medicineData.name;
        saveButton.textContent = 'Update Medicine';
        currentEditingId = medicineData.id;
        document.getElementById('medicine-id').value = medicineData.id;
        document.getElementById('name').value = medicineData.name;
        document.getElementById('dosage').value = medicineData.dosage;
        document.getElementById('stock').value = medicineData.stock;
        document.getElementById('expiry-date').value = medicineData.expiryDate;
        document.getElementById('purpose').value = medicineData.purpose;
        document.getElementById('dose-amount').value = medicineData.doseAmount || 1;
        document.getElementById('prescription').value = medicineData.prescription || '';

        // populate dose-time / time inputs
        if (medicineData.time) {
          // if matches one of presets, select preset; else custom
          if (['08:00','13:00','20:00'].includes(medicineData.time)) {
            doseTimeSelect.value = medicineData.time;
            scheduleTimeInput.disabled = true;
            scheduleTimeInput.value = medicineData.time;
          } else {
            doseTimeSelect.value = 'custom';
            scheduleTimeInput.disabled = false;
            scheduleTimeInput.value = medicineData.time;
          }
        }
        if (medicineData.scheduleType) scheduleTypeSelect.value = medicineData.scheduleType;
      } else {
        formTitle.textContent = 'Add New Medicine';
        saveButton.textContent = 'Save Medicine';
        // default: quick set morning preset (commented out to match original behavior)
        // doseTimeSelect.value = '08:00';
        // scheduleTimeInput.value = '08:00';
      }

      setTimeout(()=>document.getElementById('name').focus(),150);
    };

    // Save medicine
    window.saveMedicine = () => {
      const name = (document.getElementById('name').value || '').trim();
      const dosage = (document.getElementById('dosage').value || '').trim();
      const stock = parseInt(document.getElementById('stock').value || '0');
      const doseAmount = parseInt(document.getElementById('dose-amount').value || '0');
      const expiryDate = formatDate(document.getElementById('expiry-date').value);
      const purpose = (document.getElementById('purpose').value || '').trim();
      const prescription = (document.getElementById('prescription').value || '').trim();

      if (!name) { showModal("Validation Error", "Please enter the medicine name."); return; }
      if (!dosage) { showModal("Validation Error", "Please enter dosage."); return; }
      if (!expiryDate) { showModal("Validation Error", "Please choose expiry date."); return; }

      const scheduleType = (document.getElementById('schedule-type').value || '');
      const doseTimeChoice = (document.getElementById('dose-time-select').value || '');
      const scheduleTime = (document.getElementById('schedule-time').value || '');

      if (!doseTimeChoice) { showModal("Validation Error", "Please choose a dose time (Morning/Noon/Night/Custom)."); return; }
      if (doseTimeChoice === 'custom' && !scheduleTime) { showModal("Validation Error", "Please enter a custom time."); return; }
      if (doseTimeChoice !== 'custom' && !scheduleTime) {
        // preset values are stored in select value; ensure preserved
      }
      if (!scheduleType) { showModal("Validation Error", "Please choose a schedule (Today or Daily)."); return; }
      if (!scheduleTime) { showModal("Validation Error", "Please choose a time for the schedule."); return; }

      if (isNaN(stock) || stock < 0) { showModal("Validation Error", "Stock must be a valid number >= 0."); return; }
      if (isNaN(doseAmount) || doseAmount < 1) { showModal("Validation Error", "Dose amount must be at least 1."); return; }
      if (doseAmount > stock) { showModal("Validation Error",'Dose amount cannot be greater than stock.'); return; }

      // for 'today' schedule, remember the date to only trigger today
      const scheduleDate = scheduleType === 'today' ? formatDate(new Date()) : null;

      const newMedicine = {
        id: currentEditingId || generateId(),
        name,
        dosage,
        time: scheduleTime, // store HH:MM string
        stock,
        doseAmount,
        expiryDate,
        purpose,
        prescription, // multi-line text preserved
        scheduleType, // 'today' or 'daily'
        scheduleDate, // YYYY-MM-DD if today, else null
        snoozeUntil: null
      };

      if (!currentUserId) {
        showModal("Not Signed In", "Please sign in to save medicines.");
        return;
      }

      if (currentEditingId) {
        const idx = medicines.findIndex(m => m.id === currentEditingId);
        if (idx > -1) medicines[idx] = newMedicine;
      } else medicines.push(newMedicine);

      saveMedicines();
      renderDashboard();
      renderSummaryCards();

      const form = document.getElementById('medicine-form');
      form.reset();
      currentEditingId = null;
      document.getElementById('form-title').textContent = 'Add New Medicine';
      document.getElementById('save-button').textContent = 'Save Medicine';
      scheduleTimeInput.disabled = true;
      showModal("Saved", `${escapeHtml(newMedicine.name)} saved successfully.`);
    };

    // Delete flow (confirmation)
    window.deleteMedicine = (id, name) => {
      const modalTitle = 'Confirm Deletion';
      const modalMessage = `Are you sure you want to permanently delete <strong>${escapeHtml(name)}</strong> from your tracker? This action cannot be undone.`;
      showModal(modalTitle, modalMessage + `<div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button onclick="closeModal()" style="padding:.5rem .75rem; border-radius:6px; background:#f3f4f6;">Cancel</button>
        <button onclick="executeDelete('${id}')" style="padding:.5rem .75rem; border-radius:6px; background:#ef4444; color:white;">Delete</button>
      </div>`);
    };

    window.executeDelete = (id) => {
      medicines = medicines.filter(m => m.id !== id);
      saveMedicines();
      renderDashboard();
      renderSummaryCards();
      if (medicines.length === 0) changeView('landing');
      closeModal();
    };

    window.editMedicine = (id) => {
      const m = medicines.find(x => x.id === id);
      if (m) changeView('add-medicine', m);
    };

    window.quickUpdate = (id) => {
      const med = medicines.find(m => m.id === id);
      if (!med) return;
      changeView('add-medicine', med);
      setTimeout(()=>window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
    };

    // Take dose
    window.takeDose = (id) => {
      const medicine = medicines.find(m => m.id === id);
      if (!medicine) return;
      if (medicine.stock >= medicine.doseAmount) {
        medicine.stock -= medicine.doseAmount;
        saveMedicines();
        renderDashboard();
        renderSummaryCards();
        stopAlarm();
        showModal("Dose Taken", `${escapeHtml(medicine.name)} — dose recorded. Stock left: ${medicine.stock}`);
      } else if (medicine.stock > 0) {
        showModal("Low Stock Warning", `Cannot take full dose of ${medicine.doseAmount} units. Only ${medicine.stock} units remain.`);
      } else showModal("Out of Stock", `Cannot take ${escapeHtml(medicine.name)}. Stock is 0.`);
    };

    window.takeDoseFromReminder = (id) => { window.takeDose(id); window.closeReminder(); };

    // Render dashboard cards
    window.renderDashboard = () => {
      const container = document.getElementById('medicine-list');
      const statTotal = document.getElementById('stat-total');
      const statUrgent = document.getElementById('stat-urgent');
      const noMedsMessage = document.getElementById('no-meds-message');
      const summaryButton = document.getElementById('summary-button');

      const searchTerm = (searchInput.value || '').toLowerCase();
      const filtered = medicines.filter(m => m.name.toLowerCase().includes(searchTerm));
      container.innerHTML = '';
      let urgentCount = 0;
      const today = new Date(); today.setHours(0,0,0,0);

      summaryButton.disabled = medicines.length === 0;

      filtered.forEach(med => {
        const expiryDate = new Date(med.expiryDate); expiryDate.setHours(0,0,0,0);
        const daysUntilExpiry = getDayDifference(expiryDate, today);
        let warningText = '';
        let isUrgent = false;

        if (med.stock < LOW_STOCK_THRESHOLD) { warningText += `<p class="text-sm text-red-600 font-semibold">📦 Low Stock (${med.stock} units)</p>`; isUrgent = true; }
        if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
          const expiryMsg = daysUntilExpiry <= 0 ? 'EXPIRED!' : `Expiring in ${daysUntilExpiry} day${daysUntilExpiry>1? 's':''}`;
          warningText += `<p class="text-sm text-red-600 font-semibold">📅 ${expiryMsg}</p>`;
          if (daysUntilExpiry <= 0) isUrgent = true;
        }
        if (isUrgent) urgentCount++;

        const takeDoseDisabled = med.stock <= 0;
        const takeDoseClass = takeDoseDisabled ? 'background: #e5e7eb; color:#6b7280; cursor:not-allowed;' : 'background:var(--clinical-blue); color:white;';

        const scheduleLabel = med.scheduleType === 'daily' ? `Daily @ ${escapeHtml(med.time)}` : `Today @ ${escapeHtml(med.time)}`;

        const card = document.createElement('div');
        card.className = 'card p-5 rounded-lg';
        card.innerHTML = `
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-lg font-bold" style="color:var(--clinical-blue)">${escapeHtml(med.name)}</h3>
              <p class="muted text-sm">${escapeHtml(med.dosage)} • ${med.doseAmount} unit${med.doseAmount>1?'s':''}</p>
            </div>
            <div class="text-2xl">💊</div>
          </div>

          <div class="text-sm space-y-2 mb-3">
            <p class="flex justify-between"><span class="font-medium muted">Schedule</span><span class="font-semibold" style="color:#1e40af">${escapeHtml(scheduleLabel)}</span></p>
            <p class="flex justify-between"><span class="font-medium muted">Stock</span><span class="${med.stock < LOW_STOCK_THRESHOLD ? 'text-red-500 font-bold' : ''}">${med.stock} units</span></p>
            <p class="flex justify-between"><span class="font-medium muted">Expires</span><span>${escapeHtml(med.expiryDate)}</span></p>
            <p class="muted-2 italic text-xs">${escapeHtml((med.purpose || '').substring(0,80))}${(med.purpose||'').length>80?'...':''}</p>
          </div>

          ${warningText}

          <div class="mt-3 flex justify-between items-center">
            <div>
              <button onclick="takeDose('${med.id}')" ${takeDoseDisabled? 'disabled':''} style="${takeDoseClass} padding:.5rem .75rem; border-radius:9999px; font-weight:600;">
                ${takeDoseDisabled? 'No Stock':'✅ Take Dose'}
              </button>
            </div>
            <div class="flex gap-3">
              <button onclick="editMedicine('${med.id}')" style="color:var(--clinical-blue); background:transparent; border:none; font-size:18px;">✏</button>
              <button onclick="deleteMedicine('${med.id}','${escapeHtml(med.name)}')" style="color:#ef4444; background:transparent; border:none; font-size:18px;">🗑</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      if (statTotal && statUrgent && noMedsMessage) {
        statTotal.textContent = medicines.length;
        statUrgent.textContent = urgentCount;
        noMedsMessage.classList.toggle('hidden', filtered.length > 0);
        if (medicines.length === 0 && (searchInput.value||'') === '') {
          noMedsMessage.textContent = "No medicines added yet. Click 'Add' to start tracking!";
          noMedsMessage.classList.remove('hidden');
        } else if (filtered.length === 0) {
          noMedsMessage.textContent = "No medicines match your search. Try adjusting the filter or adding a new one!";
        }
      }
    };

    // Summary cards
    function renderSummaryCards() {
      lowStockListEl.innerHTML = '';
      expiringSoonListEl.innerHTML = '';
      lowStockThresholdText.textContent = LOW_STOCK_THRESHOLD;
      expiryWarningDaysText.textContent = EXPIRY_WARNING_DAYS;
      const today = new Date(); today.setHours(0,0,0,0);
      todayDateText.textContent = today.toISOString().split('T')[0];

      const lowStock = medicines.filter(m => m.stock < LOW_STOCK_THRESHOLD).sort((a,b) => a.stock - b.stock);
      if (lowStock.length === 0) {
        lowStockListEl.innerHTML = '<div class="muted text-sm">All stocks are sufficient.</div>';
      } else {
        lowStock.forEach(m => {
          const item = document.createElement('div');
          item.className = 'summary-item p-2';
          item.innerHTML = `
            <div>
              <div class="font-medium">${escapeHtml(m.name)}</div>
              <div class="meta">Stock: <strong>${m.stock}</strong> • Expires: ${escapeHtml(m.expiryDate)}</div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <button onclick="quickUpdate('${m.id}')" class="px-2 py-1 text-xs" style="background:var(--clinical-blue); color:white; border-radius:6px;">Update</button>
            </div>
          `;
          lowStockListEl.appendChild(item);
        });
      }

      const expiring = medicines.map(m => {
        const expiry = new Date(m.expiryDate); expiry.setHours(0,0,0,0);
        const days = getDayDifference(expiry, today);
        return { ...m, daysUntilExpiry: days };
      }).filter(m => m.daysUntilExpiry <= EXPIRY_WARNING_DAYS).sort((a,b)=>a.daysUntilExpiry - b.daysUntilExpiry);

      if (expiring.length === 0) {
        expiringSoonListEl.innerHTML = '<div class="muted text-sm">No medicines expiring soon.</div>';
      } else {
        expiring.forEach(m => {
          const item = document.createElement('div');
          item.className = 'summary-item p-2' + (m.daysUntilExpiry <= 0 ? ' expired' : '');
          item.innerHTML = `
            <div>
              <div class="font-medium">${escapeHtml(m.name)}</div>
              <div class="meta">${m.daysUntilExpiry <= 0 ? '<strong>Expired</strong>' : m.daysUntilExpiry + ' day' + (m.daysUntilExpiry>1?'s':'') + ' left'} • Stock: ${m.stock}</div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <button onclick="quickUpdate('${m.id}')" class="px-2 py-1 text-xs" style="background:var(--clinical-blue); color:white; border-radius:6px;">Update</button>
            </div>
          `;
          expiringSoonListEl.appendChild(item);
        });
      }
    }

    // focus helpers
    function focusLowStock() {
      scrollToSection('dashboard-view');
      const el = document.querySelector('#low-stock-list');
      if (!el) return;
      el.style.boxShadow = '0 8px 30px rgba(37,99,235,0.08)';
      setTimeout(()=>el.style.boxShadow = '', 1800);
    }
    function focusExpiring() {
      scrollToSection('dashboard-view');
      const el = document.querySelector('#expiring-soon-list');
      if (!el) return;
      el.style.boxShadow = '0 8px 30px rgba(250,204,21,0.08)';
      setTimeout(()=>el.style.boxShadow = '', 1800);
    }

    // Notifications & reminders
    window.requestNotificationPermission = async function(auto = false) {
      if (!('Notification' in window)) {
        showModal("Browser Support", "Your browser does not support Web Notifications.");
        return;
      }

      notificationPermission = Notification.permission;

      if (notificationPermission === 'granted') {
        notificationPreference = 'browser';
        localStorage.setItem(NOTIFICATION_PREF_KEY, notificationPreference);
        updatePermissionStatus();
        return;
      }

      if (notificationPermission === 'denied') {
        if (!auto) showModal("Permission Denied", "Notifications are blocked in your browser settings.");
        updatePermissionStatus();
        return;
      }

      try {
        const p = await Notification.requestPermission();
        notificationPermission = p;
        if (p === 'granted') {
          notificationPreference = 'browser';
          localStorage.setItem(NOTIFICATION_PREF_KEY, notificationPreference);
          updatePermissionStatus();
          showModal("✅ Notifications Enabled", "Browser notifications have been enabled. You’ll now receive medicine reminders even if the app is not active.");
          try { new Notification("MedLink", { body: "Notifications enabled — you'll receive reminders." }); } catch(e){}
        } else if (p === 'denied' && !auto) {
          showModal("Permission Denied", "You denied browser notifications. You can change this later in Settings → Notifications.");
          updatePermissionStatus();
        }
      } catch (err) {
        console.error("Permission request failed:", err);
        if (!auto) showModal("Error", "Could not request notification permission. Check browser console for details.");
      }
    };

    function updatePermissionStatus(){
      const statusText = { 'granted':'✅ Permission Granted: Browser notifications are available.', 'denied':'🚫 Permission Denied: Browser notifications are blocked.','default':'❓ Permission Required: Click the button to enable browser notifications.' }[notificationPermission];
      permissionStatus.textContent = statusText;
      permissionStatus.className = '';
      if (notificationPermission === 'granted') { permissionStatus.classList.add('text-[--soft-green]'); permissionButton.disabled = true; }
      else if (notificationPermission === 'denied') { permissionStatus.classList.add('text-red-500'); permissionButton.disabled = true; }
      else { permissionStatus.classList.add('muted'); permissionButton.disabled = false; }
      // set radio
      const el = document.getElementById(`notify-${notificationPreference}`);
      if (el) el.checked = true;
      const browserRadio = document.getElementById('notify-browser');
      if (browserRadio) browserRadio.disabled = notificationPermission === 'denied';
    }

    function handleNotificationPreferenceChange(event){
      notificationPreference = event.target.value; localStorage.setItem(NOTIFICATION_PREF_KEY, notificationPreference); updatePermissionStatus();
    }

    // check reminders every minute (and on load)
    const checkReminders = () => {
      if (!currentUserId || activeReminder) return;
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const currentTimeStr = `${h}:${m}`;
      const todayStr = formatDate(now);

      medicines.forEach(med => {
        // determine if this med should trigger now
        let shouldTrigger = false;
        // If med.snoozeUntil present and expired
        if (med.snoozeUntil && now.getTime() >= med.snoozeUntil) shouldTrigger = true;

        // If time matches exactly HH:MM
        if (med.time === currentTimeStr) {
          if (med.scheduleType === 'daily') shouldTrigger = true;
          if (med.scheduleType === 'today' && med.scheduleDate === todayStr) shouldTrigger = true;
        }

        if (shouldTrigger && med.stock > 0) {
          // clear snooze if picked up
          if (med.snoozeUntil) { med.snoozeUntil = null; saveMedicines(); }
          // choose notification method
          if (document.hidden && notificationPreference === 'browser' && notificationPermission === 'granted') {
            showWebNotification(med);
          } else {
            showReminderModal(med);
          }
        }
      });
      renderDashboard();
      renderSummaryCards();
    };

    const showReminderModal = (med) => {
      if (activeReminder) return;
      activeReminder = med;
      document.getElementById('reminder-name').textContent = med.name;
      document.getElementById('reminder-details').textContent = `Dose: ${med.dosage} (Take ${med.doseAmount} unit${med.doseAmount>1?'s':''})  •  Schedule: ${med.scheduleType === 'daily' ? 'Daily' : 'Today'} @ ${med.time}`;
      document.getElementById('reminder-purpose').textContent = med.purpose || "No specific notes.";
      reminderModal.classList.remove('hidden'); reminderModal.classList.add('flex');

      // play short ping then loud looping alarm
      try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(()=>{});
      } catch(e){}
      try {
        alarmSound.loop = true;
        alarmSound.volume = 1.0; // loud
        alarmSound.currentTime = 0;
        alarmSound.play().catch(()=>{});
      } catch(e){}
    };

    function stopAlarm(){
      try {
        alarmSound.pause();
        alarmSound.currentTime = 0;
      } catch(e){}
    }

    const showWebNotification = (med) => {
      if (notificationPermission !== 'granted' || activeReminder) return;
      activeReminder = med;
      const title = `💊 MedLink: ${med.time} Dose Reminder`;
      const body = `Time to take ${med.name}. Dose: ${med.dosage} (${med.doseAmount}). Stock remaining: ${med.stock}.`;
      try {
        const notification = new Notification(title, { body, icon: 'https://placehold.co/48x48/10b981/ffffff?text=P', vibrate: [200,100,200] });
        notification.onclick = function(){ window.focus(); window.closeReminder(); };
      } catch(e){}
      // play ping + alarm as well
      try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(()=>{});
      } catch(e){}
      try {
        alarmSound.loop = true;
        alarmSound.volume = 1.0;
        alarmSound.currentTime = 0;
        alarmSound.play().catch(()=>{});
      } catch(e){}
      setTimeout(window.closeReminder, 20000);
    };

    window.closeReminder = () => {
      if (activeReminder) activeReminder.snoozeUntil = null;
      activeReminder = null;
      reminderModal.classList.add('hidden'); reminderModal.classList.remove('flex');
      stopAlarm();
      notificationSound.pause(); notificationSound.currentTime = 0;
      renderDashboard();
      renderSummaryCards();
    };

    window.snoozeReminder = () => {
      if (activeReminder) {
        const snooze = new Date(); snooze.setMinutes(snooze.getMinutes() + SNOOZE_DURATION_MINUTES);
        activeReminder.snoozeUntil = snooze.getTime(); saveMedicines();
      }
      stopAlarm();
      window.closeReminder();
    };

    // Dark mode
    const initializeDarkMode = () => {
      const isDark = localStorage.getItem('dark-mode') === 'true';
      document.body.classList.toggle('dark-mode', isDark);
      darkModeToggle.innerHTML = isDark ? '🌙' : '☀';
    };
    darkModeToggle.onclick = () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('dark-mode', isDark);
      darkModeToggle.innerHTML = isDark ? '🌙' : '☀';
    };

    // Settings view init
    function updateSettingsView(){
      notificationPreference = localStorage.getItem(NOTIFICATION_PREF_KEY) || 'modal';
      notificationPermission = Notification.permission;
      updatePermissionStatus();
      document.querySelectorAll('input[name="notification-type"]').forEach(radio=>{
        radio.removeEventListener('change', handleNotificationPreferenceChange);
        radio.addEventListener('change', handleNotificationPreferenceChange);
      });
    }

    // Cancel add/edit -> go to dashboard
    function cancelAddEdit() {
      const form = document.getElementById('medicine-form');
      form.reset();
      currentEditingId = null;
      document.getElementById('form-title').textContent = 'Add New Medicine';
      document.getElementById('save-button').textContent = 'Save Medicine';
      scheduleTimeInput.disabled = true;
      changeView('dashboard');
      scrollToSection('dashboard-view');
    }

    // Health summary generator (local) — Doctor-style single-line per medicine and prescriptions as bullets
    window.generateHealthSummary = function(){
      if (medicines.length === 0) {
        return showModal("Cannot Generate Summary", "Please add at least one medicine to your tracker before generating a summary.");
      }
      const loadingEl = document.getElementById('summary-loading');
      const summaryButton = document.getElementById('summary-button');
      summaryButton.disabled = true;
      if (loadingEl) loadingEl.classList.remove('hidden');

      try {
        // compact single-line per med
        let compact = '';
        medicines.forEach((m, idx) => {
          const scheduleStr = m.scheduleType === 'daily' ? `Daily @ ${m.time}` : `Today @ ${m.time}`;
          compact += `${idx+1}. ${m.name} — ${m.dosage}   Schedule: ${scheduleStr}   Dose: ${m.doseAmount} | Stock: ${m.stock} | Expires: ${m.expiryDate}   Notes: ${m.purpose || '—'}\n`;
        });

        // prescriptions section (bulleted)
        let presSection = '';
        medicines.forEach((m, idx) => {
          if (m.prescription && m.prescription.trim().length > 0) {
            const bullets = m.prescription.split('\n').map(line=>line.trim()).filter(Boolean);
            if (bullets.length > 0) {
              presSection += `${idx+1}. ${m.name} Prescription:\n`;
              bullets.forEach(b => presSection += `   • ${b}\n`);
            }
          }
        });

        // store for copy/download
        lastGeneratedSummaryText = compact + "\n" + presSection;

        // create modal content with Copy and Download buttons
        const outContent = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="font-weight:600;">📋 Medication Summary</div>
            <div style="display:flex; gap:8px;">
              <button onclick="copySummary()" style="padding:.35rem .6rem; border-radius:8px; background:#f3f4f6; border:1px solid #e5e7eb;">📋 Copy</button>
              <button onclick="downloadSummary()" style="padding:.35rem .6rem; border-radius:8px; background:var(--clinical-blue); color:white; border:none;">⬇ Download</button>
            </div>
          </div>
          <pre style="white-space:pre-wrap; font-size:0.95rem; line-height:1.35; border-radius:8px; padding:8px; background:#ffffff22;">${escapeHtml(compact)}\n${escapeHtml(presSection)}</pre>
        `;

        showModal('✨ Medication Summary (Local)', outContent);

      } catch (err) {
        console.error("Summary generation failed:", err);
        showModal("Error", `Failed to generate summary. ${escapeHtml(err.message || '')}`);
      } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
        summaryButton.disabled = false;
      }
    };

    // copy last generated summary
    window.copySummary = function(){
      if (!lastGeneratedSummaryText) {
        showModal("Nothing to Copy", "Please generate the health summary first.");
        return;
      }
      copyToClipboard(lastGeneratedSummaryText, "Medication summary copied to clipboard.");
    };

    // Preview Doctor-style PDF before download
    window.downloadSummary = function(){
      if (!lastGeneratedSummaryText) {
        showModal("Nothing to Preview", "Please generate the health summary first.");
        return;
      }

      try {
        if (!window.jspdf) {
          showModal("PDF Library Missing", "Please ensure jsPDF is loaded.");
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const username = currentUserProfile?.username || "Patient";
        const today = new Date().toISOString().split("T")[0];

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("MedLink — Doctor Prescription", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Patient: ${username}`, 14, 30);
        doc.text(`Date: ${today}`, 150, 30);
        doc.setDrawColor(180);
        doc.line(14, 34, 196, 34);

        // Prescription content
        doc.setFont("courier", "normal");
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(lastGeneratedSummaryText, 180);
        doc.text(splitText, 14, 45);

        // Footer with signature
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.text("Doctor's Signature: ____________________________", 14, 270);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Generated by MedLink — Smart Medicine Tracker", 105, 285, { align: "center" });

        // Open preview in new tab
        const pdfBlob = doc.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, "_blank");

        showModal("🩺 PDF Preview Opened", "Your prescription has been generated. You can review and download it from the new tab.");
      } catch (err) {
        console.error("PDF generation failed:", err);
        showModal("Error", "Unable to generate PDF. Please try again.");
      }
    };

    // INIT
    const initializeApp = () => {
      initializeDarkMode();
      notificationPermission = Notification.permission;
      notificationPreference = localStorage.getItem(NOTIFICATION_PREF_KEY) || 'modal';
      const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        currentUserProfile = session; currentUserId = session.id; showMainView('app-view');
        loadMedicines(); renderDashboard(); renderSummaryCards();
        // Auto prompt for notification permission once if default
        if (notificationPermission === 'default') {
          setTimeout(() => {
            showModal(
              "🔔 Enable Notifications?",
              `<p>Enable browser notifications so MedLink can remind you even if this tab is closed?</p>
               <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                 <button onclick="closeModal()" style="padding:.5rem .75rem; border-radius:6px; background:#f3f4f6;">Later</button>
                 <button onclick="requestNotificationPermission(true)" style="padding:.5rem .75rem; border-radius:6px; background:var(--soft-green); color:white;">Enable</button>
               </div>`
            );
          }, 1500);
        }
      } else { showMainView('auth-view'); isSignInMode = false; toggleAuthMode(); }

      // wire event listeners
      if (doseTimeSelect) {
        doseTimeSelect.addEventListener('change', (e) => {
          const val = e.target.value;
          if (val === 'custom') {
            scheduleTimeInput.disabled = false;
            scheduleTimeInput.value = '';
            setTimeout(()=>scheduleTimeInput.focus(), 120);
          } else {
            scheduleTimeInput.disabled = true;
            scheduleTimeInput.value = val; // preset HH:MM from select
          }
        });
      }

      if (scheduleTypeSelect) {
        scheduleTypeSelect.addEventListener('change', (e) => {
          // focus schedule time for convenience
          setTimeout(()=>scheduleTimeInput.focus(), 120);
        });
      }

      document.querySelectorAll('input[name="notification-type"]').forEach(r=>{
        r.addEventListener('change', handleNotificationPreferenceChange);
      });

      // check reminders immediately and every minute
      checkReminders();
      setInterval(checkReminders, 60000); // every minute
    };

    // Start instantly without a loading screen
    document.addEventListener("DOMContentLoaded", () => {
      initializeApp();

      // Instantly show proper screen (in case initializeApp didn't update)
      const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION);
      if (sessionData) {
        document.getElementById("app-view").classList.remove("hidden");
      } else {
        document.getElementById("auth-view").classList.remove("hidden");
      }
    });

    // watch for storage changes (multi-tab)
    window.addEventListener('storage', () => { loadMedicines(); renderDashboard(); renderSummaryCards(); });

    // --- Responsive Menu Toggle ---
    const menuBtn = document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobileMenu");

    function toggleMenu() {
      if (!mobileMenu) return;
      mobileMenu.classList.toggle("show");
    }
    if (menuBtn) menuBtn.addEventListener("click", toggleMenu);

// Register background service worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('SW registration failed', err));
}
