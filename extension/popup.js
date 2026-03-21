let deepMinutes = 60;
let dailyMinutes = 60;

let countdownInterval = null;

const deepDisplay = document.getElementById("deepDisplay");
const dailyDisplay = document.getElementById("dailyDisplay");

const modeSelect = document.getElementById("mode");
const intensitySelect = document.getElementById("intensityMode");


// SITE ELEMENTS
const checkboxes = document.querySelectorAll(".quick-sites input");
const siteInput = document.getElementById("siteInput");
const addSiteBtn = document.getElementById("addSiteBtn");
const siteList = document.getElementById("siteList");


// ================= LOCK CONTROLS =================

function setControlsLocked(isLocked) {

    modeSelect.disabled = isLocked;
    intensitySelect.disabled = isLocked;

    document.getElementById("deepIncrease").disabled = isLocked;
    document.getElementById("deepDecrease").disabled = isLocked;
    document.getElementById("dailyIncrease").disabled = isLocked;
    document.getElementById("dailyDecrease").disabled = isLocked;

    document.getElementById("startFocus").disabled = isLocked;

    document.getElementById("endFocus").disabled = !isLocked;

    // LOCK SITE CONTROLS
    checkboxes.forEach(cb => cb.disabled = isLocked);

    siteInput.disabled = isLocked;
    addSiteBtn.disabled = isLocked;

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.style.pointerEvents = isLocked ? "none" : "auto";
        btn.style.opacity = isLocked ? "0.5" : "1";
    });
}


// ================= FORMAT =================

function formatTime(minutes) {

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hrs > 0 && mins > 0) return hrs + " hr " + mins + " min";
    if (hrs > 0) return hrs + " hr";

    return mins + " min";
}


function formatCountdown(ms) {

    const totalSeconds = Math.floor(ms / 1000);

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return mins + "m " + secs + "s";
}


// ================= STREAK =================

function updateStreakDisplay(count) {

    document.getElementById("streak").innerText =
        "🔥 " + count + " Day Focus Streak";

}


// ================= DISPLAY =================

function updateDisplays() {

    deepDisplay.innerText = formatTime(deepMinutes);
    dailyDisplay.innerText = formatTime(dailyMinutes);

}

updateDisplays();


// ================= INTENSITY =================

function applyIntensity(mode) {

    const endBtn = document.getElementById("endFocus");
    const unlockBtn = document.getElementById("emergencyUnlock");

    if (mode === "strict") {

        endBtn.disabled = true;
        unlockBtn.style.display = "none";

    } else {

        endBtn.disabled = false;
        unlockBtn.style.display = "block";

    }

}


// ================= MODE CHANGE =================

modeSelect.addEventListener("change", () => {

    const deepSection = document.getElementById("deepSection");
    const dailySection = document.getElementById("dailySection");

    if (modeSelect.value === "deep") {
        deepSection.style.display = "block";
        dailySection.style.display = "none";
    } else {
        deepSection.style.display = "none";
        dailySection.style.display = "block";
    }

});


intensitySelect.addEventListener("change", () => {
    applyIntensity(intensitySelect.value);
});


// ================= TIME BUTTONS =================

document.getElementById("deepIncrease").addEventListener("click", () => {
    deepMinutes += 5;
    updateDisplays();
});

document.getElementById("deepDecrease").addEventListener("click", () => {
    if (deepMinutes > 5) {
        deepMinutes -= 5;
        updateDisplays();
    }
});

document.getElementById("dailyIncrease").addEventListener("click", () => {
    dailyMinutes += 5;
    updateDisplays();
});

document.getElementById("dailyDecrease").addEventListener("click", () => {
    if (dailyMinutes > 5) {
        dailyMinutes -= 5;
        updateDisplays();
    }
});


// ================= SITE LOGIC =================

// LOAD SITES
chrome.storage.local.get(["selectedSites", "customSites"], (data) => {

    const selectedSites = data.selectedSites || [];
    const customSites = data.customSites || [];

    checkboxes.forEach(cb => {
        if (selectedSites.includes(cb.value)) {
            cb.checked = true;
        }
    });

    renderCustomSites(customSites);

});


