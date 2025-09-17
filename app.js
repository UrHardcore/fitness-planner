// ===== Firebase (CDN) v12.2.1 =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
  setPersistence, browserLocalPersistence, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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

const display = qs('#display');
const targetSec = qs('#targetSec');
const startBtn = qs('#startBtn');
const pauseBtn = qs('#pauseBtn');
const timerResetBtn = qs('#timerResetBtn');

const toast = qs('#toast');

// ===== Estado =====
let currentUID = null;
let viewedUID = null;
let role = "usuario";
let currentDay = "lunes";

// ===== Utils =====
const fmt = n => n.toString().padStart(2,'0');
const show = (el, yes=true)=> el.classList[yes?'remove':'add']('hidden');
const isAdmin = ()=> role === "admin";
const todayISO = ()=> new Date().toISOString().slice(0,10);
function toastMsg(m){ toast.textContent = m; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2200); }

// ===== Tema =====
function applySavedTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved==='dark');
  themeToggleLogin.checked = saved==='dark';
  themeToggleApp.checked = saved==='dark';
}
function toggleTheme(ch){ document.documentElement.classList.toggle('dark', ch); localStorage.setItem('theme', ch?'dark':'light'); }
applySavedTheme();
themeToggleLogin.addEventListener('change', e=> toggleTheme(e.target.checked));
themeToggleApp.addEventListener('change', e=> toggleTheme(e.target.checked));

// ===== Persistencia =====
setPersistence(auth, browserLocalPersistence);

// ===== Auth: Google =====
googleBtn.addEventListener('click', async ()=>{
  try{
    await signInWithPopup(auth, provider);
  }catch(err){
    // Mensaje más claro si el dominio no está autorizado
    if (authMsg) authMsg.textContent = (err && err.code === 'auth/unauthorized-domain')
      ? 'Dominio no autorizado en Firebase (Authentication → Settings → Authorized domains).'
      : ('Error de Google: ' + (err.code || 'desconocido'));
    console.error(err);
  }
});

// ===== Auth: Email / Password =====
emailForm.addEventListener('submit', e => e.preventDefault());

emailLoginBtn.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
  }catch(err){ console.error(err); authMsg.textContent = mapAuthError(err); }
});

