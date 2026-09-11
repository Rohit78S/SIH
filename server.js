/* =========================================================
   server.js — Complete Unified Controller (Sanitized)
   Features:
   - Full Persistence via Firebase Firestore & LocalStorage
   - Mandatory APMC T&C Checkbox Gate
   - Age Verification (Strictly 18+) & Max Date Attribute Lock
   - Land Holding Ceiling Gate (0.1 to 100.0 Acres)
   - Privacy Data Masking (KCC & Mobile)
   - Enforced 5/5 Daily Booking Quota Limit
   - Google Identity Services (GIS) & Session Decoder
   - Dedicated Stacked Top-Right Auth UI (Sign In / Sign Out)
   - Strict 9-Digit Kisan Credit Card (KCC) Gate
   - GSM SMS Gateway Dispatcher with DLT Templates (No Emojis)
   - Multi-Bot Queue Simulation Engine
   - Deduplicated Queue Construction Engine
   - Progressive Queue Scheduling (20s -> 3m -> 5m -> 10m)
   - 13s Assay Moisture & Treasury DBT Verification Gate
   - Automated Financial Ledger Transitions (Pending -> Cleared)
   - Real-Time Notifications Log & Dynamic Unread Badge Counter
   - Interactive Transit Routes & Google Maps Embedding
   - Live Procurement Journey Stepper Readout
   ========================================================= */

// TODO: Insert your Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const SESSION_DURATION_HOURS = 24;
const DAILY_BOOKING_LIMIT = 5;

/* ================= FIREBASE FIRESTORE CONFIGURATION ================= */
// TODO: Insert your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        console.log("Firebase Firestore initialized successfully.");
    }
} catch (e) {
    console.warn("Firestore initialization skipped or offline. Operating via LocalStorage mode.", e);
}

const STORAGE_KEYS = {
    USER: 'kc_user_profile',
    BOOKINGS: 'kc_user_bookings',
    SELECTED_ZONE: 'kc_current_zone',
    MANDI_NOW_SERVING: 'kc_now_serving',
    GLOBAL_TOKEN_COUNTER: 'kc_global_token_counter',
    USER_COORDS: 'kc_user_coords'
};

const CROPS = [
    {
        key: 'paddy',
        name: 'Paddy / Rice (Dhan)',
        category: 'Kharif Staple · Grade A / Common',
        desc: 'Maximum moisture ceiling of 17%. Mandatory de-husking quality inspection at gate.',
        msp: 'INR 2,300/qtl',
        rate: 2300,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Kharif',
        specMoisture: 'Max 17.0%',
        specRefraction: 'Max 2.0% foreign matter',
        specAgencies: 'Food Corporation of India, State Civil Supplies Corporation',
        specGuideline: 'Drying and winnowing must be done prior to arrival to prevent dockage deductions.'
    },
    {
        key: 'wheat',
        name: 'Wheat (Gehun)',
        category: 'Rabi Staple · Sharbati / Standard',
        desc: 'Strictly inspected for foreign matter (<0.75%) and maximum 12% moisture ceiling.',
        msp: 'INR 2,275/qtl',
        rate: 2275,
        image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Rabi',
        specMoisture: 'Max 12.0%',
        specRefraction: 'Max 0.75% foreign matter',
        specAgencies: 'Food Corporation of India, MARKFED',
        specGuideline: 'Luster loss and damaged grains exceeding 4.0% will necessitate secondary grade classification.'
    },
    {
        key: 'mustard',
        name: 'Mustard (Sarson)',
        category: 'Rabi Oilseed · High Yield',
        desc: 'Requires minimum 38% certified oil content. Moisture limit capped strictly at 8%.',
        msp: 'INR 5,650/qtl',
        rate: 5650,
        image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Rabi',
        specMoisture: 'Max 8.0%',
        specRefraction: 'Min 38.0% certified oil yield',
        specAgencies: 'NAFED, State Co-operative Federations',
        specGuideline: 'Tested using digital refractometer. Moisture over 8% results in immediate turn-away at gate.'
    },
    {
        key: 'gram',
        name: 'Gram / Chickpea (Chana)',
        category: 'Rabi Pulse · Desi / Kabuli',
        desc: 'Procured directly for central buffer stocks. Foreign pod fraction must be below 2%.',
        msp: 'INR 5,440/qtl',
        rate: 5440,
        image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Rabi',
        specMoisture: 'Max 10.0%',
        specRefraction: 'Max 2.0% broken / weeviled seed',
        specAgencies: 'NAFED buffer scheme',
        specGuideline: 'Cleaned lots bagged in 50kg standard jute gunny bags are given priority weighbridge lane passage.'
    },
    {
        key: 'maize',
        name: 'Maize (Makka)',
        category: 'Kharif Coarse Grain',
        desc: 'Maximum grain discoloration 3%. Designated priority for grain ethanol blending supply.',
        msp: 'INR 2,090/qtl',
        rate: 2090,
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Kharif',
        specMoisture: 'Max 14.0%',
        specRefraction: 'Max 1.5% other food grains',
        specAgencies: 'FCI, Mandi Board',
        specGuideline: 'Priority channel enabled under Ethanol Blended Petrol (EBP) program procurement quota.'
    },
    {
        key: 'soybean',
        name: 'Soybean (Yellow)',
        category: 'Kharif Oilseed · Commercial',
        desc: 'High-protein processing quality. Maximum acceptable moisture threshold of 12%.',
        msp: 'INR 4,892/qtl',
        rate: 4892,
        image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
        specSeason: 'Kharif',
        specMoisture: 'Max 12.0%',
        specRefraction: 'Max 2.0% impurities, max 1.0% immature seeds',
        specAgencies: 'NAFED, State Oilseed Federations',
        specGuideline: 'Non-GMO declared varieties receive instant direct bank transfer (DBT) clearance.'
    }
];

const BOT_FARMERS = [
    { name: "Gurpreet Singh", crop: "Wheat (Gehun)" },
    { name: "Manjit Roy", crop: "Paddy / Rice (Dhan)" },
    { name: "Harishankar Pal", crop: "Mustard (Sarson)" },
    { name: "Sunil Murmu", crop: "Maize (Makka)" }
];

let userState = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {
    authType: 'guest',
    name: '',
    email: '',
    avatar: null,
    dob: '',
    mobile: '',
    kcc: '',
    zone: '',
    land: '',
    sessionExpiry: null
};

let userBookings = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || [];
let currentActiveZone = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_ZONE)) || null;
let savedCoords = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_COORDS)) || null;

let nowServing = Number(localStorage.getItem(STORAGE_KEYS.MANDI_NOW_SERVING)) || 40;
let globalTokenCounter = Number(localStorage.getItem(STORAGE_KEYS.GLOBAL_TOKEN_COUNTER)) || 42;

