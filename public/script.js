const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const kanjiSelect = document.getElementById("kanjiSelect");

const kanjiList = [
  "日", "月", "火", "水", "木", "金", "土", "山", "川", "田",
  "人", "口", "目", "耳", "手", "足", "力", "女", "男", "子",
  "大", "小", "中", "上", "下", "左", "右", "学", "生", "校"
];

const kanjiMeanings = {
  "日": "Sun / Day", "月": "Moon / Month", "火": "Fire", "水": "Water",
  "木": "Tree / Wood", "金": "Gold / Money", "土": "Earth / Soil", "山": "Mountain",
  "川": "River", "田": "Rice Field", "人": "Person", "口": "Mouth", "目": "Eye",
  "耳": "Ear", "手": "Hand", "足": "Foot / Leg", "力": "Strength / Power",
  "女": "Woman", "男": "Man", "子": "Child", "大": "Big", "小": "Small",
  "中": "Middle / Inside", "上": "Up / Above", "下": "Down / Below", "左": "Left",
  "右": "Right", "学": "Study / Learn", "生": "Life / Birth", "校": "School"
};

const kanjiReadings = {
  "日": { onyomi: "ニチ / ジツ", kunyomi: "ひ / -び / -か", romaji: "nichi / jitsu — hi / -bi / -ka" },
  "月": { onyomi: "ゲツ / ガツ", kunyomi: "つき", romaji: "getsu / gatsu — tsuki" },
  "火": { onyomi: "カ", kunyomi: "ひ / -び / ほ-", romaji: "ka — hi / -bi / ho-" },
  "水": { onyomi: "スイ", kunyomi: "みず", romaji: "sui — mizu" },
  "木": { onyomi: "モク / ボク", kunyomi: "き / こ-", romaji: "moku / boku — ki / ko-" },
  "金": { onyomi: "キン / コン", kunyomi: "かね / かな-", romaji: "kin / kon — kane / kana-" },
  "土": { onyomi: "ド / ト", kunyomi: "つち", romaji: "do / to — tsuchi" },
  "山": { onyomi: "サン / ザン", kunyomi: "やま", romaji: "san / zan — yama" },
  "川": { onyomi: "セン", kunyomi: "かわ", romaji: "sen — kawa" },
  "田": { onyomi: "デン", kunyomi: "た", romaji: "den — ta" },
  "人": { onyomi: "ジン / ニン", kunyomi: "ひと", romaji: "jin / nin — hito" },
  "口": { onyomi: "コウ / ク", kunyomi: "くち", romaji: "kou / ku — kuchi" },
  "目": { onyomi: "モク / ボク", kunyomi: "め / -め", romaji: "moku / boku — me / -me" },
  "耳": { onyomi: "ジ", kunyomi: "みみ", romaji: "ji — mimi" },
  "手": { onyomi: "シュ", kunyomi: "て / た-", romaji: "shu — te / ta-" },
  "足": { onyomi: "ソク", kunyomi: "あし / た-", romaji: "soku — ashi / ta-" },
  "力": { onyomi: "リョク / リキ", kunyomi: "ちから", romaji: "ryoku / riki — chikara" },
  "女": { onyomi: "ジョ / ニョ", kunyomi: "おんな / め", romaji: "jo / nyo — onna / me" },
  "男": { onyomi: "ダン / ナン", kunyomi: "おとこ", romaji: "dan / nan — otoko" },
  "子": { onyomi: "シ / ス", kunyomi: "こ", romaji: "shi / su — ko" },
  "大": { onyomi: "ダイ / タイ", kunyomi: "おお-", romaji: "dai / tai — oo-" },
  "小": { onyomi: "ショウ", kunyomi: "ちい- / こ / お", romaji: "shou — chii / ko / o" },
  "中": { onyomi: "チュウ", kunyomi: "なか", romaji: "chuu — naka" },
  "上": { onyomi: "ジョウ", kunyomi: "うえ / あ- / のぼ-", romaji: "jou — ue / a / nobo" },
  "下": { onyomi: "カ / ゲ", kunyomi: "した / さが- / くだ-", romaji: "ka / ge — shita / saga / kuda" },
  "左": { onyomi: "サ", kunyomi: "ひだり", romaji: "sa — hidari" },
  "右": { onyomi: "ウ / ユウ", kunyomi: "みぎ", romaji: "u / yuu — migi" },
  "学": { onyomi: "ガク", kunyomi: "まな-", romaji: "gaku — mana" },
  "生": { onyomi: "セイ / ショウ", kunyomi: "い- / う- / は- / なま", romaji: "sei / shou — i / u / ha / nama" },
  "校": { onyomi: "コウ", kunyomi: "", romaji: "kou" }
};

let currentKanji = kanjiList[0];

kanjiList.forEach(k => {
  const option = document.createElement("option");
  option.value = k;
  option.textContent = k;
  kanjiSelect.appendChild(option);
});

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

function updateKanjiInfo() {
  document.getElementById("meaningBox").textContent = `Meaning: ${kanjiMeanings[currentKanji] || "Unknown"}`;
  const reading = kanjiReadings[currentKanji];
  document.getElementById("readingBox").textContent =
    reading
      ? `Reading: Onyomi: ${reading.onyomi} | Kunyomi: ${reading.kunyomi} | Romaji: ${reading.romaji}`
      : "Reading: Unknown";
}

function selectKanji() {
  currentKanji = kanjiSelect.value;
  drawCtx.clearRect(0, 0, 400, 400);
  drawTemplate(currentKanji);
  renderAll();
  document.getElementById("result").textContent = "";
  updateKanjiInfo();
}

function randomKanji() {
  const index = Math.floor(Math.random() * kanjiList.length);
  currentKanji = kanjiList[index];
  kanjiSelect.value = currentKanji;
  drawCtx.clearRect(0, 0, 400, 400);
  drawTemplate(currentKanji);
  renderAll();
  document.getElementById("result").textContent = "";
  updateKanjiInfo();
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

  const imageData = drawCanvas.toDataURL("image/png"); // xuất ảnh base64
  fetch('http://localhost:3000/check-kanji', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kanji: currentKanji,
      accuracy: accuracy,
      imageData: imageData
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Phản hồi từ server:", data);
    alert(data.feedback); // ví dụ hiển thị phản hồi
  })
  .catch(err => console.error("Lỗi kết nối backend:", err));


}

drawTemplate(currentKanji);
renderAll();
updateKanjiInfo();
