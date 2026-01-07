import React, { useState, useRef, useCallback, useEffect } from "react";
import { Tool } from "./types/image-editor";
import { Toolbar } from "./components/ImageEditor/Toolbar";
import { CropTools } from "./components/ImageEditor/CropTools";
import { DrawingTools } from "./components/ImageEditor/DrawingTools";
import { AdjustmentPanel } from "./components/ImageEditor/AdjustmentPanel";
import { BlurTools } from "./components/ImageEditor/BlurTools";
import { FilterPanel } from "./components/ImageEditor/FilterPanel";
import { FileOperations } from "./components/ImageEditor/FileOperations";

export const HomePage: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<Tool>("pencil");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, data].slice(-20); // Keep last 20 steps
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const data = history[prevIndex];
      const canvas = canvasRef.current;
      if (canvas && data) {
        canvas.width = data.width;
        canvas.height = data.height;
        canvas.getContext("2d")?.putImageData(data, 0, 0);
        setHistoryIndex(prevIndex);
      }
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const data = history[nextIndex];
      const canvas = canvasRef.current;
      if (canvas && data) {
        canvas.width = data.width;
        canvas.height = data.height;
        canvas.getContext("2d")?.putImageData(data, 0, 0);
        setHistoryIndex(nextIndex);
      }
    }
  }, [history, historyIndex]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        saveCanvasState();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      saveCanvasState();
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
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

      {/* Main Header */}
      <header className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">ImageEd</h1>
          <div className="h-4 w-px bg-gray-700" />
          <p className="text-xs text-gray-400 font-medium">Professional Decentralized Editor</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95" onClick={triggerFileUpload}>
            Open
          </button>
          <button className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 border border-gray-700" onClick={exportImage}>
            Export
          </button>
        </div>
      </header>

      {/* Horizontal Toolbar */}
      <Toolbar
        canvasRef={canvasRef}
        saveCanvasState={saveCanvasState}
        undo={undo}
        redo={redo}
        historyIndex={historyIndex}
        historyLength={history.length}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Canvas Area - Maximized */}
        <main className="flex-1 bg-gray-200 relative overflow-auto flex items-center justify-center p-8 pattern-dots">
          <div id="canvas-overlay-container" className="relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white">
            <canvas ref={canvasRef} className="block cursor-crosshair" />
          </div>
        </main>

        {/* Unified Right Tool Sidebar */}
        <aside className="w-80 bg-white border-l border-gray-200 shadow-xl z-20 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-6 pb-20">
            <div className="h-px bg-gray-100 mt-2" />

            <DrawingTools
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
              active={currentTool === "pencil" || currentTool === "eraser" || currentTool === "text"}
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
            />

            <CropTools
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
              active={currentTool === "crop"}
            />

            <AdjustmentPanel
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
            />

            <BlurTools
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
              active={currentTool === "blur"}
              setCurrentTool={setCurrentTool}
            />

            <FilterPanel
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
            />

            <FileOperations
              triggerFileUpload={triggerFileUpload}
              exportImage={exportImage}
              clearCanvas={clearCanvas}
              canvasRef={canvasRef}
              saveCanvasState={saveCanvasState}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
