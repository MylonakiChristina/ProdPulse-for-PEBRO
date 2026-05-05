/* ============================================
   CEO SCREEN
============================================ */
function setupCEOScreen(){
  currentKPIPeriod = 'day';
  renderCEOKPIs();
}

function switchKPITab(period, btn){
  currentKPIPeriod = period;
  document.querySelectorAll('#screen-ceo .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderCEOKPIs();
}

function renderCEOKPIs(){
  const now = Date.now();
  const periodMs = currentKPIPeriod==='day' ? 86400000 : currentKPIPeriod==='week' ? 7*86400000 : 30*86400000;
  const since = now - periodMs;

  const malfs = sharedState.malfunctions.filter(m => new Date(m.time).getTime()>=since);
  const completed = sharedState.productionEntries.filter(e=>e.completedAt>=since);
  const autonomous = sharedState.completedAutoWork.filter(a=>a.completedAt>=since);

  let totalProductive = 0, totalDead = 0, totalPieces=0, totalDefective=0;
  completed.forEach(e=>{
    totalProductive += (e.duration||0);
    totalDead += (e.deadTime||0);
    totalPieces += (e.expectedPieces||0);
  });
  // Include active (in-progress) productions so the manager sees current numbers,
  // not just completed ones. This is the fix for "dead time cost shows 0".
  (sharedState.activeProductions||[]).forEach(p=>{
    totalProductive += (p.elapsedSeconds||0);
    totalDead += (p.deadTimeSeconds||0);
    totalPieces += (p.expectedPieces||0);
  });
  // Add malfunction dead time only for resolved malfunctions (otherwise we'd double-count
  // the operator's session dead time which is already increasing while waiting for repair).
  malfs.forEach(m=>{
    if(m.status==='resolved'){ totalDead += (m.deadTime||0); }
  });

  // Defective from autonomous justifications
  autonomous.forEach(a=>{
    if(a.justification==='Σκάρτα' && a.deviation<0){ totalDefective += Math.abs(a.deviation); }
  });

  const totalTime = totalProductive + totalDead;
  const productivity = totalTime>0 ? Math.round((totalProductive/totalTime)*100) : 0;
  const defectivePct = totalPieces>0 ? ((totalDefective/(totalPieces||1))*100).toFixed(1) : '0.0';
  // Total malfunction cost = repair cost + collaboration cost (uses m.totalCost when available)
  const totalCost = malfs.reduce((s,m)=>{
    const c = (m.totalCost!==undefined && m.totalCost!==null)
      ? Number(m.totalCost)
      : (Number(m.cost)||0) + (Number(m.externalCost)||0);
    return s + (isNaN(c) ? 0 : c);
  }, 0).toFixed(2);
  // Labor cost of dead time: 15€/hour. Show with 2 decimals so even a few seconds appear.
  const laborCost = ((totalDead/3600)*15).toFixed(2);
  // Delays per department (= per machine)
  const delaysPerMachine = {};
  malfs.forEach(m=>{
    delaysPerMachine[m.machine] = (delaysPerMachine[m.machine]||0) + (m.deadTime||0);
  });
  const autoOps = new Set(autonomous.map(a=>a.completedBy)).size;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="label">Παραγωγικότητα Βάρδιας</div>
      <div class="value">${productivity}%</div>
      <div class="sub">Ωφέλιμος χρόνος / Συνολικός</div>
    </div>
    <div class="kpi-card">
      <div class="label">Ποσοστό Σκάρτων</div>
      <div class="value">${defectivePct}%</div>
      <div class="sub">${totalDefective} ελαττωματικά τεμάχια</div>
    </div>
    <div class="kpi-card">
      <div class="label">Συνολικός Νεκρός Χρόνος</div>
      <div class="value">${formatTime(totalDead)}</div>
      <div class="sub">Από βλάβες & παύσεις</div>
    </div>
    <div class="kpi-card">
      <div class="label">Κόστος Νεκρού Χρόνου</div>
      <div class="value">${laborCost} €</div>
      <div class="sub">Βάσει εργατοωρών (15€/ώρα)</div>
    </div>
    <div class="kpi-card">
      <div class="label">Κόστος Βλαβών</div>
      <div class="value">${totalCost} €</div>
      <div class="sub">${malfs.length} καταγραφές</div>
    </div>
    <div class="kpi-card">
      <div class="label">Χειριστές Αυτόνομων</div>
      <div class="value">${autoOps}</div>
      <div class="sub">${autonomous.length} καταχωρήσεις</div>
    </div>
  `;

  // Detail table
  const rows = [
    ['Συνολική Παραγωγικότητα', productivity+'%', productivity>75?'Καλό επίπεδο':productivity>50?'Μέτριο - χρειάζεται προσοχή':'Χαμηλό - απαιτείται παρέμβαση'],
    ['Ποσοστό Σκάρτων Υλικών', defectivePct+'%', parseFloat(defectivePct)<5?'Εντός ορίων':'Χρειάζεται έρευνα προμηθευτή'],
    ['Καθυστερήσεις ανά Τμήμα', Object.keys(delaysPerMachine).length+' μηχανήματα', Object.entries(delaysPerMachine).map(([k,v])=>`${k}: ${formatTime(v)}`).join(', ') || 'Καμία'],
    ['Εκτιμώμενο Κόστος Νεκρού Χρόνου', laborCost+' €', 'Βάση 15€/εργατοώρα'],
    ['Καταχωρήσεις Αυτόνομων Μηχανημάτων', autonomous.length, autoOps+' διαφορετικοί χειριστές'],
    ['Συνολικός Αριθμός Βλαβών', malfs.length, malfs.filter(m=>m.externalPartner==='Ναι').length+' απαίτησαν εξωτερική υποστήριξη'],
    ['Ολοκληρωμένες Παραγγελίες', completed.length, totalPieces+' συνολικά τεμάχια']
  ];
  document.getElementById('kpiDetailBody').innerHTML = rows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
}

function downloadKPIReport(){
  const now = Date.now();
  const periodMs = currentKPIPeriod==='day' ? 86400000 : currentKPIPeriod==='week' ? 7*86400000 : 30*86400000;
  const periodName = currentKPIPeriod==='day'?'Ημέρα':currentKPIPeriod==='week'?'Εβδομάδα':'Μήνας';
  const since = now - periodMs;

  let txt = `========================================\n`;
  txt += `ΑΝΑΦΟΡΑ KPIs - ProdPulse / PEBRO\n`;
  txt += `Περίοδος: ${periodName}\n`;
  txt += `Ημερομηνία: ${new Date().toLocaleString('el-GR')}\n`;
  txt += `========================================\n\n`;

  const malfs = sharedState.malfunctions.filter(m=>new Date(m.time).getTime()>=since);
  const completed = sharedState.productionEntries.filter(e=>e.completedAt>=since);

  let totalProductive=0, totalDead=0, totalPieces=0;
  completed.forEach(e=>{
    totalProductive+=(e.duration||0); totalDead+=(e.deadTime||0); totalPieces+=(e.expectedPieces||0);
  });
  (sharedState.activeProductions||[]).forEach(p=>{
    totalProductive+=(p.elapsedSeconds||0); totalDead+=(p.deadTimeSeconds||0); totalPieces+=(p.expectedPieces||0);
  });
  malfs.forEach(m=>{ if(m.status==='resolved'){ totalDead+=(m.deadTime||0); } });
  const totalTime = totalProductive+totalDead;
  const productivity = totalTime>0?Math.round((totalProductive/totalTime)*100):0;
  const sumCost = key => malfs.reduce((s,m)=>s+(Number(m[key])||0),0);
  const repairOnlyCost = sumCost('cost').toFixed(2);
  const collabCost = sumCost('externalCost').toFixed(2);
  const totalCost = malfs.reduce((s,m)=>{
    const c = (m.totalCost!==undefined && m.totalCost!==null)
      ? Number(m.totalCost)
      : (Number(m.cost)||0) + (Number(m.externalCost)||0);
    return s + (isNaN(c) ? 0 : c);
  }, 0).toFixed(2);
  const laborCost = ((totalDead/3600)*15).toFixed(2);

  txt += `ΒΑΣΙΚΟΙ ΔΕΙΚΤΕΣ:\n`;
  txt += `- Συνολική Παραγωγικότητα: ${productivity}%\n`;
  txt += `- Συνολικός Νεκρός Χρόνος: ${formatTime(totalDead)}\n`;
  txt += `- Κόστος Νεκρού Χρόνου: ${laborCost} €\n`;
  txt += `- Κόστος Επισκευών: ${repairOnlyCost} €\n`;
  txt += `- Κόστος Συνεργασιών: ${collabCost} €\n`;
  txt += `- Συνολικό Κόστος Βλαβών: ${totalCost} €\n`;
  txt += `- Ολοκληρωμένες Παραγγελίες: ${completed.length}\n`;
  txt += `- Συνολικά Τεμάχια: ${totalPieces}\n`;
  txt += `- Αριθμός Βλαβών: ${malfs.length}\n\n`;

  txt += `ΑΝΑΛΥΤΙΚΑ ΒΛΑΒΕΣ:\n`;
  malfs.forEach(m=>{
    const rc = (Number(m.cost)||0).toFixed(2);
    const ec = (Number(m.externalCost)||0).toFixed(2);
    const tc = ((m.totalCost!==undefined&&m.totalCost!==null) ? Number(m.totalCost) : ((Number(m.cost)||0)+(Number(m.externalCost)||0))).toFixed(2);
    txt += `  • ${m.machine} | ${m.operator} | ${new Date(m.time).toLocaleString('el-GR')} | ${m.repairCategory||m.category} | ${formatTime(m.deadTime||0)} | Επισκευή: ${rc}€ | Συνεργασία: ${ec}€ | Σύνολο: ${tc}€\n`;
  });
  if(malfs.length===0) txt += `  (Καμία βλάβη)\n`;
  txt += `\n========================================\n`;

  const filename = 'kpi_report_'+currentKPIPeriod+'_'+new Date().toISOString().slice(0,10)+'.txt';
  triggerDownload(filename, txt, 'text/plain');
}

/* ============================================
   INITIALIZATION
============================================ */
window.addEventListener('DOMContentLoaded', ()=>{
  // Reload state on focus to sync between tabs / role switches
  window.addEventListener('focus', ()=>{
    sharedState = loadState();
    if(currentUser){
      if(currentUser.role==='technical'){ renderTechActiveAlert(); renderMalfunctionHistory(); }
      else if(currentUser.role==='production'){ renderProductionMonitor(); }
      else if(currentUser.role==='ceo'){ renderCEOKPIs(); }
      else if(currentUser.role==='operator'){ checkResolvedMalfunctions(); }
    }
  });
});
