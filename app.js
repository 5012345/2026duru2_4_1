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
let lastSetupInning = null;
let lastSetupStage = null;

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

  // 2. Intermediate Question: Translation and x-intercept
  let a = randomIntExcludingZero(-4, 4);
  let xInt = randomIntExcludingZero(-8, 8);
  let n = randomIntExcludingZero(-6, 6);
  let b = -a * xInt - n;
  
  let formula = formatLinearFunction(a, b);
  let interText = `일차함수 \\( ${formula} \\)의 그래프를 \\( y \\)축 방향으로 \\( ${n} \\)만큼 평행이동한 그래프의 \\( x \\)절편은?`;
  let interAns = xInt;

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

function generateWeakHint(targetCode, existingHints = []) {
  if (!targetCode || targetCode.length < 4) return "";
  
  const digits = targetCode.split("").map(Number);
  const sum = digits.reduce((x, y) => x + y, 0);
  const evens = digits.filter(n => n % 2 === 0).length;
  const odds = 4 - evens;
  const max = Math.max(...digits);
  const min = Math.min(...digits);
  
  const pool = [
    { id: "sum_value", text: `투수 암호의 4자리 숫자의 합은 ${sum}입니다.` },
    { id: "even_count", text: `투수 암호에 포함된 짝수의 개수는 ${evens}개입니다.` },
    { id: "min_max_diff", text: `투수 암호의 가장 큰 숫자와 가장 작은 숫자의 차이는 ${max - min}입니다.` },
    { id: "sum_1_4", text: `투수 암호의 첫 번째 숫자와 네 번째 숫자의 합은 ${digits[0] + digits[3]}입니다.` },
    { id: "sum_2_3", text: `투수 암호의 두 번째 숫자와 세 번째 숫자의 합은 ${digits[1] + digits[2]}입니다.` },
    { id: "parity_1", text: `투수 암호의 첫 번째 숫자는 ${digits[0] % 2 === 0 ? '짝수' : '홀수'}입니다.` },
    { id: "parity_4", text: `투수 암호의 네 번째 숫자는 ${digits[3] % 2 === 0 ? '짝수' : '홀수'}입니다.` },
    { id: "odd_count", text: `투수 암호에 포함된 홀수의 개수는 ${odds}개입니다.` },
    { id: "sum_parity", text: `투수 암호의 모든 숫자의 합은 ${sum % 2 === 0 ? '짝수' : '홀수'}입니다.` }
  ];

  function isRedundant(candidateId, candidateText) {
    if (existingHints.includes(candidateText)) return true;
    for (let existing of existingHints) {
      if (candidateId === "sum_parity" && existing.startsWith("투수 암호의 4자리 숫자의 합은")) {
        return true;
      }
      if (candidateId === "odd_count" && existing.startsWith("투수 암호에 포함된 짝수의 개수")) {
        return true;
      }
      if (candidateId === "even_count" && existing.startsWith("투수 암호에 포함된 홀수의 개수")) {
        return true;
      }
    }
    return false;
  }

  const validCandidates = pool.filter(c => !isRedundant(c.id, c.text));

  let chosenHint = "";
  if (validCandidates.length > 0) {
    chosenHint = validCandidates[Math.floor(Math.random() * validCandidates.length)].text;
  } else {
    chosenHint = pool[Math.floor(Math.random() * pool.length)].text;
  }

  return chosenHint;
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
        timeLeft: 65,
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
          lastGuessedInning: 0,
          hintHistory: []
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
      if (freshMe.active) {
        const solvedChanged = !myPlayer || myPlayer.solvedCorrectly !== freshMe.solvedCorrectly;
        const playerRegistered = !myPlayer;
        
        myPlayer = freshMe;
        updateMyPlayerTag();
        
        // Asynchronous state synchronization to avoid race condition on reload
        if (gameState && gameState.status === "playing") {
          showScreen("game-screen");
          if (solvedChanged || playerRegistered || lastSetupStage !== gameState.stage || lastSetupInning !== gameState.inning) {
            if (gameState.stage === "bottom") {
              setupBottomStage();
            } else if (gameState.stage === "top") {
              if (myPlayer.solvedCorrectly) {
                markTopStageSolved();
              } else {
                setupTopStage();
              }
            } else if (gameState.stage === "ad") {
              setupAdStage();
            }
          }
        } else {
          showScreen("lobby-screen");
          lobbyStatusText.innerText = "라인업 등록 완료! 감독님이 게임을 시작할 때까지 대기해주세요.";
        }
      } else {
        // Player slot became inactive (kicked or reset)
        if (myPlayer !== null) {
          mySlotId = null;
          myPlayer = null;
          localStorage.removeItem("selectedSlotId");
          showScreen("lobby-screen");
          showCustomAlert("퇴장 알림", "감독에 의해 라인업에서 퇴장 처리되었습니다 또는 게임이 초기화되었습니다.");
        }
      }
    } else {
      if (myPlayer !== null) {
        mySlotId = null;
        myPlayer = null;
        localStorage.removeItem("selectedSlotId");
        showScreen("lobby-screen");
      }
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
        lastGuessedInning: 0,
        hintHistory: []
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
    if (playersList.length === 0) {
      // playersList has not loaded yet from Firestore, do not wipe!
      return;
    }
    const me = playersList.find(p => p.slotId === mySlotId);
    if (me && me.active) {
      myPlayer = me;
      updateMyPlayerTag();
      
      // If game is already active, go directly to game screen and sync stage
      if (gameState && gameState.status === "playing") {
        showScreen("game-screen");
        if (gameState.stage === "bottom") {
          setupBottomStage();
        } else if (gameState.stage === "top") {
          if (myPlayer.solvedCorrectly) {
            markTopStageSolved();
          } else {
            setupTopStage();
          }
        } else if (gameState.stage === "ad") {
          setupAdStage();
        }
      } else {
        showScreen("lobby-screen");
        lobbyStatusText.innerText = "라인업 등록 완료! 감독님이 게임을 시작할 때까지 대기해주세요.";
      }
    } else {
      // Clear invalid local slot ID (only if playersList has loaded and we are sure they are inactive)
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
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";
  if (isAdmin && screenId !== "admin-screen") {
    return;
  }

  lobbyScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  if (adminScreen) adminScreen.classList.remove("active");
  
  if (screenId === "lobby-screen") {
    lobbyScreen.classList.add("active");
    gameBgOverlay.className = "bg-waiting";
  } else {
    if (screenId === "game-screen") {
      gameScreen.classList.add("active");
    } else if (screenId === "admin-screen") {
      if (adminScreen) adminScreen.classList.add("active");
      gameBgOverlay.className = "bg-waiting";
    }
  }
}

/* -------------------------------------------------------------
 * 5. GAME FLOW & TRANSITION ENGINE
 * Manages stages: [초] (Problem solving), [말] (Guessing), [광고시간] (Cleanup)
 * ------------------------------------------------------------- */

function handleGameStateTransition() {
  if (!gameState) return;

  // Keep admin dashboard select dropdowns in sync if the admin dashboard is active
  if (typeof admInning !== "undefined" && typeof admStage !== "undefined" && admInning && admStage) {
    const isAdmin = sessionStorage.getItem("adminAuth") === "true";
    if (isAdmin) {
      admInning.value = gameState.inning.toString();
      admStage.value = gameState.stage;
    }
  }

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
  // If the player has not registered yet, keep them on the lobby screen to register.
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";
  if (!isAdmin && (!mySlotId || !myPlayer || !myPlayer.active)) {
    showScreen("lobby-screen");
    lobbyStatusText.innerText = "경기가 이미 진행 중입니다. 빈 슬롯을 선택하여 중도 참가하세요! ⚾";
    return;
  }

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

  // Hide all panel templates using explicit display: none (Mutually Exclusive Display)
  stageTopPanel.style.display = "none";
  stageBottomPanel.style.display = "none";
  stageAdPanel.style.display = "none";

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
  // Synchronize admin dashboard stats if available
  const admSbInning = document.getElementById("adm-sb-inning");
  if (admSbInning && gameState) {
    let stageSuffix = "";
    if (gameState.stage === "top") stageSuffix = "초";
    else if (gameState.stage === "bottom") stageSuffix = "말";
    else if (gameState.stage === "ad") stageSuffix = "광고";
    admSbInning.innerText = `${gameState.inning}회 ${stageSuffix}`;
  }

  if (gameState && gameState.status === "finished") {
    sbTimerText.innerText = "00:00";
    const admSbTimer = document.getElementById("adm-sb-timer");
    if (admSbTimer) admSbTimer.innerText = "00:00";
    return;
  }
  if (!gameState || typeof gameState.timeLeft === "undefined") {
    sbTimerText.innerText = "--:--";
    const admSbTimer = document.getElementById("adm-sb-timer");
    if (admSbTimer) admSbTimer.innerText = "--:--";
    return;
  }

  let secsTotal = gameState.timeLeft;
  if (gameState.stage === "top" && secsTotal > 60) {
    secsTotal = 60;
  }

  const mins = Math.floor(secsTotal / 60);
  const secs = secsTotal % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  sbTimerText.innerText = timeStr;
  
  const admSbTimer = document.getElementById("adm-sb-timer");
  if (admSbTimer) {
    admSbTimer.innerText = timeStr;
    // Color coding for urgency
    if (secsTotal <= 10) {
      admSbTimer.style.color = "var(--danger-color)";
    } else if (secsTotal <= 30) {
      admSbTimer.style.color = "var(--warning-color)";
    } else {
      admSbTimer.style.color = "var(--success-color)";
    }
  }
  
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
  let initialTimeLeft = 65;
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
    initialTimeLeft = 65;
    
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
  stageTopPanel.style.display = "flex";
  stageTopPanel.classList.add("active");
  
  // Hide bottom hint container
  const bottomHintContainer = document.getElementById("bottom-hint-container");
  if (bottomHintContainer) {
    bottomHintContainer.style.display = "none";
    bottomHintContainer.innerHTML = "";
  }
  
  // Reset fields
  ans1.value = "";
  ans2.value = "";
  ans3.value = "";
  ans1.disabled = true;
  ans2.disabled = true;
  ans3.disabled = true;
  btnSubmitAnswers.disabled = true;
  btnSubmitAnswers.innerText = "분석 결과 전송 (제출)";
  solveFeedback.innerText = "";
  solveFeedback.className = "feedback-msg";

  // Hide the math problems container initially
  const mathProblemsContainer = document.getElementById("math-problems-container");
  if (mathProblemsContainer) {
    mathProblemsContainer.style.visibility = "hidden";
  }

  function renderProblems() {
    if (gameState.problems && gameState.problems.length === 3) {
      document.getElementById("q1-text").innerHTML = gameState.problems[0].question;
      document.getElementById("q2-text").innerHTML = gameState.problems[1].question;
      document.getElementById("q3-text").innerHTML = gameState.problems[2].question;
      triggerMathJax();
    }
    if (mathProblemsContainer) {
      mathProblemsContainer.style.visibility = "visible";
    }
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // 1. 도루형 타자 능력 조건문: player.classType !== '도루형'인 경우에만 5초 카운트다운 실행
  const isStealHitter = myPlayer && myPlayer.classType === "도루형";
  const serverTimeLeft = (gameState && typeof gameState.timeLeft !== "undefined") ? gameState.timeLeft : 60;
  
  if (isStealHitter || serverTimeLeft <= 60) {
    countdownOverlay.classList.add("hidden");
    renderProblems();
    if (myPlayer && !myPlayer.solvedCorrectly) {
      ans1.disabled = false;
      ans2.disabled = false;
      ans3.disabled = false;
      btnSubmitAnswers.disabled = false;
    }
  } else {
    // Show countdown overlay and set the remaining countdown duration
    countdownOverlay.classList.remove("hidden");
    countdownTitle.innerText = `${gameState.inning}회 초 시작`;
    
    let countdownVal = serverTimeLeft - 60;
    if (countdownVal < 0) countdownVal = 0;
    if (countdownVal > 5) countdownVal = 5;
    
    countdownNumber.innerText = countdownVal;

    countdownInterval = setInterval(() => {
      countdownVal--;
      if (countdownVal <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        countdownOverlay.classList.add("hidden");
        
        // Render problems now
        renderProblems();

        // Unlock inputs
        if (myPlayer && !myPlayer.solvedCorrectly) {
          ans1.disabled = false;
          ans2.disabled = false;
          ans3.disabled = false;
          btnSubmitAnswers.disabled = false;
        }
      } else {
        countdownNumber.innerText = countdownVal;
      }
    }, 1000);
  }

  // If player already solved correctly (e.g. page reloaded mid-stage)
  if (myPlayer && myPlayer.solvedCorrectly) {
    markTopStageSolved();
  }

  lastSetupInning = gameState.inning;
  lastSetupStage = gameState.stage;
}

// Click Submit math answers
btnSubmitAnswers.addEventListener("click", async () => {
  if (!myPlayer) {
    showCustomAlert("제출 오류", "선수 등록이 되어있지 않습니다. 로비에서 먼저 타자로 등록해주세요.");
    return;
  }
  if (!gameState) return;

  // Change UI immediately to "제출 완료 ⚾" and disable to prevent double submissions
  btnSubmitAnswers.disabled = true;
  btnSubmitAnswers.innerText = "제출 완료 ⚾";

  const a1 = parseInt(ans1.value);
  const a2 = parseInt(ans2.value);
  const a3 = parseInt(ans3.value);

  if (isNaN(a1) || isNaN(a2) || isNaN(a3)) {
    solveFeedback.innerText = "모든 정답 칸에 정수를 입력해주세요!";
    solveFeedback.className = "feedback-msg error";
    // Restore button state
    btnSubmitAnswers.disabled = false;
    btnSubmitAnswers.innerText = "분석 결과 전송 (제출)";
    return;
  }

  const correctAnswers = gameState.problems.map(p => p.answer);
  
  if (a1 === correctAnswers[0] && a2 === correctAnswers[1] && a3 === correctAnswers[2]) {
    // Correct!
    const existing = (myPlayer && myPlayer.hintHistory) ? myPlayer.hintHistory : [];
    const hint = generateWeakHint(gameState.targetCode, existing);
    solveFeedback.innerText = "분석 완료! 상대 투수의 구질 분석에 성공하여 출루했습니다.";
    solveFeedback.className = "feedback-msg success";
    
    ans1.disabled = true;
    ans2.disabled = true;
    ans3.disabled = true;

    // Register correct answer, rank, and hint in Firestore
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
          rank: newRank,
          hintHistory: firebase.firestore.FieldValue.arrayUnion(hint)
        });
        
        transaction.update(stateRef, {
          solveCount: newRank
        });

        // Save hint history in subcollection
        const hintRef = db.collection("players").doc(mySlotId).collection("hints").doc(`inning_${gameState.inning}`);
        transaction.set(hintRef, {
          inning: gameState.inning,
          hint: hint,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
    } catch (err) {
      console.error("Error writing solved rank:", err);
      // Restore button state on transaction failure
      btnSubmitAnswers.disabled = false;
      btnSubmitAnswers.innerText = "분석 결과 전송 (제출)";
    }
  } else {
    // Incorrect
    solveFeedback.innerText = "오답이 포함되어 있습니다. 투구 궤적을 다시 구해보세요!";
    solveFeedback.className = "feedback-msg error";
    // Restore button state
    btnSubmitAnswers.disabled = false;
    btnSubmitAnswers.innerText = "분석 결과 전송 (제출)";
  }
});

function markTopStageSolved() {
  solveFeedback.innerText = `분석 완료! (${myPlayer.rank}등 에이스 출루 완료)`;
  solveFeedback.className = "feedback-msg success";
  ans1.disabled = true;
  ans2.disabled = true;
  ans3.disabled = true;
  btnSubmitAnswers.disabled = true;
  btnSubmitAnswers.innerText = "제출 완료 ⚾";
  
  // Animation retrigger
  const successBadge = document.querySelector(".feedback-msg.success");
  if (successBadge) {
      successBadge.style.animation = "none";
      void successBadge.offsetWidth;
      successBadge.style.animation = null;
  }
}

/* -------------------------------------------------------------
 * 7. [말] STAGE: CODE BREAKING (GUESS)
 * Evaluate Ace/Average slots logic, Home Run class hints
 * ------------------------------------------------------------- */

async function setupBottomStage() {
  countdownOverlay.classList.add("hidden");

  // Force flex displays to override any conflicting styles
  stageBottomPanel.style.display = "flex";
  stageBottomPanel.classList.add("active");
  
  guessLayoutContainer.style.display = "flex";
  guessLayoutContainer.innerHTML = "";
  guessFeedback.innerText = "";
  guessFeedback.className = "feedback-msg";
  
  // Re-enable and reset guess submit button display
  const btnSubmitGuess = document.getElementById("btn-submit-guess");
  if (btnSubmitGuess) {
    btnSubmitGuess.disabled = false;
    btnSubmitGuess.innerText = "배트 휘두르기 (추리 제출)";
  }
  guessActionBar.classList.add("hidden");

  // Show bottom hint container if they solved correctly
  const bottomHintContainer = document.getElementById("bottom-hint-container");
  if (bottomHintContainer) {
    if (myPlayer && myPlayer.solvedCorrectly) {
      bottomHintContainer.innerHTML = `<span class="math-hint-span">💡 힌트가 기록지에 입력되었습니다. 우측 상단의 [기록지 열람] 버튼을 눌러 확인하세요. ⚾</span>`;
      bottomHintContainer.style.display = "block";
    } else {
      bottomHintContainer.style.display = "none";
      bottomHintContainer.innerHTML = "";
    }
  }

  if (!myPlayer) {
    guessLayoutContainer.innerHTML = `<div class="guess-no-perm">선수 등록이 되어 있지 않습니다. 로비에서 타자를 등록해 주세요.</div>`;
    return;
  }

  // Check if player has already submitted guess for the current inning
  if (myPlayer.lastGuessedInning === gameState.inning) {
    guessLayoutContainer.innerHTML = `
      <div class="guess-waiting-state">
        <div class="baseball-spinner">⚾</div>
        <p class="waiting-text">제출 완료. 다른 선수의 타격이 끝나기를 대기 중입니다... ⚾</p>
      </div>
    `;
    return;
  }

  // 2. 타율/에이스 능력 구현: 추리 슬롯 개수 판정
  let slotCount = 1;

  if (myPlayer.solvedCorrectly) {
    if (myPlayer.rank === 1 || (myPlayer.classType === "타율형" && myPlayer.rank <= 3)) {
      slotCount = 2;
    } else {
      slotCount = 1;
    }
  } else {
    slotCount = 1;
  }

  // 3. 홈런형 타자 능력 구현: 2회 말과 4회 말에 추리 슬롯 1개 추가 제공 (문제 풀이 여부와 무관)
  if (myPlayer.classType === "홈런형") {
    if (gameState.inning === 2 || gameState.inning === 4) {
      slotCount += 1;
    }
  }

  // Render guess input interface
  if (slotCount === 0) {
    guessLayoutContainer.innerHTML = `<div class="guess-no-perm">${message}</div>`;
  } else {
    try {
      // Fetch past guesses for the current inning to restore on reload (No index required)
      const guessesSnap = await db.collection("players").doc(mySlotId).collection("guesses")
        .where("inning", "==", gameState.inning)
        .get();
        
      const pastGuesses = [];
      guessesSnap.forEach(doc => {
        pastGuesses.push(doc.data());
      });

      // Sort client side by slotIndex
      pastGuesses.sort((a, b) => {
        if (a.slotIndex !== undefined && b.slotIndex !== undefined) {
          return a.slotIndex - b.slotIndex;
        }
        const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp.toMillis() || 0) : 0;
        const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp.toMillis() || 0) : 0;
        return timeA - timeB;
      });

      // If they already submitted all allowed guesses, force waiting state
      if (pastGuesses.length >= slotCount) {
        await db.collection("players").doc(mySlotId).update({
          lastGuessedInning: gameState.inning
        });
        guessLayoutContainer.innerHTML = `
          <div class="guess-waiting-state">
            <div class="baseball-spinner">⚾</div>
            <p class="waiting-text">제출 완료. 다른 선수의 타격이 끝나기를 대기 중입니다... ⚾</p>
          </div>
        `;
        return;
      }

      // Render slots
      for (let i = 1; i <= slotCount; i++) {
        const slotCard = document.createElement("div");
        slotCard.className = "guess-slot-card";
        
        const title = slotCount === 2 ? `타격 슬롯 ${i}` : "타격 슬롯";
        const pastGuess = pastGuesses.find(g => g.slotIndex === i) || pastGuesses[i - 1];
        
        if (pastGuess) {
          const guessVal = pastGuess.guess;
          const resultText = pastGuess.result;
          const isCorrect = resultText.includes("4a");
          const feedbackClass = isCorrect ? "feedback-msg success" : "feedback-msg error";
          
          slotCard.innerHTML = `
            <div class="guess-slot-title">${title}</div>
            <div class="digits-input-wrapper">
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="0" value="${guessVal[0]}" disabled>
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="1" value="${guessVal[1]}" disabled>
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="2" value="${guessVal[2]}" disabled>
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="3" value="${guessVal[3]}" disabled>
            </div>
            <button class="btn btn-secondary btn-full" disabled style="margin-top: 15px; font-size: 0.9rem; padding: 10px 16px;">제출 완료 ⚾</button>
            <div class="${feedbackClass}" style="margin-top: 10px; min-height: 20px; font-size: 0.95rem; text-align: center;">판정 결과: ${resultText}</div>
          `;
        } else {
          slotCard.innerHTML = `
            <div class="guess-slot-title">${title}</div>
            <div class="digits-input-wrapper">
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="0">
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="1">
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="2">
              <input type="text" maxlength="1" class="digit-box slot-${i}-digit" data-index="3">
            </div>
            <button class="btn btn-success btn-full btn-submit-slot-guess" data-slot="${i}" style="margin-top: 15px; font-size: 0.9rem; padding: 10px 16px;">배트 휘두르기 (추리 제출)</button>
            <div class="feedback-msg guess-slot-feedback" id="guess-slot-${i}-feedback" style="margin-top: 10px; min-height: 20px; font-size: 0.95rem; text-align: center;"></div>
          `;
        }
        guessLayoutContainer.appendChild(slotCard);
      }
      
      // Bind click handlers for submit buttons inside slot cards
      bindSlotSubmitButtons(slotCount);
      
      // Add input jumping logic for digits input boxes
      setupDigitBoxesJumping();

    } catch (err) {
      console.error("Error setting up bottom stage inputs:", err);
    }
  }

  lastSetupInning = gameState.inning;
  lastSetupStage = gameState.stage;
}

