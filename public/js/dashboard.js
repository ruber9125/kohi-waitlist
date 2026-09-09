import { api, clearToken } from "./api.js";

const loading = document.querySelector("#loading");
const content = document.querySelector("#content");
const greeting = document.querySelector("#greeting");
const queue = document.querySelector("#queue");
const queueNote = document.querySelector("#queue-note");
const barFill = document.querySelector("#bar-fill");
const qrCode = document.querySelector("#qr-code");
const logout = document.querySelector("#logout");

function goToLogin() {
  clearToken();
  window.location.href = "/login.html";
}

function render({ id, name, position, total }) {
  greeting.innerHTML = `Buenos días,<br><span></span>`;
  greeting.querySelector("span").textContent = name;

  queue.innerHTML = `Eres el <strong></strong> de ${total}`;
  queue.querySelector("strong").textContent = `#${position}`;

  const ahead = position - 1;
  queueNote.textContent =
    ahead === 0
      ? "Nadie por delante. Abres tú la puerta."
      : ahead === 1
        ? "Solo una persona por delante de ti."
        : `${ahead} personas por delante de ti.`;

  // La barra mide cuánto has avanzado hacia la cabeza de la cola: llena del
  // todo si eres el #1, y proporcional al resto de la lista si no.
  const progress = total > 0 ? ((total - position + 1) / total) * 100 : 0;
  requestAnimationFrame(() => {
    barFill.style.width = `${progress}%`;
  });

  qrCode.textContent = `QR-${id}`;

  loading.hidden = true;
  content.hidden = false;
}

logout.addEventListener("click", goToLogin);

try {
  render(await api("/api/me", { auth: true }));
} catch (err) {
  // Sin token, con token caducado o manipulado: al login sin más ceremonia.
  if (err.status === 401) {
    goToLogin();
  } else {
    loading.textContent = err.message;
    loading.className = "msg msg--error";
  }
}
