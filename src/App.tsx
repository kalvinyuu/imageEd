import Wimp from "./Wimp";

export function App() {
  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8"></div>

      <h1 className="text-5xl font-bold my-4 leading-tight">wimp</h1>
      <Wimp />
    </div>
  );
}

export default App;
