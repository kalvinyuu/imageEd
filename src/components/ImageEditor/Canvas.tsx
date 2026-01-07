import React from "react";
import { CropState } from "../../types/image-editor";

interface CanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    cursorStyle: string;
    handleStart: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
    handleMove: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
    handleEnd: () => void;
    cropMode: boolean;
    cropGuide: string | null;
    cropState: CropState;
    handleDoubleClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    canvasRef,
    cursorStyle,
    handleStart,
    handleMove,
    handleEnd,
    cropMode,
    cropGuide,
    cropState,
    handleDoubleClick,
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🎨 Image Editor Canvas</h3>
                {cropMode && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                        <div className="font-bold mb-2">
                            {cropGuide ? `Crop Mode: ${cropGuide} ratio` : "Crop Mode: Free form"}
                        </div>
                        <div className="opacity-80 text-xs">
                            Drag to create • Click inside to move • Drag corners to resize
                            <br />
                            Double-click ratio buttons to flip orientation • State: {cropState}
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
                        onDoubleClick={handleDoubleClick}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                    >
                        Your browser does not support the HTML5 canvas element.
                    </canvas>
                </div>
            </div>
        </div>
    );
};
