# Democratising Design

Democratising Design is a local gesture-controlled composition prototype exploring whether design tools can become more accessible without removing creative control. The project combines webcam hand tracking, a browser canvas, and generated visual assets so a user can compose poster elements through movement rather than conventional design software.

The wider project investigates automated and semi-automated design systems using TouchDesigner, MediaPipe, local LLM prompting, ComfyUI workflows, segmentation, ControlNet-style composition, and refinement pipelines. This repository contains the interactive composition layer: a Python backend tracks the hand, then a p5.js frontend uses that data to select, move, scale, and rotate image elements on a poster canvas.

- Website: https://yze.design/democratising/
- Process: https://yze.design/democratising/process/
- Repository: https://github.com/yze1/democratising-design

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

The index finger controls position. Pinching the index finger and thumb selects an element, while the thumb-to-pinky distance and angle control scale and rotation.

## Project Structure

- `app/main.py` - webcam capture, MediaPipe hand tracking, and WebSocket streaming.
- `app/frontend/` - p5.js interface and canvas interaction.
- `app/assets/` - composition images and font assets.
- `architecture.md`, `canvas-overlay.md`, `optimisation.md`, `tasks.md` - project notes.

## Git Notes

Local Python environments and cache files are ignored. Recreate `app/venv-py311/` locally instead of committing it.
