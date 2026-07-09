import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage.tsx';
import CardPage from './pages/CardPage.tsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route pointing to the primary welcome gateway */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Route loading your secure inner dashboard workspace */}
        <Route path="/cards" element={<CardPage />} />
        
        {/* Security fallback: instantly boots untracked links back to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;