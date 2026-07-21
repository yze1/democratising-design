import cv2
import mediapipe as mp
import numpy as np
import asyncio # For WebSocket server
import websockets # For WebSocket server
import json # To prepare data for sending (later)
import math # For distance calculation
import base64 # For encoding images

# Initialize MediaPipe Hands and drawing utilities
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Define fingertip landmark indices (still useful for processing)
FINGERTIP_LANDMARKS = [
    mp_hands.HandLandmark.THUMB_TIP,
    mp_hands.HandLandmark.INDEX_FINGER_TIP,
    mp_hands.HandLandmark.MIDDLE_FINGER_TIP,
    mp_hands.HandLandmark.RING_FINGER_TIP,
    mp_hands.HandLandmark.PINKY_TIP
]

INDEX_FINGER_TIP_INDEX = mp_hands.HandLandmark.INDEX_FINGER_TIP
THUMB_TIP_INDEX = mp_hands.HandLandmark.THUMB_TIP
PINKY_TIP_INDEX = mp_hands.HandLandmark.PINKY_TIP
SELECTION_DISTANCE_THRESHOLD = 0.07 # Normalized distance threshold for selection

# --- WebSocket Server State ---
connected_clients = set()
WEBSOCKET_PORT = 8765
# ------------------------------

# --- WebSocket Server Handler ---
async def send_to_clients(message):
    """Sends a message to all connected WebSocket clients."""
    if connected_clients:
        # Create a list of tasks for sending messages
        tasks = [asyncio.create_task(client.send(message)) for client in connected_clients]
        # Wait for all tasks to complete, or handle exceptions
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # A client might have disconnected abruptly
                client_list = list(connected_clients)
                if i < len(client_list):
                    client = client_list[i]
                    print(f"Error sending to client {client.remote_address}: {result}. Removing client.")
                    # It's safer to let the main handler remove it on ConnectionClosed
                    # connected_clients.remove(client) # Be careful with modifying while iterating
                else:
                    print(f"Error sending to a client (already removed?): {result}")

async def ws_handler(websocket, path=None):
    global connected_clients
    client_address = websocket.remote_address
    connected_clients.add(websocket)
    print(f"Client connected: {client_address}. Total clients: {len(connected_clients)}")
    try:
        async for message in websocket:
            print(f"Received message from {client_address} (unexpected): {message}")
    except websockets.exceptions.ConnectionClosedOK:
        print(f"Client {client_address} disconnected normally.")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"Client {client_address} disconnected with error: {e}")
    except Exception as e:
        print(f"Error in WebSocket handler for {client_address}: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        print(f"Client {client_address} removed. Total clients: {len(connected_clients)}")
# ------------------------------

async def hand_tracking_loop():
    """Main loop for webcam capture and hand tracking."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    with mp_hands.Hands(
        model_complexity=0,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5) as hands:
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Can't receive frame (stream end?). Exiting ...")
                break

            # Flip the image horizontally for a later selfie-view display
            # and convert the BGR image to RGB.
            frame_rgb = cv2.cvtColor(cv2.flip(frame, 1), cv2.COLOR_BGR2RGB)
            
            # Process the frame and find hands
            results = hands.process(frame_rgb)

            # Convert the RGB image back to BGR for OpenCV display
            frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

            hand_data = {
                "index_pos": None,
                "thumb_pos": None,
                "pinky_pos": None,
                "is_selecting": False
            }

            if results.multi_hand_landmarks:
                # For simplicity, use the first detected hand
                hand_landmarks = results.multi_hand_landmarks[0]
                
                # Extract landmarks for index, thumb, and pinky tips
                index_tip = hand_landmarks.landmark[INDEX_FINGER_TIP_INDEX]
                thumb_tip = hand_landmarks.landmark[THUMB_TIP_INDEX]
                pinky_tip = hand_landmarks.landmark[PINKY_TIP_INDEX]

                hand_data["index_pos"] = {"x": index_tip.x, "y": index_tip.y, "z": index_tip.z}
                hand_data["thumb_pos"] = {"x": thumb_tip.x, "y": thumb_tip.y, "z": thumb_tip.z}
                hand_data["pinky_pos"] = {"x": pinky_tip.x, "y": pinky_tip.y, "z": pinky_tip.z}

                # Calculate distance between index and thumb tips (2D for simplicity on XY plane)
                distance = math.sqrt((index_tip.x - thumb_tip.x)**2 + (index_tip.y - thumb_tip.y)**2)
                
                if distance < SELECTION_DISTANCE_THRESHOLD:
                    hand_data["is_selecting"] = True

                # Draw landmarks and blobs for debug window
                mp_drawing.draw_landmarks(
                    frame_bgr,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())
                for tip_idx in FINGERTIP_LANDMARKS: # Use pre-defined list
                    lm = hand_landmarks.landmark[tip_idx]
                    h, w, _ = frame_bgr.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(frame_bgr, (cx, cy), 7, (0, 0, 255) if tip_idx == INDEX_FINGER_TIP_INDEX and hand_data["is_selecting"] else (0,255,0), -1)
            
            # Encode the frame to JPEG
            _, buffer = cv2.imencode('.jpg', frame_bgr)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Add the frame to the hand data
            hand_data["frame"] = frame_base64
            
            # Send hand_data to all connected clients
            json_data = json.dumps(hand_data)
            await send_to_clients(json_data)
            
            # Display the webcam feed (optional debug window)
            cv2.imshow('Debug Webcam Feed', frame_bgr)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("'q' pressed, stopping loops.")
                break
            
            await asyncio.sleep(0.01) # Allow other async tasks to run

    print("Releasing webcam and destroying OpenCV windows.")
    cap.release()
    cv2.destroyAllWindows()

async def main_async():
    """Starts the WebSocket server and the hand tracking loop."""
    server = await websockets.serve(ws_handler, "localhost", WEBSOCKET_PORT)
    print(f"WebSocket server started on ws://localhost:{WEBSOCKET_PORT}")

    # Keep the server running until hand_tracking_loop stops (e.g., by pressing 'q')
    # or run it indefinitely and handle stop signals more gracefully.
    tracking_task = asyncio.create_task(hand_tracking_loop())
    
    try:
        await tracking_task # Wait for hand_tracking_loop to complete
    except asyncio.CancelledError:
        print("Hand tracking task was cancelled.")
    finally:
        print("Stopping WebSocket server...")
        server.close()
        await server.wait_closed()
        print("WebSocket server stopped.")

if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("Program interrupted by user (Ctrl+C)")
    finally:
        print("Application shut down.") 