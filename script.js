// --- Data & Config ---
const HISTORY_KEY = "myanmar_meter_history";
const SETTINGS_KEY = "myanmar_meter_settings";

const DEFAULT_APPLIANCES = [
  { id: "ac", name: "အဲကွန်း (1HP)", watts: 900, icon: "❄️" },
  { id: "fridge", name: "ရေခဲသေတ္တာ", watts: 150, icon: "🍦" },
  { id: "tv", name: "တီဗွီ", watts: 100, icon: "📺" },
  { id: "rice", name: "ထမင်းချက်အိုး", watts: 700, icon: "🍚" },
  { id: "iron", name: "မီးပူ", watts: 1000, icon: "👔" },
  { id: "bulb", name: "မီးသီး", watts: 12, icon: "💡" },
];

// Global State
let appliances = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || [...DEFAULT_APPLIANCES];
let inputMode = 'readings'; // readings, units, appliances
let applianceData = {}; // { id: { qty: 0, hours: 0 } }

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderAppliances();
    renderSettings();
    loadHistory();
});

// --- Logic Functions ---
function calculateMyanmarBill(units) {
    let totalCost = 0;
    const tiers = [];
    const serviceFee = 1000; // Assuming home meter

    // Logic from your index.tsx
    if (units <= 50) {
        const cost = units * 50;
        totalCost = cost;
        tiers.push({ label: "၁ - ၅၀", rate: 50, cost, color: "#4ADE80" });
    } else if (units <= 100) {
        const c1 = 50 * 50;
        const c2 = (units - 50) * 100;
        totalCost = c1 + c2;
        tiers.push({ label: "၁ - ၅၀", rate: 50, cost: c1, color: "#4ADE80" });
        tiers.push({ label: "၅၁ - ၁၀၀", rate: 100, cost: c2, color: "#FACC15" });
    } else if (units <= 200) {
        const c1 = 50 * 50; const c2 = 50 * 100; const c3 = (units - 100) * 150;
        totalCost = c1 + c2 + c3;
        tiers.push({ label: "၁-၅၀", rate: 50, cost: c1, color: "#4ADE80" });
        tiers.push({ label: "၅၁-၁၀၀", rate: 100, cost: c2, color: "#FACC15" });
        tiers.push({ label: "၁၀၁-၂၀၀", rate: 150, cost: c3, color: "#FB923C" });
    } else {
        const c1 = 50 * 50; const c2 = 50 * 100; const c3 = 100 * 150; const c4 = (units - 200) * 250;
        totalCost = c1 + c2 + c3 + c4;
        tiers.push({ label: "၁-၅၀", rate: 50, cost: c1, color: "#4ADE80" });
        tiers.push({ label: "၅၁-၁၀၀", rate: 100, cost: c2, color: "#FACC15" });
        tiers.push({ label: "၁၀၁-၂၀၀", rate: 150, cost: c3, color: "#FB923C" });
        tiers.push({ label: "၂၀၁ အထက်", rate: 250, cost: c4, color: "#F87171" });
    }

    return { totalUnits: units, totalCost, serviceFee, grandTotal: totalCost + serviceFee, tiers };
}

function calculate() {
    let units = 0;
    
    if (inputMode === 'readings') {
        const prev = parseInt(document.getElementById('prevReading').value) || 0;
        const curr = parseInt(document.getElementById('currReading').value) || 0;
        units = curr - prev;
    } else if (inputMode === 'units') {
        units = parseInt(document.getElementById('directUnits').value) || 0;
    } else {
        // Appliance Calc
        units = Math.round(appliances.reduce((acc, app) => {
            const data = applianceData[app.id] || { qty: 0, hours: 0 };
            return acc + (app.watts * data.qty * data.hours * 30) / 1000;
        }, 0));
    }

    if (units <= 0 && inputMode !== 'appliances') {
        alert("ယူနစ်အရေအတွက် မှားယွင်းနေပါသည်");
        return;
    }

    const result = calculateMyanmarBill(units);
    showResult(result);
    saveHistory(result);
}

// --- UI Updates ---

