/* =========================
 * Daily Fill-in Challenge
 * 前端依「Asia/Taipei」日期載入今日題目
 * 需要元素 ID：
 *   #qImg, #aImg, #options, #feedback, #next,
 *   #submission, #idNumber, #wordOfDay, #submit, #submitFeedback
 * ========================= */

(() => {
  // ====== 可調參數 ======
  const TIMEZONE = 'Asia/Taipei';
  const DAILY_ROOT = 'daily';              // 每日題目根資料夾
  const DEFAULT_PATH = `${DAILY_ROOT}/default`;
  const APPS_SCRIPT_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbxN_QRhW6F7ogSh_twhLlfMZNbSyGlzip3AmhiWHt1wJ0It4fReU53RJ5Ub5w_nWTLE/exec';

  // ====== 工具函式 ======
  function getTodayStr(tz = TIMEZONE) {
    // 以指定時區產生 YYYY-MM-DD
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return fmt.format(new Date()); // e.g., 2025-10-29
  }

  function verSuffix() {
    // 用日期+小時作為版本，避免快取
    const d = new Date();
    const v = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${d.getHours()}`;
    return `?v=${v}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  // ====== 每日題目載入 ======
  async function loadDailyMetaAndImages() {
    const dateStr = getTodayStr();         // 今日（Asia/Taipei）
    const base = `${DAILY_ROOT}/${dateStr}`;
    const metaUrl = `${base}/meta.json${verSuffix()}`;

    const qImgEl = document.getElementById('qImg');
    const aImgEl = document.getElementById('aImg');

    try {
      const meta = await fetchJson(metaUrl);

      // 設定今日題目的圖檔（加版本參數避免快取）
      qImgEl.src = `${base}/question.png${verSuffix()}`;
      aImgEl.src = `${base}/answer.png${verSuffix()}`;

      return { base, meta, dateStr };
    } catch (e) {
      // 後備：預設題目，避免當天沒準備資料時整頁壞掉
      console.warn('[Daily] fallback to default due to:', e.message);
      qImgEl.src = `${DEFAULT_PATH}/question.png${verSuffix()}`;
      aImgEl.src = `${DEFAULT_PATH}/answer.png${verSuffix()}`;

      // 一組安全的預設 meta
      const fallbackMeta = {
        correct: 'bubbles',
        options: ['particles', 'bubbles', 'blisters', 'drops'],
      };
      return { base: DEFAULT_PATH, meta: fallbackMeta, dateStr };
    }
  }

  // ====== UI 與互動 ======
  function disableOptions() {
    document.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = true; });
  }

  async function loadQuestion() {
    const nextButton = document.getElementById('next');
    const feedback = document.getElementById('feedback');
    const optionsDiv = document.getElementById('options');
    const qImg = document.getElementById('qImg');
    const aImg = document.getElementById('aImg');

    // 初始狀態
    nextButton.disabled = true;
    nextButton.style.display = 'none';
    feedback.textContent = '';
    aImg.style.display = 'none';
    qImg.style.display = 'block';
    optionsDiv.innerHTML = '';

    // 取得每日 meta
    const { meta } = await loadDailyMetaAndImages();
    const { correct, options } = meta;

    // 產生選項按鈕
    options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.className = `option-btn option-btn-${index + 1}`;
      btn.type = 'button';

      btn.onclick = () => {
        if (option === correct) {
          btn.classList.add('correct');
          feedback.textContent = '✅ Correct!';
          disableOptions();

          // 顯示答案圖與 Next
          qImg.style.display = 'none';
          aImg.style.display = 'block';
          nextButton.disabled = false;
          nextButton.style.display = 'block';
        } else {
          btn.classList.add('incorrect');
          feedback.textContent = '❌ Wrong. Try again.';
          btn.disabled = true;
        }
      };

      optionsDiv.appendChild(btn);
    });
  }

  function wireSubmission() {
    const nextButton = document.getElementById('next');
    const submission = document.getElementById('submission');
    const submitBtn = document.getElementById('submit');
    const feedbackEl = document.getElementById('submitFeedback');
    const idInput = document.getElementById('idNumber');
    const wordInput = document.getElementById('wordOfDay');

    // 顯示提交區
    nextButton.onclick = () => {
      submission.style.display = 'block';
      idInput?.focus?.();
    };

    // 送出到 Apps Script
    submitBtn.onclick = () => {
      const id = (idInput.value || '').trim();
      const word = (wordInput.value || '').trim();

      // 驗證欄位
      if (!/^\d+$/.test(id)) {
        feedbackEl.textContent = '❗ 請輸入正確的數字員工號';
        return;
      }
      if (!/^[a-zA-Z]+$/.test(word)) {
        feedbackEl.textContent = '❗ 請輸入正確的英文單字';
        return;
      }

      feedbackEl.textContent = '⏳ Submitting...';
      submitBtn.disabled = true;

      fetch(APPS_SCRIPT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${encodeURIComponent(id)}&word=${encodeURIComponent(word)}`,
      })
        .then(r => r.json())
        .then(data => {
          feedbackEl.textContent = data.message || 'Submitted.';
          // 成功則維持 disabled；失敗再開啟讓使用者重試
          submitBtn.disabled = data.status === 'success';
          if (data.status !== 'success') submitBtn.disabled = false;
        })
        .catch(err => {
          console.error('Submission error:', err);
          feedbackEl.textContent = '❌ Submission failed. Check console for details.';
          submitBtn.disabled = false;
        });
    };
  }

  // ====== 啟動 ======
  document.addEventListener('DOMContentLoaded', () => {
    wireSubmission();
    loadQuestion();
  });
})();
