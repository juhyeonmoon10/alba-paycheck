const MINIMUM_WAGE_2026 = 10320;
const WEEKS_PER_MONTH = 4.345;

const currency = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function won(value) {
  return currency.format(Math.max(0, Math.round(Number(value) || 0))).replace("₩", "") + "원";
}

function toast(message) {
  const node = qs("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => node.classList.remove("show"), 2500);
}

function openTool(name) {
  qsa(".tool-tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  qsa(".tool-panel").forEach((panel) => {
    const active = panel.dataset.panel === name;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  scrollToNode(qs("#workspace"), "start");
}

function scrollToNode(node, block = "center") {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("motion-off");
  node.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block });
}

qsa(".tool-tab").forEach((tab) => tab.addEventListener("click", () => openTool(tab.dataset.tab)));
qsa("[data-open-tool]").forEach((button) => button.addEventListener("click", () => openTool(button.dataset.openTool)));

function syncWorkerType() {
  const workerType = qs('input[name="workerType"]:checked').value;
  qsa(".choice-card").forEach((card) => card.classList.toggle("selected", qs("input", card).checked));
  qsa(".youth-only").forEach((node) => { node.hidden = workerType !== "youth"; });
  qsa(".foreign-only").forEach((node) => { node.hidden = workerType !== "foreign"; });
}

qsa('input[name="workerType"]').forEach((input) => input.addEventListener("change", syncWorkerType));
syncWorkerType();

function formValues() {
  return {
    workerType: qs('input[name="workerType"]:checked').value,
    workerName: qs("#workerName").value.trim() || "근로자",
    employerName: qs("#employerName").value.trim() || "사업주",
    workplace: qs("#workplace").value.trim() || "협의한 장소",
    job: qs("#job").value.trim() || "협의한 업무",
    startDate: qs("#startDate").value,
    endDate: qs("#endDate").value,
    hourlyWage: Number(qs("#hourlyWage").value),
    daysPerWeek: Number(qs("#daysPerWeek").value),
    hoursPerDay: Number(qs("#hoursPerDay").value),
    breakMinutes: Number(qs("#breakMinutes").value),
    payday: Number(qs("#payday").value),
    language: qs("#language").value,
    writtenContract: qs("#writtenContract").checked,
    guardianConsent: qs("#guardianConsent").checked,
    workEligibility: qs("#workEligibility").checked,
  };
}

function expectedPay(hourlyWage, daysPerWeek, hoursPerDay, weeks = WEEKS_PER_MONTH) {
  const weeklyHours = daysPerWeek * hoursPerDay;
  const base = hourlyWage * weeklyHours * weeks;
  const holidayHoursPerWeek = weeklyHours >= 15 ? Math.min(8, weeklyHours / 5) : 0;
  const holiday = hourlyWage * holidayHoursPerWeek * weeks;
  return { weeklyHours, base, holiday, total: base + holiday, holidayHoursPerWeek };
}

function addCheck(list, level, title, description) {
  list.push({ level, title, description });
}

