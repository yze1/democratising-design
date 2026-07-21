# Hand-Tracking Composition Tool

## Project Overview
This project is a prototype for a hand-tracking composition tool that allows users to arrange elements on a canvas using hand gestures. The tool is designed as a local desktop application with a minimal user interface. Users can select, move, scale, and rotate PNG images on a canvas.

## Technical Approach
The tool leverages Google's MediaPipe Hand Landmarks Detection to track hand movements and gestures. The system is built using Python (specifically version 3.11 or compatible due to MediaPipe requirements on certain hardware like Apple Silicon) and integrates OpenCV for webcam feed. A p5.js frontend handles rendering and interaction, receiving hand data from the Python backend via WebSockets.

### Key Components
- **Hand Tracking (Python Backend)**: Utilizes MediaPipe to detect hand landmarks. It streams the positions of the index finger tip, thumb tip, and pinky tip, along with a selection state (based on index-thumb proximity) to the frontend.
- **User Interface (p5.js Frontend)**: 
    - Displays a 512px x 768px composition canvas.
    - Allows users to select an image by pointing with their index finger and pinching their index finger and thumb.
    - Allows users to move the selected image by moving their hand while pinching.
    - Allows users to scale the selected image based on the distance between their thumb tip and pinky tip (open hand = larger, closed fist = smaller).
    - Allows users to rotate the selected image based on the angle of the line formed by their thumb tip and pinky tip.
- **Composition Engine (p5.js Frontend)**: Manages the elements (images) on the canvas, including their position, scale, and rotation. It will also handle saving the final composition as a PNG image.

## Usage Instructions
To run the application locally:

1.  **Ensure Python 3.11 is installed.** If not, you can install it using tools like Homebrew (`brew install python@3.11`) or from the official Python website.
2.  **Set up a virtual environment:**
    ```bash
    cd your_project_directory
    python3.11 -m venv venv-py311
    source venv-py311/bin/activate
    ```
3.  **Install required libraries:**
    ```bash
    pip install --upgrade pip
    pip install mediapipe opencv-python
    ```
4.  **Run the application:**
    cd app && python main.py
    python -m http.server 5500 

    ```bash
    python main.py
    ```
    Launch the application to access the webcam feed and an empty composition canvas. You can close the windows by pressing the 'q' key. The next steps will involve adding composition features by dragging elements onto the canvas and saving your composition as a PNG image when finished.

## Development Notes
- **Optimization**: The system is optimized for performance to ensure smooth operation.
- **Compatibility**: Designed to be easily integrated into larger systems, with flexibility for future modifications.
- **Future Development**: Potential areas for enhancement include additional gesture recognition and improved UI design.

## Quick Start (Updated for Camera Feed)

### 1. Start the Python Backend

1. Open a terminal and navigate to the backend directory:
    ```bash
    cd /Users/yze/Desktop/ComposIItor/Compositor/app
    python main.py
    ```
    You should see: `WebSocket server started on ws://localhost:8765`

### 2. Serve the Frontend

1. Open a new terminal and navigate to the frontend directory:
    ```bash
    cd /Users/yze/Desktop/ComposIItor/Compositor/app/frontend
    python -m http.server 5500
    ```
2. In your browser, go to: [http://127.0.0.1:5500/app/frontend/](http://127.0.0.1:5500/app/frontend/)

### 3. Interact
- You should see the camera feed on the left (now using an <img> element for JPEG frames from the backend).
- The right side shows the interactive canvas.
- Hand tracking indicators will appear over the camera feed as you move your hand.

---

## Troubleshooting
- **Port 8765 already in use:**
    - Run `lsof -i :8765` to find the process using the port, then `kill -9 <PID>` to stop it.
- **No camera feed in browser:**
    - Make sure the backend is running and you are visiting the correct URL (`http://127.0.0.1:5500/app/frontend/`).
    - The camera feed is now an `<img id="camera-feed">` element, not a `<video>`.
    - Refresh the page after starting both servers.
- **WebSocket not connecting:**
    - Ensure the backend is running before opening the frontend.
    - Check the browser console for errors.

---

## Summary of Workflow
1. Start the backend Python server (hand tracking, WebSocket, camera feed encoding).
2. Serve the frontend with a local HTTP server and open the correct URL.
3. The frontend receives hand data and camera frames via WebSocket and displays them in the UI.

## Project Structure
// ... existing code ... 

## Finger Blob Overlay (Visual Aid)

A visual blob is always displayed above the canvas, following the index fingertip as tracked by the hand-tracking backend. This blob provides immediate visual feedback for gesture state:

- **Idle:** White blob
- **Hovering over an element:** Light blue blob (`#a1c8ff`)
- **Transforming an element:** Blue blob (`#2d78e1`)

The blob is a pure visual overlay and does not interfere with canvas interactivity. It is implemented as an absolutely positioned HTML element (`div`) above the canvas, updated in real time from the frontend JavaScript. The blob always has a drop shadow for visibility.

**Customization:**
- To change the blob's appearance, edit the `.finger-blob` CSS class in `app/frontend/style.css`.
- To change the color logic or behavior, see the `updateFingerBlobOverlay` function in `app/frontend/sketch.js`.

## Hand Tracking and Camera Feed Mapping

The frontend now remaps hand tracking coordinates so that the index finger (and other tracked points) always correspond to the visible (uncropped) region of the camera feed, as displayed in the UI. This ensures that:

- When your finger is at the top right of the camera visualizer, the blob is at the top right of the canvas.
- The mapping is accurate even if the camera feed is cropped due to aspect ratio differences (from CSS `object-fit: cover`).
- All canvas interactions (selection, dragging, scaling, etc.) are based on the visible region, not the full uncropped camera frame.

**Technical Note:**
- The code assumes a default camera aspect ratio of 4:3. If your camera uses a different aspect ratio (e.g., 16:9), you can adjust the `camAspect` value in `sketch.js` for perfect alignment.
- The remapping logic is handled in the `remapHandCoordsToVisibleRegion` function in `app/frontend/sketch.js`. 