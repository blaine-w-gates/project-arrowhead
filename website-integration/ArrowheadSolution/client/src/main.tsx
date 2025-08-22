import { createRoot } from "react-dom/client";
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // TEMPORARILY REMOVED - Testing if this causes 500 error
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
