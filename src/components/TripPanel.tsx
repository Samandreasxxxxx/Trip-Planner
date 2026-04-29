'use client';

import React, { useMemo, useState } from 'react';
import styles from './TripPanel.module.css';
import { MapPin, Trash2, Navigation, ChevronLeft, ChevronUp, ChevronDown, Trash, Download, Copy, Loader2, Check } from 'lucide-react';
import { TripStop } from '@/types';
import { calculateDistance } from '@/utils/distance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TripPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stops: TripStop[];
  onRemoveStop: (id: string) => void;
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
  onReorderStops: (stops: TripStop[]) => void;
  onClearAll: () => void;
}

export default function TripPanel({ 
  isOpen,
  onClose,
  stops, 
  onRemoveStop,
  onUpdateStop,
  onStopClick,
  onReorderStops,
  onClearAll
}: TripPanelProps) {

  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const totalDistance = useMemo(() => {
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      total += calculateDistance(stops[i-1].lat, stops[i-1].lng, stops[i].lat, stops[i].lng);
    }
    return total;
  }, [stops]);

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    
    [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
    onReorderStops(newStops);
  };

  const copyToClipboard = async () => {
    if (stops.length === 0) return;
    let text = `My Trip Itinerary (${stops.length} stops, ${totalDistance.toFixed(0)} km)\n\n`;
    stops.forEach((stop, index) => {
      text += `${index + 1}. ${stop.title}\n`;
      if (stop.description) text += `   Notes: ${stop.description}\n`;
      if (index < stops.length - 1) {
        const dist = calculateDistance(stop.lat, stop.lng, stops[index+1].lat, stops[index+1].lng);
        text += `   ↓ Drive ${dist.toFixed(1)} km to next stop\n`;
      }
      text += '\n';
    });
    
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const exportToPDF = async () => {
    if (stops.length === 0) return;
    setIsExporting(true);

    try {
      const mapContainer = document.querySelector('.mapboxgl-map') as HTMLElement;
      if (!mapContainer) throw new Error("Map container not found");

      // Capture map with html2canvas to include markers
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Page 1: Cover and Map
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.text('Your Trip Itinerary', 15, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`${stops.length} Stops • ${totalDistance.toFixed(0)} km Total Distance`, 15, 30);

      // Add map image (maintain aspect ratio)
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 15;
      const maxWidth = pageWidth - (margin * 2);
      const mapHeight = (imgProps.height * maxWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', margin, 40, maxWidth, mapHeight);

      // Page 2+: Details
      pdf.addPage();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(0);
      pdf.text('Stop Details', 15, 20);

      let yPos = 35;
      
      stops.forEach((stop, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }

        // Stop Number and Title
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241); // Indigo color
        pdf.text(`${index + 1}.`, 15, yPos);
        
        pdf.setTextColor(0);
        const splitTitle = pdf.splitTextToSize(stop.title, maxWidth - 15);
        pdf.text(splitTitle, 25, yPos);
        yPos += (splitTitle.length * 6) + 2;

        // Notes/Description
        if (stop.description) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(10);
          pdf.setTextColor(100);
          const splitDesc = pdf.splitTextToSize(`Notes: ${stop.description}`, maxWidth - 10);
          pdf.text(splitDesc, 25, yPos);
          yPos += (splitDesc.length * 5) + 4;
        } else {
          yPos += 2;
        }

        // Distance to next
        if (index < stops.length - 1) {
          const dist = calculateDistance(stop.lat, stop.lng, stops[index+1].lat, stops[index+1].lng);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(150);
          pdf.text(`↓ ${dist.toFixed(1)} km to next stop`, 25, yPos);
          yPos += 12;
        }
      });

      pdf.save('Trip-Itinerary.pdf');

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Make sure all map tiles are loaded.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>Your Trip Plan</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <ChevronLeft size={20} />
          </button>
        </div>
        {stops.length > 0 && (
          <div className={styles.headerStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stops.length}</span>
              <span className={styles.statLabel}>Stops</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{totalDistance.toFixed(0)}</span>
              <span className={styles.statLabel}>Total km</span>
            </div>
            <button className={styles.clearAllButton} onClick={onClearAll} title="Clear All">
              <Trash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {stops.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <MapPin size={40} className={styles.emptyIcon} />
            </div>
            <h3>No stops added yet</h3>
            <p>Press <span className={styles.shortcut}>Alt + A</span> to select the Pin tool, then click the map to add a stop.</p>
          </div>
        )}

        <div className={styles.stopsList}>
          {stops.map((stop, index) => {
            let distanceToPrev = 0;
            if (index > 0) {
              const prev = stops[index - 1];
              distanceToPrev = calculateDistance(prev.lat, prev.lng, stop.lat, stop.lng);
            }

            return (
              <React.Fragment key={stop.id}>
                {index > 0 && (
                  <div className={styles.distanceIndicator}>
                    <div className={styles.line}></div>
                    <div className={styles.distanceBadge}>
                      <Navigation size={12} />
                      <span>{distanceToPrev.toFixed(1)} km</span>
                    </div>
                  </div>
                )}
                <div 
                  className={styles.stopCard} 
                  onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                >
                  <div className={styles.stopCardLeft}>
                    <div className={styles.stopNumber}>{index + 1}</div>
                    <div className={styles.reorderButtons}>
                      <button 
                        disabled={index === 0} 
                        onClick={(e) => { e.stopPropagation(); moveStop(index, 'up'); }}
                        className={styles.reorderBtn}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        disabled={index === stops.length - 1} 
                        onClick={(e) => { e.stopPropagation(); moveStop(index, 'down'); }}
                        className={styles.reorderBtn}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.stopInfo} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="text"
                      className={styles.inlineInputTitle}
                      value={stop.title}
                      onChange={(e) => onUpdateStop(stop.id, { title: e.target.value })}
                      placeholder="Stop Name"
                      onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                    />
                    <textarea 
                      className={styles.inlineInputDesc}
                      value={stop.description || ''}
                      onChange={(e) => onUpdateStop(stop.id, { description: e.target.value })}
                      placeholder="Add notes, times, or details..."
                      rows={1}
                      onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                    />
                  </div>
                  <button 
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStop(stop.id);
                    }}
                    title="Remove Stop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {stops.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionButton} ${styles.copyBtn}`} 
              onClick={copyToClipboard}
              title="Copy as text"
            >
              {isCopied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button 
              className={`${styles.actionButton} ${styles.exportBtn}`} 
              onClick={exportToPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 size={18} className={styles.spin} /> : <Download size={18} />}
              <span>{isExporting ? 'Generating PDF...' : 'Export as PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
