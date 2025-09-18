// ===== Firebase (CDN) v12.2.1 =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
  setPersistence, browserLocalPersistence, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, onValue
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// === Firebase config (igual que tuyo) ===
const firebaseConfig = {
  apiKey: "AIzaSyCE1H2urJ4BG3PH3HUzVjYpnB7bNgXgNPc",
  authDomain: "gonzalo-fitness.firebaseapp.com",
  databaseURL: "https://gonzalo-fitness-default-rtdb.firebaseio.com",
  projectId: "gonzalo-fitness",
  storageBucket: "gonzalo-fitness.firebasestorage.app",
  messagingSenderId: "424314148915",
  appId: "1:424314148915:web:0a0558b81f5ec6f24b2b46",
  measurementId: "G-91EELEKP8Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// ===== DOM =====
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const loginScreen = qs('#login-screen');
const appScreen = qs('#app-screen');

const googleBtn = qs('#googleBtn');
const emailForm = qs('#emailForm');
const emailInput = qs('#emailInput');
const passInput = qs('#passInput');
const emailLoginBtn = qs('#emailLoginBtn');
const emailRegisterBtn = qs('#emailRegisterBtn');
const resetPassBtn = qs('#resetPassBtn');
const authMsg = qs('#authMsg');

const logoutBtn = qs('#logoutBtn');
const routineTitle = qs('#routineTitle');
const userNameEl = qs('#userName');
const themeToggleLogin = qs('#themeToggleLogin');
const themeToggleApp = qs('#themeToggleApp');

const adminTools = qs('#adminTools');
const results = qs('#results');
const searchEmail = qs('#searchEmail');
const btnSearchUser = qs('#btnSearchUser');

const weekSelect = qs('#weekSelect');
const btnChangeWeek = qs('#btnChangeWeek');
const btnAddWeek = qs('#btnAddWeek');
const startDate = qs('#startDate');
const currentStudent = qs('#currentStudent');
const dayTabs = qs('#dayTabs');
const planBody = qs('#planBody');
const btnAddRow = qs('#btnAddRow');
const btnAddRowTop = qs('#btnAddRowTop');
const btnSavePlan = qs('#btnSavePlan');
const saveIndicator = qs('#saveIndicator');

const dailyDate = qs('#dailyDate');
const dailyText = qs('#dailyText');
const dailySaved = qs('#dailySaved');
const btnSaveDaily = qs('#btnSaveDaily');

// Timer modal
const timerModal = qs('#timerModal');
const timerClose = qs('#timerClose');
const modalTimerDisplay = qs('#modalTimerDisplay');
const modalStart = qs('#modalStart');
const modalPause = qs('#modalPause');
const modalReset = qs('#modalReset');

// Name modal
const nameModal = qs('#nameModal');
const nameClose = qs('#nameClose');
const preferredNameInput = qs('#preferredNameInput');
const savePreferredName = qs('#savePreferredName');

const toast = qs('#toast');

// ===== Estado =====
let currentUID = null;
let viewedUID = null;
let role = "usuario";
let currentDay = localStorage.getItem('lastDay') || "lunes";
let autosaveTimer = null;
let autosavePending = false;

// Timer state (modal)
let tmr = null, tElapsed = 0;

// ===== Utils =====
const fmt = n => n.toString().padStart(2,'0');
const show = (el, yes=true)=> el && el.classList[yes?'remove':'add']('hidden');
const isAdmin = ()=> role === "admin";
const todayISO = ()=> new Date().toISOString().slice(0,10);
function toastMsg(m){ toast.textContent = m; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2200); }
function minutesSecondsText(sec){ sec = Math.max(0, sec|0); return `${fmt(Math.floor(sec/60))}:${fmt(sec%60)}`; }

// ===== Tema =====
function applySavedTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved==='dark');
  themeToggleLogin && (themeToggleLogin.checked = saved==='dark');
  themeToggleApp && (themeToggleApp.checked = saved==='dark');
}
applySavedTheme();
themeToggleLogin?.addEventListener('change', e=> {localStorage.setItem('theme', e.target.checked?'dark':'light'); applySavedTheme();});
themeToggleApp?.addEventListener('change', e=> {localStorage.setItem('theme', e.target.checked?'dark':'light'); applySavedTheme();});

