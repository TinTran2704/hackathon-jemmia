import { BrowserRouter, Routes, Route } from "react-router-dom";
import JobsPage from "./pages/JobsPage.jsx";
import JobDetailPage from "./pages/JobDetailPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
