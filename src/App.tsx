import ImageEditor from "./imageEd";

export function App() {
  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8"></div>

      <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
      <ImageEditor />
    </div>
  );
}

export default App;
