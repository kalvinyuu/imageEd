import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { CropState, Point, ResizeHandle } from "../../types/image-editor";
import { flipAspectRatio, getCropRect, getResizeHandle, isInsideCropArea, boundCoordinates, getCanvasCoordinates } from "../../utils/image-utils";

interface CropToolsProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
    active: boolean;
}

export const CropTools: React.FC<CropToolsProps> = ({
    canvasRef,
    saveCanvasState,
    active,
}) => {
    const [cropMode, setCropMode] = useState(false);
    const [cropState, setCropState] = useState<CropState>("inactive");
    const [cropStart, setCropStart] = useState<Point | null>(null);
    const [cropEnd, setCropEnd] = useState<Point | null>(null);
    const [cropGuide, setCropGuide] = useState<string | null>(null);
    const [aspectRatios, setAspectRatios] = useState<{ [key: string]: string }>({});
    const [customRatioX, setCustomRatioX] = useState("2");
    const [customRatioY, setCustomRatioY] = useState("1");
    const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
    const [dragOffset, setDragOffset] = useState<Point | null>(null);
    const [lastTouchTime, setLastTouchTime] = useState<{ [key: string]: number }>({});

    const handleCropButtonClick = useCallback((ratio: string) => {
        setCropMode(true); setCropGuide(ratio);
        setCropStart(null); setCropEnd(null);
        setCropState("inactive"); setDragOffset(null); setActiveHandle(null);
    }, []);

    const handleCropButtonDoubleClick = useCallback((ratio: string) => {
        const flipped = flipAspectRatio(ratio);
        setAspectRatios(prev => ({ ...prev, [ratio]: flipped }));
        handleCropButtonClick(flipped);
    }, [handleCropButtonClick]);

    const handleCropButtonTouchEnd = useCallback((ratio: string, e: React.TouchEvent) => {
        e.preventDefault();
        const now = Date.now();
        const last = lastTouchTime[ratio] || 0;
        if (now - last < 300) {
            const flipped = flipAspectRatio(aspectRatios[ratio] || ratio);
            setAspectRatios(prev => ({ ...prev, [ratio]: flipped }));
            handleCropButtonClick(flipped);
        } else {
            handleCropButtonClick(aspectRatios[ratio] || ratio);
        }
        setLastTouchTime(prev => ({ ...prev, [ratio]: now }));
    }, [lastTouchTime, aspectRatios, handleCropButtonClick]);

    const cancelCrop = useCallback(() => {
        setCropMode(false); setCropStart(null); setCropEnd(null);
        setCropGuide(null); setCropState("inactive");
        setDragOffset(null); setActiveHandle(null);
    }, []);

    const applyCrop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cropStart || !cropEnd) return;
        const rect = getCropRect(cropStart, cropEnd);
        if (!rect || rect.width <= 0 || rect.height <= 0) return;

        saveCanvasState();
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = rect.width; tempCanvas.height = rect.height;
        const ctx = canvas.getContext("2d");
        const tempCtx = tempCanvas.getContext("2d");
        if (ctx && tempCtx) {
            const data = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
            tempCtx.putImageData(data, 0, 0);
            canvas.width = rect.width; canvas.height = rect.height;
            ctx.drawImage(tempCanvas, 0, 0);
            saveCanvasState();
        }
        cancelCrop();
    }, [canvasRef, cropStart, cropEnd, saveCanvasState, cancelCrop]);

    const handleOverlayStart = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);
        if (cropState === "inactive" || cropState === "creating") {
            setCropStart({ x, y }); setCropEnd({ x, y }); setCropState("creating");
        } else if (cropState === "set") {
            const rect = getCropRect(cropStart, cropEnd);
            const handle = getResizeHandle(x, y, rect);
            if (handle) {
                setActiveHandle(handle); setCropState("resizing");
            } else if (isInsideCropArea(x, y, rect)) {
                setDragOffset({ x: x - rect!.x, y: y - rect!.y }); setCropState("moving");
            } else {
                setCropStart({ x, y }); setCropEnd({ x, y }); setCropState("creating");
            }
        }
    };

    const handleOverlayMove = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas || !cropStart) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);

        if (cropState === "creating") {
            let endX = x, endY = y;
            if (cropGuide) {
                const [rW, rH] = cropGuide.split(":").map(Number);
                const target = rW / rH;
                const width = Math.abs(x - cropStart.x);
                const height = Math.abs(y - cropStart.y);
                if (width / height > target) {
                    endY = cropStart.y + (y > cropStart.y ? width / target : -width / target);
                } else {
                    endX = cropStart.x + (x > cropStart.x ? height * target : -height * target);
                }
                const bounded = boundCoordinates(endX, endY, canvas);
                endX = bounded.x; endY = bounded.y;
            }
            setCropEnd({ x: endX, y: endY });
        } else if (cropState === "moving" && dragOffset && cropEnd) {
            const rect = getCropRect(cropStart, cropEnd)!;
            const newX = Math.max(0, Math.min(x - dragOffset.x, canvas.width - rect.width));
            const newY = Math.max(0, Math.min(y - dragOffset.y, canvas.height - rect.height));
            setCropStart({ x: newX, y: newY });
            setCropEnd({ x: newX + rect.width, y: newX + rect.height });
        } else if (cropState === "resizing" && activeHandle && cropEnd) {
            let ns = { ...cropStart }, ne = { ...cropEnd };
            if (activeHandle.includes("e")) ne.x = x;
            if (activeHandle.includes("w")) ns.x = x;
            if (activeHandle.includes("s")) ne.y = y;
            if (activeHandle.includes("n")) ns.y = y;

            if (cropGuide) {
                const [rW, rH] = cropGuide.split(":").map(Number);
                const target = rW / rH;
                const w = ne.x - ns.x, h = ne.y - ns.y;
                if (activeHandle === "nw" || activeHandle === "se") {
                    if (Math.abs(w) / Math.abs(h) > target) ne.x = ns.x + h * target;
                    else ne.y = ns.y + w / target;
                }
            }
            setCropStart({ x: Math.max(0, Math.min(ns.x, canvas.width)), y: Math.max(0, Math.min(ns.y, canvas.height)) });
            setCropEnd({ x: Math.max(0, Math.min(ne.x, canvas.width)), y: Math.max(0, Math.min(ne.y, canvas.height)) });
        }
    };

    const handleOverlayEnd = () => {
        if (["creating", "moving", "resizing"].includes(cropState)) setCropState("set");
        setActiveHandle(null); setDragOffset(null);
    };

    const renderOverlay = () => {
        const canvas = canvasRef.current;
        if (!canvas || !cropStart || !cropEnd) return null;
        const rect = getCropRect(cropStart, cropEnd);
        if (!rect) return null;

        return createPortal(
            <div
                className="absolute inset-0 z-50 cursor-crosshair overflow-hidden p-4"
                onMouseDown={handleOverlayStart}
                onMouseMove={handleOverlayMove}
                onMouseUp={handleOverlayEnd}
                onTouchStart={handleOverlayStart}
                onTouchMove={handleOverlayMove}
                onTouchEnd={handleOverlayEnd}
            >
                <div className="relative w-full h-full pointer-events-none">
                    <div className="absolute bg-black/50" style={{ left: 0, top: 0, width: "100%", height: rect.y + 16 }} />
                    <div className="absolute bg-black/50" style={{ left: 0, top: rect.y + rect.height + 16, width: "100%", height: "100%" }} />
                    <div className="absolute bg-black/50" style={{ left: 0, top: rect.y + 16, width: rect.x + 16, height: rect.height }} />
                    <div className="absolute bg-black/50" style={{ left: rect.x + rect.width + 16, top: rect.y + 16, width: "100%", height: rect.height }} />

                    <div className="absolute border-2 border-green-500 border-dashed pointer-events-auto" style={{ left: rect.x + 16, top: rect.y + 16, width: rect.width, height: rect.height }}>
                        <div className="absolute -left-2 -top-2 w-4 h-4 bg-green-500 border border-white" />
                        <div className="absolute -right-2 -top-2 w-4 h-4 bg-green-500 border border-white" />
                        <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-green-500 border border-white" />
                        <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-green-500 border border-white" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-green-500 text-xs font-bold bg-white/80 px-1 rounded">
                            {Math.round(rect.width)} × {Math.round(rect.height)}
                        </div>
                    </div>
                </div>
            </div>,
            document.getElementById("canvas-overlay-container")!
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">✂️ Crop & Guides</h3>
                <p className="text-sm text-gray-500">Crop with aspect ratio guides</p>
            </div>
            <div className="p-5">
                <div className="flex flex-col gap-3">
                    <button
                        className={cropMode ? "btn-primary" : "btn-outline"}
                        onClick={() => {
                            if (!cropMode) {
                                setCropMode(true);
                            } else {
                                cancelCrop();
                            }
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
                        {["1:1", "4:3", "16:9", "9:21", "2:3", "4:5"].map((ratio) => (
                            <button
                                key={ratio}
                                className={`btn-ratio ${cropGuide === (aspectRatios[ratio] || ratio) ? "btn-ratio-active" : ""}`}
                                onClick={() => handleCropButtonClick(aspectRatios[ratio] || ratio)}
                                onDoubleClick={() => handleCropButtonDoubleClick(ratio)}
                                onTouchEnd={(e) => handleCropButtonTouchEnd(ratio, e)}
                            >
                                {aspectRatios[ratio] || ratio}
                            </button>
                        ))}
                        <div
                            className={`btn-ratio inline-flex items-center justify-center cursor-pointer ${cropGuide === `${customRatioX}:${customRatioY}` ? "btn-ratio-active" : ""}`}
                            onClick={() => handleCropButtonClick(`${customRatioX}:${customRatioY}`)}
                            onDoubleClick={() => {
                                setCustomRatioX(customRatioY); setCustomRatioY(customRatioX);
                            }}
                        >
                            <input type="text" value={customRatioX} onChange={(e) => setCustomRatioX(e.target.value)} className="w-8 text-center bg-transparent outline-none" onClick={e => e.stopPropagation()} />
                            <span className="mx-1">:</span>
                            <input type="text" value={customRatioY} onChange={(e) => setCustomRatioY(e.target.value)} className="w-8 text-center bg-transparent outline-none" onClick={e => e.stopPropagation()} />
                        </div>
                    </div>
                </div>
            </div>
            {cropMode && renderOverlay()}
        </div>
    );
};
