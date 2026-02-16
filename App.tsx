import React, { useEffect, useState } from 'react';
import SetupMode from './components/SetupMode';
import ExecutionMode from './components/ExecutionMode';
import { getExecutionData } from './services/storageService';
import { ExecutionData } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<ExecutionData | null>(null);

  const loadData = () => {
    const stored = getExecutionData();
    setData(stored);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!data) return null; // or a simple loading spinner

  return (
    <>
      {data.settings.mode === 'setup' ? (
        <SetupMode initialData={data} onComplete={loadData} />
      ) : (
        <ExecutionMode data={data} onRefreshData={loadData} />
      )}
    </>
  );
};

export default App;