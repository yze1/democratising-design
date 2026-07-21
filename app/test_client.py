import asyncio
import websockets

async def hello_client():
    uri = "ws://localhost:8765"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"CLIENT: Connected to {uri}")
            
            print("CLIENT: Listening for messages from server...")
            try:
                async for message in websocket:
                    print(f"CLIENT: Received: {message}")
            except websockets.exceptions.ConnectionClosed:
                print("CLIENT: Connection closed by server.")

    except ConnectionRefusedError:
        print(f"CLIENT: Connection to {uri} refused. Is the server running?")
    except websockets.exceptions.InvalidHandshake as e:
        print(f"CLIENT: Handshake failed: {e}.")
    except Exception as e:
        print(f"CLIENT: An error occurred: {e}")
    finally:
        print("CLIENT: Connection attempt finished.")

if __name__ == "__main__":
    asyncio.run(hello_client()) 