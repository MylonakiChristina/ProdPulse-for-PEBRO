/* ============================================
   OPERATOR SCREEN
============================================ */
function setupOperatorScreen(){
  // Full UI reset
  resetOperatorUI();

  // Check for pending automatic work
  if(sharedState.pendingAutoWork){
    const p = sharedState.pendingAutoWork;
    const box = document.getElementById('pendingAutoBox');
    box.style.display='block';
    document.getElementById('pendingAutoContent').innerHTML = `
      <p style="margin-bottom:10px;">Από τον/την <strong>${p.operator}</strong> εκκρεμεί η συμπλήρωση των στοιχείων από την αυτόματη λειτουργία:</p>
      <ul style="margin-left:20px;margin-bottom:14px;">
        <li>Μηχάνημα: <strong>${p.machine}</strong></li>
        <li>Παραγγελία: <strong>${p.orderNumber}</strong></li>
        <li>Τεμάχια Στόχος: <strong>${p.piecesTarget}</strong></li>
        <li>Ώρα Έναρξης: <strong>${new Date(p.startTime).toLocaleString('el-GR')}</strong></li>
      </ul>
      <button class="btn btn-primary" onclick="openAutoCompletion()">Συμπλήρωση Στοιχείων</button>
    `;
  }else{
    document.getElementById('pendingAutoBox').style.display='none';
  }

  // Check for resolved malfunctions on entry
  checkResolvedMalfunctions();

  // Start polling for resolved malfunctions in real-time (every 2s)
  if(monitorInterval){ clearInterval(monitorInterval); }
  monitorInterval = setInterval(()=>{
    sharedState = loadState();
    checkResolvedMalfunctions();
  }, 2000);
}

// Full DOM/UI reset for operator screen — used on login & logout
function resetOperatorUI(){
  // Stop any running production timer
  if(opState.timerInterval){ clearInterval(opState.timerInterval); opState.timerInterval=null; }

  // Reset operational state object
  opState = resetOpState();

  // Reset notification boxes
  const opMsgs = document.getElementById('operatorMessages');
  if(opMsgs) opMsgs.innerHTML = '';
  const pendBox = document.getElementById('pendingAutoBox');
  if(pendBox) pendBox.style.display = 'none';
  const resBox = document.getElementById('resolvedMalfunctionBox');
  if(resBox) resBox.style.display = 'none';

  // Clear any inline field errors
  clearAllFieldErrors();

  // Reset selects & checkboxes
  const ms = document.getElementById('machineSelect'); if(ms) ms.value = '';
  const am = document.getElementById('autoModeCheck'); if(am) am.checked = false;
  const asb = document.getElementById('autoSetupBox'); if(asb) asb.style.display = 'none';
  const mob = document.getElementById('manualOperationBox'); if(mob) mob.style.display = 'block';

  // Reset auto-mode inputs
  const autoMach = document.getElementById('autoMachine'); if(autoMach) autoMach.value = '';
  const autoOrd = document.getElementById('autoOrderNumber'); if(autoOrd) autoOrd.value = '';
  const autoPcs = document.getElementById('autoPiecesTarget'); if(autoPcs) autoPcs.value = '';

  // Reset manual inputs
  const ord = document.getElementById('orderNumber'); if(ord) ord.value = '';
  const pcs = document.getElementById('piecesNumber'); if(pcs) pcs.value = '';
  const est = document.getElementById('estTimePerPiece'); if(est) est.value = '';

  // Reset timer display
  const td = document.getElementById('timerDisplay'); if(td) td.textContent = '00:00:00';
  const ep = document.getElementById('expectedPieces'); if(ep) ep.textContent = '0';
  const dd = document.getElementById('deadTimeDisplay'); if(dd) dd.textContent = '00:00:00';
  const sb = document.getElementById('statusBadge'); if(sb) sb.innerHTML = '';

  // Reset action buttons to initial state (all enabled - validation happens in handlers)
  const bSetup = document.getElementById('btnSetup'); if(bSetup) bSetup.disabled = false;
  const bStart = document.getElementById('btnStart'); if(bStart) bStart.disabled = false;
  const bPause = document.getElementById('btnPause'); if(bPause) bPause.disabled = false;
  const bMf = document.getElementById('btnMalfunction'); if(bMf) bMf.disabled = false;
  const bComp = document.getElementById('btnComplete'); if(bComp) bComp.disabled = false;
  const bEndP = document.getElementById('btnEndPause'); if(bEndP) bEndP.style.display = 'none';

  // Close any open modal
  const pm = document.getElementById('pauseModal'); if(pm) pm.classList.remove('active');
  const acm = document.getElementById('autoCompleteModal'); if(acm) acm.classList.remove('active');
}

