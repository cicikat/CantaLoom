import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './patchlab.css';
import './chapters.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