function validateContract(data) {
  const checks = [];
  const weeklyHours = data.daysPerWeek * data.hoursPerDay;
  const requiredBreak = data.hoursPerDay >= 8 ? 60 : data.hoursPerDay >= 4 ? 30 : 0;

  if (data.hourlyWage >= MINIMUM_WAGE_2026) {
    addCheck(checks, "good", "2026년 최저임금 이상이에요", `입력 시급 ${won(data.hourlyWage)}은 2026년 최저임금 ${won(MINIMUM_WAGE_2026)} 이상입니다.`);
  } else {
    addCheck(checks, "danger", "시급을 다시 확인하세요", `입력 시급이 2026년 최저임금 ${won(MINIMUM_WAGE_2026)}보다 낮습니다.`);
  }

  if (data.breakMinutes >= requiredBreak) {
    addCheck(checks, "good", "휴게시간을 확인했어요", requiredBreak ? `${data.hoursPerDay}시간 근무 입력 기준 휴게시간 ${requiredBreak}분 이상으로 입력했습니다.` : "4시간 미만 근무로 입력했습니다.");
  } else {
    addCheck(checks, "danger", "휴게시간이 부족할 수 있어요", `${data.hoursPerDay}시간 근무 입력 기준 최소 ${requiredBreak}분 이상인지 확인하세요.`);
  }

  if (data.writtenContract) {
    addCheck(checks, "good", "계약서 교부를 확인했어요", "근로조건이 적힌 서면 또는 전자문서를 근로자가 받을 수 있도록 보관하세요.");
  } else {
    addCheck(checks, "warn", "계약서를 꼭 받아야 해요", "작성만 하지 말고 근로자가 내려받거나 전달받아 보관해야 합니다.");
  }

  if (weeklyHours >= 15) {
    addCheck(checks, "warn", "주휴수당 적용 여부를 확인하세요", `주 ${weeklyHours}시간으로 입력했습니다. 개근 등 요건을 충족하는지 함께 확인해야 합니다.`);
  } else {
    addCheck(checks, "good", "주 근로시간을 계산했어요", `입력한 소정근로시간은 주 ${weeklyHours}시간입니다.`);
  }

  if (data.workerType === "youth") {
    if (data.hoursPerDay <= 7 && weeklyHours <= 35) {
      addCheck(checks, "good", "청소년 기본 근로시간 범위예요", "하루 7시간·주 35시간 이내로 입력했습니다. 연장근로 등은 별도 요건을 확인하세요.");
    } else {
      addCheck(checks, "danger", "청소년 근로시간을 다시 확인하세요", "원칙적인 하루 7시간·주 35시간 범위를 넘는지 확인이 필요합니다.");
    }
    if (data.guardianConsent) {
      addCheck(checks, "good", "친권자·후견인 동의서를 준비했어요", "동의서는 근로계약서와 구분해 사업장에서 보관하도록 안내하세요.");
    } else {
      addCheck(checks, "warn", "보호자 동의서 준비 여부를 확인하세요", "18세 미만 근로자는 연령증명서류와 친권자·후견인 동의서가 필요할 수 있습니다.");
    }
  }

  if (data.workerType === "foreign") {
    addCheck(checks, data.language !== "ko" ? "good" : "warn", "이해 가능한 언어로 확인하세요", data.language !== "ko" ? "선택한 언어의 핵심요약을 계약서 미리보기에 함께 표시합니다." : "중요 근로조건을 근로자가 가장 잘 이해하는 언어로 다시 설명해 주세요.");
    addCheck(checks, data.workEligibility ? "good" : "warn", "체류자격과 취업 가능 업종을 확인하세요", data.workEligibility ? "공식 경로에서 취업 가능 여부를 확인한 것으로 입력했습니다." : "비자 종류에 따라 취업 가능한 업종이 다를 수 있으므로 고용센터·EPS 등 공식 경로에서 확인하세요.");
  }

  const penalty = { good: 0, warn: 9, danger: 18 };
  const score = Math.max(0, 100 - checks.reduce((sum, check) => sum + penalty[check.level], 0));
  return { checks, score };
}

function renderChecks(checks) {
  const icon = { good: "✓", warn: "!", danger: "!" };
  qs("#checkList").innerHTML = checks.map((check) => `
    <article class="check-item ${check.level}">
      <span class="check-icon">${icon[check.level]}</span>
      <div><h4>${check.title}</h4><p>${check.description}</p></div>
    </article>`).join("");
}

qs("#contractForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const data = formValues();
  const { checks, score } = validateContract(data);
  const pay = expectedPay(data.hourlyWage, data.daysPerWeek, data.hoursPerDay);
  renderChecks(checks);
  qs("#safetyScore").textContent = score;
  qs("#resultTitle").textContent = score >= 85 ? "대체로 잘 준비됐어요" : score >= 65 ? "확인할 항목이 있어요" : "계약조건을 다시 살펴보세요";
  qs("#monthlyEstimate").textContent = won(pay.total);
  qs("#weeklyDetail").textContent = `기본급 ${won(pay.base)}${pay.holiday ? ` + 주휴수당 추정 ${won(pay.holiday)}` : ""}`;
  qs("#contractResult").hidden = false;
  qs("#contractPreview").hidden = true;
  scrollToNode(qs("#contractResult"));
});