function switchMode(mode) {
    inputMode = mode;
    // Hide all
    document.querySelectorAll('.mode-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected
    document.getElementById(`mode-${mode}`).classList.remove('hidden');
    document.getElementById(`btn-${mode}`).classList.add('active');
    
    // Hide Result
    document.getElementById('result-area').style.display = 'none';
}

function showResult(data) {
    const area = document.getElementById('result-area');
    area.style.display = 'block';
    
    document.getElementById('res-total').innerText = `${data.grandTotal.toLocaleString()} ကျပ်`;
    document.getElementById('res-sub').innerText = `ယူနစ်: ${data.totalUnits} | လစဉ်ကြေး: ${data.serviceFee} ကျပ်`;
    
    const breakdown = document.getElementById('tier-breakdown');
    breakdown.innerHTML = '';
    
    data.tiers.forEach(t => {
        breakdown.innerHTML += `
            <div class="tier-row">
                <div class="dot" style="background-color: ${t.color}"></div>
                <span>${t.label} (x${t.rate})</span>
                <span class="tier-cost">${t.cost.toLocaleString()}</span>
            </div>
        `;
    });
}

// --- Appliances UI ---
function renderAppliances() {
    const list = document.getElementById('appliance-list');
    list.innerHTML = '';
    
    appliances.forEach(app => {
        // Init data if not exists
        if (!applianceData[app.id]) applianceData[app.id] = { qty: 0, hours: 0 };
        
        const div = document.createElement('div');
        div.className = 'app-item';
        div.innerHTML = `
            <div class="app-header">
                <span class="app-icon">${app.icon}</span>
                <div>
                    <div style="font-weight:bold">${app.name}</div>
                    <div style="font-size:12px; color:#9CA3AF">${app.watts}W</div>
                </div>
            </div>
            <div class="app-controls">
                <div class="counter">
                    <button class="count-btn" onclick="updateAppQty('${app.id}', -1)">-</button>
                    <span class="count-val" id="qty-${app.id}">0</span>
                    <button class="count-btn" onclick="updateAppQty('${app.id}', 1)">+</button>
                    <span style="font-size:12px; margin-left:5px; color:#9CA3AF">ခု</span>
                </div>
                <div style="display:flex; align-items:center">
                    <input type="number" class="hour-input" placeholder="0" oninput="updateAppHours('${app.id}', this.value)">
                    <span style="font-size:12px; margin-left:5px; color:#9CA3AF">( နာရီ )</span>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function updateAppQty(id, change) {
    if (!applianceData[id]) applianceData[id] = { qty: 0, hours: 0 };
    const newQty = Math.max(0, applianceData[id].qty + change);
    applianceData[id].qty = newQty;
    document.getElementById(`qty-${id}`).innerText = newQty;
}

function updateAppHours(id, val) {
    if (!applianceData[id]) applianceData[id] = { qty: 0, hours: 0 };
    applianceData[id].hours = parseInt(val) || 0;
}

// --- History & Settings ---

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('open');
    if (id === 'historyModal') loadHistory();
    if (id === 'settingsModal') renderSettings();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function saveHistory(result) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const entry = {
        date: new Date().toLocaleDateString(),
        units: result.totalUnits,
        total: result.grandTotal
    };
    history.unshift(entry); // Add to top
    if (history.length > 20) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    list.innerHTML = '';
    
    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#666">မှတ်တမ်း မရှိသေးပါ</p>';
        return;
    }

    history.forEach(h => {
        list.innerHTML += `
            <div class="history-item">
                <div style="font-size:12px; color:#9CA3AF">${h.date}</div>
                <div style="font-weight:bold; margin-top:4px;">${h.units} ယူနစ် = ${h.total.toLocaleString()} ကျပ်</div>
            </div>
        `;
    });
}

function renderSettings() {
    const list = document.getElementById('settings-list');
    list.innerHTML = '';
    appliances.forEach(app => {
        list.innerHTML += `
            <div class="setting-row">
                <div style="display:flex; align-items:center">
                    <span style="font-size:20px; margin-right:10px">${app.icon}</span>
                    <span style="font-weight:bold; font-size:14px">${app.name}</span>
                </div>
                <div style="display:flex; align-items:center">
                    <input type="number" class="setting-input" value="${app.watts}" onchange="updateWatt('${app.id}', this.value)">
                    <span style="font-size:12px; margin-left:5px; color:#9CA3AF">W</span>
                </div>
            </div>
        `;
    });
}

function updateWatt(id, val) {
    const newWatt = parseInt(val) || 0;
    appliances = appliances.map(app => app.id === id ? {...app, watts: newWatt} : app);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appliances));
    renderAppliances(); // Re-render main list to update displayed watts
}

function resetSettings() {
    if(confirm("မူလအတိုင်း ပြန်ထားမလား?")) {
        appliances = [...DEFAULT_APPLIANCES];
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appliances));
        renderSettings();
        renderAppliances();
    }
}