function onMachineChange(){
  opState.selectedMachine = document.getElementById('machineSelect').value;
  if(opState.selectedMachine){ clearFieldError('machine'); }
  // The manual operation box is always visible inside the unified card.
  // We only need to keep the auto-mode machine input in sync.
  if(opState.isAutoMode){
    document.getElementById('autoMachine').value = opState.selectedMachine || '';
  }
}

function onAutoModeChange(){
  opState.isAutoMode = document.getElementById('autoModeCheck').checked;
  const autoBox = document.getElementById('autoSetupBox');
  const manualBox = document.getElementById('manualOperationBox');
  if(opState.isAutoMode){
    if(!opState.selectedMachine){
      showFieldError('machine','Παρακαλώ επιλέξτε πρώτα τύπο μηχανήματος.');
      document.getElementById('autoModeCheck').checked=false;
      opState.isAutoMode=false;
      autoBox.style.display='none';
      return;
    }
    document.getElementById('autoMachine').value = opState.selectedMachine;
    autoBox.style.display='block';
    manualBox.style.display='none';
  }else{
    autoBox.style.display='none';
    manualBox.style.display='block';
  }
}

// Validates the auto-mode 6-digit order number.


function startAutomatic(){
  const order = document.getElementById('autoOrderNumber').value.trim();
  const targetRaw = document.getElementById('autoPiecesTarget').value;
  const target = parseInt(targetRaw);
  let ok = true;
  if(!order){ showFieldError('autoOrder','Συμπληρώστε αριθμό παραγγελίας.'); ok=false; }
  else if(!/^\d{6}$/.test(order)){ showFieldError('autoOrder','Ο αριθμός παραγγελίας πρέπει να είναι 6ψήφιος (μόνο αριθμοί).'); ok=false; }
  else { clearFieldError('autoOrder'); }
  if(!targetRaw){ showFieldError('autoPieces','Συμπληρώστε αριθμό τεμαχίων.'); ok=false; }
  else if(!target || target<1){ showFieldError('autoPieces','Ο αριθμός τεμαχίων πρέπει να είναι θετικός αριθμός.'); ok=false; }
  else { clearFieldError('autoPieces'); }
  if(!ok) return;
  sharedState.pendingAutoWork = {
    operator: currentUser.name,
    machine: opState.selectedMachine,
    orderNumber: order,
    piecesTarget: target,
    startTime: Date.now()
  };
  saveState();
  showOpMessage('success','Η αυτόματη λειτουργία ρυθμίστηκε. Το μηχάνημα θα συνεχίσει αυτόνομα μετά τη λήξη της βάρδιας.');
  document.getElementById('autoOrderNumber').value='';
  document.getElementById('autoPiecesTarget').value='';
  document.getElementById('autoModeCheck').checked=false;
  opState.isAutoMode=false;
  document.getElementById('autoSetupBox').style.display='none';
  document.getElementById('manualOperationBox').style.display='block';
}