// ===== Persistencia Auth =====
setPersistence(auth, browserLocalPersistence);

// ===== Auth: Google =====
googleBtn?.addEventListener('click', async ()=>{
  try{
    await signInWithPopup(auth, provider);
  }catch(err){
    const silent = ['auth/cancelled-popup-request','auth/popup-closed-by-user'];
    if (!silent.includes(err?.code)) {
      authMsg && (authMsg.textContent = 'Error de Google. Intentá de nuevo.');
    } else if (authMsg) authMsg.textContent = '';
    console.error(err);
  }
});

// ===== Auth: Email / Password =====
emailForm?.addEventListener('submit', e => e.preventDefault());

emailLoginBtn?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
  }catch(err){ console.error(err); authMsg && (authMsg.textContent = mapAuthError(err)); }
});

emailRegisterBtn?.addEventListener('click', async ()=>{
  try{
    const email = emailInput.value.trim();
    const pass = passInput.value;
    if(pass.length < 6){ authMsg && (authMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.'); return; }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // forzamos mostrar modal de nombre
    setTimeout(()=> promptPreferredName(cred.user), 50);
  }catch(err){ console.error(err); authMsg && (authMsg.textContent = mapAuthError(err)); }
});

resetPassBtn?.addEventListener('click', async ()=>{
  const email = emailInput.value.trim();
  if(!email){ authMsg && (authMsg.textContent = 'Escribí tu email para enviarte el enlace.'); return; }
  try{
    await sendPasswordResetEmail(auth, email);
    authMsg && (authMsg.textContent = 'Te enviamos un correo para restablecer la contraseña.');
  }catch(err){ console.error(err); authMsg && (authMsg.textContent = mapAuthError(err)); }
});

function mapAuthError(e){
  const code = (e && e.code) || '';
  if(code.includes('email-already-in-use'))   return 'Ese correo ya está registrado.';
  if(code.includes('invalid-email'))          return 'Correo inválido.';
  if(code.includes('invalid-credential') ||
     code.includes('wrong-password'))         return 'Credenciales incorrectas.';
  if(code.includes('user-not-found'))         return 'Usuario no encontrado.';
  if(code.includes('too-many-requests'))      return 'Demasiados intentos. Probá más tarde.';
  if(code.includes('operation-not-allowed'))  return 'El método Email/Password no está habilitado.';
  if(code.includes('network-request-failed')) return 'Error de red. Revisá tu conexión.';
  return 'Error de autenticación.';
}

// ===== Logout =====
logoutBtn?.addEventListener('click', ()=> signOut(auth));

// ===== onAuthStateChanged =====
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    currentUID = viewedUID = null;
    show(loginScreen, true);
    show(appScreen, false);
    return;
  }
  show(loginScreen, false);
  show(appScreen, true);

  currentUID = user.uid;
  viewedUID = user.uid;

  // Alta /users si no existe
  const uRef = ref(db, `users/${user.uid}`);
  const uSnap = await get(uRef);
  if(!uSnap.exists()){
    await set(uRef, {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: Date.now()
    });
    // Mostrar modal para nombre preferido
    setTimeout(()=> promptPreferredName(user), 100);
  }else{
    // Mostrar modal si no hay preferredName
    if(!uSnap.val().preferredName){
      setTimeout(()=> promptPreferredName(user), 100);
    }
  }

  // Rol
  let rSnap = await get(ref(db, `roles/${user.uid}`));
  if(!rSnap.exists()) rSnap = await get(ref(db, `Roles/${user.uid}`));
  role = rSnap.exists() ? rSnap.val() : "usuario";
  setupByRole();

  // Cargar nombre preferido y header
  const uNow = (await get(ref(db, `users/${user.uid}`))).val() || {};
  const prettyName = uNow.preferredName || user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
  userNameEl && (userNameEl.textContent = prettyName);
  routineTitle && (routineTitle.textContent = `Rutina de ${prettyName}`);
  currentStudent && (currentStudent.value = prettyName);

  // Inicializar semanas y tabs
  await refreshWeeks();
  buildDayTabs();
  await loadWeekData();
  await loadDailySummary();
});

