/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  addedAt: number;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  originalText: string;
}

export interface RecipeStep {
  instruction: string;
  coreAction: string;
  visualAnchor: string; // URL to image/GIF
  timerDuration?: number; // in seconds
  timerName?: string;
  hudOverlay?: string; // Specific data to highlight
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface ActiveTimer {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  status: 'running' | 'paused' | 'finished';
}

export type VoiceVibe = 'Quick & Energetic' | 'Relaxed Chef';

export interface RecipeOption {
  title: string;
  description: string;
  vibe: 'Quick' | 'Healthy' | 'Adventurous';
  missingIngredients: string[];
}

export interface CookingSession {
  recipeId: string;
  currentStepIndex: number;
  servingsScale: number;
  vibe: VoiceVibe;
  timers: ActiveTimer[];
}
