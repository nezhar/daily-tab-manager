document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('collectButton').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: "collectTabs" });
      if (response && response.count > 0) {
        alert(`Successfully collected ${response.count} tabs!`);
        displayTabs();
      } else {
        alert('No valid tabs to collect');
      }
    } catch (error) {
      alert('Error collecting tabs: ' + error.message);
    }
  });

  displayTabs();
  setInterval(displayTabs, 60000);
});

async function displayTabs() {
  try {
    const container = document.getElementById('container');
    const data = await chrome.storage.local.get(["tabsByDay", "highlightedCollections"]);
    const tabsByDay = data.tabsByDay || {};
    const highlightedCollections = data.highlightedCollections || {};
    
    // Sort days in reverse chronological order
    const sortedDays = Object.keys(tabsByDay).sort().reverse();
    
    container.innerHTML = '';
    
    sortedDays.forEach(day => {
      const tabs = tabsByDay[day];
      const dayBox = document.createElement('div');
      dayBox.className = 'day-box';
      
      // Create header
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      
      const headerLeft = document.createElement('div');
      headerLeft.className = 'header-left';

      const dayTitle = document.createElement('div');
      dayTitle.className = 'day-title';
      dayTitle.textContent = formatDate(day);
      
      const tabCount = document.createElement('div');
      tabCount.className = 'tab-count';
      tabCount.textContent = `${tabs.length} tabs`;
      
      headerLeft.appendChild(dayTitle);
      headerLeft.appendChild(tabCount);
      dayHeader.appendChild(headerLeft);
      dayBox.appendChild(dayHeader);

      // Group tabs by collection (timestamp)
      const collections = groupByCollection(tabs);
      
      collections.forEach((collectionTabs, timestamp) => {
        const collectionHeader = document.createElement('div');
        collectionHeader.className = 'collection-header';
        
        // Check if collection is highlighted
        const collectionKey = `${day}-${timestamp}`;
        const isHighlighted = highlightedCollections[collectionKey];
        if (isHighlighted) {
          collectionHeader.classList.add('highlighted');
        }
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = formatTime(timestamp);
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';

        // Add highlight button
        const highlightButton = document.createElement('button');
        highlightButton.className = `button highlight-button ${isHighlighted ? 'active' : ''}`;
        highlightButton.textContent = isHighlighted ? 'Unhighlight' : 'Highlight';
        highlightButton.addEventListener('click', () => {
          toggleCollectionHighlight(day, timestamp);
        });

        const openCollectionButton = document.createElement('button');
        openCollectionButton.className = 'button open-button';
        openCollectionButton.textContent = 'Open Collection';
        openCollectionButton.addEventListener('click', () => {
          openAndRemoveCollection(day, timestamp);
        });
        
        const deleteCollectionButton = document.createElement('button');
        deleteCollectionButton.className = 'button delete-button';
        deleteCollectionButton.textContent = 'Remove Collection';
        deleteCollectionButton.addEventListener('click', async () => {
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
          tabList.classList.add('highlighted');
        }
        
        dayBox.appendChild(collectionHeader);
        dayBox.appendChild(tabList);
      });

      container.appendChild(dayBox);
    });
  } catch (error) {
    console.error('Error in displayTabs:', error);
  }
}

async function toggleCollectionHighlight(day, timestamp) {
  try {
    const data = await chrome.storage.local.get(["tabsByDay", "highlightedCollections"]);
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
    console.error('Error toggling highlight:', error);
  }
}

function groupByCollection(tabs) {
  const collections = new Map();
  tabs.forEach(tab => {
    const timestamp = tab.timestamp || 0;
    if (!collections.has(timestamp)) {
      collections.set(timestamp, []);
    }
    collections.get(timestamp).push(tab);
  });
  return new Map([...collections.entries()].sort().reverse());
}

function createTabList(tabs, day) {
  const tabList = document.createElement('div');
  tabList.className = 'tab-list';

  tabs.forEach((tab, index) => {
    const tabItem = document.createElement('div');
    tabItem.className = 'tab-item';

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';

    const tabTitle = document.createElement('div');
    tabTitle.className = 'tab-title';
    tabTitle.textContent = tab.title || new URL(tab.url).hostname;
    tabTitle.addEventListener('click', () => {
      openAndRemoveTab(day, tab.timestamp, tab.url);
    });

    const tabUrl = document.createElement('div');
    tabUrl.className = 'tab-url';
    tabUrl.textContent = tab.url;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'button delete-button';
    deleteButton.textContent = 'Remove';
    deleteButton.addEventListener('click', async () => {
      await removeTab(day, tab.timestamp, tab.url);
      displayTabs();
    });

    tabContent.appendChild(tabTitle);
    tabContent.appendChild(tabUrl);
    tabItem.appendChild(tabContent);
    tabItem.appendChild(deleteButton);
    tabList.appendChild(tabItem);
  });

  return tabList;
}

function formatDate(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(timestamp) {
  if (!timestamp) return 'Older tabs';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

async function openAndRemoveTab(day, timestamp, url) {
  try {
    await chrome.tabs.create({ url });
    await removeTab(day, timestamp, url);
    await displayTabs();
  } catch (error) {
    console.error('Error in openAndRemoveTab:', error);
  }
}

async function openAndRemoveCollection(day, timestamp) {
  try {
    const data = await chrome.storage.local.get("tabsByDay");
    const tabsByDay = data.tabsByDay || {};
    
    if (tabsByDay[day]) {
      const collectionTabs = tabsByDay[day].filter(tab => 
        parseInt(tab.timestamp) === parseInt(timestamp)
      );
      
      // Open all tabs in the collection
      const openPromises = collectionTabs.map(tab => 
        chrome.tabs.create({ url: tab.url })
      );
      
      // Wait for all tabs to open
      await Promise.all(openPromises);
      
      // Then remove the collection
      await removeCollection(day, timestamp);
      await displayTabs();
    }
  } catch (error) {
    console.error('Error in openAndRemoveCollection:', error);
  }
}

async function removeTab(day, timestamp, url) {
  try {
    const data = await chrome.storage.local.get("tabsByDay");
    const tabsByDay = data.tabsByDay || {};
    
    if (tabsByDay[day]) {
      tabsByDay[day] = tabsByDay[day].filter(tab => 
        !(tab.timestamp === timestamp && tab.url === url)
      );
      
      if (tabsByDay[day].length === 0) {
        delete tabsByDay[day];
      }
      
      await chrome.storage.local.set({ tabsByDay });
    }
  } catch (error) {
    console.error('Error in removeTab:', error);
  }
}

async function removeCollection(day, timestamp) {
  try {
    const data = await chrome.storage.local.get(["tabsByDay", "highlightedCollections"]);
    const tabsByDay = data.tabsByDay || {};
    const highlightedCollections = data.highlightedCollections || {};
    
    if (tabsByDay[day]) {
      tabsByDay[day] = tabsByDay[day].filter(tab => tab.timestamp !== timestamp);
      
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
    console.error('Error in removeCollection:', error);
  }
}

async function exportTabs() {
  try {
    const data = await chrome.storage.local.get(["tabsByDay", "highlightedCollections"]);
    const exportData = {
      tabsByDay: data.tabsByDay || {},
      highlightedCollections: data.highlightedCollections || {},
      exportDate: new Date().toISOString()
    };

    // Create blob and download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `tab-manager-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting tabs:', error);
    alert('Error exporting tabs: ' + error.message);
  }
}

// Modify the DOMContentLoaded event listener to add the export button
document.addEventListener('DOMContentLoaded', () => {
  // Existing collect button listener
  document.getElementById('collectButton').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: "collectTabs" });
      if (response && response.count > 0) {
        alert(`Successfully collected ${response.count} tabs!`);
        displayTabs();
      } else {
        alert('No valid tabs to collect');
      }
    } catch (error) {
      alert('Error collecting tabs: ' + error.message);
    }
  });

  // Add export button listener
  document.getElementById('exportButton').addEventListener('click', exportTabs);

  displayTabs();
  setInterval(displayTabs, 60000);
});