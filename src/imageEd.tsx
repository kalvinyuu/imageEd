"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUpload, faPaintBrush, faEraser, 
  faDownload, faRedo, faUndo, 
  faCrop, faExchangeAlt
} from '@fortawesome/free-solid-svg-icons'

type Tool = "brush" | "eraser" | "crop"
type Filter = "none" | "grayscale" | "sepia" | "vintage"

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}


const cropPresets = [
  { name: "1:1", ratio: 1 },
  { name: "3:2", ratio: 3 / 2 },
  { name: "4:3", ratio: 4 / 3 },
  { name: "4:5", ratio: 4 / 5 },
  { name: "16:9", ratio: 16 / 9 },
  { name: "21:9", ratio: 21 / 9 },
  { name: "Custom", ratio: null, },
]

export default function ImageEditor() {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Core State
  const [currentTool, setCurrentTool] = useState<Tool>("brush")
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#000000")
  const [isDrawing, setIsDrawing] = useState(false)
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null)

  // Crop State (Simplified)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [cropStartPoint, setCropStartPoint] = useState<{x: number, y: number} | null>(null)
  const [selectedPreset, setSelectedPreset] = useState("Custom")

  // History
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Adjustments
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [currentFilter, setCurrentFilter] = useState<Filter>("none")

  // Save to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Undo/Redo
  const undo = () => historyIndex > 0 && restoreHistoryState(historyIndex - 1)
  const redo = () => historyIndex < history.length - 1 && restoreHistoryState(historyIndex + 1)

  const restoreHistoryState = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.putImageData(history[index], 0, 0)
    setHistoryIndex(index)
  }

  // Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        // Scale down large images
        const maxSize = 1200
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const imageData = ctx.getImageData(0, 0, width, height)
        setOriginalImageData(imageData)
        setHistory([imageData])
        setHistoryIndex(0)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Drawing Logic
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * (canvas.width / rect.width),
      y: ((e as React.MouseEvent).clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e: React.MouseEvent) => {
    if (currentTool === "crop") {
      const coords = getCanvasCoordinates(e)
      const size = Math.min(canvasRef.current?.width || 300, canvasRef.current?.height || 300) * 0.3
      const preset = cropPresets.find(p => p.name === selectedPreset)
      
      setCropRect({
        x: coords.x - size/2,
        y: coords.y - size/2,
        width: size,
        height: preset?.ratio ? size/preset.ratio : size
      })
      return
    }

    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const coords = getCanvasCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.strokeStyle = currentTool === "brush" ? brushColor : "rgba(0,0,0,1)"
    ctx.globalCompositeOperation = currentTool === "brush" ? "source-over" : "destination-out"
  }

  const draw = (e: React.MouseEvent) => {
    if (currentTool === "crop" && cropRect) {
      console.log("draw cropRect", cropRect);
      const coords = getCanvasCoordinates(e)
      setCropRect({
        ...cropRect,
        x: coords.x - cropRect.width/2,
        y: coords.y - cropRect.height/2
      })
      return
    }

    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const coords = getCanvasCoordinates(e)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }

  // Crop Functions
  const applyCrop = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !cropRect) return

    console.log("applyCrop cropRect", cropRect);

    const imageData = ctx.getImageData(
      Math.max(0, cropRect.x),
      Math.max(0, cropRect.y),
      Math.min(cropRect.width, canvas.width - cropRect.x),
      Math.min(cropRect.height, canvas.height - cropRect.y)
    )
    
    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)
    
    setCropRect(null)
    saveToHistory()
  }

  const swapCropAxis = () => {
    if (!cropRect) return
    setCropRect({
      ...cropRect,
      width: cropRect.height,
      height: cropRect.width
    })
  }

  // Filters & Adjustments
  const applyFilter = (filter: Filter) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !originalImageData) return

    ctx.putImageData(originalImageData, 0, 0)
    if (filter === "none") {
      setCurrentFilter(filter)
      saveToHistory()
      return
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      
      if (filter === "grayscale") {
        const gray = r * 0.299 + g * 0.587 + b * 0.114
        data[i] = data[i+1] = data[i+2] = gray
      } 
      else if (filter === "sepia") {
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
        data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
        data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
      }
      else if (filter === "vintage") {
        data[i] = Math.min(255, r * 1.2)
        data[i+1] = Math.min(255, g * 1.1)
        data[i+2] = Math.min(255, b * 0.8)
      }
    }

    ctx.putImageData(imageData, 0, 0)
    setCurrentFilter(filter)
    saveToHistory()
  }

  const applyAdjustments = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !originalImageData) return

    ctx.putImageData(originalImageData, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    const brightnessAdj = (brightness - 100) * 2.55
    const contrastAdj = contrast / 100

    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      let r = data[i] + brightnessAdj
      let g = data[i+1] + brightnessAdj
      let b = data[i+2] + brightnessAdj

      // Contrast
      r = (r - 128) * contrastAdj + 128
      g = (g - 128) * contrastAdj + 128
      b = (b - 128) * contrastAdj + 128

      data[i] = Math.max(0, Math.min(255, r))
      data[i+1] = Math.max(0, Math.min(255, g))
      data[i+2] = Math.max(0, Math.min(255, b))
    }

    ctx.putImageData(imageData, 0, 0)
  }, [brightness, contrast, originalImageData])

  // Effects
  useEffect(() => {
    if (originalImageData) applyAdjustments()
  }, [brightness, contrast, applyAdjustments])

  // Render
