import React, { useState, useCallback } from "react";
import { Filter } from "../../types/wimp";

interface FilterPanelProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    saveCanvasState: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ canvasRef, saveCanvasState }) => {
    const [currentFilter, setCurrentFilter] = useState<Filter>("none");
    const filters: Filter[] = ["none", "grayscale", "sepia", "vintage"];

    const applyFilter = useCallback((filter: Filter) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        saveCanvasState();
        setCurrentFilter(filter);

        let filterString = "none";
        switch (filter) {
            case "grayscale": filterString = "grayscale(100%)"; break;
            case "sepia": filterString = "sepia(100%)"; break;
            case "vintage": filterString = "sepia(50%) hue-rotate(-30deg) saturate(140%)"; break;
        }

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.filter = filterString;
        tempCtx.drawImage(canvas, 0, 0);

        ctx.filter = "none";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        saveCanvasState();
    }, [canvasRef, saveCanvasState]);

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
                <h2 className="font-medium text-white">Filters</h2>
            </div>
            <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => applyFilter(filter)}
                            className={`py-2 px-3 text-sm rounded-lg transition-all duration-200 capitalize ${currentFilter === filter
                                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
