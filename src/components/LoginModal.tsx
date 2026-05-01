'use client';

import React, { useState } from 'react';
import { User, ArrowRight, Sparkles } from 'lucide-react';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  onLogin: (name: string) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <Sparkles className={styles.sparkle} size={24} />
            <User className={styles.userIcon} size={40} />
          </div>
          
          <h1 className={styles.title}>Welcome Explorer</h1>
          <p className={styles.subtitle}>Enter your name to start planning your next great adventure.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputWrapper}>
              <input 
                autoFocus
                type="text" 
                placeholder="What's your name?" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!name.trim()}
              className={styles.loginBtn}
            >
              <span>Begin Journey</span>
              <ArrowRight size={20} />
            </button>
          </form>
          
          <div className={styles.footer}>
            <p>Your trips are saved automatically to your browser.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
