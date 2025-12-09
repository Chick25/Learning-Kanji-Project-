// const { load } = require("cheerio");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const kanjiGrid = document.getElementById("kanjiGrid");

let currentKanji = null;
let localStrokes = [];

let userStrokes = [];
let currentStrokes = 0;
let currentStrokePoints = [];

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

// function renderAll() {
//   ctx.clearRect(0, 0, 400, 400);
//   ctx.globalAlpha = 1;
//   ctx.drawImage(templateCanvas, 0, 0);
//   ctx.drawImage(drawCanvas, 0, 0);
// }

function renderAll() {
  ctx.clearRect(0, 0, 400, 400);
  ctx.drawImage(templateCanvas, 0, 0); // guide

  // Vẽ tất cả nét user đã hoàn thành
  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  for (let i = 0; i < userStrokes.length; i++) {
    if (userStrokes[i] && userStrokes[i].length > 0) {
      ctx.beginPath();
      ctx.moveTo(userStrokes[i][0].x, userStrokes[i][0].y);
      for (let j = 1; j < userStrokes[i].length; j++) {
        ctx.lineTo(userStrokes[i][j].x, userStrokes[i][j].y);
      }
      ctx.stroke();
    }
  }
}

// function drawTemplate(kanji) {
//   templateCtx.clearRect(0, 0, 400, 400);
//   templateCtx.globalAlpha = 0.08;
//   templateCtx.fillStyle = "#000";
//   templateCtx.font = "200px 'Yu Mincho', 'MS Mincho', serif";
//   templateCtx.textAlign = "center";
//   templateCtx.textBaseline = "middle";
//   templateCtx.fillText(kanji, 200, 200);

// }

//test
function drawStrokeNumbers() {  // ← Bỏ tham số kanji
  templateCtx.clearRect(0, 0, 400, 400);

  if (!localStrokes || localStrokes.length === 0) return;

  templateCtx.save();
  templateCtx.translate(90, 90);
  templateCtx.scale(2, 2);

  localStrokes.forEach((d, i) => {
    const path = new Path2D(d);

    templateCtx.lineWidth = 4;
    templateCtx.strokeStyle = i < currentStrokes ? "lightgray" : "rgba(200, 200, 200, 0.5)";
    templateCtx.stroke(path);
  });

  templateCtx.restore();
  renderAll();
}
// async function drawStrokeNumbers(kanji){
//   templateCtx.clearRect(0, 0, 400, 400);

//   // const animContainer = document.getElementById("animContainer");
   
//   strokes = await loadKanji(kanji, "animContainer");

//   templateCtx.save();
//   templateCtx.translate(90, 90); // Dịch chuyển toàn bộ nét vẽ
//   templateCtx.scale(2, 2); // Phóng to nét vẽ
//   // const tempCanvas = document.createElement("canvas");
//   // tempCanvas.width = 400;
//   // tempCanvas.height = 400;
//   // const tempCtx = tempCanvas.getContext("2d");

//   strokes.forEach((d, i)=>{
//     const path = new Path2D(d);
   
//     templateCtx.lineWidth = 4;
    
//     if( i < currentStrokes){
//       templateCtx.strokeStyle = "lightgray";
    
//     }else{
//       templateCtx.strokeStyle = "lightgray";
//       templateCtx.globalAlpha = 0.5;
//     }

//     templateCtx.stroke(path);
//     templateCtx.globalAlpha = 1;
//   });
//   // templateCtx.drawImage(tempCanvas, 0, 0);
//   templateCtx.restore();
//   renderAll();
// }

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
  if(currentKanji === kanji) return;

  currentKanji = kanji;
  drawCtx.clearRect(0, 0, 400, 400);
  userStrokes = [];
  currentStrokes = 0;
  templateCtx.clearRect(0, 0, 400, 400);
  

  await drawStrokeNumbers();
  renderAll();

  document.getElementById("result").textContent = "";
  updateKanjiInfoFromAPI(currentKanji);
  await updateKanjiInfoFromAPI(currentKanji);

  

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
   
    let strokes = await loadKanji(kanji, "animContainer");
    console.log("animContainer:", animContainer);
    console.log('this is', strokes);
    console.log('local', localStrokes)
    // drawTemplate(strokes);
    // drawStrokeNumbers(kanji);
    drawStrokeNumbers(); // không tham số
    renderAll();

    const animCharacter = document.getElementById("animCharacter");
    animCharacter.innerHTML= "";
    const mnemonic = await scarpeMnemonic(kanji);
    console.log(mnemonic)
    animCharacter.textContent = mnemonic;

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
  
  document.getElementById("result").textContent = "";
  userStrokes = [];
  currentStrokePoints = [];
  currentStrokes = 0;
  drawStrokeNumbers();
  renderAll();
}

let isDrawing = false;


canvas.addEventListener("mousedown", (e)=>{
  isDrawing = true;
  currentStrokePoints = [];
  const {x, y} = getMousePos(e);
  currentStrokePoints.push({x, y});
  drawCtx.beginPath();
  drawCtx.moveTo(x, y);
});

