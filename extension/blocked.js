document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("backBtn");

    if (btn) {

        btn.addEventListener("click", () => {

            chrome.runtime.sendMessage({
                action: "goBackSafe"
            });

        });

    }

});
