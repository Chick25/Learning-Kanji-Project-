const gameBoard = document.getElementById('game-board');
const hud = document.getElementById('hud');
const btn = document.getElementById('btn');
const popup = document.getElementById('popup');

let pairs = [], selected = {left:null,right:null};
let correctCount = 0, wrongCount = 0, matchedPairs = 0;

btn.onclick = init;

async function init(){
    hud.textContent = '';
    pairs = [];
    selected.left = selected.right = null;
    gameBoard.innerHTML = '';
    popup.style.display = 'none';

    correctCount = 0;
    wrongCount = 0;
    matchedPairs = 0;

    // Lấy kanji từ API
    let all = await fetch('https://kanjiapi.dev/v1/kanji/grade-1').then(r=>r.json());
    let sample = all.sort(()=>Math.random()-0.5).slice(0,7);

    for (let k of sample) {
        let info = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(k)}`).then(r=>r.json());
        let en = (info.meanings && info.meanings[0]) ? info.meanings[0] : 'N/A';
        pairs.push({kanji:k, meaning:en});
    }

    render();
}

function render(){
    gameBoard.innerHTML = '';

    let meanings = pairs.map(p=>p.meaning).sort(()=>Math.random()-0.5);

    pairs.forEach((p,i) => {
        let left = document.createElement('div');
        left.className = 'item';
        left.textContent = p.kanji;
        left.onclick = ()=>select(left,'left',i);
        gameBoard.appendChild(left);

        let right = document.createElement('div');
        right.className = 'item';
        right.textContent = meanings[i];
        right.onclick = ()=>select(right,'right',i);
        gameBoard.appendChild(right);
    });
}

function select(el,side,index){
    if(selected[side]){
        selected[side].el.classList.remove('selected');
    }
    selected[side] = {el, index};
    el.classList.add('selected');

    if(selected.left && selected.right){
        checkMatch();
    }
}

function checkMatch(){
    const leftPair = pairs[selected.left.index];
    const rightText = selected.right.el.textContent;

    if(leftPair.meaning === rightText){
        hud.textContent = '✅ Đúng!';
        hud.style.color = 'green';
        correctCount++;
        matchedPairs++;
        animateCorrect(selected.left.el);
        animateCorrect(selected.right.el);
    } else {
        hud.textContent = '❌ Sai!';
        hud.style.color = 'red';
        wrongCount++;
        animateWrong(selected.left.el);
        animateWrong(selected.right.el);
    }

    ['left','right'].forEach(s=>{
        if(selected[s]) selected[s].el.classList.remove('selected');
    });
    selected.left = selected.right = null;

    if(matchedPairs === pairs.length){
        showResult();
    }
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
    setTimeout(()=>{
        el.classList.remove('wrong');
    },400);
}

function getGrade(wrong){
    if(wrong === 0) return "A";
    if(wrong === 1) return "B";
    if(wrong === 2) return "C";
    if(wrong === 3) return "D";
    if(wrong === 4) return "E";
    return "F";
}

function showResult(){
    let grade = getGrade(wrongCount);

    popup.innerHTML = `
        <h3>🎉 Hoàn thành!</h3>
        <p>Số lần chọn đúng: <b>${correctCount}</b></p>
        <p>Số lần chọn sai: <b>${wrongCount}</b></p>
        <p>Điểm: <b>${grade}</b></p>
        <button onclick="init()">Chơi lại</button>
    `;
    popup.style.display = 'block';
}

init();