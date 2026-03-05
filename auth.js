// Supabase configuration — replace with your project values
const SUPABASE_URL = "https://mbciydeqmqixhshuscfk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tHriZYahqLLFUPT_VIxAjw_dR8N14we";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("posthog-brickbreak");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");

function showGame(user) {
  authContainer.style.display = "none";
  gameContainer.style.display = "block";
  logoutBtn.style.display = "block";
  if (window.posthog && user) {
    posthog.identify(user.id, { email: user.email });
  }
}

function showAuth() {
  authContainer.style.display = "flex";
  gameContainer.style.display = "none";
  logoutBtn.style.display = "none";
  loginForm.style.display = "flex";
  signupForm.style.display = "none";
  loginError.textContent = "";
  signupError.textContent = "";
}

// Toggle between login and signup forms
document.getElementById("show-signup").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  signupForm.style.display = "flex";
  loginError.textContent = "";
  signupError.textContent = "";
  signupError.style.color = "";
});

document.getElementById("show-login").addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.style.display = "none";
  loginForm.style.display = "flex";
  loginError.textContent = "";
  signupError.textContent = "";
});

// Login
document.getElementById("login-btn").addEventListener("click", async () => {
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) {
    loginError.textContent = "Please enter email and password.";
    return;
  }
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) loginError.textContent = error.message;
});

// Signup
document.getElementById("signup-btn").addEventListener("click", async () => {
  signupError.textContent = "";
  signupError.style.color = "";
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById(
    "signup-confirm-password",
  ).value;
  if (!email || !password || !confirmPassword) {
    signupError.textContent = "Please fill in all fields.";
    return;
  }
  if (password !== confirmPassword) {
    signupError.textContent = "Passwords do not match.";
    return;
  }
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    signupError.textContent = error.message;
  } else {
    signupError.style.color = "#2e7d32";
    signupError.textContent = "Check your email to confirm your account.";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

// Listen for auth state changes
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    showGame(session.user);
  } else {
    showAuth();
  }
});

// Check for existing session on load
(async () => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (session?.user) {
    showGame(session.user);
  } else {
    showAuth();
  }
})();
