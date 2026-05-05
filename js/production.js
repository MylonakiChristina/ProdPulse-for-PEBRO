/* ============================================
   PRODUCTION MANAGER SCREEN
============================================ */
let currentProdHistPeriod = 'day';

function setupProductionScreen(){
  currentProdHistPeriod = 'day';
  renderProductionMonitor();
  renderProductionHistory();
  if(monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(()=>{
    sharedState = loadState();
    renderProductionMonitor();
    renderProductionHistory();
  }, 1000);
}

function switchProdHistTab(period, btn){
  currentProdHistPeriod = period;
  document.querySelectorAll('#screen-production .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderProductionHistory();
}

function renderProductionHistory(){
  const filterEl = document.getElementById('prodHistFilter');
  if(!filterEl) return;
  const filter = filterEl.value;
  const now = Date.now();
  const periodMs = currentProdHistPeriod==='day' ? 86400000 :
                   currentProdHistPeriod==='week' ? 7*86400000 : 30*86400000;
  const since = now - periodMs;

  // Combine completed entries with currently-active sessions, so the production manager
  // sees both finished and in-progress work.
  let list = sharedState.productionEntries
    .filter(e => e.completedAt >= since)
    .map(e => ({...e, _state: e.incomplete?'incomplete':'completed', _ts: e.completedAt}));
  (sharedState.activeProductions||[]).forEach(p=>{
    list.push({
      machine: p.machine,
      operator: p.operator,
      order: p.order,
      piecesTarget: p.piecesTarget,
      expectedPieces: p.expectedPieces||0,
      duration: p.elapsedSeconds||0,
      deadTime: p.deadTimeSeconds||0,
      _state: p.status==='malfunction' ? 'malfunction' : p.status==='paused' ? 'paused' : 'running',
      _ts: p.startTime||now
    });
  });
  if(filter){ list = list.filter(e => e.machine === filter); }
  list = list.sort((a,b)=>b._ts - a._ts);

  const tbody = document.getElementById('prodHistTableBody');
  if(!tbody) return;
  if(list.length===0){
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--gray-mid);">Δεν υπάρχουν εργασίες για την επιλεγμένη περίοδο.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(e=>{
    let badge;
    switch(e._state){
      case 'completed':   badge = '<span class="badge badge-resolved">Ολοκληρωμένη</span>'; break;
      case 'incomplete':  badge = '<span class="badge badge-pending">Ημιτελής</span>'; break;
      case 'running':     badge = '<span class="badge" style="background:#E8F5E9;color:#2E7D32;">Σε εξέλιξη</span>'; break;
      case 'paused':      badge = '<span class="badge" style="background:#FFF8E1;color:#F57F17;">Παύση</span>'; break;
      case 'malfunction': badge = '<span class="badge badge-active">Βλάβη</span>'; break;
      default:            badge = '<span class="badge">—</span>';
    }
    return `<tr>
      <td>${new Date(e._ts).toLocaleString('el-GR')}</td>
      <td>${e.machine}</td>
      <td>${e.operator}</td>
      <td>${e.order||'—'}</td>
      <td>${e.piecesTarget||0}</td>
      <td>${e.expectedPieces||0}</td>
      <td>${formatTime(e.duration||0)}</td>
      <td>${formatTime(e.deadTime||0)}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

function downloadProductionHistory(){
  const filterEl = document.getElementById('prodHistFilter');
  const filter = filterEl ? filterEl.value : '';
  const periodName = currentProdHistPeriod==='day'?'Ημέρα':currentProdHistPeriod==='week'?'Εβδομάδα':'Μήνας';
  const periodMs = currentProdHistPeriod==='day' ? 86400000 :
                   currentProdHistPeriod==='week' ? 7*86400000 : 30*86400000;
  const since = Date.now() - periodMs;
  let list = sharedState.productionEntries
    .filter(e => e.completedAt >= since)
    .map(e => ({...e, _state: e.incomplete?'Ημιτελής':'Ολοκληρωμένη', _ts: e.completedAt}));
  (sharedState.activeProductions||[]).forEach(p=>{
    list.push({
      machine: p.machine, operator: p.operator, order: p.order,
      piecesTarget: p.piecesTarget, expectedPieces: p.expectedPieces||0,
      duration: p.elapsedSeconds||0, deadTime: p.deadTimeSeconds||0,
      _state: p.status==='malfunction'?'Βλάβη':p.status==='paused'?'Παύση':'Σε εξέλιξη',
      _ts: p.startTime||Date.now()
    });
  });
  if(filter){ list = list.filter(e => e.machine === filter); }
  list = list.sort((a,b)=>b._ts - a._ts);

  let txt = '';
  txt += '================================================================\n';
  txt += '       ΑΝΑΦΟΡΑ ΠΑΡΑΓΩΓΗΣ - ProdPulse / PEBRO\n';
  txt += '       Περίοδος: '+periodName+'\n';
  if(filter) txt += '       Φίλτρο μηχανήματος: '+filter+'\n';
  txt += '       Ημερομηνία έκδοσης: '+new Date().toLocaleString('el-GR')+'\n';
  txt += '================================================================\n\n';
  txt += 'Σύνολο εγγραφών: '+list.length+'\n\n';

  if(list.length===0){
    txt += '(Δεν υπάρχουν εργασίες για την επιλεγμένη περίοδο.)\n';
  } else {
    let totalDur=0, totalDead=0, totalPieces=0;
    list.forEach((e,i)=>{
      totalDur+=(e.duration||0); totalDead+=(e.deadTime||0); totalPieces+=(e.expectedPieces||0);
      txt += '----------------------------------------------------------------\n';
      txt += 'ΕΓΓΡΑΦΗ #'+(i+1)+'\n';
      txt += '----------------------------------------------------------------\n';
      txt += '  Ημερομηνία     : '+new Date(e._ts).toLocaleString('el-GR')+'\n';
      txt += '  Μηχάνημα       : '+e.machine+'\n';
      txt += '  Χειριστής      : '+e.operator+'\n';
      txt += '  Παραγγελία     : '+(e.order||'—')+'\n';
      txt += '  Στόχος Τεμαχίων: '+(e.piecesTarget||0)+'\n';
      txt += '  Παραχθέντα     : '+(e.expectedPieces||0)+'\n';
      txt += '  Διάρκεια       : '+formatTime(e.duration||0)+'\n';
      txt += '  Νεκρός Χρόνος  : '+formatTime(e.deadTime||0)+'\n';
      txt += '  Κατάσταση      : '+e._state+'\n\n';
    });
    txt += '================================================================\n';
    txt += 'ΣΥΓΚΕΝΤΡΩΤΙΚΑ\n';
    txt += '================================================================\n';
    txt += '  Συνολική Διάρκεια Εργασιών: '+formatTime(totalDur)+'\n';
    txt += '  Συνολικός Νεκρός Χρόνος   : '+formatTime(totalDead)+'\n';
    txt += '  Συνολικά Παραχθέντα       : '+totalPieces+' τεμάχια\n';
    const efficiency = (totalDur+totalDead)>0 ? Math.round((totalDur/(totalDur+totalDead))*100) : 0;
    txt += '  Αποδοτικότητα             : '+efficiency+'%\n';
  }
  txt += '\n================================================================\n';

  const filename = 'production_history_'+currentProdHistPeriod+(filter?'_'+filter:'')+'_'+new Date().toISOString().slice(0,10)+'.txt';
  triggerDownload(filename, txt, 'text/plain');
}

function renderProductionMonitor(){
  const monitor = document.getElementById('productionMonitor');
  const active = sharedState.activeProductions;
  if(active.length===0){
    monitor.innerHTML = `<div class="info-msg">Δεν υπάρχουν ενεργές παραγωγές αυτή τη στιγμή.</div>`;
  }else{
    monitor.innerHTML = active.map(p=>{
      const cls = p.status==='malfunction'?'malfunction':p.status==='paused'?'paused':'';
      const statusText = p.status==='malfunction'?'⚠ ΒΛΑΒΗ':p.status==='paused'?'⏸ Παύση':'● Σε λειτουργία';
      const statusColor = p.status==='malfunction'?'#FFEBEE;color:#D32F2F':p.status==='paused'?'#FFF8E1;color:#F57F17':'#E8F5E9;color:#2E7D32';
      return `
        <div class="monitor-card ${cls}">
          <h4>${p.machine}</h4>
          <div class="status" style="background:${statusColor.split(';')[0]};color:${statusColor.split(';color:')[1]};">${statusText}</div>
          <div class="timer-mini">${formatTime(p.elapsedSeconds||0)}</div>
          <div class="info"><strong>Χειριστής:</strong> ${p.operator}</div>
          <div class="info"><strong>Παραγγελία:</strong> ${p.order}</div>
          <div class="info"><strong>Στόχος:</strong> ${p.piecesTarget} τεμάχια</div>
          <div class="info"><strong>Αναμενόμενα:</strong> ${p.expectedPieces||0} τεμάχια</div>
          <div class="info"><strong>Νεκρός χρόνος:</strong> ${formatTime(p.deadTimeSeconds||0)}</div>
        </div>
      `;
    }).join('');
  }
  // Stats
  const stats = computeProductionStats();
  document.getElementById('productionStats').innerHTML = `
    <div class="kpi-card">
      <div class="label">Ενεργές Παραγωγές</div>
      <div class="value">${stats.activeCount}</div>
      <div class="sub">Μηχανήματα σε λειτουργία</div>
    </div>
    <div class="kpi-card">
      <div class="label">Ολοκληρωμένες Σήμερα</div>
      <div class="value">${stats.completedToday}</div>
      <div class="sub">Παραγγελίες</div>
    </div>
    <div class="kpi-card">
      <div class="label">Συνολικός Νεκρός Χρόνος</div>
      <div class="value">${stats.totalDeadTime}</div>
      <div class="sub">Όλες οι ενεργές βάρδιες</div>
    </div>
    <div class="kpi-card">
      <div class="label">Ενεργές Βλάβες</div>
      <div class="value" style="color:var(--red);">${stats.activeMalfunctions}</div>
      <div class="sub">Σε εκκρεμότητα</div>
    </div>
    <div class="kpi-card">
      <div class="label">Εκτιμώμενη Απόδοση</div>
      <div class="value">${stats.efficiency}%</div>
      <div class="sub">Παραγωγικός χρόνος / Συνολικός</div>
    </div>
    <div class="kpi-card">
      <div class="label">Συνολικά Τεμάχια Σήμερα</div>
      <div class="value">${stats.totalPieces}</div>
      <div class="sub">Αναμενόμενα</div>
    </div>
  `;
}

function computeProductionStats(){
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const completed = sharedState.productionEntries.filter(e=>e.completedAt>=todayStart.getTime());
  let totalProductive = 0, totalDead = 0, totalPieces=0;
  sharedState.activeProductions.forEach(p=>{
    totalProductive += (p.elapsedSeconds||0);
    totalDead += (p.deadTimeSeconds||0);
    totalPieces += (p.expectedPieces||0);
  });
  completed.forEach(e=>{
    totalProductive += e.duration;
    totalDead += e.deadTime;
    totalPieces += e.expectedPieces;
  });
  const total = totalProductive + totalDead;
  const eff = total>0 ? Math.round((totalProductive/total)*100) : 0;
  return {
    activeCount: sharedState.activeProductions.length,
    completedToday: completed.length,
    totalDeadTime: formatTime(totalDead),
    activeMalfunctions: sharedState.malfunctions.filter(m=>m.status==='pending'||m.status==='repairing').length,
    efficiency: eff,
    totalPieces: totalPieces
  };
}

