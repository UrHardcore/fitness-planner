// ========== Firebase v9 Modular ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
  setPersistence, browserLocalPersistence, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, onValue
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// (Opcional) Analytics — NO es necesario para que funcione la app.
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// === TUS CREDENCIALES ===
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

// Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// ========== DOM ==========
const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];
const loginScreen = qs('#login-screen');
const appScreen = qs('#app-screen');
const googleBtn = qs('#googleBtn');
const logoutBtn = qs('#logoutBtn');
const userNameEl = qs('#userName');
const themeToggleLogin = qs('#themeToggleLogin');
const themeToggleApp = qs('#themeToggleApp');
const adminTools = qs('#adminTools');
const results = qs('#results');
const searchEmail = qs('#searchEmail');
const btnSearchUser = qs('#btnSearchUser');
const weekSelect = qs('#weekSelect');
const startDate = qs('#startDate');
const currentStudent = qs('#currentStudent');
const dayTabs = qs('#dayTabs');
const planBody = qs('#planBody');
const btnAddRow = qs('#btnAddRow');
const btnSavePlan = qs('#btnSavePlan');
const btnDuplicateWeek = qs('#btnDuplicateWeek');
const dailyText = qs('#dailyText');
const btnSaveDaily = qs('#btnSaveDaily');
const toast = qs('#toast');

// Cronómetro
const display = qs('#display');
const targetSec = qs('#targetSec');
const startBtn = qs('#startBtn');
const pauseBtn = qs('#pauseBtn');
const resetBtn = qs('#resetBtn');

// ========== Estado ==========
let currentUID = null;      // UID logueado
let viewedUID = null;       // UID del alumno visible (admin puede cambiar; usuario = su mismo UID)
let role = "usuario";
let currentDay = "lunes";
const daysOrder = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

// ========== Util ==========
const fmt = (n) => n.toString().padStart(2, '0');
const show = (el, yes=true)=> el.classList[yes?'remove':'add']('hidden');
const isAdmin = () => role === "admin";
const todayISO = ()=> new Date().toISOString().slice(0,10);
const weekIdFromDate = (d) => {
  // ISO week simple: YYYY-Www
  const date = d ? new Date(d) : new Date();
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((t - yearStart) / 86400000) + 1)/7);
  return `${t.getUTCFullYear()}-W${fmt(weekNo)}`;
};

function toastMsg(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 2200);
}

// ========== Tema ==========
function applySavedTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved==='dark');
  themeToggleLogin.checked = saved==='dark';
  themeToggleApp.checked = saved==='dark';
}
function toggleTheme(checked){
  document.documentElement.classList.toggle('dark', checked);
  localStorage.setItem('theme', checked ? 'dark' : 'light');
}
applySavedTheme();
themeToggleLogin.addEventListener('change', e=> toggleTheme(e.target.checked));
themeToggleApp.addEventListener('change', e=> toggleTheme(e.target.checked));

// ========== Auth ==========
setPersistence(auth, browserLocalPersistence);

googleBtn.addEventListener('click', async ()=>{
  try{
    await signInWithPopup(auth, provider);
  }catch(err){
    console.error(err);
    toastMsg('No se pudo iniciar sesión');
  }
});

logoutBtn.addEventListener('click', ()=> signOut(auth));

onAuthStateChanged(auth, async (user)=>{
  if(!user){
    currentUID = viewedUID = null;
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    return;
  }
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  currentUID = user.uid;
  viewedUID = user.uid;
  userNameEl.textContent = user.displayName || user.email || 'Usuario';

  // Alta / users
  const uRef = ref(db, `users/${user.uid}`);
  const snap = await get(uRef);
  if(!snap.exists()){
    await set(uRef, {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: Date.now()
    });
  }

  // Rol
  const rSnap = await get(ref(db, `roles/${user.uid}`));
  role = (rSnap.exists() ? rSnap.val() : "usuario");
  setupByRole();

  // Inicializar planner
  initWeeks();
  buildDayTabs();
  currentStudent.value = user.email || user.displayName || user.uid;
  await loadWeekData();
  await loadDailySummary();
});

// ========== UI por rol ==========
function setupByRole(){
  const adminEls = qsa('.adminOnly');
  adminEls.forEach(el=> show(el, isAdmin()));
  show(adminTools, isAdmin());
}