function setupDigitBoxesJumping() {
  const allInputs = document.querySelectorAll(".digit-box");
  allInputs.forEach((input, index) => {
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

function bindSlotSubmitButtons(slotCount) {
  const submitButtons = guessLayoutContainer.querySelectorAll(".btn-submit-slot-guess");
  submitButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!myPlayer) {
        showCustomAlert("제출 오류", "선수 등록이 되어있지 않습니다. 로비에서 먼저 타자로 등록해주세요.");
        return;
      }
      if (!gameState) return;
      
      const slotIndex = parseInt(btn.getAttribute("data-slot"));
      const digitInputs = document.querySelectorAll(`.slot-${slotIndex}-digit`);
      let guessVal = "";
      
      digitInputs.forEach(inp => {
        guessVal += inp.value.trim();
      });

      const feedbackEl = document.getElementById(`guess-slot-${slotIndex}-feedback`);
      
      if (guessVal.length < 4) {
        if (feedbackEl) {
          feedbackEl.innerText = "4자리 숫자를 모두 입력해 주세요!";
          feedbackEl.className = "feedback-msg error";
        }
        return;
      }
      
      const uniqueDigits = new Set(guessVal);
      if (uniqueDigits.size < 4) {
        if (feedbackEl) {
          feedbackEl.innerText = "중복된 숫자가 있습니다. 서로 다른 숫자를 입력해 주세요!";
          feedbackEl.className = "feedback-msg error";
        }
        return;
      }

      digitInputs.forEach(inp => inp.disabled = true);
      btn.disabled = true;
      btn.innerText = "대기 중...";
      
      const target = gameState.targetCode;
      
      try {
        const res = evaluateGuessCode(guessVal, target);
        const resString = getResultString(res);
        const isCorrect = res.a === 4;
        
        const batch = db.batch();
        const newGuessRef = db.collection("players").doc(mySlotId).collection("guesses").doc();
        
        batch.set(newGuessRef, {
          inning: gameState.inning,
          guess: guessVal,
          result: resString,
          slotIndex: slotIndex,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        const allSubmitButtons = guessLayoutContainer.querySelectorAll(".btn-submit-slot-guess");
        let allSubmitted = true;
        allSubmitButtons.forEach(b => {
          if (b !== btn && !b.disabled) {
            allSubmitted = false;
          }
        });

        if (allSubmitted || isCorrect) {
          const playerRef = db.collection("players").doc(mySlotId);
          batch.update(playerRef, {
            lastGuessedInning: gameState.inning
          });
        }

        await batch.commit();

        btn.innerText = "제출 완료 ⚾";
        btn.className = "btn btn-secondary btn-full";
        
        if (feedbackEl) {
          feedbackEl.innerText = `판정 결과: ${resString}`;
          if (res.a > 0 || res.b > 0) {
            feedbackEl.className = "feedback-msg success";
          } else {
            feedbackEl.className = "feedback-msg error";
          }
        }

        if (isCorrect) {
          triggerVictory(mySlotId, myPlayer.nickname ? `${myPlayer.nickname} (${myPlayer.slotName})` : "타자");
          await db.collection("game").doc("state").update({
            status: "finished",
            winningPlayer: mySlotId
          });
        }

      } catch (err) {
        console.error("Error submitting slot guess:", err);
        digitInputs.forEach(inp => inp.disabled = false);
        btn.disabled = false;
        btn.innerText = "배트 휘두르기 (추리 제출)";
        if (feedbackEl) {
          feedbackEl.innerText = "제출 에러: " + err.message;
          feedbackEl.className = "feedback-msg error";
        }
      }
    });
  });
}

