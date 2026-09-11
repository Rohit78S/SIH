/* =========================================================
   notifications.js — GSM SMS & Notification Gateway
   ========================================================= */

const NotificationService = (function () {
    const NOTIF_STORAGE_KEY = 'kc_system_notifications';
    const SMS_STORAGE_KEY = 'kc_gsm_sms_logs';

    // Seed realistic baseline events if local ledger is empty
    const defaultNotifs = [
        {
            id: 'NOTIF-INIT01',
            title: 'KCC Verification',
            message: 'Kisan Credit Card and age credentials authenticated against APMC master ledger.',
            tag: 'AUTH',
            time: '10:00 AM',
            read: true
        },
        {
            id: 'NOTIF-INIT02',
            title: 'Catchment Synchronized',
            message: 'Optimal procurement route assigned via Haversine distance matrix.',
            tag: 'SYS',
            time: '10:05 AM',
            read: true
        }
    ];

    const defaultSMS = [
        {
            id: 'SMS-INIT01',
            recipient: '+91 70XXXXXX39',
            text: 'KISAN CONNECT: Profile verified under APMC Fair Average Quality (FAQ) guidelines. Weighbridge gate booking unlocked.',
            gateway: 'NIC-DLT-APMC',
            status: 'DELIVERED',
            timestamp: '10:00:15 AM'
        }
    ];

    let notifications = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY));
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        notifications = defaultNotifs;
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
    }

    let smsLogs = JSON.parse(localStorage.getItem(SMS_STORAGE_KEY));
    if (!smsLogs || !Array.isArray(smsLogs) || smsLogs.length === 0) {
        smsLogs = defaultSMS;
        localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(smsLogs));
    }

    // Standard Privacy Masking for SMS (+91 70XXXXXX39)
    function formatMaskedMobile(rawPhone) {
        if (!rawPhone) return '+91 70XXXXXX39';
        const clean = String(rawPhone).replace(/\D/g, '');
        if (clean.length < 10) return '+91 70XXXXXX39';
        const last10 = clean.slice(-10);
        return `+91 ${last10.slice(0, 2)}XXXXXX${last10.slice(-2)}`;
    }

    function saveState() {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
        localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(smsLogs));
        updateBadgeUI();
    }

    function showToast(msg, type = "info") {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = `toast show ${type}`;
        setTimeout(() => t.classList.remove('show'), 3500);
    }

    function updateBadgeUI() {
        const unreadCount = notifications.filter(n => !n.read).length;
        const badges = document.querySelectorAll('.notif-badge-counter, #sidebar-notif-badge');
        badges.forEach(b => {
            b.textContent = unreadCount > 0 ? unreadCount : '0';
            b.classList.toggle('hidden', unreadCount === 0);
        });
    }

    function dispatch(title, message, tag = "SYS", mobile = null, smsText = null) {
        const now = new Date();
        const timestamp = Date.now();

        const newNotif = {
            id: 'NOTIF-' + timestamp.toString().slice(-6),
            title,
            message,
            tag,
            time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            read: false
        };
        notifications.unshift(newNotif);

        // Always log a DLT-compliant GSM SMS whenever a mobile number or SMS text is dispatched
        const targetMobile = mobile || (window.userState && window.userState.mobile) || '7012345639';
        const maskedRecipient = formatMaskedMobile(targetMobile);

        const newSMS = {
            id: 'SMS-' + timestamp.toString().slice(-6),
            recipient: maskedRecipient,
            text: smsText || `KISAN CONNECT: [${tag}] ${title} - ${message}`,
            gateway: 'NIC-DLT-APMC',
            status: 'DELIVERED',
            timestamp: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        smsLogs.unshift(newSMS);

        if (notifications.length > 40) notifications.pop();
        if (smsLogs.length > 25) smsLogs.pop();

        saveState();
        renderLogView();
        showToast(`${title}: ${message}`);
    }

    function renderLogView() {
        // Look for both the main container ID and fallback ID
        const notifContainer = document.getElementById('notifications-feed-list') || document.getElementById('notifications-log-list');
        const smsContainer = document.getElementById('sms-gateway-logs-list');

        if (notifContainer) {
            if (notifications.length === 0) {
                notifContainer.innerHTML = `<div style="padding:16px; color:var(--ink-soft); text-align:center;">No alerts logged.</div>`;
            } else {
                notifContainer.innerHTML = notifications.map(n => `
                    <div class="ledger-row ${n.read ? '' : 'you'}" style="padding:10px 8px; border-bottom:1px solid var(--line);">
                        <div class="ledger-row-left" style="display:flex; align-items:flex-start; gap:8px;">
                            <span class="dot ${n.read ? 'wait' : 'active'}" style="margin-top:4px;"></span>
                            <div>
                                <strong style="font-size:0.86rem; color:var(--ink);">${n.title}</strong>
                                <div style="font-size:0.76rem; color:var(--ink-soft); margin-top:2px;">${n.message}</div>
                            </div>
                        </div>
                        <div style="text-align:right; min-width:65px;">
                            <span class="tag ${n.tag === 'PAYMENT' ? 'done' : (n.tag === 'SCALE' ? 'active' : 'wait')}" style="font-size:0.68rem;">${n.tag}</span>
                            <div style="font-size:0.68rem; color:var(--ink-faint); margin-top:3px;">${n.time}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (smsContainer) {
            if (smsLogs.length === 0) {
                smsContainer.innerHTML = `<div style="padding:16px; color:var(--ink-soft); text-align:center;">No GSM SMS dispatches recorded.</div>`;
            } else {
                smsContainer.innerHTML = smsLogs.map(s => `
                    <div class="ticket" style="margin-bottom:10px; padding:10px 14px; background:var(--paper-raised); border:1px solid var(--line); border-radius:4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                            <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--crop-ink);">
                                Recipient: ${s.recipient}
                            </span>
                            <span class="tag done" style="font-size:0.65rem;">${s.status} &middot; ${s.gateway}</span>
                        </div>
                        <div style="font-size:0.78rem; line-height:1.4; color:var(--ink); font-family:sans-serif;">${s.text}</div>
                        <div style="font-size:0.68rem; color:var(--ink-faint); text-align:right; margin-top:4px; font-family:var(--font-mono);">${s.timestamp}</div>
                    </div>
                `).join('');
            }
        }
    }

    function markAllAsRead() {
        notifications.forEach(n => n.read = true);
        saveState();
        renderLogView();
    }

    function clearAll() {
        notifications = [];
        smsLogs = [];
        saveState();
        renderLogView();
        showToast("Notification and SMS audit trail cleared.");
    }

    // Auto-render on initial script load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderLogView();
            updateBadgeUI();
        });
    } else {
        renderLogView();
        updateBadgeUI();
    }

    return {
        dispatch,
        showToast,
        renderLogView,
        markAllAsRead,
        clearAll,
        updateBadgeUI,
        formatMaskedMobile
    };
})();
