# Smart Wheelchair Frontend Technical Manual & Developer Guide

---

## 1. Table of Contents

- [1. Table of Contents](#1-table-of-contents)
- [2. System Architecture](#2-system-architecture)
  - [2.1 High-Level Architecture Overview](#21-high-level-architecture-overview)
  - [2.2 Communications \& Polling Cycle](#22-communications--polling-cycle)
  - [2.3 Session \& Usage State Machine](#23-session--usage-state-machine)
- [3. Package Files \& Directory Structure](#3-package-files--directory-structure)
  - [3.1 Core Root Files](#31-core-root-files)
  - [3.2 Application Entry \& Configuration](#32-application-entry--configuration)
  - [3.3 UI Components Breakdown](#33-ui-components-breakdown)
- [4. Quick Start Guide](#4-quick-start-guide)
  - [4.1 Prerequisites](#41-prerequisites)
  - [4.2 Local Development Server](#42-local-development-server)
  - [4.3 Production Build \& Backend Integration](#43-production-build--backend-integration)
- [5. Modification \& Compilation Workflow](#5-modification--compilation-workflow)
  - [5.1 Making UI Modifications](#51-making-ui-modifications)
  - [5.2 Building Production Assets](#52-building-production-assets)
  - [5.3 Reloading the Backend](#53-reloading-the-backend)
- [6. End-to-End Feature Development Guide](#6-end-to-end-feature-development-guide)
  - [6.1 Adding a New Feature (Frontend + Backend + ROS 2)](#61-adding-a-new-feature-frontend--backend--ros-2)
  - [6.2 Step 1: ROS 2 / Backend Integration](#62-step-1-ros-2--backend-integration)
  - [6.3 Step 2: REST Endpoint Creation](#63-step-2-rest-endpoint-creation)
  - [6.4 Step 3: Frontend Component Integration](#64-step-3-frontend-component-integration)
  - [6.5 Step 4: Testing \& Verification](#65-step-4-testing--verification)
- [7. Complete API Reference \& Feature Parameters](#7-complete-api-reference--feature-parameters)
  - [7.1 Health \& Telemetry Endpoints](#71-health--telemetry-endpoints)
  - [7.2 Navigation \& Teleop Control Endpoints](#72-navigation--teleop-control-endpoints)
  - [7.3 Localization \& Mapping Endpoints](#73-localization--mapping-endpoints)
  - [7.4 Hardware, Wi-Fi \& System Control Endpoints](#74-hardware-wi-fi--system-control-endpoints)

---

## 2. System Architecture

### 2.1 High-Level Architecture Overview

The Smart Wheelchair Web Application is built using **React 19** with **Vite 8** as the asset bundler and dev server. The frontend serves as a single-page web interface optimized for touch displays, mobile browsers, and developer dashboards.

```
+-------------------------------------------------------------------------------+
|                             REACT FRONTEND (Vite)                             |
|  [WelcomeScreen]  [SummonScreen]  [DevScreen]  [TeleopScreen]  [StationsScreen] |
+---------------------------------------+---------------------------------------+
                                        |
                                HTTP REST / JSON
                                        |
+---------------------------------------v---------------------------------------+
|                    FASTAPI BACKEND (cmu_whisper_llama_backend_v4)            |
|  - Host / Container Bridge              - State Machine Tracker               |
|  - Static Asset Server (/dist)          - Audio Speech-to-Text (Whisper.cpp)  |
|  - ROS 2 Python Node (LLMBridgeNode)   - Natural Language Parser (LLaMA)     |
+---------------------------------------+---------------------------------------+
                                        |
                           rclpy / ROS 2 Domain 56
                                        |
+---------------------------------------v---------------------------------------+
|                              ROS 2 NAV2 STACK                                 |
|  - /battery_status                    - /cmd_vel & /cmd_vel_keyboard          |
|  - /initialpose                       - /goal_pose & /navigate_to_pose        |
|  - /navigation_status                 - /scan & LiDAR Pointcloud              |
+-------------------------------------------------------------------------------+
```

### 2.2 Communications & Polling Cycle

The frontend updates its interface dynamically by maintaining a high-frequency status loop:
1. **Health Polling (`/health`)**: `App.jsx` polls the backend `/health` REST endpoint every **1.0 second**. This fetches:
   - Battery state (Voltage, Current, Percentage, Status).
   - Navigation state (`is_navigating`, `nav2_status`, `nav2_distance_remaining`).
   - Wheelchair session status (`usage_state`, `active_summon_station`).
   - Pre-loaded location names and serviceability map.
2. **Video Streaming (`web_video_server`)**: Camera feeds (e.g. `/glass_detection/overlay` or `/camera/color/image_raw`) are rendered using standard HTML `<img>` elements connected to the ROS 2 `web_video_server` multipart MJPEG stream at port `8080`.
3. **Teleoperation Control**: Joystick or button interactions trigger continuous `/teleop` POST requests containing target linear ($m/s$) and angular ($rad/s$) speeds.

### 2.3 Session & Usage State Machine

The backend and frontend coordinate usage modes to prevent simultaneous conflicting controls between remote users and on-seat riders:

*   **`ready_to_summon`**: Wheelchair is idle at a station and available to be summoned via the mobile Summoning Portal.
*   **`summoning`**: A remote user has requested the wheelchair to navigate to their location. The UI displays the summon progress and estimated arrival distance.
*   **`in_use`**: The wheelchair has arrived at the user or is actively being operated by the on-seat rider. Remote summoning is locked out.

---

## 3. Package Files & Directory Structure

### 3.1 Core Root Files

| File | Purpose |
| :--- | :--- |
| [`package.json`](file:///home/robot/wheelchair_ws/wheelchair_frontend/package.json) | Declares project dependencies (**React 19**, **Vite 8**, **ESLint 10**) and execution scripts (`dev`, `build`, `preview`, `lint`). |
| [`vite.config.js`](file:///home/robot/wheelchair_ws/wheelchair_frontend/vite.config.js) | Configures Vite bundler, React plugin support, build target directory (`dist/`), and dev server settings. |
| [`eslint.config.js`](file:///home/robot/wheelchair_ws/wheelchair_frontend/eslint.config.js) | Defines code linting rules for React hooks and modern ECMAScript standards. |
| [`index.html`](file:///home/robot/wheelchair_ws/wheelchair_frontend/index.html) | Root HTML shell hosting the `#root` React DOM target node and viewport settings. |

### 3.2 Application Entry & Configuration

| File | Purpose |
| :--- | :--- |
| [`src/main.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/main.jsx) | Entry point mounting `<App />` into the DOM root using `react-dom/client`. |
| [`src/App.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/App.jsx) | Main application container (52 KB). Manages active screens, global state polling (`/health`), emergency stop handler, and navigation routing. |
| [`src/config.js`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/config.js) | Environment configuration parameters (camera topic, video server port, idle timeouts, API base URL). |
| [`src/index.css`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/index.css) | Global design system stylesheet (18 KB). Defines CSS custom properties (color tokens, glassmorphism gradients, responsive layouts, button styles). |

### 3.3 UI Components Breakdown

All UI components reside in [`src/components/`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components):

| Component | Description |
| :--- | :--- |
| [`WelcomeScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/WelcomeScreen.jsx) | Main landing screen for authorized riders. Shows system status (Ready/Offline), battery percentage pill, initial pose selection dropdown, and single-click navigation start. |
| [`SummonScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/SummonScreen.jsx) | Mobile summoning portal. Allows users to request the wheelchair to a specific station and track its arrival progress in real time. |
| [`DevScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/DevScreen.jsx) | Comprehensive developer dashboard (46 KB). Offers ROS 2 SROS2 security toggles, Wi-Fi network switcher, container recovery buttons, telemetry grid, and initial pose override. |
| [`Header.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/Header.jsx) | Top navigation bar displaying the iHub logo, title, and real-time battery status widget (`🔋/🪫 %` + charging `⚡` indicator). |
| [`TeleopScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/TeleopScreen.jsx) | Touch joystick and directional buttons for manual wheelchair teleoperation. |
| [`StationsScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/StationsScreen.jsx) | Grid view of available map locations/stations. Allows single-touch dispatch to target destinations. |
| [`VoiceScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/VoiceScreen.jsx) | Voice command interface with audio recording capabilities and Whisper STT integration. |
| [`TextScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/TextScreen.jsx) | Natural language text prompt input for commanding navigation via LLaMA parser. |
| [`ModeSelection.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/ModeSelection.jsx) | Dashboard screen for toggling operational modes (Voice, Text, Stations, Teleop). |
| [`Feed.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/Feed.jsx) | Video feed component rendering MJPEG stream from ROS 2 `web_video_server`. |
| [`SaveLocationModal.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/SaveLocationModal.jsx) | Modal dialog for saving new semantic map locations directly from the current robot pose or RViz goal. |

---

## 4. Quick Start Guide

### 4.1 Prerequisites

Ensure Node.js (v18+) and `npm` are installed:

```bash
node -v
npm -v
```

### 4.2 Local Development Server

To run the frontend locally with hot module replacement (HMR):

```bash
cd /home/robot/wheelchair_ws/wheelchair_frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The Vite dev server will start at `http://localhost:5173`. 

> [!NOTE]
> If testing against a backend running on another device or port, update `API_BASE_URL` in [`src/config.js`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/config.js) (e.g. `API_BASE_URL: 'http://192.168.1.50:8443'`).

### 4.3 Production Build & Backend Integration

The backend FastAPI server hosts the compiled frontend directly from the `dist/` folder.

To compile the production bundle:

```bash
cd /home/robot/wheelchair_ws/wheelchair_frontend
npm run build
```

This compiles all React components and assets into optimized JavaScript and CSS bundles inside [`dist/`](file:///home/robot/wheelchair_ws/wheelchair_frontend/dist).

---

## 5. Modification & Compilation Workflow

Whenever UI modifications are made, follow this lifecycle to deploy changes:

```
[Edit React Code (.jsx / .css)] ──> [Test locally or lint] ──> [npm run build] ──> [Reload FastAPI / Browser]
```

### 5.1 Making UI Modifications

1. Open the target component file in [`src/components/`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components).
2. If introducing new design tokens or styles, modify [`src/index.css`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/index.css).
3. Check for linting errors:
   ```bash
   npm run lint
   ```

### 5.2 Building Production Assets

Run the Vite build command:

```bash
npm run build
```

### 5.3 Reloading the Backend

Because FastAPI mounts the static `dist/` directory, refreshing your browser (`F5` or `Ctrl+R`) will immediately load the updated compiled frontend. If backend Python code was modified:

```bash
# Restart backend on host or inside container
docker restart wheelchair_intelligence
```

---

## 6. End-to-End Feature Development Guide

This guide walks through creating a new custom feature end-to-end: adding a **"Horn / Buzzer"** button to the frontend that triggers a ROS 2 command.

### 6.1 Adding a New Feature (Frontend + Backend + ROS 2)

```
[React Button Click] ──> POST /system/horn ──> [FastAPI Endpoint] ──> [ROS2 Publisher] ──> ROS 2 Topic /horn
```

### 6.2 Step 1: ROS 2 / Backend Integration

Open the backend script [`cmu_whisper_llama_backend_v4.py`](file:///home/robot/wheelchair_ws/google_quant/wheelchair_intelligence/development/ui/cmu_whisper_llama_backend_v4.py).

Add a ROS 2 publisher in `LLMBridgeNode.__init__`:

```python
# In LLMBridgeNode.__init__
from std_msgs.msg import Bool

self.horn_pub = self.create_publisher(Bool, '/wheelchair/horn', 10)
```

### 6.3 Step 2: REST Endpoint Creation

Add a new FastAPI endpoint in `cmu_whisper_llama_backend_v4.py`:

```python
@app.post("/system/horn")
async def trigger_horn():
    msg = Bool()
    msg.data = True
    bridge_node.horn_pub.publish(msg)
    return {"status": "success", "message": "Horn sounded"}
```

### 6.4 Step 3: Frontend Component Integration

In [`src/components/Header.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/Header.jsx) or [`DevScreen.jsx`](file:///home/robot/wheelchair_ws/wheelchair_frontend/src/components/DevScreen.jsx), add the trigger function and UI button:

```jsx
import config from '../config';

const handleSoundHorn = async () => {
  try {
    const res = await fetch(`${config.API_BASE_URL}/system/horn`, { method: 'POST' });
    const data = await res.json();
    console.log("Horn triggered:", data);
  } catch (err) {
    console.error("Failed to trigger horn:", err);
  }
};

// In render return:
<button onClick={handleSoundHorn} className="action-btn">
  🎺 Sound Horn
</button>
```

### 6.5 Step 4: Testing & Verification

1. Build frontend: `npm run build`
2. Test REST call via `curl`:
   ```bash
   curl -X POST http://localhost:8443/system/horn
   ```
3. Verify topic publication:
   ```bash
   ros2 topic echo /wheelchair/horn
   ```

---

## 7. Complete API Reference & Feature Parameters

### 7.1 Health & Telemetry Endpoints

#### `GET /health`
Returns full system status, battery state, and location metadata.

*   **Response Parameters**:
    ```json
    {
      "status": "ok",
      "has_last_location": true,
      "battery": {
        "voltage": 25.4,
        "current": -0.85,
        "percentage": 88.5,
        "status": "Discharging",
        "present": true
      },
      "usage_state": "ready_to_summon",
      "active_summon_station": "",
      "security_enable": true,
      "enable_developer": true,
      "mode": "teleop",
      "linear": 0.2,
      "angular": 0.5,
      "is_navigating": false,
      "nav2_distance_remaining": "0.45m",
      "nav2_status": "Idle",
      "nav2_ready": true,
      "has_rviz_goal": false,
      "llama_server": "up",
      "locations_loaded": 17,
      "location_names": ["rrc canteen", "library", ...],
      "disabled_locations": ["rrc canteen"]
    }
    ```

---

### 7.2 Navigation & Teleop Control Endpoints

#### `POST /prompt`
Submits text or voice prompt for LLaMA natural language destination parsing.

*   **Body Parameters**:
    *   `prompt` (*string*): User natural language command (e.g. `"Take me to the library"`).
    *   `devMode` (*boolean*): If `true`, publishes to `/llm_dev` instead of `/llm_command`.

#### `POST /teleop`
Sends velocity command to joystick / teleoperation driver.

*   **Body Parameters**:
    *   `linear` (*float*): Target linear velocity in $m/s$ (e.g. `0.2`).
    *   `angular` (*float*): Target angular velocity in $rad/s$ (e.g. `0.5`).

#### `POST /stop`
Triggers immediate emergency halt, stopping teleoperation and canceling active Nav2 goals.

---

### 7.3 Localization & Mapping Endpoints

#### `POST /set_initial_pose`
Sets robot initial pose for 3D-BBS / ICP localization matcher.

*   **Body Parameters**:
    *   `location` (*string*): Target location name from `map_semantics.yaml` or `"last_location"`.

#### `POST /save_location`
Saves current robot pose or RViz goal pose as a new named location in `map_semantics.yaml`.

*   **Body Parameters**:
    *   `name` (*string*): Canonical location name.
    *   `aliases` (*string*): Comma-separated alternative names.
    *   `tags` (*string*): Comma-separated concept tags.
    *   `source` (*string*): `"current"` or `"goal"`.

---

### 7.4 Hardware, Wi-Fi & System Control Endpoints

#### `GET /wifi/status`
Returns currently connected SSID, IP address, and signal strength.

#### `POST /wifi/connect`
Connects Jetson to specified wireless network.

*   **Body Parameters**:
    *   `ssid` (*string*): Wi-Fi SSID.
    *   `password` (*string*): WPA2 passphrase.

#### `POST /system/reboot`
Initiates hardware host reboot via SSH `sudo systemctl reboot -i`.

#### `POST /system/shutdown_nav`
Gracefully halts tmux session `wheelchair_navigation`.

#### `POST /system/relaunch_nav_pane`
Restarts individual tmux navigation stack panes (`"0"` for Bringup, `"1"` for Loc/Nav2, `"2"` for Silica, `"3"` for Bridge, `"4"` for Sensors, or `"all"`).

---

*Manual maintained by iHub-Data IIITH Smart Wheelchair Team.*
