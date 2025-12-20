document.addEventListener("DOMContentLoaded", () => {
  const hud = document.getElementById('hud');
  const question = document.getElementById('question');
  const gameBoard = document.getElementById('game-board');
  const popup = document.getElementById('popup');
  const btn = document.getElementById('btn');

  let learnedKanji = [];
  let pairs = [];
  let selected = { left: null, right: null };
  let correctCount = 0;
  let matchedPairs = 0;

  const username = localStorage.getItem('username');
  if (!username) {
    alert("Vui lòng đăng nhập!");
    window.location.href = '/login';
    return;
  }

  async function loadLearnedKanji() {
    hud.textContent = 'Đang tải chữ đã học...';
    try {
      const res = await fetch(`/api/progress?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const progress = data.progress || {};
      learnedKanji = [];
      Object.values(progress).forEach(arr => learnedKanji.push(...(arr || [])));

      if (learnedKanji.length < 8) {
        hud.innerHTML = `Bạn chỉ học <b>${learnedKanji.length}</b> chữ.<br>Hãy học thêm ít nhất 8 chữ để chơi game này nhé! 😊`;
        btn.style.display = 'block'; // Hiện nút chơi lại/thử lại
        return;
      }

      await startGame();
    } catch (err) {
      hud.innerHTML = 'Lỗi kết nối server. Vui lòng thử lại sau!';
      console.error(err);
      btn.style.display = 'block';
    }
  }

  async function getMeaning(kanji) {
    try {
      const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
      if (!res.ok) return "Không rõ nghĩa";
      const data = await res.json();
      return data.meanings?.[0] || "Không rõ nghĩa";
    } catch (err) {
      console.warn(`Không lấy được nghĩa cho ${kanji}:`, err);
      return "Không rõ nghĩa";
    }
  }

  async function startGame() {
    hud.textContent = 'Đang chuẩn bị game...';
    question.textContent = 'Nối Kanji với nghĩa đúng';

    const shuffled = learnedKanji.sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, 8);

    pairs = [];
    for (let kanji of sample) {
      const meaning = await getMeaning(kanji);
      pairs.push({ kanji, meaning });
    }

    render();
    hud.textContent = 'Bắt đầu nối nào! 🎯';
  }

  function render() {
    gameBoard.innerHTML = '';

    // Tạo mảng nghĩa kèm index gốc
    let meaningItems = pairs.map((p, i) => ({
      meaning: p.meaning,
      originalIndex: i
    }));

    // Trộn nghĩa
    meaningItems.sort(() => Math.random() - 0.5);

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '30px';
    leftCol.style.alignItems = 'center';

    const rightCol = document.createElement('div');
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.gap = '30px';
    rightCol.style.alignItems = 'center';

    // Cột trái: Kanji (giữ nguyên thứ tự)
    pairs.forEach((pair, i) => {
      const kanjiItem = document.createElement('div');
      kanjiItem.className = 'item';
      kanjiItem.textContent = pair.kanji;
      kanjiItem.dataset.index = i;
      kanjiItem.onclick = () => selectItem(kanjiItem, 'left');
      leftCol.appendChild(kanjiItem);
    });

    // Cột phải: Nghĩa (đã trộn)
    meaningItems.forEach(item => {
      const meaningItem = document.createElement('div');
      meaningItem.className = 'item';
      meaningItem.textContent = item.meaning;
      meaningItem.dataset.index = item.originalIndex;
      meaningItem.onclick = () => selectItem(meaningItem, 'right');
      rightCol.appendChild(meaningItem);
    });

    gameBoard.appendChild(leftCol);
    gameBoard.appendChild(rightCol);
  }

  function selectItem(el, side) {
    if (el.classList.contains('disabled')) return;

    if (selected[side]) {
      selected[side].classList.remove('selected');
    }

    selected[side] = el;
    el.classList.add('selected');

    if (selected.left && selected.right) {
      setTimeout(checkPair, 600);
    }
  }

  function checkPair() {
    const leftIndex = parseInt(selected.left.dataset.index);
    const rightIndex = parseInt(selected.right.dataset.index);

    const isCorrect = leftIndex === rightIndex;

    if (isCorrect) {
      hud.textContent = 'Đúng rồi! 🎉';
      hud.style.color = '#4CAF50';
      correctCount++;
      matchedPairs++;

      selected.left.classList.add('correct', 'disabled');
      selected.right.classList.add('correct', 'disabled');
    } else {
      correctCount--;
      hud.textContent = 'Sai rồi! 😅';
      hud.style.color = '#f44336';
      selected.left.classList.add('wrong');
      selected.right.classList.add('wrong');

      setTimeout(() => {
        selected.left.classList.remove('wrong');
        selected.right.classList.remove('wrong');
      }, 600);
    }

    selected.left.classList.remove('selected');
    selected.right.classList.remove('selected');
    selected = { left: null, right: null };

    if (matchedPairs === pairs.length) {
      setTimeout(showResult, 1000);
    }
  }

  function showResult() {
    const accuracy = Math.round((correctCount / pairs.length) * 100);
    let message = "";
    if (accuracy === 100) message = "HOÀN HẢO! Bạn là thiên tài Kanji! 🏆✨";
    else if (accuracy >= 80) message = "XUẤT SẮC! Rất giỏi đấy! 🌟";
    else if (accuracy >= 60) message = "TỐT LẮM! Cố lên nhé! 💪";
    else message = "CẦN HỌC THÊM! Nhưng bạn đang tiến bộ! 😊";

    popup.innerHTML = `
      <h3>🎉 Hoàn thành!</h3>
      <p>Bạn đã nối đúng <strong>${correctCount}/${pairs.length}</strong> cặp</p>
      <p>Độ chính xác: <strong style="font-size:36px;color:#e67e22">${accuracy}%</strong></p>
      <p style="font-size:26px; margin:30px 0; line-height:1.5">${message}</p>
      <button onclick="location.reload()" style="padding:16px 50px; font-size:20px; background:#71A95A; color:white; border:none; border-radius:50px; cursor:pointer;">
        Chơi lại
      </button>
    `;
    popup.style.display = 'block';
    // Hiệu ứng mượt
    setTimeout(() => popup.style.opacity = '1', 50);
  }

  btn.onclick = () => location.reload();

  loadLearnedKanji();
});