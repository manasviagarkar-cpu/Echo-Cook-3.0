/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Timer as TimerIcon, 
  ShoppingBag, 
  Package, 
  ChefHat, 
  Scale, 
  Plus, 
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { geminiService } from './services/geminiService';
import { voiceService } from './services/voiceService';
import { Recipe, RecipeStep, ActiveTimer, VoiceVibe, CookingSession, RecipeOption } from './types';

import Markdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [vibe, setVibe] = useState<VoiceVibe>('Relaxed Chef');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeOptions, setRecipeOptions] = useState<RecipeOption[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [scale, setScale] = useState(1);

  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [pantry, setPantry] = useState<any[]>([
    { id: '1', name: 'Spaghetti', quantity: '500', unit: 'g' },
    { id: '2', name: 'Butter', quantity: '250', unit: 'g' }
  ]);
  const [shoppingList, setShoppingList] = useState<string[]>(['Garlic']);
  const [statusMessage, setStatusMessage] = useState("Initializing Echo-Cook 3.0...");

  // Initial Greeting & Inventory Scan
  useEffect(() => {
    const inventoryNames = pantry.map(p => p.name).join(', ');
    const greeting = `Ready to cook. I see you have ${inventoryNames}. What's the vibe today? [TRIGGER_MIC]`;
    
    const spokenPart = greeting.replace(/\[TRIGGER_MIC\]/g, "").trim();
    setStatusMessage(spokenPart);
    voiceService.speak(spokenPart, () => {
      handleVoiceCommand();
    });
  }, []);

  // Speak step on change
  useEffect(() => {
    if (recipe) {
      const step = recipe.steps[currentStep];
      voiceService.speak(step.instruction);
      
      // Proactive Timer Check
      if (step.timerDuration) {
        voiceService.speak(`Should I start a ${Math.floor(step.timerDuration / 60)} minute ${step.timerName} for you?`);
      }
    }
  }, [currentStep, recipe]);

  // Timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        if (timer.status === 'running') {
          const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
          const remaining = Math.max(0, timer.duration - elapsed);
          if (remaining === 0) {
            voiceService.speak(`Timer for ${timer.name} is finished!`);
            return { ...timer, status: 'finished' as const };
          }
        }
        return timer;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTimer = (name: string, duration: number) => {
    const newTimer: ActiveTimer = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      duration,
      startTime: Date.now(),
      status: 'running'
    };
    setTimers(prev => [...prev, newTimer]);
  };

  const formatTimerDisplay = (timer: ActiveTimer) => {
    const elapsed = timer.status === 'running' ? Math.floor((Date.now() - timer.startTime) / 1000) : 0;
    const remaining = Math.max(0, timer.duration - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVoiceCommand = async () => {
    if (isListening) {
      voiceService.stop();
      setIsListening(false);
      setStatusMessage("Listening cancelled.");
      return;
    }

    setIsListening(true);
    setStatusMessage("Listening...");
    try {
      const transcript = await voiceService.listen();
      setStatusMessage(`Heard: "${transcript}"`);
      const context = { recipe, currentStep, scale, timers, pantry, shoppingList };
      
      // Handle "What can I make?" specifically for the Multi-Recipe Engine
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes("what can i make") || lowerTranscript.includes("suggest") || lowerTranscript.includes("options")) {
        const options = await geminiService.getRecipeOptions(pantry);
        setRecipeOptions(options);
        const optionTitles = options.map(o => o.title).join(', or ');
        const response = `I found 3 things you can make: ${optionTitles}. Which sounds good? [TRIGGER_MIC]`;
        
        // Handle Listen-Loop
        const spokenPart = response.replace(/\[TRIGGER_MIC\]/g, "").trim();
        voiceService.speak(spokenPart, () => {
          if (response.includes("[TRIGGER_MIC]")) {
            handleVoiceCommand();
          }
        });
        
        setStatusMessage(spokenPart);
        return;
      }

      // Handle Recipe Selection
      if (recipeOptions.length > 0 && !recipe) {
        const selectedOption = recipeOptions.find(o => lowerTranscript.includes(o.title.toLowerCase()));
        if (selectedOption) {
          const fullRecipe = await geminiService.parseRecipe(selectedOption.title);
          setRecipe(fullRecipe);
          setRecipeOptions([]);
          setCurrentStep(0);
          const response = `Great choice. Let's make ${fullRecipe.title}. Step 1: ${fullRecipe.steps[0].instruction} [TRIGGER_MIC]`;
          
          const spokenPart = response.replace(/\[TRIGGER_MIC\]/g, "").trim();
          voiceService.speak(spokenPart, () => {
            if (response.includes("[TRIGGER_MIC]")) {
              handleVoiceCommand();
            }
          });
          return;
        }
      }

      const rawResponse = await geminiService.generateVoiceResponse(transcript, vibe, context);
      
      // Parse Echo-Cook 4.0 Format
      // Expected: ## Step X \n [Instruction] \n 📸 [Ingredients] \n\n [Spoken] [TRIGGER_MIC]
      const parts = rawResponse.split("\n\n");
      const uiPart = parts[0] || "";
      const spokenPartWithTag = parts[1] || uiPart;
      const spokenPart = spokenPartWithTag.replace(/\[TRIGGER_MIC\]/g, "").trim();

      setStatusMessage(uiPart);
      
      voiceService.speak(spokenPart, () => {
        if (spokenPartWithTag.includes("[TRIGGER_MIC]")) {
          handleVoiceCommand();
        }
      });

      if (lowerTranscript.includes("next") || lowerTranscript.includes("continue")) {
        setCurrentStep(prev => Math.min((recipe?.steps.length || 1) - 1, prev + 1));
      } else if (lowerTranscript.includes("previous") || lowerTranscript.includes("back")) {
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (lowerTranscript.includes("timer") && lowerTranscript.includes("start")) {
        const step = recipe?.steps[currentStep];
        if (step?.timerDuration) {
          addTimer(step.timerName || "Kitchen Timer", step.timerDuration);
        }
      }
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error.message || "Voice command failed.");
      voiceService.speak(error.message || "I didn't catch that. Please try again.", () => {
        // Retry loop on error
        handleVoiceCommand();
      });
    } finally {
      setIsListening(false);
    }
  };

  const currentStepData = recipe?.steps[currentStep];

  return (
    <div className="min-h-screen bg-[#0A0502] text-white font-sans overflow-hidden relative">
      {/* Background Visual Anchor */}
      <AnimatePresence mode="wait">
        <motion.div
          key={recipe ? currentStep : 'idle'}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.4, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={`https://picsum.photos/seed/${recipe ? (currentStepData?.visualAnchor || 'cooking') : 'kitchen'}/1920/1080?blur=2`}
            alt="Visual Anchor"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0502] via-transparent to-[#0A0502]/50" />
        </motion.div>
      </AnimatePresence>

      {/* HUD Overlay */}
      <div className="relative z-10 h-screen flex flex-col p-8 md:p-12">
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-50">Echo-Cook 3.0 // Polyglot Intelligence</span>
            </div>
            <h1 className="text-4xl font-light tracking-tighter">
              {recipe?.title || (recipeOptions.length > 0 ? 'Choose Your Recipe' : 'Echo-Cook 3.0')}
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase opacity-50">Scale</p>
                <p className="text-xl font-light">{scale}x</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase opacity-50">Step</p>
                <p className="text-xl font-light">{recipe ? `${currentStep + 1} / ${recipe.steps.length}` : '--'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center items-center text-center max-w-4xl mx-auto space-y-12">
          {recipeOptions.length > 0 && !recipe ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {recipeOptions.map((option, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-left space-y-4"
                >
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    option.vibe === 'Quick' ? "bg-emerald-500/20 text-emerald-400" :
                    option.vibe === 'Healthy' ? "bg-blue-500/20 text-blue-400" :
                    "bg-orange-500/20 text-orange-400"
                  )}>
                    {option.vibe}
                  </span>
                  <h3 className="text-2xl font-light">{option.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{option.description}</p>
                  {option.missingIngredients.length > 0 && (
                    <p className="text-[10px] text-red-400 font-mono uppercase">Missing: {option.missingIngredients.join(', ')}</p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              key={recipe ? currentStep : 'idle'}
              className="space-y-4 w-full"
            >
              <div className="markdown-body text-left max-w-2xl mx-auto">
                <Markdown
                  components={{
                    h2: ({node, ...props}) => <h2 className="text-4xl md:text-6xl font-light leading-[1.1] tracking-tight mb-4 text-emerald-400" {...props} />,
                    p: ({node, ...props}) => <p className="text-2xl md:text-3xl font-light leading-relaxed opacity-80" {...props} />,
                  }}
                >
                  {statusMessage}
                </Markdown>
              </div>
              
              {recipe && currentStepData?.hudOverlay && (
                <div className="mt-8 bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-2xl inline-block">
                  <p className="text-3xl font-bold tracking-tighter text-emerald-400">{currentStepData.hudOverlay}</p>
                </div>
              )}
            </motion.div>
          )}
        </main>

        <footer className="flex justify-between items-end">
          <div className="flex gap-4">
            {timers.map(timer => (
              <motion.div
                layout
                key={timer.id}
                className={cn(
                  "bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-w-[160px] space-y-1",
                  timer.status === 'finished' && "border-red-500/50 bg-red-500/10"
                )}
              >
                <p className="text-[10px] font-mono uppercase opacity-50">{timer.name}</p>
                <p className={cn(
                  "text-3xl font-mono font-bold tabular-nums",
                  timer.status === 'finished' && "text-red-500 animate-pulse"
                )}>
                  {formatTimerDisplay(timer)}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">
              {isListening ? 'Listening...' : 'Say "What can I make?"'}
            </p>
            <button
              onClick={handleVoiceCommand}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 relative",
                isListening 
                  ? "bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)] scale-110" 
                  : "bg-white text-black hover:scale-105"
              )}
            >
              {isListening ? <Volume2 size={32} /> : <Mic size={32} />}
              {isListening && (
                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500 opacity-20" />
              )}
            </button>
          </div>

          <div className="text-right space-y-2">
            <div className="flex items-center justify-end gap-2 text-[#8E9299]">
              <Package size={14} />
              <span className="text-[10px] font-mono uppercase tracking-widest">Pantry Sync</span>
            </div>
            <div className="space-y-1">
              {pantry.slice(0, 3).map(p => (
                <p key={p.id} className="text-xs opacity-50">{p.name} ({p.quantity}{p.unit})</p>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