// canvas.addEventListener("mousemove", (e)=>{
//   if(!isDrawing) return;

//   const {x, y} = getMousePos(e);
//   currentStrokePoints.push({x, y});
//   drawCtx.lineTo(x, y);
//   drawCtx.strokeStyle = "#2c3e50";
//   drawCtx.lineWidth = 4;
//   drawCtx.lineCap = "round";
//   drawCtx.stroke();
//   renderAll();
// });

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  const {x, y} = getMousePos(e);
  currentStrokePoints.push({x, y});

  renderAll(); // vẽ lại tất cả
  ctx.beginPath();
  ctx.moveTo(currentStrokePoints[0].x, currentStrokePoints[0].y);
  for (let j = 1; j < currentStrokePoints.length; j++) {
    ctx.lineTo(currentStrokePoints[j].x, currentStrokePoints[j].y);
  }
  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();
});

canvas.addEventListener("mouseup", ()=>{
  isDrawing = false;
  if(currentStrokePoints.length > 0){
    userStrokes.push(currentStrokePoints);
    // currentStrokes++;
    checkResult();
  }
    currentStrokePoints = [];
    drawStrokeNumbers();
});



canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
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
  if (!kanji) return;

  const username = localStorage.getItem('username'); // giả sử bạn lưu username khi login
  if (!username) {
    console.log("Chưa đăng nhập → không lưu progress");
    return;
  }

  const level = levelSelect.value; // hoặc lấy từ giao diện (select level)

  const payload = {
    kanji,
    accuracy,
    username,
    level
  };

  try {
    const res = await fetch('/check-kanji', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      console.log("Đã lưu vào progress thành công!", data);
    } else {
      console.error("Lỗi từ server:", data);
    }
  } catch (err) {
    console.error("Lỗi gửi:", err);
  }
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