function openAutoCompletion(){
  const p = sharedState.pendingAutoWork;
  if(!p) return;
  document.getElementById('autoCompleteInfo').innerHTML = `
    <strong>Μηχάνημα:</strong> ${p.machine}<br>
    <strong>Παραγγελία:</strong> ${p.orderNumber}<br>
    <strong>Στόχος:</strong> ${p.piecesTarget} τεμάχια<br>
    <strong>Έναρξη:</strong> ${new Date(p.startTime).toLocaleString('el-GR')}
  `;
  document.getElementById('autoEndTime').value = '';
  document.getElementById('autoActualPieces').value = '';
  document.getElementById('autoJustification').value = '';
  document.getElementById('autoDeviationDisplay').style.display='none';
  document.getElementById('autoCompleteModal').classList.add('active');

  document.getElementById('autoActualPieces').oninput = function(){
    const actual = parseInt(this.value)||0;
    const dev = actual - p.piecesTarget;
    const div = document.getElementById('autoDeviationDisplay');
    div.style.display='block';
    if(dev===0){
      div.innerHTML = `Απόκλιση: <strong>0 τεμάχια</strong> (Στόχος επιτεύχθηκε)`;
      div.style.background='#E8F5E9';
    }else if(dev>0){
      div.innerHTML = `Απόκλιση: <strong>+${dev} τεμάχια</strong> (Υπέρβαση στόχου)`;
      div.style.background='#E8F5E9';
    }else{
      div.innerHTML = `Απόκλιση: <strong>${dev} τεμάχια</strong> (Έλλειμμα από στόχο)`;
      div.style.background='#FFEBEE';
    }
  };
}

function submitAutoCompletion(){
  const p = sharedState.pendingAutoWork;
  if(!p) return;
  const endTime = document.getElementById('autoEndTime').value;
  const actual = parseInt(document.getElementById('autoActualPieces').value);
  const justification = document.getElementById('autoJustification').value;
  const errBox = document.getElementById('autoCompleteError');
  errBox.innerHTML = '';
  if(!endTime){ errBox.innerHTML='<div class="error-msg">Συμπληρώστε ώρα λήξης.</div>'; return; }
  if(isNaN(actual) || actual<0){ errBox.innerHTML='<div class="error-msg">Συμπληρώστε έγκυρο αριθμό τεμαχίων.</div>'; return; }
  const deviation = actual - p.piecesTarget;
  if(deviation<0 && !justification){
    errBox.innerHTML='<div class="error-msg">Έχετε έλλειμμα τεμαχίων - απαιτείται αιτιολόγηση.</div>';
    return;
  }
  // If justification is "Βλάβη", create malfunction record
  if(justification==='Βλάβη'){
    sharedState.malfunctions.push({
      id: 'MF-'+Date.now(),
      machine: p.machine,
      operator: p.operator,
      time: new Date(p.startTime + (Date.now()-p.startTime)/2).toISOString(),
      category: 'Βλάβη (Αυτόματη Λειτουργία)',
      description: 'Βλάβη που εντοπίστηκε κατά την αυτόνομη λειτουργία',
      status: 'pending',
      deadTime: 0,
      cost: 0,
      externalPartner: 'Όχι',
      autoReported: true
    });
  }
  sharedState.completedAutoWork.push({
    ...p,
    endTime: endTime,
    actualPieces: actual,
    deviation: deviation,
    justification: justification,
    completedBy: currentUser.name,
    completedAt: Date.now()
  });
  sharedState.pendingAutoWork = null;
  saveState();
  document.getElementById('autoCompleteModal').classList.remove('active');
  showOpMessage('success','Τα στοιχεία αυτόματης λειτουργίας καταχωρήθηκαν επιτυχώς.');
  setupOperatorScreen();
}

function showOpMessage(type, msg){
  const cls = type==='error'?'error-msg':type==='success'?'success-msg':'info-msg';
  document.getElementById('operatorMessages').innerHTML = `<div class="${cls}">${msg}</div>`;
  setTimeout(()=>{
    const el = document.getElementById('operatorMessages');
    if(el) el.innerHTML='';
  }, 10000);
}