function setupByRole(){
  qsa('.adminOnly').forEach(el=> show(el, isAdmin()));
  show(adminTools, isAdmin());
  // Usuarios no pueden editar
  if(!isAdmin()){
    btnSavePlan?.classList.add('hidden');
    btnAddRow?.classList.add('hidden');
    btnAddRowTop?.classList.add('hidden');
    btnAddWeek?.classList.add('hidden');
  }
}

// ===== Preferred name modal =====
function promptPreferredName(user){
  if(!nameModal) return;
  show(nameModal, true);
  preferredNameInput.value = user.displayName || (user.email ? user.email.split('@')[0] : '');
  preferredNameInput.focus();
}
nameClose?.addEventListener('click', ()=> show(nameModal, false));
savePreferredName?.addEventListener('click', async ()=>{
  const v = preferredNameInput.value.trim();
  if(!v) return;
  const user = auth.currentUser;
  try{
    await update(ref(db, `users/${user.uid}`), { preferredName: v, updatedAt: Date.now() });
    try{ await updateProfile(user, { displayName: v }); }catch{}
    userNameEl && (userNameEl.textContent = v);
    routineTitle && (routineTitle.textContent = `Rutina de ${v}`);
    currentStudent && (currentStudent.value = v);
    toastMsg('Nombre guardado ✔');
  }catch(e){ console.error(e); toastMsg('No se pudo guardar el nombre'); }
  show(nameModal, false);
});

// ===== Semanas =====
async function refreshWeeks(){
  weekSelect.innerHTML = '';
  const weeksSnap = await get(ref(db, `plans/${viewedUID}/weeks`));
  const weeks = weeksSnap.exists() ? weeksSnap.val() : null;

  if(!weeks || Object.keys(weeks).length===0){
    if(isAdmin()){
      // Mostrar solo "Semana 1" hasta que admin la cree
      const opt = document.createElement('option');
      opt.value = 'W1'; opt.textContent = 'Semana 1';
      weekSelect.appendChild(opt);
    }else{
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = 'Sin semanas asignadas';
      opt.disabled = true; opt.selected = true;
      weekSelect.appendChild(opt);
    }
    return;
  }

  // Ordenar por número
  const ids = Object.keys(weeks)
    .filter(k=>/^W\d+$/.test(k))
    .sort((a,b)=> parseInt(a.slice(1)) - parseInt(b.slice(1)));

  ids.forEach(id=>{
    const n = parseInt(id.slice(1));
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = `Semana ${n}`;
    weekSelect.appendChild(opt);
  });
}

btnAddWeek?.addEventListener('click', async ()=>{
  const base = await get(ref(db, `plans/${viewedUID}/weeks`));
  let next = 1;
  if(base.exists()){
    const nums = Object.keys(base.val()).map(k=> parseInt(k.replace('W',''))).filter(n=>!isNaN(n));
    if(nums.length) next = Math.max(...nums)+1;
  }
  const id = `W${next}`;
  await set(ref(db, `plans/${viewedUID}/weeks/${id}`), {
    startDate: todayISO(),
    updatedBy: "Gonzalo",
    updatedAt: Date.now(),
    days: {},
  });
  toastMsg(`Semana ${next} creada ✔`);
  await refreshWeeks();
  weekSelect.value = id;
  await loadWeekData();
});

btnChangeWeek?.addEventListener('click', ()=> loadWeekData());
weekSelect?.addEventListener('change', ()=> {/* opcional: auto */});

startDate?.addEventListener('change', ()=> isAdmin() && saveWeekMeta());

// ===== Días / Tabs =====
function buildDayTabs(){
  const days = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
  dayTabs.innerHTML = '';
  days.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'tab'+(d===currentDay?' active':'');
    b.textContent = d[0].toUpperCase()+d.slice(1);
    b.addEventListener('click', async ()=>{
      currentDay = d;
      localStorage.setItem('lastDay', d);
      qsa('.tab').forEach(t=>t.classList.remove('active'));
      b.classList.add('active');
      await loadWeekData();
    });
    dayTabs.appendChild(b);
  });
}

