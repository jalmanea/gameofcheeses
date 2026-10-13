import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AudienceScreen } from './components/AudienceScreen';
import { isAudienceWindow } from './presenter/presenter';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAudienceWindow() ? <AudienceScreen /> : <App />}
  </StrictMode>,
);
