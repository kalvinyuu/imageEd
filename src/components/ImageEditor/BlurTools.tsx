import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { BlurMode, Tool, Point } from "../../types/image-editor";
import { getCanvasCoordinates, applySecureBlur } from "../../utils/image-utils";

interface BlurToolsProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
    active: boolean;
    setCurrentTool: (tool: Tool) => void;
}

export const BlurTools: React.FC<BlurToolsProps> = ({
    canvasRef,
    saveCanvasState,
    active,
    setCurrentTool,
}) => {
    const [blurRadius, setBlurRadius] = useState(25);
    const [blurMode, setBlurMode] = useState<BlurMode>("marked");
    const [isDrawing, setIsDrawing] = useState(false);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const applyBlurEffect = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const maskCanvas = maskCanvasRef.current || document.createElement("canvas");
        if (!maskCanvasRef.current) {
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            maskCanvasRef.current = maskCanvas;
        }

        const ctx = canvas.getContext("2d");
        const maskCtx = maskCanvas.getContext("2d");
        if (!ctx || !maskCtx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        saveCanvasState();
        const blurred = applySecureBlur(imageData, maskData, blurRadius, blurMode);
        ctx.putImageData(blurred, 0, 0);
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        saveCanvasState();
        setCurrentTool("pencil");
    }, [canvasRef, blurRadius, blurMode, saveCanvasState, setCurrentTool]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);
        setIsDrawing(true);

        const maskCanvas = maskCanvasRef.current || document.createElement("canvas");
        if (!maskCanvasRef.current) {
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            maskCanvasRef.current = maskCanvas;
        }

        const mCtx = maskCanvas.getContext("2d");
        if (mCtx) {
            mCtx.strokeStyle = "black";
            mCtx.lineWidth = blurRadius * 2;
            mCtx.lineCap = "round";
            mCtx.lineJoin = "round";
            mCtx.beginPath();
            mCtx.moveTo(x, y);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);

        const mCtx = maskCanvasRef.current?.getContext("2d");
        if (mCtx) {
            mCtx.lineTo(x, y);
            mCtx.stroke();

            // Preview the brush stroke on the main canvas (temporary visual)
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.save();
                ctx.strokeStyle = "rgba(255,255,255,0.2)";
                ctx.lineWidth = blurRadius * 2;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.beginPath();
                ctx.moveTo(x - 1, y - 1);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    const renderOverlay = () => {
        return createPortal(
            <div
                className="absolute inset-0 z-50 cursor-crosshair"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            />,
            document.getElementById("canvas-overlay-container")!
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">💧 Secure Blur</h3>
                <button
                    onClick={() => setCurrentTool(active ? "pencil" : "blur")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                >
                    {active ? "Stop Marking" : "Start Marking"}
                </button>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blur Radius: {blurRadius}px</label>
                    <input
                        type="range"
                        min="1"
                        max="300"
                        value={blurRadius}
                        onChange={(e) => setBlurRadius(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blur Mode</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setBlurMode("marked")}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${blurMode === "marked" ? "bg-blue-600 text-white shadow-md scale-[1.02]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            Blur Marked
                        </button>
                        <button
                            onClick={() => setBlurMode("unmarked")}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${blurMode === "unmarked" ? "bg-blue-600 text-white shadow-md scale-[1.02]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            Blur Others
                        </button>
                    </div>
                </div>

                <button onClick={applyBlurEffect} className="w-full mt-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                    Apply Secure Blur
                </button>
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider font-bold">⚠ Irreversible Action</p>
            </div>
            {active && renderOverlay()}
        </div>
    );
};