/* -------------------------------------------------------------
 * 8. [광고시간] STAGE
 * 10 seconds break before next inning
 * ------------------------------------------------------------- */

function setupAdStage() {
  countdownOverlay.classList.add("hidden");
  stageAdPanel.style.display = "flex";
  stageAdPanel.classList.add("active");
  homerunHintShown = false; // Reset for next inning

  lastSetupInning = gameState.inning;
  lastSetupStage = gameState.stage;
}

/* -------------------------------------------------------------
 * 9. RECORD BOOK MODAL (기록지 열람)
 * Fetch subcollection data and display
 * ------------------------------------------------------------- */

document.getElementById("btn-view-records").addEventListener("click", async () => {
  if (!myPlayer) return;
  
  document.getElementById("record-slot-name").innerText = myPlayer.slotName;
  document.getElementById("record-class-type").innerText = myPlayer.classType;
  
  const guessesList = document.getElementById("record-guesses-list");
  const hintsList = document.getElementById("record-hints-list");
  
  guessesList.innerHTML = '<li class="record-list-empty">불러오는 중...</li>';
  hintsList.innerHTML = '<li class="record-list-empty">불러오는 중...</li>';
  
  showModal("modal-record-book");

  try {
    // 1. Fetch guesses
    const guessesSnap = await db.collection("players").doc(mySlotId)
      .collection("guesses")
      .get();
      
    const pastGuesses = [];
    guessesSnap.forEach(doc => {
      pastGuesses.push(doc.data());
    });
    
    // Sort guesses by inning and then slotIndex or timestamp
    pastGuesses.sort((a, b) => {
      if (a.inning !== b.inning) {
        return a.inning - b.inning;
      }
      if (a.slotIndex !== undefined && b.slotIndex !== undefined) {
        return a.slotIndex - b.slotIndex;
      }
      const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp.toMillis() || 0) : 0;
      const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp.toMillis() || 0) : 0;
      return timeA - timeB;
    });

    guessesList.innerHTML = "";
    if (pastGuesses.length === 0) {
      guessesList.innerHTML = '<li class="record-list-empty">아직 추리 기록이 없습니다.</li>';
    } else {
      pastGuesses.forEach(data => {
        const li = document.createElement("li");
        li.className = "record-list-item";
        li.innerHTML = `
          <span class="record-list-item-inning">${data.inning}회 말</span>
          <span class="record-list-item-guess">${data.guess}</span>
          <span class="record-list-item-result">${data.result.toUpperCase()}</span>
        `;
        guessesList.appendChild(li);
      });
    }

    // 2. Fetch hints
    const hintsSnap = await db.collection("players").doc(mySlotId)
      .collection("hints")
      .get();
      
    const pastHints = [];
    hintsSnap.forEach(doc => {
      pastHints.push(doc.data());
    });
    
    pastHints.sort((a, b) => {
      if (a.inning !== b.inning) {
        return a.inning - b.inning;
      }
      const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp.toMillis() || 0) : 0;
      const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp.toMillis() || 0) : 0;
      return timeA - timeB;
    });

    hintsList.innerHTML = "";
    if (pastHints.length === 0) {
      hintsList.innerHTML = '<li class="record-list-empty">아직 획득한 힌트가 없습니다.</li>';
    } else {
      pastHints.forEach(data => {
        let displayHint = data.hint;
        
        // Defensive self-healing: if the fetched hint is empty, dynamically regenerate and update Firestore
        if (!displayHint && gameState && gameState.targetCode) {
          displayHint = generateWeakHint(gameState.targetCode, []);
          
          const batch = db.batch();
          const pRef = db.collection("players").doc(mySlotId);
          const hRef = db.collection("players").doc(mySlotId).collection("hints").doc(`inning_${data.inning}`);
          
          batch.update(hRef, { hint: displayHint });
          batch.update(pRef, {
            hintHistory: firebase.firestore.FieldValue.arrayUnion(displayHint)
          });
          batch.commit().catch(err => console.error("Error healing hint database:", err));
        }

        const li = document.createElement("li");
        li.className = "record-list-item";
        const stageSuffix = data.stage || ((displayHint && displayHint.includes("홈런형")) ? "말" : "초");
        li.innerHTML = `
          <span class="record-list-item-inning">${data.inning}회 ${stageSuffix}</span>
          <span class="record-list-item-hint">${displayHint || "힌트 분석 중..."}</span>
        `;
        hintsList.appendChild(li);
      });
    }

  } catch (err) {
    console.error("Error loading record book:", err);
    guessesList.innerHTML = '<li class="record-list-empty" style="color: var(--danger-color);">기록지 로드 오류</li>';
    hintsList.innerHTML = '<li class="record-list-empty" style="color: var(--danger-color);">힌트 목록 로드 오류</li>';
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

function triggerVictory(winnerSlotId, winnerName) {
  // Stop all local countdowns and timers immediately
  if (localTimerInterval) { clearInterval(localTimerInterval); localTimerInterval = null; }
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (adminTimerInterval) { clearInterval(adminTimerInterval); adminTimerInterval = null; }
  sbTimerText.innerText = "00:00";
  
  const winner = playersList.find(p => p.slotId === winnerSlotId);
  const slotName = winner ? winner.slotName : "";
  const name = winnerName || (winner ? winner.nickname : "타자");
  const displayName = slotName ? `${name} (${slotName})` : name;
  
  if (winnerInfoLabel) {
    winnerInfoLabel.innerText = `우승 타자: ${displayName}`;
  }
  
  const msgEl = document.querySelector(".victory-message");
  if (msgEl) {
    msgEl.innerHTML = "축하합니다! 이번 경기에서 승리하셨습니다.<br>승리의 기쁨을 선생님께 찾아가 알리세요!";
  }
  
  // Force retriggering of cheerleader diagonal slide animation
  const cheerleader = document.querySelector(".cheerleader-image");
  if (cheerleader) {
    cheerleader.style.animation = "none";
    cheerleader.offsetHeight; // trigger reflow
    cheerleader.style.animation = "slideDiagonal 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards";
  }
  
  showModal("victory-overlay");
  startFireworks();
}

function checkVictoryState() {
  if (gameState && gameState.status === "finished" && gameState.winningPlayer) {
    const winner = playersList.find(p => p.slotId === gameState.winningPlayer);
    const winnerName = winner ? `${winner.nickname} (${winner.slotName})` : "타자";
    triggerVictory(gameState.winningPlayer, winnerName);
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
          lastGuessedInning: 0,
          hintHistory: []
        });
        
        // Also wipe their guess and hint history
        const guessesSnap = await db.collection("players").doc(slotId).collection("guesses").get();
        const hintsSnap = await db.collection("players").doc(slotId).collection("hints").get();
        const batch = db.batch();
        guessesSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        hintsSnap.forEach(doc => {
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
  tooltipEl.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  tooltipEl.style.top = `${rect.top - 45 + window.scrollY}px`;
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
  
  let codeVal = admTargetCode.value.trim();
  const admErrorMsg = document.getElementById("adm-error-msg");

  if (codeVal === "") {
    codeVal = generateTargetCode(); // Auto-generate if empty
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
    const initialTimeLeft = 65; // 1회초 is 65 seconds (includes 5s countdown)
    
    const updates = {
      status: "playing",
      inning: 1,
      stage: "top",
      targetCode: codeVal,
      timeLeft: initialTimeLeft,
      problems: generateThreeProblems(),
      solveCount: 0
    };

    const batch = db.batch();
    
    // Clear solved states for all players
    const playerSnap = await db.collection("players").get();
    playerSnap.forEach(pDoc => {
      batch.update(pDoc.ref, {
        solvedCorrectly: false,
        solvedAt: null,
        rank: 0,
        lastGuessedInning: 0,
        hintHistory: []
      });
    });

    batch.update(db.collection("game").doc("state"), updates);
    await batch.commit();
    
    // Update admin selects visually to reflect 1회초
    admInning.value = "1";
    admStage.value = "top";
    admTargetCode.value = ""; // Keep hidden

    if (admErrorMsg) {
      admErrorMsg.innerText = "경기가 성공적으로 시작되었습니다! (1회초)";
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
          lastGuessedInning: 0,
          hintHistory: []
        });
        
        // delete guesses and hints subcollection
        const guessesSnap = await pDoc.ref.collection("guesses").get();
        guessesSnap.forEach(gDoc => {
          batch.delete(gDoc.ref);
        });
        const hintsSnap = await pDoc.ref.collection("hints").get();
        hintsSnap.forEach(hDoc => {
          batch.delete(hDoc.ref);
        });
      }

      // Reset game state to lobby status
      const stateRef = db.collection("game").doc("state");
      batch.update(stateRef, {
        status: "waiting",
        inning: 1,
        stage: "top",
        timeLeft: 65,
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


  // Rules modals bindings
  const btnLobbyRules = document.getElementById("btn-lobby-rules");
  const btnGameRules = document.getElementById("btn-game-rules");

  if (btnLobbyRules) {
    btnLobbyRules.addEventListener("click", () => {
      showModal("modal-rules");
    });
  }

  if (btnGameRules) {
    btnGameRules.addEventListener("click", () => {
      showModal("modal-rules");
    });
  }
});