// Mapping of validation field keys to (errorElementId, formGroupId)
const FIELD_MAP = {
  machine:    {errId:'machineError',    grpId:'machineGroup'},
  order:      {errId:'orderError',      grpId:'orderGroup'},
  pieces:     {errId:'piecesError',     grpId:'piecesGroup'},
  estTime:    {errId:'estTimeError',    grpId:'estTimeGroup'},
  autoOrder:  {errId:'autoOrderError',  grpId:'autoOrderGroup'},
  autoPieces: {errId:'autoPiecesError', grpId:'autoPiecesGroup'}
};

// Show inline error under a specific field; auto-clears after a delay
const _fieldErrorTimers = {};
function showFieldError(field, message){
  const map = FIELD_MAP[field]; if(!map) return;
  const errEl = document.getElementById(map.errId);
  const grpEl = document.getElementById(map.grpId);
  if(errEl){ errEl.textContent = message; errEl.classList.add('visible'); }
  if(grpEl){ grpEl.classList.add('has-error'); }
  if(_fieldErrorTimers[field]) clearTimeout(_fieldErrorTimers[field]);
  _fieldErrorTimers[field] = setTimeout(()=>clearFieldError(field), 10000);
}

function clearFieldError(field){
  const map = FIELD_MAP[field]; if(!map) return;
  const errEl = document.getElementById(map.errId);
  const grpEl = document.getElementById(map.grpId);
  if(errEl){ errEl.textContent = ''; errEl.classList.remove('visible'); }
  if(grpEl){ grpEl.classList.remove('has-error'); }
  if(_fieldErrorTimers[field]){ clearTimeout(_fieldErrorTimers[field]); delete _fieldErrorTimers[field]; }
}

function clearAllFieldErrors(){
  Object.keys(FIELD_MAP).forEach(clearFieldError);
}

// Validates that machine, 6-digit order number and piece count are all set.
// Errors are shown inline under each field. Returns true only if everything is valid.
function validateWorkInputs(){
  let ok = true;
  if(!opState.selectedMachine){
    showFieldError('machine','Παρακαλώ επιλέξτε τύπο μηχανήματος.');
    ok = false;
  } else {
    clearFieldError('machine');
  }
  const orderEl = document.getElementById('orderNumber');
  const piecesEl = document.getElementById('piecesNumber');
  const estTimeEl = document.getElementById('estTimePerPiece');
  const orderRaw = orderEl ? orderEl.value.trim() : '';
  const piecesRaw = piecesEl ? piecesEl.value : '';
  const estTimeRaw = estTimeEl ? estTimeEl.value : '';
  if(!orderRaw){
    showFieldError('order','Παρακαλώ συμπληρώστε αριθμό παραγγελίας.');
    ok = false;
  } else if(!/^\d{6}$/.test(orderRaw)){
    showFieldError('order','Ο αριθμός παραγγελίας πρέπει να είναι 6ψήφιος (μόνο αριθμοί).');
    ok = false;
  } else {
    clearFieldError('order');
  }
  const pieces = parseInt(piecesRaw);
  if(!piecesRaw){
    showFieldError('pieces','Παρακαλώ συμπληρώστε αριθμό τεμαχίων.');
    ok = false;
  } else if(!pieces || pieces<1){
    showFieldError('pieces','Ο αριθμός τεμαχίων πρέπει να είναι θετικός αριθμός.');
    ok = false;
  } else {
    clearFieldError('pieces');
  }
  const estTime = parseInt(estTimeRaw);
  if(!estTimeRaw){
    showFieldError('estTime','Παρακαλώ συμπληρώστε τον εκτιμώμενο χρόνο ανά τεμάχιο.');
    ok = false;
  } else if(isNaN(estTime) || estTime<3 || estTime>30){
    showFieldError('estTime','Ο εκτιμώμενος χρόνος πρέπει να είναι από 3 έως 30 δευτερόλεπτα.');
    ok = false;
  } else {
    clearFieldError('estTime');
  }
  if(ok){
    opState.orderNumber = orderRaw;
    opState.piecesTarget = pieces;
    opState.estTimePerPiece = estTime;
  }
  return ok;
}

