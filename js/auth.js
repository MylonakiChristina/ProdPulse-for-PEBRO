/* ============================================
   AUTH / NAVIGATION
============================================ */
function onRoleChange(){
  const role = document.getElementById('roleSelect').value;
  const grp = document.getElementById('operatorNameGroup');
  grp.style.display = role==='operator' ? 'block' : 'none';
  document.getElementById('loginError').innerHTML = '';
}

function handleLogin(){
  const role = document.getElementById('roleSelect').value;
  const password = document.getElementById('passwordInput').value;
  const errBox = document.getElementById('loginError');
  errBox.innerHTML = '';

  if(!role){
    errBox.innerHTML = '<div class="error-msg">Παρακαλώ επιλέξτε ρόλο.</div>';
    return;
  }
  if(!password){
    errBox.innerHTML = '<div class="error-msg">Δεν μπορείτε να εισέλθετε χωρίς κωδικό.</div>';
    return;
  }
  if(PASSWORDS[role]!==password){
    errBox.innerHTML = '<div class="error-msg">Λάθος κωδικός για αυτόν τον ρόλο.</div>';
    return;
  }
  let opName = null;
  if(role==='operator'){
    opName = document.getElementById('operatorNameSelect').value;
    if(!opName){
      errBox.innerHTML = '<div class="error-msg">Παρακαλώ επιλέξτε όνομα χειριστή.</div>';
      return;
    }
  }
  currentUser = {role: role, name: opName || ROLE_NAMES[role]};
  showUserBadge();
  navigateToRoleScreen();
}

function showUserBadge(){
  const badge = document.getElementById('userBadge');
  badge.style.display = 'flex';
  document.getElementById('userInfo').innerHTML =
    `<strong>${currentUser.name}</strong> (${ROLE_NAMES[currentUser.role]})`;
}

function navigateToRoleScreen(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  if(currentUser.role==='operator'){
    document.getElementById('screen-operator').classList.add('active');
    setupOperatorScreen();
  }else if(currentUser.role==='technical'){
    document.getElementById('screen-technical').classList.add('active');
    setupTechnicalScreen();
  }else if(currentUser.role==='production'){
    document.getElementById('screen-production').classList.add('active');
    setupProductionScreen();
  }else if(currentUser.role==='ceo'){
    document.getElementById('screen-ceo').classList.add('active');
    setupCEOScreen();
  }
}

function logout(){
  // Stop any running timers/intervals
  if(opState.timerInterval){ clearInterval(opState.timerInterval); opState.timerInterval=null; }
  if(monitorInterval){ clearInterval(monitorInterval); monitorInterval=null; }

  // If operator had an active session, persist it to history as "incomplete" so
  // the dead time and productive time still count in KPIs / production history.
  if(currentUser && currentUser.role==='operator' && opState.sessionId){
    const ap = sharedState.activeProductions.find(p=>p.sessionId===opState.sessionId);
    if(ap && (ap.elapsedSeconds>0 || ap.deadTimeSeconds>0)){
      sharedState.productionEntries.push({
        operator: ap.operator,
        machine: ap.machine,
        order: ap.order,
        piecesTarget: ap.piecesTarget,
        expectedPieces: ap.expectedPieces||0,
        duration: ap.elapsedSeconds||0,
        deadTime: ap.deadTimeSeconds||0,
        estTimePerPiece: ap.estTimePerPiece||0,
        completedAt: Date.now(),
        incomplete: true
      });
    }
    sharedState.activeProductions = sharedState.activeProductions.filter(p=>p.sessionId!==opState.sessionId);
    saveState();
  }

  // Full operator UI reset (timer, inputs, status, buttons, modals)
  if(currentUser && currentUser.role==='operator'){
    resetOperatorUI();
  }

  // Clear current user
  currentUser = null;
  opState = resetOpState();

  // Hide user badge in header
  document.getElementById('userBadge').style.display='none';

  // Switch back to login screen
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');

  // Reset login form
  document.getElementById('passwordInput').value='';
  document.getElementById('roleSelect').value='';
  document.getElementById('operatorNameSelect').value='';
  document.getElementById('operatorNameGroup').style.display='none';
  document.getElementById('loginError').innerHTML='';
}

function resetOpState(){
  return {
    selectedMachine:null,isAutoMode:false,orderNumber:null,piecesTarget:0,
    estTimePerPiece:null,
    isRunning:false,isPaused:false,isMalfunction:false,setupActive:false,
    startTime:null,elapsedSeconds:0,deadTimeSeconds:0,
    pauseStartedAt:null,setupStartedAt:null,malfunctionStartedAt:null,
    pauseReason:null,timerInterval:null,expectedPieces:0,sessionId:null
  };
}

