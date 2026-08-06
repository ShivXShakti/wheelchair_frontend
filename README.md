# Wheelchair Navigation Frontend

This package contains the modern React + Vite frontend for the Wheelchair Intelligence system. It was migrated from a legacy single-file HTML/Vanilla JS setup (`index4.html`) to improve maintainability, component reuse, and developer experience.

## 🚀 1. Prerequisites

Because this is a modern web application, it requires **Node.js** to run the development server and build the project. The recommended way to install Node.js on a Jetson (or any Linux machine) is using `nvm` (Node Version Manager).

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload terminal (or close and reopen it)
source ~/.bashrc

# Install Node.js v20 (Latest LTS)
nvm install 20
```

## 📦 2. Installation & Running

Once Node.js is installed, navigate to this directory and install the project dependencies:

```bash
cd wheelchair_frontend
npm install
```

### Development Mode
To start the live-reloading development server:
```bash
npm run dev
```
Open your browser to `http://localhost:5173`. 
*Note: During development, Vite is configured (via `vite.config.js`) to automatically proxy backend API requests (like `/health` or `/generate`) to your Python backend running on `https://localhost:8443`.*

### Production Build
When you are ready to deploy the UI permanently without needing Node.js running in the background:
```bash
npm run build
```
This will compile all the React code into highly optimized static HTML, CSS, and JS files inside the `dist/` folder. Your Python FastAPI/Flask backend can then serve these static files directly.

---

## 🏗️ 3. Architecture & Code Structure

The application is built using **React** (for the UI logic) and **Vite** (for the build tooling). 

- `src/main.jsx`: The entry point that mounts the React application and imports the global stylesheet.
- `src/App.jsx`: The "brain" of the frontend. It holds the global state (current screen, health data, chat history, dev mode) and handles routing. It polls the backend `/health` endpoint every 3 seconds to update the Server and ROS connection status.
- `src/index.css`: Contains all custom CSS variables (dark mode glassmorphism themes), media queries for mobile responsiveness, and micro-animations.
- `src/components/`: The isolated UI blocks:
  - `Header.jsx`: Top navigation containing the iHub logo and Dev Mode toggle.
  - `ModeSelection.jsx`: The home screen grid layout for selecting Navigation modes.
  - `VoiceScreen.jsx`: Handles microphone access, `MediaRecorder` logic, and sends audio blobs to the `/transcribe` endpoint. Features a safety interlock that prevents execution if the ROS backend is offline (unless Dev Mode is on).
  - `TextScreen.jsx`: Handles text input and sends text to the `/generate` endpoint. Also includes the offline safety interlock.
  - `TeleopScreen.jsx`: The virtual joystick interface (Nipple.js) that directly publishes to the `/cmd_vel` equivalent endpoint.
  - `Feed.jsx`: Renders the interactive chat bubbles, smart suggestion chips, and timing metrics (LLM MS, Whisper MS).

---

## 🛠️ 4. How to Add New Functionalities

If a future developer wants to add a new screen (for example, the "Map" feature), follow these steps:

### Step 1: Create a new Component
Create a new file in `src/components/MapScreen.jsx`.
```jsx
import React from 'react';

const MapScreen = ({ goHome }) => {
  return (
    <div className="screen active" style={{ flex: 1, display: 'flex' }}>
      <div className="screen-header">
        <button className="back-btn" onClick={goHome}>← Back</button>
        <span className="screen-title">Navigation Map</span>
      </div>
      
      {/* Add your map logic here */}
      <div style={{ padding: '20px', color: 'white' }}>
        Map coming soon...
      </div>
    </div>
  );
};

export default MapScreen;
```

### Step 2: Add it to App.jsx
Open `src/App.jsx` and import your new component at the top:
```jsx
import MapScreen from './components/MapScreen';
```
Then, down in the `return` statement, add a condition to render it when the screen state matches:
```jsx
{currentScreen === 'map' && <MapScreen goHome={goHome} />}
```

### Step 3: Link it in ModeSelection.jsx
Open `src/components/ModeSelection.jsx` and update the "Map" button to trigger the new screen instead of being disabled:
```jsx
{/* Remove the "soon" class and add the onClick handler */}
<div className="mode-card" onClick={() => setScreen('map')}>
  <div className="mode-icon">🗺️</div>
  <div className="mode-label">Map</div>
  <div className="mode-desc">View live map</div>
</div>
```

### Step 4: Adding New API Endpoints
If your new feature needs to talk to a *new* endpoint on the Python backend (e.g., `/get_map`), you must whitelist it in `vite.config.js` so the development server knows to proxy it during local testing:

```javascript
// inside vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': { target: 'https://localhost:8443', secure: false },
      '/get_map': { target: 'https://localhost:8443', secure: false }, // <-- Added
    }
  }
})
```

### Step 5: Updating Global State (App.jsx)
If your new component needs access to the Wheelchair's health or navigation status, simply pass `healthData` as a prop from `App.jsx`.
If your component needs to trigger a smart action (like Voice and Text do), you can pass down the `handleResponse` function which automatically handles updating the Chat History Feed, speaking text-to-speech, and transitioning the UI.
