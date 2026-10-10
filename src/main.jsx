import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './pages/Home.jsx';
import Directory from './pages/Directory.jsx';
import Discover from './pages/Discover.jsx';
import Analytics from './pages/Analytics.jsx';
import About from './pages/About.jsx';
import Contribute from './pages/Contribute.jsx';
import { DataLicense, Privacy, Terms, TermsOfUse } from './pages/legal.jsx';

const PAGES = {
  home: Home,
  analytics: Analytics,
  directory: Directory,
  discover: Discover,
  about: About,
  contribute: Contribute,
  terms: Terms,
  'terms-of-use': TermsOfUse,
  privacy: Privacy,
  'data-license': DataLicense,
};

const root = document.getElementById('root');
const Page = PAGES[root.dataset.page] || Home;
createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
