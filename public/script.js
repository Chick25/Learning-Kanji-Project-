const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const kanjiGrid = document.getElementById("kanjiGrid");

let currentKanji = null;

const drawCanvas = document.createElement("canvas");
drawCanvas.width = 400;
drawCanvas.height = 400;
const drawCtx = drawCanvas.getContext("2d");

const templateCanvas = document.createElement("canvas");
templateCanvas.width = 400;
templateCanvas.height = 400;
const templateCtx = templateCanvas.getContext("2d");

function renderAll() {
  ctx.clearRect(0, 0, 400, 400);
  ctx.globalAlpha = 1;
  ctx.drawImage(templateCanvas, 0, 0);
  ctx.drawImage(drawCanvas, 0, 0);
}

function drawTemplate(kanji) {
  templateCtx.clearRect(0, 0, 400, 400);
  templateCtx.globalAlpha = 0.08;
  templateCtx.fillStyle = "#000";
  templateCtx.font = "200px 'Yu Mincho', 'MS Mincho', serif";
  templateCtx.textAlign = "center";
  templateCtx.textBaseline = "middle";
  templateCtx.fillText(kanji, 200, 200);
}

async function updateKanjiInfoFromAPI(kanji) {
  const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
  const data = await res.json();
  const onyomi = (data.on_readings || []).join(" / ");
  const kunyomi = (data.kun_readings || []).join(" / ");
  const romajiOn = onyomi ? onyomi.split(" / ").map(r => wanakana.toRomaji(r)).join(" / ") : "";
  const romajiKun = kunyomi ? kunyomi.split(" / ").map(r => wanakana.toRomaji(r)).join(" / ") : "";

  document.getElementById("meaningBox").textContent =
    `Meaning: ${data.meanings ? data.meanings.join(", ") : "Unknown"}`;
  document.getElementById("readingBox").textContent =
    `Onyomi: ${onyomi} (${romajiOn}) | Kunyomi: ${kunyomi} (${romajiKun})`;
}

function selectKanji(kanji) {
  currentKanji = kanji;
  drawCtx.clearRect(0, 0, 400, 400);
  drawTemplate(currentKanji);
  renderAll();
  document.getElementById("result").textContent = "";
  updateKanjiInfoFromAPI(currentKanji);
}

function randomKanji() {
  const cells = Array.from(document.querySelectorAll(".kanji-cell"));
  const randomCell = cells[Math.floor(Math.random() * cells.length)];
  selectKanji(randomCell.textContent);
}

function clearCanvas() {
  drawCtx.clearRect(0, 0, 400, 400);
  renderAll();
  document.getElementById("result").textContent = "";
}

let isDrawing = false;
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  const { x, y } = getMousePos(e);
  drawCtx.beginPath();
  drawCtx.moveTo(x, y);
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  const { x, y } = getMousePos(e);
  drawCtx.lineTo(x, y);
  drawCtx.strokeStyle = "#2c3e50";
  drawCtx.lineWidth = 4;
  drawCtx.lineCap = "round";
  drawCtx.stroke();
  renderAll();
});

canvas.addEventListener("mouseup", () => isDrawing = false);
canvas.addEventListener("mouseleave", () => isDrawing = false);

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function checkResult() {
  const userData = drawCtx.getImageData(0, 0, 400, 400).data;
  const templateData = templateCtx.getImageData(0, 0, 400, 400).data;

  let totalGrayPixels = 0;
  let matchPixels = 0;
  let outOfBoundsPixels = 0;

  for (let i = 0; i < templateData.length; i += 4) {
    const grayAlpha = templateData[i + 3];
    const userAlpha = userData[i + 3];

    const isInTemplate = grayAlpha > 10;
    const isUserDrawn = userAlpha > 50;

    if (isInTemplate) {
      totalGrayPixels++;
      if (isUserDrawn) matchPixels++;
    } else {
      if (isUserDrawn) outOfBoundsPixels++;
    }
  }

  let accuracy = (matchPixels / totalGrayPixels) * 100;
  let resultText = "";

  if (accuracy < 6) {
    resultText = `⚠️ Drawing mistake. Accuracy: ${accuracy.toFixed(2)}%`;
  } else {
    resultText = `✅ Accuracy: ${accuracy.toFixed(2)}%`;
  }

  if (outOfBoundsPixels > matchPixels) {
    resultText += " ⚠️ Many strokes are outside the template.";
  }

  document.getElementById("result").textContent = resultText;
}

async function loadKanjiList() {
  const res = await fetch("https://kanjiapi.dev/v1/kanji/grade-1");
  const list = await res.json();
  list.forEach(k => {
    const cell = document.createElement("div");
    cell.className = "kanji-cell";
    cell.textContent = k;
    cell.onclick = () => selectKanji(k);
    kanjiGrid.appendChild(cell);
  });
  selectKanji(list[0]);
}

async function sendResultToServer(kanji, accuracy) {
  const imageData = canvas.toDataURL(); // lấy ảnh base64 từ canvas
  const res = await fetch('/check-kanji', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kanji, accuracy, imageData })
  });
  const data = await res.json();
  console.log(data.feedback); // phản hồi từ server
}



loadKanjiList();
sendResultToServer(currentKanji, accuracy);
