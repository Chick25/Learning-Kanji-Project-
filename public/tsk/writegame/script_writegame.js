document.addEventListener("DOMContentLoaded", () => {
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const meaningBox = document.getElementById("meaningBox");
const resultDiv = document.getElementById("result");
const gradeSelect = document.getElementById("grade-select");

let currentKanji = "";
let strokes = [];
let userStrokes = [];
let currentStrokeIndex = 0;
let isDrawing = false;
let currentPoints = [];
let allKanjiInLevel = [];

// THÊM CÁC BIẾN GỢI Ý CỦA BẠN
let failCount = 0;
let showedHint = false;
let showedAnswer = false;

const username = localStorage.getItem('username');
if (!username) {
  alert("Vui lòng đăng nhập!");
  window.location.href = '/login';
  return;
}

const userIcon = document.getElementById('userIcon');
if (userIcon) userIcon.href = '/profile';

async function loadAllKanjiInLevel(level) {
  const url = `https://kanjiapi.dev/v1/kanji/${level}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data;
  } catch (err) {
    meaningBox.innerHTML = `<span style="color:red">Lỗi tải dữ liệu cấp độ ${level.replace('grade-', '')}</span>`;
    console.error(err);
    return [];
  }
}

async function getMeaning(kanji) {
  try {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
    const data = await res.json();
    return data.meanings?.[0] || "Không rõ nghĩa";
  } catch {
    return "Không rõ nghĩa";
  }
}

async function loadStrokes(kanji) {
  const code = kanji.codePointAt(0).toString(16).padStart(5, '0').toLowerCase();
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`;
  // const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    return Array.from(doc.querySelectorAll("path")).map(p => p.getAttribute("d"));
  } catch {
    console.warn("Không tải được nét vẽ cho:", kanji);
    return [];
  }
}

async function nextRound() {
  if (allKanjiInLevel.length === 0) {
    meaningBox.innerHTML = "Không có chữ nào trong cấp độ này!";
    return;
  }

  currentKanji = allKanjiInLevel[Math.floor(Math.random() * allKanjiInLevel.length)];

  let meaning = "Không rõ nghĩa";
  try {
    meaning = await getMeaning(currentKanji);
  } catch (err) {
    console.warn(err);
  }

  meaningBox.innerHTML = `Viết chữ có nghĩa: <strong>"${meaning}"</strong>`;

  strokes = await loadStrokes(currentKanji);

  userStrokes = [];
  currentStrokeIndex = 0;
  currentPoints = [];
  isDrawing = false;
  failCount = 0;
  showedHint = false;
  showedAnswer = false;

  clearCanvas();
  resultDiv.innerHTML = "";
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  userStrokes = [];
  currentPoints = [];
  render();
}

function undoLastStroke() {
  if (userStrokes.length > 0) {
    userStrokes.pop();
    if (currentStrokeIndex > 0) currentStrokeIndex--;
    render();
    resultDiv.innerHTML = `<span style="color:#ffa500">Đã xóa nét cuối!</span>`;
    setTimeout(() => resultDiv.innerHTML = "", 1500);
  } else {
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
// BỔ SUNG HÀM CHECKWRITE VỚI GỢI Ý CỦA BẠN
async function checkWrite() {
  if (strokes.length === 0) {
    resultDiv.innerHTML = `<span style="color:#ffa000">Không có dữ liệu nét vẽ!</span>`;
    return;
  }

  if (currentStrokeIndex >= strokes.length) {
    resultDiv.innerHTML = `<span class="correct">HOÀN THÀNH "${currentKanji}"! 🎉</span>`;
    setTimeout(nextRound, 3000);
    resetHints();
    return;
  }

  const userStroke = userStrokes[currentStrokeIndex] || [];
  if (userStroke.length < 8) {
    resultDiv.innerHTML = `<span class="wrong">Nét ${currentStrokeIndex + 1} quá ngắn!</span>`;
    return;
  }

  const pathStr = strokes[currentStrokeIndex];
  const points = userStrokes[currentStrokeIndex] || [];

  if (points.length < 12) { // nghiêm ngặt hơn với nét ngắn
    resultDiv.innerHTML = `<span class="wrong">Nét quá ngắn! Hãy vẽ đầy đủ nét ${currentStroke + 1}</span>`;
    return;
  }

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

  const tempCtx = document.createElement("canvas").getContext("2d");
  tempCtx.lineWidth = 28;

  let matchCount = 0;
  for (let p of points) {
  const normalizedX = (p.x / 400) * 109;
  const normalizedY = (p.y / 400) * 109;
    if (tempCtx.isPointInStroke(new Path2D(pathStr), normalizedX, normalizedY)) {
      matchCount++;
    }
  }

  const ratio = matchCount / userStroke.length;

  let threshold = 0.45; // cao hơn để bắt buộc viết chuẩn
  if (strokes.length <= 3) threshold = 0.38;     // chữ đơn giản vẫn cần chính xác
  else if (strokes.length <= 8) threshold = 0.45;
  else if (strokes.length <= 15) threshold = 0.50;
  else threshold = 0.55; // chữ phức tạp vẫn bắt buộc cao

  if (ratio >= threshold) {
    // currentStrokeIndex++;
    resultDiv.innerHTML = `<span class="correct">Đúng nét ${currentStrokeIndex+1}/${strokes.length}!</span>`;
    currentStrokeIndex++;
    render();
    setTimeout(() => resultDiv.innerHTML = "", 1200);

    if (currentStrokeIndex >= strokes.length) {
      setTimeout(checkWrite, 600);
    }
    } else {
      failCount++;
      resultDiv.innerHTML = `<span class="wrong">SAI NÉT ${currentStrokeIndex + 1} (${(ratio*100).toFixed(0)}%) (Lần ${failCount})</span>`;
      checkHint(); // ← GỢI Ý KHI SAI NHIỀU
      
    }
}

// BỔ SUNG CÁC HÀM GỢI Ý CỦA BẠN
function checkHint() {
  if (failCount === 3 && !showedHint) {
    showedHint = true;
    drawHintStroke(currentStrokeIndex);
    resultDiv.innerHTML += `<br><span style="color:#71A95A; font-weight:600">Gợi ý: Đây là nét ${currentStrokeIndex + 1} bạn cần viết!</span>`;
  } else if (failCount === 6 && !showedAnswer) {
    showedAnswer = true;
    drawFullAnswer();
    resultDiv.innerHTML = `<span style="color:#007bff; font-size:28px">Đáp án: ${currentKanji}</span><br><span style="color:#666">Bấm "Bỏ qua" khi sẵn sàng</span>`;
  }
  // nextRound();
}

function drawHintStroke(index) {
  if (!strokes[index]) return;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
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
  ctx.translate(canvas.width / 2, canvas.height / 2);
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
  ctx.strokeText(currentKanji, canvas.width / 2, canvas.height / 2);
  ctx.fillText(currentKanji, canvas.width / 2, canvas.height / 2);
}

function resetHints() {
  failCount = 0;
  showedHint = false;
  showedAnswer = false;
}

// Vẽ
const startDraw = (e) => {
  isDrawing = true;
  currentPoints = [];
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
  currentPoints.push({ x, y });
};

const draw = (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
  currentPoints.push({ x, y });
  render();
};

const endDraw = () => {
  if (isDrawing && currentPoints.length > 3) {
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

// Nút
document.getElementById("checkBtn").onclick = checkWrite;
document.getElementById("clearBtn").onclick = clearCanvas;
document.getElementById("undoBtn").onclick = undoLastStroke;
document.getElementById("skipBtn").onclick = nextRound;

// Chọn cấp độ
gradeSelect.onchange = async () => {
  const level = gradeSelect.value;
  meaningBox.innerHTML = 'Đang tải dữ liệu cấp độ...';
  allKanjiInLevel = await loadAllKanjiInLevel(level);
  if (allKanjiInLevel.length > 0) {
    await nextRound();
  }
};

// Bắt đầu với grade 1
gradeSelect.value = "grade-1";
gradeSelect.dispatchEvent(new Event('change'));
});