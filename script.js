// 台北時區 → 產生 YYYY-MM-DD
const TIME_ZONE = 'Asia/Taipei';
function getDateStr() {
  const urlDate = new URLSearchParams(window.location.search).get('date');
  if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return formatter.format(now); // 例如 2025-10-28
}

// 你的 User Pages 根目錄下的每日資料夾
const BASE_PATH = '/daily-fill-in/daily';

let questionData = null;
let questionImgUrl = '';
let answerImgUrl = '';

function disableOptions() {
  document.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = true; });
}

function clearUI() {
  const nextButton = document.getElementById("next");
  nextButton.disabled = true;
  nextButton.style.display = "none";
  document.getElementById("feedback").textContent = "";
  document.getElementById("options").innerHTML = "";
  document.getElementById("answer").style.display = "none";
  document.getElementById("submission").style.display = "none";
  const qImg = document.getElementById("questionImage");
  qImg.style.display = "none"; qImg.removeAttribute('src');
  const aImg = document.getElementById("answerImage");
  aImg.removeAttribute('src');
}

async function fetchDaily(dateStr) {
  const folder = `${BASE_PATH}/${dateStr}`;

  // 用絕對路徑（同源）
  const metaUrl = `${folder}/meta.json`;
  const qUrl    = `${folder}/question.png?v=${dateStr}`;
  const aUrl    = `${folder}/answer.png?v=${dateStr}`;

  // 讓你在畫面上看到實際嘗試的 URL
  document.getElementById('dateInfo').innerHTML =
    `題目日期：${dateStr}（台北時區）｜嘗試載入：${metaUrl}${metaUrl}</a>`;

  const metaResp = await fetch(metaUrl, { cache: 'no-cache' });
  if (!metaResp.ok) throw new Error(`找不到 meta.json（HTTP ${metaResp.status}）@ ${metaUrl}`);

  // 允許 {options, correct} 與 {question:{...}} 兩種結構
  const metaRaw = await metaResp.json();
  const meta = metaRaw.question ?? metaRaw;
  if (!meta || !Array.isArray(meta.options) || typeof meta.correct !== 'string') {
    throw new Error('meta.json 結構不完整，需要 { options: [...], correct: "..." } 或 { question: {...} }');
  }

  questionData   = meta;
  questionImgUrl = qUrl;
  answerImgUrl   = aUrl;

  if (typeof meta.word === 'string' && meta.word.trim()) {
    document.getElementById("wordOfDay").value = meta.word.trim();
  }
  const title = typeof meta.title === 'string' ? meta.title : 'Daily Fill in the Blanks';
  document.getElementById('dateInfo').innerHTML += `｜${title}`;
}

function renderQuestionImage() {
  const img = document.getElementById("questionImage");
  img.src = questionImgUrl;
  img.style.display = "block";
}

function renderOptions() {
  const optionsDiv = document.getElementById("options");
  const nextButton = document.getElementById("next");
  optionsDiv.innerHTML = "";

  questionData.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.className = `option-btn option-btn-${index + 1}`;
    btn.onclick = () => {
      if (option === questionData.correct) {
        btn.classList.add("correct");
        document.getElementById("feedback").textContent = "✅ Correct!";
        disableOptions();
        nextButton.disabled = false;
        nextButton.style.display = "block";
        document.getElementById("answerImage").src = answerImgUrl;
        document.getElementById("answer").style.display = "block";
      } else {
        btn.classList.add("incorrect");
        document.getElementById("feedback").textContent = "❌ Wrong. Try again.";
        btn.disabled = true;
      }
    };
    optionsDiv.appendChild(btn);
  });
}

function initNextButton() {
  document.getElementById("next").onclick = () => {
    document.getElementById("submission").style.display = "block";
  };
}

function initSubmission() {
  document.getElementById("submit").onclick = () => {
    const id = document.getElementById("idNumber").value.trim();
    const word = document.getElementById("wordOfDay").value.trim();
    const status = document.getElementById("submitFeedback");
    if (!/^\d+$/.test(id)) { status.textContent = "❗ 請輸入正確的數字員工號"; return; }
    if (!/^[a-zA-Z]+$/.test(word)) { status.textContent = "❗ 請輸入正確的英文單字"; return; }

    status.textContent = "⏳ Submitting...";
    const submitBtn = document.getElementById("submit");
    submitBtn.disabled = true;

    fetch("https://script.google.com/macros/s/AKfycbxN_QRhW6F7ogSh_twhLlfMZNbSyGlzip3AmhiWHt1wJ0It4fReU53RJ5Ub5w_nWTLE/exec", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `id=${encodeURIComponent(id)}&word=${encodeURIComponent(word)}`
    })
    .then(r => r.json())
    .then(data => {
      status.textContent = data.message;
      submitBtn.disabled = data.status === 'success';
    })
    .catch(err => {
      console.error("Submission error:", err);
      status.textContent = "❌ Submission failed. Check console for details.";
      submitBtn.disabled = false;
    });
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  clearUI();
  initNextButton();
  initSubmission();
  const dateStr = getDateStr();
  try {
    await fetchDaily(dateStr);
    renderQuestionImage();
    renderOptions();
  } catch (err) {
    console.error(err);
    document.getElementById('dateInfo').innerHTML =
      `題目日期：${dateStr}（台北時區）｜今日資料尚未上架或路徑錯誤`;
    document.getElementById("feedback").textContent =
      "⚠️ 無法載入今日題目，請確認 meta.json 是否已發佈且語法正確。";
  }
});
