import React, { useState, useCallback } from "react";

interface FileOperationsProps {
    triggerFileUpload: () => void;
    exportImage: () => void;
    clearCanvas: () => void;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
}

export const FileOperations: React.FC<FileOperationsProps> = ({
    triggerFileUpload,
    exportImage,
    clearCanvas,
    canvasRef,
    saveCanvasState,
}) => {
    const [customWidth, setCustomWidth] = useState("800");
    const [customHeight, setCustomHeight] = useState("600");

    const resizeImage = useCallback((width: number, height: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d")!;

        // Draw old canvas content perfectly into new dimensions
        tempCtx.drawImage(canvas, 0, 0, width, height);

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();
    }, [canvasRef, saveCanvasState]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">📁 File Operations</h3>
                <p className="text-sm text-gray-500">Load, save, and export images</p>
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
                        <button className="btn-outline flex-1" onClick={() => resizeImage(800, 600)}>
                            800x600
                        </button>
                        <button className="btn-outline flex-1" onClick={() => resizeImage(1920, 1080)}>
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
                                if (!isNaN(newWidth) && !isNaN(newHeight) && newWidth > 0 && newHeight > 0) {
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
    );
};
