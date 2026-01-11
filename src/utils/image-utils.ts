import { Point, CropRect, ResizeHandle, BlurMode } from "../types/wimp";

export const boundCoordinates = (
    x: number,
    y: number,
    canvas: HTMLCanvasElement,
): Point => {
    return {
        x: Math.max(0, Math.min(x, canvas.width)),
        y: Math.max(0, Math.min(y, canvas.height)),
    };
};

export const flipAspectRatio = (ratio: string): string => {
    if (ratio === "1:1") return "1:1";
    const [w, h] = ratio.split(":").map(Number);
    return `${h}:${w}`;
};

export const getCropRect = (
    cropStart: Point | null,
    cropEnd: Point | null,
): CropRect | null => {
    if (!cropStart || !cropEnd) return null;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);

    return { x, y, width, height };
};

export const getResizeHandle = (
    mouseX: number,
    mouseY: number,
    rect: CropRect | null,
): ResizeHandle => {
    if (!rect) return null;

    const tolerance = 6;

    if (
        Math.abs(mouseX - rect.x) <= tolerance &&
        Math.abs(mouseY - rect.y) <= tolerance
    )
        return "nw";
    if (
        Math.abs(mouseX - (rect.x + rect.width)) <= tolerance &&
        Math.abs(mouseY - rect.y) <= tolerance
    )
        return "ne";
    if (
        Math.abs(mouseX - rect.x) <= tolerance &&
        Math.abs(mouseY - (rect.y + rect.height)) <= tolerance
    )
        return "sw";
    if (
        Math.abs(mouseX - (rect.x + rect.width)) <= tolerance &&
        Math.abs(mouseY - (rect.y + rect.height)) <= tolerance
    )
        return "se";

    return null;
};

export const isInsideCropArea = (
    mouseX: number,
    mouseY: number,
    rect: CropRect | null,
): boolean => {
    if (!rect) return false;

    return (
        mouseX >= rect.x &&
        mouseX <= rect.x + rect.width &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.height
    );
};

export const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
): Point => {
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;

    if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return { x: 0, y: 0 };
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    return boundCoordinates(x, y, canvas);
};

export const applySecureBlur = (
    imageData: ImageData,
    maskData: ImageData,
    radius: number,
    mode: BlurMode,
): ImageData => {
    const { width, height, data } = imageData;
    const mask = maskData.data;
    const output = new ImageData(new Uint8ClampedArray(data), width, height);
    const outData = output.data;

    // Simple box blur implementation
    // For each pixel, if it matches the criteria (marked/unmarked), 
    // calculate the average of its neighbors within the radius.

    // We'll use a temporary copy to avoid using already blurred pixels in the same pass
    const source = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const isMarked = mask[idx + 3] > 128; // Using alpha channel for mask

            const shouldBlur = mode === "marked" ? isMarked : !isMarked;

            if (shouldBlur) {
                let r = 0, g = 0, b = 0, count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = (ny * width + nx) * 4;
                            r += source[nidx];
                            g += source[nidx + 1];
                            b += source[nidx + 2];
                            count++;
                        }
                    }
                }

                outData[idx] = r / count;
                outData[idx + 1] = g / count;
                outData[idx + 2] = b / count;
            }
        }
    }

    return output;
};