/* Operation buttons */
function doSetup(){
  if(opState.isRunning){ showOpMessage('error','Η εργασία βρίσκεται ήδη σε εξέλιξη — δεν μπορείτε να ξεκινήσετε νέο setup.'); return; }
  if(opState.setupActive){ showOpMessage('info','Το setup είναι ήδη σε εξέλιξη.'); return; }
  if(!validateWorkInputs()) return;
  opState.setupActive = true;
  opState.setupStartedAt = Date.now();
  document.getElementById('btnSetup').disabled = true;
  document.getElementById('statusBadge').innerHTML = '⚙ Setup σε εξέλιξη... (νεκρός χρόνος)';
  // Start a timer that increments dead time during setup
  if(!opState.timerInterval){
    opState.timerInterval = setInterval(updateTimer, 1000);
  }
}

function doStart(){
  if(opState.isRunning){ showOpMessage('info','Η εργασία βρίσκεται ήδη σε εξέλιξη.'); return; }
  if(!validateWorkInputs()) return;

  opState.isRunning = true;
  opState.setupActive = false;
  opState.startTime = opState.startTime || Date.now();
  opState.sessionId = opState.sessionId || ('S-'+Date.now());

  // register active production
  const existing = sharedState.activeProductions.find(p=>p.sessionId===opState.sessionId);
  if(!existing){
    sharedState.activeProductions.push({
      sessionId: opState.sessionId,
      operator: currentUser.name,
      machine: opState.selectedMachine,
      order: opState.orderNumber,
      piecesTarget: opState.piecesTarget,
      startTime: Date.now(),
      status:'running'
    });
  }else{
    existing.status='running';
  }
  saveState();

  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnPause').disabled = false;
  document.getElementById('btnMalfunction').disabled = false;
  document.getElementById('btnComplete').disabled = false;
  document.getElementById('btnSetup').disabled = true;
  document.getElementById('statusBadge').innerHTML = '<span style="color:#4CAF50;">● Σε λειτουργία</span>';

  if(!opState.timerInterval){
    opState.timerInterval = setInterval(updateTimer, 1000);
  }
}

function updateTimer(){
  // While not paused/malfunction and running, increment elapsed
  if(opState.isRunning && !opState.isPaused && !opState.isMalfunction && !opState.setupActive){
    opState.elapsedSeconds++;
    // Expected pieces based on user-defined seconds per piece (3-30s, default 30 if not set)
    const secPerPiece = opState.estTimePerPiece || 30;
    opState.expectedPieces = Math.floor(opState.elapsedSeconds / secPerPiece);
  }
  if(opState.isPaused || opState.isMalfunction || opState.setupActive){
    opState.deadTimeSeconds++;
  }
  document.getElementById('timerDisplay').textContent = formatTime(opState.elapsedSeconds);
  document.getElementById('expectedPieces').textContent = opState.expectedPieces;
  document.getElementById('deadTimeDisplay').textContent = formatTime(opState.deadTimeSeconds);

  // Update active production record for production manager view
  const ap = sharedState.activeProductions.find(p=>p.sessionId===opState.sessionId);
  if(ap){
    ap.elapsedSeconds = opState.elapsedSeconds;
    ap.deadTimeSeconds = opState.deadTimeSeconds;
    ap.expectedPieces = opState.expectedPieces;
    ap.estTimePerPiece = opState.estTimePerPiece || 30;
    ap.status = opState.isMalfunction?'malfunction':opState.isPaused?'paused':'running';
    saveState();
  }
}

function formatTime(s){
  const h = String(Math.floor(s/3600)).padStart(2,'0');
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const sec = String(s%60).padStart(2,'0');
  return `${h}:${m}:${sec}`;
}

