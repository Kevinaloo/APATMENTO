import {createRoot} from "react-dom/client";import Home from "./app/page";createRoot(document.getElementById("root")!).render(<Home/>);document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.querySelector('[data-slot="dialog-content"]'))window.parent.postMessage({type:"cabana-tour-close"},location.origin)});