// SAVE CHECKBOX
checkboxes.forEach(cb => {

    cb.addEventListener("change", () => {

        let selected = [];

        checkboxes.forEach(c => {
            if (c.checked) selected.push(c.value);
        });

        chrome.storage.local.set({
            selectedSites: selected
        });

    });

});


// RENDER CUSTOM
function renderCustomSites(sites) {

    siteList.innerHTML = "";

    sites.forEach((site, index) => {

        const li = document.createElement("li");

        li.innerHTML = `
            ${site}
            <span class="remove-btn" data-index="${index}">✖</span>
        `;

        siteList.appendChild(li);

    });

}


// ADD CUSTOM
addSiteBtn.addEventListener("click", () => {

    const site = siteInput.value.trim();

    if (!site) return;

    chrome.storage.local.get(["customSites"], (data) => {

        const sites = data.customSites || [];

        sites.push(site);

        chrome.storage.local.set({
            customSites: sites
        });

        renderCustomSites(sites);
        siteInput.value = "";

    });

});


// REMOVE CUSTOM
siteList.addEventListener("click", (e) => {

    if (!e.target.classList.contains("remove-btn")) return;

    const index = e.target.dataset.index;

    chrome.storage.local.get(["customSites"], (data) => {

        const sites = data.customSites || [];

        sites.splice(index, 1);

        chrome.storage.local.set({
            customSites: sites
        });

        renderCustomSites(sites);

    });

});


// ================= COUNTDOWN =================

function startCountdown() {

    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

        chrome.storage.local.get(
            ["endTime", "focusMode", "streakCount", "lastCompletedDate"],
            (data) => {

                const statusEl = document.getElementById("status");

                if (!data.focusMode || !data.endTime) {

                    statusEl.innerText = "Ready to Focus 💡";
                    setControlsLocked(false);
                    return;
                }

                const now = Date.now();
                const remaining = data.endTime - now;

                if (remaining <= 0) {

                    clearInterval(countdownInterval);

                    statusEl.innerText =
                        "Session Complete ✅ Great Job!";

                    const today = new Date().toDateString();

                    let streak = data.streakCount || 0;

                    if (data.lastCompletedDate !== today) {
                        streak += 1;
                    }

                    chrome.storage.local.set({
                        focusMode: false,
                        endTime: null,
                        streakCount: streak,
                        lastCompletedDate: today
                    });

                    updateStreakDisplay(streak);
                    setControlsLocked(false);

                    return;
                }

                statusEl.innerText =
                    "Focus in Progress ⏳ " +
                    formatCountdown(remaining) +
                    " left";

            }
        );

    }, 1000);
}


// ================= POPUP LOAD =================

document.addEventListener("DOMContentLoaded", () => {

    const statusEl = document.getElementById("status");

    statusEl.innerText = "Checking session...";

    chrome.storage.local.get(
    [
        "focusMode",
        "endTime",
        "deepMinutes",
        "intensityMode",
        "streakCount",
        "emergencyCooldownEnd"
    ],
        (data) => {

            if (data.deepMinutes) {
                deepMinutes = data.deepMinutes;
                updateDisplays();
            }

            if (data.intensityMode) {
                intensitySelect.value = data.intensityMode;
                applyIntensity(data.intensityMode);
            }

            updateStreakDisplay(data.streakCount || 0);

            const endBtn = document.getElementById("endFocus");

                if (data.focusMode) {
                    endBtn.disabled = false;
                } else {
                    endBtn.disabled = true;
                }
            const unlockBtn = document.getElementById("emergencyUnlock");

            if (data.emergencyCooldownEnd && Date.now() < data.emergencyCooldownEnd) {

                unlockBtn.disabled = true;
                unlockBtn.innerText = "Disabled for next 2 hr";

            } else {

                unlockBtn.disabled = false;
                unlockBtn.innerText = "Emergency Unlock (5 min)";

            }

                        if (data.focusMode && data.endTime) {

                setControlsLocked(true);
                startCountdown();
                document.getElementById("endFocus").disabled = false;

            } else {

                setControlsLocked(false);
                statusEl.innerText = "Ready to Focus 💡";

            }

        }
    );

});


