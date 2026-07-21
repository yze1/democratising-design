# Democratising Design

A local hand-tracking composition prototype. The Python backend uses MediaPipe and OpenCV to read a webcam, detect hand landmarks, and stream gesture data plus camera frames over WebSocket. The p5.js frontend displays the camera feed and a composition canvas where image elements can be selected, moved, scaled, and rotated with hand gestures.

## Requirements

- Python 3.11
- Webcam access
- A modern browser

## Setup

```bash
cd app
python3.11 -m venv venv-py311
source venv-py311/bin/activate
pip install --upgrade pip
pip install mediapipe opencv-python numpy websockets
```

## Run

Start the hand-tracking backend:

```bash
cd app
source venv-py311/bin/activate
python main.py
```

In a second terminal, serve the frontend:

```bash
cd app/frontend
python3 -m http.server 5500
```

Open `http://127.0.0.1:5500/`.

Press `q` in the OpenCV debug window to stop the backend.

## Project Structure

- `app/main.py` - webcam capture, hand tracking, and WebSocket streaming.
- `app/frontend/` - p5.js interface and canvas interaction.
- `app/assets/` - composition images and font assets.
- `architecture.md`, `canvas-overlay.md`, `optimisation.md`, `tasks.md` - project notes.

## Git Notes

Local Python environments and cache files are ignored. Recreate `app/venv-py311/` locally instead of committing it.
