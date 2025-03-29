document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("collectButton")
    .addEventListener("click", async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "collectTabs",
        });
        if (response && response.count > 0) {
          alert(`Successfully collected ${response.count} tabs!`);
          displayTabs();
        } else {
          alert("No valid tabs to collect");
        }
      } catch (error) {
        alert("Error collecting tabs: " + error.message);
      }
    });

  document.getElementById("exportButton").addEventListener("click", exportTabs);
  displayTabs();
  setInterval(displayTabs, 60000);
});

async function displayTabs() {
  try {
    const container = document.getElementById("container");
    const data = await chrome.storage.local.get([
      "tabsByDay",
      "highlightedCollections",
      "collapsedDays",
    ]);
    const tabsByDay = data.tabsByDay || {};
    const highlightedCollections = data.highlightedCollections || {};
    const collapsedDays = data.collapsedDays || {};

    // Sort days in reverse chronological order
    const sortedDays = Object.keys(tabsByDay).sort().reverse();

    container.innerHTML = "";

    sortedDays.forEach((day) => {
      const tabs = tabsByDay[day];
      const dayBox = document.createElement("div");
      dayBox.className = "day-box";

      // Create header
      const dayHeader = document.createElement("div");
      dayHeader.className = `day-header ${
        collapsedDays[day] ? "collapsed" : ""
      }`;

      // Add click handler to the entire header
      dayHeader.addEventListener("click", (e) => {
        // Only toggle if the click was on the header itself or the toggle icon
        // not on any other interactive elements that might be in the header
        if (e.target.closest(".button-group") === null) {
          toggleDayCollapse(day);
        }
      });

      const headerLeft = document.createElement("div");
      headerLeft.className = "header-left";

      // Add collapse toggle icon (now just visual, not interactive)
      const toggleIcon = document.createElement("span");
      toggleIcon.className = "collapse-toggle";
      toggleIcon.innerHTML = collapsedDays[day] ? "&#9654;" : "&#9660;";
      headerLeft.appendChild(toggleIcon);

      const dayTitle = document.createElement("div");
      dayTitle.className = "day-title";
      dayTitle.textContent = formatDate(day);

      const tabCount = document.createElement("div");
      tabCount.className = "tab-count";
      tabCount.textContent = `${tabs.length} tabs`;

      headerLeft.appendChild(dayTitle);
      headerLeft.appendChild(tabCount);
      dayHeader.appendChild(headerLeft);
      dayBox.appendChild(dayHeader);

      // Create content container
      const dayContent = document.createElement("div");
      dayContent.className = `day-content ${
        collapsedDays[day] ? "collapsed" : ""
      }`;

      // Group tabs by collection (timestamp)
      const collections = groupByCollection(tabs);

      collections.forEach((collectionTabs, timestamp) => {
        const collectionHeader = document.createElement("div");
        collectionHeader.className = "collection-header";

        // Check if collection is highlighted
        const collectionKey = `${day}-${timestamp}`;
        const isHighlighted = highlightedCollections[collectionKey];
        if (isHighlighted) {
          collectionHeader.classList.add("highlighted");
        }

        const timeLabel = document.createElement("div");
        timeLabel.className = "time-label";
        timeLabel.textContent = formatTime(timestamp);

        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";

        const highlightButton = document.createElement("button");
        highlightButton.className = `button highlight-button ${
          isHighlighted ? "active" : ""
        }`;
        highlightButton.textContent = isHighlighted
          ? "Unhighlight"
          : "Highlight";
        highlightButton.addEventListener("click", () => {
          toggleCollectionHighlight(day, timestamp);
        });

        const openCollectionButton = document.createElement("button");
        openCollectionButton.className = "button open-button";
        openCollectionButton.textContent = "Open Collection";
        openCollectionButton.addEventListener("click", () => {
          openAndRemoveCollection(day, timestamp);
        });

        const deleteCollectionButton = document.createElement("button");
        deleteCollectionButton.className = "button delete-button";
        deleteCollectionButton.textContent = "Remove Collection";
        deleteCollectionButton.addEventListener("click", async () => {
          await removeCollection(day, timestamp);
          displayTabs();
        });

        buttonGroup.appendChild(highlightButton);
        buttonGroup.appendChild(openCollectionButton);
        buttonGroup.appendChild(deleteCollectionButton);

        collectionHeader.appendChild(timeLabel);
        collectionHeader.appendChild(buttonGroup);

        const tabList = createTabList(collectionTabs, day);
        if (isHighlighted) {
          tabList.classList.add("highlighted");
        }

        dayContent.appendChild(collectionHeader);
        dayContent.appendChild(tabList);
      });

      dayBox.appendChild(dayContent);
      container.appendChild(dayBox);
    });
  } catch (error) {
    console.error("Error in displayTabs:", error);
  }
}

