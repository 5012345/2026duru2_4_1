/* -------------------------------------------------------------
 * SECRET BASEBALL - GAME LOGIC IMPLEMENTATION
 * Technology Stack: Firebase Firestore, MathJax, Canvas API
 * ------------------------------------------------------------- */

// Firebase Configuration (Provided by USER)
const firebaseConfig = {
  apiKey: "AIzaSyDX5TiB78wqtnzgwgOpfnEv7f0hcN0L4LU",
  authDomain: "duru20401-b60fa.firebaseapp.com",
  projectId: "duru20401-b60fa",
  storageBucket: "duru20401-b60fa.firebasestorage.app",
  messagingSenderId: "790407879385",
  appId: "1:790407879385:web:5e870c62480531fb1ebcc8",
  measurementId: "G-YC30724HMC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Constants & State
const SLOTS_COUNT = 12;
const ADMIN_PASSWORD = "2525";

let mySlotId = localStorage.getItem("selectedSlotId") || null;
let myPlayer = null;
let gameState = null;
let playersList = [];
let localTimerInterval = null;
let countdownInterval = null;
let homerunHintShown = false;

// DOM Elements
const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");
const gameBgOverlay = document.getElementById("game-bg-overlay");
const slotsGrid = document.getElementById("slots-grid");
const joinFormPanel = document.getElementById("join-form-panel");
const joinSlotTitle = document.getElementById("join-slot-title");
const inputNickname = document.getElementById("player-nickname");
const classCards = document.querySelectorAll(".class-card");
const btnJoinGame = document.getElementById("btn-join-game");
const lobbyStatusText = document.getElementById("lobby-status-text");

// Scoreboard Elements
const sbInningText = document.getElementById("sb-inning-text");
const sbStageText = document.getElementById("sb-stage-text");
const sbTimerText = document.getElementById("sb-timer-text");
const myPlayerNameLabel = document.getElementById("my-player-name");
const playerBadge = document.getElementById("player-badge");

// Stage Panels
const stageTopPanel = document.getElementById("stage-top");
const stageBottomPanel = document.getElementById("stage-bottom");
const stageAdPanel = document.getElementById("stage-ad");

// Math stage elements
const btnSubmitAnswers = document.getElementById("btn-submit-answers");
const solveFeedback = document.getElementById("solve-feedback");
const ans1 = document.getElementById("ans-1");
const ans2 = document.getElementById("ans-2");
const ans3 = document.getElementById("ans-3");

// Guess stage elements
const guessLayoutContainer = document.getElementById("guess-layout-container");
const guessActionBar = document.getElementById("guess-action-bar");
const guessFeedback = document.getElementById("guess-feedback");

// Overlays
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownNumber = document.getElementById("countdown-number");
const countdownTitle = document.getElementById("countdown-title");
const victoryOverlay = document.getElementById("victory-overlay");
const winnerInfoLabel = document.getElementById("winner-info");

// Admin Elements
const inputLobbyAdminPassword = document.getElementById("lobby-admin-password");
const btnLobbyAdminAuth = document.getElementById("btn-lobby-admin-auth");
const lobbyAdminError = document.getElementById("lobby-admin-error");
const btnLobbyAdminDashboard = document.getElementById("btn-lobby-admin-dashboard");
const admInning = document.getElementById("adm-inning");
const admStage = document.getElementById("adm-stage");
const admTargetCode = document.getElementById("adm-target-code");
const btnAdmRandomCode = document.getElementById("btn-adm-random-code");
const btnAdmUpdateState = document.getElementById("btn-adm-update-state");
const btnAdmForceNext = document.getElementById("btn-adm-force-next");
const btnAdmResetAll = document.getElementById("btn-adm-reset-all");
const admPlayersList = document.getElementById("adm-players-list");

// Math Jax typesetting utility
function triggerMathJax() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

/* -------------------------------------------------------------
 * 1. MATHEMATICAL PROBLEM GENERATOR
 * Generates linear function problems adhering to formatting rules:
 * - Coefficient 1, -1 omitted (e.g. y = x + 3 or y = -x - 2)
 * - Constant 0 omitted (e.g. y = 2x)
 * - Negative constant drops '+' sign (e.g. y = 3x - 5)
 * - Answer must be integer (positive or negative)
 * ------------------------------------------------------------- */

function formatLinearFunction(a, b) {
  let aStr = "";
  if (a === 1) {
    aStr = "x";
  } else if (a === -1) {
    aStr = "-x";
  } else {
    aStr = `${a}x`;
  }

  let bStr = "";
  if (b > 0) {
    bStr = ` + ${b}`;
  } else if (b < 0) {
    bStr = ` - ${Math.abs(b)}`;
  }
  // b === 0 is omitted

  return `y = ${aStr}${bStr}`;
}

// Generate a set of 3 questions
function generateThreeProblems() {
  // Helper: random integer in range [min, max] excluding zero
  function randomIntExcludingZero(min, max) {
    let val = 0;
    while (val === 0) {
      val = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return val;
  }

  // 1. Basic Question: Intercepts or specific value
  let basicQType = Math.random() > 0.5 ? "x_intercept" : "y_intercept";
  let basicText = "";
  let basicAns = 0;
  
  if (basicQType === "x_intercept") {
    // For x-intercept of ax + b to be integer, b = -a * x_intercept
    let a = randomIntExcludingZero(-4, 4);
    let xInt = randomIntExcludingZero(-6, 6);
    let b = -a * xInt;
    let formula = formatLinearFunction(a, b);
    basicText = `일차함수 \\( ${formula} \\)의 \\( x \\)절편은?`;
    basicAns = xInt;
  } else {
    // For y-intercept, y = ax + b -> intercept is b
    let a = randomIntExcludingZero(-5, 5);
    let b = randomIntExcludingZero(-10, 10);
    let formula = formatLinearFunction(a, b);
    basicText = `일차함수 \\( ${formula} \\)의 \\( y \\)절편은?`;
    basicAns = b;
  }

  // 2. Intermediate Question: Translation or point passing
  let interQType = Math.random() > 0.5 ? "shift" : "passing_point";
  let interText = "";
  let interAns = 0;

  if (interQType === "shift") {
    // shift: y = ax + b shifted vertically by k -> new y-intercept is b + k
    let a = randomIntExcludingZero(-4, 4);
    let b = randomIntExcludingZero(-8, 8);
    let k = randomIntExcludingZero(-5, 5);
    let formula = formatLinearFunction(a, b);
    
    interText = `일차함수 \\( ${formula} \\)의 그래프를 \\( y \\)축 방향으로 \\( ${k} \\)만큼 평행이동한 그래프의 \\( y \\)절편은?`;
    interAns = b + k;
  } else {
    // passing point: y = ax + k passing through (p, q) -> find k
    // q = ap + k -> k = q - ap. We pick a, p, k first, compute q.
    let a = randomIntExcludingZero(-3, 3);
    let p = randomIntExcludingZero(-4, 4);
    let k = randomIntExcludingZero(-6, 6);
    let q = a * p + k;
    
    // We display the function formula as "y = ax + k"
    let aStr = (a === 1) ? "x" : (a === -1) ? "-x" : `${a}x`;
    let formulaWithK = `y = ${aStr} + k`;
    
    interText = `일차함수 \\( ${formulaWithK} \\)의 그래프가 점 \\( (${p}, ${q}) \\)를 지날 때, 상수 \\( k \\)의 값은?`;
    interAns = k;
  }

  // 3. Advanced Question: Two points passing
  let advText = "";
  let advAns = 0;
  
  // Find a line passing (x1, y1) and (x2, y2)
  // Let slope be a, intercept be b. Choose a and b, select x1 and x2, compute y1 and y2.
  let a = randomIntExcludingZero(-3, 3);
  let b = randomIntExcludingZero(-5, 5);
  let x1 = Math.floor(Math.random() * 4) - 4; // -4 to -1
  let x2 = Math.floor(Math.random() * 4) + 1; // 1 to 4
  let y1 = a * x1 + b;
  let y2 = a * x2 + b;
  
  let advQType = Math.random() > 0.5 ? "slope_intercept_sum" : "specific_value";
  if (advQType === "slope_intercept_sum") {
    advText = `두 점 \\( (${x1}, ${y1}) \\)과 \\( (${x2}, ${y2}) \\)를 지나는 일차함수의 식 \\( y = ax + b \\)에서 \\( a + b \\)의 값은?`;
    advAns = a + b;
  } else {
    // slope is a, passing (x1, y1) -> find constant d in y = cx + d
    let d = y1 - a * x1; // which is b
    advText = `기울기가 \\( ${a} \\)이고 점 \\( (${x1}, ${y1}) \\)을 지나는 일차함수의 식 \\( y = cx + d \\)에서 상수 \\( d \\)의 값은?`;
    advAns = d;
  }

  return [
    { level: "easy", question: basicText, answer: basicAns },
    { level: "medium", question: interText, answer: interAns },
    { level: "hard", question: advText, answer: advAns }
  ];
}

// Helper to generate a 4-digit code (no repeating digits)
function generateTargetCode() {
  const digits = [];
  while (digits.length < 4) {
    const d = Math.floor(Math.random() * 10).toString();
    if (!digits.includes(d)) {
      digits.push(d);
    }
  }
  return digits.join("");
}

// Compare guess code and target code -> returns { a, b, c }
function evaluateGuessCode(guess, target) {
  let a = 0;
  let b = 0;
  let c = 0;
  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) {
      a++;
    } else if (target.includes(guess[i])) {
      b++;
    } else {
      c++;
    }
  }
  return { a, b, c };
}

