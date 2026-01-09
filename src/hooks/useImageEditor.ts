import { useRef, useState, useCallback, useEffect } from "react";
import { CropState, ResizeHandle, Filter, Point, CropRect } from "../types/image-editor";
import {
    boundCoordinates,
    flipAspectRatio,
    getCropRect,
    getResizeHandle,
    isInsideCropArea,
    getCanvasCoordinates,
    applySecureBlur,
} from "../utils/image-utils";
import { BlurMode, Tool, TextObject } from "../types/image-editor";

export const useImageEditor = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [currentTool, setCurrentTool] = useState<Tool>("pencil");
    const [currentColor, setCurrentColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(25);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [cropMode, setCropMode] = useState(false);
    const [cropStart, setCropStart] = useState<Point | null>(null);
    const [cropEnd, setCropEnd] = useState<Point | null>(null);
    const [cropState, setCropState] = useState<CropState>("inactive");
    const [isDrawing, setIsDrawing] = useState(false);
    const [cropGuide, setCropGuide] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Point | null>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [currentFilter, setCurrentFilter] = useState<Filter>("none");

    const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
    const [cursorStyle, setCursorStyle] = useState("default");
    const [lastTouchTime, setLastTouchTime] = useState<{ [key: string]: number }>({});
    const [aspectRatios, setAspectRatios] = useState<{ [key: string]: string }>({});
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [customRatioX, setCustomRatioX] = useState("2");
    const [customRatioY, setCustomRatioY] = useState("1");
    const [customWidth, setCustomWidth] = useState("1920");
    const [customHeight, setCustomHeight] = useState("1080");

    const [blurRadius, setBlurRadius] = useState(10);
    const [blurMode, setBlurMode] = useState<BlurMode>("marked");

    const [fontFamily, setFontFamily] = useState("Arial");

    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [isMovingText, setIsMovingText] = useState(false);
    const [textDragOffset, setTextDragOffset] = useState<Point>({ x: 0, y: 0 });

    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                setHistory((prev) => {
                    const newHistory = prev.slice(0, historyIndex + 1);
                    newHistory.push(currentImageData);
                    return newHistory;
                });
                setHistoryIndex((prev) => prev + 1);
            }
        }
    }, [historyIndex]);

    const restoreCanvasState = useCallback((state: ImageData) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                canvas.width = state.width;
                canvas.height = state.height;
                ctx.putImageData(state, 0, 0);
            }
        }
    }, []);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [history.length, historyIndex]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 1. Draw the "baked" image data
        if (historyIndex >= 0) {
            const lastState = history[historyIndex];
            if (canvas.width !== lastState.width || canvas.height !== lastState.height) {
                canvas.width = lastState.width;
                canvas.height = lastState.height;
            }
            ctx.putImageData(lastState, 0, 0);
        } else if (imageData) {
            if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
                canvas.width = imageData.width;
                canvas.height = imageData.height;
            }
            ctx.putImageData(imageData, 0, 0);
        }

        // 2. Draw all Text Objects
        textObjects.forEach(obj => {
            ctx.save();
            ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
            ctx.fillStyle = obj.color;
            ctx.textBaseline = "top";

            // Selection Highlight
            if (obj.id === selectedTextId) {
                const metrics = ctx.measureText(obj.text);
                const height = obj.fontSize * 2;
                ctx.strokeStyle = "#4F46E5"; // Indigo-600
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(obj.x - 2, obj.y - 2, metrics.width + 4, height + 4);
            }

            ctx.fillText(obj.text, obj.x, obj.y);
            ctx.restore();
        });
    }, [history, historyIndex, imageData, textObjects, selectedTextId]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const handleCropButtonClick = useCallback(
        (ratio: string) => {
            setCropMode(true);
            setCropGuide(ratio);
            setCropStart(null);
            setCropEnd(null);
            setCropState("inactive");
            setDragOffset(null);
            setActiveHandle(null);

            if (history.length > 0) {
                restoreCanvasState(history[historyIndex]);
            } else {
                saveCanvasState();
            }
        },
        [saveCanvasState, history, historyIndex, restoreCanvasState],
    );

    const handleCropButtonDoubleClick = useCallback(
        (ratio: string) => {
            const flippedRatio = flipAspectRatio(ratio);
            setAspectRatios((prev) => ({ ...prev, [ratio]: flippedRatio }));
            handleCropButtonClick(flippedRatio);
        },
        [handleCropButtonClick],
    );

    const handleCropButtonTouchEnd = useCallback(
        (ratio: string, e: React.TouchEvent) => {
            e.preventDefault();
            const now = Date.now();
            const lastTouch = lastTouchTime[ratio] || 0;

            if (now - lastTouch < 300) {
                const flippedRatio = flipAspectRatio(aspectRatios[ratio] || ratio);
                setAspectRatios((prev) => ({ ...prev, [ratio]: flippedRatio }));
                handleCropButtonClick(flippedRatio);
            } else {
                handleCropButtonClick(aspectRatios[ratio] || ratio);
            }

            setLastTouchTime((prev) => ({ ...prev, [ratio]: now }));
        },
        [lastTouchTime, aspectRatios, handleCropButtonClick],
    );

    const cancelCrop = useCallback(() => {
        setCropMode(false);
        setCropStart(null);
        setCropEnd(null);
        setCropGuide(null);
        setCropState("inactive");
        setDragOffset(null);
        setActiveHandle(null);
        setCursorStyle("default");
        if (history.length > 0) {
            restoreCanvasState(history[historyIndex]);
        }
    }, [history, historyIndex, restoreCanvasState]);

    const rotateImage = useCallback(
        (degrees: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            saveCanvasState();

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            if (!tempCtx) return;

            if (degrees === 90 || degrees === 270) {
                tempCanvas.width = canvas.height;
                tempCanvas.height = canvas.width;
            } else {
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
            }

            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate((degrees * Math.PI) / 180);
            tempCtx.drawImage(
                canvas,
                -canvas.width / 2,
                -canvas.height / 2,
                canvas.width,
                canvas.height,
            );

            canvas.width = tempCanvas.width;
            canvas.height = tempCanvas.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
        },
        [saveCanvasState],
    );

    const applyFilter = useCallback((filter: Filter) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setImageData(currentImageData);

        if (filter === "none") {
            setCurrentFilter(filter);
            return;
        }

        const data = currentImageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i],
                g = data[i + 1],
                b = data[i + 2];

            if (filter === "grayscale") {
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                data[i] = data[i + 1] = data[i + 2] = gray;
            } else if (filter === "sepia") {
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            } else if (filter === "vintage") {
                data[i] = Math.min(255, r * 1.2);
                data[i + 1] = Math.min(255, g * 1.1);
                data[i + 2] = Math.min(255, b * 0.8);
            }
        }

        ctx.putImageData(currentImageData, 0, 0);
        setCurrentFilter(filter);
    }, []);

    const applyAdjustments = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !imageData) return;

        ctx.putImageData(imageData, 0, 0);
        const data = imageData.data;

        const brightnessAdj = (brightness - 100) * 2.55;
        const contrastAdj = contrast / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i] + brightnessAdj;
            let g = data[i + 1] + brightnessAdj;
            let b = data[i + 2] + brightnessAdj;

            r = (r - 128) * contrastAdj + 128;
            g = (g - 128) * contrastAdj + 128;
            b = (b - 128) * contrastAdj + 128;

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
    }, [brightness, contrast, imageData]);

    useEffect(() => {
        if (imageData) applyAdjustments();
    }, [brightness, contrast, applyAdjustments, imageData]);

    const flipImage = useCallback(
        (direction: "horizontal" | "vertical") => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            if (direction === "horizontal") {
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
            } else {
                ctx.scale(1, -1);
                ctx.translate(0, -canvas.height);
            }

            ctx.putImageData(currentImageData, 0, 0);
            ctx.restore();
            saveCanvasState();
        },
        [saveCanvasState],
    );

    const resizeImage = useCallback(
        (newWidth: number, newHeight: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            if (!tempCtx) return;

            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.putImageData(currentImageData, 0, 0);

            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.clearRect(0, 0, newWidth, newHeight);
            ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
            saveCanvasState();
        },
        [saveCanvasState],
    );

    const updateCursorStyle = useCallback(
        (mouseX: number, mouseY: number) => {
            if (!cropMode || cropState === "creating") {
                setCursorStyle("crosshair");
                return;
            }

            const rect = getCropRect(cropStart, cropEnd);
            const handle = getResizeHandle(mouseX, mouseY, rect);
            if (handle) {
                const cursors = {
                    nw: "nw-resize",
                    ne: "ne-resize",
                    sw: "sw-resize",
                    se: "se-resize",
                };
                setCursorStyle(cursors[handle]);
            } else if (isInsideCropArea(mouseX, mouseY, rect)) {
                setCursorStyle("move");
            } else {
                setCursorStyle("crosshair");
            }
        },
        [cropMode, cropState, cropStart, cropEnd],
    );

    const drawCropOverlay = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || history.length === 0 || !cropStart || !cropEnd) return;

        const imageDataState = history[historyIndex];
        if (!imageDataState) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.putImageData(imageDataState, 0, 0);

        const rect = getCropRect(cropStart, cropEnd);
        if (!rect) return;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, rect.y);
        ctx.fillRect(
            0,
            rect.y + rect.height,
            canvas.width,
            canvas.height - rect.y - rect.height,
        );
        ctx.fillRect(0, rect.y, rect.x, rect.height);
        ctx.fillRect(
            rect.x + rect.width,
            rect.y,
            canvas.width - rect.x - rect.width,
            rect.height,
        );

        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);

        const handleSize = 12;
        ctx.fillStyle = "#00ff00";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;

        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x, y: rect.y + rect.height },
            { x: rect.x + rect.width, y: rect.y + rect.height },
        ];

        corners.forEach((corner) => {
            ctx.fillRect(
                corner.x - handleSize / 2,
                corner.y - handleSize / 2,
                handleSize,
                handleSize,
            );
            ctx.strokeRect(
                corner.x - handleSize / 2,
                corner.y - handleSize / 2,
                handleSize,
                handleSize,
            );
        });

        ctx.fillStyle = "#00ff00";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            `${Math.round(rect.width)} \u00d7 ${Math.round(rect.height)}`,
            rect.x + rect.width / 2,
            rect.y - 10,
        );
    }, [cropStart, cropEnd, history, historyIndex]);

    const handleStart = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const { x, y } = getCanvasCoordinates(e, canvas);

            if (cropMode) {
                if (history.length === 0) {
                    saveCanvasState();
                }

                if (cropState === "inactive" || cropState === "creating") {
                    setCropStart({ x, y });
                    setCropEnd({ x, y });
                    setCropState("creating");
                } else if (cropState === "set") {
                    const rect = getCropRect(cropStart, cropEnd);
                    const handle = getResizeHandle(x, y, rect);
                    if (handle) {
                        setActiveHandle(handle);
                        setCropState("resizing");
                    } else if (isInsideCropArea(x, y, rect)) {
                        if (rect) {
                            setDragOffset({ x: x - rect.x, y: y - rect.y });
                            setCropState("moving");
                        }
                    } else {
                        setCropStart({ x, y });
                        setCropEnd({ x, y });
                        setCropState("creating");
                    }
                }
            } else if (currentTool === "text") {
                // Hit detection for existing text
                const ctx = canvas.getContext("2d");
                let foundId = null;
                if (ctx) {
                    // Search in reverse so top-most is selected first
                    for (let i = textObjects.length - 1; i >= 0; i--) {
                        const obj = textObjects[i];
                        ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
                        const metrics = ctx.measureText(obj.text);
                        const height = obj.fontSize * 2;
                        if (x >= obj.x && x <= obj.x + metrics.width &&
                            y >= obj.y && y <= obj.y + height) {
                            foundId = obj.id;
                            break;
                        }
                    }
                }

                if (foundId) {
                    setSelectedTextId(foundId);
                    const obj = textObjects.find(o => o.id === foundId)!;
                    setTextDragOffset({ x: x - obj.x, y: y - obj.y });
                    setIsMovingText(true);
                } else {
                    setSelectedTextId(null);
                    const text = prompt("Enter text:");
                    if (text) {
                        const newText: TextObject = {
                            id: Date.now().toString(),
                            text,
                            x,
                            y,
                            fontSize: brushSize,
                            fontFamily,
                            color: currentColor,
                        };
                        setTextObjects(prev => [...prev, newText]);
                        setSelectedTextId(newText.id);
                    }
                }
            } else if (currentTool === "blur") {
                setIsDrawing(true);
                if (!maskCanvasRef.current) {
                    maskCanvasRef.current = document.createElement("canvas");
                    maskCanvasRef.current.width = canvas.width;
                    maskCanvasRef.current.height = canvas.height;
                }
                const maskCtx = maskCanvasRef.current.getContext("2d");
                if (maskCtx) {
                    maskCtx.strokeStyle = "rgba(0,0,0,1)";
                    maskCtx.lineWidth = brushSize * 2;
                    maskCtx.lineCap = "round";
                    maskCtx.beginPath();
                    maskCtx.moveTo(x, y);
                }
            } else {
                setIsDrawing(true);
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.strokeStyle = currentColor;
                    ctx.lineWidth = brushSize;
                    ctx.lineCap = "round";
                    ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                }
            }

            e.preventDefault();
        },
        [
            cropMode,
            cropState,
            cropStart,
            cropEnd,
            history,
            saveCanvasState,
            currentColor,
            brushSize,
            currentTool,
        ],
    );

    const handleMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const { x, y } = getCanvasCoordinates(e, canvas);

            updateCursorStyle(x, y);

            if (cropMode) {
                if (!cropStart) return;

                if (cropState === "creating") {
                    let endX = x;
                    let endY = y;

                    if (cropGuide) {
                        const [ratioW, ratioH] = cropGuide.split(":").map(Number);
                        const targetRatio = ratioW / ratioH;
                        const width = Math.abs(x - cropStart.x);
                        const height = Math.abs(y - cropStart.y);

                        if (width / height > targetRatio) {
                            endY = cropStart.y + (y > cropStart.y ? width / targetRatio : -width / targetRatio);
                        } else {
                            endX = cropStart.x + (x > cropStart.x ? height * targetRatio : -height * targetRatio);
                        }

                        const bounded = boundCoordinates(endX, endY, canvas);
                        endX = bounded.x;
                        endY = bounded.y;
                    }

                    setCropEnd({ x: endX, y: endY });
                } else if (cropState === "moving" && dragOffset && cropEnd) {
                    const rect = getCropRect(cropStart, cropEnd);
                    if (!rect) return;

                    const newX = x - dragOffset.x;
                    const newY = y - dragOffset.y;

                    const boundedX = Math.max(0, Math.min(newX, canvas.width - rect.width));
                    const boundedY = Math.max(0, Math.min(newY, canvas.height - rect.height));

                    setCropStart({ x: boundedX, y: boundedY });
                    setCropEnd({ x: boundedX + rect.width, y: boundedY + rect.height });
                } else if (cropState === "resizing" && activeHandle && cropEnd) {
                    let newCropEnd = { ...cropEnd };
                    let newCropStart = { ...cropStart };

                    if (activeHandle.includes("e")) newCropEnd.x = x;
                    if (activeHandle.includes("w")) newCropStart.x = x;
                    if (activeHandle.includes("s")) newCropEnd.y = y;
                    if (activeHandle.includes("n")) newCropStart.y = y;

                    if (cropGuide) {
                        const [ratioW, ratioH] = cropGuide.split(":").map(Number);
                        const targetRatio = ratioW / ratioH;
                        let width = newCropEnd.x - newCropStart.x;
                        let height = newCropEnd.y - newCropStart.y;

                        if (activeHandle === "nw") {
                            if (Math.abs(width) / Math.abs(height) > targetRatio) {
                                newCropStart.x = newCropEnd.x - Math.abs(height) * targetRatio * (width < 0 ? -1 : 1);
                            } else {
                                newCropStart.y = newCropEnd.y - (Math.abs(width) / targetRatio) * (height < 0 ? -1 : 1);
                            }
                        } else if (activeHandle === "ne") {
                            if (Math.abs(width) / Math.abs(height) > targetRatio) {
                                newCropEnd.x = newCropStart.x + Math.abs(height) * targetRatio * (width > 0 ? 1 : -1);
                            } else {
                                newCropStart.y = newCropEnd.y - (Math.abs(width) / targetRatio) * (height < 0 ? -1 : 1);
                            }
                        } else if (activeHandle === "sw") {
                            if (Math.abs(width) / Math.abs(height) > targetRatio) {
                                newCropStart.x = newCropEnd.x - Math.abs(height) * targetRatio * (width < 0 ? -1 : 1);
                            } else {
                                newCropEnd.y = newCropStart.y + (Math.abs(width) / targetRatio) * (height > 0 ? 1 : -1);
                            }
                        } else if (activeHandle === "se") {
                            if (Math.abs(width) / Math.abs(height) > targetRatio) {
                                newCropEnd.x = newCropStart.x + Math.abs(height) * targetRatio * (width > 0 ? 1 : -1);
                            } else {
                                newCropEnd.y = newCropStart.y + (Math.abs(width) / targetRatio) * (height > 0 ? 1 : -1);
                            }
                        }
                    }

                    const boundedStartX = Math.max(0, Math.min(newCropStart.x, canvas.width));
                    const boundedStartY = Math.max(0, Math.min(newCropStart.y, canvas.height));
                    const boundedEndX = Math.max(0, Math.min(newCropEnd.x, canvas.width));
                    const boundedEndY = Math.max(0, Math.min(newCropEnd.y, canvas.height));

                    setCropStart({ x: boundedStartX, y: boundedStartY });
                    setCropEnd({ x: boundedEndX, y: boundedEndY });
                }

                requestAnimationFrame(drawCropOverlay);
            } else if (isMovingText && selectedTextId) {
                setTextObjects(prev => prev.map(obj =>
                    obj.id === selectedTextId
                        ? { ...obj, x: x - textDragOffset.x, y: y - textDragOffset.y }
                        : obj
                ));
            } else if (isDrawing) {
                if (currentTool === "blur") {
                    const maskCtx = maskCanvasRef.current?.getContext("2d");
                    if (maskCtx) {
                        maskCtx.lineTo(x, y);
                        maskCtx.stroke();

                        // Draw visual feedback on main canvas (semi-transparent white overlay-like)
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.save();
                            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
                            ctx.lineWidth = brushSize * 2;
                            ctx.lineCap = "round";
                            ctx.beginPath();
                            ctx.moveTo(x - 1, y - 1);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                } else {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                }
            }
            e.preventDefault();
        },
        [
            cropMode,
            cropStart,
            cropEnd,
            cropState,
            cropGuide,
            dragOffset,
            activeHandle,
            updateCursorStyle,
            drawCropOverlay,
            isDrawing,
        ],
    );

    const handleEnd = useCallback(() => {
        if (cropState === "creating") {
            setCropState("set");
        } else if (cropState === "moving") {
            setCropState("set");
            setDragOffset(null);
        } else if (cropState === "resizing") {
            setCropState("set");
            setActiveHandle(null);
        }
        if (isDrawing) {
            if (currentTool !== "blur") {
                saveCanvasState();
            }
            setIsDrawing(false);
        }
        setIsMovingText(false);
    }, [cropState, isDrawing, saveCanvasState, currentTool]);

    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || currentTool !== "text") return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let foundId = null;
        for (let i = textObjects.length - 1; i >= 0; i--) {
            const obj = textObjects[i];
            ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
            const metrics = ctx.measureText(obj.text);
            const height = obj.fontSize * 2;
            if (x >= obj.x && x <= obj.x + metrics.width &&
                y >= obj.y && y <= obj.y + height) {
                foundId = obj.id;
                break;
            }
        }

        if (foundId) {
            const obj = textObjects.find(o => o.id === foundId)!;
            const newText = prompt("Edit text:", obj.text);
            if (newText !== null) {
                setTextObjects(prev => prev.map(o => o.id === foundId ? { ...o, text: newText } : o));
            }
        }
    }, [currentTool, textObjects]);

    const applyBlurEffect = useCallback(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;

        const ctx = canvas.getContext("2d");
        const maskCtx = maskCanvas.getContext("2d");
        if (!ctx || !maskCtx) return;

        // Ensure we revert the visual feedback before applying the blur
        if (historyIndex >= 0) {
            const lastState = history[historyIndex];
            canvas.width = lastState.width;
            canvas.height = lastState.height;
            ctx.putImageData(lastState, 0, 0);
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        const blurredData = applySecureBlur(imageData, maskData, blurRadius, blurMode);
        ctx.putImageData(blurredData, 0, 0);

        // Clear mask
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Refresh history to include the blur
        saveCanvasState();
    }, [blurRadius, blurMode, saveCanvasState]);

    const applyCrop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cropStart || !cropEnd) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = getCropRect(cropStart, cropEnd);
        if (!rect) return;

        if (rect.width > 0 && rect.height > 0) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = rect.width;
            tempCanvas.height = rect.height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
                const imageDataCrop = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
                tempCtx.putImageData(imageDataCrop, 0, 0);

                canvas.width = rect.width;
                canvas.height = rect.height;
                ctx.clearRect(0, 0, rect.width, rect.height);
                ctx.drawImage(tempCanvas, 0, 0);
                saveCanvasState();
            }
        }

        setCropMode(false);
        setCropStart(null);
        setCropEnd(null);
        setCropGuide(null);
        setCropState("inactive");
        setDragOffset(null);
        setActiveHandle(null);
    }, [cropStart, cropEnd, saveCanvasState]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            const maxWidth = Math.min(window.innerWidth - 50, 1800);
                            const maxHeight = Math.min(window.innerHeight - 200, 1200);

                            let canvasWidth = img.width;
                            let canvasHeight = img.height;

                            if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
                                const scaleX = maxWidth / canvasWidth;
                                const scaleY = maxHeight / canvasHeight;
                                const scale = Math.min(scaleX, scaleY);

                                canvasWidth = Math.floor(canvasWidth * scale);
                                canvasHeight = Math.floor(canvasHeight * scale);
                            }

                            canvas.width = canvasWidth;
                            canvas.height = canvasHeight;
                            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                            saveCanvasState();
                        }
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setImageData(null);
                setHistory([]);
                setHistoryIndex(-1);
            }
        }
    };

    const exportImage = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const link = document.createElement("a");
            link.download = "edited-image.png";
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    return {
        fileInputRef,
        canvasRef,
        currentTool,
        setCurrentTool,
        currentColor,
        setCurrentColor,
        brushSize,
        setBrushSize,
        imageData,
        cropMode,
        setCropMode,
        cropStart,
        setCropStart,
        cropEnd,
        setCropEnd,
        cropState,
        setCropState,
        isDrawing,
        cropGuide,
        setCropGuide,
        brightness,
        setBrightness,
        contrast,
        setContrast,
        currentFilter,
        cursorStyle,
        aspectRatios,
        history,
        historyIndex,
        customRatioX,
        setCustomRatioX,
        customRatioY,
        setCustomRatioY,
        customWidth,
        setCustomWidth,
        customHeight,
        setCustomHeight,
        blurRadius,
        setBlurRadius,
        blurMode,
        setBlurMode,
    };

    const deleteSelectedText = useCallback(() => {
        if (selectedTextId) {
            setTextObjects(prev => prev.filter(obj => obj.id !== selectedTextId));
            setSelectedTextId(null);
        }
    }, [selectedTextId]);

    const bakeText = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        saveCanvasState();
        textObjects.forEach(obj => {
            ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
            ctx.fillStyle = obj.color;
            ctx.textBaseline = "top";
            ctx.fillText(obj.text, obj.x, obj.y);
        });
        setTextObjects([]);
        setSelectedTextId(null);
        saveCanvasState();
    }, [saveCanvasState, textObjects]);

    const editText = useCallback((id: string, newText: string) => {
        setTextObjects(prev => prev.map(obj => (obj.id === id ? { ...obj, text: newText } : obj)));
    }, []);

    return {
        fileInputRef, canvasRef, currentTool, setCurrentTool, currentColor, setCurrentColor, brushSize, setBrushSize, imageData, cropMode, setCropMode, cropStart, setCropStart, cropEnd, setCropEnd, cropState, setCropState, isDrawing, cropGuide, setCropGuide, brightness, setBrightness, contrast, setContrast, currentFilter, cursorStyle, aspectRatios, history, historyIndex, customRatioX, setCustomRatioX, customRatioY, setCustomRatioY, customWidth, setCustomWidth, customHeight, setCustomHeight, blurRadius, setBlurRadius, blurMode, setBlurMode, fontFamily, setFontFamily, textObjects, selectedTextId, setSelectedTextId, deleteSelectedText, bakeText, editText, handleDoubleClick, saveCanvasState, undo, redo, handleCropButtonClick, handleCropButtonDoubleClick, handleCropButtonTouchEnd, cancelCrop, rotateImage, applyFilter, flipImage, resizeImage, handleStart, handleMove, handleEnd, applyCrop, applyBlurEffect, handleFileUpload, triggerFileUpload, clearCanvas, exportImage,
    };
};
