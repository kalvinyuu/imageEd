import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tool, TextObject, Point } from "../../types/wimp";
import { getCanvasCoordinates } from "../../utils/image-utils";
import { v4 as uuidv4 } from "uuid";

interface DrawingToolsProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
    active: boolean;
    currentTool: Tool;
    setCurrentTool: (tool: Tool) => void;
}

export const DrawingTools: React.FC<DrawingToolsProps> = ({
    canvasRef,
    saveCanvasState,
    active,
    currentTool,
    setCurrentTool,
}) => {
    const [currentColor, setCurrentColor] = useState("#4F46E5");
    const [brushSize, setBrushSize] = useState(5);
    const [fontFamily, setFontFamily] = useState("Arial");
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isMovingText, setIsMovingText] = useState(false);
    const [textDragOffset, setTextDragOffset] = useState<Point>({ x: 0, y: 0 });

    const deleteSelectedText = useCallback(() => {
        if (selectedTextId) {
            setTextObjects(prev => prev.filter(obj => obj.id !== selectedTextId));
            setSelectedTextId(null);
        }
    }, [selectedTextId]);

    const bakeText = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || textObjects.length === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        textObjects.forEach(obj => {
            ctx.save();
            ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
            ctx.fillStyle = obj.color;
            ctx.textBaseline = "top";
            ctx.fillText(obj.text, obj.x, obj.y);
            ctx.restore();
        });
        setTextObjects([]);
        setSelectedTextId(null);
        saveCanvasState();
    }, [canvasRef, textObjects, saveCanvasState]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);

        if (currentTool === "text") {
            const found = [...textObjects].reverse().find(obj => {
                const ctx = canvas.getContext("2d")!;
                ctx.save();
                ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
                const metrics = ctx.measureText(obj.text);
                const isInside = x >= obj.x && x <= obj.x + metrics.width &&
                    y >= obj.y && y <= obj.y + obj.fontSize * 2;
                ctx.restore();
                return isInside;
            });

            if (found) {
                setSelectedTextId(found.id);
                setIsMovingText(true);
                setTextDragOffset({ x: x - found.x, y: y - found.y });
            } else {
                const newText = prompt("Enter text:");
                if (newText) {
                    const newObj: TextObject = {
                        id: uuidv4(),
                        text: newText,
                        x,
                        y,
                        fontSize: 20,
                        fontFamily,
                        color: currentColor
                    };
                    setTextObjects(prev => [...prev, newObj]);
                    setSelectedTextId(newObj.id);
                } else {
                    setSelectedTextId(null);
                }
            }
        } else {
            setIsDrawing(true);
            saveCanvasState();
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.strokeStyle = currentTool === "eraser" ? "#FFFFFF" : currentColor;
                ctx.lineWidth = brushSize;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);

        if (isMovingText && selectedTextId) {
            setTextObjects(prev => prev.map(obj =>
                obj.id === selectedTextId ? { ...obj, x: x - textDragOffset.x, y: y - textDragOffset.y } : obj
            ));
        } else if (isDrawing) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    };

    const handleEnd = () => {
        if (isDrawing) saveCanvasState();
        setIsDrawing(false);
        setIsMovingText(false);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = getCanvasCoordinates(e as any, canvas);
        const found = [...textObjects].reverse().find(obj => {
            const ctx = canvas.getContext("2d")!;
            ctx.save();
            ctx.font = `${obj.fontSize * 2}px ${obj.fontFamily}`;
            const metrics = ctx.measureText(obj.text);
            const isInside = x >= obj.x && x <= obj.x + metrics.width &&
                y >= obj.y && y <= obj.y + obj.fontSize * 2;
            ctx.restore();
            return isInside;
        });

        if (found) {
            const newText = prompt("Edit text:", found.text);
            if (newText !== null) {
                setTextObjects(prev => prev.map(o => o.id === found.id ? { ...o, text: newText } : o));
            }
        }
    };

    const renderOverlay = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        return createPortal(
            <div
                className="absolute inset-0 z-40 pointer-events-auto"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            >
                {textObjects.map(obj => (
                    <div
                        key={obj.id}
                        className={`absolute border-2 ${obj.id === selectedTextId ? "border-blue-500 bg-blue-500/10" : "border-transparent"} pointer-events-none rounded`}
                        style={{
                            left: obj.x + 16,
                            top: obj.y + 16,
                            fontSize: obj.fontSize * 2,
                            fontFamily: obj.fontFamily,
                            color: obj.color,
                            whiteSpace: "nowrap",
                            userSelect: "none"
                        }}
                    >
                        {obj.text}
                    </div>
                ))}
            </div>,
            document.getElementById("canvas-overlay-container")!
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">✏️ Drawing Tools</h3>
                <p className="text-sm text-gray-500">Draw and edit on your image</p>
            </div>
            <div className="p-5">
                <div className="flex flex-col gap-3">
                    <button
                        className={currentTool === "pencil" ? "btn-primary" : "btn-outline"}
                        onClick={() => setCurrentTool("pencil")}
                    >
                        ✏️ Pencil
                    </button>
                    <button
                        className={currentTool === "eraser" ? "btn-primary" : "btn-outline"}
                        onClick={() => setCurrentTool("eraser")}
                    >
                        🗑️ Eraser
                    </button>
                    <button
                        className={currentTool === "text" ? "btn-primary" : "btn-outline"}
                        onClick={() => setCurrentTool("text")}
                    >
                        🔤 Text Tool
                    </button>

                    {currentTool === "text" && (
                        <div className="flex flex-col gap-2 p-2 bg-gray-100 rounded-md">
                            <label className="text-xs font-bold text-gray-500 uppercase">Font Family</label>
                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                                className="text-sm p-1 rounded border border-gray-300"
                            >
                                <option value="Arial">Arial</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Verdana">Verdana</option>
                            </select>

                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={deleteSelectedText}
                                    disabled={!selectedTextId}
                                    className="flex-1 py-1.5 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 disabled:opacity-50"
                                >
                                    🗑️ Delete Selected
                                </button>
                                <button
                                    onClick={bakeText}
                                    className="flex-1 py-1.5 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200"
                                >
                                    ✅ Bake All Text
                                </button>
                            </div>
                        </div>
                    )}
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
                            max="300"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-xs text-gray-600 min-w-[35px]">{brushSize}px</span>
                    </div>
                </div>
            </div>
            {active && renderOverlay()}
        </div>
    );
};
