document.addEventListener("DOMContentLoaded", () => {
  // === LẤY ELEMENT ===
  // const levelSelection = document.getElementById("levelSelection");
  // const modeSelection = document.getElementById("modeSelection");
  // const gameArea = document.getElementById("gameArea");
  const question = document.getElementById("question");
  const resultDiv = document.getElementById("result");
  const timerSpan = document.getElementById("timeLeft");
  const playerPoint = document.getElementById("playerPoint");
  const botPoint = document.getElementById("botPoint");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const optionsDiv = document.getElementById("options");

  // === BIẾN ===
  let selectedLevel = "";
  let mode = ""; // "match" hoặc "write"
  let allKanjiInLevel = [];
  let currentKanji = "";
  let currentMeaning = "";
  let strokes = [];
  let userStrokes = [];
  let isDrawing = false;
  let currentPoints = [];
  let playerScore = 0;
  let botScore = 0;
  let timeLeft = 60;
  let timerInterval = null;
  let currentStrokeIndex = 0;

  // === KIỂM TRA ĐĂNG NHẬP ===
  const username = localStorage.getItem('username');
  if (!username) {
    alert("Vui lòng đăng nhập!");
    window.location.href = '/login';
  }

  // === TẢI KANJI CẤP ĐỘ ===
  async function loadAllKanjiInLevel(level) {
    const url = `https://kanjiapi.dev/v1/kanji/${level}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data;
    } catch {
      question.innerHTML = `<span style="color:red">Lỗi tải dữ liệu cấp độ</span>`;
      return [];
    }
  }

  // === LẤY NGHĨA ===
  async function getMeaning(kanji) {
    try {
      const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
      const data = await res.json();
      return data.meanings?.[0] || "Không rõ nghĩa";
    } catch {
      return "Kanji";
    }
  }

  // === TẢI NÉT VẼ (KanjiVG từ GitHub) ===
  async function loadStrokes(kanji) {
    const code = kanji.codePointAt(0).toString(16).padStart(5, '0').toLowerCase();
    const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      return Array.from(doc.querySelectorAll("path")).map(p => p.getAttribute("d"));
    } catch {
      console.warn("Không có nét vẽ cho:", kanji);
      return [];
    }
  }

  // === TIMER ===
  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    timerSpan.textContent = timeLeft;
    timerInterval = setInterval(() => {
      timeLeft--;
      timerSpan.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
  }

  // === KẾT THÚC GAME ===
  function endGame() {
    canvas.classList.add('hidden');
    document.querySelector('.btn-group').classList.add('hidden');
    optionsDiv.innerHTML = "";

    let winner = "";
    if (playerScore > botScore) winner = "🎉 BẠN THẮNG! Bot sẽ trở lại mạnh hơn! ☠️";
    else if (botScore > playerScore) winner = "🤖 BOT THẮNG! Bạn là gà con! 🍗";
    else winner = "⚔️ HÒA! Hai bên ngang tài ngang sức!";

    resultDiv.innerHTML = `
      <div class="final-result">
        ⏰ HẾT GIỜ!<br><br>
        Điểm bạn: <strong>${playerScore.toFixed(1)}</strong><br>
        Điểm Bot: <strong>${botScore.toFixed(1)}</strong><br><br>
        <span style="font-size:42px">${winner}</span>
      </div>
      <button onclick="location.reload()" style="margin-top:30px; padding:18px 50px; font-size:22px; background:#667eea; color:white; border:none; border-radius:50px; cursor:pointer;">
        Chơi lại
      </button>
    `;
  }

  // === CHỌN CẤP ĐỘ ===
  window.selectLevel = function(level) {
    selectedLevel = level;
    levelSelection.classList.add('hidden');
    modeSelection.classList.remove('hidden');
  };

  // === BẮT ĐẦU GAME ===
  window.startGame = async function(selectedMode) {
    mode = selectedMode;
    modeSelection.classList.add('hidden');
    gameArea.classList.remove('hidden');

    allKanjiInLevel = await loadAllKanjiInLevel(selectedLevel);
    if (allKanjiInLevel.length === 0) return;

    playerScore = 0;
    botScore = 0;
    playerPoint.textContent = 0;
    botPoint.textContent = 0;
    currentStrokeIndex = 0;

    startTimer();
    nextRound();
  };

  // === VÒNG MỚI ===
  async function nextRound() {
    currentKanji = allKanjiInLevel[Math.floor(Math.random() * allKanjiInLevel.length)];
    currentMeaning = await getMeaning(currentKanji);
    strokes = await loadStrokes(currentKanji);
    userStrokes = [];
    currentPoints = [];
    currentStrokeIndex = 0;

    question.innerHTML = `Chữ nào có nghĩa là "<strong>${currentMeaning}</strong>"?`;

    if (mode === "match") {
      canvas.classList.add('hidden');
      document.querySelector('.btn-group').classList.add('hidden');
      showMatchOptions();
    } else {
      optionsDiv.innerHTML = "";
      canvas.classList.remove('hidden');
      document.querySelector('.btn-group').classList.remove('hidden');
      clearCanvas();
    }
  }

  // === CHẾ ĐỘ NỐI NGHĨA ===
  async function showMatchOptions() {
    const wrong = allKanjiInLevel.filter(k => k !== currentKanji);
    const shuffled = wrong.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [currentKanji, ...shuffled].sort(() => 0.5 - Math.random());

    optionsDiv.innerHTML = "";
    options.forEach(opt => {
      const div = document.createElement("div");
      div.className = "option";
      div.textContent = opt;
      div.onclick = () => playerChooseMatch(opt);
      optionsDiv.appendChild(div);
    });

    setTimeout(botPlayMatch, 1200);
  }

  function playerChooseMatch(choice) {
    document.querySelectorAll('.option').forEach(o => o.onclick = null);
    document.querySelectorAll('.option').forEach(o => {
      if (o.textContent === currentKanji) o.classList.add('correct');
      if (o.textContent === choice && choice !== currentKanji) o.classList.add('wrong');
    });

    if (choice === currentKanji) {
      playerScore += 10;
      resultDiv.innerHTML = `<span style="color:#4caf50">Đúng! +10 điểm</span>`;
    } else {
      resultDiv.innerHTML = `<span style="color:#f44336">Sai! Đáp án: ${currentKanji}</span>`;
    }
    playerPoint.textContent = playerScore;
    setTimeout(nextRound, 3000);
  }

  function botPlayMatch() {
    const accuracy = 0.7 + (60 - timeLeft) / 60 * 0.25;
    if (Math.random() < accuracy) {
      botScore += 10;
      botPoint.textContent = botScore;
    }
  }

  // === CHẾ ĐỘ VIẾT CHỮ ===
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    userStrokes = [];
    currentPoints = [];
    resultDiv.innerHTML = "";
    console.log("cleared");
  }

function undoLastStroke() {
  if (userStrokes.length > 0) {
    userStrokes.pop();
    if (currentStrokeIndex > 0) currentStrokeIndex--;
    render();
    resultDiv.innerHTML = `<span style="color:#ffa500">Đã xóa nét cuối. Vẽ lại nét ${currentStrokeIndex + 1}!</span>`;

    setTimeout(() => resultDiv.innerHTML = "", 2000);
    resetHints();
    console.log('removed'); // BÂY GIỜ SẼ XUẤT HIỆN TRÊN CONSOLE!
  } else {
    console.log('nothing to undo');
    resultDiv.innerHTML = `<span style="color:#999">Không có nét nào để xóa!</span>`;
    setTimeout(() => resultDiv.innerHTML = "", 1500);
  }
}

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    userStrokes.forEach(stroke => {
      if (stroke.length > 1) {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        stroke.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });

    if (currentPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }

  function checkWrite() {
    if (strokes.length === 0) {
      resultDiv.innerHTML = `<span style="color:#ffa000">Không có dữ liệu nét vẽ cho chữ này!</span>`;
      setTimeout(nextRound, 2000);
      return;
    }

    if (currentStrokeIndex >= strokes.length) {
      resultDiv.innerHTML = `<span style="color:#4caf50; font-size:36px">HOÀN THÀNH CHỮ "${currentKanji}"! +15 điểm</span>`;
      playerScore += 15;
      playerPoint.textContent = playerScore;

      const botAcc = 0.7 + (60 - timeLeft) / 60 * 0.25;
      if (Math.random() < botAcc) {
        botScore += 15;
        botPoint.textContent = botScore;
      }

      setTimeout(nextRound, 3000);
      return;
    }

    const userStroke = userStrokes[currentStrokeIndex] || [];
    if (userStroke.length < 10) {
      resultDiv.innerHTML = `<span style="color:#f44336">Nét ${currentStrokeIndex + 1} quá ngắn!</span>`;
      return;
    }

    const path = strokes[currentStrokeIndex];

    // Kiểm tra hướng
    const userVec = {
      dx: userStroke[userStroke.length-1].x - userStroke[0].x,
      dy: userStroke[userStroke.length-1].y - userStroke[0].y
    };

    const temp = document.createElement("canvas").getContext("2d");
    temp.lineWidth = 40;
    let matchCount = 0;
    for (let p of userStroke) {
      if (temp.isPointInStroke(new Path2D(path), p.x / 2, p.y / 2)) matchCount++;
    }
    const ratio = matchCount / userStroke.length;

    if (ratio >= 0.35) {
      currentStrokeIndex++;
      resultDiv.innerHTML = `<span style="color:#4caf50">Đúng nét ${currentStrokeIndex}/${strokes.length}!</span>`;
      render();
      setTimeout(() => resultDiv.innerHTML = "", 1200);

      if (currentStrokeIndex >= strokes.length) {
        setTimeout(checkWrite, 600); // Tự động cộng điểm khi hoàn thành
      }
    } else {
      resultDiv.innerHTML = `<span style="color:#f44336">Nét ${currentStrokeIndex + 1} chưa giống (${(ratio*100).toFixed(0)}%)</span>`;
    }
  }

  function skipQuestion() {
    playerScore -= 0.5;
    playerPoint.textContent = playerScore.toFixed(1);
    resultDiv.innerHTML = `<span style="color:#ffa000">Skip! -0.5 điểm</span>`;
    setTimeout(nextRound, 2000);
  }

  // === VẼ (hỗ trợ cả chuột và cảm ứng) ===
  const startDraw = (e) => {
    isDrawing = true;
    currentPoints = [];
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    currentPoints.push({ x, y });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    currentPoints.push({ x, y });
    render();
  };

  const endDraw = () => {
    if (isDrawing && currentPoints.length > 5) {
      userStrokes.push([...currentPoints]);
      render();
    }
    isDrawing = false;
    currentPoints = [];
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", endDraw);

  // === NÚT ===
  document.getElementById("checkBtn").onclick = checkWrite;
  document.getElementById("clearBtn").onclick = clearCanvas;
  document.getElementById("undoBtn").onclick = undoLastStroke;
  document.getElementById("skipBtn").onclick = skipQuestion;
});