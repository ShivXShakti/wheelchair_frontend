// Configuration file for the Wheelchair Frontend
// Change these values to match your Jetson's setup

const config = {
  // The ROS2 topic name that your camera publishes images to.
  // Example: '/camera/color/image_raw' or '/image_raw'
  CAMERA_TOPIC: '/glass_detection/overlay',

  // Set to true to display the camera feed globally on the UI, false to hide it
  SHOW_CAMERA: true,

  // The port where the ROS2 web_video_server is running
  // Changed to 8080 (the default) now that LLaMA runs on 8083
  VIDEO_SERVER_PORT: 8080,
  
  // IP address of the Jetson (leave as empty string '' to auto-detect from browser window location)
  // If accessing from another device on the network, this will automatically use the Jetson's IP
  VIDEO_SERVER_IP: '',

  // Base URL of the backend API.
  // Set to empty string '' to use relative paths (same host/port as frontend).
  // Set to 'https://10.42.0.1:8443' or similar if running the frontend separately.
  API_BASE_URL: '',

  // Timer (in seconds) for auto-releasing wheelchair to 'ready_to_summon' state on goal arrival if rider does not respond
  AUTO_RELEASE_TIMEOUT_SEC: 10,

  // Idle time (in seconds) after teleoperating stops before prompting the user for further navigation
  teleope_idle_f: 10
};

export default config;
 