let activeSimulationQueue = [];
let selectedCropModalKey = null;

/* ================= CLOUD SYNC & FIRESTORE CONTROLLER ================= */
function getFarmerCloudId() {
    if (userState.email) {
        return userState.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    const cleanKCC = extractKCCDigits(userState.kcc);
    if (cleanKCC) {
        return `kcc_${cleanKCC}`;
    }
    return localStorage.getItem('kc_permanent_device_id') || createDeviceId();
}

function createDeviceId() {
    const id = 'dev_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('kc_permanent_device_id', id);
    return id;
}

function syncFarmerProfileToFirestore() {
    if (!db) return;
    const docId = getFarmerCloudId();
    db.collection("farmers").doc(docId).set({
        ...userState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
        .then(() => console.log("Profile synced to Firestore:", docId))
        .catch(err => console.warn("Firestore sync warning (Profile):", err));
}

function syncBookingToFirestore(booking) {
    if (!db) return;
    const docId = getFarmerCloudId();
    db.collection("farmers").doc(docId).collection("bookings").doc(booking.id).set({
        ...booking,
        farmerName: userState.name,
        kcc: userState.kcc,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
        .then(() => console.log(`Booking #${booking.token} synced to Firestore.`))
        .catch(err => console.warn("Firestore sync warning (Booking):", err));
}

function fetchCloudFarmerData() {
    if (!db) return;
    const docId = getFarmerCloudId();
    db.collection("farmers").doc(docId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            userState = { ...userState, ...data };
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userState));
            updateUserUI();
        }
    }).catch(err => console.warn("Firestore fetch profile warning:", err));

    db.collection("farmers").doc(docId).collection("bookings").get().then(snapshot => {
        if (!snapshot.empty) {
            const cloudBookings = [];
            snapshot.forEach(d => cloudBookings.push(d.data()));
            cloudBookings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            userBookings = cloudBookings;
            localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(userBookings));
            renderAllViews();
        }
    }).catch(err => console.warn("Firestore fetch bookings warning:", err));
}

/* ================= PRIVACY DATA MASKING HELPERS ================= */
function maskKCC(kccRaw) {
    const digits = extractKCCDigits(kccRaw);
    if (!digits || digits.length !== 9) return 'Not Provided';
    return `KCC-${digits.slice(0, 2)}XXXXX${digits.slice(-2)}`;
}

function maskMobile(mobileRaw) {
    if (!mobileRaw) return 'Not Provided';
    const clean = mobileRaw.replace(/\D/g, '');
    if (clean.length < 10) return mobileRaw;
    const last10 = clean.slice(-10);
    return `+91 ${last10.slice(0, 2)}XXXXXX${last10.slice(-2)}`;
}

/* ================= AGE & CEILING VALIDATION HELPERS ================= */
function calculateAge(dobString) {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

function validateLandHolding(acresVal) {
    const val = parseFloat(acresVal);
    if (isNaN(val) || val <= 0) return { valid: false, message: "Please enter a valid land holding area." };
    if (val > 100) return { valid: false, message: "Land Ceiling Exceeded: Maximum 100.0 acres permitted per KCC title." };
    return { valid: true, value: val.toFixed(1) };
}

/* ================= UTILITY & NOTIFICATION DISPATCHER ================= */
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function toast(msg, type = "info") {
    if (typeof NotificationService !== 'undefined' && NotificationService.showToast) {
        NotificationService.showToast(msg, type);
    } else {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = `toast show ${type}`;
        setTimeout(() => t.classList.remove('show'), 3500);
    }
}

function triggerNotification(title, message, tag = "SYS", mobile = null, smsText = null) {
    if (typeof NotificationService !== 'undefined' && NotificationService.dispatch) {
        NotificationService.dispatch(title, message, tag, mobile, smsText);
    } else {
        toast(`${title}: ${message}`);
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

/* ================= DAILY 5/5 QUOTA CALCULATOR ================= */
function getRemainingDailyQuota() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayActiveBookings = userBookings.filter(b => {
        const bookingDate = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : b.date;
        return bookingDate === todayStr && b.status !== 'Cancelled';
    });
    return Math.max(0, DAILY_BOOKING_LIMIT - todayActiveBookings.length);
}

function updateQuotaUI() {
    const remaining = getRemainingDailyQuota();
    safeSetText('action-quota-counter', `${remaining}/${DAILY_BOOKING_LIMIT}`);
}

/* ================= GOOGLE IDENTITY SERVICES (GIS) ================= */
function parseJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT parse failed:", e);
        return null;
    }
}

function handleGoogleCredentialResponse(response) {
    const payload = parseJwtPayload(response.credential);
    if (!payload) {
        toast("Failed to parse Google account token.");
        return;
    }

    userState.authType = 'google';
    userState.name = payload.name || "Google Farmer";
    userState.email = payload.email;
    userState.avatar = payload.picture;
    userState.sessionExpiry = Date.now() + (SESSION_DURATION_HOURS * 3600 * 1000);

    saveUser();
    fetchCloudFarmerData();
    closeModal('auth-modal');
    triggerNotification("Google Sign-In", `Signed in as ${userState.name}.`, "AUTH");
}

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 400);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });
}

function triggerGoogleLogin() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                const modalGoogleBtn = document.getElementById('btn-login-google');
                if (modalGoogleBtn) {
                    google.accounts.id.renderButton(modalGoogleBtn, { theme: "outline", size: "large" });
                }
            }
        });
        return;
    }

    toast("Connecting to Google Identity Services...");
    setTimeout(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            triggerGoogleLogin();
        } else {
            toast("Google Services blocked or unavailable. Check ad blocker.", "stamp");
        }
    }, 800);
}

function logoutUser() {
    userState.authType = 'guest';
    userState.name = '';
    userState.email = '';
    userState.avatar = null;
    userState.sessionExpiry = null;
    saveUser();
    triggerNotification("Signed Out", "Switched to Guest Session.", "AUTH");
}

/* ================= VERIFICATION GUARDS ================= */
function extractKCCDigits(val) {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.length === 9 ? clean : '';
}

function isFarmerVerified() {
    const validName = userState.name && userState.name.trim().length >= 2 && userState.name !== 'Guest';
    const validKCC = extractKCCDigits(userState.kcc).length === 9;
    return Boolean(validName && validKCC);
}

function guardBookingAccess() {
    if (!isFarmerVerified()) {
        toast("Access Denied: Provide your full name and 9-digit KCC in Profile to unlock booking.");
        openModal('profile-modal');
        return false;
    }

    if (getRemainingDailyQuota() <= 0) {
        toast("Daily Quota Exhausted: 5/5 slots booked for today. Limit resets tomorrow.", "stamp");
        return false;
    }

    return true;
}

