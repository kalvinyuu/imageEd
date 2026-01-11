import React, { useCallback } from "react";

interface ToolbarProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
    undo: () => void;
    redo: () => void;
    historyIndex: number;
    historyLength: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    canvasRef,
    saveCanvasState,
    undo,
    redo,
    historyIndex,
    historyLength,
}) => {
    const rotateImage = useCallback((degrees: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d")!;

        if (degrees === 90 || degrees === 270) {
            tempCanvas.width = canvas.height;
            tempCanvas.height = canvas.width;
        } else {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }

        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate((degrees * Math.PI) / 180);
        tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();
    }, [canvasRef, saveCanvasState]);

    const flipImage = useCallback((direction: "horizontal" | "vertical") => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d")!;

        if (direction === "horizontal") {
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(canvas, -canvas.width, 0);
        } else {
            tempCtx.scale(1, -1);
            tempCtx.drawImage(canvas, 0, -canvas.height);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();
    }, [canvasRef, saveCanvasState]);

    return (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                    <button
                        className={`p-2 rounded-md transition-colors ${historyIndex <= 0 ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        title="Undo (Ctrl+Z)"
                    >
                        ↩️
                    </button>
                    <button
                        className={`p-2 rounded-md transition-colors ${historyIndex >= historyLength - 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
                        onClick={redo}
                        disabled={historyIndex >= historyLength - 1}
                        title="Redo (Ctrl+Y)"
                    >
                        ↪️
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-2" />

                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-medium" onClick={() => rotateImage(90)} title="Rotate 90° clockwise">
                        ↻ <span className="hidden sm:inline">Rotate 90°</span>
                    </button>
                    <button className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-medium" onClick={() => rotateImage(180)} title="Rotate 180°">
                        ⟲ <span className="hidden sm:inline">Rotate 180°</span>
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-2" />

                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-medium" onClick={() => flipImage("horizontal")} title="Flip Horizontal">
                        ↔ <span className="hidden sm:inline">Flip Horizontal</span>
                    </button>
                    <button className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-medium" onClick={() => flipImage("vertical")} title="Flip Vertical">
                        ↕ <span className="hidden sm:inline">Flip Vertical</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:inline">TRANSFORM TOOLS</span>
            </div>
        </div>
    );
};
