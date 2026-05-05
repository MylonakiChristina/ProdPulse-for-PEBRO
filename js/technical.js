/* ============================================
   TECHNICAL DIRECTOR SCREEN
============================================ */
function setupTechnicalScreen(){
  renderTechActiveAlert();
  renderMalfunctionHistory();
  // Refresh every 3 seconds to catch new malfunctions
  if(monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(()=>{
    sharedState = loadState();
    renderTechActiveAlert();
    renderMalfunctionHistory();
  }, 3000);
}

function renderTechActiveAlert(){
  const active = sharedState.malfunctions.filter(m => m.status==='pending' || m.status==='repairing');
  const box = document.getElementById('techActiveAlert');
  if(active.length===0){ box.style.display='none'; return; }
  box.style.display='block';
  let html = '';
  active.forEach(m=>{
    const isRepairing = m.status==='repairing';
    html += `
      <div class="notification ${isRepairing?'':'malfunction'}" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px;">
          <div>
            <strong>${m.machine}</strong> — ${m.operator}<br>
            <small>Ώρα: ${new Date(m.time).toLocaleString('el-GR')}</small><br>
            <small>Κατηγορία: ${m.category}</small>
            ${isRepairing?`<br><small style="color:var(--orange);"><strong>Σε εξέλιξη αποκατάσταση...</strong> Νεκρός χρόνος: ${formatTime(Math.floor((Date.now()-m.repairStart)/1000))}</small>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${!isRepairing
              ? `<button class="btn btn-warn" onclick="startRepair('${m.id}')">▶ Έναρξη Αποκατάστασης</button>`
              : `<button class="btn btn-success" onclick="endRepair('${m.id}')">✓ Λήξη Αποκατάστασης</button>`}
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById('techActiveContent').innerHTML = html;
}

function startRepair(mfId){
  const m = sharedState.malfunctions.find(x=>x.id===mfId);
  if(!m) return;
  m.status = 'repairing';
  m.repairStart = Date.now();
  saveState();
  renderTechActiveAlert();
  renderMalfunctionHistory();
}

let _repairTargetId = null;
function endRepair(mfId){
  _repairTargetId = mfId;
  document.getElementById('repairCategoryInput').value = '';
  document.getElementById('repairResolutionInput').value = '';
  document.getElementById('repairCostInput').value = '';
  document.getElementById('repairExternal').checked = false;
  document.getElementById('repairExternalCostInput').value = '';
  document.getElementById('externalCostGroup').style.display = 'none';
  document.getElementById('repairFormError').innerHTML = '';
  document.getElementById('repairCompleteModal').classList.add('active');
}
function toggleExternalCostField(){
  const checked = document.getElementById('repairExternal').checked;
  const grp = document.getElementById('externalCostGroup');
  grp.style.display = checked ? 'block' : 'none';
  if(!checked){
    document.getElementById('repairExternalCostInput').value = '';
  }
}
function cancelRepairComplete(){
  _repairTargetId = null;
  document.getElementById('repairCompleteModal').classList.remove('active');
}
function confirmRepairComplete(){
  if(!_repairTargetId) return;
  const m = sharedState.malfunctions.find(x=>x.id===_repairTargetId);
  if(!m){ cancelRepairComplete(); return; }
  const cat = document.getElementById('repairCategoryInput').value.trim();
  const resolution = document.getElementById('repairResolutionInput').value.trim();
  const costRaw = document.getElementById('repairCostInput').value;
  const cost = parseFloat(costRaw);
  const ext = document.getElementById('repairExternal').checked;
  const extCostRaw = document.getElementById('repairExternalCostInput').value;
  const extCost = parseFloat(extCostRaw);
  const errBox = document.getElementById('repairFormError');
  errBox.innerHTML = '';
  if(!cat){ errBox.innerHTML='<div class="error-msg">Συμπληρώστε την κατηγορία βλάβης.</div>'; return; }
  if(!resolution){ errBox.innerHTML='<div class="error-msg">Συμπληρώστε τον τρόπο αντιμετώπισης.</div>'; return; }
  if(costRaw===''||isNaN(cost)||cost<0){ errBox.innerHTML='<div class="error-msg">Συμπληρώστε έγκυρο κόστος επισκευής (>= 0).</div>'; return; }
  if(ext){
    if(extCostRaw===''||isNaN(extCost)||extCost<0){
      errBox.innerHTML='<div class="error-msg">Συμπληρώστε έγκυρο κόστος συνεργασίας με εξωτερικό συνεργάτη (>= 0).</div>';
      return;
    }
  }
  m.status = 'resolved';
  m.repairEnd = Date.now();
  m.deadTime = Math.floor((m.repairEnd - (m.repairStart||m.repairEnd))/1000);
  m.repairCategory = cat;
  m.repairResolution = resolution;
  m.cost = cost;                                     // repair cost only
  m.externalPartner = ext ? 'Ναι':'Όχι';
  m.externalCost = ext ? extCost : 0;                // collaboration cost
  m.totalCost = cost + (ext ? extCost : 0);          // total = repair + collaboration
  saveState();
  document.getElementById('repairCompleteModal').classList.remove('active');
  _repairTargetId = null;
  renderTechActiveAlert();
  renderMalfunctionHistory();
}

function renderMalfunctionHistory(){
  const filter = document.getElementById('techFilter').value;
  let list = sharedState.malfunctions.slice().reverse();
  if(filter){ list = list.filter(m=>m.machine===filter); }
  const tbody = document.getElementById('malfunctionTableBody');
  if(list.length===0){
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--gray-mid);">Δεν υπάρχουν καταχωρημένες βλάβες.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(m=>{
    const dur = m.status==='resolved' ? formatTime(m.deadTime) :
                m.status==='repairing' ? formatTime(Math.floor((Date.now()-m.repairStart)/1000))+' (σε εξέλιξη)' :
                '—';
    const statusBadge = m.status==='resolved' ? '<span class="badge badge-resolved">Αποκαταστάθηκε</span>' :
                       m.status==='repairing' ? '<span class="badge badge-pending">Σε εξέλιξη</span>' :
                       '<span class="badge badge-active">Εκκρεμεί</span>';
    const resolutionText = m.repairResolution ? escapeHtml(m.repairResolution) : '—';
    const fmtCost = v => (v!==undefined && v!==null && !isNaN(v)) ? Number(v).toFixed(2)+' €' : '—';
    const repairCost = (m.cost!==undefined && m.cost!==null) ? Number(m.cost) : null;
    const extCost = (m.externalCost!==undefined && m.externalCost!==null) ? Number(m.externalCost) : 0;
    const total = (m.totalCost!==undefined && m.totalCost!==null)
      ? Number(m.totalCost)
      : (repairCost!==null ? repairCost + extCost : null);
    return `<tr>
      <td>${m.machine}</td>
      <td>${new Date(m.time).toLocaleString('el-GR')}</td>
      <td>${m.operator}</td>
      <td>${m.repairCategory ? escapeHtml(m.repairCategory) : (m.category||'—')}</td>
      <td style="max-width:280px;white-space:normal;">${resolutionText}</td>
      <td>${dur}</td>
      <td>${fmtCost(repairCost)}</td>
      <td>${m.externalPartner==='Ναι' ? fmtCost(extCost) : '—'}</td>
      <td><strong>${fmtCost(total)}</strong></td>
      <td>${m.externalPartner || '—'}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* ============================================
   DOWNLOAD HELPER
   Uses base64-encoded data URI (works in file:// where blob: is blocked,
   and avoids URL-encoded data URI issues with Greek chars).
   Falls back to a modal with copy/select-all if download is blocked.
============================================ */
function utf8ToBase64(str){
  // Properly encode UTF-8 strings (including Greek) to base64
  return btoa(unescape(encodeURIComponent(str)));
}

function triggerDownload(filename, content, mimeType){
  const bom = '\ufeff'; // BOM for Greek char support in Excel/Notepad
  const fullContent = bom + content;
  let downloadStarted = false;
  try{
    const dataUri = 'data:'+mimeType+';charset=utf-8;base64,'+utf8ToBase64(fullContent);
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ if(a.parentNode) a.parentNode.removeChild(a); }, 100);
    downloadStarted = true;
  }catch(e){
    console.warn('Data URI download failed:', e);
  }
  // Always offer a fallback modal so the user can copy the content if browser blocked the download
  showDownloadFallback(filename, fullContent, downloadStarted);
}

function showDownloadFallback(filename, content, downloadAttempted){
  const overlay = document.getElementById('downloadFallbackModal');
  document.getElementById('downloadFallbackTitle').textContent = filename;
  document.getElementById('downloadFallbackTextarea').value = content;
  document.getElementById('downloadFallbackHint').textContent = downloadAttempted
    ? 'Αν η λήψη δεν ξεκίνησε αυτόματα (π.χ. ο browser την μπλόκαρε), μπορείτε να αντιγράψετε το περιεχόμενο ή να το αποθηκεύσετε χειροκίνητα.'
    : 'Η αυτόματη λήψη δεν είναι διαθέσιμη. Αντιγράψτε το περιεχόμενο και επικολλήστε το σε αρχείο.';
  overlay.classList.add('active');
}

function copyDownloadFallbackContent(){
  const ta = document.getElementById('downloadFallbackTextarea');
  ta.select();
  ta.setSelectionRange(0, 99999);
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){}
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(()=>{
      document.getElementById('downloadFallbackHint').innerHTML = '<span style="color:#388E3C;font-weight:600;">✓ Το περιεχόμενο αντιγράφηκε στο πρόχειρο.</span>';
    }).catch(()=>{});
  } else if(ok){
    document.getElementById('downloadFallbackHint').innerHTML = '<span style="color:#388E3C;font-weight:600;">✓ Το περιεχόμενο αντιγράφηκε στο πρόχειρο.</span>';
  }
}

function closeDownloadFallback(){
  document.getElementById('downloadFallbackModal').classList.remove('active');
}

function downloadMalfunctionReport(){
  const now = new Date();
  let txt = '';
  txt += '================================================================\n';
  txt += '         ΑΝΑΦΟΡΑ ΒΛΑΒΩΝ - ProdPulse / PEBRO\n';
  txt += '         Ημερομηνία έκδοσης: '+now.toLocaleString('el-GR')+'\n';
  txt += '================================================================\n\n';

  const malfs = sharedState.malfunctions.slice().sort((a,b)=>new Date(b.time)-new Date(a.time));
  txt += 'Συνολικά καταγεγραμμένες βλάβες: '+malfs.length+'\n\n';

  if(malfs.length===0){
    txt += '(Δεν υπάρχουν καταγεγραμμένες βλάβες.)\n';
  } else {
    let totalRepair=0, totalCollab=0, totalAll=0;
    malfs.forEach((m,i)=>{
      const rc = Number(m.cost)||0;
      const ec = Number(m.externalCost)||0;
      const tc = (m.totalCost!==undefined&&m.totalCost!==null) ? Number(m.totalCost) : (rc+ec);
      totalRepair+=rc; totalCollab+=ec; totalAll+=tc;
      txt += '----------------------------------------------------------------\n';
      txt += 'ΒΛΑΒΗ #'+(i+1)+'\n';
      txt += '----------------------------------------------------------------\n';
      txt += '  Μηχάνημα            : '+m.machine+'\n';
      txt += '  Ώρα Βλάβης          : '+new Date(m.time).toLocaleString('el-GR')+'\n';
      txt += '  Χειριστής           : '+m.operator+'\n';
      txt += '  Κατηγορία           : '+(m.repairCategory||m.category||'—')+'\n';
      txt += '  Τρόπος Αντιμετώπισης: '+(m.repairResolution||'—')+'\n';
      txt += '  Διάρκεια Νεκρού Χρ.: '+formatTime(m.deadTime||0)+'\n';
      txt += '  Κόστος Επισκευής   : '+rc.toFixed(2)+' €\n';
      txt += '  Εξωτ. Συνεργάτης   : '+(m.externalPartner||'Όχι')+'\n';
      if(m.externalPartner==='Ναι'){
        txt += '  Κόστος Συνεργασίας : '+ec.toFixed(2)+' €\n';
      }
      txt += '  ΣΥΝΟΛΙΚΟ ΚΟΣΤΟΣ    : '+tc.toFixed(2)+' €\n';
      txt += '  Κατάσταση          : '+(m.status==='resolved'?'Αποκαταστάθηκε':m.status==='repairing'?'Σε εξέλιξη':'Εκκρεμεί')+'\n\n';
    });
    txt += '================================================================\n';
    txt += 'ΣΥΓΚΕΝΤΡΩΤΙΚΑ\n';
    txt += '================================================================\n';
    txt += '  Συνολικό Κόστος Επισκευών : '+totalRepair.toFixed(2)+' €\n';
    txt += '  Συνολικό Κόστος Συνεργασιών: '+totalCollab.toFixed(2)+' €\n';
    txt += '  ΓΕΝΙΚΟ ΣΥΝΟΛΟ            : '+totalAll.toFixed(2)+' €\n';
  }
  txt += '\n================================================================\n';

  const filename = 'malfunction_report_'+new Date().toISOString().slice(0,10)+'.txt';
  triggerDownload(filename, txt, 'text/plain');
}

