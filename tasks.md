# MVP Development Tasks (Python Backend + p5.js Frontend)

This task list outlines the steps to build the MVP using a Python backend (for hand tracking and WebSocket server) and a p5.js frontend (for canvas rendering and interaction, using WebSockets to receive hand data).

## Phase 1: Python Backend - WebSocket Server & Hand Data

1.  **Setup Python Environment & Install Libraries**:
    *   **Task**: Ensure Python 3.11 virtual environment is active. Install `websockets` library (`pip install websockets`). MediaPipe and OpenCV should already be installed.
    *   **Start**: Python 3.11 venv active.
    *   **End**: `websockets` library installed and importable.

2.  **Implement Basic WebSocket Server in Python (`main.py`)**:
    *   **Task**: Modify `main.py`. Remove OpenCV canvas/drag-drop. Keep webcam and MediaPipe hand tracking. Add a basic WebSocket server that, for now, just accepts connections.
    *   **Start**: `websockets` library installed.
    *   **End**: Python script runs, starts a WebSocket server on a specific port (e.g., 8765), and prints a message when a client connects/disconnects. No hand data sent yet.

3.  **Process and Stream Key Hand Data via WebSockets (`main.py`)**:
    *   **Task**: In `main.py`, extract relevant hand landmark data (e.g., index finger tip [landmark 8] X,Y coordinates; thumb tip [landmark 4] X,Y coordinates). Calculate proximity between index tip and thumb tip to determine an `is_selecting` boolean state.
    *   **Data to Send**: Normalize coordinates (0.0 to 1.0). Send a JSON string like: `{"index_pos": {"x": 0.N, "y": 0.N}, "thumb_pos": {"x": 0.N, "y": 0.N}, "is_selecting": true/false}`.
    *   **Start**: Basic WebSocket server is running.
    *   **End**: Python script streams this JSON data continuously to any connected WebSocket client. (Optional: OpenCV window can still show webcam feed with landmarks for debugging).

## Phase 2: p5.js Frontend - Canvas, Images, & WebSocket Client

4.  **Setup Basic HTML and p5.js Project Structure**:
    *   **Task**: Create an `index.html` file. Create a `sketch.js` file and paste the provided p5.js code into it. Ensure p5.js library is correctly linked in `index.html` (e.g., via CDN or local file).
    *   **Assets**: Ensure the `app/assets/` directory contains the PNG images (`BGRemOutput01.png`, `AutoPromptOutput01.png`, `AutoPromptOutput02.png`).
    *   **Start**: Project directory exists.
    *   **End**: A simple local web server (e.g., Python's `http.server` or VS Code Live Server) can serve `index.html`, and it loads the p5.js sketch displaying the initial colored boxes.

5.  **Implement WebSocket Client in p5.js (`sketch.js`)**:
    *   **Task**: In `sketch.js`, add code to connect to the Python WebSocket server (e.g., `ws://localhost:8765`). Log received messages to the browser console.
    *   **Start**: p5.js sketch runs; Python WebSocket server is running and sending data.
    *   **End**: p5.js sketch connects to the server and prints the received hand data JSON strings to the browser console.

6.  **Load and Display PNG Images in p5.js (`sketch.js`)**:
    *   **Task**: Modify the `Box` class (or create a new structure). Instead of drawing colored rectangles, load and display actual PNG images from the `assets` directory. For now, one instance of `BGRemOutput01.png` can be used as the primary test object.
    *   **Preload**: Use `preload()` in p5.js to load images.
    *   **Start**: p5.js sketch can receive WebSocket data.
    *   **End**: The p5.js canvas displays at least one PNG image instead of a colored box. Mouse-based interaction (from original sketch) might still work on this image.

## Phase 3: Integration - Hand-Controlled Interaction

7.  **Control Element Selection with Hand Data in p5.js (`sketch.js`)**:
    *   **Task**: Adapt the selection logic. Use the received `index_pos` (scaled to canvas dimensions) to check if it's over an image. Use the `is_selecting` boolean from the WebSocket data to confirm selection.
    *   **Start**: PNG images are displayed; hand data is received.
    *   **End**: An image on the p5.js canvas is visually marked as "selected" when the index finger (from webcam) points at it and the thumb-tip proximity indicates selection.

8.  **Control Element Dragging with Hand Data in p5.js (`sketch.js`)**:
    *   **Task**: If an image is selected (via hand gesture), its position on the p5.js canvas should update to follow the received `index_pos` (scaled to canvas dimensions).
    *   **Start**: Image selection via hand gesture works.
    *   **End**: A selected image can be dragged around the p5.js canvas smoothly using hand movements tracked by the Python backend.

## Phase 4: Refinements & Remaining Features

9.  **Implement Resizing with Hand Gestures (Optional - Post-MVP)**:
    *   **Task**: Define a new gesture for resizing (e.g., distance between two index fingers, or index finger and pinky of one hand) and implement it in Python and p5.js.

10. **Implement Other p5.js Features with Hand Gestures (Optional - Post-MVP)**:
    *   Adapt adding new elements, deleting, layering, etc., to be triggered by specific hand gestures if desired, or keep them as button/key interactions in p5.js.

11. **Save Canvas Functionality in p5.js**:
    *   **Task**: Ensure the p5.js sketch has a way to save the current state of its canvas as a PNG image (e.g., using `saveCanvas()` in p5.js, triggered by a button or key press).
    *   **Start**: Composition can be made on canvas.
    *   **End**: User can save the composition.

12. **Testing, Debugging, and Performance Optimization**:
    *   **Task**: Thoroughly test the entire workflow. Debug any issues with communication, coordinate mapping, or interaction responsiveness.
    *   **Optimization**: Refer to `optimisation.md` if performance issues (e.g., lag in p5.js rendering or hand data processing) arise. 