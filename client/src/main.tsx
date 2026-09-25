import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./wallet-button.css";
import { getGuestId } from "./lib/guest-id";

getGuestId();

createRoot(document.getElementById("root")!).render(<App />);
