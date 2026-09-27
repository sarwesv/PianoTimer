/**
 * Fullscreen Timer with Dashboard Settings & Odometer Sliding Digits + Dynamic Custom Message Wave
 */

let targetSeconds = 30 * 60; // Default 30 mins
let remainingSeconds = targetSeconds;
let isRunning = false;
let gsapTween = null;
let audioCtx = null;
let ringtoneInterval = null;
let customMessage = "Time’s Up!"; // Customizable completion message

// Digit tracking
let currentDigits = { m10: null, m1: null, s10: null, s1: null };

// Main DOM Elements
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const completionView = document.getElementById('completionView');
const completionText = document.getElementById('completionText');
const dismissBtn = document.getElementById('dismissBtn');

const cols = {
  m10: document.querySelector('#m10 .digit-track'),
  m1: document.querySelector('#m1 .digit-track'),
  s10: document.querySelector('#s10 .digit-track'),
  s1: document.querySelector('#s1 .digit-track')
};

// Dashboard Elements
const dashboardToggleBtn = document.getElementById('dashboardToggleBtn');
const dashboardCloseBtn = document.getElementById('dashboardCloseBtn');
const dashboardOverlay = document.getElementById('dashboardOverlay');
const dashboardDrawer = document.getElementById('dashboardDrawer');
const customMessageInput = document.getElementById('customMessageInput');
const presetChips = document.querySelectorAll('.preset-chip');
const customMinsInput = document.getElementById('customMins');
const customSecsInput = document.getElementById('customSecs');
const applyCustomBtn = document.getElementById('applyCustomBtn');

// Web Audio API Context
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Ringtone Chime
function playRingtoneChime() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];

  notes.forEach((freq, index) => {
    const noteTime = now + index * 0.15;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);

    gainNode.gain.setValueAtTime(0.001, noteTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, noteTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 1.3);
  });
}

function startRingtoneLoop() {
  playRingtoneChime();
  ringtoneInterval = setInterval(playRingtoneChime, 2500);
}

function stopRingtoneLoop() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

/**
 * Slide digit down like an odometer
 */
function updateDigit(key, newDigitVal, animate = true) {
  const newDigitStr = String(newDigitVal);
  if (currentDigits[key] === newDigitStr) return;

  const track = cols[key];

  if (!animate || currentDigits[key] === null) {
    track.innerHTML = `<span>${newDigitStr}</span>`;
    gsap.set(track, { y: 0 });
    currentDigits[key] = newDigitStr;
    return;
  }

  const prevDigitStr = currentDigits[key];
  track.innerHTML = `<span>${newDigitStr}</span><span>${prevDigitStr}</span>`;

  const singleSpanHeight = track.querySelector('span').offsetHeight;
  gsap.set(track, { y: -singleSpanHeight });

  gsap.to(track, {
    y: 0,
    duration: 0.75,
    ease: "power2.inOut",
    onComplete: () => {
      track.innerHTML = `<span>${newDigitStr}</span>`;
      gsap.set(track, { y: 0 });
    }
  });

  currentDigits[key] = newDigitStr;
}

// Convert total seconds to digits and update display
function updateDisplay(sec, animate = true) {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);

  const m10 = Math.floor(mins / 10);
  const m1 = mins % 10;
  const s10 = Math.floor(secs / 10);
  const s1 = secs % 10;

  updateDigit('m10', m10, animate);
  updateDigit('m1', m1, animate);
  updateDigit('s10', s10, animate);
  updateDigit('s1', s1, animate);
}

// Helper to build animated letter spans from custom message text
function buildMessageLetterSpans(text) {
  completionText.innerHTML = '';
  const characters = Array.from(text);

  characters.forEach(char => {
    if (char === ' ') {
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'space';
      spaceSpan.innerHTML = '&nbsp;';
      completionText.appendChild(spaceSpan);
    } else {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      letterSpan.textContent = char;
      completionText.appendChild(letterSpan);
    }
  });
}