function doPause(){
  if(!opState.isRunning){ showOpMessage('error','Δεν υπάρχει εργασία σε εξέλιξη. Πατήστε πρώτα «Έναρξη».'); return; }
  if(opState.isPaused){ showOpMessage('info','Η εργασία βρίσκεται ήδη σε παύση.'); return; }
  if(opState.isMalfunction){ showOpMessage('error','Έχει δηλωθεί βλάβη και αναμένεται αποκατάσταση.'); return; }
  if(!validateWorkInputs()) return;
  document.getElementById('pauseModal').classList.add('active');
}

function confirmPause(reason){
  opState.isPaused = true;
  opState.pauseReason = reason;
  opState.pauseStartedAt = Date.now();
  document.getElementById('pauseModal').classList.remove('active');
  document.getElementById('btnPause').disabled = true;
  document.getElementById('btnEndPause').style.display = 'block';
  document.getElementById('statusBadge').innerHTML = `<span style="color:#FBC02D;">⏸ Παύση: ${reason}</span>`;
}

function cancelPause(){
  document.getElementById('pauseModal').classList.remove('active');
}

function doEndPause(){
  opState.isPaused = false;
  opState.pauseReason = null;
  opState.pauseStartedAt = null;
  document.getElementById('btnPause').disabled = false;
  document.getElementById('btnEndPause').style.display = 'none';
  document.getElementById('statusBadge').innerHTML = '<span style="color:#4CAF50;">● Σε λειτουργία</span>';
}

function doMalfunction(){
  if(opState.isMalfunction){ showOpMessage('error','Έχει ήδη δηλωθεί βλάβη και αναμένεται αποκατάσταση από τον Τεχνικό Διευθυντή.'); return; }
  if(!validateWorkInputs()) return;

  opState.isMalfunction = true;
  opState.malfunctionStartedAt = Date.now();

  // Make sure timer interval is running so dead time accumulates even if not yet started
  if(!opState.timerInterval){
    opState.timerInterval = setInterval(updateTimer, 1000);
  }
  // Ensure session id exists so production manager can see the issue
  if(!opState.sessionId){
    opState.sessionId = 'S-'+Date.now();
    sharedState.activeProductions.push({
      sessionId: opState.sessionId,
      operator: currentUser.name,
      machine: opState.selectedMachine,
      order: opState.orderNumber,
      piecesTarget: opState.piecesTarget,
      startTime: Date.now(),
      status:'malfunction',
      elapsedSeconds: 0,
      deadTimeSeconds: 0,
      expectedPieces: 0
    });
  }

  // Create malfunction record
  const mfId = 'MF-'+Date.now();
  sharedState.malfunctions.push({
    id: mfId,
    machine: opState.selectedMachine,
    operator: currentUser.name,
    time: new Date().toISOString(),
    category: 'Δήλωση χειριστή',
    description: 'Βλάβη μηχανήματος κατά τη διάρκεια λειτουργίας',
    status: 'pending',
    deadTime: 0,
    cost: 0,
    externalPartner: 'Όχι',
    sessionId: opState.sessionId,
    activeMfForOperator: currentUser.name
  });
  saveState();

  document.getElementById('btnMalfunction').disabled = true;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('statusBadge').innerHTML = `<span style="color:#FFCDD2;">⚠ ΒΛΑΒΗ - Αναμονή τεχνικού</span>`;
  showOpMessage('error','Η βλάβη δηλώθηκε. Ο Τεχνικός Διευθυντής έχει ειδοποιηθεί. Παραμείνετε σε αναμονή.');
}

