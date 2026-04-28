'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

interface SearchBarProps {
  onSelect: (lng: number, lat: number, name: string) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${token}&limit=5`
        );
        const data = await response.json();
        setResults(data.features || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result.center[0], result.center[1], result.place_name);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        <div className={styles.searchIcon}>
          {isLoading ? <Loader2 className={styles.spin} size={20} /> : <Search size={20} />}
        </div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search for a city, state, or place..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setShowDropdown(true)}
        />
        {query && (
          <button className={styles.clearButton} onClick={() => setQuery('')}>
            <X size={18} />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className={styles.dropdown} ref={dropdownRef}>
          {results.map((result) => (
            <div
              key={result.id}
              className={styles.resultItem}
              onClick={() => handleSelect(result)}
            >
              <MapPin size={16} className={styles.pinIcon} />
              <span className={styles.placeName}>{result.place_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
