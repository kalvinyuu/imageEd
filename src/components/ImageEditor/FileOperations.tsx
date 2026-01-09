import React, { useState, useCallback, useEffect } from "react";

interface FileOperationsProps {
    triggerFileUpload: () => void;
    exportImage: (format?: string, quality?: number, scale?: number) => void;
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

    // Export Options State
    const [format, setFormat] = useState<string>("png");
    const [quality, setQuality] = useState<number>(90);
    const [scale, setScale] = useState<number>(100);
    const [avifSupported, setAvifSupported] = useState<boolean>(false);

    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        setAvifSupported(canvas.toDataURL("image/avif").indexOf("data:image/avif") === 0);
    }, []);

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

    const handleExport = () => {
        exportImage(format, quality / 100, scale / 100);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">📁 File Operations</h3>
                <p className="text-sm text-gray-500">Load, save, and export images</p>
            </div>
            <div className="p-5 space-y-6">
                {/* General Actions */}
                <div className="flex flex-col gap-3">
                    <button className="btn btn-secondary w-full text-sm py-2" onClick={triggerFileUpload}>
                        📂 Open Image
                    </button>
                    <button className="btn btn-destructive w-full text-sm py-2" onClick={clearCanvas}>
                        🗑️ Clear Canvas
                    </button>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Resize Canvas Section */}
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resize Canvas</h4>
                    <div className="flex gap-2 mb-3">
                        <button className="btn btn-outline flex-1 text-xs py-1 px-2" onClick={() => resizeImage(800, 600)}>
                            800x600
                        </button>
                        <button className="btn btn-outline flex-1 text-xs py-1 px-2" onClick={() => resizeImage(1920, 1080)}>
                            1920x1080
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-1">
                            <input
                                type="text"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                className="w-full text-center border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="W"
                            />
                            <span className="text-gray-400 text-xs">×</span>
                            <input
                                type="text"
                                value={customHeight}
                                onChange={(e) => setCustomHeight(e.target.value)}
                                className="w-full text-center border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="H"
                            />
                        </div>
                        <button
                            className="btn btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
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

                <div className="h-px bg-gray-100" />

                {/* Export Settings Section */}
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🚀</span>
                        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Export Settings</h4>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">Format</label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full border border-blue-200 rounded-lg p-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="png">PNG (Lossless)</option>
                            <option value="jpeg">JPEG (Compressed)</option>
                            <option value="webp">WebP (Efficient)</option>
                            {avifSupported && <option value="avif">AVIF (Ultra-Efficient)</option>}
                        </select>
                    </div>

                    {(format === "png" || format === "jpeg" || format === "webp" || format === "avif") && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                                    {format === "png" ? "Compression Effort" : "Quality"}
                                </label>
                                <span className="text-xs font-black text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100 shadow-sm">{quality}%</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={quality}
                                onChange={(e) => setQuality(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            {format === "png" && (
                                <p className="text-[8px] text-blue-400 leading-tight">
                                    Note: PNG is always lossless. Higher values use more CPU for potentially better compression.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Scale Factor</label>
                            <span className="text-xs font-black text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100 shadow-sm">{scale}%</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={scale}
                            onChange={(e) => setScale(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[8px] text-blue-400 font-bold px-1">
                            <span>10%</span>
                            <span>100%</span>
                            <span>200%</span>
                        </div>
                    </div>

                    <button className="btn btn-primary w-full py-3 rounded-lg font-bold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98]" onClick={handleExport}>
                        Save as {format.toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );
};
