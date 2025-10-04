# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

X Post Tracker is a browser extension for tracking and visualizing X (formerly Twitter) activity. It displays posts, replies, likes, and reposts on a GitHub-style heat map with goal tracking capabilities.

## Architecture

### Extension Structure
The extension follows Chrome Manifest V3 architecture with:
- **Content Scripts**: Injected into x.com pages to track user actions
- **Injected Scripts**: Page-level scripts that intercept network requests
- **Background Service Worker**: Handles notifications for goal achievements  
- **Popup UI**: Displays activity heatmap and metrics

### Key Components

**Content Layer** (`src/content/`)
- `loader.js`: Initial content script that injects page-level scripts
- `tracker.js`: Manages event tracking and storage updates with deduplication logic
- `main.js`: Bridges communication between injected scripts and content layer
- `messages.js`: Handles message passing between contexts

**Injected Layer** (`src/injected/page/`)
- `network.js`: Intercepts fetch/XHR requests to detect tweet creation, likes, reposts
- `classify.js`: Determines if a tweet is a post or reply based on request payload
- `auth.js`: Extracts authentication tokens from request headers

**Popup UI** (`src/popup/`)
- `main.js`: Entry point, coordinates rendering and state management
- `state.js`: Manages local storage state and goal persistence
- `render/heatmap.js`: Renders GitHub-style activity heatmap
- `render/metrics.js`: Displays daily/total counts
- `render/goals.js`: Shows goal progress indicators

**Shared Utilities** (`src/shared/`)
- `constants.js`: Central definitions for storage keys, message types, classifications
- `storage.js`: Helper functions for daily entry management
- `date.js`: Date formatting and manipulation utilities
- `format.js`: Number formatting and value clamping

### Data Flow
1. User performs action on X.com (post, reply, like, repost)
2. Injected script intercepts network request via patched fetch/XHR
3. Request is classified and event dispatched to content script
4. Content script updates chrome.storage.local with daily counts
5. Popup UI reads storage and renders visualizations

### Event Tracking
- Each tracked event gets a unique ID for deduplication
- Supports delta tracking (positive for actions, negative for undo)
- Maintains a queue of recent events to handle rapid actions/undos
- Maximum of 400 remembered events to prevent memory issues

## Development Commands

Since this is a browser extension without a build process:

```bash
# Load extension in Chrome
1. Navigate to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

# Reload after changes
Click the refresh icon on the extension card in chrome://extensions/

# View console logs
- Background: Click "service worker" link on extension card
- Content/Injected: Open browser DevTools on x.com
- Popup: Right-click popup and select "Inspect"
```

## Testing Approach

Manual testing on x.com:
- Create posts/replies to verify tracking
- Like/unlike tweets to test delta handling  
- Repost/unrepost to validate undo logic
- Check goal notifications trigger correctly
- Verify heatmap updates in real-time

## Key Patterns

- **Message Passing**: Uses chrome.runtime.sendMessage for cross-context communication
- **Storage**: All data persisted in chrome.storage.local with defined key structure
- **Event Deduplication**: Unique IDs prevent double-counting from multiple listeners
- **Delta Tracking**: Negative deltas for undo actions (unlike, unrepost)
- **Goal Notifications**: Background worker sends browser notifications on achievement

## Important Considerations

- Extension only tracks activity while browser is open
- Data stored locally in browser, not synced across devices
- Requires host permissions for x.com domain
- Uses Manifest V3 with service worker instead of background page
- No external dependencies or build process required