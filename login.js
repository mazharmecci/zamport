function validateLogin(event) {
  event.preventDefault();

  showLoadingOverlay(true); // Show spinner immediately

  const username = document.getElementById("username").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  const allowedUsers = ["zaman", "mazhar"];
  const correctPassword = "zamport@123";

  if (allowedUsers.includes(username) && password === correctPassword) {
    const userMap = {
      zaman: "Zaman Mecci",
      mazhar: "Mazhar Mecci"
    };

    sessionStorage.setItem("zamport-auth", "true");
    sessionStorage.setItem("zamport-user", userMap[username]);
    sessionStorage.setItem("zamport-last-active", Date.now().toString());

    showToast("✅ Login successful!");

    setTimeout(() => {
      showLoadingOverlay(false); // Hide spinner before redirect
      window.location.href = "dashboard.html";
    }, 1000);
  } else {
    showToast("❌ Invalid credentials. Please try again.");
    showLoadingOverlay(false); // Hide spinner on failure
  }
}