// Toggle Timer
function toggleTimer() {
  getAudioContext();

  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (remainingSeconds <= 0) return;
  isRunning = true;
  startBtn.textContent = 'Pause';

  const dummyObj = { time: remainingSeconds };
  gsapTween = gsap.to(dummyObj, {
    time: 0,
    duration: remainingSeconds,
    ease: "none",
    onUpdate: () => {
      const nextSec = Math.ceil(dummyObj.time);
      if (nextSec !== remainingSeconds) {
        remainingSeconds = nextSec;
        updateDisplay(remainingSeconds, true);
      }
    },
    onComplete: () => {
      onTimerFinished();
    }
  });
}

function pauseTimer() {
  isRunning = false;
  startBtn.textContent = 'Start';
  if (gsapTween) gsapTween.pause();
}

function resetTimer() {
  if (gsapTween) gsapTween.kill();
  isRunning = false;
  remainingSeconds = targetSeconds;
  currentDigits = { m10: null, m1: null, s10: null, s1: null };
  updateDisplay(remainingSeconds, false);
  startBtn.textContent = 'Start';
}

function setTargetDuration(totalSec) {
  targetSeconds = Math.max(1, totalSec);
  resetTimer();
}

/**
 * Completion Handler: Renders custom message and plays up/down letter wave animation
 */
function onTimerFinished() {
  isRunning = false;
  startBtn.textContent = 'Start';
  startRingtoneLoop();

  // Generate dynamic letter spans for custom message
  buildMessageLetterSpans(customMessage || "Time’s Up!");
  const letters = completionText.querySelectorAll('.letter');

  completionView.classList.add('active');

  const tl = gsap.timeline();

  tl.to(completionView, { opacity: 1, duration: 0.4 })
  .fromTo(letters, 
    { y: 50, opacity: 0 }, 
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.07,
      ease: "back.out(2)"
    }, 
    "-=0.1"
  )
  .to(letters, {
    y: -18,
    duration: 0.45,
    repeat: -1,
    yoyo: true,
    stagger: {
      each: 0.08,
      from: "start"
    },
    ease: "sine.inOut"
  })
  .to(dismissBtn, { opacity: 1, y: 0, duration: 0.4 }, "-=0.3");
}

function dismissTimer() {
  stopRingtoneLoop();

  const letters = completionText.querySelectorAll('.letter');
  gsap.killTweensOf(letters);

  gsap.to(completionView, {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      completionView.classList.remove('active');
      gsap.set(letters, { opacity: 0, y: 50 });
      gsap.set(dismissBtn, { opacity: 0, y: 30 });
      resetTimer();
    }
  });
}

// Dashboard Handlers
function openDashboard() {
  dashboardOverlay.classList.add('active');
  dashboardDrawer.classList.add('open');
}

function closeDashboard() {
  dashboardOverlay.classList.remove('active');
  dashboardDrawer.classList.remove('open');
}

dashboardToggleBtn.addEventListener('click', openDashboard);
dashboardCloseBtn.addEventListener('click', closeDashboard);
dashboardOverlay.addEventListener('click', closeDashboard);

presetChips.forEach(chip => {
  chip.addEventListener('click', () => {
    presetChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const totalSec = parseInt(chip.dataset.preset, 10);
    setTargetDuration(totalSec);

    customMinsInput.value = Math.floor(totalSec / 60);
    customSecsInput.value = String(totalSec % 60).padStart(2, '0');

    closeDashboard();
  });
});

applyCustomBtn.addEventListener('click', () => {
  // Update Custom Message
  if (customMessageInput.value.trim() !== '') {
    customMessage = customMessageInput.value.trim();
  }

  // Update Duration
  const mins = parseInt(customMinsInput.value, 10) || 0;
  const secs = parseInt(customSecsInput.value, 10) || 0;
  const totalSec = mins * 60 + secs;

  if (totalSec > 0) {
    presetChips.forEach(c => c.classList.remove('active'));
    setTargetDuration(totalSec);
  }

  closeDashboard();
});

// Controls Event Listeners
startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
dismissBtn.addEventListener('click', dismissTimer);

// Initial Display Setup
updateDisplay(remainingSeconds, false);
