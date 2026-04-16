import { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [analytics, setAnalytics] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleData = (data, name) => {
    setAnalytics(data);
    setFileName(name);
  };

  const handleReset = () => {
    setAnalytics(null);
    setFileName('');
  };

  return analytics
    ? <Dashboard analytics={analytics} fileName={fileName} onReset={handleReset} />
    : <UploadScreen onData={handleData} />;
}

export default App;
