// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-fB4xsx5uDV9jzbLGn-wUiZbBlaZi8Nk",
  authDomain: "hvac-apostolou.firebaseapp.com",
  projectId: "hvac-apostolou",
  storageBucket: "hvac-apostolou.firebasestorage.app",
  messagingSenderId: "481556029907",
  appId: "1:481556029907:web:d7b17c8e23001ae9a2cf26"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Custom Auth Configuration (PIN: 2105)
const SAVED_PASSWORD_HASH = "313460f9a2e34ff606001d29bf1a0072b07049e830e71912952467d5e4a3b72f";

// State Management
let customers = [];
let visits = [];
let selectedCustomerId = null;
let tempPhotoBase64 = null;

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('PWA Service Worker Registered'))
      .catch(err => console.log('Service Worker Failed', err));
  });
}

// Synartisi metatropis keimenou se SHA-256 Hash
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Custom Synartisi Elenchou Eisodou
async function handleCustomLogin(e) {
  if (e) e.preventDefault();
  
  const passwordInput = document.getElementById('passcode');
  const password = passwordInput ? passwordInput.value.trim() : '';
  const loginError = document.getElementById('loginError');
  const loginModal = document.getElementById('loginModal');

  const userHash = await hashPassword(password);

  if (userHash === SAVED_PASSWORD_HASH) {
    localStorage.setItem('isAuthenticated', 'true');
    if (loginError) loginError.classList.add('hidden');
    if (loginModal) loginModal.classList.add('hidden');
    initLiveSync();
  } else {
    if (loginError) {
      loginError.innerText = "Lanthasmenos kodikos!";
      loginError.classList.remove('hidden');
    }
  }
}

// Elefchos an einai idi syndedemenos
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleCustomLogin);
  }

  const loginModal = document.getElementById('loginModal');
  if (localStorage.getItem('isAuthenticated') === 'true') {
    if (loginModal) loginModal.classList.add('hidden');
    initLiveSync();
  } else {
    if (loginModal) loginModal.classList.remove('hidden');
  }
});

// Zontanos Synchronismos me Firestore
function initLiveSync() {
  // Akroatis gia Pelates
  db.collection('customers').onSnapshot(snapshot => {
    customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (!selectedCustomerId) {
      renderCustomers();
    } else {
      renderCustomerProfile();
    }
    updateStats();
  }, error => {
    console.error("Sfalma synchronismou pelaton: ", error);
  });

  // Akroatis gia Episkepseis
  db.collection('visits').onSnapshot(snapshot => {
    visits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (selectedCustomerId) {
      renderVisits();
    }
    updateStats();
  }, error => {
    console.error("Sfalma synchronismou episkepseon: ", error);
  });
}

function updateStats() {
  const custElem = document.getElementById('statTotalCustomers');
  const visitElem = document.getElementById('statTotalVisits');
  if (custElem) custElem.innerText = customers.length;
  if (visitElem) visitElem.innerText = visits.length;
}

// View Switching Logic
function showCustomerList() {
  document.getElementById('customerListView').classList.remove('hidden');
  document.getElementById('customerDetailView').classList.add('hidden');
  selectedCustomerId = null;
  renderCustomers();
}

function showCustomerDetail(id) {
  selectedCustomerId = id;
  document.getElementById('customerListView').classList.add('hidden');
  document.getElementById('customerDetailView').classList.remove('hidden');
  renderCustomerProfile();
  renderVisits();
}

// Render Customer List
function renderCustomers(filteredData = null) {
  const list = filteredData || customers;
  const container = document.getElementById('customerCardsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <i class="fa-solid fa-user-slash text-4xl text-slate-500 mb-3"></i>
        <p class="text-slate-400 text-sm">Den vrethikan pelates.</p>
      </div>
    `;
    return;
  }

  list.forEach(cust => {
    const custVisits = visits.filter(v => v.customerId === cust.id);
    const lastVisit = custVisits.length > 0 ? custVisits[custVisits.length - 1].date : 'Kamia episkepsi';

    const card = document.createElement('div');
    card.className = 'bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-2xl p-4 shadow-md transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
    card.onclick = () => showCustomerDetail(cust.id);

    card.innerHTML = `
      <div class="space-y-1">
        <h3 class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-user text-blue-400 text-sm"></i> ${cust.name}
        </h3>
        <p class="text-xs text-slate-300 flex items-center gap-2">
          <i class="fa-solid fa-location-dot text-red-400"></i> ${cust.address}
        </p>
        <p class="text-xs text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-wind text-cyan-400"></i> ${cust.acUnits || 'Den echoun katagrafei monades'}
        </p>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-700/60 pt-2 sm:pt-0">
        <span class="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700">
          Telefutaia: ${lastVisit}
        </span>
        <div class="flex gap-2" onclick="event.stopPropagation()">
          <button onclick="editCustomer('${cust.id}')" title="Epexergasia" class="bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white p-2 rounded-xl border border-slate-600/50 transition">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteCustomer('${cust.id}')" title="Diagrafi" class="bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white p-2 rounded-xl border border-red-500/20 transition">
            <i class="fa-solid fa-trash"></i>
          </button>
          <a href="tel:${cust.phone}" title="Klisi" class="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white p-2 rounded-xl border border-emerald-500/30 transition">
            <i class="fa-solid fa-phone"></i>
          </a>
          <a href="https://maps.google.com/?q=${encodeURIComponent(cust.address)}" target="_blank" title="Chartis" class="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded-xl border border-blue-500/30 transition">
            <i class="fa-solid fa-location-arrow"></i>
          </a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterCustomers() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.phone.includes(q) || 
    c.address.toLowerCase().includes(q) ||
    (c.acUnits && c.acUnits.toLowerCase().includes(q))
  );
  renderCustomers(filtered);
}

