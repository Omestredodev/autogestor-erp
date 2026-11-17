import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {ApiProvider} from './controllers/ApiProvider';
import './views/styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ApiProvider><App/></ApiProvider></React.StrictMode>);
