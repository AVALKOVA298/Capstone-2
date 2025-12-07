// --------- Tab navigation ----------
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(targetId);
      if (target) target.classList.add("active");
    });
  });

  setupPredictionForm();
  setupEDA();
});

// --------- Job Check logic ----------
function setupPredictionForm() {
  const form = document.getElementById("job-form");
  if (!form) return;

  const predictButton = document.getElementById("predict-button");
  const statusEl = document.getElementById("predict-status");
  const resultEl = document.getElementById("predict-result");
  const messageEl = document.getElementById("predict-message");
  const probEl = document.getElementById("predict-prob");
  const errorEl = document.getElementById("predict-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    resultEl.classList.add("hidden");

    const formData = new FormData(form);

    const title = (formData.get("title") || "").toString().trim();
    const company_profile = (formData.get("company_profile") || "").toString().trim();
    const description = (formData.get("description") || "").toString().trim();
    const requirements = (formData.get("requirements") || "").toString().trim();
    const benefits = (formData.get("benefits") || "").toString().trim();
    const location = (formData.get("location") || "").toString().trim();
    const salary_range = (formData.get("salary_range") || "").toString().trim();
    const employment_type = (formData.get("employment_type") || "").toString().trim();
    const industry = (formData.get("industry") || "").toString().trim();

    const full_text = [
      title,
      company_profile,
      description,
      requirements,
      benefits,
      location,
      salary_range,
      employment_type,
      industry
    ].join(" ");

    const payload = { full_text };

    predictButton.disabled = true;
    statusEl.textContent = "Sending request...";

    try {
      // TODO: замени "/predict" на URL твоего бэкенда, например:
      // const response = await fetch("https://your-backend.com/predict", { ... })
      const response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Server returned status " + response.status);
      }

      const data = await response.json();

      const proba =
        typeof data.fraud_proba === "number"
          ? data.fraud_proba
          : typeof data.probability === "number"
          ? data.probability
          : typeof data.fraud_probability === "number"
          ? data.fraud_probability
          : null;

      if (proba === null || isNaN(proba)) {
        throw new Error("Unexpected response format");
      }

      const fraudProba = Math.min(Math.max(proba, 0), 1);
      const fraudPct = (fraudProba * 100).toFixed(1);
      const legitPct = (100 - fraudProba * 100).toFixed(1);

      resultEl.classList.remove("hidden", "success", "danger");

      if (fraudProba < 0.5) {
        resultEl.classList.add("success");
        messageEl.textContent = "This job posting appears legitimate.";
      } else {
        resultEl.classList.add("danger");
        messageEl.textContent = "Warning: high fraud probability.";
      }

      probEl.textContent =
        "Fraud probability: " +
        fraudPct +
        "% · Legitimate probability: " +
        legitPct +
        "%";

          statusEl.textContent = "Prediction received.";
  } catch (err) {
    console.warn("Real backend not available, using demo prediction.", err);

    // -------- DEMO-РЕЖИМ: случайный прогноз --------
    const fakeProba = 0.02 + Math.random() * 0.83;

    showDemoResult(fakeProba, resultEl, messageEl, probEl, statusEl);
  } finally {
    predictButton.disabled = false;
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2000);
  }
});
}

// --------- EDA logic using eda_data.json ----------
let fraudChart = null;
let lengthChart = null;

function setupEDA() {
  const jsonPath = "data/eda_data.json";

  const edaError = document.getElementById("eda-error");
  const totalEl = document.getElementById("total-count");
  const realEl = document.getElementById("real-count");
  const fraudEl = document.getElementById("fraud-count");

  fetch(jsonPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("EDA json not found: " + response.status);
}
      return response.json();
    })
    .then((data) => {
            const stats = extractStats(data);

      if (totalEl) totalEl.textContent = stats.total.toLocaleString();
      if (realEl) realEl.textContent = stats.real.toLocaleString();
      if (fraudEl) fraudEl.textContent = stats.fraud.toLocaleString();

      renderFraudChart(stats.real, stats.fraud);
      renderLengthChart(stats.short, stats.medium, stats.long);
    })
    .catch((error) => {
      console.warn("EDA JSON load failed, using fallback:", error);

      if (edaError) {
        edaError.textContent =
          "Failed to load eda_data.json. Using fallback stats.";
        edaError.classList.remove("hidden");
      }

      const fallbackStats = {
        total: 27880,
        real: 17014,
        fraud: 10866,
        short: 5234,
        medium: 12456,
        long: 10190
      };

      if (totalEl) totalEl.textContent = fallbackStats.total.toLocaleString();
      if (realEl) realEl.textContent = fallbackStats.real.toLocaleString();
      if (fraudEl) fraudEl.textContent = fallbackStats.fraud.toLocaleString();

      renderFraudChart(fallbackStats.real, fallbackStats.fraud);
      renderLengthChart(
        fallbackStats.short,
        fallbackStats.medium,
        fallbackStats.long
      );
    });
}
function extractStats(data) {
  let total = 27880;
  let real = 17014;
  let fraud = 10866;
  let short = 5234;
  let medium = 12456;
  let long = 10190;

  if (data && typeof data === "object") {
    if (data.summary && typeof data.summary.total_count === "number") {
      total = data.summary.total_count;
    }
    if (data.summary && typeof data.summary.real_count === "number") {
      real = data.summary.real_count;
    }
    if (data.summary && typeof data.summary.fraud_count === "number") {
      fraud = data.summary.fraud_count;
    }
    if (data.length_stats && typeof data.length_stats.short === "number") {
      short = data.length_stats.short;
    }
    if (data.length_stats && typeof data.length_stats.medium === "number") {
      medium = data.length_stats.medium;
    }
    if (data.length_stats && typeof data.length_stats.long === "number") {
      long = data.length_stats.long;
    }
    if (!data.summary && data.fraudulent) {
      const r = Number(data.fraudulent["0"]);
      const f = Number(data.fraudulent["1"]);
      if (!isNaN(r) && !isNaN(f)) {
        real = r;
        fraud = f;
        total = r + f;
      }
    }
  }

  return { total, real, fraud, short, medium, long };
}
function renderFraudChart(realCount, fraudCount) {
  const ctx = document.getElementById("fraud-chart");
  if (!ctx || typeof Chart === "undefined") return;

  if (window.fraudChart) window.fraudChart.destroy();

  window.fraudChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Legitimate (0)", "Fraudulent (1)"],
      datasets: [
        {
          data: [realCount, fraudCount],
          backgroundColor: ["#22c55e", "#f97373"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" }
        },
        y: {
          ticks: { color: "#9ca3af", precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function renderLengthChart(shortCount, mediumCount, longCount) {
  const ctx = document.getElementById("length-chart");
  if (!ctx || typeof Chart === "undefined") return;

  if (window.lengthChart) window.lengthChart.destroy();

  window.lengthChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Short (<300)", "Medium (300–800)", "Long (>800)"],
      datasets: [
        {
          data: [shortCount, mediumCount, longCount],
          backgroundColor: ["#38bdf8", "#0ea5e9", "#0369a1"],
          borderWidth: 0
        }
      ]
    },
    options: {
responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
                x: {
          ticks: { color: "#9ca3af" }
        },
        y: {
          ticks: { color: "#9ca3af", precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}