// ===== Tabla =====
function rowTemplate(item={}, editable=false){
  const tr = document.createElement('tr');
  const mk = (type,val,step)=>{ const i=document.createElement('input'); i.type=type; if(val!==undefined&&val!==null)i.value=val; i.disabled=!editable; if(step) i.step=step; return i; };
  const iEj = mk('text', item.ejercicio||'');
  const iSe = mk('number', item.series??0, 1);
  const iRe = mk('number', item.reps??0, 1);
  const iDe = mk('number', item.descansoSeg??0, 5);
  const iNo = mk('text', item.notas||'');
  const btnTimer = document.createElement('button'); btnTimer.className='btn ghost'; btnTimer.type='button'; btnTimer.textContent='Cronómetro';
  btnTimer.addEventListener('click', ()=> openTimer(parseInt(iDe.value||'0',10)));

  const tdEj=document.createElement('td'); tdEj.appendChild(iEj);
  const tdSe=document.createElement('td'); tdSe.appendChild(iSe);
  const tdRe=document.createElement('td'); tdRe.appendChild(iRe);
  const tdDe=document.createElement('td'); tdDe.appendChild(iDe); tdDe.appendChild(document.createElement('br')); tdDe.appendChild(btnTimer);
  const tdNo=document.createElement('td'); tdNo.appendChild(iNo);

  tr.append(tdEj, tdSe, tdRe, tdDe, tdNo);

  if(editable){
    const tdA = document.createElement('td');
    const rem = document.createElement('button'); rem.className='btn danger outline'; rem.textContent='Borrar';
    rem.onclick = ()=> tr.remove();
    tdA.appendChild(rem);
    tr.append(tdA);
  }else{
    const tdA = document.createElement('td'); tdA.className='adminOnly hidden'; tr.append(tdA);
  }

  // Autosave onchange
  [iEj,iSe,iRe,iDe,iNo].forEach(inp=> inp.addEventListener('input', scheduleAutosave));
  return tr;
}

btnAddRow?.addEventListener('click', ()=> planBody.appendChild(rowTemplate({}, isAdmin())));
btnAddRowTop?.addEventListener('click', ()=> planBody.prepend(rowTemplate({}, isAdmin())));

// ===== Carga/guardado plan =====
async function loadWeekData(){
  const id = weekSelect.value || 'W1';
  const dRef = ref(db, `plans/${viewedUID}/weeks/${id}`);
  const s = await get(dRef);
  const base = s.exists()? s.val() : null;
  if(base?.startDate) startDate.value = base.startDate;
  const userInfo = await get(ref(db, `users/${viewedUID}`));
  const prettyName = userInfo.val()?.preferredName || userInfo.val()?.displayName || userInfo.val()?.email || viewedUID;
  currentStudent.value = prettyName;

  const dayArr = base?.days?.[currentDay] || [];
  renderTable(dayArr, isAdmin());
  saveIndicator.textContent = '';
}

function renderTable(items=[], editable=false){
  planBody.innerHTML='';
  if(items.length===0 && editable){ planBody.appendChild(rowTemplate({}, true)); return; }
  items.forEach(it=> planBody.appendChild(rowTemplate(it, editable)));
}

btnSavePlan?.addEventListener('click', savePlan);

function cleanseNumber(v){ const n = parseInt(v,10); return isNaN(n) || n<0 ? 0 : n; }

async function savePlan(){
  saveIndicator.textContent = 'Guardando...';
  const id = weekSelect.value || 'W1';
  const rows = [...planBody.querySelectorAll('tr')].map(tr=>{
    const ins = [...tr.querySelectorAll('input')];
    const [ej,se,re,de,no] = ins.map(i=>i.value);
    return { ejercicio: ej || '', series: cleanseNumber(se), reps: cleanseNumber(re), descansoSeg: cleanseNumber(de), notas: no || '' };
  });

  const dRef = ref(db, `plans/${viewedUID}/weeks/${id}`);
  const s = await get(dRef);
  const prev = s.exists()? s.val() : { days:{} };

  const payload = {
    startDate: startDate.value || todayISO(),
    updatedBy: isAdmin()? "Gonzalo" : (auth.currentUser?.uid || "usuario"),
    updatedAt: Date.now(),
    days: { ...prev.days, [currentDay]: rows }
  };
  await set(dRef, payload);
  const now = new Date(); saveIndicator.textContent = `Guardado ✔ ${fmt(now.getHours())}:${fmt(now.getMinutes())}`;
  autosavePending = false;
}

