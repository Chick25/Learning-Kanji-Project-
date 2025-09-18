const kanjiCol = document.getElementById('kanjiColumn');
    const meaningCol = document.getElementById('meaningColumn');
    const resultBox = document.getElementById('resultBox');
    const levelSelect = document.getElementById('levelSelect');
    let selected = [];
    let wrongCount = 0;
    let totalPairs = 0;
    let matchedCount = 0;
    let pairMap = {};

    async function loadData(level) {
      wrongCount = 0;
      matchedCount = 0;
      resultBox.style.display = 'none';
      kanjiCol.innerHTML = '';
      meaningCol.innerHTML = '';

      const res = await fetch(`https://kanjiapi.dev/v1/kanji/${level}`);
      const list = await res.json();
      const chosen = list.sort(() => Math.random() - 0.5).slice(0, 7);

      const detailPromises = chosen.map(k =>
        fetch(`https://kanjiapi.dev/v1/kanji/${k}`).then(r => r.json())
      );
      const details = await Promise.all(detailPromises);

      pairMap = {};
      details.forEach(d => pairMap[d.kanji] = d.meanings[0]);

      const kanjis = details.map(d => d.kanji);
      const meanings = details.map(d => d.meanings[0]);

      totalPairs = kanjis.length;

      shuffleArray(kanjis);
      shuffleArray(meanings);

      kanjis.forEach(k => createItem(k, 'kanji'));
      meanings.forEach(m => createItem(m, 'meaning'));
    }

    function createItem(text, type) {
      const div = document.createElement('div');
      div.textContent = text;
      div.className = 'item';
      div.dataset.type = type;
      div.addEventListener('click', () => handleClick(div));
      (type === 'kanji' ? kanjiCol : meaningCol).appendChild(div);
    }

    function handleClick(item) {
      if (item.classList.contains('matched')) return;
      if (item.classList.contains('selected')) return;

      item.classList.add('selected');
      selected.push(item);

      if (selected.length === 2) {
        const [a, b] = selected;

        if (a.dataset.type !== b.dataset.type) {
          const match = isCorrectPair(a, b);

          if (match) {
            a.classList.remove('selected');
            b.classList.remove('selected');
            a.classList.add('correct');
            b.classList.add('correct');

            setTimeout(() => {
              a.classList.add('matched');
              b.classList.add('matched');
              a.classList.remove('correct');
              b.classList.remove('correct');
            }, 500);

            matchedCount++;
            if (matchedCount === totalPairs) showResult();
          } else {
            wrongCount++;
            a.classList.add('wrong');
            b.classList.add('wrong');
            setTimeout(() => {
              a.classList.remove('wrong','selected');
              b.classList.remove('wrong','selected');
            }, 500);
          }
        } else {
          a.classList.remove('selected');
        }
        selected = [];
      }
    }

    function isCorrectPair(a, b) {
      if (a.dataset.type === 'kanji')
        return pairMap[a.textContent] === b.textContent;
      else
        return pairMap[b.textContent] === a.textContent;
    }

    function showResult() {
      let grade = 'F';
      if (wrongCount === 0) grade = 'A';
      else if (wrongCount === 1) grade = 'B';
      else if (wrongCount === 2) grade = 'C';
      else if (wrongCount === 3) grade = 'D';
      else if (wrongCount === 4) grade = 'E';

      resultBox.textContent = `Bạn đã hoàn thành! Sai ${wrongCount} lần. Điểm: ${grade}`;
      resultBox.style.display = 'block';
    }

    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    levelSelect.addEventListener('change', () => {
      loadData(levelSelect.value);
    });

    loadData(levelSelect.value);