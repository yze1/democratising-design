# Canvas Overlay System

## Overview
The canvas overlay is the core interactive area of the Hand-Tracking Composition Tool. It is implemented using [p5.js](https://p5js.org/) in the browser and allows users to arrange, transform, and compose image elements using hand gestures tracked via a Python backend (MediaPipe + OpenCV). The overlay consists of a background image, multiple draggable/transformable elements, and real-time gesture visualizations.

---

## Structure and Components

### 1. Canvas Initialization
- **Size:** 512px (width) x 768px (height)
- **Rendering:** Managed by p5.js (`createCanvas(canvasWidth, canvasHeight)` in `sketch.js`)
- **Styling:**
  - Centered in the browser window (`style.css`)
  - 1px solid black border
  - Light gray background for the page

### 2. Image Elements
- **Assets:**
  - Background: `Background.png`
  - Foreground elements: `Element1.png`, `Element2.png`, `Element3.png`
  - All assets are located in `app/assets/`
- **Loading:**
  - Images are loaded in the `preload()` function using p5.js's `loadImage()`
- **Element Properties:**
  - `x`, `y`: Position (top-left for background, center for foreground)
  - `w`, `h`: Width and height (dynamic, based on scale)
  - `scale`: Current scale factor
  - `angle`: Current rotation (radians)
  - `isBackground`: Boolean flag
  - `img`: Reference to the loaded image
  - `offsetX`, `offsetY`: Offset from hand position for dragging

#### Background Element
- Always rendered first, covers the entire canvas (scaled to fit, centered)
- Not draggable or transformable by gestures

#### Foreground Elements
- Rendered above the background
- Draggable, scalable, and rotatable via hand gestures
- Initial positions are staggered for visibility

### 3. Gesture Visualization
- **Hand Landmarks:**
  - Index tip, thumb tip, and pinky tip positions are visualized as colored circles
  - Lines are drawn between relevant points during selection/transform gestures
- **Status Text:**
  - "SELECTING" or "TRANSFORMING" is displayed at the bottom of the canvas depending on gesture state

---

## Interaction Logic

### 1. Selection
- User points at an element with their index finger and pinches (index tip close to thumb tip)
- The element under the finger is selected for transformation
- The selection uses a simple bounding box hit-test (not rotation-aware)

### 2. Dragging
- While pinching, moving the hand moves the selected element
- The offset between the initial grab point and the element's top-left is maintained

### 3. Scaling
- If thumb and pinky tips are visible, the distance between them controls scale
- Opening the hand increases scale, closing decreases it
- Scaling is constrained between `MIN_SCALE` and `MAX_SCALE`

### 4. Rotation
- The angle between thumb and pinky tips controls rotation
- Rotating the hand (changing the angle) rotates the selected element

### 5. Release
- Releasing the pinch (index and thumb separate) drops the element in its new position/size/rotation

---

## Technical Requirements

### Dependencies
- **Frontend:**
  - [p5.js](https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js) (included via CDN in `index.html`)
  - `sketch.js` (main logic)
  - `style.css` (styling)
- **Backend:**
  - Python 3.11+
  - `mediapipe`, `opencv-python`, `websockets`, `numpy`
  - Backend streams hand landmark data via WebSockets to the frontend

### Assets
- All images must be present in `app/assets/` and referenced in `imagePaths` in `sketch.js`

### WebSocket Server
- The frontend expects a WebSocket server at `ws://localhost:8765` streaming hand data as JSON
- Data format example:
  ```json
  {
    "index_pos": {"x": 0.5, "y": 0.5},
    "thumb_pos": {"x": 0.4, "y": 0.6},
    "pinky_pos": {"x": 0.6, "y": 0.7},
    "is_selecting": true
  }
  ```

### Canvas Styling
- The canvas is centered and has a visible border for clarity
- The background color of the page is light gray (`#f0f0f0`)

---

## How It Works (Render Loop)
1. **Hand data** is received from the backend via WebSocket and updates the global `handData` object.
2. **draw()** is called repeatedly by p5.js:
    - Clears the canvas
    - Draws the background image (scaled/centered)
    - Draws all foreground elements (with current position, scale, rotation)
    - Handles selection, dragging, scaling, and rotation based on hand gesture state
    - Visualizes hand landmarks and gesture lines
    - Displays status text

---

## Extending or Modifying the Overlay
- To add new elements, add PNGs to `app/assets/` and update `imagePaths` in `sketch.js`
- To change canvas size, update `canvasWidth` and `canvasHeight` in `sketch.js` and adjust CSS if needed
- To modify gesture logic, edit the relevant sections in `draw()` in `sketch.js`
- For advanced hit-testing (e.g., rotation-aware selection), replace the bounding box logic with a more robust geometric test

---

## Troubleshooting
- If images do not appear, check asset paths and browser console for loading errors
- If hand gestures do not control elements, ensure the backend is running and WebSocket connection is established
- For performance issues, see `optimisation.md` for tips

---

## See Also
- [README.md](./README.md) for overall project setup and usage
- [optimisation.md](./optimisation.md) for performance tips
- [architecture.md](./architecture.md) for system architecture 