function scheduleAutosave(){
  autosavePending = true;
  saveIndicator.textContent = 'Guardando...';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=> { if(isAdmin()) savePlan(); else { saveIndicator.textContent=''; } }, 3000);
}

async function saveWeekMeta(){
  if(!isAdmin()) return;
  const id = weekSelect.value || 'W1';
  await update(ref(db, `plans/${viewedUID}/weeks/${id}`), { startDate: startDate.value || todayISO(), updatedBy: 'Gonzalo', updatedAt: Date.now() });
}

// ===== Buscar usuario (admin) =====
btnSearchUser?.addEventListener('click', async ()=>{
  results.innerHTML = 'Buscando...';
  const all = await get(ref(db, 'users'));
  const list = [];
  if(all.exists()){
    const obj = all.val();
    Object.entries(obj).forEach(([uid,info])=>{
      const email = (info.email||'').toLowerCase();
      if(!searchEmail.value || email.includes(searchEmail.value.toLowerCase())){
        list.push({uid, email: info.email || '(sin email)', name: info.preferredName || info.displayName || ''});
      }
    });
  }
  if(!list.length){ results.innerHTML = '<span class="muted">Sin resultados</span>'; return; }
  results.innerHTML = '';
  list.slice(0,20).forEach(u=>{
    const div = document.createElement('div'); div.className='result-item';
    div.innerHTML = `<div><b>${u.name || '(Sin nombre)'}</b><br><span class="muted">${u.email}</span></div>`;
    const b = document.createElement('button'); b.className='btn'; b.textContent='Ver plan';
    b.onclick = async ()=>{ viewedUID=u.uid; currentStudent.value = u.name || u.email || u.uid; await refreshWeeks(); await loadWeekData(); toastMsg('Cargando plan del alumno'); };
    div.appendChild(b); results.appendChild(div);
  });
});

// ===== Resumen Diario =====
dailyDate?.addEventListener('change', loadDailySummary);
btnSaveDaily?.addEventListener('click', saveDailySummary);
let dailyTimer=null;

async function loadDailySummary(){
  const key = (dailyDate.value || todayISO());
  const s = await get(ref(db, `dailySummary/${currentUID}/${key}`));
  dailyText.value = s.exists()? (s.val().text || '') : '';
  dailySaved.textContent = '';
}
async function saveDailySummary(){
  const key = (dailyDate.value || todayISO());
  await set(ref(db, `dailySummary/${currentUID}/${key}`), { text: dailyText.value.slice(0,500), savedAt: Date.now() });
  dailySaved.textContent = 'Guardado ✔';
  setTimeout(()=> dailySaved.textContent = '', 1200);
}
dailyText?.addEventListener('input', ()=>{
  clearTimeout(dailyTimer);
  dailyTimer = setTimeout(saveDailySummary, 2000);
});

// ===== Cronómetro modal =====
function renderModalClock(){ modalTimerDisplay.textContent = `${fmt(Math.floor(tElapsed/60))}:${fmt(tElapsed%60)}`; }
function openTimer(target=0){
  tElapsed = 0; renderModalClock();
  show(timerModal, true);
}
timerClose?.addEventListener('click', ()=>{ show(timerModal, false); clearInterval(tmr); tmr=null; });
modalStart?.addEventListener('click', ()=>{ if(tmr) return; tmr=setInterval(()=>{ tElapsed++; renderModalClock(); }, 1000); });
modalPause?.addEventListener('click', ()=>{ clearInterval(tmr); tmr=null; });
modalReset?.addEventListener('click', ()=>{ tElapsed=0; renderModalClock(); });

// ===== Iniciales =====
(function init(){
  // Default dark si no hay preferencia
  if(!localStorage.getItem('theme')) localStorage.setItem('theme','dark');
  applySavedTheme();
  // Daily date default
  if(dailyDate) dailyDate.value = todayISO();
})();