// Render Customer Detail Profile
function renderCustomerProfile() {
  const cust = customers.find(c => c.id === selectedCustomerId);
  if (!cust) return;

  const card = document.getElementById('customerProfileCard');
  if (!card) return;
  card.innerHTML = `
    <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          ${cust.name}
        </h2>
        <p class="text-sm text-slate-300 mt-1 flex items-center gap-2">
          <i class="fa-solid fa-location-dot text-red-400"></i> ${cust.address}
        </p>
        <p class="text-sm text-slate-300 mt-1 flex items-center gap-2">
          <i class="fa-solid fa-phone text-emerald-400"></i> ${cust.phone}
        </p>
      </div>
      
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <a href="tel:${cust.phone}" class="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
          <i class="fa-solid fa-phone"></i> Klisi
        </a>
        <a href="https://maps.google.com/?q=${encodeURIComponent(cust.address)}" target="_blank" class="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
          <i class="fa-solid fa-map-location-dot"></i> Chartis
        </a>
        <button onclick="editCustomer('${cust.id}')" title="Epexergasia" class="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2.5 rounded-xl text-sm transition">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button onclick="deleteCustomer('${cust.id}')" title="Diagrafi" class="bg-red-600/80 hover:bg-red-600 text-white p-2.5 rounded-xl text-sm transition">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
        <span class="text-slate-400 block font-medium mb-1"><i class="fa-solid fa-wind text-cyan-400"></i> Klimatistika:</span>
        <span class="text-slate-200">${cust.acUnits || 'Den echoun katagrafei'}</span>
      </div>
      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
        <span class="text-slate-400 block font-medium mb-1"><i class="fa-solid fa-note-sticky text-amber-400"></i> Symeioseis prosvasis:</span>
        <span class="text-slate-200">${cust.notes || 'Kamia symeiosi'}</span>
      </div>
    </div>
  `;
}

// Render Visit History
function renderVisits() {
  const container = document.getElementById('visitTimelineContainer');
  if (!container) return;
  container.innerHTML = '';

  const custVisits = visits.filter(v => v.customerId === selectedCustomerId).sort((a,b) => new Date(b.date) - new Date(a.date));

  if (custVisits.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 bg-slate-800/40 rounded-xl border border-slate-700/40">
        <p class="text-slate-400 text-sm">Den iparchei katagegrammeno istoriko episkepseon.</p>
      </div>
    `;
    return;
  }

  custVisits.forEach(visit => {
    const item = document.createElement('div');
    item.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg space-y-3 relative';

    item.innerHTML = `
      <div class="flex justify-between items-start border-b border-slate-700/60 pb-2">
        <div>
          <span class="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold">
            ${visit.type}
          </span>
          <span class="text-xs text-slate-400 ml-2"><i class="fa-regular fa-calendar"></i> ${visit.date}</span>
        </div>
        <div class="flex items-center gap-2">
          ${visit.cost ? `<span class="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">€${visit.cost}</span>` : ''}
          <button onclick="editVisit('${visit.id}')" title="Epexergasia Episkepsis" class="text-slate-400 hover:text-blue-400 p-1 text-xs transition">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteVisit('${visit.id}')" title="Diagrafi Episkepsis" class="text-slate-400 hover:text-red-400 p-1 text-xs transition">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      ${visit.issue ? `
        <div>
          <span class="text-xs text-slate-400 font-medium block">Provlima / Aitia:</span>
          <p class="text-sm text-slate-200">${visit.issue}</p>
        </div>
      ` : ''}

      ${visit.action ? `
        <div>
          <span class="text-xs text-slate-400 font-medium block">Ergasies pou eginan:</span>
          <p class="text-sm text-slate-200">${visit.action}</p>
        </div>
      ` : ''}

      ${visit.photo ? `
        <div>
          <span class="text-xs text-slate-400 font-medium block mb-1">Fotografia Vlavis / Service:</span>
          <img src="${visit.photo}" onclick="openLightbox('${visit.photo}')" class="w-24 h-24 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90 transition shadow-md">
        </div>
      ` : ''}
    `;
    container.appendChild(item);
  });
}

// Modal & Form Handlers - Customer
function openCustomerModal() {
  document.getElementById('customerForm').reset();
  document.getElementById('custFormId').value = '';
  document.getElementById('customerModalTitle').innerText = 'Neos Pelatis';
  document.getElementById('customerModal').classList.remove('hidden');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.add('hidden');
}

