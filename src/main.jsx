import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./app/App.jsx"; 
import './index.css'
import "prismjs/themes/prism-tomorrow.css";
import "@fontsource/fira-code";



createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
