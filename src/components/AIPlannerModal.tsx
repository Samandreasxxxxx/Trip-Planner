'use client';

import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import styles from './AIPlannerModal.module.css';
import { TripStop } from '@/types';

interface AIPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (stops: TripStop[]) => void;
}

export default function AIPlannerModal({ isOpen, onClose, onGenerate }: AIPlannerModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);

    // Simulate AI generation delay
    setTimeout(() => {
      const isParis = prompt.toLowerCase().includes('paris');
      const isTokyo = prompt.toLowerCase().includes('tokyo');
      
      let newStops: TripStop[] = [];
      const baseId = crypto.randomUUID();

      if (isParis) {
        newStops = [
          { id: `${baseId}-1`, title: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, dayNumber: 1, category: 'sightseeing', emoji: '🗼' },
          { id: `${baseId}-2`, title: 'Louvre Museum', lat: 48.8606, lng: 2.3376, dayNumber: 1, category: 'sightseeing', emoji: '🖼️' },
          { id: `${baseId}-3`, title: 'Le Marais (Food)', lat: 48.8575, lng: 2.3588, dayNumber: 2, category: 'restaurant', emoji: '🥐' },
        ];
      } else if (isTokyo) {
        newStops = [
          { id: `${baseId}-1`, title: 'Shibuya Crossing', lat: 35.6595, lng: 139.7005, dayNumber: 1, category: 'sightseeing', emoji: '🚶' },
          { id: `${baseId}-2`, title: 'Tsukiji Outer Market', lat: 35.6655, lng: 139.7707, dayNumber: 1, category: 'restaurant', emoji: '🍣' },
          { id: `${baseId}-3`, title: 'Senso-ji Temple', lat: 35.7148, lng: 139.7967, dayNumber: 2, category: 'sightseeing', emoji: '⛩️' },
        ];
      } else {
        // Generic response
        newStops = [
          { id: `${baseId}-1`, title: 'City Center', lat: 40.7128, lng: -74.0060, dayNumber: 1, category: 'sightseeing', emoji: '🏙️' },
          { id: `${baseId}-2`, title: 'Famous Local Restaurant', lat: 40.7138, lng: -74.0070, dayNumber: 1, category: 'restaurant', emoji: '🍽️' },
          { id: `${baseId}-3`, title: 'Main Museum', lat: 40.7148, lng: -74.0080, dayNumber: 2, category: 'sightseeing', emoji: '🏛️' },
        ];
      }

      onGenerate(newStops);
      setIsGenerating(false);
      onClose();
      setPrompt('');
    }, 2000);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <Sparkles className={styles.icon} size={20} />
            <h2>Inspire My Next Adventure</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.description}>
            Where do you want to go? Tell us what you love (food, art, nature), and we'll help you find the best spots!
            <br/>
            <small>Try: "Show me the best street food in Tokyo" or "A romantic weekend in Paris"</small>
          </p>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I'm dreaming of..."
            rows={4}
          />
          <button 
            className={styles.generateBtn} 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? <Loader2 className={styles.spin} size={18} /> : <Sparkles size={18} />}
            <span>{isGenerating ? 'Building Your Adventure...' : 'Magic Planner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
