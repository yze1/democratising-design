let socket;
let handData = { index_pos: null, thumb_pos: null, is_selecting: false };
let video;
let cameraCanvas;
let debugMode = false; // Add debug flag to control logging

// Canvas properties - these are the internal dimensions for drawing
const canvasWidth = 896;
const canvasHeight = 1152;

// Asset paths (relative to the frontend/index.html file)
const imagePaths = [
    '../assets/Background.png',
    '../assets/Element1.png',
    '../assets/Element2.png',
    '../assets/Element3.png'
];
let images = [];
let draggableElements = []; // To store our image objects with properties
let selectedElement = null; // To store the element currently being dragged

// Store initial gesture data for scaling/rotation
let initialPinkyThumbDist = 0;
let initialPinkyThumbAngle = 0;

const FOREGROUND_ELEMENT_DISPLAY_WIDTH = 300; // Initial width for Element1-3
const BACKGROUND_FILENAME = 'Background.png';
const MIN_SCALE = 0.2; // Minimum scale factor
const MAX_SCALE = 3.0; // Maximum scale factor
const SCALE_SENSITIVITY = 2; // Adjusts how much pinky-thumb distance affects scale
let yzeFont;

// --- CAMERA FEED OVERLAY ---
let cameraFeedOverlay;

// --- BLOB VISUALIZATION SETTINGS ---
const BLOB_RADIUS = 8; // Controls the size of all blobs (change as needed)

function preload() {
    yzeFont = loadFont('../assets/YZE.ttf');
    // Load images
    for (let i = 0; i < imagePaths.length; i++) {
        images[i] = loadImage(imagePaths[i], img => {
            // Success callback, you can log or do something upon successful load if needed
            console.log(`Image ${imagePaths[i]} loaded successfully.`);
        }, err => {
            // Error callback for individual image loading
            console.error(`Error loading image ${imagePaths[i]}:`, error);
        });
    }
}

function syncCameraContainerHeight() {
    const canvasEl = document.getElementById('defaultCanvas0');
    const cameraContainer = document.querySelector('.camera-container');
    if (canvasEl && cameraContainer) {
        cameraContainer.style.height = `${canvasEl.clientHeight}px`;
        cameraContainer.style.width = `${canvasEl.clientWidth}px`;
    }
}

function remapHandCoordsToVisibleRegion(normX, normY, camAspect, containerAspect) {
    // If camera is wider than container, crop left/right
    // If camera is taller, crop top/bottom
    let x = normX, y = normY;
    if (camAspect > containerAspect) {
        // Cropping left/right
        const visibleWidth = containerAspect / camAspect;
        const crop = (1 - visibleWidth) / 2;
        x = (normX - crop) / visibleWidth;
        x = Math.max(0, Math.min(1, x));
    } else if (camAspect < containerAspect) {
        // Cropping top/bottom
        const visibleHeight = camAspect / containerAspect;
        const crop = (1 - visibleHeight) / 2;
        y = (normY - crop) / visibleHeight;
        y = Math.max(0, Math.min(1, y));
    }
    return { x, y };
}

