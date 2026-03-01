import React from 'react';
import { RadioProvider, useRadio } from './context/RadioContext';
import EntryPage from './components/EntryPage';
import RadioPage from './components/RadioPage';

function AppContent() {
  const { user } = useRadio();
  return user ? <RadioPage /> : <EntryPage />;
}

function App() {
  return (
    <RadioProvider>
      <AppContent />
    </RadioProvider>
  );
}

export default App;
