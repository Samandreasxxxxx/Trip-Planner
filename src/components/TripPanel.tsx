'use client';

import React, { useMemo, useState } from 'react';
import styles from './TripPanel.module.css';
import { 
  MapPin, Trash2, ChevronLeft, ChevronUp, ChevronDown, 
  Trash, Download, Copy, Loader2, Check, Plus,
  Bed, Utensils, Camera, Car, HelpCircle, DollarSign,
  FolderOpen, Edit2, X, Wand2, Sparkles, Share2,
  PieChart, Link as LinkIcon, ExternalLink,
  Users, Receipt
} from 'lucide-react';
import { TripStop, Trip } from '@/types';
import { calculateDistance } from '@/utils/distance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AIPlannerModal from './AIPlannerModal';

interface TripPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stops: TripStop[];
  onRemoveStop: (id: string) => void;
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
  onReorderStops: (stops: TripStop[]) => void;
  onClearAll: () => void;
  unit: 'km' | 'mi';
  onUnitToggle: () => void;
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (id: string) => void;
  onCreateTrip: () => void;
  onDeleteTrip: (id: string) => void;
  onRenameTrip: (id: string, name: string) => void;
  onOptimizeDay: (dayNum: number) => void;
  onShareTrip: () => Promise<string | null>;
  getMapScreenshot: () => Promise<string>;
}

