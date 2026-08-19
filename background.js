const extensionPayAppId = "REPLACE_WITH_EXTENSIONPAY_APP_ID";
let extensionPay;

try {
  importScripts("extpay.js");
} catch {
  // 決済ライブラリ未配置でも無料機能は動作させます。
}

async function initializeExtensionPay() {
  if (extensionPayAppId.startsWith("REPLACE_") || typeof ExtPay !== "function") return;

  extensionPay = ExtPay(extensionPayAppId);
  extensionPay.startBackground();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "get-pro-status") return false;

  if (!extensionPay) {
    chrome.storage.local.get({ isProUser: false }).then(({ isProUser }) => {
      sendResponse({ isProUser: isProUser === true });
    });
    return true;
  }

  extensionPay.getUser().then(async (user) => {
    const isProUser = user.paid === true;
    await chrome.storage.local.set({ isProUser });
    sendResponse({ isProUser });
  }).catch(() => sendResponse({ isProUser: false }));
  return true;
});

initializeExtensionPay();