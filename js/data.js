/* ============================================
   STATE MANAGEMENT (with localStorage for cross-role sync)
============================================ */
const PASSWORDS = {
  operator:'operator123',
  technical:'technical123',
  production:'production123',
  ceo:'ceo123'
};
const ROLE_NAMES = {
  operator:'Χειριστής',
  technical:'Τεχνικός Διευθυντής',
  production:'Διευθυντής Παραγωγής',
  ceo:'Διευθύνων Σύμβουλος'
};
const STORAGE_KEY = 'pebroPTS_v1';

function loadState(){
  try{
    const data = localStorage.getItem(STORAGE_KEY);
    if(data){
      const s = JSON.parse(data);
      // If the user has never used the app and the storage has the legacy demo flag
      // missing, OR if the storage is essentially empty, populate with demo data so
      // the dashboards/KPIs look meaningful from day one.
      if(!s._demoSeeded && (!s.productionEntries || s.productionEntries.length===0)){
        return seedDemoData(s);
      }
      return s;
    }
  }catch(e){}
  return seedDemoData({
    malfunctions:[],
    productionEntries:[],
    activeProductions:[],
    pendingAutoWork:null,
    completedAutoWork:[]
  });
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedState)); }
  catch(e){ console.warn('localStorage unavailable, using in-memory only', e); }
}

