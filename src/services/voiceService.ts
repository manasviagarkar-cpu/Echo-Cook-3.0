/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const voiceService = {
  activeRecognition: null as any,

  speak(text: string, onEnd?: () => void) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  },

  stop() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      this.activeRecognition = null;
    }
  },

  listen(): Promise<string> {
    this.stop();

    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser."));
        return;
      }

      const recognition = new SpeechRecognition();
      this.activeRecognition = recognition;
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Increased timeout to 12 seconds for better user experience
      const timeout = setTimeout(() => {
        if (this.activeRecognition === recognition) {
          recognition.abort();
          reject(new Error("Listening timed out. Please try again."));
        }
      }, 12000);

      recognition.onresult = (event: any) => {
        clearTimeout(timeout);
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        if (event.error === 'aborted') {
          // Only reject if this was the active recognition and not explicitly stopped
          if (this.activeRecognition === recognition) {
            reject(new Error("Listening was interrupted."));
          }
        } else if (event.error === 'no-speech') {
          reject(new Error("No speech detected."));
        } else if (event.error === 'not-allowed') {
          reject(new Error("Microphone access denied."));
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        clearTimeout(timeout);
        if (this.activeRecognition === recognition) {
          this.activeRecognition = null;
        }
      };

      try {
        recognition.start();
      } catch (e) {
        clearTimeout(timeout);
        reject(new Error("Could not start listening."));
      }
    });
  }
};
