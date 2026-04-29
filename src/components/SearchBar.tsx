'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Globe } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchResult {
  id: string;
  place_name: string;
  text: string;
  context?: { text: string }[];
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
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Types included to find smallest cities, localities, etc.
        const types = 'country,region,postcode,district,place,locality,neighborhood,address,poi';
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${token}&limit=10&types=${types}&autocomplete=true`
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
      <div className={`${styles.searchWrapper} ${showDropdown ? styles.active : ''}`}>
        <div className={styles.searchIcon}>
          {isLoading ? <Loader2 className={styles.spin} size={18} /> : <Search size={18} />}
        </div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search for any city, street or hidden gem..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        {query && (
          <button className={styles.clearButton} onClick={() => setQuery('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className={styles.dropdown} ref={dropdownRef}>
          <div className={styles.dropdownHeader}>
            <Globe size={12} />
            <span>Locations Found</span>
          </div>
          {results.map((result) => (
            <div
              key={result.id}
              className={styles.resultItem}
              onClick={() => handleSelect(result)}
            >
              <div className={styles.resultPin}>
                <MapPin size={14} />
              </div>
              <div className={styles.resultText}>
                <span className={styles.placeTitle}>{result.text}</span>
                <span className={styles.placeDetails}>
                  {result.context?.map(c => c.text).join(', ') || result.place_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