/* ============================================
   DEMO DATA SEEDER
   Populates 1 month of production entries and malfunctions across all machines
   so reports/KPIs/history are non-empty when first opened.
============================================ */
function seedDemoData(state){
  const machines = [
    'Λέιζερ 1','Λέιζερ 2','Κοπή',
    'Στράντζα 1','Στράντζα 2','Στράντζα 3','Στράντζα 4',
    'Στράντζα 5','Στράντζα 6','Στράντζα 7',
    'Κόλληση','Φούρνος Βαφής','Εκτυπωτής'
  ];
  const operators = [
    'ANWAR NADEEM','ASIF NAQI','ALI NASIR','MUHAMMAD ASGHAR','SHAHZAD AHMAD',
    'ΓΙΑΝΝΗΣ ΚΟΝΤΑΡΙΝΗΣ','ΠΕΤΡΟΣ ΠΕΤΡΟΠΟΥΛΟΣ','AMJED ALI','JAMIL AHMED',
    'ZEB ORANG','MUHAMMAD NAEEM','ΚΩΣΤΑΣ ΤΑΣΙΟΠΟΥΛΟΣ','ΕΥΑΓΓΕΛΙΑ ΜΠΕΙΝΗ',
    'ΓΙΑΝΝΗΣ ΜΠΟΥΡΑΚΙΔΗΣ','ΠΙΤΣΑΣ ΣΠΥΡΟΣ'
  ];
  const malfCategories = {
    'Λέιζερ 1':       ['Ηλεκτρονική (driver)','Οπτική (φακός)','Ψύξη laser','Λογισμικού (CNC)'],
    'Λέιζερ 2':       ['Ψύξη laser','Οπτική ευθυγράμμιση','Ηλεκτρολογική','Λογισμικού (CNC)'],
    'Κοπή':           ['Λάμα','Υδραυλική','Σύστημα τροφοδοσίας','Ηλεκτρολογική'],
    'Στράντζα 1':     ['Υδραυλική αντλία','Φθορά μήτρας','Ηλεκτρονικός πίνακας'],
    'Στράντζα 2':     ['Υδραυλική','Σύστημα backgauge','Ηλεκτρολογική'],
    'Στράντζα 3':     ['Φθορά μήτρας','Υδραυλική','Λογισμικού'],
    'Στράντζα 4':     ['Υδραυλική','Φθορά εργαλείου','Ηλεκτρονικός πίνακας'],
    'Στράντζα 5':     ['Σύστημα backgauge','Υδραυλική','Λογισμικού'],
    'Στράντζα 6':     ['Φθορά μήτρας','Ηλεκτρολογική','Υδραυλική'],
    'Στράντζα 7':     ['Υδραυλική','Φθορά εργαλείου','Ηλεκτρολογική'],
    'Κόλληση':        ['Σύρμα MIG','Παροχή αερίου','Πιστόλι κόλλησης','Ηλεκτρολογική'],
    'Φούρνος Βαφής':  ['Καυστήρας','Αισθητήρας θερμοκρασίας','Σύστημα μεταφοράς','Ψεκαστήρες'],
    'Εκτυπωτής':      ['Κεφαλή εκτύπωσης','Μελάνη','Σύστημα τροφοδοσίας']
  };
  const malfResolutions = {
    'Λέιζερ 1':       'Αντικατάσταση driver, ευθυγράμμιση οπτικής διαδρομής, καθαρισμός φακού.',
    'Λέιζερ 2':       'Αναπλήρωση ψυκτικού υγρού, calibration laser head, έλεγχος σωληνώσεων.',
    'Κοπή':           'Αντικατάσταση λάμας, λίπανση οδηγών, ρύθμιση ταχύτητας τροφοδοσίας.',
    'Στράντζα 1':     'Αντικατάσταση φθαρμένης μήτρας με νέα, ρύθμιση πίεσης υδραυλικού.',
    'Στράντζα 2':     'Επισκευή υδραυλικής βάνας και έλεγχος στεγανότητας κυκλώματος.',
    'Στράντζα 3':     'Αντικατάσταση φθαρμένου εργαλείου, recalibration backgauge.',
    'Στράντζα 4':     'Αλλαγή φίλτρου υδραυλικού λαδιού, εκτόνωση αέρα, δοκιμή πίεσης.',
    'Στράντζα 5':     'Αντικατάσταση servo motor backgauge, ενημέρωση firmware.',
    'Στράντζα 6':     'Λίπανση οδηγών, ρύθμιση καμπύλης πίεσης, καθαρισμός αισθητήρων.',
    'Στράντζα 7':     'Έλεγχος και αντικατάσταση υδραυλικής σωλήνωσης, replenish oil.',
    'Κόλληση':        'Αλλαγή σύρματος, καθαρισμός μπεκ, ρύθμιση ροής αερίου σε 18 L/min.',
    'Φούρνος Βαφής':  'Καθαρισμός μπεκ ψεκαστήρων, αντικατάσταση αισθητήρα θερμοκρασίας.',
    'Εκτυπωτής':      'Καθαρισμός κεφαλής, αναπλήρωση μελανιών, calibration χρωμάτων.'
  };

  const now = Date.now();
  const DAY = 86400000;
  // Random helper
  const rnd = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  // -------- Production entries (about 8-12 per day for last 30 days) --------
  const productionEntries = [];
  for(let day=29; day>=0; day--){
    const dayStart = now - day*DAY;
    const entriesToday = rnd(8,12);
    for(let k=0; k<entriesToday; k++){
      const machine = pick(machines);
      const operator = pick(operators);
      const piecesTarget = rnd(40,300);
      // duration ~ 30-180 minutes
      const duration = rnd(1800, 10800);
      // dead time ~ 5-25% of duration
      const deadTime = Math.floor(duration * (rnd(5,25)/100));
      // expected pieces close to target with small variance
      const expectedPieces = Math.max(1, piecesTarget + rnd(-15, 5));
      // completedAt at random hour during that working day (8:00-20:00)
      const hour = rnd(8,20);
      const minute = rnd(0,59);
      const completedAt = new Date(dayStart);
      completedAt.setHours(hour, minute, 0, 0);
      productionEntries.push({
        operator: operator,
        machine: machine,
        order: String(rnd(100000, 999999)),
        piecesTarget: piecesTarget,
        expectedPieces: expectedPieces,
        duration: duration,
        deadTime: deadTime,
        estTimePerPiece: rnd(5, 25),
        completedAt: completedAt.getTime(),
        incomplete: false
      });
    }
  }

  // -------- Malfunctions: at least 1-2 per machine over the month --------
  const malfunctions = [];
  let mfCounter = 0;
  machines.forEach(machine=>{
    const numMalfs = rnd(1,3); // 1-3 malfunctions per machine in the month
    for(let i=0; i<numMalfs; i++){
      const dayBack = rnd(1, 29);
      const hour = rnd(8,18);
      const minute = rnd(0,59);
      const t = new Date(now - dayBack*DAY);
      t.setHours(hour, minute, 0, 0);
      const cats = malfCategories[machine] || ['Γενική'];
      const category = pick(cats);
      const resolution = malfResolutions[machine] || 'Έγινε επιθεώρηση και επισκευή.';
      const repairDurationSec = rnd(900, 7200); // 15min - 2hr
      const repairStart = t.getTime() + rnd(60, 600)*1000; // 1-10 min after report
      const repairEnd = repairStart + repairDurationSec*1000;
      const externalPartner = Math.random() < 0.3; // 30% external
      const repairCost = parseFloat((rnd(80, 800) + Math.random()).toFixed(2));
      const externalCost = externalPartner ? parseFloat((rnd(150, 600) + Math.random()).toFixed(2)) : 0;
      malfunctions.push({
        id: 'MF-DEMO-'+(++mfCounter),
        machine: machine,
        operator: pick(operators),
        time: t.toISOString(),
        category: 'Δήλωση χειριστή',
        description: 'Βλάβη μηχανήματος κατά τη διάρκεια λειτουργίας',
        status: 'resolved',
        deadTime: repairDurationSec,
        cost: repairCost,
        externalPartner: externalPartner ? 'Ναι':'Όχι',
        externalCost: externalCost,
        totalCost: parseFloat((repairCost + externalCost).toFixed(2)),
        repairCategory: category,
        repairResolution: resolution,
        repairStart: repairStart,
        repairEnd: repairEnd
      });
    }
  });
  // sort malfunctions by time descending so latest first
  malfunctions.sort((a,b) => new Date(b.time) - new Date(a.time));

  return {
    malfunctions: state.malfunctions && state.malfunctions.length ? state.malfunctions : malfunctions,
    productionEntries: state.productionEntries && state.productionEntries.length ? state.productionEntries : productionEntries,
    activeProductions: state.activeProductions||[],
    pendingAutoWork: state.pendingAutoWork||null,
    completedAutoWork: state.completedAutoWork||[],
    _demoSeeded: true
  };
}

let sharedState = loadState();
let currentUser = null;
let opState = {
  selectedMachine:null,
  isAutoMode:false,
  orderNumber:null,
  piecesTarget:0,
  isRunning:false,
  isPaused:false,
  isMalfunction:false,
  setupActive:false,
  startTime:null,
  elapsedSeconds:0,
  deadTimeSeconds:0,
  pauseStartedAt:null,
  setupStartedAt:null,
  malfunctionStartedAt:null,
  pauseReason:null,
  timerInterval:null,
  expectedPieces:0,
  // for production manager monitor
  sessionId:null
};

let currentKPIPeriod = 'day';
let monitorInterval = null;

