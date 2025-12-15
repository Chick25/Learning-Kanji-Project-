const hud = document.getElementById('hud');
const question = document.getElementById('question');
const gameBoard = document.getElementById('game-board');
const optionsDiv = document.getElementById('options');
const popup = document.getElementById('popup');
const btn = document.getElementById('btn');

let pairs = [];
let allLearnedKanji = [];
let score = 0;
let currentRound = 1;

const username = localStorage.getItem('username');
if (!username) {
    alert("Vui lòng đăng nhập!");
    window.location.href = '/login';
}

async function init() {
    hud.textContent = 'Đang tải dữ liệu...';
    question.textContent = '';
    gameBoard.innerHTML = '';
    optionsDiv.innerHTML = '';
    popup.style.display = 'none';
    btn.classList.add('hidden');

    score = 0;
    currentRound = 1;

    try {
        const res = await fetch(`/api/progress?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error("Server error");

        const data = await res.json();
        const progress = data.progress || {};
        allLearnedKanji = [];
        Object.values(progress).forEach(arr => allLearnedKanji.push(...(arr || [])));
        allLearnedKanji = [...new Set(allLearnedKanji)];

        if (allLearnedKanji.length < 7) {
            hud.innerHTML = `Bạn mới học <b>${allLearnedKanji.length}</b> chữ.<br>Hãy học thêm ít nhất 7 chữ để chơi nhé! 😊`;
            return;
        }

        // Random 7 chữ cho vòng 1
        const shuffled = allLearnedKanji.sort(() => Math.random() - 0.5);
        const sample = shuffled.slice(0, 7);

        pairs = [];
        for (let kanji of sample) {
            const meaning = await getMeaning(kanji);
            pairs.push({ kanji, meaning });
        }

        hud.textContent = 'VÒNG 1: Nối Kanji với nghĩa';
        startRound1();
    } catch (err) {
        hud.innerHTML = 'Lỗi kết nối server. Vui lòng thử lại!';
    }
}

async function getMeaning(kanji) {
    try {
        const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
        const data = await res.json();
        return data.meanings?.[0] || "Unknown";
    } catch {
        return "Kanji";
    }
}

// VÒNG 1: NỐI KANJI VỚI NGHĨA (2 CỘT)
function startRound1() {
    question.textContent = '';
    optionsDiv.innerHTML = '';
    gameBoard.style.display = 'grid';

    let meanings = pairs.map(p => p.meaning).sort(() => Math.random() - 0.5);

    pairs.forEach((p, i) => {
        let left = document.createElement('div');
        left.className = 'item';
        left.textContent = p.kanji;
        left.onclick = () => select(left, 'left', i);
        gameBoard.appendChild(left);

        let right = document.createElement('div');
        right.className = 'item';
        right.textContent = meanings[i];
        right.onclick = () => select(right, 'right', i);
        gameBoard.appendChild(right);
    });
}

// VÒNG 2 & 3: 4 LỰA CHỌN
function startMultipleChoice(round) {
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'none';
    optionsDiv.innerHTML = '';

    const pair = pairs[Math.floor(Math.random() * pairs.length)];

    if (round === 2) {
        question.innerHTML = `VÒNG 2: Nghĩa "<strong>${pair.meaning}</strong>" là chữ Kanji nào?`;
        showKanjiOptions(pair.kanji);
    } else {
        question.innerHTML = `VÒNG 3: Chữ "<strong>${pair.kanji}</strong>" có nghĩa là gì?`;
        showMeaningOptions(pair.meaning);
    }
}

function showKanjiOptions(correct) {
    let wrong = pairs.filter(p => p.kanji !== correct).map(p => p.kanji);
    wrong = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [correct, ...wrong].sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = opt;
        div.onclick = () => checkMCAnswer(opt, correct, 2);
        optionsDiv.appendChild(div);
    });
}

function showMeaningOptions(correct) {
    let wrong = pairs.filter(p => p.meaning !== correct).map(p => p.meaning);
    wrong = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [correct, ...wrong].sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = opt;
        div.onclick = () => checkMCAnswer(opt, correct, 3);
        optionsDiv.appendChild(div);
    });
}

function checkMCAnswer(selected, correct, round) {
    document.querySelectorAll('.option').forEach(o => o.onclick = null);

    let isCorrect = selected === correct;

    document.querySelectorAll('.option').forEach(o => {
        if (o.textContent === correct) o.classList.add('correct');
        if (o.textContent === selected && !isCorrect) o.classList.add('wrong');
    });

    if (isCorrect) {
        score += 20;
        hud.innerHTML = `✅ Đúng rồi! +20 điểm (Tổng: ${score})`;
    } else {
        hud.innerHTML = `❌ Sai rồi! Đáp án: <strong>${correct}</strong> (Tổng: ${score})`;
    }

    if (round === 2) {
        setTimeout(() => {
            hud.textContent = 'VÒNG 3: Chọn nghĩa đúng với Kanji';
            startMultipleChoice(3);
        }, 2500);
    } else {
        setTimeout(showResult, 2500);
    }
}

// VÒNG 1: NỐI
let selected = {left: null, right: null};

function select(el, side, index) {
    if (selected[side]) {
        selected[side].el.classList.remove('selected');
    }
    selected[side] = { el, index };
    el.classList.add('selected');

    if (selected.left && selected.right) {
        checkMatch();
    }
}

function checkMatch() {
    const leftPair = pairs[selected.left.index];
    const rightText = selected.right.el.textContent;

    if (leftPair.meaning === rightText) {
        hud.textContent = '✅ Đúng!';
        correctCount++;
        matchedPairs++;
        animateCorrect(selected.left.el);
        animateCorrect(selected.right.el);
    } else {
        hud.textContent = '❌ Sai!';
        wrongCount++;
        animateWrong(selected.left.el);
        animateWrong(selected.right.el);
    }

    ['left', 'right'].forEach(s => {
        if (selected[s]) selected[s].el.classList.remove('selected');
    });
    selected.left = selected.right = null;

    if (matchedPairs === pairs.length) {
        score += correctCount * 10;
        hud.textContent = 'VÒNG 1 HOÀN THÀNH!';
        setTimeout(() => {
            hud.textContent = 'VÒNG 2: Chọn Kanji đúng với nghĩa';
            startMultipleChoice(2);
        }, 2000);
    }
}

function animateCorrect(el) {
    el.classList.add('correct');
    setTimeout(() => el.classList.add('disabled'), 600);
}

function animateWrong(el) {
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 500);
}

function showResult() {
    popup.innerHTML = `
        <h3>🎉 Hoàn thành 3 vòng!</h3>
        <p>Tổng điểm: <b>${score}</b></p>
        <p>${score >= 150 ? "THẦN ĐỒNG KANJI! 🏆" : score >= 100 ? "XUẤT SẮC! 🚀" : "TỐT LẮM! CỐ GẮNG HƠN NHA! 💪"}</p>
        <button onclick="init()">Chơi lại</button>
    `;
    popup.style.display = 'block';
    btn.classList.remove('hidden');
}

let correctCount = 0, wrongCount = 0, matchedPairs = 0;

btn.onclick = init;
init();