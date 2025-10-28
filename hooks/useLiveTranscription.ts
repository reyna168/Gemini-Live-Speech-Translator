
import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveSession, Modality, LiveServerMessage } from '@google/genai';
import { createBlob } from '../utils/audio';

const SYSTEM_INSTRUCTION = "You are a real-time translator. Transcribe the user's spoken Chinese and provide an English translation.";

interface UseLiveTranscriptionProps {
  onTranscriptionUpdate: (update: { user: string; model: string }) => void;
  onTurnComplete: (userText: string, modelText: string) => void;
}

export const useLiveTranscription = ({ onTranscriptionUpdate, onTurnComplete }: UseLiveTranscriptionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopTranscription = useCallback(() => {
    setIsRecording(false);
    setError(null);

    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Disconnect script processor and close audio context
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close Gemini session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        session.close();
      }).catch(console.error);
      sessionPromiseRef.current = null;
    }
    
    // Final turn completion check
    if(currentInputTranscriptionRef.current || currentOutputTranscriptionRef.current) {
        onTurnComplete(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
    }
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

  }, [onTurnComplete]);

  const startTranscription = useCallback(async () => {
    setIsRecording(true);
    setError(null);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    try {
      if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
      }
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
             // Setup audio processing once connection is open
             const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
             audioContextRef.current = inputAudioContext;

             const source = inputAudioContext.createMediaStreamSource(mediaStreamRef.current!);
             const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
             scriptProcessorRef.current = scriptProcessor;

             scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                 const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                 const pcmBlob = createBlob(inputData);
                 if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    }).catch(err => {
                        console.error("Error sending audio data:", err);
                        stopTranscription();
                    });
                 }
             };
             source.connect(scriptProcessor);
             scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
              let userUpdate = '';
              let modelUpdate = '';

              if (message.serverContent?.inputTranscription) {
                  userUpdate = message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.outputTranscription) {
                  modelUpdate = message.serverContent.outputTranscription.text;
              }

              if (userUpdate || modelUpdate) {
                onTranscriptionUpdate({ user: userUpdate, model: modelUpdate });
              }

              if(message.serverContent?.turnComplete) {
                const finalUserInput = currentInputTranscriptionRef.current + userUpdate;
                const finalModelOutput = currentOutputTranscriptionRef.current + modelUpdate;
                onTurnComplete(finalUserInput, finalModelOutput);
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
              } else {
                currentInputTranscriptionRef.current += userUpdate;
                currentOutputTranscriptionRef.current += modelUpdate;
              }
          },
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setError(`Connection error: ${e.message}`);
            stopTranscription();
          },
          onclose: (e: CloseEvent) => {
            console.log("Session closed.");
            stopTranscription();
          },
        },
      });

    } catch (err: any) {
      console.error("Failed to start transcription:", err);
      let errorMessage = "Failed to start recording.";
      if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (err.message) {
          errorMessage = err.message;
      }
      setError(errorMessage);
      setIsRecording(false);
    }
  }, [onTranscriptionUpdate, onTurnComplete, stopTranscription]);

  return { isRecording, error, startTranscription, stopTranscription };
};