function saveUser() {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userState));
    syncFarmerProfileToFirestore();
    updateUserUI();
}

function saveBookings() {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(userBookings));
    localStorage.setItem(STORAGE_KEYS.MANDI_NOW_SERVING, nowServing.toString());
    localStorage.setItem(STORAGE_KEYS.GLOBAL_TOKEN_COUNTER, globalTokenCounter.toString());
    renderAllViews();
}

/* ================= UI RENDERING & WORKFLOW ================= */
function updateUserUI() {
    const isGoogle = userState.authType === 'google';
    const verified = isFarmerVerified();

    let displayName = "Guest";
    let roleText = "Guest Session";

    if (isGoogle) {
        displayName = userState.name ? userState.name.trim() : "Farmer";
        roleText = verified ? "VERIFIED KCC PRODUCER" : "KCC PENDING";
    } else if (userState.name && userState.name.trim()) {
        displayName = userState.name.trim();
        roleText = verified ? "VERIFIED KCC PRODUCER" : "UNVERIFIED (RESTRICTED)";
    }

    safeSetText('nav-name', displayName);
    safeSetText('greeting-title', `Good day, ${displayName}`);
    safeSetText('nav-role', roleText);

    const initial = displayName.charAt(0).toUpperCase();
    const navAvatar = document.getElementById('nav-avatar');
    const profileSeal = document.getElementById('profile-seal');

    if (isGoogle && userState.avatar) {
        if (navAvatar) {
            navAvatar.style.backgroundImage = `url(${userState.avatar})`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.textContent = '';
        }
        if (profileSeal) {
            profileSeal.style.backgroundImage = `url(${userState.avatar})`;
            profileSeal.style.backgroundSize = 'cover';
            profileSeal.textContent = '';
        }
    } else {
        if (navAvatar) {
            navAvatar.style.backgroundImage = 'none';
            navAvatar.textContent = initial;
        }
        if (profileSeal) {
            profileSeal.style.backgroundImage = 'none';
            profileSeal.textContent = initial;
        }
    }

    const authBtn = document.getElementById('btn-google-auth-trigger');
    if (authBtn) {
        if (isGoogle) {
            authBtn.textContent = 'Sign Out';
            authBtn.className = 'btn btn-ghost btn-sm';
            authBtn.style.color = 'var(--stamp-ink)';
            authBtn.style.padding = '2px 6px';
            authBtn.onclick = logoutUser;
        } else {
            authBtn.textContent = 'Sign In with Google';
            authBtn.className = 'btn btn-primary btn-sm';
            authBtn.style.color = 'var(--white)';
            authBtn.style.padding = '3px 10px';
            authBtn.onclick = triggerGoogleLogin;
        }
    }

    safeSetText('prof-auth-type', isGoogle ? 'Google OAuth 2.0 (Cloud Synced)' : 'Standard Session (Local)');
    safeSetText('prof-name', displayName);
    safeSetText('prof-dob', userState.dob || 'Not Provided');
    safeSetText('prof-mobile', maskMobile(userState.mobile));
    safeSetText('prof-kcc', maskKCC(userState.kcc));
    safeSetText('prof-zone', userState.zone || 'Not Provided');
    safeSetText('prof-land', userState.land || 'Not Provided');

    const stampBadge = document.getElementById('verification-stamp-badge');
    if (stampBadge) {
        if (verified) {
            stampBadge.className = 'tag done';
            stampBadge.textContent = 'KCC 9-Digit Verified';
        } else {
            stampBadge.className = 'tag stamp';
            stampBadge.textContent = 'Not Verified (Locked)';
        }
    }

    const noTicketHint = document.getElementById('no-ticket-hint');
    if (noTicketHint) {
        noTicketHint.textContent = verified
            ? "No active gate tokens found. Reserve a slot below."
            : "Procurement booking is locked. Please update your 9-digit Kisan Credit Card (KCC) to verify.";
    }

    const activeCenterName = currentActiveZone ? currentActiveZone.name : 'Default (Select / Detect Center)';
    safeSetText('summary-center', activeCenterName);
    safeSetText('full-queue-center-label', currentActiveZone ? `${currentActiveZone.name} · Weighbridge Scale 01` : 'Default Mandi · Weighbridge Scale 01');
}

