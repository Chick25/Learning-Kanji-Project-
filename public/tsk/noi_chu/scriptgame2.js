 const gameBoard = document.getElementById('game-board');
const hud = document.getElementById('hud');
const btn = document.getElementById('btn');
const gradeSelect = document.getElementById('grade-select');
const popup = document.getElementById('popup');

const gradeCache = {};
let pairs = [], selected = {left:null,right:null};
let correctCount = 0, wrongCount = 0, matchedPairs = 0;

gradeSelect.onchange = init;
btn.onclick = init;

const CURRENT_USER = {
    id: 1,
    name: 'Nguyen Van A'
};

const historyList = [];

async function init(){
    popup.style.display='none';
    popup.style.opacity='0';
    popup.style.transform='translate(-50%,-50%) scale(.9)';

    selected={left:null,right:null};
    correctCount=wrongCount=matchedPairs=0;

    const grade = gradeSelect.value;

    if(gradeCache[grade]){
        pairs = getRandom8(gradeCache[grade]);
        hud.textContent = `Grade ${grade} sẵn sàng!`;
        render();
        return;
    }

    hud.textContent = `Đang tải Grade ${grade}...`;
    gameBoard.innerHTML='';

    try{
        const list = await fetch(`https://kanjiapi.dev/v1/kanji/grade-${grade}`).then(r=>r.json());
        const sample = list.sort(()=>Math.random()-0.5).slice(0,8);

        const results = await Promise.all(
            sample.map(k =>
                fetch(`https://kanjiapi.dev/v1/kanji/${k}`)
                .then(r=>r.json())
                .then(i=>({kanji:k, meaning:i.meanings?.[0] || 'unknown'}))
            )
        );

        gradeCache[grade]=results;
        pairs=results;
        hud.textContent = `Grade ${grade} đã sẵn sàng!`;
        render();

    }catch{
        hud.textContent='Lỗi mạng, thử lại!';
    }
}

function getRandom8(d){
    return d.sort(()=>Math.random()-0.5).slice(0,8);
}

function render(){
    gameBoard.innerHTML = '';

    // tạo danh sách meaning có id
    let rightItems = pairs.map((p, i) => ({
        text: p.meaning,
        id: i
    })).sort(() => Math.random() - 0.5);

    pairs.forEach((p, i) => {
        let left = document.createElement('div');
        left.className = 'item';
        left.textContent = p.kanji;
        left.dataset.id = i;
        left.onclick = () => select(left, 'left');
        gameBoard.appendChild(left);

        let right = document.createElement('div');
        right.className = 'item';
        right.textContent = rightItems[i].text;
        right.dataset.id = rightItems[i].id;
        right.onclick = () => select(right, 'right');
        gameBoard.appendChild(right);
    });
}

function select(el, side){
    if(el.classList.contains('disabled')) return;

    if(selected[side])
        selected[side].el.classList.remove('selected');

    selected[side] = {
        el,
        id: el.dataset.id
    };

    el.classList.add('selected');

    if(selected.left && selected.right)
        setTimeout(checkMatch, 300);
}

function checkMatch(){
    const isMatch = selected.left.id === selected.right.id;

    if(isMatch){
        hud.textContent = 'Đúng!';
        hud.style.color = 'green';
        correctCount++; matchedPairs++;
        animateCorrect(selected.left.el);
        animateCorrect(selected.right.el);
    }else{
        hud.textContent = 'Sai!';
        hud.style.color = 'red';
        wrongCount++;
        animateWrong(selected.left.el);
        animateWrong(selected.right.el);
    }

    ['left','right'].forEach(s =>
        selected[s]?.el.classList.remove('selected')
    );

    selected = {left:null,right:null};

    if(matchedPairs === pairs.length)
        setTimeout(showResult, 600);
}

function animateCorrect(el){
    el.classList.add('correct');
    setTimeout(()=>{
        el.classList.remove('correct');
        el.classList.add('disabled');
    },500);
}

function animateWrong(el){
    el.classList.add('wrong');
    setTimeout(()=>el.classList.remove('wrong'),500);
}

function showResult(){
let score = 'A';
let message = '';

if (wrongCount === 0) score = 'A+';
else if (wrongCount <= 2) score = 'A';
else if (wrongCount <= 5) score = 'B';
else if (wrongCount === 6){ score='D'; message='Cần Học Thêm!!!'; }
else if (wrongCount === 7){ score='E'; message='Cần Học Thêm!!!'; }
else { score='F'; message='Cần Học Thêm!!!'; }

/* ===== 1. LƯU VÀO LỊCH SỬ (RAM) ===== */
historyList.unshift({
    userName: CURRENT_USER.name,
    grade: gradeSelect.value,
    score: score,
    correct: correctCount,
    wrong: wrongCount,
    time: new Date().toLocaleString()
});

/* ===== 2. CẬP NHẬT CỘT LỊCH SỬ ===== */
renderHistory();

/* ===== 3. HIỆN POPUP ===== */
popup.innerHTML = `
    <h3>Hoàn thành!</h3>
    <p>Người chơi: <b>${CURRENT_USER.name}</b></p>
    <p>Grade: <b>${gradeSelect.value}</b></p>
    <p>Đúng: <b>${correctCount}</b></p>
    <p>Sai: <b>${wrongCount}</b></p>
    <p>Điểm: <b style="font-size:2em;color:#e67e22">${score}</b></p>
    ${message ? `<p style="color:red;font-weight:bold">${message}</p>` : ''}
    <button onclick="closePopup()">Đóng</button>
    <button onclick="init()">Chơi lại</button>
`;

popup.style.display = 'block';
requestAnimationFrame(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translate(-50%,-50%) scale(1)';
});
}

function closePopup(){
popup.style.opacity = '0';
popup.style.transform = 'translate(-50%,-50%) scale(0.9)';
setTimeout(() => popup.style.display = 'none', 300);
}


function renderHistory(){
const ul = document.getElementById('history-list');
ul.innerHTML = '';

historyList.forEach(h => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
        <div class="history-user">${h.userName}</div>
        Grade ${h.grade} |
        <span class="history-score">${h.score}</span><br>
        Đúng: ${h.correct} – Sai: ${h.wrong}<br>
        <small style="color:#777">${h.time}</small>
    `;
    ul.appendChild(li);
});
}

/////////////////menu toggle/////////////////////
const toggleBtn = document.getElementById("toggleSidebar");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
sidebar.classList.toggle("active");
});


init();