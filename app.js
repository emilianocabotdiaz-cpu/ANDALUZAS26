const state = {
  member: localStorage.getItem("opocompi-member") === "true",
  mode: "dudas",
};

const responses = {
  dudas:
    "Te lo explico paso a paso: identifica primero el concepto, luego memoriza la regla clave y termina con un ejemplo. Si quieres, te puedo convertir esta duda en 5 preguntas tipo test.",
  test:
    "Te preparo un test corto: 1) pregunta directa de concepto, 2) caso aplicado, 3) excepción, 4) artículo relacionado y 5) repaso de errores frecuentes.",
  animo:
    "Hoy no necesitas hacerlo perfecto. Necesitas sentarte, cumplir el bloque mínimo y salir con una victoria pequeña. La oposición se gana acumulando días útiles.",
  plan:
    "Plan sugerido: 45 minutos de temario, 20 preguntas tipo test, corrección activa y 10 minutos de repaso de fallos. Mañana empezamos por lo que hoy haya costado más.",
};

const sampleQuestions = {
  "Constitución Española": [
    "¿Qué valores superiores proclama el artículo 1.1 de la Constitución Española?",
    "¿Dónde reside la soberanía nacional según la Constitución?",
    "¿Qué forma política tiene el Estado español?",
  ],
  "Derecho Penal": [
    "¿Qué diferencia hay entre dolo directo y dolo eventual?",
    "¿Cuándo puede apreciarse tentativa en un delito?",
    "¿Qué finalidad tienen las penas privativas de derechos?",
  ],
  Extranjería: [
    "¿Qué situaciones administrativas puede tener una persona extranjera en España?",
    "¿Qué diferencia hay entre estancia y residencia?",
    "¿Qué autoridad puede iniciar un expediente sancionador en materia de extranjería?",
  ],
  Ortografía: [
    "Elige la forma correcta: prever / preveer.",
    "¿Cuándo llevan tilde los monosílabos?",
    "Identifica la palabra mal escrita: exorbitante, exuberante, exhuberante.",
  ],
  Psicotécnicos: [
    "Completa la serie: 3, 6, 12, 24, ...",
    "Si todos los A son B y algunos B son C, ¿qué conclusión es segura?",
    "Ordena mentalmente una secuencia alternando número, letra y figura.",
  ],
};

const memberBadge = document.querySelector("#memberBadge");
const lockedOverlay = document.querySelector("#lockedOverlay");
const chatInput = document.querySelector("#chatInput");
const chatForm = document.querySelector("#chatForm");
const chatButton = chatForm.querySelector("button");
const chatMessages = document.querySelector("#chatMessages");
const modeButtons = document.querySelectorAll(".mode");
const testTopic = document.querySelector("#testTopic");
const testLevel = document.querySelector("#testLevel");
const testOutput = document.querySelector("#testOutput");

function setMembership(active) {
  state.member = active;
  localStorage.setItem("opocompi-member", String(active));
  memberBadge.textContent = active ? "Membresía activa" : "Membresía inactiva";
  memberBadge.className = `member-badge ${active ? "active" : "locked"}`;
  lockedOverlay.classList.toggle("hidden", active);
  chatInput.disabled = !active;
  chatButton.disabled = !active;
  if (active) chatInput.focus();
}

function addMessage(type, text) {
  const message = document.createElement("article");
  message.className = `message ${type}`;
  const name = type === "user" ? "Tú" : "OpoCompi";
  message.innerHTML = `<span>${name}</span><p>${text}</p>`;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildAssistantReply(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("test") || lowerPrompt.includes("pregunta")) return responses.test;
  if (lowerPrompt.includes("ánimo") || lowerPrompt.includes("animo") || lowerPrompt.includes("cans")) return responses.animo;
  if (lowerPrompt.includes("plan") || lowerPrompt.includes("semana")) return responses.plan;
  return responses[state.mode];
}

document.querySelectorAll("[data-activate-membership], [data-open-membership]").forEach((button) => {
  button.addEventListener("click", () => {
    setMembership(true);
    document.querySelector("#asistente").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.mode = button.dataset.mode;
    if (state.member) addMessage("assistant", responses[state.mode]);
  });
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = chatInput.value.trim();
  if (!prompt) return;
  addMessage("user", prompt);
  chatInput.value = "";
  window.setTimeout(() => addMessage("assistant", buildAssistantReply(prompt)), 320);
});

document.querySelector("#generateTest").addEventListener("click", () => {
  const topic = testTopic.value;
  const level = testLevel.value;
  const questions = sampleQuestions[topic];
  testOutput.innerHTML = questions
    .map(
      (question, index) => `
        <article class="question">
          <strong>${index + 1}. ${question}</strong>
          <ol type="A">
            <li>Respuesta correcta pendiente de validar por preparador.</li>
            <li>Distractor plausible para entrenar lectura fina.</li>
            <li>Opción parcialmente correcta con matiz jurídico.</li>
            <li>Respuesta claramente descartable.</li>
          </ol>
          <p>Nivel: ${level}. Recomendación: responde primero sin mirar apuntes y corrige después con explicación.</p>
        </article>
      `
    )
    .join("");
});

setMembership(state.member);
