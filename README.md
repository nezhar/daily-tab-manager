# Daily Tab Manager

A Chrome extension that helps you organize and manage your browser tabs by automatically collecting them into a daily timeline. Perfect for users who work with many tabs and want to keep them organized without losing track of important content.

## Features

- **Automatic Tab Organization**: Tabs are automatically saved and organized by day and time of creation
- **Collections**: Group tabs into collections with a single click
- **Timeline View**: View your tabs in a chronological timeline
- **Highlighting**: Mark important collections for easy reference
- **Import/Export**: Backup and restore your tab collections
- **Easy Access**: All saved tabs are accessible through a pinned tab

## How It Works

1. **Collection Management**:
   - Click "Collect All Current Tabs" to save all open tabs into a timestamped collection
   - Collections can be highlighted for importance
   - Open entire collections with a single click
   - Remove collections you no longer need

2. **Organization Features**:
   - Expand/collapse days to manage your view
   - Each collection shows the exact time it was created
   - Individual tabs display both title and URL
   - Easily remove individual tabs or entire collections

3. **Data Management**:
   - Export your tab data as JSON for backup
   - Import previously exported data
   - Option to remove all data and start fresh

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will create a pinned tab automatically

## Usage

### Basic Operations
- **Save Current Tabs**: Click "Collect All Current Tabs" to save all open tabs
- **View Saved Tabs**: All saved tabs appear in the pinned manager tab
- **Open Tabs**: Click on any tab title to open it
- **Remove Tabs**: Use the "Remove" button next to each tab

### Collections
- **Open Collections**: Click "Open Collection" to restore all tabs in a collection
- **Highlight Collections**: Use the "Highlight" button to mark important collections
- **Remove Collections**: Click "Remove Collection" to delete entire collections

### Data Management
- **Export Data**: Click "Export Data" to save your tab collections
- **Import Data**: Click "Import Data" to restore previously exported collections
- **Reset**: Use "Remove All Data" to clear all saved tabs and collections

## Storage Structure

Data is stored in Chrome's local storage with the following structure:
```javascript
{
  "tabsByDay": {
    "YYYY-MM-DD": [{
      id: number,
      url: string,
      title: string,
      date: string,
      timestamp: number
    }]
  },
  "highlightedCollections": {
    "YYYY-MM-DD-timestamp": boolean
  },
  "collapsedDays": {
    "YYYY-MM-DD": boolean
  }
}
```

## Permissions

The extension requires the following permissions:
- `tabs`: For accessing and managing browser tabs
- `storage`: For saving tab data locally

## Contributing

Feel free to submit issues and enhancement requests!
