import { createRoot } from "react-dom/client";
import { App } from "./App";
import { routeGoogleCallsToTheSite } from "./net";

// the website's look: light theme, comfortable density (the website sets these before it paints)
document.documentElement.dataset.theme = "light";
document.documentElement.dataset.density = "comfortable";
document.documentElement.dataset.fontsize = "medium";

routeGoogleCallsToTheSite();
createRoot(document.getElementById("root")!).render(<App />);
