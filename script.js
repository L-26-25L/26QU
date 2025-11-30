//---------------------------------------------------
//  التخزين المحلي + استرجاع
//---------------------------------------------------
const STORAGE_KEY = "myGradesData_v1";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { courses: [], aPlusThreshold: 90 };
  try {
    return JSON.parse(raw);
  } catch {
    return { courses: [], aPlusThreshold: 90 };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();

//---------------------------------------------------
// عناصر DOM
//---------------------------------------------------
const coursesList = document.getElementById("coursesList");
const btnMyGrade = document.getElementById("btnMyGrade");

const dashboard = document.getElementById("dashboard");
const courseSection = document.getElementById("courseSection");

const courseTitle = document.getElementById("courseTitle");
const courseSub = document.getElementById("courseSub");
const courseTable = document.getElementById("courseTable").querySelector("tbody");

const courseTermWork = document.getElementById("courseTermWork");
const coursePercent = document.getElementById("coursePercent");
const courseAPlusNote = document.getElementById("courseAPlusNote");

const termWorkValue = document.getElementById("termWorkValue");
const aplusPercent = document.getElementById("aplusPercent");
const aplusGap = document.getElementById("aplusGap");

//---------------------------------------------------
//  تحديث القائمة اليسار
//---------------------------------------------------
function renderCourseButtons() {
  coursesList.innerHTML = "";
  state.courses.forEach((c, idx) => {
    const btn = document.createElement("button");
    btn.className = "menu-item";
    btn.innerHTML = `<span class="menu-dot"></span> <span>${c.name}</span>`;
    btn.onclick = () => openCourse(idx);
    coursesList.appendChild(btn);
  });
}

renderCourseButtons();

//---------------------------------------------------
//  العرض – لوحة التحكم
//---------------------------------------------------
let bestQuizChart = null;
let compareChart = null;

function updateDashboard() {
  if (!state.courses.length) return;

  const labels = [];
  const bestQuizValues = [];
  const compareValues = [];

  state.courses.forEach(course => {
    labels.push(course.name);

    // أفضل كويز
    const quizzes = course.items.filter(i => i.type === "quiz" && i.obtained >= 0);
    const best = quizzes.length
      ? Math.max(...quizzes.map(q => (q.obtained / q.total) * 100))
      : 0;
    bestQuizValues.push(best.toFixed(1));

    // نسبة المقرر
    const percent = calcCoursePercent(course);
    compareValues.push(percent.toFixed(1));
  });

  // Best Quiz Chart
  const ctx1 = document.getElementById("bestQuizzesChart");
  if (bestQuizChart) bestQuizChart.destroy();
  bestQuizChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "أفضل كويز",
        data: bestQuizValues
      }]
    },
    options: { responsive: true }
  });

  // Compare Chart
  const ctx2 = document.getElementById("compareChart");
  if (compareChart) compareChart.destroy();
  compareChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "النسبة",
        data: compareValues,
        tension: 0.3,
      }]
    },
    options: { responsive: true }
  });

  // أعمال الترم
  const avgTerm = averageTermWork();
  termWorkValue.innerText = `${avgTerm.toFixed(1)}%`;

  // A+
  const apInfo = nearestToAplus();
  if (apInfo) {
    aplusPercent.innerText = `${apInfo.best}%`;
    const gap = apInfo.minGap.toFixed(1);
    aplusGap.innerText = `${gap}% نقص عن ${state.aPlusThreshold}%`;
  }
}

updateDashboard();

//---------------------------------------------------
// حساب نسبة مقرر
//---------------------------------------------------
function calcCoursePercent(course) {
  let sumTotal = 0;
  let sumObt = 0;

  course.items.forEach(i => {
    sumTotal += i.total;
    sumObt += i.obtained > 0 ? i.obtained : 0;
  });

  if (sumTotal === 0) return 0;
  return (sumObt / sumTotal) * 100;
}

