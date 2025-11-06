function validateLogin(event) {
  event.preventDefault();

  const userInput = document.getElementById("username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("password").value;

  const allowedUsers = ["zaman", "mazhar"];
  const correctPassword = "zamport@123";

  const isUserValid = allowedUsers.includes(userInput);
  const isPasswordValid = passwordInput === correctPassword;

  if (isUserValid && isPasswordValid) {
    const userMap = {
      zaman: "Zaman Mecci",
      mazhar: "Mazhar Mecci"
    };

    sessionStorage.setItem("zamport-auth", "true");
    sessionStorage.setItem("zamport-last-active", Date.now());
    sessionStorage.setItem("zamport-user", userMap[userInput]); // ✅ full name stored
    window.location.href = "dashboard.html";
  } else {
    showToast("Invalid credentials. Please try again.");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
