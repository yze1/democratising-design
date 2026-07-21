# Architecture Document

## Overview
This document outlines the architecture for a hand-tracking composition tool. The system allows users to arrange PNG image elements on a digital canvas using hand gestures tracked via a webcam. The application employs a client-server architecture: a Python backend for hand tracking and data processing, and a p5.js frontend for rendering the composition canvas and handling user interactions.

## System Architecture
The system is composed of two main parts:

1.  **Python Backend**:
    *   Captures webcam feed.
    *   Utilizes Google's MediaPipe Hand Landmarks Detection to track hand movements and gestures in real-time.
    *   Processes landmark data to determine key interaction points (e.g., index finger tip position, thumb tip position) and states (e.g., "select" based on finger proximity).
    *   Runs a WebSocket server to stream this processed hand data to the p5.js frontend.
    *   May optionally display the raw webcam feed with hand overlays for debugging/orientation.

2.  **p5.js Frontend (Web Browser)**:
    *   Runs a p5.js sketch loaded in a web browser.
    *   Connects to the Python backend's WebSocket server as a client.
    *   Receives hand data (coordinates, selection state) from the backend.
    *   Manages a digital composition canvas (e.g., 512px width x 768px height).
    *   Loads, displays, and manages multiple PNG image elements from an `assets` directory.
    *   Uses the received hand data to control interactions with these image elements, such as:
        *   Selection (e.g., index finger pointing at an element, thumb proximity indicating selection).
        *   Movement/Dragging (selected element follows index finger position).
        *   Scaling: The scale of a selected image is controlled by the distance between the pinky finger tip and the thumb tip. A closed fist (small distance) shrinks the image, while an open hand (large distance) enlarges it.
        *   Rotation: The rotation of a selected image is controlled by the angle of the line formed between the pinky finger tip and the thumb tip. The initial angle is captured upon selection, and subsequent changes in this hand angle rotate the image accordingly.
        *   (Future) Resizing, rotation.
    *   May include UI elements (buttons, keyboard shortcuts) for actions like adding new images, deleting images, and layer management, as defined in the provided p5.js sketch.
    *   Handles rendering of all visual elements on the canvas.
    *   Can save the canvas composition as a PNG image.

## Communication Protocol
*   **WebSockets**: Real-time, bidirectional communication between the Python backend (server) and the p5.js frontend (client).
*   **Data Format**: JSON is a suitable format for sending structured data (e.g., `{"index_finger_x": X, "index_finger_y": Y, "is_selecting": true/false}`).

## Core Technologies
*   **Python**: For backend logic, hand tracking, WebSocket server.
    *   **MediaPipe**: For hand landmark detection.
    *   **OpenCV**: For webcam capture and (optional) debug display.
    *   **websockets** (Python library): For WebSocket server implementation.
*   **JavaScript (p5.js)**: For frontend rendering, interaction logic, WebSocket client.
*   **HTML/CSS**: For the webpage hosting the p5.js sketch.

## Workflow
1.  User runs the Python backend script. This starts webcam capture, hand tracking, and the WebSocket server.
2.  User opens the `index.html` file (containing the p5.js sketch) in a web browser. This page is served by a local web server.
3.  The p5.js sketch connects to the Python WebSocket server.
4.  Python continuously sends hand tracking data to p5.js.
5.  p5.js updates the positions/states of elements on its canvas based on the received hand data, allowing the user to compose the scene.
6.  The final composition can be saved from the p5.js canvas. 