function renderCropDirectory() {
    const grid = document.getElementById('crops-grid');
    if (!grid) return;

    grid.innerHTML = CROPS.map(c => `
        <div class="crop-card">
            <div class="crop-img-box">
                <img src="${c.image}" alt="${c.name}" loading="lazy">
            </div>
            <div class="crop-card-body">
                <h3 class="crop-card-title">${c.name}</h3>
                <div class="crop-card-type">${c.category}</div>
                <p class="crop-card-meta">${c.desc}</p>
                <div class="crop-card-footer">
                    <div>
                        <div class="crop-msp-label">Standard MSP</div>
                        <div class="crop-msp-val">${c.msp}</div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" data-crop-detail="${c.key}">Read Details</button>
                </div>
            </div>
        </div>
    `).join('');

    const select = document.getElementById('f-grain');
    if (select) {
        select.innerHTML = CROPS.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

function renderCenterDropdown() {
    const centerSelect = document.getElementById('f-center');
    if (!centerSelect) return;

    let optionsHtml = '';
    if (typeof City !== 'undefined' && City.ZONES) {
        optionsHtml = City.ZONES.map(z => `<option value="${z.name}">${z.name} (${z.region})</option>`).join('');
    } else {
        optionsHtml = `
            <option value="Salt Lake Agri-Hub">Salt Lake Agri-Hub (Kolkata)</option>
            <option value="Tarakeswar Farmers Depot">Tarakeswar Farmers Depot (Hooghly)</option>
        `;
    }

    centerSelect.innerHTML = optionsHtml;

    if (currentActiveZone) {
        centerSelect.value = currentActiveZone.name;
    }
}

function renderTransitRoutes() {
    const routesList = document.getElementById('routes-center-list');
    const iframe = document.getElementById('gmaps-embed-frame');
    const indicator = document.getElementById('maps-route-indicator');
    const caption = document.getElementById('gmaps-status-caption');
    const externalLink = document.getElementById('btn-open-external-maps');

    if (!routesList || typeof City === 'undefined') return;

    const targetCenter = currentActiveZone || City.ZONES[0];

    if (savedCoords) {
        if (indicator) {
            indicator.className = 'tag done';
            indicator.textContent = 'GPS Synchronized';
        }
        if (caption) {
            caption.textContent = `Routing from your coordinates (${savedCoords.lat.toFixed(3)}, ${savedCoords.lng.toFixed(3)}) to ${targetCenter.name}.`;
        }
        if (iframe) {
            iframe.src = `https://maps.google.com/maps?saddr=${savedCoords.lat},${savedCoords.lng}&daddr=${targetCenter.lat},${targetCenter.lng}&output=embed`;
        }
        if (externalLink) {
            externalLink.href = `https://www.google.com/maps/dir/?api=1&origin=${savedCoords.lat},${savedCoords.lng}&destination=${targetCenter.lat},${targetCenter.lng}&travelmode=driving`;
        }
    } else {
        if (indicator) {
            indicator.className = 'tag amber';
            indicator.textContent = 'Default Hub View';
        }
        if (caption) {
            caption.textContent = `Showing default location: ${targetCenter.name}. Click "Detect Location" to see your road distance and turn-by-turn route.`;
        }
        if (iframe) {
            iframe.src = `https://maps.google.com/maps?q=${targetCenter.lat},${targetCenter.lng}&z=13&output=embed`;
        }
        if (externalLink) {
            externalLink.href = `https://www.google.com/maps/search/?api=1&query=${targetCenter.lat},${targetCenter.lng}`;
        }
    }

    const zonesToDisplay = City.ZONES.map(zone => {
        let dist = null;
        if (savedCoords) {
            dist = City.haversineKm(savedCoords.lat, savedCoords.lng, zone.lat, zone.lng);
        }
        return { ...zone, distanceKm: dist };
    });

    if (savedCoords) {
        zonesToDisplay.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    routesList.innerHTML = zonesToDisplay.map(z => {
        const isCurrent = currentActiveZone && currentActiveZone.id === z.id;
        const distText = z.distanceKm !== null ? `${z.distanceKm} km away` : 'Detect GPS to compute';

        return `
            <div class="ledger-row ${isCurrent ? 'you' : ''}" style="padding:12px 6px;">
                <div class="ledger-row-left">
                    <span class="dot ${isCurrent ? 'active' : 'wait'}"></span>
                    <div>
                        <strong>${z.name}</strong>
                        <div style="font-size:0.75rem; color:var(--ink-soft);">${z.region} &middot; Radius: ${z.radiusKm} km</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="tag ${isCurrent ? 'active' : 'wait'}">${distText}</span>
                    <button type="button" class="btn btn-secondary btn-sm" data-switch-map="${z.id}">Select & Route</button>
                </div>
            </div>
        `;
    }).join('');
}

/* ================= LIVE TIMELINE STEPPER BUILDER ================= */
function buildTrackerTimelineHTML(booking) {
    const createdDate = new Date(booking.createdAt || Date.now());
    const formatTime = (dateObj) => dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const isCompleted = booking.status === 'Completed';
    const isUnderAssay = booking.status === 'Under Verification';
    const isOnScale = booking.status === 'On Weighbridge';

    const tBooked = formatTime(createdDate);
    const tGate = formatTime(new Date(createdDate.getTime() + 6000));
    const tScale = (isOnScale || isUnderAssay || isCompleted) ? formatTime(new Date(createdDate.getTime() + 15000)) : 'Pending Arrival';
    const tAssay = (isUnderAssay || isCompleted) ? formatTime(new Date(createdDate.getTime() + 22000)) : 'In Queue';
    const tDBT = isCompleted ? formatTime(new Date(createdDate.getTime() + 35000)) : 'Awaiting Assay Approval';

    const getNodeState = (stepIndex) => {
        if (isCompleted) return 'completed';
        if (isUnderAssay) {
            if (stepIndex <= 3) return 'completed';
            if (stepIndex === 4) return 'active';
            return 'pending';
        }
        if (isOnScale) {
            if (stepIndex <= 2) return 'completed';
            if (stepIndex === 3) return 'active';
            return 'pending';
        }
        if (stepIndex === 1) return 'completed';
        if (stepIndex === 2) return 'active';
        return 'pending';
    };

    return `
        <div class="stepper-container">
            <div class="stepper-title">
                <span>Live Procurement Journey</span>
                <span style="font-size:0.7rem; color:var(--crop-ink); font-weight:600;">GATE PASS #${booking.token}</span>
            </div>
            <ul class="timeline-stepper">
                <li class="step-node ${getNodeState(1)}">
                    <div class="step-header">
                        <span>Slot Reserved & Token Generated</span>
                        <span class="step-time">${tBooked}</span>
                    </div>
                    <div class="step-desc">APMC Catchment zone authenticated via KCC record.</div>
                </li>
                <li class="step-node ${getNodeState(2)}">
                    <div class="step-header">
                        <span>Arrival & Gate 01 Check-In</span>
                        <span class="step-time">${tGate}</span>
                    </div>
                    <div class="step-desc">${booking.center} &middot; Automatic camera entry pass valid.</div>
                </li>
                <li class="step-node ${getNodeState(3)}">
                    <div class="step-header">
                        <span>Weighbridge Gross Tare Measurement</span>
                        <span class="step-time">${tScale}</span>
                    </div>
                    <div class="step-desc">Gross truck scale log & electronic tare weight verification.</div>
                </li>
                <li class="step-node ${getNodeState(4)}">
                    <div class="step-header">
                        <span>Moisture & Dockage Quality Assay</span>
                        <span class="step-time">${tAssay}</span>
                    </div>
                    <div class="step-desc">Fair Average Quality (FAQ) digital moisture meter testing.</div>
                </li>
                <li class="step-node ${getNodeState(5)}">
                    <div class="step-header">
                        <span>DBT Treasury Settlement Dispatched</span>
                        <span class="step-time">${tDBT}</span>
                    </div>
                    <div class="step-desc">Direct funds credit to verified KCC bank account.</div>
                </li>
            </ul>
        </div>
    `;
}

function renderTickets() {
    const container = document.getElementById('tickets-container');
    const emptyNotice = document.getElementById('no-ticket-card');
    if (!container || !emptyNotice) return;

    const active = userBookings.filter(b => b.status === 'Active' || b.status === 'On Weighbridge' || b.status === 'Under Verification');

    if (active.length === 0) {
        container.innerHTML = '';
        emptyNotice.classList.remove('hidden');
        safeSetText('your-tokens-counter', 'None');
        safeSetText('summary-active-count', '0');
        safeSetText('summary-volume', '0 qtl');
        safeSetText('queue-countdown-timer', '--:--');
        return;
    }

    emptyNotice.classList.add('hidden');
    safeSetText('summary-active-count', active.length);
    safeSetText('your-tokens-counter', active.map(b => `#${b.token}`).join(', '));

    const totalQty = active.reduce((sum, b) => sum + Number(b.qty), 0);
    safeSetText('summary-volume', `${totalQty} qtl`);

    container.innerHTML = active.map(b => {
        let statusLabel = "Waiting in Queue";
        let badgeColor = "tag wait";

        if (b.status === 'On Weighbridge') {
            statusLabel = "On Scale Weighbridge";
            badgeColor = "tag active";
        } else if (b.status === 'Under Verification') {
            statusLabel = "Under Assay Verification ⟳";
            badgeColor = "tag spinning";
        }

        const canCancel = b.status === 'Active';

        return `
            <div class="ticket">
                <div class="ticket-main">
                    <div class="ticket-eyebrow">Digital Mandi Gate Pass &middot; <span class="${badgeColor}">${statusLabel}</span></div>
                    <div class="ticket-title">${b.date} &middot; ${b.time}</div>
                    <div class="ticket-grid">
                        <div>
                            <div class="ticket-field-label">Grain</div>
                            <div class="ticket-field-value">${b.grain}</div>
                        </div>
                        <div>
                            <div class="ticket-field-label">Quantity</div>
                            <div class="ticket-field-value">${b.qty} quintals</div>
                        </div>
                        <div>
                            <div class="ticket-field-label">Center</div>
                            <div class="ticket-field-value">${b.center}</div>
                        </div>
                    </div>

                    ${buildTrackerTimelineHTML(b)}

                    <div style="display:flex; gap:8px; margin-top:14px;">
                        <button type="button" class="btn btn-secondary btn-sm" data-print-token="${b.id}">Print Gate Pass</button>
                        ${b.status === 'Under Verification' ? `<button type="button" class="btn btn-secondary btn-sm" data-view-verif="${b.token}">View Assay Status</button>` : ''}
                        ${canCancel ? `<button type="button" class="btn btn-danger btn-sm" data-cancel-token="${b.id}">Cancel Slot</button>` : ''}
                    </div>
                </div>
                <div class="ticket-stamp">
                    <span class="ticket-token-label">Gate Token</span>
                    <span class="ticket-token">${b.token}</span>
                    <span class="ticket-verified">${b.status === 'Under Verification' ? 'Assay Check' : (b.status === 'On Weighbridge' ? 'Serving Now' : 'Verified KCC')}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderBookingsTable() {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    if (userBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:16px; text-align:center; color:var(--ink-soft);">No bookings found in ledger.</td></tr>`;
        return;
    }

    tbody.innerHTML = userBookings.map(b => {
        let tagClass = 'wait';
        if (b.status === 'Active') tagClass = 'wait';
        if (b.status === 'On Weighbridge') tagClass = 'active';
        if (b.status === 'Under Verification') tagClass = 'spinning';
        if (b.status === 'Completed') tagClass = 'done';
        if (b.status === 'Cancelled') tagClass = 'stamp';

        return `
            <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 4px; font-family:var(--font-mono); font-weight:600;">#${b.token}</td>
                <td style="padding:10px 4px;">${b.date} (${b.time})</td>
                <td style="padding:10px 4px;">${b.grain}</td>
                <td style="padding:10px 4px;">${b.qty} qtl</td>
                <td style="padding:10px 4px;"><span class="tag ${tagClass}">${b.status}</span></td>
                <td style="padding:10px 4px; text-align:right;">
                    ${b.status === 'Active' ? `<button type="button" class="btn btn-ghost btn-sm" style="color:var(--stamp-ink)" data-cancel-token="${b.id}">Cancel</button>` : '—'}
                </td>
            </tr>
        `;
    }).join('');
}

function calculateFinancialTotals() {
    let cleared = 0;
    let pending = 0;

    userBookings.forEach(b => {
        if (b.status === 'Cancelled') return;
        const crop = CROPS.find(c => c.name === b.grain);
        const rate = crop ? crop.rate : 2200;
        const total = Number(b.qty) * rate;

        if (b.status === 'Completed') {
            cleared += total;
        } else if (b.status === 'Active' || b.status === 'On Weighbridge' || b.status === 'Under Verification') {
            pending += total;
        }
    });

    return { cleared, pending };
}

function renderPaymentsTable() {
    const tbody = document.getElementById('payments-table-body');
    const totals = calculateFinancialTotals();

    safeSetText('payout-cleared-sum', `INR ${totals.cleared.toLocaleString('en-IN')}`);
    safeSetText('payout-pending-sum', `INR ${totals.pending.toLocaleString('en-IN')}`);

    if (!tbody) return;

    if (userBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:16px; text-align:center; color:var(--ink-soft);">No recorded transactions.</td></tr>`;
        return;
    }

    tbody.innerHTML = userBookings.map(b => {
        const cropObj = CROPS.find(c => c.name === b.grain);
        const rate = cropObj ? cropObj.rate : 2200;
        const total = (Number(b.qty) * rate).toLocaleString('en-IN');

        let statusTag = 'amber';
        let statusText = 'Pending Settlement';

        if (b.status === 'Completed') {
            statusTag = 'done';
            statusText = 'Settlement Cleared';
        } else if (b.status === 'Under Verification') {
            statusTag = 'spinning';
            statusText = 'Assay & DBT in Progress';
        } else if (b.status === 'Cancelled') {
            statusTag = 'stamp';
            statusText = 'Cancelled';
        }

        return `
            <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 4px; font-family:var(--font-mono);">#${b.token}</td>
                <td style="padding:10px 4px;">${b.grain} (${b.qty} qtl)</td>
                <td style="padding:10px 4px; font-family:var(--font-mono); font-weight:600;">INR ${total}</td>
                <td style="padding:10px 4px;">
                    <span class="tag ${statusTag}">${statusText}</span>
                </td>
            </tr>
        `;
    }).join('');
}

/* ================= DEDUPLICATED QUEUE ENGINE ================= */
function rebuildQueueStructure() {
    const queueMap = new Map();

    if (nowServing > 1) {
        queueMap.set(nowServing - 1, {
            token: nowServing - 1,
            label: "Previous Load (Cleared)",
            isYou: false,
            status: 'done'
        });
    }

    queueMap.set(nowServing, {
        token: nowServing,
        label: "Weighbridge Active Truck",
        isYou: false,
        status: 'active'
    });

    activeSimulationQueue.forEach(item => {
        if (item.token >= nowServing) {
            if (item.token === nowServing) {
                queueMap.set(item.token, {
                    token: item.token,
                    label: `${item.label} (Weighbridge Scale 01)`,
                    isYou: false,
                    status: 'active'
                });
            } else if (!queueMap.has(item.token)) {
                queueMap.set(item.token, item);
            }
        }
    });

    userBookings.forEach(b => {
        if (b.status === 'Active' || b.status === 'On Weighbridge' || b.status === 'Under Verification') {
            let status = 'wait';
            if (b.status === 'On Weighbridge') status = 'active';
            if (b.status === 'Under Verification') status = 'amber';

            queueMap.set(b.token, {
                token: b.token,
                label: `${userState.name || 'Your Slot'} (Token #${b.token})`,
                isYou: true,
                status: status
            });
        }
    });

    const queue = Array.from(queueMap.values());
    queue.sort((a, b) => a.token - b.token);
    return queue;
}

function renderQueueViews() {
    const miniList = document.getElementById('mini-queue-list');
    const fullList = document.getElementById('full-queue-list');
    if (!miniList && !fullList) return;

    safeSetText('now-serving', nowServing);

    const queueItems = rebuildQueueStructure();

    const rows = queueItems.map(item => `
        <div class="ledger-row ${item.isYou ? 'you' : ''}">
            <div class="ledger-row-left">
                <span class="dot ${item.status}"></span>
                <span>Token #${item.token} &middot; ${item.label}</span>
            </div>
            <span class="tag ${item.status}">${item.status.toUpperCase()}</span>
        </div>
    `).join('');

    if (miniList) miniList.innerHTML = rows;
    if (fullList) fullList.innerHTML = rows;
}

function renderAllViews() {
    renderTickets();
    renderBookingsTable();
    renderPaymentsTable();
    renderQueueViews();
    renderTransitRoutes();
    updateQuotaUI();
}

function cancelTokenBooking(id) {
    const item = userBookings.find(b => b.id === id);
    if (item) {
        item.status = 'Cancelled';
        saveBookings();
        syncBookingToFirestore(item);
        triggerNotification("Slot Cancelled", `Token #${item.token} reservation was revoked. Daily quota restored.`, "SYS");
    }
}

function openCropDetailModal(cropKey) {
    const crop = CROPS.find(c => c.key === cropKey);
    if (!crop) return;

    selectedCropModalKey = crop.name;
    safeSetText('crop-modal-title', crop.name);

    const fields = document.getElementById('crop-modal-fields');
    if (fields) {
        fields.innerHTML = `
            <div class="ledger-row"><span>Season Cycle</span><span class="ticket-field-value">${crop.specSeason}</span></div>
            <div class="ledger-row"><span>Floor Price (MSP)</span><span class="ticket-field-value" style="color:var(--wheat-ink);font-weight:600;">${crop.msp}</span></div>
            <div class="ledger-row"><span>Permissible Moisture</span><span class="ticket-field-value">${crop.specMoisture}</span></div>
            <div class="ledger-row"><span>Refraction Standard</span><span class="ticket-field-value">${crop.specRefraction}</span></div>
            <div class="ledger-row"><span>Authorized Agencies</span><span class="ticket-field-value">${crop.specAgencies}</span></div>
        `;
    }

    safeSetText('crop-modal-faq', crop.specGuideline);
    openModal('crop-detail-modal');
}

/* ================= TIMED QUEUE ENGINE ================= */
function updateQueueCountdownTimer() {
    const timerDisplay = document.getElementById('queue-countdown-timer');
    if (!timerDisplay) return;

    const activeList = userBookings.filter(b => b.status === 'Active' || b.status === 'On Weighbridge' || b.status === 'Under Verification');
    activeList.sort((a, b) => a.targetServiceTime - b.targetServiceTime);
    const currentTarget = activeList[0];

    if (!currentTarget || !currentTarget.targetServiceTime) {
        timerDisplay.textContent = "--:--";
        return;
    }

    if (currentTarget.status === 'Under Verification') {
        timerDisplay.textContent = "VERIF";
        return;
    }

    const now = Date.now();
    const remainingMs = Math.max(0, currentTarget.targetServiceTime - now);

    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function runVerificationAssay(booking) {
    booking.status = 'Under Verification';
    saveBookings();
    syncBookingToFirestore(booking);

    safeSetText('verif-token-id', `#${booking.token}`);
    openModal('verification-modal');
    triggerNotification("Assay Inspection", `Token #${booking.token} moved to moisture & refraction assay verification.`, "SCALE");

    const step1 = document.getElementById('verif-step-1');
    const step2 = document.getElementById('verif-step-2');
    const step3 = document.getElementById('verif-step-3');

    if (step1) { step1.className = 'tag amber'; step1.textContent = 'Analyzing Moisture...'; }
    if (step2) { step2.className = 'tag wait'; step2.textContent = 'Queued'; }
    if (step3) { step3.className = 'tag wait'; step3.textContent = 'Pending'; }

    setTimeout(() => {
        if (step1) { step1.className = 'tag done'; step1.textContent = 'Passed (10.8%)'; }
        if (step2) { step2.className = 'tag amber'; step2.textContent = 'Checking Refraction...'; }
    }, 4000);

    setTimeout(() => {
        if (step2) { step2.className = 'tag done'; step2.textContent = 'Certified Grade A'; }
        if (step3) { step3.className = 'tag amber'; step3.textContent = 'TRANSMITTING TREASURY DBT...'; }
    }, 8000);

    setTimeout(() => {
        if (step3) { step3.className = 'tag done'; step3.textContent = 'DBT Cleared'; }

        booking.status = 'Completed';
        const crop = CROPS.find(c => c.name === booking.grain);
        const rate = crop ? crop.rate : 2200;
        const payout = Number(booking.qty) * rate;

        const userPhone = userState.mobile || "9876543210";
        const smsPaymentText = `KISAN CONNECT: Quality Assay passed for Token #${booking.token} (${booking.grain}). Payout of INR ${payout.toLocaleString('en-IN')} deposited to your registered bank account via Treasury DBT. Funds will reflect under 'Earnings Cleared This Season'.`;

        triggerNotification(
            "Settlement Cleared",
            `Token #${booking.token} assay passed. INR ${payout.toLocaleString('en-IN')} cleared. Funds will reflect under 'Earnings Cleared This Season'.`,
            "PAYMENT",
            userPhone,
            smsPaymentText
        );

        nowServing += 1;
        saveBookings();
        syncBookingToFirestore(booking);

        setTimeout(() => {
            closeModal('verification-modal');
        }, 1500);
    }, 13000);
}

function startAutomatedWeighbridgeEngine() {
    setInterval(updateQueueCountdownTimer, 1000);

    setInterval(() => {
        const now = Date.now();
        let stateModified = false;

        userBookings.forEach(b => {
            if (b.status === 'Active' && b.targetServiceTime && now >= b.targetServiceTime) {
                b.status = 'On Weighbridge';
                nowServing = b.token;

                const userPhone = userState.mobile || "9876543210";
                const smsGateCallText = `URGENT - KISAN CONNECT: Token #${b.token} called to Weighbridge Scale 01 at ${b.center}. Please drive your loaded vehicle onto the tare scale now.`;

                triggerNotification(
                    "Weighbridge Call",
                    `Token #${b.token} is now called to Scale 01 for tare measurement.`,
                    "SCALE",
                    userPhone,
                    smsGateCallText
                );
                syncBookingToFirestore(b);
                stateModified = true;

                setTimeout(() => {
                    runVerificationAssay(b);
                }, 7000);
            }
        });

        if (stateModified) {
            saveBookings();
        }
    }, 2000);
}

/* ================= EVENT ATTACHMENT & BOOTSTRAP ================= */
document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
    fetchCloudFarmerData();
    renderCropDirectory();
    renderCenterDropdown();
    updateUserUI();
    renderAllViews();
    startAutomatedWeighbridgeEngine();

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('menu-btn');
    const sidebarClose = document.getElementById('sidebar-close');

    const openMenu = () => {
        sidebar?.classList.add('open');
        overlay?.classList.add('open');
    };
    const closeMenu = () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('open');
    };

    if (menuBtn) menuBtn.onclick = openMenu;
    if (sidebarClose) sidebarClose.onclick = closeMenu;
    if (overlay) overlay.onclick = closeMenu;

    const tabs = document.querySelectorAll('.sidebar-tab[data-view]');
    const views = document.querySelectorAll('.view');

    tabs.forEach(tab => {
        tab.onclick = () => {
            const target = tab.dataset.view;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            views.forEach(v => {
                if (v.id === target) {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });

            if (target === 'routes') {
                renderTransitRoutes();
            } else if (target === 'notifications' && typeof NotificationService !== 'undefined') {
                NotificationService.markAllAsRead();
                NotificationService.renderLogView();
            }

            closeMenu();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.onclick = () => closeModal(btn.dataset.close);
    });

    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };

    const triggerBookingFlow = () => {
        if (guardBookingAccess()) {
            openModal('book-modal');
        }
    };

    bindClick('btn-book-slot', triggerBookingFlow);
    bindClick('btn-book-first', triggerBookingFlow);
    bindClick('btn-book-another', triggerBookingFlow);
    bindClick('identity-btn', () => openModal('auth-modal'));
    bindClick('btn-switch-account', () => { closeMenu(); openModal('auth-modal'); });

    bindClick('btn-edit-profile', () => {
        const eighteenYearsAgo = new Date();
        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
        const maxDateStr = eighteenYearsAgo.toISOString().split('T')[0];

        const dobInput = document.getElementById('p-dob');
        if (dobInput) {
            dobInput.setAttribute('max', maxDateStr);
            dobInput.value = userState.dob || '';
        }

        document.getElementById('p-name').value = userState.name || '';
        document.getElementById('p-kcc').value = userState.kcc || '';
        document.getElementById('p-mobile').value = userState.mobile || '';
        document.getElementById('p-zone').value = userState.zone || '';
        document.getElementById('p-land').value = userState.land ? parseFloat(userState.land) : '';

        const termsCheckbox = document.getElementById('p-terms');
        const submitBtn = document.getElementById('btn-save-profile');
        if (termsCheckbox && submitBtn) {
            termsCheckbox.checked = false;
            submitBtn.disabled = true;
        }

        openModal('profile-modal');
    });

    const termsCheckbox = document.getElementById('p-terms');
    const saveProfileBtn = document.getElementById('btn-save-profile');
    if (termsCheckbox && saveProfileBtn) {
        termsCheckbox.onchange = (e) => {
            saveProfileBtn.disabled = !e.target.checked;
        };
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.onsubmit = (e) => {
            e.preventDefault();

            const termsAccepted = document.getElementById('p-terms')?.checked;
            if (!termsAccepted) {
                toast("Please accept the APMC Terms & Conditions to verify your record.", "stamp");
                return;
            }

            const nameInput = document.getElementById('p-name')?.value.trim();
            const kccRaw = document.getElementById('p-kcc')?.value.trim();
            const kccDigits = extractKCCDigits(kccRaw);
            const dobInput = document.getElementById('p-dob')?.value;
            const landInput = document.getElementById('p-land')?.value;

            if (!nameInput) {
                toast("Please provide your full legal name.");
                return;
            }

            if (kccDigits.length !== 9) {
                toast("Verification Error: Kisan Credit Card (KCC) must be exactly 9 digits.");
                return;
            }

            const age = calculateAge(dobInput);
            if (!dobInput || age < 18) {
                toast("Verification Denied: Producer must be at least 18 years old to register.", "stamp");
                return;
            }

            const landCheck = validateLandHolding(landInput);
            if (!landCheck.valid) {
                toast(landCheck.message, "stamp");
                return;
            }

            userState.name = nameInput;
            userState.kcc = kccDigits;
            userState.dob = dobInput;
            userState.mobile = document.getElementById('p-mobile')?.value || '';
            userState.zone = document.getElementById('p-zone')?.value || '';
            userState.land = `${landCheck.value} Acres`;

            saveUser();
            closeModal('profile-modal');
            triggerNotification("KCC Verification", "Kisan Credit Card & age verified. Data synced to Cloud.", "AUTH");
        };
    }

    const cropsGrid = document.getElementById('crops-grid');
    if (cropsGrid) {
        cropsGrid.onclick = (e) => {
            const btn = e.target.closest('[data-crop-detail]');
            if (btn) openCropDetailModal(btn.dataset.cropDetail);
        };
    }

    bindClick('btn-book-from-crop', () => {
        closeModal('crop-detail-modal');
        if (!guardBookingAccess()) return;

        if (selectedCropModalKey) {
            const fGrain = document.getElementById('f-grain');
            if (fGrain) fGrain.value = selectedCropModalKey;
        }
        openModal('book-modal');
    });

    const fCenterSelect = document.getElementById('f-center');
    if (fCenterSelect) {
        fCenterSelect.onchange = (e) => {
            const chosenName = e.target.value;
            const matchedZone = typeof City !== 'undefined' ? City.ZONES.find(z => z.name === chosenName) : null;
            currentActiveZone = matchedZone || { name: chosenName };
            localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(currentActiveZone));
            updateUserUI();
            renderTransitRoutes();
            toast(`Operating Center updated to: ${chosenName}`);
        };
    }

    const routesCenterList = document.getElementById('routes-center-list');
    if (routesCenterList) {
        routesCenterList.onclick = (e) => {
            const btn = e.target.closest('[data-switch-map]');
            if (!btn) return;
            const zoneId = btn.dataset.switchMap;
            const matchedZone = City.getZoneById(zoneId);
            if (matchedZone) {
                currentActiveZone = matchedZone;
                localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(currentActiveZone));
                renderCenterDropdown();
                updateUserUI();
                renderTransitRoutes();
                toast(`Map focused on: ${matchedZone.name}`);
            }
        };
    }

    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        bookForm.onsubmit = (e) => {
            e.preventDefault();

            if (!guardBookingAccess()) {
                closeModal('book-modal');
                return;
            }

            const chosenCenterName = document.getElementById('f-center').value;
            currentActiveZone = typeof City !== 'undefined'
                ? (City.ZONES.find(z => z.name === chosenCenterName) || { name: chosenCenterName })
                : { name: chosenCenterName };
            localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(currentActiveZone));

            const bot1 = BOT_FARMERS[Math.floor(Math.random() * BOT_FARMERS.length)];
            const bot2 = BOT_FARMERS[(Math.floor(Math.random() * BOT_FARMERS.length) + 1) % BOT_FARMERS.length];

            const botToken1 = ++globalTokenCounter;
            const botToken2 = ++globalTokenCounter;
            const myAssignedToken = ++globalTokenCounter;

            activeSimulationQueue.push(
                { token: botToken1, label: `${bot1.name} · ${bot1.crop}`, isYou: false, status: 'wait' },
                { token: botToken2, label: `${bot2.name} · ${bot2.crop}`, isYou: false, status: 'wait' }
            );

            const activeCount = userBookings.filter(b => b.status === 'Active' || b.status === 'On Weighbridge' || b.status === 'Under Verification').length;
            let delaySeconds = 20;

            if (activeCount === 1) {
                delaySeconds = 180;
            } else if (activeCount === 2) {
                delaySeconds = 300;
            } else if (activeCount >= 3) {
                delaySeconds = 600;
            }

            const grainEl = document.getElementById('f-grain');
            const qtyEl = document.getElementById('f-qty');
            const dateEl = document.getElementById('f-date');
            const timeEl = document.getElementById('f-time');

            const newBooking = {
                id: 'BK-' + Date.now().toString().slice(-6),
                token: myAssignedToken,
                grain: grainEl ? grainEl.value : 'Wheat (Gehun)',
                qty: qtyEl ? qtyEl.value : '25',
                center: chosenCenterName,
                date: dateEl ? dateEl.value : new Date().toISOString().split('T')[0],
                time: timeEl ? timeEl.value : '10:00–12:00 PM',
                status: 'Active',
                createdAt: Date.now(),
                targetServiceTime: Date.now() + (delaySeconds * 1000)
            };

            userBookings.unshift(newBooking);
            saveBookings();
            syncBookingToFirestore(newBooking);

            closeModal('book-modal');
            bookForm.reset();

            const remainingQuota = getRemainingDailyQuota();
            const minutesLabel = delaySeconds >= 60 ? `${Math.floor(delaySeconds / 60)} min` : `${delaySeconds} sec`;
            const userPhone = userState.mobile || "9876543210";
            const smsBookingText = `KISAN CONNECT: Pass #${newBooking.token} confirmed for ${chosenCenterName} on ${newBooking.date} (${newBooking.time}). Show this at Gate 01 entry. Quota remaining: ${remainingQuota}/5.`;

            triggerNotification(
                "Slot Reserved",
                `Gate Pass #${newBooking.token} issued for ${chosenCenterName}. Expected turn: ${minutesLabel}. (${remainingQuota}/5 slots left today)`,
                "QUEUE",
                userPhone,
                smsBookingText
            );
        };
    }

    const ticketsContainer = document.getElementById('tickets-container');
    if (ticketsContainer) {
        ticketsContainer.onclick = (e) => {
            const cancelBtn = e.target.closest('[data-cancel-token]');
            if (cancelBtn) cancelTokenBooking(cancelBtn.dataset.cancelToken);

            const printBtn = e.target.closest('[data-print-token]');
            if (printBtn) window.print();

            const verifBtn = e.target.closest('[data-view-verif]');
            if (verifBtn) {
                safeSetText('verif-token-id', `#${verifBtn.dataset.viewVerif}`);
                openModal('verification-modal');
            }
        };
    }

    const bookingsTableBody = document.getElementById('bookings-table-body');
    if (bookingsTableBody) {
        bookingsTableBody.onclick = (e) => {
            const cancelBtn = e.target.closest('[data-cancel-token]');
            if (cancelBtn) cancelTokenBooking(cancelBtn.dataset.cancelToken);
        };
    }

    bindClick('banner-deny', () => {
        document.getElementById('zone-banner')?.classList.add('hidden');
    });

    const handleLocationDetection = async () => {
        toast("Detecting your catchment area & calculating transit routes...");
        if (typeof City === 'undefined') {
            toast("City module not loaded.");
            return;
        }

        const res = await City.detectZone();
        document.getElementById('zone-banner')?.classList.add('hidden');

        if (res.coords) {
            savedCoords = res.coords;
            localStorage.setItem(STORAGE_KEYS.USER_COORDS, JSON.stringify(savedCoords));
        }

        if (res.status === 'matched') {
            currentActiveZone = res.zone;
            localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(currentActiveZone));
            renderCenterDropdown();
            updateUserUI();
            renderTransitRoutes();
            toast(`Location matched: ${res.zone.name} (${res.zone.distanceKm} km)`);
        } else if (res.status === 'overlap') {
            const choiceList = document.getElementById('zone-choice-list');
            if (choiceList) {
                choiceList.innerHTML = res.zones.map(z => `
                    <div class="ledger-row" style="cursor:pointer;" data-select-zone="${z.id}">
                        <span><strong>${z.name}</strong> (${z.distanceKm} km away)</span>
                        <span class="tag active">Select</span>
                    </div>
                `).join('');
            }
            openModal('zone-modal');
        } else {
            renderTransitRoutes();
            toast("Retaining default center. Routes updated with approximate GPS coordinates.");
        }
    };

    bindClick('banner-allow', handleLocationDetection);
    bindClick('btn-recalculate-routes', handleLocationDetection);

    const zoneChoiceList = document.getElementById('zone-choice-list');
    if (zoneChoiceList) {
        zoneChoiceList.onclick = (e) => {
            const row = e.target.closest('[data-select-zone]');
            if (!row) return;
            const zone = City.getZoneById(row.dataset.selectZone);
            if (zone) {
                currentActiveZone = zone;
                localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(currentActiveZone));
                renderCenterDropdown();
                updateUserUI();
                renderTransitRoutes();
                closeModal('zone-modal');
                toast(`Operating Center set to: ${zone.name}`);
            }
        };
    }

    bindClick('refresh-queue-btn', () => {
        renderQueueViews();
        updateQueueCountdownTimer();
        toast("Queue state refreshed.");
    });
    bindClick('btn-refresh-queue-full', () => {
        renderQueueViews();
        toast("Weighbridge ledger refreshed.");
    });

    bindClick('btn-clear-notifications', () => {
        if (typeof NotificationService !== 'undefined') {
            NotificationService.clearAll();
        }
    });

    if (typeof NotificationService !== 'undefined') {
        NotificationService.updateBadgeUI();
        NotificationService.renderLogView();
    }
});
