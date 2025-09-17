// const { load } = require("cheerio");

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

//kanjisvg


let animator = null;

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

async function selectKanji(kanji) {
 
  currentKanji = kanji;
  drawCtx.clearRect(0, 0, 400, 400);
  drawTemplate(currentKanji);
  renderAll();
  document.getElementById("result").textContent = "";
  updateKanjiInfoFromAPI(currentKanji);

  //test
  // === Phần SVG Animate ===
  const url = `https://kanjialive-api.p.rapidapi.com/api/public/kanji/${encodeURIComponent(kanji)}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'e5b7cd00f4mshbeb15c8801358a3p17a185jsndb8ade253014', // 🔑 thay key thật
      'x-rapidapi-host': 'kanjialive-api.p.rapidapi.com'
    }
  };
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    
    const combiCharacter = document.getElementById("combiCharacter");
    combiCharacter.innerHTML = "";
    const breakdown = await getKanjiBreakdown(kanji);
    console.log(breakdown)
    combiCharacter.textContent = breakdown;
   

    const animContainer = document.getElementById("animContainer");
    // animContainer.innerHTML = "";
    await loadKanji(kanji, "animContainer");
    console.log("animContainer:", animContainer);


    const animCharacter = document.getElementById("animCharacter");
    animCharacter.innerHTML= "";
    const mnemonic = await scarpeMnemonic(kanji);
    console.log(mnemonic)
    animCharacter.textContent = mnemonic;

    
    

    // if (data.kanji.video && data.kanji.video.mp4) {
    //   animContainer.innerHTML = "";
    //   const video = document.createElement("video");
    //   video.src = data.kanji.video.mp4
    //   video.controls = true;
    //   video.autoplay = true;
    //   animContainer.appendChild(video);
      
    // } else {
    //   animContainer.innerText = "⚠️ Không có animation cho chữ này.";
    // }

    speakJapanese(kanji);

    } catch (err) {
    console.error(err);
    document.getElementById("animContainer").innerText = "⚠️ Lỗi tải animation!";
    }
}

// test api
const apiToken = "a4aac65a-ed94-487b-9241-8e78c25b0355";

async function getKanjiWithComponent(kanji) {
  const url  = `https://api.wanikani.com/v2/subjects?types=kanji&slugs=${encodeURIComponent(kanji)}`;
  const res = await fetch(url,{
    headers: {Authorization: `Bearer ${apiToken}`}
  });
  if(!res.ok){
    throw new Error(`Wanakani HTTP ${res.status}`);
  }
   return res.json();
}

async function fetchSubjectsByIds(ids) {
  const url = `https://api.wanikani.com/v2/subjects?ids=${ids.join(",")}`;
  const res = await fetch(url, {
    headers: {Authorization: `Bearer ${apiToken}`}
  });
  if(!res.ok){
    throw new Error(`Wanikani HTTP ${res.status}`);
  }
  return res.json();
}

function safeGetMeaning(subject){
  const meanings = subject?.data?.meanings;

  if(!meanings || meanings.length === 0){
    console.log(subject);
    return "N/A";
  }

  console.log("🔎 meanings:", meanings);

  const primary = meanings.find(m=>m.primary && m.meaning);
  if(primary) return primary.meaning;

  const first = meanings.find(m=>m.meaning);
  if(first) return first.meaning;
  console.log("⚠️ meanings không hợp lệ:", meanings);
  return "N/A";

}

async function getKanjiBreakdown(kanji){
  const kanjiData = await getKanjiWithComponent(kanji);
  const subject = kanjiData.data[0];
  const componentsIds = subject.data.component_subject_ids;

  if(!componentsIds  || componentsIds.length === 0){
    return `${kanji} (${safeGetMeaning(subject)})`;
  }

  const componentsRes = await fetchSubjectsByIds(componentsIds);

  const components = componentsRes.data.map(
    c=> {
      const symbol = c.data.characters || c.slug || "?";
      const meaning = safeGetMeaning(c);
      return `${symbol} (${meaning})`
    }
  );

  return `${kanji} = ${components.join("+")}`;

}

async function scarpeMnemonic(kanji) {
  try{
    const res = await fetch(`/mnemonic?kanji=${encodeURIComponent(kanji)}`);
    const data = await res.json();
    return data.mnemonic;
  }catch(err){
    console.log(`❌ Scrape CHMN lỗi: ${kanji}`);
    return "Not found mnemonic";
  }
}


