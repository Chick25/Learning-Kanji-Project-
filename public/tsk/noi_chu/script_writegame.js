const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const resultDiv = document.getElementById("result");
const meaningDiv = document.getElementById("meaning");
const scoreSpan = document.getElementById("score");

let learnedKanji = [];
let currentKanji = "";
let strokes = [];
let userStrokes = [];
let currentStroke = 0;
let isDrawing = false;
let currentPoints = [];
let score = 0;

const username = localStorage.getItem('username');
if (!username) {
    alert("Vui lòng đăng nhập!");
    window.location.href = '/login';
}
// LẤY TOÀN BỘ CHỮ ĐÃ HỌC CỦA USER TỪ MONGODB
async function loadLearnedKanji() {
    try {
    const res = await fetch(`/learn?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("Lỗi server");
    const data = await res.json();

    const progress = data.progress || {};
    learnedKanji = [];

    // Gộp tất cả chữ từ mọi cấp độ
    Object.keys(progress).forEach(grade => {
        learnedKanji.push(...progress[grade]);
    });

    if (learnedKanji.length === 0) {
        meaningDiv.innerHTML = `<p style="color:#999; font-size:24px">Bạn chưa học chữ nào để chơi game này!</p>`;
        return;
    }

    nextQuestion();
    } catch (err) {
    meaningDiv.innerHTML = `<p style="color:red">Lỗi kết nối server</p>`;
    console.error(err);
    }
}

async function getMeaning(kanji) {
    try {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
    const data = await res.json();
    return data.meanings?.[0] || kanji;
    } catch {
    return "Unknown meaning";
    }
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
    } catch {
    return [];
    }
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

async function checkStroke() {
    if (currentStroke >= strokes.length) {
    resultDiv.innerHTML = `<span class="correct">HOÀN THÀNH CHỮ "${currentKanji}"!</span>`;
    score += 10;
    scoreSpan.textContent = score;
    setTimeout(nextQuestion, 2000);
    return;
    }

    const pathStr = strokes[currentStroke];
    const points = userStrokes[currentStroke] || [];

    if (points.length < 10) {
    resultDiv.innerHTML = `<span class="wrong">Nét quá ngắn!</span>`;
    return;
    }

    const getEndpoints = d => {
    const tokens = d.replace(/,/g,' ').replace(/\s+/g,' ').trim().split(/\s+/);
    let x = 0, y = 0, sx = 0, sy = 0, moved = false, cmd = '';
    for (let t of tokens) {
        if (/[a-zA-Z]/.test(t)) { cmd = t; continue; }
        const nums = tokens.slice(tokens.indexOf(t)).map(parseFloat).filter(n=>!isNaN(n));
        if (!moved && cmd.toUpperCase() === 'M') { sx = x = nums[0]; sy = y = nums[1]||y; moved = true; }
        if (cmd === 'c' || cmd === 'C') {
        const dx = cmd === 'c' ? nums[nums.length-2] : 0;
        const dy = cmd === 'c' ? nums[nums.length-1] : 0;
        x = cmd === 'C' ? nums[nums.length-2] : x + dx;
        y = cmd === 'C' ? nums[nums.length-1] : y + dy;
        }
    }
    return {start: {x:sx,y:sy}, end: {x,y}};
    };

    const model = getEndpoints(pathStr);
    const userVec = { dx: points[points.length-1].x - points[0].x, dy: points[points.length-1].y - points[0].y };
    const modelVec = { dx: model.end.x - model.start.x, dy: model.end.y - model.start.y };
    const dot = (modelVec.dx * userVec.dx + modelVec.dy * userVec.dy) /
                (Math.hypot(modelVec.dx, modelVec.dy) * Math.hypot(userVec.dx, userVec.dy));

    if (dot < -0.3) {
    resultDiv.innerHTML = `<span class="wrong">Sai hướng nét ${currentStroke + 1}!</span>`;
    return;
    }

    const tempCtx = document.createElement("canvas").getContext("2d");
    tempCtx.lineWidth = 22;
    let match = 0;
    for (let p of points) {
    const x = (p.x - 90) / 2;
    const y = (p.y - 90) / 2;
    if (tempCtx.isPointInStroke(new Path2D(pathStr), x, y)) match++;
    }
    const ratio = match / points.length;

    if (ratio >= 0.35) {
    resultDiv.innerHTML = `<span class="correct">Đúng nét ${currentStroke + 1}!</span>`;
    currentStroke++;
    render();
    setTimeout(() => resultDiv.innerHTML = "", 1000);
    } else {
    resultDiv.innerHTML = `<span class="wrong">Chưa đúng nét ${currentStroke + 1} (${(ratio*100).toFixed(0)}%)</span>`;
    }
}

async function nextQuestion() {
    if (learnedKanji.length === 0) return;
    currentKanji = learnedKanji[Math.floor(Math.random() * learnedKanji.length)];
    meaningDiv.textContent = `Viết chữ có nghĩa: "${await getMeaning(currentKanji)}"`;
    strokes = await loadStrokes(currentKanji);
    userStrokes = [];
    currentStroke = 0;
    currentPoints = [];
    ctx.clearRect(0, 0, 400, 400);
    resultDiv.innerHTML = "";
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
    checkStroke();
    }
    isDrawing = false;
});

document.getElementById("clearBtn").onclick = () => {
    ctx.clearRect(0, 0, 400, 400);
    userStrokes = [];
    currentStroke = 0;
    currentPoints = [];
    resultDiv.innerHTML = "";
};

document.getElementById("nextBtn").onclick = nextQuestion;

document.getElementById("nextBtn").onclick = nextQuestion;

loadLearnedKanji();

function requireLogin() {
  const username = localStorage.getItem('username');
  if (!username) {
    alert("Bạn cần đăng nhập để truy cập trang này!");
    window.location.href = '/login';
    return false;
  }
  return username; // trả về username nếu đã đăng nhập
}
document.addEventListener('DOMContentLoaded', () => {
  requireLogin();
});