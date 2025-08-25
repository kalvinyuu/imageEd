"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type CropState = "inactive" | "creating" | "set" | "moving" | "resizing";
type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;
type Filter = "none" | "grayscale" | "sepia" | "vintage";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState("pencil");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [cropState, setCropState] = useState<CropState>("inactive");
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropGuide, setCropGuide] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [currentFilter, setCurrentFilter] = useState<Filter>("none");

  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [cursorStyle, setCursorStyle] = useState("default");
  const [lastTouchTime, setLastTouchTime] = useState<{ [key: string]: number }>(
    {},
  );
  const [aspectRatios, setAspectRatios] = useState<{ [key: string]: string }>(
    {},
  );
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [customRatioX, setCustomRatioX] = useState("2");
  const [customRatioY, setCustomRatioY] = useState("1");
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const currentImageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
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
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
    }
  }, [history, historyIndex, restoreCanvasState]);

  const flipAspectRatio = useCallback((ratio: string) => {
    if (ratio === "1:1") return "1:1";
    const [w, h] = ratio.split(":").map(Number);
    return `${h}:${w}`;
  }, []);

  const handleCropButtonClick = useCallback(
    (ratio: string) => {
      setCropMode(true);
      setCropGuide(ratio);
      setCropStart(null);
      setCropEnd(null);
      setCropState("inactive");
      setDragOffset(null);
      setActiveHandle(null);

      // Restore the original image without any crop overlay
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
    [handleCropButtonClick, flipAspectRatio],
  );

  const handleCropButtonTouchEnd = useCallback(
    (ratio: string, e: React.TouchEvent) => {
      e.preventDefault();
      const now = Date.now();
      const lastTouch = lastTouchTime[ratio] || 0;

      if (now - lastTouch < 300) {
        // Double tap - flip aspect ratio
        const flippedRatio = flipAspectRatio(aspectRatios[ratio] || ratio);
        setAspectRatios((prev) => ({ ...prev, [ratio]: flippedRatio }));
        handleCropButtonClick(flippedRatio);
      } else {
        // Single tap - regular crop
        handleCropButtonClick(aspectRatios[ratio] || ratio);
      }

      setLastTouchTime((prev) => ({ ...prev, [ratio]: now }));
    },
    [lastTouchTime, aspectRatios, handleCropButtonClick, flipAspectRatio],
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

      saveCanvasState(); // Save state before rotation

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      // Calculate new dimensions for 90/270 degree rotations
      if (degrees === 90 || degrees === 270) {
        tempCanvas.width = canvas.height;
        tempCanvas.height = canvas.width;
      } else {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
      }

      // Center the image during rotation
      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate((degrees * Math.PI) / 180);
      tempCtx.drawImage(
        canvas,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height,
      );

      // Resize the main canvas to fit the rotated image
      canvas.width = tempCanvas.width;
      canvas.height = tempCanvas.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    },
    [saveCanvasState],
  );

  // Filters & Adjustments
  const applyFilter = useCallback((filter: Filter) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const currentImageData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
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
      // Brightness
      let r = data[i] + brightnessAdj;
      let g = data[i + 1] + brightnessAdj;
      let b = data[i + 2] + brightnessAdj;

      // Contrast
      r = (r - 128) * contrastAdj + 128;
      g = (g - 128) * contrastAdj + 128;
      b = (b - 128) * contrastAdj + 128;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
  }, [brightness, contrast, imageData]);

  // Effects
  useEffect(() => {
    if (imageData) applyAdjustments();
  }, [brightness, contrast, applyAdjustments, imageData]);

  const flipImage = useCallback(
    (direction: "horizontal" | "vertical") => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const currentImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
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

      const currentImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
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

  const boundCoordinates = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      return {
        x: Math.max(0, Math.min(x, canvas.width)),
        y: Math.max(0, Math.min(y, canvas.height)),
      };
    },
    [],
  );

  const getCropRect = useCallback(() => {
    if (!cropStart || !cropEnd) return null;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);

    return { x, y, width, height };
  }, [cropStart, cropEnd]);

  const getResizeHandle = useCallback(
    (mouseX: number, mouseY: number): ResizeHandle => {
      const rect = getCropRect();
      if (!rect) return null;

      const tolerance = 6;

      if (
        Math.abs(mouseX - rect.x) <= tolerance &&
        Math.abs(mouseY - rect.y) <= tolerance
      )
        return "nw";
      if (
        Math.abs(mouseX - (rect.x + rect.width)) <= tolerance &&
        Math.abs(mouseY - rect.y) <= tolerance
      )
        return "ne";
      if (
        Math.abs(mouseX - rect.x) <= tolerance &&
        Math.abs(mouseY - (rect.y + rect.height)) <= tolerance
      )
        return "sw";
      if (
        Math.abs(mouseX - (rect.x + rect.width)) <= tolerance &&
        Math.abs(mouseY - (rect.y + rect.height)) <= tolerance
      )
        return "se";

      return null;
    },
    [getCropRect],
  );

  const isInsideCropArea = useCallback(
    (mouseX: number, mouseY: number) => {
      const rect = getCropRect();
      if (!rect) return false;

      return (
        mouseX >= rect.x &&
        mouseX <= rect.x + rect.width &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.height
      );
    },
    [getCropRect],
  );

  const updateCursorStyle = useCallback(
    (mouseX: number, mouseY: number) => {
      if (!cropMode || cropState === "creating") {
        setCursorStyle("crosshair");
        return;
      }

      const handle = getResizeHandle(mouseX, mouseY);
      if (handle) {
        const cursors = {
          nw: "nw-resize",
          ne: "ne-resize",
          sw: "sw-resize",
          se: "se-resize",
        };
        setCursorStyle(cursors[handle]);
      } else if (isInsideCropArea(mouseX, mouseY)) {
        setCursorStyle("move");
      } else {
        setCursorStyle("crosshair");
      }
    },
    [cropMode, cropState, getResizeHandle, isInsideCropArea],
  );

  const drawCropOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0 || !cropStart || !cropEnd) return;

    const imageData = history[historyIndex];
    if (!imageData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(imageData, 0, 0);

    const rect = getCropRect();
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
      `${Math.round(rect.width)} × ${Math.round(rect.height)}`,
      rect.x + rect.width / 2,
      rect.y - 10,
    );
  }, [cropStart, cropEnd, history, historyIndex, getCropRect]);

  const getCanvasCoordinates = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();

      let clientX: number, clientY: number;

      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return { x: 0, y: 0 };
      }

      const x = (clientX - rect.left) * (canvas.width / rect.width);
      const y = (clientY - rect.top) * (canvas.height / rect.height);

      return boundCoordinates(x, y, canvas);
    },
    [boundCoordinates],
  );

  const handleStart = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinates(e);

      if (cropMode) {
        if (history.length === 0) {
          saveCanvasState();
        }

        if (cropState === "inactive" || cropState === "creating") {
          setCropStart({ x, y });
          setCropEnd({ x, y });
          setCropState("creating");
        } else if (cropState === "set") {
          const handle = getResizeHandle(x, y);
          if (handle) {
            setActiveHandle(handle);
            setCropState("resizing");
          } else if (isInsideCropArea(x, y)) {
            const rect = getCropRect();
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
      } else {
        setIsDrawing(true);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
      }

      e.preventDefault();
    },
    [
      cropMode,
      cropState,
      history,
      saveCanvasState,
      getResizeHandle,
      isInsideCropArea,
      getCropRect,
      getCanvasCoordinates,
    ],
  );

  const handleMove = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinates(e);

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
              endY =
                cropStart.y +
                (y > cropStart.y ? width / targetRatio : -width / targetRatio);
            } else {
              endX =
                cropStart.x +
                (x > cropStart.x
                  ? height * targetRatio
                  : -height * targetRatio);
            }

            const bounded = boundCoordinates(endX, endY, canvas);
            endX = bounded.x;
            endY = bounded.y;
          }

          setCropEnd({ x: endX, y: endY });
        } else if (cropState === "moving" && dragOffset && cropEnd) {
          const rect = getCropRect();
          if (!rect) return;

          const newX = x - dragOffset.x;
          const newY = y - dragOffset.y;

          const boundedX = Math.max(
            0,
            Math.min(newX, canvas.width - rect.width),
          );
          const boundedY = Math.max(
            0,
            Math.min(newY, canvas.height - rect.height),
          );

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
                newCropStart.x =
                  newCropEnd.x -
                  Math.abs(height) * targetRatio * (width < 0 ? -1 : 1);
              } else {
                newCropStart.y =
                  newCropEnd.y -
                  (Math.abs(width) / targetRatio) * (height < 0 ? -1 : 1);
              }
            } else if (activeHandle === "ne") {
              if (Math.abs(width) / Math.abs(height) > targetRatio) {
                newCropEnd.x =
                  newCropStart.x +
                  Math.abs(height) * targetRatio * (width > 0 ? 1 : -1);
              } else {
                newCropStart.y =
                  newCropEnd.y -
                  (Math.abs(width) / targetRatio) * (height < 0 ? -1 : 1);
              }
            } else if (activeHandle === "sw") {
              if (Math.abs(width) / Math.abs(height) > targetRatio) {
                newCropStart.x =
                  newCropEnd.x -
                  Math.abs(height) * targetRatio * (width < 0 ? -1 : 1);
              } else {
                newCropEnd.y =
                  newCropStart.y +
                  (Math.abs(width) / targetRatio) * (height > 0 ? 1 : -1);
              }
            } else if (activeHandle === "se") {
              if (Math.abs(width) / Math.abs(height) > targetRatio) {
                newCropEnd.x =
                  newCropStart.x +
                  Math.abs(height) * targetRatio * (width > 0 ? 1 : -1);
              } else {
                newCropEnd.y =
                  newCropStart.y +
                  (Math.abs(width) / targetRatio) * (height > 0 ? 1 : -1);
              }
            }
          }

          const boundedStartX = Math.max(
            0,
            Math.min(newCropStart.x, canvas.width),
          );
          const boundedStartY = Math.max(
            0,
            Math.min(newCropStart.y, canvas.height),
          );
          const boundedEndX = Math.max(0, Math.min(newCropEnd.x, canvas.width));
          const boundedEndY = Math.max(
            0,
            Math.min(newCropEnd.y, canvas.height),
          );

          newCropStart = { x: boundedStartX, y: boundedStartY };
          newCropEnd = { x: boundedEndX, y: boundedEndY };

          setCropStart(newCropStart);
          setCropEnd(newCropEnd);
        }

        requestAnimationFrame(drawCropOverlay);
      } else if (isDrawing) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineTo(x, y);
          ctx.stroke();
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
      getCropRect,
      boundCoordinates,
      updateCursorStyle,
      drawCropOverlay,
      getCanvasCoordinates,
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
      saveCanvasState();
      setIsDrawing(false);
    }
  }, [cropState, isDrawing, saveCanvasState]);

  const applyCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cropStart || !cropEnd) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);

    if (width > 0 && height > 0) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        const imageData = ctx.getImageData(x, y, width, height);
        tempCtx.putImageData(imageData, 0, 0);

        // Resize main canvas
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();
      }
    }

    // Reset all crop states
    setCropMode(false);
    setCropStart(null);
    setCropEnd(null);
    setCropGuide(null);
    setCropState("inactive");
    setDragOffset(null);
    setActiveHandle(null);
  }, [cropStart, cropEnd, saveCanvasState]);

  // File Operations Handlers
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

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎨 Image Editor Pro
          </h1>
          <p className="text-lg text-gray-600">
            Professional Image Editing with HTML5 Canvas
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Transform Tools */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                🔄 Transform
              </h3>
              <p className="text-sm text-gray-500">
                Rotate, flip, and resize your image
              </p>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                <button className="btn-outline" onClick={() => rotateImage(90)}>
                  ↻ Rotate 90°
                </button>
                <button
                  className="btn-outline"
                  onClick={() => rotateImage(180)}
                >
                  ⟲ Rotate 180°
                </button>
                <button
                  className="btn-outline"
                  onClick={() => flipImage("horizontal")}
                >
                  ↔ Flip Horizontal
                </button>
                <button
                  className="btn-outline"
                  onClick={() => flipImage("vertical")}
                >
                  ↕ Flip Vertical
                </button>
                <div className="flex gap-3">
                  <button
                    className="btn-outline flex-1"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                  >
                    ↩️ Undo
                  </button>
                  <button
                    className="btn-outline flex-1"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    ↪️ Redo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Crop Tools */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ✂️ Crop & Guides
              </h3>
              <p className="text-sm text-gray-500">
                Crop with aspect ratio guides
              </p>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                <button
                  className={cropMode ? "btn-primary" : "btn-outline"}
                  onClick={() => {
                    if (!cropMode) {
                      setCropMode(true);
                      setCropStart(null);
                      setCropEnd(null);
                      setCropState("inactive");
                      saveCanvasState();
                    } else {
                      cancelCrop();
                    }
                    setCropGuide(null);
                  }}
                >
                  ✂️ {cropMode ? "Cancel Crop" : "Free Crop"}
                </button>

                {cropMode && cropState === "set" && (
                  <button className="btn-secondary" onClick={applyCrop}>
                    ✓ Apply Crop
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { ratio: "1:1" },
                    { ratio: "4:3" },
                    { ratio: "16:9" },
                    { ratio: "9:21" },
                    { ratio: "2:3" },
                    { ratio: "4:5" },
                  ].map(({ ratio }) => (
                    <button
                      key={ratio}
                      className={`btn-ratio ${
                        cropGuide === (aspectRatios[ratio] || ratio)
                          ? "btn-ratio-active"
                          : ""
                      }`}
                      onClick={() =>
                        handleCropButtonClick(aspectRatios[ratio] || ratio)
                      }
                      onDoubleClick={() => handleCropButtonDoubleClick(ratio)}
                      onTouchEnd={(e) => handleCropButtonTouchEnd(ratio, e)}
                    >
                      {aspectRatios[ratio] || ratio}
                    </button>
                  ))}
                  <div
                    className={`btn-ratio inline-flex items-center justify-center cursor-pointer ${
                      cropGuide === `${customRatioX}:${customRatioY}`
                        ? "btn-ratio-active"
                        : ""
                    }`}
                    onClick={() => {
                      const newRatio = `${customRatioX}:${customRatioY}`;
                      handleCropButtonClick(newRatio);
                    }}
                    onDoubleClick={() => {
                      const temp = customRatioX;
                      setCustomRatioX(customRatioY);
                      setCustomRatioY(temp);
                    }}
                    onTouchEnd={(e) => {
                      const ratio = `${customRatioX}:${customRatioY}`;
                      handleCropButtonTouchEnd(ratio, e);
                    }}
                  >
                    <input
                      type="text"
                      value={customRatioX}
                      onChange={(e) => setCustomRatioX(e.target.value)}
                      className="w-8 text-center bg-transparent outline-none"
                    />
                    <span className="mx-1">:</span>
                    <input
                      type="text"
                      value={customRatioY}
                      onChange={(e) => setCustomRatioY(e.target.value)}
                      className="w-8 text-center bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ✏️ Drawing Tools
              </h3>
              <p className="text-sm text-gray-500">
                Draw and edit on your image
              </p>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                <button
                  className={
                    currentTool === "pencil" ? "btn-primary" : "btn-outline"
                  }
                  onClick={() => setCurrentTool("pencil")}
                >
                  ✏️ Pencil
                </button>
                <button
                  className={
                    currentTool === "eraser" ? "btn-primary" : "btn-outline"
                  }
                  onClick={() => setCurrentTool("eraser")}
                >
                  🗑️ Eraser
                </button>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-600 min-w-[35px]">
                    {brushSize}px
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
              <h2 className="font-medium text-white">Adjustments</h2>
            </div>
            <div className="p-5">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brightness: {brightness}%
                </label>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">0</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs text-gray-500">200</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrast: {contrast}%
                </label>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">0</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs text-gray-500">200</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
              <h2 className="font-medium text-white">Filters</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {(["none", "grayscale", "sepia", "vintage"] as Filter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => applyFilter(filter)}
                      className={`py-2 px-3 text-sm rounded-lg transition-all duration-200 capitalize ${
                        currentFilter === filter
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* File Operations */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                📁 File Operations
              </h3>
              <p className="text-sm text-gray-500">
                Load, save, and export images
              </p>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                <button className="btn-secondary" onClick={triggerFileUpload}>
                  📂 Open Image
                </button>
                <button className="btn-secondary" onClick={exportImage}>
                  💾 Export PNG
                </button>
                <button className="btn-destructive" onClick={clearCanvas}>
                  🗑️ Clear Canvas
                </button>
                <div className="flex gap-3 mt-3">
                  <button
                    className="btn-outline flex-1"
                    onClick={() => resizeImage(800, 600)}
                  >
                    800x600
                  </button>
                  <button
                    className="btn-outline flex-1"
                    onClick={() => resizeImage(1920, 1080)}
                  >
                    1920x1080
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-16 text-center border border-gray-300 rounded-md p-1 text-sm"
                    placeholder="Width"
                  />
                  <span className="text-gray-500">×</span>
                  <input
                    type="text"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-16 text-center border border-gray-300 rounded-md p-1 text-sm"
                    placeholder="Height"
                  />
                  <button
                    className="btn-outline text-sm"
                    onClick={() => {
                      const newWidth = parseInt(customWidth, 10);
                      const newHeight = parseInt(customHeight, 10);
                      if (
                        !isNaN(newWidth) &&
                        !isNaN(newHeight) &&
                        newWidth > 0 &&
                        newHeight > 0
                      ) {
                        resizeImage(newWidth, newHeight);
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🎨 Image Editor Canvas
            </h3>
            {cropMode && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                <div className="font-bold mb-2">
                  {cropGuide
                    ? `Crop Mode: ${cropGuide} ratio`
                    : "Crop Mode: Free form"}
                </div>
                <div className="opacity-80 text-xs">
                  Drag to create • Click inside to move • Drag corners to resize
                  <br />
                  Double-click ratio buttons to flip orientation • State:{" "}
                  {cropState}
                </div>
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 overflow-auto">
              <canvas
                ref={canvasRef}
                width="800"
                height="400"
                className="max-w-full max-h-[80vh] h-auto object-contain border border-gray-300 rounded-lg shadow-sm bg-white block mx-auto"
                style={{ cursor: cursorStyle }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              >
                Your browser does not support the HTML5 canvas element.
              </canvas>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
            <div className="flex flex-wrap items-center gap-6">
              <span>
                <strong>Mode:</strong>{" "}
                {cropMode
                  ? cropGuide
                    ? `Crop ${cropGuide} (${cropState})`
                    : `Free Crop (${cropState})`
                  : currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}
              </span>
              <span>
                <strong>Color:</strong> {currentColor}
              </span>
              <span>
                <strong>Size:</strong> {canvasRef.current?.width || 800}×
                {canvasRef.current?.height || 400}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-lg">●</span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