export default function TripPanel({ 
  isOpen,
  onClose,
  stops, 
  onRemoveStop,
  onUpdateStop,
  onStopClick,
  onReorderStops,
  onClearAll,
  unit,
  onUnitToggle,
  trips,
  activeTripId,
  onSelectTrip,
  onCreateTrip,
  onDeleteTrip,
  onRenameTrip,
  onOptimizeDay,
  onShareTrip,
  getMapScreenshot
}: TripPanelProps) {

  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [weather, setWeather] = useState<{temp: number, desc: string} | null>(null);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [showExpenseSplitter, setShowExpenseSplitter] = useState(false);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  React.useEffect(() => {
    if (activeTrip && activeTrip.name !== editingName) {
      setEditingName(activeTrip.name);
    }
  }, [activeTrip]);

  // Fetch weather for the first stop
  React.useEffect(() => {
    if (stops.length > 0) {
      const firstStop = stops[0];
      const fetchWeather = async () => {
        try {
          const res = await fetch(`https://wttr.in/${firstStop.lat},${firstStop.lng}?format=j1`);
          const data = await res.json();
          const current = data.current_condition[0];
          setWeather({
            temp: parseInt(current.temp_C),
            desc: current.weatherDesc[0].value
          });
        } catch (e) {
          console.error('Failed to fetch weather');
        }
      };
      fetchWeather();
    } else {
      setWeather(null);
    }
  }, [stops]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group stops by day
  const groupedStops = useMemo(() => {
    const groups: { [key: number]: TripStop[] } = {};
    stops.forEach(stop => {
      if (!groups[stop.dayNumber]) groups[stop.dayNumber] = [];
      groups[stop.dayNumber].push(stop);
    });
    return groups;
  }, [stops]);

  const days = useMemo(() => {
    return Object.keys(groupedStops).map(Number).sort((a, b) => a - b);
  }, [groupedStops]);

  const totalDistance = useMemo(() => {
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      total += calculateDistance(stops[i-1].lat, stops[i-1].lng, stops[i].lat, stops[i].lng);
    }
    return unit === 'km' ? total : total * 0.621371;
  }, [stops, unit]);

  const participants = activeTrip?.participants || [];

  const balances = useMemo(() => {
    const bal: { [key: string]: number } = {};
    participants.forEach(p => bal[p] = 0);
    
    stops.forEach(stop => {
      if (stop.cost && stop.paidBy) {
        const amount = stop.cost;
        const payers = stop.splitAmong || participants;
        if (payers.length > 0) {
          const splitAmount = amount / payers.length;
          bal[stop.paidBy] += amount;
          payers.forEach(p => {
            bal[p] -= splitAmount;
          });
        }
      }
    });
    return bal;
  }, [stops, participants]);

  const budgetBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {
      hotel: 0,
      restaurant: 0,
      sightseeing: 0,
      transport: 0,
      other: 0
    };
    stops.forEach(stop => {
      const cat = stop.category || 'other';
      breakdown[cat] += (stop.cost || 0);
    });
    return breakdown;
  }, [stops]);

  const totalBudget = useMemo(() => {
    return stops.reduce((sum, stop) => sum + (stop.cost || 0), 0);
  }, [stops]);

  const moveStop = (id: string, direction: 'up' | 'down') => {
    const index = stops.findIndex(s => s.id === id);
    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    
    [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
    onReorderStops(newStops);
  };

  const handleShare = async () => {
    setIsSharing(true);
    const link = await onShareTrip();
    if (link) {
      setShareLink(link);
      setTimeout(() => setShareLink(null), 5000);
    }
    setIsSharing(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeStop = stops.find(s => s.id === active.id);
      const overStop = stops.find(s => s.id === over.id);
      
      if (activeStop && overStop) {
        const oldIndex = stops.findIndex(s => s.id === active.id);
        const newIndex = stops.findIndex(s => s.id === over.id);
        
        let newStops = arrayMove(stops, oldIndex, newIndex);
        
        // If moving between different days, update the dayNumber
        if (activeStop.dayNumber !== overStop.dayNumber) {
          newStops = newStops.map(s => 
            s.id === active.id ? { ...s, dayNumber: overStop.dayNumber } : s
          );
        }
        
        onReorderStops(newStops);
      }
    }
  };

  const changeDay = (id: string, newDay: number) => {
    onUpdateStop(id, { dayNumber: Math.max(1, newDay) });
  };

  const copyToClipboard = async () => {
    if (stops.length === 0) return;
    let text = `My Trip Itinerary (${stops.length} stops, ${totalDistance.toFixed(0)} km)\n\n`;
    
    days.forEach(dayNum => {
      text += `--- DAY ${dayNum} ---\n`;
      groupedStops[dayNum].forEach((stop, index) => {
        text += `${stop.startTime ? `[${stop.startTime}] ` : ''}${stop.title}\n`;
        if (stop.description) text += `   Notes: ${stop.description}\n`;
      });
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
      const mapCanvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement;
      if (!mapContainer || !mapCanvas) throw new Error("Map container not found");

      const mapDataUrl = await getMapScreenshot();
      
      const tempImg = document.createElement('img');
      tempImg.src = mapDataUrl;
      tempImg.style.position = 'absolute';
      tempImg.style.top = '0';
      tempImg.style.left = '0';
      tempImg.style.width = '100%';
      tempImg.style.height = '100%';
      tempImg.style.zIndex = '0';
      
      mapCanvas.style.opacity = '0';
      mapContainer.insertBefore(tempImg, mapContainer.firstChild);

      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#0a0a0c'
      });

      mapCanvas.style.opacity = '1';
      tempImg.remove();

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
      pdf.text('Itinerary Details', 15, 20);

      let yPos = 35;
      
      days.forEach(dayNum => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(`Day ${dayNum}`, 15, yPos);
        yPos += 10;

        groupedStops[dayNum].forEach((stop, index) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0);
          const timeStr = stop.startTime ? `[${stop.startTime}] ` : '';
          const title = `${timeStr}${stop.title}`;
          const splitTitle = pdf.splitTextToSize(title, maxWidth - 10);
          pdf.text(splitTitle, 20, yPos);
          yPos += (splitTitle.length * 5) + 2;

          if (stop.description) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            const splitDesc = pdf.splitTextToSize(stop.description, maxWidth - 15);
            pdf.text(splitDesc, 20, yPos);
            yPos += (splitDesc.length * 4) + 4;
          } else {
            yPos += 2;
          }
        });
        yPos += 5;
      });

      pdf.save('Trip-Itinerary.pdf');

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCalendar = () => {
    if (stops.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Trip Planner//EN\n";
    
    stops.forEach(stop => {
      if (!stop.startTime) return;
      
      const [hours, minutes] = stop.startTime.split(':');
      const now = new Date();
      // For demo purposes, we set dates starting from today
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (stop.dayNumber - 1));
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const start = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${stop.id}\n`;
      icsContent += `DTSTAMP:${stamp}\n`;
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DTEND:${end}\n`;
      icsContent += `SUMMARY:${stop.title}\n`;
      if (stop.description) icsContent += `DESCRIPTION:${stop.description}\n`;
      icsContent += `LOCATION:${stop.lat},${stop.lng}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Trip-Itinerary.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <div className={styles.tripSelectorSection}>
          {isRenaming ? (
            <div className={styles.renameWrapper}>
              <input 
                autoFocus
                className={styles.renameInput}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  onRenameTrip(activeTripId, editingName);
                  setIsRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameTrip(activeTripId, editingName);
                    setIsRenaming(false);
                  }
                }}
              />
            </div>
          ) : (
            <div className={styles.tripNameWrapper} onClick={() => setShowTripSelector(!showTripSelector)}>
              <FolderOpen size={16} className={styles.tripIcon} />
              <h3 className={styles.tripName}>{activeTrip?.name || 'My Trip'}</h3>
              <ChevronDown size={14} className={`${styles.selectorArrow} ${showTripSelector ? styles.arrowOpen : ''}`} />
            </div>
          )}
          
          <button className={styles.renameBtn} onClick={() => setIsRenaming(!isRenaming)}>
            <Edit2 size={14} />
          </button>
        </div>

        {showTripSelector && (
          <div className={styles.tripDropdown}>
            {trips.map(trip => (
              <div 
                key={trip.id} 
                className={`${styles.tripOption} ${trip.id === activeTripId ? styles.activeTrip : ''}`}
                onClick={() => {
                  onSelectTrip(trip.id);
                  setShowTripSelector(false);
                }}
              >
                <span>{trip.name}</span>
                {trips.length > 1 && (
                  <button 
                    className={styles.deleteTripBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTrip(trip.id);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className={styles.createNewTripBtn} onClick={() => { onCreateTrip(); setShowTripSelector(false); }}>
              <Plus size={14} />
              <span>New Trip</span>
            </button>
          </div>
        )}

        <div className={styles.headerTop}>
          <h2 className={styles.title}>Your Adventure</h2>
          <div className={styles.headerActions}>
            <button 
              className={styles.headerActionBtn} 
              onClick={() => setShowShortcuts(!showShortcuts)}
              title="Helpful Shortcuts"
            >
              <HelpCircle size={18} />
            </button>
            <button 
              className={styles.headerActionBtn} 
              title="Split Costs with Friends" 
              onClick={() => setShowExpenseSplitter(!showExpenseSplitter)}
            >
              <Receipt size={16} />
            </button>
            <button 
              className={styles.headerActionBtn} 
              title="Inspire My Next Adventure" 
              onClick={() => setShowAIPlanner(true)}
            >
              <Wand2 size={16} />
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
        {showShortcuts && (
          <div className={styles.shortcutsOverlay}>
            <div className={styles.shortcutsHeader}>
              <span>Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)}><Check size={14} /></button>
            </div>
            <div className={styles.shortcutRow}>
              <kbd>Alt</kbd> + <kbd>H</kbd> <span>Select Tool</span>
            </div>
            <div className={styles.shortcutRow}>
              <kbd>Alt</kbd> + <kbd>A</kbd> <span>Add Pin Tool</span>
            </div>
          </div>
        )}
        {stops.length > 0 && (
          <div className={styles.headerStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stops.length}</span>
              <span className={styles.statLabel}>Stops</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem} onClick={onUnitToggle} style={{cursor: 'pointer'}} title="Toggle Unit">
              <span className={styles.statValue}>{totalDistance.toFixed(totalDistance > 100 ? 0 : 1)}</span>
              <span className={styles.statLabel}>{unit}</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{days.length}</span>
              <span className={styles.statLabel}>Days</span>
            </div>
            <div className={styles.statItem} onClick={() => setShowBudgetBreakdown(!showBudgetBreakdown)} style={{cursor: 'pointer'}} title="View Breakdown">
              <span className={styles.statValue}>${totalBudget.toLocaleString()}</span>
              <span className={styles.statLabel}>Budget</span>
              <PieChart size={10} style={{marginTop: '2px', color: '#10b981'}} />
            </div>
            {showExpenseSplitter && (
              <div className={styles.expenseSplitterOverlay}>
                <div className={styles.breakdownHeader}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Users size={12} />
                    <span>Expense Splitter</span>
                  </div>
                  <button onClick={() => setShowExpenseSplitter(false)}><X size={12} /></button>
                </div>
                
                <div className={styles.participantSection}>
                  <div className={styles.participantList}>
                    {participants.map(p => (
                      <span key={p} className={styles.participantTag}>{p}</span>
                    ))}
                    <button 
                      className={styles.addParticipantBtn}
                      onClick={() => {
                        const name = prompt('Participant name:');
                        if (name && !participants.includes(name)) {
                          setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, participants: [...(t.participants || []), name] } : t));
                        }
                      }}
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>

                <div className={styles.balanceList}>
                  {Object.entries(balances).map(([name, bal]) => (
                    <div key={name} className={styles.balanceRow}>
                      <span>{name}</span>
                      <span className={bal >= 0 ? styles.positive : styles.negative}>
                        {bal >= 0 ? `+ $${bal.toFixed(2)}` : `- $${Math.abs(bal).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className={styles.emptyState}>Add participants to start splitting</div>
                  )}
                </div>
              </div>
            )}
            {showBudgetBreakdown && (
              <div className={styles.budgetBreakdownOverlay}>
                <div className={styles.breakdownHeader}>
                  <span>Cost Breakdown</span>
                  <button onClick={() => setShowBudgetBreakdown(false)}><X size={12} /></button>
                </div>
                {Object.entries(budgetBreakdown).map(([cat, amount]) => amount > 0 && (
                  <div key={cat} className={styles.breakdownRow}>
                    <span className={styles.breakdownCat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <div className={styles.breakdownBarWrapper}>
                      <div 
                        className={styles.breakdownBar} 
                        style={{
                          width: `${(amount / (totalBudget || 1)) * 100}%`,
                          backgroundColor: cat === 'hotel' ? '#f59e0b' : cat === 'restaurant' ? '#ef4444' : cat === 'sightseeing' ? '#10b981' : cat === 'transport' ? '#3b82f6' : '#71717a'
                        }}
                      />
                    </div>
                    <span className={styles.breakdownAmount}>${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {weather && (
              <>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem} title={weather.desc}>
                  <span className={styles.statValue}>
                    {unit === 'km' ? `${weather.temp}°C` : `${Math.round(weather.temp * 9/5 + 32)}°F`}
                  </span>
                  <span className={styles.statLabel}>Weather</span>
                </div>
              </>
            )}
            <div className={styles.statDivider}></div>
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
            <p>Use the search or click the map with the Pin tool to start planning.</p>
          </div>
        )}

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.stopsList}>
            {days.map(dayNum => (
              <div key={dayNum} className={styles.daySection}>
                <div className={styles.dayHeader}>
                  <div className={styles.dayTitle}>Day {dayNum}</div>
                  {groupedStops[dayNum].length > 2 && (
                    <button 
                      className={styles.optimizeBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptimizingDay(dayNum);
                        onOptimizeDay(dayNum);
                        setTimeout(() => setOptimizingDay(null), 2000);
                      }}
                      disabled={optimizingDay === dayNum}
                      title="Optimize Route for this Day"
                    >
                      {optimizingDay === dayNum ? <Loader2 size={12} className={styles.spin} /> : <Sparkles size={12} />}
                      <span>Optimize</span>
                    </button>
                  )}
                </div>
                
                <SortableContext 
                  items={groupedStops[dayNum].map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {groupedStops[dayNum].map((stop) => (
                    <SortableStop 
                      key={stop.id}
                      stop={stop}
                      stops={stops}
                      onStopClick={onStopClick}
                      onUpdateStop={onUpdateStop}
                      onRemoveStop={onRemoveStop}
                      moveStop={moveStop}
                      changeDay={changeDay}
                    />
                  ))}
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
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
              className={`${styles.actionButton} ${styles.shareBtn}`} 
              onClick={handleShare}
              disabled={isSharing || stops.length === 0}
              title="Share Trip"
            >
              {shareLink ? <Check size={18} /> : isSharing ? <Loader2 size={18} className={styles.spin} /> : <Share2 size={18} />}
              <span>{shareLink ? 'Link Copied!' : isSharing ? 'Sharing...' : 'Share Trip'}</span>
            </button>
            <button 
              className={`${styles.actionButton} ${styles.exportBtn}`} 
              onClick={exportToPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 size={18} className={styles.spin} /> : <Download size={18} />}
              <span>Save as PDF</span>
            </button>
            <button 
              className={`${styles.actionButton} ${styles.calendarBtn}`} 
              onClick={exportToCalendar}
              title="Sync to Calendar"
            >
              <CalendarIcon size={18} />
              <span>ICS</span>
            </button>
          </div>
        </div>
      )}

      <AIPlannerModal 
        isOpen={showAIPlanner} 
        onClose={() => setShowAIPlanner(false)}
        onGenerate={(newStops) => {
          // Simply append new stops for now
          setTrips(prev => prev.map(t => {
            if (t.id === activeTripId) {
              return { ...t, stops: [...t.stops, ...newStops] };
            }
            return t;
          }));
        }}
      />
    </div>
  );
}

function CategoryIcon({ category }: { category?: string }) {
  switch (category) {
    case 'hotel': return <div className={styles.stopNumber} style={{background: '#f59e0b'}}><Bed size={12} /></div>;
    case 'restaurant': return <div className={styles.stopNumber} style={{background: '#ef4444'}}><Utensils size={12} /></div>;
    case 'sightseeing': return <div className={styles.stopNumber} style={{background: '#10b981'}}><Camera size={12} /></div>;
    case 'transport': return <div className={styles.stopNumber} style={{background: '#3b82f6'}}><Car size={12} /></div>;
    default: return <div className={styles.stopNumber}><MapPin size={12} /></div>;
  }
}

interface SortableStopProps {
  stop: TripStop;
  stops: TripStop[];
  onStopClick: (lng: number, lat: number, id: string) => void;
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onRemoveStop: (id: string) => void;
  moveStop: (id: string, direction: 'up' | 'down') => void;
  changeDay: (id: string, newDay: number) => void;
}

function SortableStop({ 
  stop, 
  stops, 
  onStopClick, 
  onUpdateStop, 
  onRemoveStop, 
  moveStop, 
  changeDay 
}: SortableStopProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const globalIndex = stops.findIndex(s => s.id === stop.id);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${styles.stopCard} ${isDragging ? styles.dragging : ''}`} 
      onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
    >
      <div className={styles.thumbnailWrapper}>
        <img 
          src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${stop.lng},${stop.lat},14,0/80x80@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`} 
          alt={stop.title}
          className={styles.thumbnail}
        />
        <div className={styles.categoryBadge}>
          <CategoryIcon category={stop.category} />
        </div>
        {stop.emoji && <div className={styles.emojiBadge}>{stop.emoji}</div>}
      </div>
      
      <div className={styles.stopCardLeft} {...attributes} {...listeners} style={{cursor: 'grab'}}>
        <div className={styles.reorderButtons}>
          <button 
            disabled={globalIndex === 0} 
            onClick={(e) => { e.stopPropagation(); moveStop(stop.id, 'up'); }}
            className={styles.reorderBtn}
          >
            <ChevronUp size={14} />
          </button>
          <button 
            disabled={globalIndex === stops.length - 1} 
            onClick={(e) => { e.stopPropagation(); moveStop(stop.id, 'down'); }}
            className={styles.reorderBtn}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      
      <div className={styles.stopInfo}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <input 
            type="time" 
            className={styles.timeInput}
            value={stop.startTime || ''}
            onChange={(e) => onUpdateStop(stop.id, { startTime: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <div className={styles.costWrapper}>
            <DollarSign className={styles.costIcon} size={10} />
            <input 
              type="number"
              className={styles.costInput}
              value={stop.cost || 0}
              onChange={(e) => onUpdateStop(stop.id, { cost: parseFloat(e.target.value) || 0 })}
            />
          </div>
          {participants.length > 0 && (
            <select 
              className={styles.paidBySelect}
              value={stop.paidBy || ''}
              onChange={(e) => onUpdateStop(stop.id, { paidBy: e.target.value })}
            >
              <option value="">Paid by...</option>
              {participants.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
        
        <div style={{display: 'flex', gap: '4px'}}>
             <button 
              className={styles.reorderBtn}
              onClick={(e) => { e.stopPropagation(); changeDay(stop.id, stop.dayNumber - 1); }}
              title="Move to Previous Day"
              disabled={stop.dayNumber === 1}
             >
              <ChevronLeft size={14} />
             </button>
             <button 
              className={styles.reorderBtn}
              onClick={(e) => { e.stopPropagation(); changeDay(stop.id, stop.dayNumber + 1); }}
              title="Move to Next Day"
             >
              <ChevronUp size={14} style={{transform: 'rotate(90deg)'}} />
             </button>
          </div>
        </div>
        
        <StopInputs 
          stop={stop} 
          onUpdateStop={onUpdateStop} 
          onStopClick={onStopClick} 
        />
        
        <div className={styles.categoryGrid}>
          <CategoryButton 
            active={stop.category === 'hotel'} 
            onClick={() => onUpdateStop(stop.id, { category: 'hotel' })}
            icon={<Bed size={12} />}
            title="Hotel"
          />
          <CategoryButton 
            active={stop.category === 'restaurant'} 
            onClick={() => onUpdateStop(stop.id, { category: 'restaurant' })}
            icon={<Utensils size={12} />}
            title="Food"
          />
          <CategoryButton 
            active={stop.category === 'sightseeing'} 
            onClick={() => onUpdateStop(stop.id, { category: 'sightseeing' })}
            icon={<Camera size={12} />}
            title="Sight"
          />
          <CategoryButton 
            active={stop.category === 'transport'} 
            onClick={() => onUpdateStop(stop.id, { category: 'transport' })}
            icon={<Car size={12} />}
            title="Travel"
          />
          <CategoryButton 
            active={stop.category === 'other' || !stop.category} 
            onClick={() => onUpdateStop(stop.id, { category: 'other' })}
            icon={<HelpCircle size={12} />}
            title="Other"
          />
        </div>
      </div>

      <button 
        className={styles.deleteButton}
        onClick={(e) => {
          e.stopPropagation();
          onRemoveStop(stop.id);
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function CategoryButton({ active, onClick, icon, title }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button 
      className={`${styles.categoryBtn} ${active ? styles.active : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
    >
      {icon}
    </button>
  );
}

function StopInputs({ 
  stop, 
  onUpdateStop, 
  onStopClick 
}: { 
  stop: TripStop; 
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
}) {
  const [title, setTitle] = useState(stop.title);
  const [desc, setDesc] = useState(stop.description || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['📍', '✈️', '🏨', '🍽️', '🏛️', '🎭', '🌳', '🏖️', '⛰️', '🚗', '🚶', '🚲', '📸', '☕', '🍷', '🍦'];

  React.useEffect(() => { 
    if (stop.title !== title) setTitle(stop.title); 
  }, [stop.title]);
  
  React.useEffect(() => { 
    const currentDesc = stop.description || '';
    if (currentDesc !== desc) setDesc(currentDesc); 
  }, [stop.description]);

  return (
    <div className={styles.stopInfo} onClick={(e) => e.stopPropagation()}>
      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
        <button 
          className={styles.emojiPickerBtn} 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Pick emoji"
        >
          {stop.emoji || '😀'}
        </button>
        <input 
          type="text"
          className={styles.inlineInputTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onUpdateStop(stop.id, { title })}
          placeholder="Stop Name"
          onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
        />
      </div>

      {showEmojiPicker && (
        <div className={styles.emojiGrid}>
          {emojis.map(e => (
            <button 
              key={e} 
              className={styles.emojiOption}
              onClick={() => {
                onUpdateStop(stop.id, { emoji: e });
                setShowEmojiPicker(false);
              }}
            >
              {e}
            </button>
          ))}
          <button 
            className={styles.emojiOption}
            onClick={() => {
              onUpdateStop(stop.id, { emoji: '' });
              setShowEmojiPicker(false);
            }}
            title="Clear emoji"
          >
            <X size={10} />
          </button>
        </div>
      )}
      <textarea 
        className={styles.inlineInputDesc}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => onUpdateStop(stop.id, { description: desc })}
        placeholder="Add notes..."
        rows={1}
        onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
      />

      <div className={styles.linksSection}>
        <div className={styles.linksHeader}>
          <LinkIcon size={12} />
          <span>Links & Docs</span>
        </div>
        <div className={styles.linksList}>
          {stop.links?.map((link, idx) => (
            <div key={idx} className={styles.linkItem}>
              <a href={link} target="_blank" rel="noopener noreferrer" className={styles.linkAnchor}>
                <ExternalLink size={10} />
                <span>{link.replace(/^https?:\/\//, '').slice(0, 20)}...</span>
              </a>
              <button 
                className={styles.removeLinkBtn}
                onClick={() => {
                  const newLinks = [...(stop.links || [])];
                  newLinks.splice(idx, 1);
                  onUpdateStop(stop.id, { links: newLinks });
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button 
            className={styles.addLinkBtn}
            onClick={() => {
              const url = prompt('Enter URL (e.g. https://google.com):');
              if (url) {
                onUpdateStop(stop.id, { links: [...(stop.links || []), url] });
              }
            }}
          >
            <Plus size={10} />
            <span>Add Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