async function toggleDayCollapse(day) {
  try {
    const data = await chrome.storage.local.get("collapsedDays");
    const collapsedDays = data.collapsedDays || {};

    if (collapsedDays[day]) {
      delete collapsedDays[day];
    } else {
      collapsedDays[day] = true;
    }

    await chrome.storage.local.set({ collapsedDays });
    await displayTabs();
  } catch (error) {
    console.error("Error toggling day collapse:", error);
  }
}

async function toggleCollectionHighlight(day, timestamp) {
  try {
    const data = await chrome.storage.local.get([
      "tabsByDay",
      "highlightedCollections",
    ]);
    const highlightedCollections = data.highlightedCollections || {};

    const collectionKey = `${day}-${timestamp}`;

    if (highlightedCollections[collectionKey]) {
      delete highlightedCollections[collectionKey];
    } else {
      highlightedCollections[collectionKey] = true;
    }

    await chrome.storage.local.set({ highlightedCollections });
    await displayTabs();
  } catch (error) {
    console.error("Error toggling highlight:", error);
  }
}

function groupByCollection(tabs) {
  const collections = new Map();
  tabs.forEach((tab) => {
    const timestamp = tab.timestamp || 0;
    if (!collections.has(timestamp)) {
      collections.set(timestamp, []);
    }
    collections.get(timestamp).push(tab);
  });
  return new Map([...collections.entries()].sort().reverse());
}

function createTabList(tabs, day) {
  const tabList = document.createElement("div");
  tabList.className = "tab-list";

  tabs.forEach((tab, index) => {
    const tabItem = document.createElement("div");
    tabItem.className = "tab-item";

    const tabContent = document.createElement("div");
    tabContent.className = "tab-content";

    const tabTitle = document.createElement("div");
    tabTitle.className = "tab-title";
    tabTitle.textContent = tab.title || new URL(tab.url).hostname;
    tabTitle.addEventListener("click", () => {
      openAndRemoveTab(day, tab.timestamp, tab.url);
    });

    const tabUrlContainer = document.createElement("div");
    tabUrlContainer.className = "tab-url-container";

    const tabUrl = document.createElement("div");
    tabUrl.className = "tab-url";
    tabUrl.textContent = tab.url;
    tabUrl.title = tab.url; // Add tooltip

    tabUrlContainer.appendChild(tabUrl);

    const deleteButton = document.createElement("button");
    deleteButton.className = "button delete-button";
    deleteButton.textContent = "Remove";
    deleteButton.addEventListener("click", async () => {
      await removeTab(day, tab.timestamp, tab.url);
      displayTabs();
    });

    tabContent.appendChild(tabTitle);
    tabContent.appendChild(tabUrlContainer);
    tabItem.appendChild(tabContent);
    tabItem.appendChild(deleteButton);
    tabList.appendChild(tabItem);
  });

  return tabList;
}

