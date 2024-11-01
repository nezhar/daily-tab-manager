// Initialize the manager tab when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  await createManagerTab();
});

async function createManagerTab() {
  // Check if manager tab already exists
  const existingTabs = await chrome.tabs.query({
    url: chrome.runtime.getURL("manager.html")
  });

  if (existingTabs.length === 0) {
    // Create new manager tab
    const tab = await chrome.tabs.create({
      url: "manager.html",
      pinned: true
    });
  }
}

// Listen for tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.url.includes("manager.html")) {
    await saveTab(tab);
  }
});

async function saveTab(tab) {
  // Don't save empty tabs or chrome:// urls
  if (!tab.url || tab.url === "chrome://newtab/" || tab.url.startsWith("chrome://")) {
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const tabData = {
    id: tab.id,
    url: tab.url,
    title: tab.title || new URL(tab.url).hostname,
    date: today,
    timestamp: Date.now() // Add timestamp for collection identification
  };

  // Store tab data
  const data = await chrome.storage.local.get("tabsByDay");
  const tabsByDay = data.tabsByDay || {};
  
  if (!tabsByDay[today]) {
    tabsByDay[today] = [];
  }
  
  tabsByDay[today].push(tabData);
  await chrome.storage.local.set({ tabsByDay });
}

// Function to collect all current tabs into a new collection
async function collectCurrentTabs() {
  const tabs = await chrome.tabs.query({ pinned: false });
  const managerUrl = chrome.runtime.getURL("manager.html");
  
  // Filter out empty tabs and chrome:// urls
  const validTabs = tabs.filter(tab => 
    tab.url && 
    tab.url !== "chrome://newtab/" && 
    !tab.url.startsWith("chrome://") && 
    tab.url !== managerUrl
  );

  if (validTabs.length === 0) {
    return { count: 0 };
  }

  const collectionTimestamp = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  const tabsData = validTabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title || new URL(tab.url).hostname,
    date: today,
    timestamp: collectionTimestamp
  }));

  // Store tab data
  const data = await chrome.storage.local.get("tabsByDay");
  const tabsByDay = data.tabsByDay || {};
  
  if (!tabsByDay[today]) {
    tabsByDay[today] = [];
  }
  
  tabsByDay[today] = [...tabsByDay[today], ...tabsData];
  await chrome.storage.local.set({ tabsByDay });

  // Close collected tabs
  for (const tab of validTabs) {
    await chrome.tabs.remove(tab.id);
  }

  return { count: validTabs.length, timestamp: collectionTimestamp };
}

// Listen for messages from the manager page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "collectTabs") {
    collectCurrentTabs().then(response => {
      sendResponse(response);
    });
    return true; // Required for async response
  }
});