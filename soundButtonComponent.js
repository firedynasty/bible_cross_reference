import React, { useRef, useState } from 'react';

const SoundButton = () => {
  const [buttonText, setButtonText] = useState('Play Sound');
  const audioContextRef = useRef(null);
  const lastPlayedTimeRef = useRef(0);
  
  // Function to create and play a subtle beep
  const playSubtleBeep = () => {
    const now = Date.now();
    
    // Visual feedback that button was pressed
    setButtonText('Playing...');
    setTimeout(() => setButtonText('Play Sound'), 300);
    
    try {
      // Create audio context on first use (must be triggered by user action)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const context = audioContextRef.current;
      
      // Create oscillator
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Configure sound properties
      oscillator.type = 'sine'; // sine waves are smoother than square or sawtooth
      oscillator.frequency.value = 800; // gentle higher frequency
      gainNode.gain.value = 0.05; // very quiet (values from 0 to 1)
      
      // Schedule envelope for super-short beep
      gainNode.gain.setValueAtTime(0.05, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
      
      // Play and stop
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Notification Sound Demo
        </h1>
        
        <button 
          className="px-6 py-3 bg-blue-500 text-white font-medium rounded-md 
                    hover:bg-blue-600 active:bg-blue-700 focus:outline-none 
                    focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                    transition duration-150 ease-in-out w-full"
          onClick={playSubtleBeep}
        >
          {buttonText}
        </button>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Click the button above to play a subtle notification sound.</p>
          <p className="mt-2 text-xs text-gray-500">
            Using Web Audio API with a sine wave oscillator at 800Hz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SoundButton;