function formatDate(dateString) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(timestamp) {
  if (!timestamp) return "Older tabs";
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

async function openAndRemoveTab(day, timestamp, url) {
  try {
    await chrome.tabs.create({ url });
    await removeTab(day, timestamp, url);
    await displayTabs();
  } catch (error) {
    console.error("Error in openAndRemoveTab:", error);
  }
}

async function openAndRemoveCollection(day, timestamp) {
  try {
    const data = await chrome.storage.local.get("tabsByDay");
    const tabsByDay = data.tabsByDay || {};

    if (tabsByDay[day]) {
      const collectionTabs = tabsByDay[day].filter(
        (tab) => parseInt(tab.timestamp) === parseInt(timestamp)
      );

      // Open all tabs in the collection
      const openPromises = collectionTabs.map((tab) =>
        chrome.tabs.create({ url: tab.url })
      );

      // Wait for all tabs to open
      await Promise.all(openPromises);

      // Then remove the collection
      await removeCollection(day, timestamp);
      await displayTabs();
    }
  } catch (error) {
    console.error("Error in openAndRemoveCollection:", error);
  }
}

async function removeTab(day, timestamp, url) {
  try {
    const data = await chrome.storage.local.get("tabsByDay");
    const tabsByDay = data.tabsByDay || {};

    if (tabsByDay[day]) {
      tabsByDay[day] = tabsByDay[day].filter(
        (tab) => !(tab.timestamp === timestamp && tab.url === url)
      );

      if (tabsByDay[day].length === 0) {
        delete tabsByDay[day];
      }

      await chrome.storage.local.set({ tabsByDay });
    }
  } catch (error) {
    console.error("Error in removeTab:", error);
  }
}

async function removeCollection(day, timestamp) {
  try {
    const data = await chrome.storage.local.get([
      "tabsByDay",
      "highlightedCollections",
    ]);
    const tabsByDay = data.tabsByDay || {};
    const highlightedCollections = data.highlightedCollections || {};

    if (tabsByDay[day]) {
      tabsByDay[day] = tabsByDay[day].filter(
        (tab) => tab.timestamp !== timestamp
      );

      if (tabsByDay[day].length === 0) {
        delete tabsByDay[day];
      }

      // Remove highlight if exists
      const collectionKey = `${day}-${timestamp}`;
      if (highlightedCollections[collectionKey]) {
        delete highlightedCollections[collectionKey];
      }

      await chrome.storage.local.set({ tabsByDay, highlightedCollections });
    }
  } catch (error) {
    console.error("Error in removeCollection:", error);
  }
}

async function exportTabs() {
  try {
    const data = await chrome.storage.local.get([
      "tabsByDay",
      "highlightedCollections",
    ]);
    const exportData = {
      tabsByDay: data.tabsByDay || {},
      highlightedCollections: data.highlightedCollections || {},
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `tab-manager-export-${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting tabs:", error);
    alert("Error exporting tabs: " + error.message);
  }
}

// Add new import function
async function importTabs() {
  try {
    // Create file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    // Handle file selection
    fileInput.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) {
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedData = JSON.parse(event.target.result);

            // Validate imported data structure
            if (
              !importedData.tabsByDay ||
              typeof importedData.tabsByDay !== "object"
            ) {
              throw new Error(
                "Invalid data format: missing or invalid tabsByDay"
              );
            }

            // Validate each tab entry
            for (const day in importedData.tabsByDay) {
              if (!Array.isArray(importedData.tabsByDay[day])) {
                throw new Error(
                  `Invalid data format: tabs for day ${day} is not an array`
                );
              }

              importedData.tabsByDay[day].forEach((tab, index) => {
                if (!tab.url || !tab.timestamp) {
                  throw new Error(
                    `Invalid tab data at day ${day}, index ${index}`
                  );
                }
              });
            }

            // Get current data
            const currentData = await chrome.storage.local.get([
              "tabsByDay",
              "highlightedCollections",
            ]);
            const currentTabs = currentData.tabsByDay || {};
            const currentHighlights = currentData.highlightedCollections || {};

            // Merge data
            const mergedTabs = { ...currentTabs };
            for (const day in importedData.tabsByDay) {
              if (mergedTabs[day]) {
                // If day exists, append new tabs
                mergedTabs[day] = [
                  ...mergedTabs[day],
                  ...importedData.tabsByDay[day],
                ];
              } else {
                // If day doesn't exist, add all tabs
                mergedTabs[day] = importedData.tabsByDay[day];
              }
            }

            const mergedHighlights = {
              ...currentHighlights,
              ...(importedData.highlightedCollections || {}),
            };

            // Save merged data
            await chrome.storage.local.set({
              tabsByDay: mergedTabs,
              highlightedCollections: mergedHighlights,
            });

            // Count imported tabs
            const importedTabCount = Object.values(
              importedData.tabsByDay
            ).reduce((total, dayTabs) => total + dayTabs.length, 0);

            alert(`Successfully imported ${importedTabCount} tabs`);
            displayTabs();
          } catch (error) {
            console.error("Error processing import:", error);
            alert("Error processing import: " + error.message);
          }
        };

        reader.readAsText(file);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file: " + error.message);
      }
    };

    // Trigger file selection
    fileInput.click();
  } catch (error) {
    console.error("Error in importTabs:", error);
    alert("Error importing tabs: " + error.message);
  }
}

async function removeAllData() {
  // Show confirmation dialog
  const confirmed = confirm(
    "Are you sure you want to remove all saved tabs and collections?\n\nThis action cannot be undone. You may want to export your data first."
  );

  if (confirmed) {
    try {
      // Clear all data from storage
      await chrome.storage.local.clear();

      // Refresh the display
      await displayTabs();

      alert("All data has been successfully removed.");
    } catch (error) {
      console.error("Error removing data:", error);
      alert("Error removing data: " + error.message);
    }
  }
}

// Add this to your DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
  // Existing button listeners...
  document
    .getElementById("collectButton")
    .addEventListener("click", async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "collectTabs",
        });
        if (response && response.count > 0) {
          alert(`Successfully collected ${response.count} tabs!`);
          displayTabs();
        } else {
          alert("No valid tabs to collect");
        }
      } catch (error) {
        alert("Error collecting tabs: " + error.message);
      }
    });

  document.getElementById("exportButton").addEventListener("click", exportTabs);
  document.getElementById("importButton").addEventListener("click", importTabs);

  // Add remove all button listener
  document
    .getElementById("removeAllButton")
    .addEventListener("click", removeAllData);

  displayTabs();
  setInterval(displayTabs, 60000);
});

// Theme toggle functionality
function initThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  const toggleText = themeToggle.querySelector(".toggle-text");

  // Function to set theme
  async function setTheme(isDark) {
    if (isDark) {
      document.body.classList.add("dark-theme");
      toggleText.textContent = "Light Mode";
    } else {
      document.body.classList.remove("dark-theme");
      toggleText.textContent = "Dark Mode";
    }

    // Save theme preference to storage
    await chrome.storage.local.set({ isDarkTheme: isDark });
  }

  // Toggle theme when button is clicked
  themeToggle.addEventListener("click", async () => {
    const isDarkTheme = document.body.classList.contains("dark-theme");
    await setTheme(!isDarkTheme);
  });

  // Load saved theme preference
  chrome.storage.local.get("isDarkTheme", (data) => {
    const prefersDark =
      data.isDarkTheme !== undefined
        ? data.isDarkTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches;

    setTheme(prefersDark);
  });
}

// Add this to the DOMContentLoaded event listener section
document.addEventListener("DOMContentLoaded", () => {
  // Initialize theme toggle
  initThemeToggle();

  // Existing code...
  document
    .getElementById("collectButton")
    .addEventListener("click", async () => {
      // ...existing code
    });

  document.getElementById("exportButton").addEventListener("click", exportTabs);
  document.getElementById("importButton").addEventListener("click", importTabs);
  document
    .getElementById("removeAllButton")
    .addEventListener("click", removeAllData);

  displayTabs();
  setInterval(displayTabs, 60000);
});