function editCustomer(id) {
  const cust = customers.find(c => c.id === id);
  if (!cust) return;
  document.getElementById('custFormId').value = cust.id;
  document.getElementById('custFormName').value = cust.name;
  document.getElementById('custFormPhone').value = cust.phone;
  document.getElementById('custFormAddress').value = cust.address;
  document.getElementById('custFormAcUnits').value = cust.acUnits || '';
  document.getElementById('custFormNotes').value = cust.notes || '';
  document.getElementById('customerModalTitle').innerText = 'Epexergasia Pelati';
  document.getElementById('customerModal').classList.remove('hidden');
}

async function deleteCustomer(id) {
  const cust = customers.find(c => c.id === id);
  if (!cust) return;

  if (confirm(`Eiste sigouroi oti thelete na diagrapsete ton pelati "${cust.name}"; Tha diagrafei kai olo to istoriko episkepseon tou.`)) {
    try {
      await db.collection('customers').doc(id).delete();
      
      const custVisits = visits.filter(v => v.customerId === id);
      for (let v of custVisits) {
        await db.collection('visits').doc(v.id).delete();
      }

      if (selectedCustomerId === id) {
        showCustomerList();
      }
    } catch (error) {
      alert("Sfalma kata ti diagrafi: " + error.message);
    }
  }
}

async function handleSaveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('custFormId').value;
  const name = document.getElementById('custFormName').value;
  const phone = document.getElementById('custFormPhone').value;
  const address = document.getElementById('custFormAddress').value;
  const acUnits = document.getElementById('custFormAcUnits').value;
  const notes = document.getElementById('custFormNotes').value;

  const customerData = { name, phone, address, acUnits, notes };

  try {
    if (id) {
      await db.collection('customers').doc(id).update(customerData);
    } else {
      await db.collection('customers').add(customerData);
    }
    closeCustomerModal();
  } catch (error) {
    alert("Sfalma kata tin apothikeusi pelati: " + error.message);
  }
}

// Modal & Form Handlers - Visit
function openVisitModal() {
  document.getElementById('visitForm').reset();
  document.getElementById('visitFormId').value = '';
  document.getElementById('visitFormDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('visitModalTitle').innerText = 'Katagrafi Neas Episkepsis';
  tempPhotoBase64 = null;
  document.getElementById('photoPreviewContainer').classList.add('hidden');
  document.getElementById('visitModal').classList.remove('hidden');
}

function closeVisitModal() {
  document.getElementById('visitModal').classList.add('hidden');
}

function editVisit(visitId) {
  const visit = visits.find(v => v.id === visitId);
  if (!visit) return;

  document.getElementById('visitFormId').value = visit.id;
  document.getElementById('visitFormDate').value = visit.date;
  document.getElementById('visitFormType').value = visit.type;
  document.getElementById('visitFormIssue').value = visit.issue || '';
  document.getElementById('visitFormAction').value = visit.action || '';
  document.getElementById('visitFormCost').value = visit.cost || '';

  tempPhotoBase64 = visit.photo || null;
  if (tempPhotoBase64) {
    document.getElementById('photoPreview').src = tempPhotoBase64;
    document.getElementById('photoPreviewContainer').classList.remove('hidden');
  } else {
    document.getElementById('photoPreviewContainer').classList.add('hidden');
  }

  document.getElementById('visitModalTitle').innerText = 'Epexergasia Episkepsis';
  document.getElementById('visitModal').classList.remove('hidden');
}

async function deleteVisit(visitId) {
  if (confirm('Eiste sigouroi oti thelete na diagrapsete auti tin episkepsi;')) {
    try {
      await db.collection('visits').doc(visitId).delete();
    } catch (error) {
      alert("Sfalma kata ti diagrafi episkepsis: " + error.message);
    }
  }
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      tempPhotoBase64 = evt.target.result;
      document.getElementById('photoPreview').src = tempPhotoBase64;
      document.getElementById('photoPreviewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function removePhoto() {
  tempPhotoBase64 = null;
  document.getElementById('visitFormPhoto').value = '';
  document.getElementById('photoPreviewContainer').classList.add('hidden');
}

async function handleSaveVisit(e) {
  e.preventDefault();
  const id = document.getElementById('visitFormId').value;
  const date = document.getElementById('visitFormDate').value;
  const type = document.getElementById('visitFormType').value;
  const issue = document.getElementById('visitFormIssue').value;
  const action = document.getElementById('visitFormAction').value;
  const cost = document.getElementById('visitFormCost').value;

  const visitData = {
    customerId: selectedCustomerId,
    date,
    type,
    issue,
    action,
    cost,
    photo: tempPhotoBase64
  };

  try {
    if (id) {
      await db.collection('visits').doc(id).update(visitData);
    } else {
      await db.collection('visits').add(visitData);
    }
    closeVisitModal();
  } catch (error) {
    alert("Sfalma kata tin apothikeusi episkepsis: " + error.message);
  }
}

// Lightbox Controls
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxModal').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightboxModal').classList.add('hidden');
}