// ========== Semanas ==========
function initWeeks(){
  weekSelect.innerHTML = '';
  // 6 semanas alrededor de la actual
  const base = new Date();
  for(let i=-2;i<=3;i++){
    const d = new Date(base);
    d.setDate(d.getDate()+ (i*7));
    const id = weekIdFromDate(d);
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    if(i===0) opt.selected = true;
    weekSelect.appendChild(opt);
  }
  startDate.value = new Date().toISOString().slice(0,10);
}

weekSelect.addEventListener('change', loadWeekData);
startDate.addEventListener('change', ()=> isAdmin() && saveWeekMeta());

// ========== Tabs de días ==========
function buildDayTabs(){
  dayTabs.innerHTML = '';
  daysOrder.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'tab' + (d===currentDay?' active':'');
    b.textContent = d[0].toUpperCase()+d.slice(1);
    b.addEventListener('click', ()=>{
      currentDay = d;
      qsa('.tab').forEach(t=>t.classList.remove('active'));
      b.classList.add('active');
      renderTable([]);
      loadWeekData(); // recargar para ese día
    });
    dayTabs.appendChild(b);
  });
}

// ========== Tabla plan ==========
function rowTemplate(item={}, editable=false){
  const tr = document.createElement('tr');

  const tdEj = document.createElement('td');
  const tdSe = document.createElement('td');
  const tdRe = document.createElement('td');
  const tdTi = document.createElement('td');
  const tdNo = document.createElement('td');
  const tdAc = document.createElement('td');

  function mkInput(type='text', val=''){
    const i = document.createElement('input');
    i.type = type;
    i.value = (val ?? '');
    i.disabled = !editable;
    i.addEventListener('input', ()=> i.dataset.dirty="1");
    return i;
  }

  const iEj = mkInput('text', item.ejercicio);
  const iSe = mkInput('number', item.series);
  iSe.min=0; iSe.step=1;
  const iRe = mkInput('number', item.reps);
  iRe.min=0; iRe.step=1;
  const iTi = mkInput('number', item.tiempoSeg);
  iTi.min=0; iTi.step=5;
  const iNo = mkInput('text', item.notas);

  tdEj.appendChild(iEj);
  tdSe.appendChild(iSe);
  tdRe.appendChild(iRe);
  tdTi.appendChild(iTi);
  tdNo.appendChild(iNo);

  if(editable){
    const rem = document.createElement('button');
    rem.className = 'btn danger outline';
    rem.textContent = 'Borrar';
    rem.addEventListener('click', ()=> tr.remove());
    tdAc.appendChild(rem);
  }

  tr.append(tdEj, tdSe, tdRe, tdTi, tdNo);
  if(editable) tr.append(tdAc);
  return tr;
}

btnAddRow.addEventListener('click', ()=>{
  planBody.appendChild(rowTemplate({}, isAdmin()));
});

btnDuplicateWeek.addEventListener('click', async ()=>{
  const id = weekSelect.value;
  const dest = prompt('Duplicar esta semana hacia (ej. +1 para próxima, o YYYY-Www):', '+1');
  if(!dest) return;
  let targetId = dest;
  if(dest.startsWith('+') || dest.startsWith('-')){
    const n = parseInt(dest,10);
    const parts = id.split('-W');
    const year = +parts[0]; const wk = +parts[1];
    const newWk = wk + n;
    targetId = `${year}-W${String(newWk).padStart(2,'0')}`;
  }
  const fromRef = ref(db, `plans/${viewedUID}/${id}`);
  const toRef = ref(db, `plans/${viewedUID}/${targetId}`);
  const snap = await get(fromRef);
  if(!snap.exists()) return toastMsg('No hay datos que duplicar.');
  await set(toRef, { ...snap.val(), updatedBy: 'Gonzalo', updatedAt: Date.now() });
  toastMsg(`Semana duplicada a ${targetId}`);
});

// ========== Cargar/Guardar Plan ==========
async function loadWeekData(){
  const id = weekSelect.value;
  const dRef = ref(db, `plans/${viewedUID}/${id}`);
  const s = await get(dRef);
  const base = s.exists() ? s.val() : null;

  // meta
  if(base?.startDate) startDate.value = base.startDate;
  currentStudent.value = (await get(ref(db, `users/${viewedUID}`))).val()?.email || viewedUID;

  const dayArr = base?.days?.[currentDay] || [];
  renderTable(dayArr, isAdmin());
}

