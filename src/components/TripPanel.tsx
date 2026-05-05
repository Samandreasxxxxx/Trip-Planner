'use client';

import React, { useMemo, useState } from 'react';
import styles from './TripPanel.module.css';
import { 
  MapPin, Trash2, ChevronLeft, ChevronUp, ChevronDown, 
  Trash, Download, Copy, Loader2, Check, Plus,
  Bed, Utensils, Camera, Car, HelpCircle, DollarSign,
  FolderOpen, Edit2, X, Wand2, Sparkles, Share2,
  PieChart, Link as LinkIcon, ExternalLink,
  Users, Receipt, Calendar, Navigation, CloudSun, Thermometer,
  Star, Info, Map as MapIcon, Plane, Clock,
  ListChecks, Circle, CheckCircle2, Wallet
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
  onUpdateTrip: (id: string, updates: Partial<Trip>) => void;
  onOptimizeDay: (dayNum: number) => void;
  onShareTrip: () => Promise<string | null>;
  getMapScreenshot: () => Promise<string>;
  onOpenInGoogleMaps: () => void;
  onToggleBudgetDashboard: () => void;
  numPeople: number;
  onUpdateNumPeople: (num: number) => void;
  onUpdateParticipants: (participants: string[]) => void;
  onAddStops: (stops: TripStop[]) => void;
  fixedCosts: { id: string, name: string, cost: number, category: string }[];
  onUpdateFixedCosts: (costs: { id: string, name: string, cost: number, category: string }[]) => void;
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
  getMapScreenshot,
  onOpenInGoogleMaps,
  onToggleBudgetDashboard,
  numPeople,
  onUpdateNumPeople,
  onUpdateParticipants,
  onAddStops,
  fixedCosts,
  onUpdateFixedCosts,
  onUpdateTrip
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
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);





  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  React.useEffect(() => {
    if (activeTrip && activeTrip.name !== editingName) {
      setEditingName(activeTrip.name);
    }
  }, [activeTrip]);


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

  const stopDistances = useMemo(() => {
    const distances: { [id: string]: number } = {};
    stops.forEach((stop, index) => {
      if (index === 0) {
        distances[stop.id] = 0;
      } else {
        const d = calculateDistance(
          stops[index - 1].lat,
          stops[index - 1].lng,
          stop.lat,
          stop.lng
        );
        distances[stop.id] = unit === 'km' ? d : d * 0.621371;
      }
    });
    return distances;
  }, [stops, unit]);

  const participants = useMemo(() => activeTrip?.participants || [], [activeTrip]);

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
    fixedCosts.forEach(fc => {
      const cat = fc.category || 'other';
      breakdown[cat] += (fc.cost || 0);
    });
    return breakdown;
  }, [stops, fixedCosts]);


  const totalBudget = useMemo(() => {
    const stopsTotal = stops.reduce((sum, stop) => sum + (stop.cost || 0), 0);
    const fixedTotal = fixedCosts.reduce((sum, fc) => sum + (fc.cost || 0), 0);
    return stopsTotal + fixedTotal;
  }, [stops, fixedCosts]);


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
      const mapDataUrl = await getMapScreenshot();
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // --- Helper: Draw Logo ---
      const addLogo = async () => {
        try {
          // Logo placeholder: 4x4 cm in top right
          pdf.addImage('/logo.png', 'PNG', pageWidth - 40 - 10, 10, 40, 40);
        } catch (e) {
          // If no logo, draw a minimalist placeholder
          pdf.setDrawColor(200);
          pdf.rect(pageWidth - 40 - 10, 10, 40, 40);
          pdf.setFontSize(8);
          pdf.text('LOGO', pageWidth - 30, 30, { align: 'center' });
        }
      };


      await addLogo();

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(activeTrip?.name || 'Trip Itinerary', margin, 25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`${days.length} Days | ${numPeople} Traveler${numPeople > 1 ? 's' : ''} | Total: $${totalBudget.toLocaleString()}`, margin, 32);

      // Map Preview (smaller)
      let yPos = 40;
      const imgProps = pdf.getImageProperties(mapDataUrl);
      const mapHeight = (imgProps.height * contentWidth) / imgProps.width;
      pdf.addImage(mapDataUrl, 'JPEG', margin, yPos, contentWidth, Math.min(mapHeight, 50));
      yPos += Math.min(mapHeight, 50) + 15;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Itinerary', margin, yPos);
      yPos += 10;

      for (const dayNum of days) {
        const dayStops = groupedStops[dayNum];
        if (dayStops.length === 0) continue;

        if (yPos > pageHeight - 30) { pdf.addPage(); await addLogo(); yPos = 30; }

        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');

        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(11);
        pdf.text(`DAY ${dayNum}`, margin + 5, yPos + 6);
        yPos += 14;

        let stopIndex = 1;
        for (const stop of dayStops) {
          if (yPos > pageHeight - 20) { pdf.addPage(); await addLogo(); yPos = 30; }

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${stopIndex}. ${stop.startTime || '--:--'}  ${stop.title}`, margin + 5, yPos);
          
          if (stop.cost) {
            pdf.setFontSize(9);
            pdf.text(`$${(stop.cost * numPeople).toLocaleString()}`, pageWidth - margin - 5, yPos, { align: 'right' });
          }
          
          if (stop.description) {
            yPos += 5;
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(100);
            pdf.text(`Note: ${stop.description}`, margin + 10, yPos);
          }
          
          stopIndex++;
          yPos += 10;
        }
        yPos += 5;
      }

      pdf.save(`${activeTrip?.name || 'Trip'}_Itinerary.pdf`);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
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
            <button className={styles.closeButton} onClick={onClose}>
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

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
              <span className={styles.statValue}>{activeTrip?.currency || '$'}{totalBudget.toLocaleString()}</span>
              <span className={styles.statLabel}>Budget</span>
              <PieChart size={10} style={{marginTop: '2px', color: '#10b981'}} />
            </div>

            {showBudgetBreakdown && (
              <div className={styles.budgetBreakdownOverlay}>
                <div className={styles.breakdownHeader}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Wallet size={16} />
                    <span>Cost Breakdown</span>
                    <select 
                      className={styles.currencySelect}
                      value={activeTrip?.currency || '$'}
                      onChange={(e) => onUpdateTrip(activeTripId, { currency: e.target.value })}
                    >
                      <option value="$">USD ($)</option>
                      <option value="€">EUR (€)</option>
                      <option value="₹">INR (₹)</option>
                      <option value="£">GBP (£)</option>
                    </select>
                  </div>
                  <button onClick={() => setShowBudgetBreakdown(false)}><X size={12} /></button>
                </div>
                
                <div className={styles.financialChart}>
                  {Object.entries(budgetBreakdown).map(([cat, amount]) => amount > 0 && (
                    <div 
                      key={`segment-${cat}`}
                      className={styles.chartSegment}
                      style={{
                        flex: amount,
                        backgroundColor: cat === 'hotel' ? '#f59e0b' : cat === 'restaurant' ? '#ef4444' : cat === 'sightseeing' ? '#10b981' : cat === 'transport' ? '#3b82f6' : '#71717a'
                      }}
                      title={`${cat}: $${amount.toLocaleString()}`}
                    />
                  ))}
                </div>

                <div className={styles.breakdownList}>
                  {Object.entries(budgetBreakdown).map(([cat, amount]) => amount > 0 && (
                    <div key={cat} className={styles.breakdownRow}>
                      <div className={styles.breakdownLabelWrapper}>
                        <div 
                          className={styles.categoryDot} 
                          style={{ backgroundColor: cat === 'hotel' ? '#f59e0b' : cat === 'restaurant' ? '#ef4444' : cat === 'sightseeing' ? '#10b981' : cat === 'transport' ? '#3b82f6' : '#71717a' }}
                        />
                        <span className={styles.breakdownCat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                      </div>
                      <span className={styles.breakdownAmount}>${amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.fixedCostsSection}>
                  <div className={styles.fixedCostsHeader}>
                    <span>Additional Trip Expenses</span>
                    <button 
                      className={styles.addFixedCostBtn}
                      onClick={() => {
                        const name = prompt('Expense name (e.g. Flights):');
                        const cost = parseFloat(prompt('Amount:') || '0');
                        if (name && !isNaN(cost)) {
                          onUpdateFixedCosts([...fixedCosts, { id: crypto.randomUUID(), name, cost, category: 'other' }]);
                        }
                      }}
                    >
                      <Plus size={10} /> Add
                    </button>
                  </div>
                  <div className={styles.fixedCostsList}>
                    {fixedCosts.map(fc => (
                      <div key={fc.id} className={styles.fixedCostRow}>
                        <div className={styles.fixedCostInfo}>
                          <span className={styles.fixedCostName}>{fc.name}</span>
                          <span className={styles.fixedCostAmount}>${fc.cost.toLocaleString()}</span>
                        </div>
                        <button 
                          className={styles.removeFixedCostBtn}
                          onClick={() => onUpdateFixedCosts(fixedCosts.filter(f => f.id !== fc.id))}
                        >
                          <Trash size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className={styles.totalBudgetFooter}>

                  <div className={styles.travelerControl}>
                    <Users size={14} />
                    <input 
                      type="number" 
                      min="1" 
                      value={numPeople} 
                      onChange={(e) => onUpdateNumPeople(parseInt(e.target.value) || 1)}
                      className={styles.numPeopleInput}
                    />
                    <span>Travelers</span>
                  </div>
                  <div className={styles.grandTotal}>
                    <span>Total Est.</span>
                    <span className={styles.totalAmount}>{activeTrip?.currency || '$'}{(totalBudget * numPeople).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.statDivider}></div>
            <button className={styles.clearAllButton} onClick={() => {
              if (window.confirm('Clear all stops from this adventure?')) {
                onClearAll();
              }
            }} title="Clear All">
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
                      participants={participants}
                      distanceFromPrev={stopDistances[stop.id]}
                      unit={unit}
                      currency={activeTrip?.currency || '$'}
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
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button 
              className={`${styles.actionButton} ${styles.shareBtn}`} 
              onClick={handleShare}
              disabled={isSharing || stops.length === 0}
              title="Share Trip"
            >
              {shareLink ? <Check size={16} /> : isSharing ? <Loader2 size={16} className={styles.spin} /> : <Share2 size={16} />}
              <span>{shareLink ? 'Link Copied!' : isSharing ? 'Sharing...' : 'Share Trip'}</span>
            </button>
            <button 
              className={`${styles.actionButton} ${styles.exportBtn}`} 
              onClick={exportToPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
              <span>Save as PDF</span>
            </button>
            <button 
              className={`${styles.actionButton} ${styles.googleMapsBtn}`} 
              onClick={onOpenInGoogleMaps}
              title="Open in Google Maps"
            >
              <ExternalLink size={16} />
              <span>Navigate</span>
            </button>
            <button 
              className={`${styles.actionButton} ${styles.calendarBtn}`} 
              onClick={exportToCalendar}
              title="Sync to Calendar"
            >
              <Calendar size={16} />

              <span>ICS</span>
            </button>
          </div>
        </div>
      )}

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
  participants: string[];
  distanceFromPrev: number;
  unit: 'km' | 'mi';
  currency: string;
}

function SortableStop({ 
  stop, 
  stops, 
  onStopClick, 
  onUpdateStop, 
  onRemoveStop, 
  moveStop, 
  changeDay,
  participants,
  distanceFromPrev,
  unit,
  currency
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
          src={stop.imageUrl || `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${stop.lng},${stop.lat},14,0/80x80@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`} 
          alt={stop.title}
          className={styles.thumbnail}
        />
        <div className={styles.categoryBadge}>
          <CategoryIcon category={stop.category} />
        </div>
        {stop.emoji && <div className={styles.emojiBadge}>{stop.emoji}</div>}
        {stop.rating && (
          <div className={styles.ratingBadge}>
            <Star size={8} fill="#f59e0b" color="#f59e0b" />
            <span>{stop.rating.toFixed(1)}</span>
          </div>
        )}
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
      
      <div className={styles.stopConnector}>
        <div className={styles.connectorLine}></div>
        {distanceFromPrev > 0 && (
          <div className={styles.distanceBadge}>
            {distanceFromPrev.toFixed(1)} {unit}
          </div>
        )}
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
            <div className={`${styles.costWrapper} ${stop.isPaid ? styles.paidCost : ''}`} onClick={(e) => { e.stopPropagation(); onUpdateStop(stop.id, { isPaid: !stop.isPaid }); }}>
              <div className={styles.paidToggle}>
                {stop.isPaid ? <CheckCircle2 size={12} color="#10b981" /> : <Circle size={12} />}
              </div>
              <span className={styles.currencySymbol}>{currency}</span>
              <input 
                type="number"
                className={styles.costInput}
                value={stop.cost || 0}
                onClick={(e) => e.stopPropagation()}
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
          participants={participants}
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
  onStopClick,
  participants
}: { 
  stop: TripStop; 
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
  participants: string[];
}) {
  const [title, setTitle] = useState(stop.title);
  const [desc, setDesc] = useState(stop.description || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['📍', '✈️', '🏨', '🍽️', '🏛️', '🎭', '🌳', '🏖️', '⛰️', '🚗', '🚶', '🚲', '📸', '☕', '🍷', '🍦'];

  React.useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(stop.title); 
  }, [stop.title]);
  
  React.useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesc(stop.description || ''); 
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
      />


      <div className={styles.checklistSection}>
        <div className={styles.checklistHeader}>
          <ListChecks size={12} />
          <span>Checklist</span>
          <button 
            className={styles.addChecklistItemBtn}
            onClick={() => {
              const text = prompt('Task:');
              if (text) {
                const newItem = { id: crypto.randomUUID(), text, completed: false };
                onUpdateStop(stop.id, { checklist: [...(stop.checklist || []), newItem] });
              }
            }}
          >
            <Plus size={10} />
          </button>
        </div>
        {stop.checklist && stop.checklist.length > 0 && (
          <div className={styles.checklistItems}>
            {stop.checklist.map(item => (
              <div 
                key={item.id} 
                className={`${styles.checklistItem} ${item.completed ? styles.completed : ''}`}
                onClick={() => {
                  const newChecklist = stop.checklist?.map(i => 
                    i.id === item.id ? { ...i, completed: !i.completed } : i
                  );
                  onUpdateStop(stop.id, { checklist: newChecklist });
                }}
              >
                {item.completed ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                <span>{item.text}</span>
                <button 
                  className={styles.removeItemBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStop(stop.id, { checklist: stop.checklist?.filter(i => i.id !== item.id) });
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.linksSection}>
        <div className={styles.linksHeader}>
          <LinkIcon size={12} />
          <input 
            type="text"
            className={styles.singleLinkInput}
            value={stop.links?.[0] || ''}
            placeholder="Add website/link..."
            onChange={(e) => onUpdateStop(stop.id, { links: [e.target.value] })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

    </div>
  );
}
