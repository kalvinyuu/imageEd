import React, { useState, useCallback } from "react";

interface AdjustmentPanelProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
}

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
    canvasRef,
    saveCanvasState,
}) => {
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);

    const applyAdjustments = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        // Since we are applying adjustments cumulatively, we need the original or just apply current
        // In this simple model, we apply to current pixels
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.filter = ctx.filter;
        tempCtx.drawImage(canvas, 0, 0);

        ctx.filter = "none";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();

        // Reset sliders after apply or keep them? 
        // Usually, apply means "bake it in". Let's reset to 100.
        setBrightness(100);
        setContrast(100);
    }, [canvasRef, brightness, contrast, saveCanvasState]);

    return (
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
                <div className="mb-5">
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
                <button
                    onClick={applyAdjustments}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all active:scale-95 shadow-md"
                >
                    Apply Adjustments
                </button>
            </div>
        </div>
    );
};
