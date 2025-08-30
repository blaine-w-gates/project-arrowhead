/* Admin Control Panel - Sprint 2 Frontend */
(function () {
  'use strict';

  const ADMIN_KEY_STORAGE_KEY = 'pa_admin_key';
  const ADMIN_CSRF_TOKEN_STORAGE_KEY = 'pa_admin_csrf';
  const POLL_INTERVAL_MS = 20000; // align with 20s backend cache TTL
  const WORKFLOWS = ['verify-rls', 'seed', 'audit'];

  let pollTimer = null;

  // --- Storage helpers ---
  function getStoredAdminKey() {
    return localStorage.getItem(ADMIN_KEY_STORAGE_KEY) || '';
  }

  function setStoredAdminKey(key) {
    if (key) localStorage.setItem(ADMIN_KEY_STORAGE_KEY, key);
  }

  function clearStoredAdminCredentials() {
    localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
    localStorage.removeItem(ADMIN_CSRF_TOKEN_STORAGE_KEY);
  }

  function getStoredCsrfToken() {
    return localStorage.getItem(ADMIN_CSRF_TOKEN_STORAGE_KEY) || '';
  }

  function setStoredCsrfToken(token) {
    if (token) localStorage.setItem(ADMIN_CSRF_TOKEN_STORAGE_KEY, token);
  }

  // --- UI helpers ---
  function qs(id) { return document.getElementById(id); }

  function showError(message) {
    const alertEl = qs('adminErrorAlert');
    const textEl = qs('adminErrorText');
    if (textEl) textEl.textContent = message || 'Unknown error';
    if (alertEl) alertEl.classList.remove('d-none');
  }

  function hideError() {
    const alertEl = qs('adminErrorAlert');
    if (alertEl) alertEl.classList.add('d-none');
  }

  function setRunButtonsEnabled(enabled) {
    WORKFLOWS.forEach(name => {
      const btn = qs(`runBtn-${name}`);
      if (btn) btn.disabled = !enabled;
    });
  }

  function updateCsrfBadge(ok) {
    const badge = qs('csrfStatusBadge');
    if (!badge) return;
    badge.classList.remove('bg-secondary', 'bg-success', 'bg-danger');
    if (ok) {
      badge.textContent = 'CSRF: OK';
      badge.classList.add('bg-success');
    } else {
      badge.textContent = 'CSRF: Not fetched';
      badge.classList.add('bg-secondary');
    }
  }

  function setGithubLink(name, url) {
    const a = qs(`githubLink-${name}`);
    if (!a) return;
    if (url) {
      a.href = url;
      a.classList.remove('disabled');
      a.removeAttribute('tabindex');
      a.setAttribute('aria-disabled', 'false');
    } else {
      a.href = '#';
      a.classList.add('disabled');
      a.setAttribute('tabindex', '-1');
      a.setAttribute('aria-disabled', 'true');
    }
  }

  function setStatusBadge(name, label, variant) {
    const badge = qs(`statusBadge-${name}`);
    if (!badge) return;
    badge.className = 'badge';
    badge.classList.add(variant || 'bg-secondary');
    badge.textContent = label || 'Idle';
  }

  function setLastUpdated(name) {
    const el = qs(`lastUpdated-${name}`);
    if (el) el.textContent = new Date().toLocaleTimeString();
  }

  // --- Network calls ---
  async function fetchCsrf() {
    try {
      hideError();
      const adminKey = getStoredAdminKey();
      if (!adminKey) {
        showError('Admin key is required. Please enter and save your Admin Key.');
        updateCsrfBadge(false);
        setRunButtonsEnabled(false);
        return null;
      }

      const res = await fetch('/api/admin/csrf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({})
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = (data && data.error) ? data.error : `Failed to fetch CSRF (${res.status})`;
        showError(msg);
        updateCsrfBadge(false);
        setRunButtonsEnabled(false);
        return null;
      }

      setStoredCsrfToken(data.csrfToken);
      updateCsrfBadge(true);
      setRunButtonsEnabled(true);
      return data.csrfToken;
    } catch (err) {
      console.error('CSRF fetch error:', err);
      showError('Network error while fetching CSRF token.');
      updateCsrfBadge(false);
      setRunButtonsEnabled(false);
      return null;
    }
  }

  async function runWorkflow(name) {
    const btn = qs(`runBtn-${name}`);
    try {
      hideError();
      const adminKey = getStoredAdminKey();
      if (!adminKey) {
        showError('Admin key is required.');
        return;
      }
      let csrfToken = getStoredCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrf();
        if (!csrfToken) return;
      }

      if (btn) btn.disabled = true;
      setStatusBadge(name, 'Dispatching…', 'bg-info');

      const res = await fetch(`/api/admin/workflows/${encodeURIComponent(name)}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({})
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = (data && data.error) ? data.error : `Failed to dispatch (${res.status})`;
        showError(msg);
        setStatusBadge(name, 'Failed to dispatch', 'bg-danger');
        return;
      }

      // Give GitHub a moment before fetching status
      setTimeout(() => updateWorkflowStatus(name), 1500);
    } catch (err) {
      console.error(`Run workflow ${name} error:`, err);
      showError('Network error while dispatching workflow.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function updateWorkflowStatus(name) {
    try {
      const adminKey = getStoredAdminKey();
      if (!adminKey) {
        setStatusBadge(name, 'Idle', 'bg-secondary');
        setGithubLink(name, null);
        return;
      }

      const res = await fetch(`/api/admin/workflows/${encodeURIComponent(name)}/status`, {
        method: 'GET',
        headers: {
          'X-Admin-Key': adminKey
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = (data && data.error) ? data.error : `Failed to fetch status (${res.status})`;
        showError(msg);
        return;
      }

      // Map GitHub status/conclusion to UI label/class
      const status = (data.status || '').toLowerCase();
      const conclusion = (data.conclusion || '').toLowerCase();
      let label = 'Idle';
      let variant = 'bg-secondary';

      if (status === 'queued' || status === 'in_progress') {
        label = status === 'queued' ? 'Queued' : 'In Progress';
        variant = 'bg-warning text-dark';
      } else if (status === 'completed') {
        if (conclusion === 'success') {
          label = 'Success';
          variant = 'bg-success';
        } else if (conclusion) {
          label = `Failed: ${conclusion}`;
          variant = 'bg-danger';
        } else {
          label = 'Completed';
          variant = 'bg-primary';
        }
      }

      setStatusBadge(name, label, variant);
      setGithubLink(name, data.html_url || null);
      setLastUpdated(name);
    } catch (err) {
      console.error(`Status update ${name} error:`, err);
      showError('Network error while fetching status.');
    }
  }

  async function updateAllWorkflowStatuses() {
    for (const name of WORKFLOWS) {
      await updateWorkflowStatus(name);
    }
  }

  // --- Event wiring ---
  function wireEvents() {
    const saveBtn = qs('saveKeyAndFetchCsrfBtn');
    const clearBtn = qs('clearKeyBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const input = qs('adminKeyInput');
        const key = (input && input.value) ? input.value.trim() : '';
        if (!key) {
          showError('Please enter your Admin Key.');
          return;
        }
        setStoredAdminKey(key);
        await fetchCsrf();
        // Refresh statuses immediately
        updateAllWorkflowStatuses();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearStoredAdminCredentials();
        const input = qs('adminKeyInput');
        if (input) input.value = '';
        setRunButtonsEnabled(false);
        updateCsrfBadge(false);
        hideError();
        WORKFLOWS.forEach(name => {
          setStatusBadge(name, 'Idle', 'bg-secondary');
          setGithubLink(name, null);
          setLastUpdated(name);
        });
      });
    }

    WORKFLOWS.forEach(name => {
      const btn = qs(`runBtn-${name}`);
      if (btn) {
        btn.addEventListener('click', () => runWorkflow(name));
      }
    });
  }

  // --- Public init ---
  function adminPanelInit() {
    try {
      // Preload admin key if stored
      const storedKey = getStoredAdminKey();
      const input = qs('adminKeyInput');
      if (input && storedKey) {
        input.value = storedKey;
      }

      // Initialize UI state
      setRunButtonsEnabled(!!storedKey);
      updateCsrfBadge(!!getStoredCsrfToken());
      hideError();

      wireEvents();

      // Attempt to fetch CSRF if we have a key but no token yet
      if (storedKey && !getStoredCsrfToken()) {
        fetchCsrf().then(() => updateAllWorkflowStatuses());
      } else {
        // Initial status refresh
        updateAllWorkflowStatuses();
      }

      // Start polling
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(updateAllWorkflowStatuses, POLL_INTERVAL_MS);
    } catch (e) {
      console.error('adminPanelInit error:', e);
      showError('Initialization error. See console for details.');
    }
  }

  // Expose init to global for inline script call
  window.adminPanelInit = adminPanelInit;
})();