// ================= START BUTTON =================

document.getElementById("startFocus").addEventListener("click", () => {

    const selectedMode = modeSelect.value;

    if (selectedMode === "deep") {

        const endTime = Date.now() + deepMinutes * 60 * 1000;

        chrome.storage.local.set({
            mode: "deep",
            intensityMode: intensitySelect.value,
            focusMode: true,
            endTime: endTime,
            deepMinutes: deepMinutes
        });

        setControlsLocked(true);
        startCountdown();

    }

    if (selectedMode === "daily") {

        const limitSeconds = dailyMinutes * 60;

        chrome.storage.local.set({
            mode: "daily",
            intensityMode: intensitySelect.value,
            dailyLimit: limitSeconds,
            dailyUsage: 0,
            focusMode: true,
            lastResetDate: new Date().toDateString()
        });

        setControlsLocked(true);

        document.getElementById("status").innerText =
            "Daily Limit Active 🎯";

    }

});


// ================= END SESSION =================

document.getElementById("endFocus").addEventListener("click", () => {

    if (document.getElementById("endFocus").disabled) return;

    chrome.storage.local.get(["focusMode"], (data) => {

        if (!data.focusMode) {

            alert("No active session to end ❌");
            return;

        }

        const confirmStop = confirm(
            "Are you sure you want to end the session?\nYour streak will reset."
        );

        if (!confirmStop) return;

        document.getElementById("otpModal").classList.remove("hidden");

    });

});
// ================= EMERGENCY UNLOCK =================

document.getElementById("emergencyUnlock").addEventListener("click", () => {

    const now = Date.now();

    const unlockEnd = now + 5 * 60 * 1000;       // 5 min unlock
    const cooldownEnd = now + 2 * 60 * 60 * 1000; // 2 hr cooldown

    chrome.storage.local.set({
        temporaryUnlockEnd: unlockEnd,
        emergencyCooldownEnd: cooldownEnd
    });

    const btn = document.getElementById("emergencyUnlock");

    btn.disabled = true;
    btn.innerText = "Disabled for next 2 hr";

    document.getElementById("status").innerText =
        "Emergency Unlock Activated 🚨";

});

// ================= OTP LOGIC =================

document.addEventListener("DOMContentLoaded", () => {

  const sendBtn = document.getElementById("sendOtpBtn");
  const verifyBtn = document.getElementById("verifyOtpBtn");
  const cancelBtn = document.getElementById("cancelOtpBtn");

  const emailInput = document.getElementById("otpEmail");
  const otpInput = document.getElementById("otpInput");

  const otpSection = document.getElementById("otpSection");
  const statusText = document.getElementById("otpStatus");
  const modal = document.getElementById("otpModal");

  sendBtn.onclick = () => {

    const email = emailInput.value;

    if (!email) {
      statusText.innerText = "Enter email";
      return;
    }

    statusText.innerText = "Sending OTP...";

    fetch("http://localhost:5000/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {

      if (data.success) {

        statusText.innerText = "OTP sent!";
        otpSection.classList.remove("hidden");
        verifyBtn.classList.remove("hidden");

      } else {

        statusText.innerText = "Failed to send OTP";

      }

    });

  };

  verifyBtn.onclick = () => {

    const email = emailInput.value;
    const otp = otpInput.value;

    fetch("http://localhost:5000/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, otp })
    })
    .then(res => res.json())
    .then(result => {

      if (result.verified) {

        statusText.innerText = "Verified ✅";
        document.getElementById("endFocus").disabled = true;
        clearInterval(countdownInterval);

        chrome.storage.local.set({
          focusMode: false,
          endTime: null,
          streakCount: 0
        });

        updateStreakDisplay(0);
        setControlsLocked(false);

        document.getElementById("status").innerText = "Session Ended";

        setTimeout(() => {
          modal.classList.add("hidden");
        }, 1000);

      } else {

        statusText.innerText = "Wrong OTP ❌";

      }

    });

  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };

});