emailRegisterBtn.addEventListener('click', async ()=>{
  try{
    const email = emailInput.value.trim();
    const pass = passInput.value;
    if(pass.length < 6){ authMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if(!cred.user.displayName){
      try{ await updateProfile(cred.user, { displayName: email.split('@')[0] }); }catch{}
    }
    authMsg.textContent = 'Cuenta creada. Ya estás logueado.';
  }catch(err){ console.error(err); authMsg.textContent = mapAuthError(err); }
});

resetPassBtn.addEventListener('click', async ()=>{
  const email = emailInput.value.trim();
  if(!email){ authMsg.textContent = 'Escribí tu email para enviarte el enlace.'; return; }
  try{
    await sendPasswordResetEmail(auth, email);
    authMsg.textContent = 'Te enviamos un correo para restablecer la contraseña.';
  }catch(err){ console.error(err); authMsg.textContent = mapAuthError(err); }
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
logoutBtn.addEventListener('click', ()=> signOut(auth));

// ===== onAuthStateChanged =====
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

  // Alta /users
  const uRef = ref(db, `users/${user.uid}`);
  const uSnap = await get(uRef);
  if(!uSnap.exists()){
    await set(uRef, {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: Date.now()
    });
  }

  // Rol (roles en minúscula). Fallback por si quedó "Roles" con mayúscula.
  let rSnap = await get(ref(db, `roles/${user.uid}`));
  if(!rSnap.exists()) rSnap = await get(ref(db, `Roles/${user.uid}`));
  role = rSnap.exists() ? rSnap.val() : "usuario";
  setupByRole();

  // Planner
  initWeeks();
  buildDayTabs();
  currentStudent.value = (user.email || user.displayName || user.uid);
  await loadWeekData();
  await loadDailySummary();
});

function setupByRole(){
  qsa('.adminOnly').forEach(el=> show(el, isAdmin()));
  show(adminTools, isAdmin());
}

// ===== Semanas / Tabs =====
function weekIdFromDate(d){
  const date = d ? new Date(d) : new Date();
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((t - yearStart) / 86400000) + 1)/7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

function initWeeks(){
  weekSelect.innerHTML = '';
  const base = new Date();
  for(let i=-2;i<=3;i++){
    const d = new Date(base);
    d.setDate(d.getDate() + i*7);
    const id = weekIdFromDate(d);
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = id; if(i===0) opt.selected = true;
    weekSelect.appendChild(opt);
  }
  startDate.value = new Date().toISOString().slice(0,10);
}

weekSelect.addEventListener('change', loadWeekData);
startDate.addEventListener('change', ()=> isAdmin() && saveWeekMeta());

function buildDayTabs(){
  const days = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
  dayTabs.innerHTML = '';
  days.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'tab'+(d===currentDay?' active':'');
    b.textContent = d[0].toUpperCase()+d.slice(1);
    b.addEventListener('click', async ()=>{
      currentDay = d;
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
  const mk = (type,val,step)=>{ const i=document.createElement('input'); i.type=type; i.value=val??''; i.disabled=!editable; if(step) i.step=step; return i; };
  const iEj = mk('text', item.ejercicio);
  const iSe = mk('number', item.series, 1);
  const iRe = mk('number', item.reps, 1);
  const iTi = mk('number', item.tiempoSeg, 5);
  const iNo = mk('text', item.notas);
  const tds = [iEj,iSe,iRe,iTi,iNo].map(i=>{ const td=document.createElement('td'); td.appendChild(i); return td; });
  tr.append(...tds);
  if(editable){
    const tdA = document.createElement('td');
    const rem = document.createElement('button'); rem.className='btn danger outline'; rem.textContent='Borrar';
    rem.onclick = ()=> tr.remove();
    tdA.appendChild(rem);
    tr.append(tdA);
  }
  return tr;
}

btnAddRow.addEventListener('click', ()=> planBody.appendChild(rowTemplate({}, isAdmin())));

btnDuplicateWeek.addEventListener('click', async ()=>{
  const id = weekSelect.value;
  const dest = prompt('Duplicar esta semana hacia (ej. +1 para próxima, o YYYY-Www):', '+1');
  if(!dest) return;
  let targetId = dest;
  if(/^[-+]\d+$/.test(dest)){
    const parts = id.split('-W'); const year=+parts[0]; const wk=+parts[1]; const nw=wk+parseInt(dest,10);
    targetId = `${year}-W${String(nw).padStart(2,'0')}`;
  }
  const fromRef = ref(db, `plans/${viewedUID}/${id}`);
  const toRef = ref(db, `plans/${viewedUID}/${targetId}`);
  const snap = await get(fromRef);
  if(!snap.exists()) return toastMsg('No hay datos que duplicar.');
  await set(toRef, { ...snap.val(), updatedBy: 'Gonzalo', updatedAt: Date.now() });
  toastMsg(`Semana duplicada a ${targetId}`);
});

// Carga/guardado
async function loadWeekData(){
  const id = weekSelect.value;
  const dRef = ref(db, `plans/${viewedUID}/${id}`);
  const s = await get(dRef);
  const base = s.exists()? s.val() : null;
  if(base?.startDate) startDate.value = base.startDate;
  const userInfo = await get(ref(db, `users/${viewedUID}`));
  currentStudent.value = userInfo.val()?.email || viewedUID;

  const dayArr = base?.days?.[currentDay] || [];
  renderTable(dayArr, isAdmin());
}

function renderTable(items=[], editable=false){
  planBody.innerHTML='';
  if(items.length===0 && editable){ planBody.appendChild(rowTemplate({}, true)); return; }
  items.forEach(it=> planBody.appendChild(rowTemplate(it, editable)));
}

btnSavePlan.addEventListener('click', async ()=>{
  const id = weekSelect.value;
  const rows = [...planBody.querySelectorAll('tr')].map(tr=>{
    const [ej,se,re,ti,no] = [...tr.querySelectorAll('input')].map(i=>i.value);
    return { ejercicio:ej, series:+se||0, reps:+re||0, tiempoSeg:+ti||0, notas:no };
  });

  const dRef = ref(db, `plans/${viewedUID}/${id}`);
  const s = await get(dRef);
  const prev = s.exists()? s.val() : { days:{} };

  const payload = {
    startDate: startDate.value || todayISO(),
    updatedBy: "Gonzalo", updatedAt: Date.now(),
    days: { ...prev.days, [currentDay]: rows }
  };
  await set(dRef, payload);
  toastMsg('Semana guardada ✔');
});

async function saveWeekMeta(){
  if(!isAdmin()) return;
  const id = weekSelect.value;
  await update(ref(db, `plans/${viewedUID}/${id}`), { startDate: startDate.value || todayISO(), updatedBy: 'Gonzalo', updatedAt: Date.now() });
}

// ===== Buscar usuario (admin) =====
btnSearchUser.addEventListener('click', async ()=>{
  results.innerHTML = 'Buscando...';
  const all = await get(ref(db, 'users'));
  const list = [];
  if(all.exists()){
    const obj = all.val();
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
    const div = document.createElement('div'); div.className='result-item';
    div.innerHTML = `<div><b>${u.email}</b><br><span class="muted">${u.name} · ${u.uid}</span></div>`;
    const b = document.createElement('button'); b.className='btn'; b.textContent='Ver plan';
    b.onclick = async ()=>{ viewedUID=u.uid; currentStudent.value = u.email || u.name || u.uid; await loadWeekData(); toastMsg('Cargando plan del alumno'); };
    div.appendChild(b); results.appendChild(div);
  });
});

// ===== Resumen Diario =====
async function loadDailySummary(){
  const key = todayISO();
  const s = await get(ref(db, `dailySummary/${currentUID}/${key}`));
  const t = qs('#dailyText');
  t.value = s.exists()? (s.val().text || '') : '';
}
btnSaveDaily.addEventListener('click', async ()=>{
  const key = todayISO();
  await set(ref(db, `dailySummary/${currentUID}/${key}`), { text: dailyText.value.slice(0,500), savedAt: Date.now() });
  toastMsg('Resumen guardado ✔');
});

// ===== Cronómetro =====
let timer=null, elapsed=0, target=0;
function renderClock(){ const mm=Math.floor(elapsed/60), ss=elapsed%60; display.textContent=`${fmt(mm)}:${fmt(ss)}`; if(target>0 && elapsed>=target){ display.style.animation='blink .8s steps(2,end) 6'; setTimeout(()=>display.style.animation='',5000); } }
startBtn.addEventListener('click', ()=>{ if(timer) return; target=Math.max(0, parseInt(targetSec.value||'0',10)); timer=setInterval(()=>{elapsed++;renderClock();},1000); });
pauseBtn.addEventListener('click', ()=>{ clearInterval(timer); timer=null; });
timerResetBtn.addEventListener('click', ()=>{ clearInterval(timer); timer=null; elapsed=0; renderClock(); });
renderClock();
