export type CropState = "inactive" | "creating" | "set" | "moving" | "resizing";
export type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;
export type Filter = "none" | "grayscale" | "sepia" | "vintage";
export type BlurMode = "marked" | "unmarked";
export type Tool = "pencil" | "eraser" | "blur" | "text" | "crop";

export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