let strokes = [];

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
    
    const parser = new DOMParser();

    const svg = container.querySelector("svg");
    if(svg){
      svg.setAttribute("width", canvas.width);   // to hơn
      svg.setAttribute("height", canvas.height);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    localStrokes =[];

    const paths = container.querySelectorAll("path");

    const colors = ["red", "blue", "green", "orange", "purple"];
    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      path.style.stroke = colors[i % colors.length];
      path.style.fill = "none";
      path.style.transition = "none";
      const d = path.getAttribute('d');
      if(d) localStrokes.push(d);
    });

    let delay = 0;
    paths.forEach(path => {
      setTimeout(() => {
        path.style.transition = "stroke-dashoffset 0.8s ease";
        path.style.strokeDashoffset = 0;
      }, delay);
      delay += 1000;
    });

    return localStrokes;

  } catch (err) {
    container.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

async function checkResult() {
  if (!localStrokes || localStrokes.length === 0) {
    document.getElementById('result').innerText = "⚠️ Chưa tải chữ Kanji";
    return;
  }

  // if (currentStrokes >= localStrokes.length) {
  //   document.getElementById("result").innerText = `🎉 Hoàn thành chữ ${currentKanji}!`;
  //   return;
  // }

   if (currentStrokes >= localStrokes.length) {
    // ĐÃ HOÀN THÀNH TOÀN BỘ CHỮ
    document.getElementById("result").innerText = `🎉 Hoàn thành chữ ${currentKanji}!`;

    // === GỬI DỮ LIỆU LÊN SERVER KHI HOÀN THÀNH CHỮ ===
    console.log('ok');
    await sendResultToServer(currentKanji, 100);
    // Nếu muốn gửi thêm thông tin (số nét, thời gian, ảnh canvas, v.v.) thì chỉnh ở hàm sendResultToServer

    drawStrokeNumbers();
    renderAll();
    return;
  }

  // Lấy nét hiện tại cần kiểm tra
  const currentPathString = localStrokes[currentStrokes];
  if (!currentPathString) {
    document.getElementById('result').innerText = "Không tìm thấy nét mẫu";
    return;
  }

  const userStroke = userStrokes[currentStrokes];
  if (!userStroke || userStroke.length === 0) {
    document.getElementById('result').innerText = `❌ Bạn chưa vẽ nét ${currentStrokes + 1}`;
    return;
  }

  const currentPoints = userStroke;

  // === 1. KIỂM TRA HƯỚNG NÉT ===
  const modelEndpoints = getStrokeEndpoints(currentPathString);
  const modelVector = {
    dx: modelEndpoints.end.x - modelEndpoints.start.x,
    dy: modelEndpoints.end.y - modelEndpoints.start.y
  };

  const userVector = {
    dx: currentPoints[currentPoints.length - 1].x - currentPoints[0].x,
    dy: currentPoints[currentPoints.length - 1].y - currentPoints[0].y
  };

  const modelLen = Math.hypot(modelVector.dx, modelVector.dy);
  const userLen = Math.hypot(userVector.dx, userVector.dy);

  if (modelLen > 1 && userLen > 10) {  // tránh nét quá ngắn gây sai lệch
    const dot = (modelVector.dx * userVector.dx + modelVector.dy * userVector.dy) / (modelLen * userLen);
    if (dot < -0.3) {  // lệch > ~107° → coi là ngược hướng
      document.getElementById('result').innerText = 
        `❌ Sai hướng nét ${currentStrokes + 1}! Hãy vẽ ngược lại theo chiều nét mẫu`;
      drawStrokeNumbers();
      renderAll();
      return;
    }
  }

  // === 2. KIỂM TRA HÌNH DẠNG NÉT ===
  const path = new Path2D(currentPathString.replace(/\s+/g, " ").trim());
  let matchCount = 0;

  templateCtx.lineWidth = 20;  // độ dày để dễ khớp hơn

  for (let p of currentPoints) {
    const x = (p.x - 90) / 2;  // chuyển tọa độ canvas về hệ SVG
    const y = (p.y - 90) / 2;
    if (templateCtx.isPointInStroke(path, x, y)) {
      matchCount++;
    }
  }

  const ratio = matchCount / currentPoints.length;
  const threshold = 0.35;  // điều chỉnh tùy độ khó (0.3 dễ, 0.5 khó)

  // if (ratio >= threshold) {
  //   currentStrokes++;
  //   if (currentStrokes >= localStrokes.length) {
  //     document.getElementById("result").innerText = `🎉 Hoàn thành chữ ${currentKanji}!`;
  //   } else {
  //     document.getElementById("result").innerText = 
  //       `✔️ Đúng nét ${currentStrokes}! Tiếp tục nét ${currentStrokes + 1}`;
  //   }
  // } else {
  //   document.getElementById("result").innerText = 
  //     `❌ Nét ${currentStrokes + 1} chưa đúng (chỉ khớp ${Math.round(ratio*100)}%), vẽ lại nhé!`;
  // }

  if (ratio >= threshold) {
    currentStrokes++;

    // Gửi dữ liệu từng nét đúng (nếu muốn theo dõi chi tiết)
    // await sendResultToServer(currentKanji, Math.round(ratio * 100), currentStrokes);

    if (currentStrokes >= localStrokes.length) {
      // Trường hợp vừa hoàn thành nét cuối → hiện thông báo + gửi dữ liệu
      document.getElementById("result").innerText = `🎉 Hoàn thành chữ ${currentKanji}!`;
      await sendResultToServer(currentKanji, 100);  // gửi khi hoàn thành chữ
    } else {
      document.getElementById("result").innerText = 
        `✔️ Đúng nét ${currentStrokes}! Tiếp tục nét ${currentStrokes + 1}`;
    }
  } else {
    document.getElementById("result").innerText = 
      `❌ Nét ${currentStrokes + 1} chưa đúng (${Math.round(ratio*100)}%), vẽ lại nhé!`;
  }

  drawStrokeNumbers();
  renderAll();
}

function getStrokeEndpoints(d) {
  const normalized = d.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(/\s+/);
  
  let i = 0;
  let currentX = 0, currentY = 0;
  let startX = 0, startY = 0;
  let hasMoved = false;
  let lastCommand = '';

  while (i < tokens.length) {
    let token = tokens[i];

    // Nếu là lệnh (chữ cái)
    if (/[a-zA-Z]/.test(token)) {
      lastCommand = token;
      i++;
    } else if (!lastCommand) {
      i++;
      continue;
    }

    // Lấy tất cả số sau lệnh
    const nums = [];
    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
      const n = parseFloat(tokens[i]);
      if (!isNaN(n)) nums.push(n);
      i++;
    }
    if (nums.length === 0) continue;

    switch (lastCommand.toUpperCase()) {
      case 'M': // Moveto
        currentX = nums[0];
        currentY = nums[1] || currentY;
        if (!hasMoved) {
          startX = currentX;
          startY = currentY;
          hasMoved = true;
        }
        break;

      case 'C': // Cubic Bézier absolute
        if (nums.length >= 2) {
          currentX = nums[nums.length - 2];
          currentY = nums[nums.length - 1];
        }
        break;

      case 'c': // Cubic Bézier relative
        if (nums.length >= 6) {
          for (let j = 0; j < nums.length; j += 6) {
            currentX += nums[j + 4] || 0;
            currentY += nums[j + 5] || 0;
          }
        }
        break;

      // Thêm các lệnh khác nếu cần (L, l, S, s, Q, q, ...)
      case 'L':
        currentX = nums[0];
        currentY = nums[1] || currentY;
        break;

      case 'l':
        currentX += nums[0];
        currentY += nums[1] || 0;
        break;

      case 'Z': case 'z':
        currentX = startX;
        currentY = startY;
        break;

      default:
        // Các lệnh khác (S, Q...) cũng lấy điểm cuối tương tự C/c
        if (nums.length >= 2) {
          const lastTwo = nums.slice(-2);
          if (lastCommand === lastCommand.toLowerCase()) { // relative
            currentX += lastTwo[0];
            currentY += lastTwo[1] || 0;
          } else {
            currentX = lastTwo[0];
            currentY = lastTwo[1] || currentY;
          }
        }
    }
  }

  return {
    start: { x: startX, y: startY },
    end: { x: currentX, y: currentY }
  };


}

loadKanjiList();
sendResultToServer(currentKanji, accuracy);