function checkResolvedMalfunctions(){
  // Show resolved malfunctions whose operator matches current user and not yet acknowledged
  const resolved = sharedState.malfunctions.filter(m =>
    m.activeMfForOperator===currentUser.name && m.status==='resolved' && !m.ackByOperator
  );
  if(resolved.length>0){
    const m = resolved[0];
    document.getElementById('resolvedMalfunctionBox').style.display='block';
    document.getElementById('resolvedMalfunctionContent').innerHTML = `
      <p style="margin-bottom:10px;">Η βλάβη στο μηχάνημα <strong>${m.machine}</strong> έχει αποκατασταθεί.</p>
      <ul style="margin-left:20px;margin-bottom:14px;">
        <li>Κατηγορία βλάβης: <strong>${m.repairCategory || m.category}</strong></li>
        <li>Διάρκεια αποκατάστασης: <strong>${formatTime(m.deadTime)}</strong></li>
      </ul>
      <button class="btn btn-success" onclick="acknowledgeResolved('${m.id}')">Επιβεβαίωση & Συνέχεια Εργασίας</button>
    `;
    // Restore operator state after malfunction resolution
    if(opState.isMalfunction){
      opState.isMalfunction = false;
      document.getElementById('btnMalfunction').disabled = false;
      document.getElementById('btnPause').disabled = false;
      if(opState.isRunning){
        document.getElementById('statusBadge').innerHTML = '<span style="color:#4CAF50;">● Σε λειτουργία</span>';
      } else {
        document.getElementById('statusBadge').innerHTML = '';
      }
    }
  }else{
    document.getElementById('resolvedMalfunctionBox').style.display='none';
  }
}

function acknowledgeResolved(mfId){
  const mf = sharedState.malfunctions.find(m=>m.id===mfId);
  if(mf){ mf.ackByOperator = true; }
  saveState();
  document.getElementById('resolvedMalfunctionBox').style.display='none';
}

function doComplete(){
  if(!opState.isRunning){ showOpMessage('error','Δεν υπάρχει εργασία σε εξέλιξη. Πατήστε πρώτα «Έναρξη» για να ξεκινήσει η εργασία πριν την ολοκληρώσετε.'); return; }
  if(opState.isMalfunction){ showOpMessage('error','Δεν μπορείτε να ολοκληρώσετε όσο εκκρεμεί αποκατάσταση βλάβης.'); return; }
  if(!validateWorkInputs()) return;
  // Save the completed production entry
  sharedState.productionEntries.push({
    operator: currentUser.name,
    machine: opState.selectedMachine,
    order: opState.orderNumber,
    piecesTarget: opState.piecesTarget,
    estTimePerPiece: opState.estTimePerPiece,
    expectedPieces: opState.expectedPieces,
    duration: opState.elapsedSeconds,
    deadTime: opState.deadTimeSeconds,
    completedAt: Date.now()
  });
  // Remove from active productions
  sharedState.activeProductions = sharedState.activeProductions.filter(p=>p.sessionId!==opState.sessionId);
  saveState();
  if(opState.timerInterval){ clearInterval(opState.timerInterval); }
  showOpMessage('success','Η εργασία ολοκληρώθηκε επιτυχώς και καταχωρήθηκε στο σύστημα.');
  // Reset for next entry — keep all buttons clickable, validation handles state
  setTimeout(()=>{
    opState = resetOpState();
    document.getElementById('orderNumber').value='';
    document.getElementById('piecesNumber').value='';
    document.getElementById('estTimePerPiece').value='';
    document.getElementById('timerDisplay').textContent='00:00:00';
    document.getElementById('expectedPieces').textContent='0';
    document.getElementById('deadTimeDisplay').textContent='00:00:00';
    document.getElementById('statusBadge').innerHTML='';
    // All buttons remain enabled so the operator can start a new task immediately
    document.getElementById('btnSetup').disabled = false;
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnPause').disabled = false;
    document.getElementById('btnMalfunction').disabled = false;
    document.getElementById('btnComplete').disabled = false;
    document.getElementById('btnEndPause').style.display='none';
    document.getElementById('machineSelect').value='';
    opState.selectedMachine = null;
  }, 2000);
}

