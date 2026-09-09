import { api, saveToken } from "./api.js";

const form = document.querySelector("#login-form");
const msg = document.querySelector("#msg");
const submit = document.querySelector("#submit");

function showError(text) {
  msg.textContent = text;
  msg.className = "msg msg--error";
  msg.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msg.hidden = true;

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showError("Introduce tu email y tu contraseña.");
    return;
  }

  submit.disabled = true;
  submit.textContent = "Entrando…";

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: { email, password },
    });
    saveToken(data.token);
    window.location.href = "/dashboard.html";
  } catch (err) {
    showError(err.message);
    submit.disabled = false;
    submit.textContent = "Entrar";
  }
});
