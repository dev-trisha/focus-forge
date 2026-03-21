let currentUrl = "";


// ================= TRACK ACTIVE TAB =================

chrome.tabs.onActivated.addListener(async (activeInfo) => {

    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (tab.url) {
        currentUrl = tab.url;
    }

});


// ================= TRACK URL UPDATES =================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.status === "complete" && tab.url) {
        currentUrl = tab.url;
    }

});


// ================= MAIN LOOP =================

setInterval(() => {

    chrome.storage.local.get(
        [
            "mode",
            "dailyLimit",
            "dailyUsage",
            "focusMode",
            "lastResetDate",
            "temporaryUnlockEnd",
            "endTime",
            "selectedSites",
            "customSites"
        ],
        (data) => {

            const now = Date.now();

            // ===== AUTO END SESSION =====

            if (data.focusMode && data.endTime && now > data.endTime) {

                chrome.storage.local.set({
                    focusMode: false,
                    endTime: null
                });

                return;
            }


            if (!data.focusMode) return;


            // ===== TEMPORARY UNLOCK =====

            if (data.temporaryUnlockEnd && now < data.temporaryUnlockEnd) {
                return;
            }


            const today = new Date().toDateString();

            // ===== DAILY RESET =====

            if (data.lastResetDate && data.lastResetDate !== today) {

                chrome.storage.local.set({
                    dailyUsage: 0,
                    lastResetDate: today
                });

                return;
            }


            // ===== COMBINE BLOCKED SITES =====

            const defaultSites = data.selectedSites || [];
            const customSites = data.customSites || [];

            const blockedSites = [...defaultSites, ...customSites];

            if (!blockedSites.length) return;


            // ===== DEEP MODE BLOCK =====

            if (data.mode === "deep" && currentUrl) {

                for (let site of blockedSites) {

                    if (currentUrl.includes(site)) {

                        blockCurrentTab();
                        return;

                    }

                }

            }


            // ===== DAILY MODE TRACK =====

            if (data.mode === "daily" && currentUrl) {

                for (let site of blockedSites) {

                    if (currentUrl.includes(site)) {

                        let usage = data.dailyUsage || 0;

                        usage += 1;

                        chrome.storage.local.set({
                            dailyUsage: usage
                        });

                        if (usage >= data.dailyLimit) {

                            blockCurrentTab();
                            return;

                        }

                    }

                }

            }

        }
    );

}, 1000);



// ================= BLOCK FUNCTION =================

function blockCurrentTab() {

    chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs) => {

            if (tabs[0]) {

                chrome.tabs.update(tabs[0].id, {
                    url: chrome.runtime.getURL("blocked.html")
                });

            }

        }
    );

}



// ================= HANDLE BUTTON CLICK FROM BLOCKED PAGE =================

chrome.runtime.onMessage.addListener((message, sender) => {

    if (message.action === "goBackSafe") {

        if (sender.tab && sender.tab.id) {

            chrome.tabs.update(sender.tab.id, {
                url: "https://www.google.com"
            });

        }

    }

});
