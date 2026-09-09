import { api, saveToken } from "./api.js";

const form = document.querySelector("#register-form");
const msg = document.querySelector("#msg");
const submit = document.querySelector("#submit");
const formBlock = document.querySelector("#form-block");
const successBlock = document.querySelector("#success-block");
const positionOut = document.querySelector("#position");

const MIN_PASSWORD = 8;

function showError(text) {
  msg.textContent = text;
  msg.className = "msg msg--error";
  msg.hidden = false;
}

function clearError() {
  msg.hidden = true;
  msg.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;

  // Validación en cliente: solo para dar respuesta inmediata. La que manda
  // sigue siendo la del servidor.
  if (!name || !email || !password) {
    showError("Rellena nombre, email y contraseña.");
    return;
  }
  if (password.length < MIN_PASSWORD) {
    showError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    return;
  }
  if (password !== confirm) {
    showError("Las contraseñas no coinciden.");
    return;
  }

  submit.disabled = true;
  submit.textContent = "Reservando tu sitio…";

  try {
    const data = await api("/api/register", {
      method: "POST",
      body: { name, email, password },
    });

    saveToken(data.token);
    positionOut.textContent = `Tu posición: #${data.position}`;
    formBlock.hidden = true;
    successBlock.hidden = false;
  } catch (err) {
    showError(err.message);
    submit.disabled = false;
    submit.textContent = "Unirme a la lista";
  }
});
