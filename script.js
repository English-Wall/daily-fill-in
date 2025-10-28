// 台北時區
const TIME_ZONE = 'Asia/Taipei';

// 可用 URL 參數覆寫日期（測試用）：?date=2025-10-28
function getDateStr() {
  const urlDate = new URLSearchParams(window.location.search).get('date');
  if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;

  // 以台北時區產生 YYYY-MM-DD
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // e.g., 2025-10-28
}

// 每日資料根目錄（相對路徑）
const BASE_PATH = 'daily-fill-in/daily';

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
  qImg.style.display = "none";
  qImg.removeAttribute('src');

  const aImg = document.getElementById("answerImage");
  aImg.removeAttribute('src');
}

async function fetchDaily(dateStr) {
  const folder = `${BASE_PATH}/${dateStr}`;
  const metaResp = await fetch(`${folder}/meta.json`, { cache: 'no-cache' });
  if (!metaResp.ok) throw new Error(`找不到 meta.json（${metaResp.status}）`);

  const meta = await metaResp.json();

  // 基本欄位驗證：需要 options 與 correct
  if (!meta || !Array.isArray(meta.options) || typeof meta.correct !== 'string') {
    throw new Error('meta.json 結構不完整，需要 { options: [...], correct: "..." }');
  }

  questionData = meta;
  questionImgUrl = `${folder}/question.png?v=${dateStr}`; // 每日不同路徑已足夠避免快取，附加 v 作保險
  answerImgUrl = `${folder}/answer.png?v=${dateStr}`;

  // 如果 meta 有提供 word，可預填到 input
  if (typeof meta.word === 'string') {
    const w = meta.word.trim();
    if (w) document.getElementById("wordOfDay").value = w;
  }

  // 題目標題（選用）
  const dateInfo = document.getElementById('dateInfo');
  const title = typeof meta.title === 'string' ? meta.title : 'Daily Fill in the Blanks';
  dateInfo.textContent = `題目日期：${dateStr}（台北時區）｜${title}`;
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

  // 產生按鈕
  questionData.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.className = `option-btn option-btn-${index + 1}`;

    btn.onclick = () => {
      if (option === questionData.correct) {
        btn.classList.add("correct");
        document.getElementById("feedback").textContent = "✅ Correct!";
        disableOptions();

        // 顯示下一步按鈕
        nextButton.disabled = false;
        nextButton.style.display = "block";

        // 換成答案圖
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
    // 顯示送出表單
    document.getElementById("submission").style.display = "block";
  };
}

function initSubmission() {
  document.getElementById("submit").onclick = () => {
    const id = document.getElementById("idNumber").value.trim();
    const word = document.getElementById("wordOfDay").value.trim();
    const status = document.getElementById("submitFeedback");

    // 驗證 ID 是否為數字
    if (!/^\d+$/.test(id)) {
      status.textContent = "❗ 請輸入正確的數字員工號";
      return;
    }
    // 驗證英文字
    if (!/^[a-zA-Z]+$/.test(word)) {
      status.textContent = "❗ 請輸入正確的英文單字";
      return;
    }

    status.textContent = "⏳ Submitting...";
    const submitBtn = document.getElementById("submit");
    submitBtn.disabled = true; // 先禁用按鈕避免重複提交

    // 保留你原本的 Apps Script 端點
    fetch("https://script.google.com/macros/s/AKfycbxN_QRhW6F7ogSh_twhLlfMZNbSyGlzip3AmhiWHt1wJ0It4fReU53RJ5Ub5w_nWTLE/exec", {  // ← 你的原始端點
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `id=${encodeURIComponent(id)}&word=${encodeURIComponent(word)}`
    })
    .then(response => response.json())
    .then(data => {
      status.textContent = data.message;
      if (data.status === 'success') {
        submitBtn.disabled = true; // 成功後保持禁用
      } else {
        submitBtn.disabled = false; // 失敗後重新啟用
      }
    })
    .catch((error) => {
      console.error("Submission error:", error);
      status.textContent = "❌ Submission failed. Check console for details.";
      submitBtn.disabled = false;
    });
  };
}

// 入口函式
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
    // 失敗處理（例如當天資料夾尚未建立）
    document.getElementById('dateInfo').textContent =
      `題目日期：${dateStr}（台北時區）｜今日資料尚未上架或路徑錯誤`;
    document.getElementById("feedback").textContent =
      "⚠️ 無法載入今日題目，請稍後再試或確認資料夾與檔名。";
  }
});
``