function formatDate(dateString) {
  if (!dateString) return "정하지 않음";
  const [year, month, day] = dateString.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function renderContract() {
  const data = formValues();
  qs("#paperEmployer").textContent = data.employerName;
  qs("#paperWorker").textContent = data.workerName;
  qs("#paperPeriod").textContent = `${formatDate(data.startDate)}부터 ${data.endDate ? formatDate(data.endDate) + "까지" : "기간의 정함 없음"}`;
  qs("#paperPlace").textContent = data.workplace;
  qs("#paperJob").textContent = data.job;
  qs("#paperHours").textContent = `주 ${data.daysPerWeek}일, 1일 ${data.hoursPerDay}시간, 휴게 ${data.breakMinutes}분`;
  qs("#paperWage").textContent = `시간급 ${won(data.hourlyWage)}`;
  qs("#paperPayday").textContent = `매월 ${data.payday}일 (지급방법은 당사자 간 확인)`;
  qs("#paperDate").textContent = formatDate(new Date().toISOString().slice(0, 10));
  qs("#signEmployer").textContent = data.employerName;
  qs("#signWorker").textContent = data.workerName;
  qs("#guardianSheet").hidden = data.workerType !== "youth";
  const translated = data.language !== "ko";
  qs("#englishSummary").hidden = !translated;
  const summaries = {
    en: {
      title: "Key terms in English",
      text: `Worker: ${data.workerName} · Employer: ${data.employerName} · Workplace: ${data.workplace} · Job: ${data.job} · Hourly wage: KRW ${Math.round(data.hourlyWage).toLocaleString("en-US")} · Work: ${data.daysPerWeek} day(s) per week, ${data.hoursPerDay} hour(s) per day · Payday: day ${data.payday} of each month.`,
    },
    vi: {
      title: "Điều kiện lao động chính bằng tiếng Việt",
      text: `Người lao động: ${data.workerName} · Người sử dụng lao động: ${data.employerName} · Nơi làm việc: ${data.workplace} · Công việc: ${data.job} · Lương theo giờ: ${Math.round(data.hourlyWage).toLocaleString("vi-VN")} KRW · Làm việc: ${data.daysPerWeek} ngày/tuần, ${data.hoursPerDay} giờ/ngày · Ngày trả lương: ngày ${data.payday} hàng tháng.`,
    },
    zh: {
      title: "中文主要劳动条件",
      text: `劳动者：${data.workerName} · 用人单位：${data.employerName} · 工作地点：${data.workplace} · 工作内容：${data.job} · 时薪：${Math.round(data.hourlyWage).toLocaleString("zh-CN")}韩元 · 工作时间：每周${data.daysPerWeek}天、每天${data.hoursPerDay}小时 · 工资支付日：每月${data.payday}日。`,
    },
  };
  const summary = summaries[data.language] || summaries.en;
  qs("#summaryLanguageTitle").textContent = summary.title;
  qs("#englishText").textContent = summary.text;
  qs("#contractPreview").hidden = false;
  scrollToNode(qs("#contractPreview"), "start");
}

qs("#makeContract").addEventListener("click", renderContract);
qs("#printContract").addEventListener("click", () => window.print());

qs("#resetContract").addEventListener("click", () => {
  qs("#contractForm").reset();
  qs('input[name="workerType"][value="youth"]').checked = true;
  qs("#daysPerWeek").value = 5;
  qs("#hoursPerDay").value = 4;
  qs("#breakMinutes").value = 30;
  qs("#contractResult").hidden = true;
  qs("#contractPreview").hidden = true;
  syncWorkerType();
  toast("입력내용을 초기화했어요.");
});

qs("#loadExample").addEventListener("click", () => {
  const date = new Date();
  qs("#workerName").value = "김하늘";
  qs("#employerName").value = "안심카페";
  qs("#workplace").value = "서울시 마포구 월드컵로 10";
  qs("#job").value = "음료 제조 및 매장 정리";
  qs("#startDate").value = date.toISOString().slice(0, 10);
  qs("#hourlyWage").value = 11000;
  qs("#daysPerWeek").value = 4;
  qs("#hoursPerDay").value = 4;
  qs("#breakMinutes").value = 30;
  qs("#payday").value = 10;
  qs("#writtenContract").checked = true;
  qs("#guardianConsent").checked = false;
  qs("#workEligibility").checked = false;
  toast("발표용 예시를 불러왔어요.");
});

qs("#wageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const hourly = Number(qs("#calcHourly").value);
  const days = Number(qs("#calcDays").value);
  const hours = Number(qs("#calcHours").value);
  const weeks = Number(qs("#calcWeeks").value);
  const actualRaw = qs("#actualPay").value;
  const pay = expectedPay(hourly, days, hours, weeks);
  qs("#expectedPay").textContent = won(pay.total);
  qs("#basePay").textContent = won(pay.base);
  qs("#holidayPay").textContent = pay.holiday ? won(pay.holiday) : "적용 여부 확인";
  if (actualRaw === "") {
    qs("#payDifference").textContent = "실제 수령액 입력 전";
    qs("#payDifference").style.color = "";
  } else {
    const difference = Number(actualRaw) - pay.total;
    qs("#payDifference").textContent = difference >= 0 ? `${won(difference)} 더 받음` : `${won(Math.abs(difference))} 부족 가능`;
    qs("#payDifference").style.color = difference >= 0 ? "var(--success)" : "var(--danger)";
  }
  qs("#wageResult").hidden = false;
  scrollToNode(qs("#wageResult"));
});

qsa(".demo-button").forEach((button) => button.addEventListener("click", () => toast("이 기능은 현재 화면만 구현된 확장 예정 기능입니다.")));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") qs("#toast").classList.remove("show");
});