function renderTable(items=[], editable=false){
  planBody.innerHTML = '';
  items.forEach(it=> planBody.appendChild(rowTemplate(it, editable)));
  if(!items.length) {
    if(editable) planBody.appendChild(rowTemplate({}, true));
  }
}

btnSavePlan.addEventListener('click', async ()=>{
  const id = weekSelect.value;
  const rows = [...planBody.querySelectorAll('tr')].map(tr=>{
    const [ej,se,re,ti,no] = [...tr.querySelectorAll('input')].map(i=>i.value);
    return {
      ejercicio: ej, series: +se||0, reps: +re||0, tiempoSeg:+ti||0, notas:no
    };
  });
  const payload = {
    startDate: startDate.value || todayISO(),
    updatedBy: "Gonzalo",
    updatedAt: Date.now()
  };
  payload.days = {};
  // obtener snapshot actual para no pisar otros días
  const dRef = ref(db, `plans/${viewedUID}/${id}`);
  const s = await get(dRef);
  const prev = s.exists()? s.val() : { days:{} };
  payload.days = { ...prev.days, [currentDay]: rows };

  await set(dRef, payload);
  toastMsg('Semana guardada ✔');
});

async function saveWeekMeta(){
  if(!isAdmin()) return;
  const id = weekSelect.value;
  const dRef = ref(db, `plans/${viewedUID}/${id}/startDate`);
  await set(dRef, startDate.value || todayISO());
  await update(ref(db, `plans/${viewedUID}/${id}`), { updatedBy: 'Gonzalo', updatedAt: Date.now() });
}

// ========== Buscar/Seleccionar Usuario (ADMIN) ==========
btnSearchUser.addEventListener('click', async ()=>{
  results.innerHTML = 'Buscando...';
  const allUsersSnap = await get(ref(db, 'users'));
  const list = [];
  if(allUsersSnap.exists()){
    const obj = allUsersSnap.val();
    Object.entries(obj).forEach(([uid,info])=>{
      const email = (info.email||'').toLowerCase();
      if(!searchEmail.value || email.includes(searchEmail.value.toLowerCase())){
        list.push({uid, email: info.email || '(sin email)', name: info.displayName || ''});
      }
    });
  }
  if(!list.length){ results.innerHTML = '<span class="muted">Sin resultados</span>'; return; }
  results.innerHTML = '';
  list.slice(0,10).forEach(u=>{
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `<div><b>${u.email}</b><br><span class="muted">${u.name} · ${u.uid}</span></div>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Ver plan';
    b.addEventListener('click', async ()=>{
      viewedUID = u.uid;
      currentStudent.value = u.email || u.name || u.uid;
      await loadWeekData();
      toastMsg('Cargando plan del alumno');
    });
    div.appendChild(b);
    results.appendChild(div);
  });
});

// ========== Resumen Diario ==========
async function loadDailySummary(){
  const key = todayISO();
  const s = await get(ref(db, `dailySummary/${currentUID}/${key}`));
  dailyText.value = s.exists()? (s.val().text || '') : '';
}
btnSaveDaily.addEventListener('click', async ()=>{
  // Solo puede escribir su propio resumen
  const key = todayISO();
  await set(ref(db, `dailySummary/${currentUID}/${key}`), {
    text: dailyText.value.slice(0,500),
    savedAt: Date.now()
  });
  toastMsg('Resumen guardado ✔');
});

// ========== Cronómetro ==========
let timer=null, elapsed=0, target=0;
function renderClock(){
  const mm = Math.floor(elapsed/60);
  const ss = elapsed%60;
  display.textContent = `${fmt(mm)}:${fmt(ss)}`;
  if(target>0 && elapsed>=target){
    display.style.animation = 'blink 0.8s steps(2, end) 6';
    setTimeout(()=>display.style.animation='', 5000);
  }
}
startBtn.addEventListener('click', ()=>{
  if(timer) return;
  target = Math.max(0, parseInt(targetSec.value||'0',10));
  timer = setInterval(()=>{ elapsed++; renderClock(); }, 1000);
});
pauseBtn.addEventListener('click', ()=>{
  clearInterval(timer); timer=null;
});
resetBtn.addEventListener('click', ()=>{
  clearInterval(timer); timer=null; elapsed=0; renderClock();
});
renderClock();

// ========== Protecciones UI ==========
function lockUserInputsForRole(){
  const editable = isAdmin();
  // toggle columna Acciones
  qsa('.adminOnly').forEach(el=> show(el, editable));
}
lockUserInputsForRole();