function setup() {
    // Create canvas in the canvas-container
    const canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    console.log('[Overlay] Main canvas created and attached to #canvas-container');
    
    // Create camera canvas for overlays
    cameraCanvas = createGraphics(canvasWidth, canvasHeight);
    const overlayContainer = document.getElementById('camera-overlay');
    if (overlayContainer) {
        // Remove any existing canvas
        while (overlayContainer.firstChild) {
            overlayContainer.removeChild(overlayContainer.firstChild);
        }
        // Add the new canvas
        overlayContainer.appendChild(cameraCanvas.elt);
        // Set the canvas style to match the container
        cameraCanvas.elt.style.width = '100%';
        cameraCanvas.elt.style.height = '100%';
        cameraCanvas.elt.style.position = 'absolute';
        cameraCanvas.elt.style.top = '0';
        cameraCanvas.elt.style.left = '0';
        cameraCanvas.elt.style.pointerEvents = 'none';
        // Add CSS filter for drop shadow
        cameraCanvas.elt.style.filter = 'drop-shadow(0px 3px 2px rgba(0, 0, 0, 0.3))';
        console.log('[Overlay] Camera overlay canvas created and attached to #camera-overlay');
    } else {
        console.error('Camera overlay container not found');
    }
    
    // Make the canvas responsive
    function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const cameraContainer = document.querySelector('.camera-container');
        if (container && cameraContainer) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Calculate the scale to fit the container while maintaining aspect ratio
            const scale = min(containerWidth / canvasWidth, containerHeight / canvasHeight);
            
            // Set the canvas size to match the container
            canvas.style('width', `${canvasWidth * scale}px`);
            canvas.style('height', `${canvasHeight * scale}px`);
            
            // Also resize the camera canvas
            if (cameraCanvas) {
                cameraCanvas.elt.style.width = `${canvasWidth * scale}px`;
                cameraCanvas.elt.style.height = `${canvasHeight * scale}px`;
            }
            syncCameraContainerHeight();
        }
    }
    
    // Initial resize
    resizeCanvas();
    
    // Add resize listener
    window.addEventListener('resize', resizeCanvas);
    
    console.log("p5.js sketch setup complete.");

    // Remove browser camera initialization since we're using WebSocket stream
    video = document.getElementById('camera-feed');

    // Initialize draggable elements
    // Stagger their initial positions for better visibility
    let initialX = 200;
    let initialY = 200;
    let yOffsetIncrement = 200; // How much to shift each subsequent image down

    let backgroundElement = null;

    for (let i = 0; i < images.length; i++) {
        if (images[i] && images[i].width > 0) { 
            let currentDisplayMetrics;
            let isBg = imagePaths[i].endsWith(BACKGROUND_FILENAME);

            if (isBg) {
                // Calculate scale to fit canvas while maintaining aspect ratio
                let wScale = canvasWidth / images[i].width;
                let hScale = canvasHeight / images[i].height;
                let bgScale = max(wScale, hScale); // Use MAX to ensure it COVERS the canvas
                
                currentDisplayMetrics = {
                    baseW: images[i].width, // Base is original image size for background
                    baseH: images[i].height,
                    elementScale: bgScale,
                    x: (canvasWidth - (images[i].width * bgScale)) / 2, // Center it
                    y: (canvasHeight - (images[i].height * bgScale)) / 2,
                    angle: 0,
                    isBackground: true
                };
            } else {
                let aspectRatio = images[i].height / images[i].width;
                let displayHeight = FOREGROUND_ELEMENT_DISPLAY_WIDTH * aspectRatio;
                currentDisplayMetrics = {
                    baseW: FOREGROUND_ELEMENT_DISPLAY_WIDTH,
                    baseH: displayHeight,
                    elementScale: 1.6,
                    x: initialX + (draggableElements.filter(el => !el.isBackground).length * 30),
                    y: initialY + (draggableElements.filter(el => !el.isBackground).length * yOffsetIncrement),
                    angle: 0.0,
                    isBackground: false
                };
            }

            let elementData = {
                id: i,
                img: images[i],
                ...currentDisplayMetrics, // Spread calculated metrics
                w: currentDisplayMetrics.baseW * currentDisplayMetrics.elementScale, // Initial w,h based on scale
                h: currentDisplayMetrics.baseH * currentDisplayMetrics.elementScale,
                initialScaleOnSelect: currentDisplayMetrics.elementScale,
                initialAngleOnSelect: currentDisplayMetrics.angle,
                isDragging: false,
                offsetX: 0, 
                offsetY: 0
            };

            if (isBg) {
                backgroundElement = elementData; // Store it separately for now
            } else {
                draggableElements.push(elementData);
            }
        } else {
            console.warn(`Image at index ${i} (${imagePaths[i]}) was not loaded properly or is invalid, skipping element creation.`);
        }
    }
    // Add background element at the beginning of the array if it exists
    if (backgroundElement) {
        draggableElements.unshift(backgroundElement);
    }

    // Attempt to connect to WebSocket server
    socket = new WebSocket("ws://localhost:8765");

    socket.onopen = function(event) {
        console.log("[WebSocket] Connection established.");
    };

    socket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (debugMode) {
                console.log('Raw WebSocket data:', data);
                console.log('Hand tracking data:', {
                    index_pos: data.index_pos,
                    thumb_pos: data.thumb_pos,
                    pinky_pos: data.pinky_pos,
                    is_selecting: data.is_selecting
                });
            }
            handData = data; // Update global handData object
            
            // Update the camera feed if a frame is provided
            if (data.frame) {
                const video = document.getElementById('camera-feed');
                if (video) {
                    const dataUrl = `data:image/jpeg;base64,${data.frame}`;
                    video.src = dataUrl;
                }
            }
        } catch (error) {
            console.error("[WebSocket] Error parsing message:", error);
            console.error("Raw message:", event.data);
        }
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`[WebSocket] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.error('[WebSocket] Connection died');
        }
    };

    socket.onerror = function(error) {
        console.error(`[WebSocket] Error: ${error.message}`);
    };

    // Create a new p5.Graphics for the camera-feed overlay
    cameraFeedOverlay = createGraphics(1, 1); // Will resize dynamically
    cameraFeedOverlay.elt.style.position = 'absolute';
    cameraFeedOverlay.elt.style.top = '0';
    cameraFeedOverlay.elt.style.left = '0';
    cameraFeedOverlay.elt.style.pointerEvents = 'none';
    cameraFeedOverlay.elt.style.zIndex = '2';
    cameraFeedOverlay.elt.style.display = 'block'; // Ensure always visible
    // Attach to #camera-overlay
    if (overlayContainer) {
        overlayContainer.appendChild(cameraFeedOverlay.elt);
    }

    function resizeCameraFeedOverlay() {
        const video = document.getElementById('camera-feed');
        if (!video) return;
        const rect = video.getBoundingClientRect();
        cameraFeedOverlay.resizeCanvas(rect.width, rect.height);
        cameraFeedOverlay.elt.style.width = rect.width + 'px';
        cameraFeedOverlay.elt.style.height = rect.height + 'px';
    }
    // Initial resize
    setTimeout(resizeCameraFeedOverlay, 100);
    window.addEventListener('resize', resizeCameraFeedOverlay);
    // Also resize overlay when camera-feed loads a new frame
    const videoEl = document.getElementById('camera-feed');
    if (videoEl) {
        videoEl.addEventListener('load', resizeCameraFeedOverlay);
    }
}

function updateFingerBlobOverlay(handIndexX, handIndexY, state) {
    const overlay = document.getElementById('finger-blob-overlay');
    const canvasEl = document.getElementById('defaultCanvas0');
    if (!overlay || !canvasEl) return;
    let blob = overlay.querySelector('.finger-blob');
    if (!blob) {
        blob = document.createElement('div');
        blob.className = 'finger-blob';
        overlay.appendChild(blob);
    }
    // Set color based on state
    let color = '#fff';
    if (state === 'hover') color = '#a1c8ff';
    if (state === 'transform') color = '#2d78e1';
    blob.style.background = color;

    // Get canvas position and scale relative to overlay
    const canvasRect = canvasEl.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    // Calculate scale between p5 canvas and DOM canvas
    const scaleX = canvasRect.width / canvasWidth;
    const scaleY = canvasRect.height / canvasHeight;
    // Map handIndexX/Y (p5 coordinates) to DOM coordinates within overlay
    let domX = canvasRect.left - overlayRect.left + handIndexX * scaleX;
    let domY = canvasRect.top - overlayRect.top + handIndexY * scaleY;
    // Clamp blob to canvas bounds (centered)
    const r = 16; // blob radius
    domX = Math.max(canvasRect.left - overlayRect.left + r, Math.min(domX, canvasRect.left - overlayRect.left + canvasRect.width - r));
    domY = Math.max(canvasRect.top - overlayRect.top + r, Math.min(domY, canvasRect.top - overlayRect.top + canvasRect.height - r));
    blob.style.left = (domX - r) + 'px';
    blob.style.top = (domY - r) + 'px';
}

function getBlobColor(state) {
    // Returns the color for a given state
    if (state === 'transform') return '#2d78e1'; // blue
    if (state === 'hover') return '#a1c8ff'; // light blue
    return '#fff'; // idle/default
}

function draw() {
    // Clear both canvases
    background(255);
    cameraCanvas.clear();
    cameraCanvas.background(255, 255, 255, 76); // 30% opacity
    console.log('[Overlay] Cleared camera overlay and set transparent background');

    let handIndexX = -1;
    let handIndexY = -1;
    let thumbX = -1, thumbY = -1;
    let pinkyX = -1, pinkyY = -1;

    // Camera and container aspect ratios
    const camAspect = 4 / 3; // Most webcams, or set to your backend's aspect
    const container = document.getElementById('camera-feed');
    const containerRect = container ? container.getBoundingClientRect() : null;
    const containerAspect = containerRect ? containerRect.width / containerRect.height : camAspect;

    if (handData.index_pos) {
        // Remap normalized coordinates to visible region
        const mapped = remapHandCoordsToVisibleRegion(handData.index_pos.x, handData.index_pos.y, camAspect, containerAspect);
        handIndexX = mapped.x * width;
        handIndexY = mapped.y * height;
    }
    if (handData.thumb_pos) {
        const mapped = remapHandCoordsToVisibleRegion(handData.thumb_pos.x, handData.thumb_pos.y, camAspect, containerAspect);
        thumbX = mapped.x * width;
        thumbY = mapped.y * height;
    }
    if (handData.pinky_pos) {
        const mapped = remapHandCoordsToVisibleRegion(handData.pinky_pos.x, handData.pinky_pos.y, camAspect, containerAspect);
        pinkyX = mapped.x * width;
        pinkyY = mapped.y * height;
    }

    // Calculate finger blob state (now includes hover logic)
    let blobState = 'idle';
    let isHovering = false;
    if (handData.index_pos) {
        for (let elem of draggableElements) {
            if (!elem.isBackground && 
                handIndexX > elem.x && handIndexX < elem.x + elem.w &&
                handIndexY > elem.y && handIndexY < elem.y + elem.h) {
                isHovering = true;
                break;
            }
        }
    }
    if (selectedElement) {
        blobState = 'transform';
    } else if (handData.is_selecting) {
        blobState = 'hover';
    } else if (isHovering) {
        blobState = 'hover';
    }

    // Draw finger blobs and labels on camera overlay
    cameraCanvas.push();
    cameraCanvas.noStroke();
    cameraCanvas.textFont(yzeFont);
    cameraCanvas.textSize(14);
    cameraCanvas.textStyle(NORMAL);
    cameraCanvas.textAlign(cameraCanvas.LEFT, cameraCanvas.CENTER);
    cameraCanvas.fill(255, 255, 255);
    cameraCanvas.drawingContext.letterSpacing = '0.02em';
    console.log('[Overlay] Drawing blobs and labels on camera overlay');
    
    // Index finger blob - white by default, blue when selecting
    if (handData.index_pos) {
        // Determine state
        let status = 'Idle';
        let blobColor = cameraCanvas.color(255, 255, 255, 76); // 30% opacity
        if (selectedElement) {
            status = 'Transforming';
            blobColor = cameraCanvas.color(45, 120, 225, 76); // blue, 30%
        } else if (handData.is_selecting) {
            status = 'Selecting';
            blobColor = cameraCanvas.color(161, 200, 255, 76); // light blue, 30%
        }
        cameraCanvas.fill(blobColor);
        cameraCanvas.ellipse(handIndexX, handIndexY, 20, 20);
        // Status text to the right
        cameraCanvas.fill(255);
        cameraCanvas.text(status, handIndexX + 16, handIndexY);
    }
    
    // Thumb blob - #a1c8ff
    if (handData.thumb_pos) {
        cameraCanvas.fill(255, 255, 255, 204); // 80% opacity
        cameraCanvas.ellipse(thumbX, thumbY, 20, 20);
    }
    
    // Pinky blob - #a1c8ff
    if (handData.pinky_pos) {
        cameraCanvas.fill(255, 255, 255, 204); // 80% opacity
        cameraCanvas.ellipse(pinkyX, pinkyY, 20, 20);
    }

    // Draw connection lines and status messages
    if (selectedElement && handData.is_selecting) {
        cameraCanvas.fill(255, 0, 0, 100);
        cameraCanvas.textAlign(cameraCanvas.CENTER, cameraCanvas.CENTER);
        cameraCanvas.textSize(32);
        cameraCanvas.text("TRANSFORMING", width / 2, height - 50);
        if (handData.thumb_pos && handData.pinky_pos) {
            cameraCanvas.stroke(255, 100, 0, 150);
            cameraCanvas.strokeWeight(3);
            cameraCanvas.line(thumbX, thumbY, pinkyX, pinkyY);
        }
        console.log('[Overlay] Drawing TRANSFORMING status and connection line on camera overlay');
    } else if (handData.is_selecting) {
        cameraCanvas.fill(255, 0, 0, 100);
        cameraCanvas.textAlign(cameraCanvas.CENTER, cameraCanvas.CENTER);
        cameraCanvas.textSize(32);
        cameraCanvas.text("SELECTING", width / 2, height - 50);
        if (handData.index_pos && handData.thumb_pos) {
            cameraCanvas.stroke(255, 0, 0, 150);
            cameraCanvas.strokeWeight(2);
            cameraCanvas.line(handIndexX, handIndexY, thumbX, thumbY);
        }
        console.log('[Overlay] Drawing SELECTING status and connection line on camera overlay');
    }

    // Draw the index finger blob on the main canvas with drop shadow
    if (handData.index_pos) {
        push();
        noStroke();
        // Determine blob color based on state
        let blobColor = getBlobColor(blobState);
        fill(blobColor);
        drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
        drawingContext.shadowBlur = 2;
        drawingContext.shadowOffsetY = 3;
        drawingContext.shadowOffsetX = 0;
        ellipse(handIndexX, handIndexY, BLOB_RADIUS * 2, BLOB_RADIUS * 2);
        drawingContext.shadowColor = 'transparent';
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetY = 0;
        drawingContext.shadowOffsetX = 0;
        pop();
    }

    // Display draggable elements
    let bgElem = draggableElements.find(el => el.isBackground);
    if (bgElem) {
        push();
        translate(bgElem.x + bgElem.w / 2, bgElem.y + bgElem.h / 2);
        rotate(bgElem.angle);
        scale(bgElem.elementScale);
        imageMode(CENTER);
        image(bgElem.img, 0, 0, bgElem.baseW, bgElem.baseH);
        console.log('[Overlay] Drawing background element on main canvas');
        pop();
    }

    for (let i = 0; i < draggableElements.length; i++) {
        let elem = draggableElements[i];
        if (elem.isBackground) continue;
        
        push();
        translate(elem.x + elem.w / 2, elem.y + elem.h / 2);
        rotate(elem.angle);
        scale(elem.elementScale);
        imageMode(CENTER);
        image(elem.img, 0, 0, elem.baseW, elem.baseH);
        console.log(`[Overlay] Drawing draggable element ${elem.id} on main canvas`);
        pop();
    }

    // Interaction logic
    if (handData.is_selecting) {
        if (!selectedElement && handData.index_pos) { // If not already dragging, try to select
            for (let i = draggableElements.length - 1; i >= 0; i--) {
                let elem = draggableElements[i];
                if (elem.isBackground) continue; // Skip background element for selection

                // Check if handIndex is within the element's bounding box
                let selectionX = handIndexX;
                let selectionY = handIndexY;

                if (selectionX > elem.x && selectionX < elem.x + elem.w &&
                    selectionY > elem.y && selectionY < elem.y + elem.h) {
                    selectedElement = elem;
                    selectedElement.offsetX = selectionX - elem.x;
                    selectedElement.offsetY = selectionY - elem.y;
                    selectedElement.initialScaleOnSelect = selectedElement.elementScale;
                    selectedElement.initialAngleOnSelect = selectedElement.angle;

                    if (handData.thumb_pos && handData.pinky_pos) {
                        initialPinkyThumbDist = dist(thumbX, thumbY, pinkyX, pinkyY);
                        if (initialPinkyThumbDist < 1) initialPinkyThumbDist = 1;
                        initialPinkyThumbAngle = atan2(pinkyY - thumbY, pinkyX - thumbX);
                    } else {
                        initialPinkyThumbDist = 0;
                    }

                    draggableElements.splice(i, 1);
                    draggableElements.push(selectedElement);
                    break;
                }
            }
        }
    } else {
        if (selectedElement) {
            selectedElement = null;
        }
    }

    // Update transformations if an element is being dragged/selected
    if (selectedElement && handData.is_selecting) {
        if (handData.index_pos) {
            selectedElement.x = handIndexX - selectedElement.offsetX;
            selectedElement.y = handIndexY - selectedElement.offsetY;
        }

        if (handData.thumb_pos && handData.pinky_pos && initialPinkyThumbDist > 0) {
            let currentPinkyThumbDist = dist(thumbX, thumbY, pinkyX, pinkyY);
            let gestureScaleRatio = currentPinkyThumbDist / initialPinkyThumbDist;
            
            if (gestureScaleRatio > 0) {
                let effectiveGestureScale = 1.0;
                if (gestureScaleRatio > 1.0) {
                    effectiveGestureScale = 1.0 + (pow(gestureScaleRatio, SCALE_SENSITIVITY) - 1.0);
                } else {
                    effectiveGestureScale = 1.0 - (1.0 - pow(gestureScaleRatio, 1.0/SCALE_SENSITIVITY));
                }
                let targetScale = selectedElement.initialScaleOnSelect * effectiveGestureScale;
                selectedElement.elementScale = constrain(targetScale, MIN_SCALE, MAX_SCALE);
            } else {
                selectedElement.elementScale = constrain(selectedElement.initialScaleOnSelect, MIN_SCALE, MAX_SCALE);
            }

            selectedElement.w = selectedElement.baseW * selectedElement.elementScale;
            selectedElement.h = selectedElement.baseH * selectedElement.elementScale;

            let currentPinkyThumbAngle = atan2(pinkyY - thumbY, pinkyX - thumbX);
            let gestureAngleChange = currentPinkyThumbAngle - initialPinkyThumbAngle;
            selectedElement.angle = selectedElement.initialAngleOnSelect + gestureAngleChange;
        } else if (selectedElement) {
            selectedElement.w = selectedElement.baseW * selectedElement.elementScale;
            selectedElement.h = selectedElement.baseH * selectedElement.elementScale;
        }
    }

    if (handData.index_pos) {
        updateFingerBlobOverlay(handIndexX, handIndexY, blobState);
    } else {
        // Hide blob if no hand
        const overlay = document.getElementById('finger-blob-overlay');
        if (overlay) {
            const blob = overlay.querySelector('.finger-blob');
            if (blob) blob.style.display = 'none';
        }
    }

    // At the end of draw, if hand is present, ensure blob is visible
    if (handData.index_pos) {
        const overlay = document.getElementById('finger-blob-overlay');
        if (overlay) {
            const blob = overlay.querySelector('.finger-blob');
            if (blob) blob.style.display = '';
        }
    }

    // Draw line and label between pinky and index
    if (handData.index_pos && handData.pinky_pos) {
        cameraCanvas.stroke(255, 255, 255, 204);
        cameraCanvas.strokeWeight(2);
        cameraCanvas.line(handIndexX, handIndexY, pinkyX, pinkyY);
        // Draw 'Scale & Rotate' label at midpoint
        let midX = (handIndexX + pinkyX) / 2;
        let midY = (handIndexY + pinkyY) / 2;
        let angle = Math.atan2(pinkyY - handIndexY, pinkyX - handIndexX);
        cameraCanvas.push();
        cameraCanvas.translate(midX, midY);
        cameraCanvas.rotate(angle);
        cameraCanvas.noStroke();
        cameraCanvas.fill(255);
        cameraCanvas.textFont(yzeFont);
        cameraCanvas.textSize(14);
        cameraCanvas.text('Scale & Rotate', 0, -10);
        cameraCanvas.pop();
    }
    cameraCanvas.pop();

    // --- CAMERA FEED OVERLAY DRAW ---
    cameraFeedOverlay.clear();
    const video = document.getElementById('camera-feed');
    const overlayW = cameraFeedOverlay.width;
    const overlayH = cameraFeedOverlay.height;
    // Draw debug border and label so overlay is always visible
    // (Remove or comment out for production)
    // cameraFeedOverlay.push();
    // cameraFeedOverlay.noFill();
    // cameraFeedOverlay.stroke(255, 0, 0);
    // cameraFeedOverlay.strokeWeight(2);
    // cameraFeedOverlay.rect(1, 1, overlayW-2, overlayH-2);
    // cameraFeedOverlay.textAlign(CENTER, TOP);
    // cameraFeedOverlay.textSize(18);
    // cameraFeedOverlay.fill(255, 0, 0);
    // cameraFeedOverlay.noStroke();
    // cameraFeedOverlay.text('Overlay Active', overlayW/2, 8);
    // cameraFeedOverlay.pop();
    if (video && video.width && video.height) {
        const camAspect = video.naturalWidth && video.naturalHeight ? video.naturalWidth / video.naturalHeight : 4 / 3;
        const containerAspect = overlayW / overlayH;
        let idx = null, thb = null, pky = null;
        if (handData.index_pos) {
            const mapped = remapHandCoordsToVisibleRegion(handData.index_pos.x, handData.index_pos.y, camAspect, containerAspect);
            idx = { x: mapped.x * overlayW, y: mapped.y * overlayH };
        }
        if (handData.thumb_pos) {
            const mapped = remapHandCoordsToVisibleRegion(handData.thumb_pos.x, handData.thumb_pos.y, camAspect, containerAspect);
            thb = { x: mapped.x * overlayW, y: mapped.y * overlayH };
        }
        if (handData.pinky_pos) {
            const mapped = remapHandCoordsToVisibleRegion(handData.pinky_pos.x, handData.pinky_pos.y, camAspect, containerAspect);
            pky = { x: mapped.x * overlayW, y: mapped.y * overlayH };
        }
        // Draw lines
        cameraFeedOverlay.push();
        cameraFeedOverlay.stroke(255, 255, 255, 204); // white, 80% opacity
        cameraFeedOverlay.strokeWeight(2);
        if (idx && pky) {
            cameraFeedOverlay.line(idx.x, idx.y, pky.x, pky.y);
        }
        if (idx && thb) {
            cameraFeedOverlay.line(idx.x, idx.y, thb.x, thb.y);
        }
        cameraFeedOverlay.pop();
        // Draw blobs
        cameraFeedOverlay.push();
        cameraFeedOverlay.noStroke();
        cameraFeedOverlay.drawingContext.shadowColor = 'rgba(0,0,0,0.3)';
        cameraFeedOverlay.drawingContext.shadowBlur = 2;
        cameraFeedOverlay.drawingContext.shadowOffsetY = 3;
        cameraFeedOverlay.drawingContext.shadowOffsetX = 0;
        // Index blob
        if (idx) {
            cameraFeedOverlay.fill(getBlobColor(blobState));
            cameraFeedOverlay.ellipse(idx.x, idx.y, BLOB_RADIUS * 2, BLOB_RADIUS * 2);
        }
        // Thumb blob
        if (thb) {
            cameraFeedOverlay.fill('#fff');
            cameraFeedOverlay.ellipse(thb.x, thb.y, BLOB_RADIUS * 2, BLOB_RADIUS * 2);
        }
        // Pinky blob
        if (pky) {
            cameraFeedOverlay.fill('#fff');
            cameraFeedOverlay.ellipse(pky.x, pky.y, BLOB_RADIUS * 2, BLOB_RADIUS * 2);
        }
        cameraFeedOverlay.drawingContext.shadowColor = 'transparent';
        cameraFeedOverlay.drawingContext.shadowBlur = 0;
        cameraFeedOverlay.drawingContext.shadowOffsetY = 0;
        cameraFeedOverlay.drawingContext.shadowOffsetX = 0;
        cameraFeedOverlay.pop();
        // Draw text labels
        cameraFeedOverlay.push();
        cameraFeedOverlay.textFont(yzeFont);
        cameraFeedOverlay.textSize(14);
        cameraFeedOverlay.fill(255);
        cameraFeedOverlay.drawingContext.letterSpacing = '0.02em';
        // Pinky-Index: 'Scale & Rotate' (above midpoint, no rotation)
        if (idx && pky) {
            let midX = (idx.x + pky.x) / 2;
            let midY = (idx.y + pky.y) / 2;
            cameraFeedOverlay.textAlign(CENTER, BOTTOM);
            cameraFeedOverlay.text('Scale & Rotate', midX, midY - BLOB_RADIUS - 4);
        }
        // Index-Thumb: 'Tap to Select' or 'Release to Deselect' (to the right of midpoint, no rotation)
        if (idx && thb) {
            let midX = (idx.x + thb.x) / 2;
            let midY = (idx.y + thb.y) / 2;
            let label = (handData.is_selecting && !selectedElement) ? 'Tap to Select' : (selectedElement ? 'Release to\nDeselect' : 'Tap to Select');
            cameraFeedOverlay.textAlign(LEFT, CENTER);
            cameraFeedOverlay.text(label, midX + BLOB_RADIUS + 8, midY);
        }
        // Index: status above (now includes 'Select?' for hover)
        if (idx) {
            let status = 'Idle';
            if (selectedElement) status = 'Transforming';
            else if (handData.is_selecting) status = 'Select';
            else if (blobState === 'hover') status = 'Select?';
            cameraFeedOverlay.textAlign(CENTER, BOTTOM);
            cameraFeedOverlay.text(status, idx.x, idx.y - BLOB_RADIUS - 8);
        }
        cameraFeedOverlay.pop();
    }
}

function forceRepaint() {
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = '';
}
window.addEventListener('resize', forceRepaint);
window.addEventListener('fullscreenchange', forceRepaint);