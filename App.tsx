
import React, { useState, useCallback, useRef } from 'react';
import { useLiveTranscription } from './hooks/useLiveTranscription';
import { MicrophoneIcon, StopIcon } from './components/Icon';
import StatusIndicator from './components/StatusIndicator';
import type { TranscriptionTurn } from './types';

const App: React.FC = () => {
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionTurn[]>([]);
  const [currentUserTranscription, setCurrentUserTranscription] = useState('');
  const [currentModelTranscription, setCurrentModelTranscription] = useState('');
  const lastUserTranscriptionRef = useRef('');

  const onTranscriptionUpdate = useCallback((update: { user: string; model: string }) => {
    if (update.user) {
        setCurrentUserTranscription(lastUserTranscriptionRef.current + update.user);
    }
    if (update.model) {
        setCurrentModelTranscription(update.model);
    }
  }, []);

  const onTurnComplete = useCallback((userText: string, modelText: string) => {
    if (userText.trim() || modelText.trim()) {
        setTranscriptionHistory(prev => [...prev, { user: userText, model: modelText }]);
    }
    lastUserTranscriptionRef.current = '';
    setCurrentUserTranscription('');
    setCurrentModelTranscription('');
  }, []);

  const { isRecording, error, startTranscription, stopTranscription } = useLiveTranscription({
    onTranscriptionUpdate,
    onTurnComplete,
  });

  const toggleRecording = () => {
    if (isRecording) {
      stopTranscription();
    } else {
      startTranscription();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Live Speech Translator</h1>
          <p className="text-lg text-gray-400 mt-2">Speak Chinese and see the English translation in real-time.</p>
        </header>

        <main className="flex-grow bg-gray-800 rounded-2xl shadow-2xl p-6 mb-8 overflow-y-auto min-h-[40vh] max-h-[60vh]">
            <div className="space-y-6">
                {transcriptionHistory.map((turn, index) => (
                    <React.Fragment key={index}>
                        <div className="flex justify-end">
                            <p className="bg-blue-600 rounded-xl p-3 max-w-xs sm:max-w-md md:max-w-lg shadow-md">{turn.user}</p>
                        </div>
                        <div className="flex justify-start">
                            <p className="bg-gray-700 rounded-xl p-3 max-w-xs sm:max-w-md md:max-w-lg shadow-md">{turn.model}</p>
                        </div>
                    </React.Fragment>
                ))}
                {isRecording && currentUserTranscription && (
                     <div className="flex justify-end">
                        <p className="bg-blue-700/70 rounded-xl p-3 max-w-xs sm:max-w-md md:max-w-lg shadow-md opacity-80">{currentUserTranscription}</p>
                    </div>
                )}
                 {isRecording && currentModelTranscription && (
                    <div className="flex justify-start">
                        <p className="bg-gray-600/70 rounded-xl p-3 max-w-xs sm:max-w-md md:max-w-lg shadow-md opacity-80">{currentModelTranscription}</p>
                    </div>
                )}
                 {!isRecording && transcriptionHistory.length === 0 && (
                     <div className="text-center text-gray-400 py-16">
                         <p>Press the microphone to start speaking.</p>
                     </div>
                 )}
            </div>
        </main>
        
        {error && <div className="text-red-400 text-center mb-4 p-3 bg-red-900/50 rounded-lg">{error}</div>}

        <footer className="flex flex-col items-center justify-center">
            <button
                onClick={toggleRecording}
                className={`transition-all duration-300 ease-in-out w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                    isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
                {isRecording ? <StopIcon /> : <MicrophoneIcon />}
            </button>
            <div className="mt-4">
                <StatusIndicator isRecording={isRecording} />
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