return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Image Editor</h1>
        <p className="text-gray-600">Edit your images with our powerful tools</p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
        {/* Tools Panel */}
        <div className="xl:col-span-1 space-y-4 lg:space-y-6">
          {/* Upload - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
              <h2 className="font-medium text-white flex items-center">
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                Load Image
              </h2>
            </div>
            <div className="p-5">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 hover:shadow-md flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                Upload Image
              </button>
            </div>
          </div>

          {/* Tools - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
              <h2 className="font-medium text-white">Tools</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-5">
                <button
                  onClick={() => setCurrentTool("brush")}
                  className={`py-3 rounded-lg transition-all duration-200 ${currentTool === "brush" 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <FontAwesomeIcon icon={faPaintBrush} className="mx-auto" />
                </button>
                <button
                  onClick={() => setCurrentTool("eraser")}
                  className={`py-3 rounded-lg transition-all duration-200 ${currentTool === "eraser" 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <FontAwesomeIcon icon={faEraser} className="mx-auto" />
                </button>
                <button
                  onClick={() => setCurrentTool("crop")}
                  className={`py-3 rounded-lg transition-all duration-200 ${currentTool === "crop" 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <FontAwesomeIcon icon={faCrop} className="mx-auto" />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brush Size: {brushSize}px</label>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">1</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                  <span className="text-xs text-gray-500">50</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex items-center justify-between">
                  <input 
                    type="color" 
                    value={brushColor} 
                    onChange={(e) => setBrushColor(e.target.value)} 
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300" 
                    style={{ backgroundColor: brushColor }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Crop Tools - Enhanced Card */}
          {currentTool === "crop" && (
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4">
                <h2 className="font-medium text-white">Crop</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {cropPresets.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setSelectedPreset(preset.name)}
                      className={`py-2 px-3 text-xs rounded-lg transition-all duration-200 ${
                        selectedPreset === preset.name 
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                {cropRect && (
                  <div className="space-y-3">
                    <button 
                      onClick={applyCrop}
                      className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                    >
                      Apply Crop
                    </button>
                    <button 
                      onClick={() => setCropRect(null)}
                      className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium transition-all duration-200 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adjustments - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
              <h2 className="font-medium text-white">Adjustments</h2>
            </div>
            <div className="p-5">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brightness: {brightness}%</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contrast: {contrast}%</label>
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
            </div>
          </div>

          {/* Filters - Enhanced Card */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
              <h2 className="font-medium text-white">Filters</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {(["none", "grayscale", "sepia", "vintage"] as Filter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => applyFilter(filter)}
                    className={`py-2 px-3 text-sm rounded-lg transition-all duration-200 capitalize ${
                      currentFilter === filter 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area - Enhanced */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-lg font-medium text-gray-800">Canvas</h2>
              <div className="flex gap-3">
                <button 
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className={`p-3 rounded-lg transition-all duration-200 ${historyIndex <= 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm border'}`}
                  title="Undo"
                >
                  <FontAwesomeIcon icon={faUndo} size="lg" />
                </button>
                <button 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-3 rounded-lg transition-all duration-200 ${historyIndex >= history.length - 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm border'}`}
                  title="Redo"
                >
                  <FontAwesomeIcon icon={faRedo} size="lg" />
                </button>
                <button 
                  onClick={() => canvasRef.current?.toBlob(blob => {
                    if (blob) {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'edited-image.png';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    }
                  })}
                  className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                  title="Download Image"
                >
                  <FontAwesomeIcon icon={faDownload} size="lg" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="border-2 border-dashed border-gray-300 rounded-xl min-h-[500px] max-h-[70vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-white overflow-auto">
                <div className="relative inline-block">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="max-w-full max-h-[calc(70vh-100px)] border border-gray-200 rounded-lg shadow-lg cursor-crosshair"
                    style={{
                      cursor: currentTool === "crop" ? "crosshair" : 
                              isDrawing ? "grabbing" : "default",
                      backgroundColor: "#ffffff"
                    }}
                  />
                  {/* Crop Overlay */}
                  {currentTool === "crop" && cropRect && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div 
                        className="absolute border-2 border-dashed border-white pointer-events-none"
                        style={{
                          left: `${cropRect.x}px`,
                          top: `${cropRect.y}px`,
                          width: `${cropRect.width}px`,
                          height: `${cropRect.height}px`,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)"
                        }}
                      >
                        <button 
                          onClick={swapCropAxis}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200 pointer-events-auto"
                        >
                          <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-700" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!canvasRef.current?.width && (
                  <div className="text-center max-w-md p-8">
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-500">
                      <FontAwesomeIcon icon={faUpload} size="3x" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Edit?</h3>
                    <p className="text-gray-600">Upload an image to start editing with our powerful tools.</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                    >
                      Upload Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)
}
