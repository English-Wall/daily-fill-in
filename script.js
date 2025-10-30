/**
 * 獲取台北時區的當前日期字串 (YYYY-MM-DD)
 */
function getTaipeiDateString() {
  // 使用 Intl.DateTimeFormat 'en-CA' (加拿大) 格式來獲取 YYYY-MM-DD 格式
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // 返回 "YYYY-MM-DD"
}

/**
 * 禁用所有選項按鈕
 */
function disableOptions() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
  });
}

/**
 * 異步加載當天的題目
 */
async function loadQuestion() {
  const nextButton = document.getElementById("next");
  const questionDiv = document.getElementById("question");
  const optionsDiv = document.getElementById("options");
  const feedbackDiv = document.getElementById("feedback");

  // 1. 初始化UI
  nextButton.disabled = true;
  nextButton.style.display = "none";
  feedbackDiv.textContent = "";
  optionsDiv.innerHTML = ""; // 清空舊選項
  questionDiv.innerHTML = "<p>Loading today's question...</p>"; // 提示加載中

  let dateString;
  try {
    dateString = getTaipeiDateString(); // e.g., "2025-10-28"
  } catch (e) {
    console.error("Error getting Taipei date:", e);
    questionDiv.innerHTML = "<p style='color: red;'>Error getting current date.</p>";
    return;
  }

  // 2. 定義今天題目的資源路徑
  const questionJsonPath = `${dateString}/question.json`;
  const questionImgPath = `${dateString}/question.png`;
  const answerImgPath = `${dateString}/answer.png`;

 
  try {
    // 3. 獲取 question.json
    const response = await fetch(questionJsonPath);
    if (!response.ok) {
      // 如果 fetch 失敗 (例如 404 Not Found)
      throw new Error(`Cannot find question file: ${response.statusText}`);
    }
    const question = await response.json(); // 解析 JSON

    // 4. 載入問題圖片
    questionDiv.innerHTML = `
      <img src="${questionImgPath}" alt="Question Image" style="max-width: 100%; height: auto;">
    `;

    // 5. 渲染選項按鈕
    question.options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.className = `option-btn option-btn-${index + 1}`;
      
      btn.onclick = () => {
        if (option === question.correct) {
          // 答對
          btn.classList.add("correct");
          feedbackDiv.textContent = "✅ Correct!";
          disableOptions();
          nextButton.disabled = false;
          nextButton.style.display = "block";
          // 顯示答案圖片
          questionDiv.innerHTML = `
            <img src="${answerImgPath}" alt="Answer Image" style="max-width: 100%; height: auto;">
          `;
        } else {
          // 答錯
          btn.classList.add("incorrect");
          feedbackDiv.textContent = "❌ Wrong. Try again.";
          btn.disabled = true; // 禁用錯誤的選項
        }
      };
      optionsDiv.appendChild(btn);
    });

  } catch (error) {
    // 6. 處理加載錯誤
    console.error("Error loading question:", error);
    questionDiv.innerHTML = `<p style="color: red; font-weight: bold;">今日題目載入失敗或尚無題目。</p><p>(${dateString})</p>`;
    optionsDiv.innerHTML = "";
  }
}

// --- 提交邏輯 (保持不變) ---

document.getElementById("next").onclick = () => {
  document.getElementById("submission").style.display = "block";
};

document.getElementById("submit").onclick = () => {
  const id = document.getElementById("idNumber").value.trim();
  const word = document.getElementById("wordOfDay").value.trim();
  const status = document.getElementById("submitFeedback");

  // 驗證 ID 是否為數字
  if (!/^\d+$/.test(id)) {
    status.textContent = "❗ 請輸入正確的數字員工號";
    return;
  }

  // 驗證 word 是否為英文字母
  if (!/^[a-zA-Z]+$/.test(word)) {
    status.textContent = "❗ 請輸入正確的英文單字";
    return;
  }

 status.textContent = "⏳Submitting...";
  document.getElementById("submit").disabled = true; // 先禁用按鈕防止重複提交

  fetch("https://script.google.com/macros/s/AKfycbxN_QRhW6F7ogSh_twhLlfMZNbSyGlzip3AmhiWHt1wJ0It4fReU53RJ5Ub5w_nWTLE/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `id=${encodeURIComponent(id)}&word=${encodeURIComponent(word)}`
  })
  .then(response => response.json()) // 解析從 Apps Script 回傳的 JSON
  .then(data => {
    status.textContent = data.message; // 顯示從後端傳來的訊息
    if (data.status === 'success') {
      document.getElementById("submit").disabled = true; // 成功後保持禁用
    } else {
      document.getElementById("submit").disabled = false; // 失敗後重新啟用按鈕
    }
  })
  .catch((error) => {
    console.error("Submission error:", error);
    status.textContent = "❌ Submission failed. Check console for details.";
    document.getElementById("submit").disabled = false; // 發生錯誤時也重新啟用按鈕
  });
};

// --- 頁面載入時執行 ---
loadQuestion();