//
function speakJapanese(text){
  if ("speechSynthesis" in window) {
    // ✅ Nếu trình duyệt hỗ trợ thì dùng Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  } else {
    // ❌ Nếu không hỗ trợ thì fallback sang Google Translate TTS
    const audio = new Audio(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`
    );
    audio.play();
  }
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

async function checkResult() {
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

  const username = localStorage.getItem('username');
  const level = document.getElementById('levelSelect');
  const kanji = currentKanji;

  if(username && level && kanji){
    try{
      const res = await fetch('/learn', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: username,
          level: level.value,
          kanji: kanji
        })
      });

      const data = await res.json();
      console.log('Saved: ', data);

    }catch(err){
      console.log('Something wrong', err);
    }
  }

  sendResultToServer(kanji, accuracy)

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
  if(!kanji) return;
  const imageData = canvas.toDataURL(); // lấy ảnh base64 từ canvas
  const res = await fetch('/check-kanji', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kanji, accuracy, imageData })
  });
  const data = await res.json();
  console.log(data.feedback); // phản hồi từ server
}

// local
document.addEventListener('DOMContentLoaded', ()=>{
  const userIcon = document.getElementById('userIcon');
  const username = localStorage.getItem('username');

  if(username){
    userIcon.href = '/profile';
  }else{
    userIcon.href = '/login';
  }

  const speakerBtn = document.getElementById("speaker");
  if (speakerBtn) {
    speakerBtn.addEventListener("click", () => {
      if (currentKanji) {
        speakJapanese(currentKanji);
      } else {
        alert("⚠️ Chưa chọn chữ Kanji nào.");
      }
    });
  }

});

// select level
async function loadKanjiByLevel() {
  const level = document.getElementById("levelSelect").value;
  if (!level) return;

  const grid = document.getElementById("kanjiGrid");
  grid.innerHTML = "⏳ Đang tải...";

  try {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${level}`);
    const kanjiList = await res.json();

    grid.innerHTML = "";
    kanjiList.forEach(k => {
      const cell = document.createElement("div");
      cell.className = "kanji-cell";
      cell.textContent = k;
      cell.onclick = () => selectKanji(k);
      grid.appendChild(cell);
    });

    if (kanjiList.length > 0) {
      selectKanji(kanjiList[0]);
    }

  } catch (error) {
    grid.innerHTML = "⚠️ Lỗi tải dữ liệu!";
    console.error(error);
  }
}

const img = document.getElementById('preview');
img.src = localStorage.getItem('profileImage')


const toggleBtn = document.getElementById("toggleSidebar");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});


//kanjivg
function kanjiToUnicode(kanji) {
  return kanji.codePointAt(0).toString(16).padStart(5, "0");
}

async function loadKanji(kanji, containerId = "kanji-container") {
  const file = `kanjivg/kanji/${kanjiToUnicode(kanji)}.svg`;
  const container = document.getElementById(containerId);

  console.log("Đang load:", file);

  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error("Không tìm thấy file SVG cho chữ này.");

    let svgText = await response.text();
    svgText = svgText
  .replace(/<!DOCTYPE[^>]*>/g, "")  // bỏ DOCTYPE
  .replace(/\]\>/g, "")             // bỏ ký hiệu ]>

    container.innerHTML = svgText; // render vào container mong muốn
    // svgText = svgText.replace(/<text[^>]*>.*?<\/text>/g, "");
    

    const svg = container.querySelector("svg");
    if(svg){
      svg.setAttribute("width", "400");   // to hơn
      svg.setAttribute("height", "400");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    const paths = container.querySelectorAll("path");

    const colors = ["red", "blue", "green", "orange", "purple"];
    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      path.style.stroke = colors[i % colors.length];
      path.style.fill = "none";
      path.style.transition = "none";
    });

    let delay = 0;
    paths.forEach(path => {
      setTimeout(() => {
        path.style.transition = "stroke-dashoffset 0.8s ease";
        path.style.strokeDashoffset = 0;
      }, delay);
      delay += 1000;
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}


//

loadKanjiList();
sendResultToServer(currentKanji, accuracy);