function getResultString(res) {
  return `${res.a}a ${res.b}b ${res.c}c`;
}

/* -------------------------------------------------------------
 * 2. FIRESTORE DATABASE INITIALIZATION
 * Auto-creates game state & player slots if empty
 * ------------------------------------------------------------- */

async function ensureDatabaseInitialized() {
  try {
    // Check game state doc
    const stateDoc = await db.collection("game").doc("state").get();
    if (!stateDoc.exists) {
      await db.collection("game").doc("state").set({
        status: "waiting",
        inning: 1,
        stage: "top",
        timeLeft: 60,
        winningPlayer: null,
        targetCode: generateTargetCode(),
        problems: generateThreeProblems(),
        solveCount: 0
      });
    }

    // Check player slots
    for (let i = 1; i <= SLOTS_COUNT; i++) {
      const slotId = `slot_${i}`;
      let slotName = `${i}번 타자`;
      if (i > 9) {
        slotName = `백업선수 ${i - 9}`;
      }
      
      const slotRef = db.collection("players").doc(slotId);
      const slotDoc = await slotRef.get();
      if (!slotDoc.exists) {
        await slotRef.set({
          slotId: slotId,
          slotName: slotName,
          nickname: "",
          classType: "",
          active: false,
          solvedCorrectly: false,
          solvedAt: null,
          rank: 0,
          lastGuessedInning: 0
        });
      }
    }
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

ensureDatabaseInitialized();

/* -------------------------------------------------------------
 * 3. REAL-TIME DATA SYNCHRONIZATION
 * Listen to game state and player lineup updates
 * ------------------------------------------------------------- */

// Listen to player slots (lineup)
db.collection("players").onSnapshot(snapshot => {
  playersList = [];
  snapshot.forEach(doc => {
    playersList.push(doc.data());
  });
  
  // Sort slots by slot number (e.g. slot_1 -> slot_12)
  playersList.sort((a, b) => {
    const numA = parseInt(a.slotId.replace("slot_", ""));
    const numB = parseInt(b.slotId.replace("slot_", ""));
    return numA - numB;
  });

  renderSlots();
  updateAdminPlayersTable();
  
  // Keep local player data in sync
  if (mySlotId) {
    const freshMe = playersList.find(p => p.slotId === mySlotId);
    if (freshMe) {
      myPlayer = freshMe;
      updateMyPlayerTag();
      
      // Asynchronous state synchronization to avoid race condition on reload
      if (gameState && gameState.status === "playing") {
        if (gameState.stage === "bottom") {
          setupBottomStage();
        } else if (gameState.stage === "top" && myPlayer.solvedCorrectly) {
          markTopStageSolved();
        }
      }
    } else {
      // My slot was kicked
      mySlotId = null;
      myPlayer = null;
      localStorage.removeItem("selectedSlotId");
      showScreen("lobby-screen");
      showCustomAlert("퇴장 알림", "감독에 의해 라인업에서 퇴장 처리되었습니다.");
    }
  }
});

// Listen to global game state
db.collection("game").doc("state").onSnapshot(doc => {
  if (!doc.exists) return;
  
  const newState = doc.data();
  const stateChanged = !gameState || 
                       gameState.status !== newState.status || 
                       gameState.inning !== newState.inning || 
                       gameState.stage !== newState.stage;
                       
  gameState = newState;

  if (stateChanged) {
    handleGameStateTransition();
  } else {
    // If only timer or winning player changed
    checkVictoryState();
  }

  // Always update timer UI and check/sync the admin timer loop
  updateTimerUI();
  syncAdminTimerLoop();
});

/* -------------------------------------------------------------
 * 4. LOBBY & PLAYER SLOTS LOGIC
 * Render lineup grid, choose hitter capacity and register
 * ------------------------------------------------------------- */

let selectedLobbySlotId = null;
let selectedClassType = "";

function renderSlots() {
  slotsGrid.innerHTML = "";
  playersList.forEach(player => {
    const card = document.createElement("div");
    card.className = "slot-card";
    
    if (player.active) {
      card.classList.add("occupied");
      let classBadgeClass = "";
      if (player.classType === "홈런형") classBadgeClass = "badge-homerun";
      if (player.classType === "타율형") classBadgeClass = "badge-average";
      if (player.classType === "도루형") classBadgeClass = "badge-steal";
      
      card.innerHTML = `
        <div class="slot-num">${player.slotName}</div>
        <div class="slot-player-name">${player.nickname}</div>
        <span class="slot-class-badge ${classBadgeClass}">${player.classType}</span>
      `;
    } else {
      // Empty slot
      card.innerHTML = `
        <div class="slot-num">${player.slotName}</div>
        <div class="slot-player-name" style="color: var(--text-secondary); font-weight:300;">선택 가능</div>
      `;
      
      if (selectedLobbySlotId === player.slotId) {
        card.classList.add("selected");
      }
      
      card.addEventListener("click", () => {
        if (gameState && gameState.status === "playing") {
          showCustomAlert("경기 시작됨", "이미 경기가 시작되었습니다. 대기방 모드일 때만 입장할 수 있습니다.");
          return;
        }
        selectLobbySlot(player.slotId, player.slotName);
      });
    }
    slotsGrid.appendChild(card);
  });
}

function selectLobbySlot(slotId, slotName) {
  selectedLobbySlotId = slotId;
  joinSlotTitle.innerText = `${slotName} 등록`;
  joinFormPanel.classList.remove("hidden");
  
  // Highlight currently selected card in lineup grid
  const cards = slotsGrid.querySelectorAll(".slot-card");
  playersList.forEach((p, idx) => {
    if (!p.active) {
      if (p.slotId === slotId) {
        cards[idx].classList.add("selected");
      } else {
        cards[idx].classList.remove("selected");
      }
    }
  });
  
  validateJoinForm();
}

// Select batter class capability
classCards.forEach(card => {
  card.addEventListener("click", () => {
    classCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedClassType = card.getAttribute("data-class");
    validateJoinForm();
  });
});

inputNickname.addEventListener("input", validateJoinForm);

function validateJoinForm() {
  const nickname = inputNickname.value.trim();
  if (nickname.length > 0 && selectedClassType && selectedLobbySlotId) {
    btnJoinGame.removeAttribute("disabled");
  } else {
    btnJoinGame.setAttribute("disabled", "true");
  }
}

// Register click
btnJoinGame.addEventListener("click", async () => {
  const nickname = inputNickname.value.trim();
  if (!nickname || !selectedClassType || !selectedLobbySlotId) return;

  try {
    // Transactional write to ensure slot is empty
    const slotRef = db.collection("players").doc(selectedLobbySlotId);
    await db.runTransaction(async transaction => {
      const sfDoc = await transaction.get(slotRef);
      if (sfDoc.data().active) {
        throw "이미 다른 플레이어가 등록한 슬롯입니다!";
      }
      transaction.update(slotRef, {
        active: true,
        nickname: nickname,
        classType: selectedClassType,
        solvedCorrectly: false,
        solvedAt: null,
        rank: 0,
        lastGuessedInning: 0
      });
    });

    mySlotId = selectedLobbySlotId;
    localStorage.setItem("selectedSlotId", mySlotId);
    
    // Clear feedback
    const feedback = document.getElementById("join-form-feedback");
    if (feedback) feedback.innerText = "";

    // Hide form panel
    joinFormPanel.classList.add("hidden");
    selectedLobbySlotId = null;
    
    // UI check
    checkPlayerSession();
    
  } catch (err) {
    const feedback = document.getElementById("join-form-feedback");
    if (feedback) {
      feedback.innerText = err;
      feedback.className = "feedback-msg error";
    }
  }
});

function updateMyPlayerTag() {
  if (myPlayer) {
    myPlayerNameLabel.innerText = `${myPlayer.nickname} (${myPlayer.slotName})`;
    playerBadge.innerText = myPlayer.classType;
    playerBadge.className = "badge";
    if (myPlayer.classType === "홈런형") playerBadge.classList.add("badge-homerun");
    if (myPlayer.classType === "타율형") playerBadge.classList.add("badge-average");
    if (myPlayer.classType === "도루형") playerBadge.classList.add("badge-steal");
  }
}

// Check session on load / slot registration
function checkPlayerSession() {
  if (mySlotId) {
    const me = playersList.find(p => p.slotId === mySlotId);
    if (me && me.active) {
      myPlayer = me;
      updateMyPlayerTag();
      
      // If game is already active, go directly to game screen
      if (gameState && gameState.status === "playing") {
        showScreen("game-screen");
      } else {
        showScreen("lobby-screen");
        lobbyStatusText.innerText = "라인업 등록 완료! 감독님이 게임을 시작할 때까지 대기해주세요.";
      }
    } else {
      // Clear invalid local slot ID
      mySlotId = null;
      myPlayer = null;
      localStorage.removeItem("selectedSlotId");
      showScreen("lobby-screen");
    }
  } else {
    showScreen("lobby-screen");
    lobbyStatusText.innerText = "빈 슬롯을 클릭하여 타자 정보를 등록하세요.";
  }
}

const adminScreen = document.getElementById("admin-screen");

function showScreen(screenId) {
  lobbyScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  if (adminScreen) adminScreen.classList.remove("active");
  
  if (screenId === "lobby-screen") {
    lobbyScreen.classList.add("active");
    gameBgOverlay.className = "bg-waiting";
  } else if (screenId === "game-screen") {
    gameScreen.classList.add("active");
  } else if (screenId === "admin-screen") {
    if (adminScreen) adminScreen.classList.add("active");
    gameBgOverlay.className = "bg-waiting";
  }
}

/* -------------------------------------------------------------
 * 5. GAME FLOW & TRANSITION ENGINE
 * Manages stages: [초] (Problem solving), [말] (Guessing), [광고시간] (Cleanup)
 * ------------------------------------------------------------- */

function handleGameStateTransition() {
  if (!gameState) return;

  // Clear previous state timers
  if (localTimerInterval) clearInterval(localTimerInterval);
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Background images switching based on stage
  if (gameState.status === "waiting") {
    showScreen("lobby-screen");
    homerunHintShown = false;
    // reset victory visual
    closeModal("victory-overlay");
    return;
  }

  if (gameState.status === "finished") {
    checkVictoryState();
    return;
  }

  // Active game mode
  showScreen("game-screen");
  
  // Set current scoreboard header
  let stageLabel = "";
  if (gameState.stage === "top") stageLabel = "문제 풀이";
  else if (gameState.stage === "bottom") stageLabel = "비밀번호 추리";
  else if (gameState.stage === "ad") stageLabel = "정비 (광고시간)";
  
  sbInningText.innerText = `${gameState.inning}회 ${gameState.stage === 'top' ? '초' : gameState.stage === 'bottom' ? '말' : '광고시간'}`;
  sbStageText.innerText = stageLabel;
  
  // Adjust BG styling
  gameBgOverlay.className = `bg-${gameState.stage}`;

  // Hide all panel templates
  stageTopPanel.classList.remove("active");
  stageBottomPanel.classList.remove("active");
  stageAdPanel.classList.remove("active");
  
  // Initialize timer
  startStageTimer();

  // STAGE SPECIFIC ROUTINES
  if (gameState.stage === "top") {
    setupTopStage();
  } else if (gameState.stage === "bottom") {
    setupBottomStage();
  } else if (gameState.stage === "ad") {
    setupAdStage();
  }
}

// Sync and display timer from Firestore (No local countdown intervals)
function startStageTimer() {
  updateTimerUI();
}

function updateTimerUI() {
  if (!gameState || typeof gameState.timeLeft === "undefined") {
    sbTimerText.innerText = "--:--";
    return;
  }

  const secsTotal = gameState.timeLeft;
  const mins = Math.floor(secsTotal / 60);
  const secs = secsTotal % 60;
  
  sbTimerText.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  // For ad stage visual timer in center
  if (gameState.stage === "ad") {
    const visualCounter = document.getElementById("ad-countdown-visual");
    if (visualCounter) {
      visualCounter.innerText = secsTotal.toString();
    }
  }
}

// Centered Admin-only loop to decrement Firestore timeLeft
let adminTimerInterval = null;

function syncAdminTimerLoop() {
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";
  
  // If not admin or game not playing, clear the interval
  if (!isAdmin || !gameState || gameState.status !== "playing") {
    if (adminTimerInterval) {
      clearInterval(adminTimerInterval);
      adminTimerInterval = null;
    }
    return;
  }
  
  // If admin is authenticated and playing, ensure ONE loop runs to decrement timeLeft
  if (!adminTimerInterval) {
    adminTimerInterval = setInterval(async () => {
      if (!gameState || gameState.status !== "playing") return;
      
      const newTimeLeft = (gameState.timeLeft || 0) - 1;
      
      if (newTimeLeft <= 0) {
        // Clear local timer before advancing to prevent multiple calls
        clearInterval(adminTimerInterval);
        adminTimerInterval = null;
        await autoAdvanceStage();
      } else {
        // Update Firestore: this will sync all clients immediately
        await db.collection("game").doc("state").update({
          timeLeft: newTimeLeft
        });
      }
    }, 1000);
  }
}

// Admin auto transition script
async function autoAdvanceStage() {
  if (!gameState) return;
  
  let nextStage = "top";
  let nextInning = gameState.inning;
  let initialTimeLeft = 60;
  let status = "playing";

  if (gameState.stage === "top") {
    nextStage = "bottom";
    initialTimeLeft = 120;
  } else if (gameState.stage === "bottom") {
    nextStage = "ad";
    initialTimeLeft = 10;
  } else if (gameState.stage === "ad") {
    nextStage = "top";
    nextInning = gameState.inning + 1;
    initialTimeLeft = 60;
    
    if (nextInning > 9) {
      status = "finished";
    }
  }

  const batch = db.batch();
  const stateRef = db.collection("game").doc("state");
  
  if (status === "finished") {
    batch.update(stateRef, { status: "finished" });
  } else {
    const updates = {
      stage: nextStage,
      inning: nextInning,
      timeLeft: initialTimeLeft
    };
    
    // Generate new problems when returning to "top"
    if (nextStage === "top") {
      updates.problems = generateThreeProblems();
      updates.solveCount = 0;
      
      // Clear solved states for all players
      const playerSnap = await db.collection("players").get();
      playerSnap.forEach(pDoc => {
        batch.update(pDoc.ref, {
          solvedCorrectly: false,
          solvedAt: null,
          rank: 0,
          lastGuessedInning: 0
        });
      });
    }
    
    batch.update(stateRef, updates);
  }

  await batch.commit();
}

/* -------------------------------------------------------------
 * 6. [초] STAGE: MATH PROBLEMS SOLVING
 * Logic for 5s count overlay (Steal class ignores) and inputs
 * ------------------------------------------------------------- */

function setupTopStage() {
  stageTopPanel.classList.add("active");
  
  // Reset fields
  ans1.value = "";
  ans2.value = "";
  ans3.value = "";
  ans1.disabled = false;
  ans2.disabled = false;
  ans3.disabled = false;
  btnSubmitAnswers.disabled = false;
  solveFeedback.innerText = "";
  solveFeedback.className = "feedback-msg";

  // Render questions
  if (gameState.problems && gameState.problems.length === 3) {
    document.getElementById("q1-text").innerHTML = gameState.problems[0].question;
    document.getElementById("q2-text").innerHTML = gameState.problems[1].question;
    document.getElementById("q3-text").innerHTML = gameState.problems[2].question;
    triggerMathJax();
  }

  // 1. 도루형 타자 능력 조건문: player.classType !== '도루형'인 경우에만 5초 카운트다운 실행
  if (myPlayer && myPlayer.classType !== "도루형") {
    // Show 5s Countdown overlay
    countdownOverlay.classList.remove("hidden");
    countdownTitle.innerText = `${gameState.inning}회 초 시작`;
    
    let countdownVal = 5;
    countdownNumber.innerText = countdownVal;
    
    ans1.disabled = true;
    ans2.disabled = true;
    ans3.disabled = true;
    btnSubmitAnswers.disabled = true;

    countdownInterval = setInterval(() => {
      countdownVal--;
      if (countdownVal <= 0) {
        clearInterval(countdownInterval);
        countdownOverlay.classList.add("hidden");
        
        // Unlock inputs
        if (!myPlayer.solvedCorrectly) {
          ans1.disabled = false;
          ans2.disabled = false;
          ans3.disabled = false;
          btnSubmitAnswers.disabled = false;
        }
      } else {
        countdownNumber.innerText = countdownVal;
      }
    }, 1000);
  } else {
    // 도루형 타자는 카운트다운 없이 즉시 문제 풀이 가능
    countdownOverlay.classList.add("hidden");
  }

  // If player already solved correctly (e.g. page reloaded mid-stage)
  if (myPlayer && myPlayer.solvedCorrectly) {
    markTopStageSolved();
  }
}

// Click Submit math answers
btnSubmitAnswers.addEventListener("click", async () => {
  if (!myPlayer || !gameState) return;

  const a1 = parseInt(ans1.value);
  const a2 = parseInt(ans2.value);
  const a3 = parseInt(ans3.value);

  if (isNaN(a1) || isNaN(a2) || isNaN(a3)) {
    solveFeedback.innerText = "모든 정답 칸에 정수를 입력해주세요!";
    solveFeedback.className = "feedback-msg error";
    return;
  }

  const correctAnswers = gameState.problems.map(p => p.answer);
  
  if (a1 === correctAnswers[0] && a2 === correctAnswers[1] && a3 === correctAnswers[2]) {
    // Correct!
    solveFeedback.innerText = "분석 완료! 상대 투수의 구질 분석에 성공하여 출루했습니다.";
    solveFeedback.className = "feedback-msg success";
    
    ans1.disabled = true;
    ans2.disabled = true;
    ans3.disabled = true;
    btnSubmitAnswers.disabled = true;

    // Register correct answer and rank in Firestore
    try {
      const playerRef = db.collection("players").doc(mySlotId);
      const stateRef = db.collection("game").doc("state");
      
      await db.runTransaction(async transaction => {
        const stateSnap = await transaction.get(stateRef);
        const currentSolveCount = stateSnap.data().solveCount || 0;
        const newRank = currentSolveCount + 1;
        
        transaction.update(playerRef, {
          solvedCorrectly: true,
          solvedAt: firebase.firestore.FieldValue.serverTimestamp(),
          rank: newRank
        });
        
        transaction.update(stateRef, {
          solveCount: newRank
        });
      });
      
    } catch (err) {
      console.error("Error writing solved rank:", err);
    }
  } else {
    // Incorrect
    solveFeedback.innerText = "오답이 포함되어 있습니다. 투구 궤적을 다시 구해보세요!";
    solveFeedback.className = "feedback-msg error";
  }
});

function markTopStageSolved() {
  solveFeedback.innerText = `분석 완료! (${myPlayer.rank}등 에이스 출루 완료)`;
  solveFeedback.className = "feedback-msg success";
  ans1.disabled = true;
  ans2.disabled = true;
  ans3.disabled = true;
  btnSubmitAnswers.disabled = true;
}

/* -------------------------------------------------------------
 * 7. [말] STAGE: CODE BREAKING (GUESS)
 * Evaluate Ace/Average slots logic, Home Run class hints
 * ------------------------------------------------------------- */

function setupBottomStage() {
  stageBottomPanel.classList.add("active");
  guessLayoutContainer.innerHTML = "";
  guessFeedback.innerText = "";
  guessFeedback.className = "feedback-msg";
  guessActionBar.classList.add("hidden");

  if (!myPlayer) return;

  // Check if player has already submitted guess for the current inning
  if (myPlayer.lastGuessedInning === gameState.inning) {
    guessLayoutContainer.innerHTML = `
      <div class="guess-waiting-state">
        <div class="baseball-spinner">⚾</div>
        <p class="waiting-text">제출 완료. 다른 선수의 타격이 끝나기를 대기 중입니다... ⚾</p>
      </div>
    `;
    guessActionBar.classList.add("hidden");
    return;
  }

  // 2. 타율/에이스 능력 구현: 추리 슬롯 개수 판정
  let slotCount = 0;
  let message = "";

  if (!myPlayer.solvedCorrectly) {
    // 오답자/미제출자 -> 추리 슬롯 0개
    slotCount = 0;
    message = "투구 분석(문제 풀이) 실패로 해당 이닝의 타격(추리) 기회를 잃었습니다.";
  } else {
    // 1등(에이스)인 경우 무조건 2개 슬롯
    // 2등이면서 타율형 타자인 경우 에이스와 동일하게 2개 슬롯
    if (myPlayer.rank === 1 || (myPlayer.classType === "타율형" && myPlayer.rank === 2)) {
      slotCount = 2;
    } else {
      // 그 외 정답자는 기본 1개
      slotCount = 1;
    }
  }

  // 3. 홈런형 타자 능력 구현: 3, 4이닝에 추가 힌트 팝업 제공
  if (myPlayer.classType === "홈런형" && myPlayer.solvedCorrectly && !homerunHintShown) {
    if (gameState.inning === 3 || gameState.inning === 4) {
      homerunHintShown = true;
      const targetCode = gameState.targetCode;
      // 3회이면 0번째 숫자, 4회이면 1번째 숫자 노출
      const hintDigit = targetCode[gameState.inning - 3];
      
      setTimeout(() => {
        showCustomAlert("🔥 홈런형 타자 특별 힌트 🔥", `상대 투수의 4자리 암호에 숫자 '${hintDigit}'가 포함되어 있습니다!`);
      }, 500);
    }
  }

  // Render guess input interface
  if (slotCount === 0) {
    guessLayoutContainer.innerHTML = `<div class="guess-no-perm">${message}</div>`;
  } else {
    guessActionBar.classList.remove("hidden");
    for (let i = 1; i <= slotCount; i++) {
      const slotCard = document.createElement("div");
      slotCard.className = "guess-slot-card";
      
      const title = slotCount === 2 ? `타격 슬롯 ${i}` : "타격 슬롯";
      slotCard.innerHTML = `
        <div class="guess-slot-title">${title}</div>
        <div class="digits-input-wrapper">
          <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="0">
          <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="1">
          <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="2">
          <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="3">
        </div>
      `;
      guessLayoutContainer.appendChild(slotCard);
    }
    
    // Add input jumping logic for digits input boxes
    setupDigitBoxesJumping();
  }
}

function setupDigitBoxesJumping() {
  const allInputs = document.querySelectorAll(".digit-box");
  allInputs.forEach((input, index) => {
    // Only accept numeric input
    input.addEventListener("input", (e) => {
      input.value = input.value.replace(/[^0-9]/g, "");
      
      if (input.value.length === 1) {
        const nextInput = allInputs[index + 1];
        if (nextInput && nextInput.classList.contains(input.classList[1])) {
          nextInput.focus();
        }
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (input.value.length === 0) {
          const prevInput = allInputs[index - 1];
          if (prevInput && prevInput.classList.contains(input.classList[1])) {
            prevInput.focus();
            prevInput.value = "";
          }
        }
      }
    });
  });
}

// Click Submit guesses
document.getElementById("btn-submit-guess").addEventListener("click", async () => {
  if (!myPlayer || !gameState) return;

  const target = gameState.targetCode;
  const numSlots = guessLayoutContainer.querySelectorAll(".guess-slot-card").length;
  const guesses = [];

  for (let i = 1; i <= numSlots; i++) {
    const digitInputs = document.querySelectorAll(`.slot-${i}-digit`);
    let guessVal = "";
    digitInputs.forEach(inp => {
      guessVal += inp.value;
    });

    if (guessVal.length < 4) {
      guessFeedback.innerText = `타격 슬롯 ${i}의 4자리 숫자를 모두 입력해 주세요!`;
      guessFeedback.className = "feedback-msg error";
      return;
    }
    
    // Check for duplicate digits in a single guess
    const uniqueDigits = new Set(guessVal);
    if (uniqueDigits.size < 4) {
      guessFeedback.innerText = `타격 슬롯 ${i}의 입력값에 중복된 숫자가 있습니다. 중복되지 않도록 입력해주세요!`;
      guessFeedback.className = "feedback-msg error";
      return;
    }
    
    guesses.push(guessVal);
  }

  // Submit and evaluate
  try {
    const batch = db.batch();
    let bestResult = null;
    let winDetected = false;
    
    for (let guessCode of guesses) {
      const res = evaluateGuessCode(guessCode, target);
      const resString = getResultString(res);
      
      // Keep best result for UI feedback (highest 'a' count)
      if (!bestResult || res.a > bestResult.a) {
        bestResult = res;
      }
      
      if (res.a === 4) {
        winDetected = true;
      }

      // Add to player's records subcollection
      const newGuessRef = db.collection("players").doc(mySlotId).collection("guesses").doc();
      batch.set(newGuessRef, {
        inning: gameState.inning,
        guess: guessCode,
        result: resString,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    // Set lastGuessedInning to record that player has completed guessing for this inning
    const playerRef = db.collection("players").doc(mySlotId);
    batch.update(playerRef, {
      lastGuessedInning: gameState.inning
    });

    await batch.commit();

    // Visual feedback
    if (bestResult) {
      guessFeedback.innerText = `판정 결과: ${getResultString(bestResult)}`;
      if (bestResult.a > 0 || bestResult.b > 0) {
        guessFeedback.className = "feedback-msg success";
      } else {
        guessFeedback.className = "feedback-msg error";
      }
    }

    // Win condition check: 4a (Strikeout / Homerun)
    if (winDetected) {
      await db.collection("game").doc("state").update({
        status: "finished",
        winningPlayer: mySlotId
      });
    }

  } catch (err) {
    console.error("Guess submit error:", err);
  }
});

/* -------------------------------------------------------------
 * 8. [광고시간] STAGE
 * 10 seconds break before next inning
 * ------------------------------------------------------------- */

function setupAdStage() {
  stageAdPanel.classList.add("active");
  homerunHintShown = false; // Reset for next inning
}

/* -------------------------------------------------------------
 * 9. RECORD BOOK MODAL (기록지 열람)
 * Fetch subcollection data and display
 * ------------------------------------------------------------- */

document.getElementById("btn-view-records").addEventListener("click", async () => {
  if (!myPlayer) return;
  
  document.getElementById("record-slot-name").innerText = myPlayer.slotName;
  document.getElementById("record-class-type").innerText = myPlayer.classType;
  
  const tbody = document.getElementById("record-table-body");
  tbody.innerHTML = '<tr><td colspan="3">불러오는 중...</td></tr>';
  
  showModal("modal-record-book");

  try {
    const querySnapshot = await db.collection("players").doc(mySlotId)
      .collection("guesses")
      .orderBy("timestamp", "asc")
      .get();
      
    tbody.innerHTML = "";
    if (querySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="3">아직 기록이 없습니다. 다음 이닝에서 타격을 시작하세요!</td></tr>';
      return;
    }

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.inning}회 말</td>
        <td class="font-digital" style="color: var(--neon-yellow);">${data.guess}</td>
        <td class="font-digital" style="color: var(--success-color); font-weight:700;">${data.result.toUpperCase()}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error loading record book:", err);
    tbody.innerHTML = '<tr><td colspan="3" class="error-msg">기록지를 로드하는 도중 오류가 발생했습니다.</td></tr>';
  }
});

/* -------------------------------------------------------------
 * 10. VICTORY & FIREWORKS EFFECT
 * Canvas-based particle explosion loops for home run celebration
 * ------------------------------------------------------------- */

let fireworksActive = false;
const canvas = document.getElementById("fireworks-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function checkVictoryState() {
  if (gameState && gameState.status === "finished" && gameState.winningPlayer) {
    const winner = playersList.find(p => p.slotId === gameState.winningPlayer);
    const winnerName = winner ? `${winner.nickname} (${winner.slotName})` : "타자";
    
    winnerInfoLabel.innerText = `우승 타자: ${winnerName}`;
    showModal("victory-overlay");
    startFireworks();
  } else {
    closeModal("victory-overlay");
    stopFireworks();
  }
}

document.getElementById("btn-victory-close").addEventListener("click", () => {
  closeModal("victory-overlay");
  stopFireworks();
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);

function startFireworks() {
  if (fireworksActive) return;
  fireworksActive = true;
  resizeCanvas();
  particles = [];
  fireworksLoop();
}

function stopFireworks() {
  fireworksActive = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 6 + 2;
    this.friction = 0.95;
    this.gravity = 0.12;
    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.01;
    this.size = Math.random() * 3 + 1.5;
  }

  update() {
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createExplosion(x, y) {
  const colors = ["#ff0055", "#00e676", "#00e5ff", "#ff9100", "#fffb14", "#d500f9"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  for (let i = 0; i < 60; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function fireworksLoop() {
  if (!fireworksActive) return;
  requestAnimationFrame(fireworksLoop);

  // Background trailing effect
  ctx.fillStyle = "rgba(3, 7, 18, 0.15)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Spawn random explosion
  if (Math.random() < 0.08) {
    createExplosion(
      Math.random() * canvas.width,
      Math.random() * (canvas.height * 0.6) + canvas.height * 0.1
    );
  }

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      p.draw();
    }
  }
}

/* -------------------------------------------------------------
 * 11. ADMIN/MANAGER DASHBOARD CONTROLS
 * Session checking with passcode "2525" and forced override actions
 * ------------------------------------------------------------- */

// Function to update the Admin UI fields in the lobby screen
function checkAdminSessionUI() {
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";
  const loginFields = document.getElementById("admin-login-fields");
  const loggedInFields = document.getElementById("admin-logged-in-fields");
  
  if (isAdmin) {
    if (loginFields) loginFields.classList.add("hidden");
    if (loggedInFields) loggedInFields.classList.remove("hidden");
    showScreen("admin-screen");
    openAdminDashboard();
  } else {
    if (loginFields) loginFields.classList.remove("hidden");
    if (loggedInFields) loggedInFields.classList.add("hidden");
  }
}

if (btnLobbyAdminAuth) {
  btnLobbyAdminAuth.addEventListener("click", () => {
    const pw = inputLobbyAdminPassword.value.trim();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuth", "true");
      if (lobbyAdminError) lobbyAdminError.innerText = "";
      inputLobbyAdminPassword.value = "";
      checkAdminSessionUI();
      openAdminDashboard();
    } else {
      if (lobbyAdminError) lobbyAdminError.innerText = "비밀번호 오류";
    }
  });
}

if (btnLobbyAdminDashboard) {
  btnLobbyAdminDashboard.addEventListener("click", () => {
    showScreen("admin-screen");
    openAdminDashboard();
  });
}

// Standalone Admin Logout
const btnAdminLogout = document.getElementById("btn-admin-logout");
if (btnAdminLogout) {
  btnAdminLogout.addEventListener("click", () => {
    sessionStorage.removeItem("adminAuth");
    if (adminTimerInterval) {
      clearInterval(adminTimerInterval);
      adminTimerInterval = null;
    }
    checkAdminSessionUI();
    showScreen("lobby-screen");
  });
}

async function openAdminDashboard() {
  // Reset password tooltip state on reload
  hideAdminCode();
  isToggledOn = false;

  const admErrorMsg = document.getElementById("adm-error-msg");
  if (admErrorMsg) {
    admErrorMsg.innerText = "";
    admErrorMsg.className = "feedback-msg";
  }

  if (gameState) {
    admInning.value = gameState.inning.toString();
    admStage.value = gameState.stage;
    admTargetCode.value = ""; // Clear password input box to prevent leakage
  }
  
  updateAdminPlayersTable();
}

function updateAdminPlayersTable() {
  const tbody = document.getElementById("adm-players-list");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  if (playersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">연결된 플레이어가 없습니다.</td></tr>';
    return;
  }

  playersList.forEach(player => {
    const tr = document.createElement("tr");
    
    let statusText = player.active ? "접속중" : "대기";
    let statusDot = player.active ? "active" : "inactive";
    
    // Status text and style logic based on current game stage (Inning-specific updates)
    let solvedText = "-";
    let solvedStyle = "color: var(--text-secondary);";
    if (gameState && gameState.status === "playing" && gameState.stage !== "waiting") {
      if (gameState.stage === "top") {
        if (player.solvedCorrectly) {
          solvedText = "제출 완료 ⚾";
          solvedStyle = "color: var(--success-color); font-weight: bold;";
        } else {
          solvedText = "문제를 푸는 중 ✍️";
          solvedStyle = "color: var(--text-secondary);";
        }
      } else if (gameState.stage === "bottom") {
        if (player.lastGuessedInning === gameState.inning) {
          solvedText = "추리 완료 🔒";
          solvedStyle = "color: var(--success-color); font-weight: bold;";
        } else if (player.solvedCorrectly) {
          solvedText = "비밀번호 추리 중 🤔";
          solvedStyle = "color: var(--warning-color); font-weight: bold;";
        } else {
          solvedText = "추리 불가 ❌";
          solvedStyle = "color: var(--danger-color);";
        }
      } else {
        solvedText = "정비 중 ⚾";
      }
    }

    tr.innerHTML = `
      <td>${player.slotName}</td>
      <td><strong>${player.nickname || '-'}</strong></td>
      <td>${player.classType || '-'}</td>
      <td><span class="status-dot-mini ${statusDot}"></span>${statusText}</td>
      <td style="${solvedStyle}">${solvedText}</td>
      <td>${player.rank > 0 ? `${player.rank}등` : '-'}</td>
      <td>
        <button class="btn btn-danger btn-small btn-kick" data-id="${player.slotId}" ${!player.active ? 'disabled' : ''}>퇴장</button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Kick listener using custom modal confirmations
  const kickButtons = tbody.querySelectorAll(".btn-kick");
  kickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const slotId = btn.getAttribute("data-id");
      showCustomConfirm("선수 강제 퇴장", `${slotId} 선수를 엔트리에서 퇴장시키겠습니까?`, async () => {
        await db.collection("players").doc(slotId).update({
          active: false,
          nickname: "",
          classType: "",
          solvedCorrectly: false,
          solvedAt: null,
          rank: 0,
          lastGuessedInning: 0
        });
        
        // Also wipe their guess history
        const guessesSnap = await db.collection("players").doc(slotId).collection("guesses").get();
        const batch = db.batch();
        guessesSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        updateAdminPlayersTable();
      });
    });
  });
}

// Target code secret reveal toggle and press-and-hold bindings
const btnAdmRevealCode = document.getElementById("btn-adm-reveal-code");

let pressStartTime = 0;
let isHolding = false;
let isToggledOn = false;
let tooltipEl = null;

function showAdminCode() {
  if (!gameState) return;
  
  if (tooltipEl) tooltipEl.remove();
  
  tooltipEl = document.createElement("div");
  tooltipEl.className = "reveal-tooltip font-digital";
  tooltipEl.innerText = gameState.targetCode;
  document.body.appendChild(tooltipEl);
  
  const rect = btnAdmRevealCode.getBoundingClientRect();
  tooltipEl.style.position = "absolute";
  tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  tooltipEl.style.top = `${rect.top - 45}px`;
  tooltipEl.style.transform = "translateX(-50%)";
  tooltipEl.style.zIndex = "2500";
}

function hideAdminCode() {
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
}

function handlePressStart() {
  pressStartTime = Date.now();
  isHolding = true;
  showAdminCode();
}

function handlePressEnd() {
  const pressDuration = Date.now() - pressStartTime;
  isHolding = false;
  
  if (pressDuration > 250) {
    // It was a long press/hold, so hide on release
    hideAdminCode();
    isToggledOn = false;
  } else {
    // It was a short click, toggle the state
    if (isToggledOn) {
      hideAdminCode();
      isToggledOn = false;
    } else {
      showAdminCode();
      isToggledOn = true;
    }
  }
}

if (btnAdmRevealCode) {
  // Prevent default context menu to ensure hold works smoothly on touchscreens
  btnAdmRevealCode.addEventListener("contextmenu", (e) => e.preventDefault());

  // Mouse event listeners
  btnAdmRevealCode.addEventListener("mousedown", (e) => {
    e.preventDefault();
    handlePressStart();
  });

  btnAdmRevealCode.addEventListener("mouseup", (e) => {
    e.preventDefault();
    handlePressEnd();
  });

  btnAdmRevealCode.addEventListener("mouseleave", (e) => {
    if (isHolding) {
      isHolding = false;
      hideAdminCode();
      isToggledOn = false;
    }
  });

  // Touch event listeners for mobile/tablet chrome
  btnAdmRevealCode.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handlePressStart();
  });

  btnAdmRevealCode.addEventListener("touchend", (e) => {
    e.preventDefault();
    handlePressEnd();
  });

  btnAdmRevealCode.addEventListener("touchcancel", (e) => {
    isHolding = false;
    hideAdminCode();
    isToggledOn = false;
  });
}

btnAdmRandomCode.addEventListener("click", () => {
  admTargetCode.value = generateTargetCode();
});

btnAdmUpdateState.addEventListener("click", async () => {
  if (!gameState) return;
  const inningVal = parseInt(admInning.value);
  const stageVal = admStage.value;
  let codeVal = admTargetCode.value.trim();
  const admErrorMsg = document.getElementById("adm-error-msg");

  if (codeVal === "") {
    codeVal = gameState.targetCode; // Default to existing targetCode if empty
  } else {
    if (codeVal.length !== 4 || isNaN(parseInt(codeVal))) {
      if (admErrorMsg) {
        admErrorMsg.innerText = "비밀번호는 4자리 숫자여야 합니다.";
        admErrorMsg.className = "feedback-msg error";
      }
      return;
    }
    
    const uniqueCode = new Set(codeVal);
    if (uniqueCode.size < 4) {
      if (admErrorMsg) {
        admErrorMsg.innerText = "비밀번호 숫자는 서로 달라야 합니다 (중복 불가).";
        admErrorMsg.className = "feedback-msg error";
      }
      return;
    }
  }

  try {
    let initialTimeLeft = 60;
    if (stageVal === "bottom") initialTimeLeft = 120;
    if (stageVal === "ad") initialTimeLeft = 10;
    
    const updates = {
      status: "playing",
      inning: inningVal,
      stage: stageVal,
      targetCode: codeVal,
      timeLeft: initialTimeLeft
    };

    // If stage becomes "top", generate questions and reset players solved status
    const batch = db.batch();
    if (stageVal === "top") {
      updates.problems = generateThreeProblems();
      updates.solveCount = 0;
      
      const playerSnap = await db.collection("players").get();
      playerSnap.forEach(pDoc => {
        batch.update(pDoc.ref, {
          solvedCorrectly: false,
          solvedAt: null,
          rank: 0,
          lastGuessedInning: 0
        });
      });
    }

    batch.update(db.collection("game").doc("state"), updates);
    await batch.commit();
    
    if (admErrorMsg) {
      admErrorMsg.innerText = "설정이 동기화되었습니다.";
      admErrorMsg.className = "feedback-msg success";
    }

  } catch (err) {
    if (admErrorMsg) {
      admErrorMsg.innerText = "에러 발생: " + err;
      admErrorMsg.className = "feedback-msg error";
    }
  }
});

btnAdmForceNext.addEventListener("click", () => {
  const admErrorMsg = document.getElementById("adm-error-msg");
  showCustomConfirm("강제 이동", "다음 스테이지로 강제 이동하시겠습니까?", async () => {
    try {
      await autoAdvanceStage();
      // Refresh admin modal selects
      if (gameState) {
        admInning.value = gameState.inning.toString();
        admStage.value = gameState.stage;
        admTargetCode.value = ""; // Keep hidden
      }
      if (admErrorMsg) {
        admErrorMsg.innerText = "스테이지가 변경되었습니다.";
        admErrorMsg.className = "feedback-msg success";
      }
    } catch (err) {
      if (admErrorMsg) {
        admErrorMsg.innerText = "오류: " + err;
        admErrorMsg.className = "feedback-msg error";
      }
    }
  });
});

btnAdmResetAll.addEventListener("click", () => {
  showCustomConfirm("경기 전체 초기화", "🚨 정말로 경기를 전체 초기화하시겠습니까?\n모든 선수 데이터와 세션 기록이 영구적으로 지워집니다.", async () => {
    try {
      const batch = db.batch();
      
      // Reset player slots
      const playersSnap = await db.collection("players").get();
      for (let pDoc of playersSnap.docs) {
        batch.update(pDoc.ref, {
          active: false,
          nickname: "",
          classType: "",
          solvedCorrectly: false,
          solvedAt: null,
          rank: 0,
          lastGuessedInning: 0
        });
        
        // delete guesses subcollection
        const guessesSnap = await pDoc.ref.collection("guesses").get();
        guessesSnap.forEach(gDoc => {
          batch.delete(gDoc.ref);
        });
      }

      // Reset game state to lobby status
      const stateRef = db.collection("game").doc("state");
      batch.update(stateRef, {
        status: "waiting",
        inning: 1,
        stage: "top",
        timeLeft: 60,
        winningPlayer: null,
        targetCode: generateTargetCode(),
        problems: generateThreeProblems(),
        solveCount: 0
      });

      await batch.commit();
      
      showCustomAlert("초기화 완료", "경기 포맷 및 초기화가 성공적으로 완료되었습니다!");
    } catch (err) {
      showCustomAlert("초기화 실패", "초기화에 실패했습니다: " + err);
    }
  });
});

/* -------------------------------------------------------------
 * 12. HELPER UTILS & MODALS DIALOGS
 * ------------------------------------------------------------- */

function showModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// Custom Modal Dialog Helpers to replace browser prompts/alerts/confirms
function showCustomAlert(title, message) {
  const modalAlert = document.getElementById("modal-custom-alert");
  if (!modalAlert) return;

  document.getElementById("alert-title").innerText = title;
  document.getElementById("alert-message").innerText = message;
  showModal("modal-custom-alert");
  
  const btnClose = document.getElementById("btn-alert-close");
  const newBtnClose = btnClose.cloneNode(true);
  btnClose.parentNode.replaceChild(newBtnClose, btnClose);
  
  newBtnClose.addEventListener("click", () => {
    closeModal("modal-custom-alert");
  });
}

function showCustomConfirm(title, message, onConfirm) {
  const modalConfirm = document.getElementById("modal-custom-confirm");
  if (!modalConfirm) return;

  document.getElementById("confirm-title").innerText = title;
  document.getElementById("confirm-message").innerText = message;
  showModal("modal-custom-confirm");
  
  const btnYes = document.getElementById("btn-confirm-yes");
  const btnNo = document.getElementById("btn-confirm-no");
  
  const newBtnYes = btnYes.cloneNode(true);
  const newBtnNo = btnNo.cloneNode(true);
  btnYes.parentNode.replaceChild(newBtnYes, btnYes);
  btnNo.parentNode.replaceChild(newBtnNo, btnNo);
  
  newBtnYes.addEventListener("click", () => {
    closeModal("modal-custom-confirm");
    onConfirm();
  });
  
  newBtnNo.addEventListener("click", () => {
    closeModal("modal-custom-confirm");
  });
}

// Global modal closer when clicking overlay
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay") && e.target.id !== "victory-overlay") {
    e.target.classList.remove("active");
  }
});

// Setup user status checks and sync on page load
window.addEventListener("DOMContentLoaded", async () => {
  // Let players snapshot listener execute first, then check session
  setTimeout(() => {
    checkPlayerSession();
    checkAdminSessionUI();
  }, 1000);
});
