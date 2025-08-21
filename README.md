# Image Editor Pro

I created this project because I couldn't find an open-source and free-to-use image editor library that had solid touch support and was actively maintained. My goal is to provide a powerful and easy-to-use image editor for developers to integrate into their projects.

This project is a professional image editing application built with React and HTML5 Canvas.

## Features

- **Transform Tools:** Rotate, flip, and resize your image with ease.
- **Crop Tools:** Crop your images with various aspect ratio guides or freeform.
- **Drawing Tools:** Draw on your images with a pencil and eraser.
- **File Operations:** Open, save, and export your images.
- **Undo/Redo:** Don't worry about making mistakes, you can always undo and redo your actions.
- **Touch Support:** Works on mobile devices with touch support.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/image-Ed.git
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Start the development server:**
    ```bash
    bun run dev
    ```

## Using it as a Library

To use this image editor in your own project, you can import the `ImageEditor` component and use it in your application.

```jsx
import ImageEditor from 'image-ed';

function App() {
  return (
    <div>
      <h1>My Awesome App</h1>
      <ImageEditor />
    </div>
  );
}
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.