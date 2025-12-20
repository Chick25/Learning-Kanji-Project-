document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const meaningBox = document.getElementById("meaningBox");
    const resultDiv = document.getElementById("result");

    let currentKanji = "";
    let strokes = [];
    let userStrokes = [];
    let currentStroke = 0;
    let isDrawing = false;
    let currentPoints = [];
    let learnedKanji = [];
    let failCount = 0;
    let showedHint = false;
    let showedAnswer = false;

    const username = localStorage.getItem('username');
    if (!username) {
      alert("Vui lòng đăng nhập!");
      window.location.href = '/login';
    }

    document.addEventListener('DOMContentLoaded', () => {
      const userIcon = document.getElementById('userIcon');
      userIcon.href = username ? '/profile' : '/login';
    });

    async function loadLearnedKanji() {
      try {
        const res = await fetch(`/api/progress?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        const progress = data.progress || {};
        learnedKanji = [];
        Object.values(progress).forEach(arr => learnedKanji.push(...arr));

        if (learnedKanji.length === 0) {
          meaningBox.innerHTML = "Bạn chưa học chữ nào! Hãy học trước ở trang chính.";
          return;
        }
        nextQuestion();
      } catch (err) {
        meaningBox.innerHTML = "Lỗi kết nối server";
        console.error(err);
      }
    }

    async function getMeaning(kanji) {
      try {
        const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
        const data = await res.json();
        return data.meanings?.[0] || "Unknown";
      } catch { return "Kanji"; }
    }

    async function loadStrokes(kanji) {
      const code = kanji.codePointAt(0).toString(16).padStart(5, '0');
      const url = `kanjivg/kanji/${code}.svg`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        return Array.from(doc.querySelectorAll("path")).map(p => p.getAttribute("d"));
      } catch { return []; }
    }

    function render() {
      ctx.clearRect(0, 0, 400, 400);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";

      userStrokes.forEach(stroke => {
        if (stroke.length > 0) {
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

    // HÀM KIỂM TRA ĐIỂM CUỐI NÉT
    function getEndpoints(d) {
      const normalized = d.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = normalized.split(/\s+/);
      let i = 0;
      let currentX = 0, currentY = 0;
      let startX = 0, startY = 0;
      let hasMoved = false;
      let lastCommand = '';

      while (i < tokens.length) {
        let token = tokens[i];
        if (/[a-zA-Z]/.test(token)) {
          lastCommand = token;
          i++;
        } else if (!lastCommand) {
          i++;
          continue;
        }

        const nums = [];
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const n = parseFloat(tokens[i]);
          if (!isNaN(n)) nums.push(n);
          i++;
        }
        if (nums.length === 0) continue;

        switch (lastCommand.toUpperCase()) {
          case 'M':
            currentX = nums[0];
            currentY = nums[1] || currentY;
            if (!hasMoved) {
              startX = currentX;
              startY = currentY;
              hasMoved = true;
            }
            break;
          case 'L':
            currentX = nums[0];
            currentY = nums[1] || currentY;
            break;
          case 'l':
            currentX += nums[0];
            currentY += nums[1] || 0;
            break;
          case 'C':
            if (nums.length >= 2) {
              currentX = nums[nums.length - 2];
              currentY = nums[nums.length - 1];
            }
            break;
          case 'c':
            if (nums.length >= 6) {
              currentX += nums[nums.length - 2];
              currentY += nums[nums.length - 1];
            }
            break;
          case 'Z': case 'z':
            currentX = startX;
            currentY = startY;
            break;
        }
      }
      return { start: { x: startX, y: startY }, end: { x: currentX, y: currentY } };
    }

  async function checkResult() {
    if (currentStroke >= strokes.length) {
      resultDiv.innerHTML = `<span class="correct">HOÀN THÀNH "${currentKanji}"! 🎉</span>`;
      setTimeout(nextQuestion, 2000);
      resetHints();
      return;
  }

  const pathStr = strokes[currentStroke];
  const points = userStrokes[currentStroke] || [];

  if (points.length < 12) { // nghiêm ngặt hơn với nét ngắn
    resultDiv.innerHTML = `<span class="wrong">Nét quá ngắn! Hãy vẽ đầy đủ nét ${currentStroke + 1}</span>`;
    return;
  }

  // === KIỂM TRA HƯỚNG NÉT (NGHIÊM NGẶT HƠN) ===
  const model = getEndpoints(pathStr);
  const userVec = {
    dx: points[points.length-1].x - points[0].x,
    dy: points[points.length-1].y - points[0].y
  };
  const modelVec = {
    dx: model.end.x - model.start.x,
    dy: model.end.y - model.start.y
  };
  const lenU = Math.hypot(userVec.dx, userVec.dy);
  const lenM = Math.hypot(modelVec.dx, modelVec.dy);

  if (lenM > 5 && lenU > 20) {
    const dot = (modelVec.dx * userVec.dx + modelVec.dy * userVec.dy) / (lenM * lenU);
    if (dot < -0.05) { // NGHIÊM NGẶT: chỉ cho phép lệch rất nhỏ
      failCount++;
      resultDiv.innerHTML = `<span class="wrong">SAI HƯỚNG NÉT ${currentStroke + 1}! Hãy vẽ đúng chiều nét mẫu (Lần ${failCount})</span>`;
      checkHint();
      return;
    }
  }

  // === KIỂM TRA HÌNH DẠNG NÉT (SIÊU NGHIÊM NGẶT) ===
  const tempCtx = document.createElement("canvas").getContext("2d");
  tempCtx.lineWidth = 28; // giảm xuống để bắt buộc viết sát nét mẫu

  let match = 0;
  for (let p of points) {
    const normalizedX = (p.x / 400) * 109;
    const normalizedY = (p.y / 400) * 109;
    if (tempCtx.isPointInStroke(new Path2D(pathStr), normalizedX, normalizedY)) {
      match++;
    }
  }

  const ratio = match / points.length;

  // NGƯỠNG NGHIÊM NGẶT – BẮT BUỘC VIẾT ĐÚNG THỨ TỰ VÀ VỊ TRÍ
  let threshold = 0.45; // cao hơn để bắt buộc viết chuẩn
  if (strokes.length <= 3) threshold = 0.38;     // chữ đơn giản vẫn cần chính xác
  else if (strokes.length <= 8) threshold = 0.45;
  else if (strokes.length <= 15) threshold = 0.50;
  else threshold = 0.55; // chữ phức tạp vẫn bắt buộc cao

  if (ratio >= threshold) {
    resultDiv.innerHTML = `<span class="correct">ĐÚNG NÉT ${currentStroke + 1}! ✔️</span>`;
    currentStroke++;
    render();

    if (currentStroke >= strokes.length) {
      setTimeout(() => {
        resultDiv.innerHTML = `<span class="correct">HOÀN THÀNH "${currentKanji}"! 🎉</span>`;
        setTimeout(nextQuestion, 2000);
        resetHints();
      }, 800);
    } else {
      failCount = 0;
      showedHint = false;
      showedAnswer = false;
      setTimeout(() => resultDiv.innerHTML = "", 1000);
    }
  } else {
    failCount++;
    resultDiv.innerHTML = `<span class="wrong">SAI NÉT ${currentStroke + 1} (${(ratio*100).toFixed(0)}%) - Hãy viết đúng thứ tự, hướng và vị trí nét mẫu! (Lần ${failCount})</span>`;
    checkHint();
  }
}

    function checkHint() {
      if (failCount === 3 && !showedHint) {
        showedHint = true;
        drawHintStroke(currentStroke);
        resultDiv.innerHTML += `<br><span style="color:#71A95A; font-weight:600">Gợi ý: Đây là nét ${currentStroke + 1} bạn cần viết!</span>`;
      } else if (failCount === 6 && !showedAnswer) {
        showedAnswer = true;
        drawFullAnswer();
        resultDiv.innerHTML = `<span style="color:#007bff; font-size:28px">Đáp án: ${currentKanji}</span><br><span style="color:#666">Bấm "Tiếp theo" khi sẵn sàng</span>`;
      }
    }

    function drawHintStroke(index) {
      if (!strokes[index]) return;
      ctx.save();
      ctx.translate(200, 200);
      ctx.scale(3.7, 3.7);
      ctx.translate(-54.5, -54.5);
      ctx.strokeStyle = "#71A95A";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke(new Path2D(strokes[index]));
      ctx.restore();
    }

    function drawFullAnswer() {
      ctx.save();
      ctx.translate(200, 200);
      ctx.scale(3.7, 3.7);
      ctx.translate(-54.5, -54.5);
      ctx.strokeStyle = "#71A95A";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.5;
      strokes.forEach(d => ctx.stroke(new Path2D(d)));
      ctx.restore();

      ctx.font = "bold 180px serif";
      ctx.fillStyle = "#71A95A";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 12;
      ctx.strokeText(currentKanji, 200, 200);
      ctx.fillText(currentKanji, 200, 200);
    }

    function resetHints() {
      failCount = 0;
      showedHint = false;
      showedAnswer = false;
    }

    function clearCanvas() {
      ctx.clearRect(0, 0, 400, 400);
      userStrokes = [];
      currentStroke = 0;
      currentPoints = [];
      resultDiv.innerHTML = "";
      resetHints();
    }

    function undoLastStroke() {
      if (userStrokes.length > 0) {
        userStrokes.pop();
        if (currentStroke > 0) currentStroke--; // ← Sửa: currentStroke (biến bạn đang dùng)
        render();
        resultDiv.innerHTML = `<span style="color:#ffa500">Đã xóa nét cuối. Vẽ lại nét ${currentStroke + 1}!</span>`;
        setTimeout(() => resultDiv.innerHTML = "", 2000);
        resetHints();
        console.log('removed'); // BÂY GIỜ SẼ XUẤT HIỆN!
      } else {
        console.log('nothing to undo');
        resultDiv.innerHTML = `<span style="color:#999">Không có nét nào để xóa!</span>`;
        setTimeout(() => resultDiv.innerHTML = "", 1500);
      }
    } 

    async function nextQuestion() {
      if (learnedKanji.length === 0) return;
      currentKanji = learnedKanji[Math.floor(Math.random() * learnedKanji.length)];
      meaningBox.innerHTML = `Write the kanji for: <strong>"${await getMeaning(currentKanji)}"</strong>`;
      strokes = await loadStrokes(currentKanji);
      userStrokes = [];
      currentStroke = 0;
      currentPoints = [];
      resetHints();
      clearCanvas();
    }

    canvas.addEventListener("mousedown", e => {
      isDrawing = true;
      currentPoints = [];
      const rect = canvas.getBoundingClientRect();
      currentPoints.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    });

    canvas.addEventListener("mousemove", e => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      currentPoints.push({x, y});
      render();
    });

    canvas.addEventListener("mouseup", () => {
      if (isDrawing && currentPoints.length > 0) {
        userStrokes.push(currentPoints);
        checkResult();
      }
      isDrawing = false;
    });

    canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      isDrawing = true;
      currentPoints = [];
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      currentPoints.push({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    });

    canvas.addEventListener("touchmove", e => {
      e.preventDefault();
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      currentPoints.push({x: touch.clientX - rect.left, y: touch.clientY - rect.top});
      render();
    });

    canvas.addEventListener("touchend", e => {
      e.preventDefault();
      if (isDrawing && currentPoints.length > 0) {
        userStrokes.push(currentPoints);
        checkResult();
      }
      isDrawing = false;
    });

    loadLearnedKanji();

    document.getElementById("checkBtn").onclick = checkResult;
    document.getElementById("clearBtn").onclick = clearCanvas;
    document.getElementById("undoBtn").onclick = undoLastStroke;
    document.getElementById("skipBtn").onclick = nextQuestion;
});