// متوسط أعمال الترم
function averageTermWork() {
  let count = 0;
  let sum = 0;
  state.courses.forEach(c => {
    const termItems = c.items.filter(i => i.type !== "final");
    if (termItems.length) {
      const t = termItems.reduce((a, b) => a + (b.obtained > 0 ? b.obtained : 0), 0);
      const tt = termItems.reduce((a, b) => a + b.total, 0);
      sum += (t / tt) * 100;
      count++;
    }
  });
  return count ? sum / count : 0;
}

// أقرب مقرر لـ A+
function nearestToAplus() {
  if (!state.courses.length) return null;
  let best = 0;
  let minGap = 999;

  state.courses.forEach(c => {
    const p = calcCoursePercent(c);
    const gap = state.aPlusThreshold - p;
    if (gap >= 0 && gap < minGap) {
      minGap = gap;
      best = p.toFixed(1);
    }
  });

  return { best, minGap };
}

//---------------------------------------------------
//  صفحة مقرر
//---------------------------------------------------
let currentCourseIndex = null;

function openCourse(idx) {
  currentCourseIndex = idx;
  const course = state.courses[idx];

  dashboard.classList.add("hidden");
  courseSection.classList.remove("hidden");

  courseTitle.innerText = course.name;
  courseSub.innerText = `تفاصيل الدرجات — ${course.items.length} بند`;

  renderCourseTable(course);
}

document.getElementById("backToDash").onclick = () => {
  courseSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  updateDashboard();
};

// جدول المقرر
function renderCourseTable(course) {
  courseTable.innerHTML = "";
  course.items.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.type}</td>
      <td>${item.title}</td>
      <td><input data-i="${i}" data-f="total" type="number" value="${item.total}"></td>
      <td><input data-i="${i}" data-f="obtained" type="number" value="${item.obtained}"></td>
    `;
    courseTable.appendChild(tr);
  });

  // تحديث البيانات عند التعديل
  courseTable.querySelectorAll("input").forEach(inp => {
    inp.oninput = () => {
      const idx = Number(inp.dataset.i);
      const field = inp.dataset.f;
      state.courses[currentCourseIndex].items[idx][field] = Number(inp.value);
    };
  });
}

//---------------------------------------------------
//  أزرار تحت صفحة المقرر
//---------------------------------------------------
document.getElementById("saveCourse").onclick = () => {
  saveData();
  alert("تم الحفظ");
};

document.getElementById("calcCourse").onclick = () => {
  const course = state.courses[currentCourseIndex];
  const p = calcCoursePercent(course).toFixed(1);

  coursePercent.innerText = `${p}%`;

  const gap = state.aPlusThreshold - p;
  if (gap <= 0) {
    courseAPlusNote.innerText = `أحسنتِ! وصلتي A+.`;
  } else {
    courseAPlusNote.innerText = `نقص ${gap.toFixed(1)}% للوصول إلى ${state.aPlusThreshold}% (A+)`;
  }

  const termItems = course.items.filter(i => i.type !== "final");
  if (termItems.length) {
    const t = termItems.reduce((a, b) => a + b.obtained, 0);
    const tt = termItems.reduce((a, b) => a + b.total, 0);
    courseTermWork.innerText = `${((t / tt) * 100).toFixed(1)}%`;
  } else {
    courseTermWork.innerText = "--";
  }
};

//---------------------------------------------------
//  استيراد / تصدير / مسح
//---------------------------------------------------
document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gradesBackup.json";
  a.click();
};

document.getElementById("importBtn").onclick = () => {
  document.getElementById("importFile").click();
};

document.getElementById("importFile").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state = JSON.parse(reader.result);
    saveData();
    renderCourseButtons();
    updateDashboard();
    alert("تم الاستيراد بنجاح");
  };
  reader.readAsText(file);
};

document.getElementById("clearBtn").onclick = () => {
  localStorage.removeItem(STORAGE_KEY);
  alert("تم حذف البيانات المخزنة محلياً");
  location.reload();
};
