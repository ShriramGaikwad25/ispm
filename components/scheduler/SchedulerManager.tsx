'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Clock, CheckCircle, AlertCircle, Pause, Square, RotateCcw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './SchedulerManager.css';

interface CertificationSchedule {
  id: string;
  name: string;
  certificationType: string;
  reviewInstruction: string;
  startDate?: string;
  endDate?: string;
  reviewInterval: number;
  reviewCount: number;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  isRunning: boolean;
  currentExecution: number;
  startTime?: Date;
  nextExecutionTime?: Date;
}

interface CertificationLog {
  id: string;
  timestamp: string;
  reviewer: string;
  message: string;
  status: 'success' | 'error' | 'pending';
}

interface CertificationProgress {
  currentCount: number;
  totalCount: number;
  percentage: number;
  prevReviewTime?: string;
  nextReviewTime?: string;
  finalReviewTime?: string;
}

const REVIEW_INSTRUCTIONS = [
  'RESCHEDULE NEXT WITH REMAINING COUNT',
  'RESCHEDULE NEXT WITH EXISTING COUNT',
  'RESCHEDULE NOW WITH REMAINING COUNT',
  'RESCHEDULE NOW WITH EXISTING COUNT',
  'DO NOTHING'
];

const CERTIFICATION_TYPES = [
  'com.example.certifications.access.AccessCertification',
  'com.example.certifications.entitlement.EntitlementCertification',
  'com.example.certifications.role.RoleCertification',
  'com.example.certifications.application.ApplicationCertification'
];

export default function SchedulerManager() {
  const [selectedSchedule, setSelectedSchedule] = useState<CertificationSchedule | null>(null);
  const [schedules, setSchedules] = useState<CertificationSchedule[]>([
    {
      id: '1',
      name: 'Access Review Campaign',
      certificationType: CERTIFICATION_TYPES[0],
      reviewInstruction: REVIEW_INSTRUCTIONS[0],
      startDate: '',
      endDate: '',
      reviewInterval: 5000, // 5 seconds for demo
      reviewCount: 10,
      status: 'stopped',
      isRunning: false,
      currentExecution: 0,
      startTime: undefined,
      nextExecutionTime: undefined
    }
  ]);
  const [certificationProgress, setCertificationProgress] = useState<CertificationProgress>({
    currentCount: 0,
    totalCount: 10,
    percentage: 0,
    prevReviewTime: undefined,
    nextReviewTime: undefined,
    finalReviewTime: undefined
  });
  const [certificationLogs, setCertificationLogs] = useState<CertificationLog[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (schedules.length > 0 && !selectedSchedule) {
      setSelectedSchedule(schedules[0]);
    }
  }, [schedules, selectedSchedule]);

  // Close date pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) {
        setShowStartDatePicker(false);
      }
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) {
        setShowEndDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update progress when selected schedule changes
  useEffect(() => {
    if (selectedSchedule) {
      setCertificationProgress({
        currentCount: selectedSchedule.currentExecution,
        totalCount: selectedSchedule.reviewCount,
        percentage: Math.round((selectedSchedule.currentExecution / selectedSchedule.reviewCount) * 100),
        prevReviewTime: selectedSchedule.currentExecution > 0 ? 
          new Date(Date.now() - selectedSchedule.reviewInterval).toLocaleString() : undefined,
        nextReviewTime: selectedSchedule.isRunning && selectedSchedule.currentExecution < selectedSchedule.reviewCount ?
          new Date(Date.now() + selectedSchedule.reviewInterval).toLocaleString() : undefined,
        finalReviewTime: selectedSchedule.reviewCount > 0 ?
          new Date(Date.now() + (selectedSchedule.reviewCount - selectedSchedule.currentExecution) * selectedSchedule.reviewInterval).toLocaleString() : undefined
      });
    }
  }, [selectedSchedule]);

  // Main scheduling logic
  useEffect(() => {
    if (isGlobalRunning && selectedSchedule && selectedSchedule.isRunning) {
      intervalRef.current = setInterval(() => {
        setSchedules(prev => prev.map(schedule => {
          if (schedule.id === selectedSchedule.id && schedule.isRunning) {
            const newExecution = schedule.currentExecution + 1;
            const isCompleted = newExecution >= schedule.reviewCount;
            
            // Add log entry
            const newLog: CertificationLog = {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString(),
              reviewer: `reviewer_${schedule.certificationType.split('.').pop()}-${Math.floor(Math.random() * 5) + 1}`,
              message: generateCertificationMessage(schedule.certificationType, isCompleted),
              status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'error' : 'pending'
            };
            
            setCertificationLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
            
            return {
              ...schedule,
              currentExecution: newExecution,
              status: isCompleted ? 'completed' : 'active',
              isRunning: !isCompleted,
              nextExecutionTime: !isCompleted ? new Date(Date.now() + schedule.reviewInterval) : undefined
            };
          }
          return schedule;
        }));
      }, selectedSchedule.reviewInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isGlobalRunning, selectedSchedule]);

  const generateCertificationMessage = (certType: string, isCompleted: boolean): string => {
    const type = certType.split('.').pop()?.replace('Certification', '') || 'Access';
    const messages = {
      Access: ['Access review completed', 'Access certification in progress', 'Access validation successful'],
      Entitlement: ['Entitlement review completed', 'Entitlement certification in progress', 'Entitlement validation successful'],
      Role: ['Role review completed', 'Role certification in progress', 'Role validation successful'],
      Application: ['Application access review completed', 'Application certification in progress', 'Application validation successful']
    };
    
    const typeMessages = messages[type as keyof typeof messages] || messages.Access;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };


  const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return true;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return start < end;
    } catch {
      return false;
    }
  };

  // Date picker helper functions
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date, isStartDate: boolean) => {
    const time = isStartDate 
      ? (selectedSchedule?.startDate ? new Date(selectedSchedule.startDate).toTimeString().slice(0, 5) : '12:00')
      : (selectedSchedule?.endDate ? new Date(selectedSchedule.endDate).toTimeString().slice(0, 5) : '12:00');
    
    const newDateTime = new Date(`${date.toISOString().split('T')[0]}T${time}`).toLocaleString();
    
    if (isStartDate) {
      if (validateDateRange(newDateTime, selectedSchedule?.endDate || '')) {
        setSelectedSchedule({
          ...selectedSchedule!,
          startDate: newDateTime
        });
        setShowStartDatePicker(false);
      } else {
        alert('Start date must be before end date');
      }
    } else {
      if (validateDateRange(selectedSchedule?.startDate || '', newDateTime)) {
        setSelectedSchedule({
          ...selectedSchedule!,
          endDate: newDateTime
        });
        setShowEndDatePicker(false);
      } else {
        alert('End date must be after start date');
      }
    }
  };

  const handleTimeChange = (time: string, isStartDate: boolean) => {
    const date = isStartDate 
      ? (selectedSchedule?.startDate ? new Date(selectedSchedule.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      : (selectedSchedule?.endDate ? new Date(selectedSchedule.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    
    const newDateTime = new Date(`${date}T${time}`).toLocaleString();
    
    if (isStartDate) {
      if (validateDateRange(newDateTime, selectedSchedule?.endDate || '')) {
        setSelectedSchedule({
          ...selectedSchedule!,
          startDate: newDateTime
        });
      } else {
        alert('Start date must be before end date');
      }
    } else {
      if (validateDateRange(selectedSchedule?.startDate || '', newDateTime)) {
        setSelectedSchedule({
          ...selectedSchedule!,
          endDate: newDateTime
        });
      } else {
        alert('End date must be after start date');
      }
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchedule) {
      setSchedules(prev => prev.map(schedule => 
        schedule.id === selectedSchedule.id ? selectedSchedule : schedule
      ));
    }
  };

  const handleCreateNewSchedule = () => {
    const newSchedule: CertificationSchedule = {
      id: Date.now().toString(),
      name: 'New Certification Campaign',
      certificationType: CERTIFICATION_TYPES[0],
      reviewInstruction: REVIEW_INSTRUCTIONS[0],
      startDate: '',
      endDate: '',
      reviewInterval: 5000,
      reviewCount: 10,
      status: 'stopped',
      isRunning: false,
      currentExecution: 0,
      startTime: undefined,
      nextExecutionTime: undefined
    };
    setSchedules(prev => [...prev, newSchedule]);
    setSelectedSchedule(newSchedule);
  };

  const handleStartCampaign = () => {
    console.log('Start button clicked!');
    if (selectedSchedule) {
      console.log('Selected schedule:', selectedSchedule);
      let startTime: Date;
      
      if (selectedSchedule.startDate) {
        startTime = new Date(selectedSchedule.startDate);
        console.log('Using configured start date:', selectedSchedule.startDate, 'Parsed as:', startTime);
      } else {
        startTime = new Date();
        console.log('No start date configured, using current time:', startTime);
      }
      
      const now = new Date();
      
      // If start date is in the future, don't start immediately
      if (startTime > now) {
        alert(`Campaign will start at ${startTime.toLocaleString()}`);
        return;
      }
      
      console.log('Starting campaign with start time:', startTime);
      
      const updatedSchedule = {
        ...selectedSchedule,
        status: 'active' as const,
        isRunning: true,
        startTime: startTime,
        nextExecutionTime: new Date(Date.now() + selectedSchedule.reviewInterval)
      };
      
      console.log('Updated schedule:', updatedSchedule);
      
      setSchedules(prev => prev.map(schedule => 
        schedule.id === selectedSchedule.id ? updatedSchedule : schedule
      ));
      setSelectedSchedule(updatedSchedule);
      setIsGlobalRunning(true);
      
      console.log('Campaign started successfully!');
    } else {
      console.log('No selected schedule!');
    }
  };

  const handlePauseCampaign = () => {
    console.log('Pause button clicked!');
    if (selectedSchedule) {
      const updatedSchedule = {
        ...selectedSchedule,
        status: 'paused' as const,
        isRunning: false
      };
      
      setSchedules(prev => prev.map(schedule => 
        schedule.id === selectedSchedule.id ? updatedSchedule : schedule
      ));
      setSelectedSchedule(updatedSchedule);
      setIsGlobalRunning(false);
      console.log('Campaign paused successfully!');
    }
  };

  const handleStopCampaign = () => {
    console.log('Stop button clicked!');
    if (selectedSchedule) {
      const updatedSchedule = {
        ...selectedSchedule,
        status: 'stopped' as const,
        isRunning: false,
        currentExecution: 0,
        startTime: undefined,
        nextExecutionTime: undefined
      };
      
      setSchedules(prev => prev.map(schedule => 
        schedule.id === selectedSchedule.id ? updatedSchedule : schedule
      ));
      setSelectedSchedule(updatedSchedule);
      setIsGlobalRunning(false);
      setCertificationLogs([]);
      console.log('Campaign stopped successfully!');
    }
  };

  const handleResetCampaign = () => {
    console.log('Reset button clicked!');
    if (selectedSchedule) {
      const updatedSchedule = {
        ...selectedSchedule,
        status: 'stopped' as const,
        isRunning: false,
        currentExecution: 0,
        startTime: undefined,
        nextExecutionTime: undefined
      };
      
      setSchedules(prev => prev.map(schedule => 
        schedule.id === selectedSchedule.id ? updatedSchedule : schedule
      ));
      setSelectedSchedule(updatedSchedule);
      setIsGlobalRunning(false);
      setCertificationLogs([]);
      console.log('Campaign reset successfully!');
    }
  };

  return (
    <div className="scheduler-manager">
      {/* Header */}
      <div className="scheduler-header">
        <div className="scheduler-title">
          <h1>CERTIFICATION MANAGER</h1>
        </div>
        <div className="scheduler-nav">
          <div className="nav-item active">
            <Play className="nav-icon" />
            <span>SCHEDULER</span>
          </div>
        </div>
        <div className="scheduler-info">
          <span>NAME: ISPM</span>
          <span>INSTANCE ID: NON_CLUSTERED</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="scheduler-content">
        {/* Left Panel - Schedule Management */}
        <div className="trigger-panel">
          <div className="triggers-section">
            <h3>CAMPAIGNS</h3>
            <button 
              className="new-trigger-btn" 
              onClick={() => {
                console.log('New campaign button clicked!');
                handleCreateNewSchedule();
              }}
            >
              new
            </button>
            <div className="trigger-list">
              {schedules.map(schedule => (
                <div 
                  key={schedule.id}
                  className={`trigger-item ${selectedSchedule?.id === schedule.id ? 'selected' : ''} ${schedule.status}`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="trigger-name">{schedule.name}</div>
                  <div className="trigger-status">
                    <span className={`status-indicator ${schedule.status}`}></span>
                    {schedule.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedSchedule && (
            <div className="trigger-details">
              <h3>CAMPAIGN DETAILS</h3>
              <form onSubmit={handleScheduleSubmit}>
                <div className="form-group">
                  <label>Campaign Name</label>
                  <input
                    type="text"
                    value={selectedSchedule.name}
                    onChange={(e) => setSelectedSchedule({
                      ...selectedSchedule,
                      name: e.target.value
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Certification Type</label>
                  <select
                    value={selectedSchedule.certificationType}
                    onChange={(e) => setSelectedSchedule({
                      ...selectedSchedule,
                      certificationType: e.target.value
                    })}
                  >
                    {CERTIFICATION_TYPES.map(certType => (
                      <option key={certType} value={certType}>
                        {certType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Review Instruction</label>
                  <select
                    value={selectedSchedule.reviewInstruction}
                    onChange={(e) => setSelectedSchedule({
                      ...selectedSchedule,
                      reviewInstruction: e.target.value
                    })}
                  >
                    {REVIEW_INSTRUCTIONS.map(instruction => (
                      <option key={instruction} value={instruction}>
                        {instruction}
                      </option>
                    ))}
                  </select>
                  <div className="misfire-explanation">
                    In case of review delay event, the scheduler won't do anything immediately. Instead it will wait for next scheduled time the campaign and run all reviews with scheduled interval. Delayed reviews are simply post-poned but not ignored. Use this policy if your constraint is to execute the certification for the all times equals to the review counter. + Warning The scheduler can completed over the end date time you set.
                  </div>
                </div>

                <div className="form-group">
                  <label>Start Date (optional)</label>
                  <div className="date-picker-container" ref={startDatePickerRef}>
                    <div className="date-picker-input" onClick={() => setShowStartDatePicker(!showStartDatePicker)}>
                      <Calendar className="calendar-icon" />
                      <span className="date-display-text">
                        {selectedSchedule.startDate ? formatDateForDisplay(selectedSchedule.startDate) : 'Select start date'}
                      </span>
                    </div>
                    
                    {showStartDatePicker && (
                      <div className="date-picker-dropdown">
                        <div className="date-picker-header">
                          <button 
                            type="button" 
                            className="nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          >
                            <ChevronLeft className="nav-icon" />
                          </button>
                          <span className="month-year">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button 
                            type="button" 
                            className="nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          >
                            <ChevronRight className="nav-icon" />
                          </button>
                        </div>
                        
                        <div className="date-picker-calendar">
                          <div className="calendar-header">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="calendar-day-header">{day}</div>
                            ))}
                          </div>
                          <div className="calendar-body">
                            {getDaysInMonth(currentMonth).map((day, index) => (
                              <div key={index} className="calendar-day-cell">
                                {day && (
                                  <button
                                    type="button"
                                    className={`calendar-day ${selectedSchedule.startDate && new Date(selectedSchedule.startDate).toDateString() === day.toDateString() ? 'selected' : ''}`}
                                    onClick={() => handleDateSelect(day, true)}
                                  >
                                    {day.getDate()}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="time-picker">
                          <label>Time:</label>
                          <input
                            type="time"
                            value={selectedSchedule.startDate ? new Date(selectedSchedule.startDate).toTimeString().slice(0, 5) : '12:00'}
                            onChange={(e) => handleTimeChange(e.target.value, true)}
                          />
                        </div>
                        
                        <div className="date-picker-actions">
                          <button 
                            type="button" 
                            className="now-btn"
                            onClick={() => {
                              const now = new Date();
                              setSelectedSchedule({
                                ...selectedSchedule,
                                startDate: now.toLocaleString()
                              });
                              setShowStartDatePicker(false);
                            }}
                          >
                            Now
                          </button>
                          <button 
                            type="button" 
                            className="clear-btn"
                            onClick={() => {
                              setSelectedSchedule({
                                ...selectedSchedule,
                                startDate: ''
                              });
                              setShowStartDatePicker(false);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>End Date (optional)</label>
                  <div className="date-picker-container" ref={endDatePickerRef}>
                    <div className="date-picker-input" onClick={() => setShowEndDatePicker(!showEndDatePicker)}>
                      <Calendar className="calendar-icon" />
                      <span className="date-display-text">
                        {selectedSchedule.endDate ? formatDateForDisplay(selectedSchedule.endDate) : 'Select end date'}
                      </span>
                    </div>
                    
                    {showEndDatePicker && (
                      <div className="date-picker-dropdown">
                        <div className="date-picker-header">
                          <button 
                            type="button" 
                            className="nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          >
                            <ChevronLeft className="nav-icon" />
                          </button>
                          <span className="month-year">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button 
                            type="button" 
                            className="nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          >
                            <ChevronRight className="nav-icon" />
                          </button>
                        </div>
                        
                        <div className="date-picker-calendar">
                          <div className="calendar-header">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="calendar-day-header">{day}</div>
                            ))}
                          </div>
                          <div className="calendar-body">
                            {getDaysInMonth(currentMonth).map((day, index) => (
                              <div key={index} className="calendar-day-cell">
                                {day && (
                                  <button
                                    type="button"
                                    className={`calendar-day ${selectedSchedule.endDate && new Date(selectedSchedule.endDate).toDateString() === day.toDateString() ? 'selected' : ''}`}
                                    onClick={() => handleDateSelect(day, false)}
                                  >
                                    {day.getDate()}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="time-picker">
                          <label>Time:</label>
                          <input
                            type="time"
                            value={selectedSchedule.endDate ? new Date(selectedSchedule.endDate).toTimeString().slice(0, 5) : '12:00'}
                            onChange={(e) => handleTimeChange(e.target.value, false)}
                          />
                        </div>
                        
                        <div className="date-picker-actions">
                          <button 
                            type="button" 
                            className="clear-btn"
                            onClick={() => {
                              setSelectedSchedule({
                                ...selectedSchedule,
                                endDate: ''
                              });
                              setShowEndDatePicker(false);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Review Interval [in mills]</label>
                  <input
                    type="number"
                    value={selectedSchedule.reviewInterval}
                    onChange={(e) => setSelectedSchedule({
                      ...selectedSchedule,
                      reviewInterval: parseInt(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Review Count</label>
                  <input
                    type="number"
                    value={selectedSchedule.reviewCount}
                    onChange={(e) => setSelectedSchedule({
                      ...selectedSchedule,
                      reviewCount: parseInt(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => {
                      // Reset form or close if needed
                      console.log('Cancel clicked');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      handleScheduleSubmit(e);
                    }}
                  >
                    Submit
                  </button>
                </div>

                {/* Campaign Controls */}
                <div className="campaign-controls">
                  <h4>CAMPAIGN CONTROLS</h4>
                  <div className="control-buttons">
                    <button 
                      type="button" 
                      className="control-btn test-btn"
                      onClick={() => {
                        console.log('Test button clicked!');
                        alert('Test button works!');
                      }}
                    >
                      Test
                    </button>
                    {!selectedSchedule.isRunning && selectedSchedule.status !== 'completed' && (
                      <button 
                        type="button" 
                        className="control-btn start-btn"
                        onClick={handleStartCampaign}
                      >
                        <Play className="btn-icon" />
                        Start
                      </button>
                    )}
                    {selectedSchedule.isRunning && (
                      <button 
                        type="button" 
                        className="control-btn pause-btn"
                        onClick={handlePauseCampaign}
                      >
                        <Pause className="btn-icon" />
                        Pause
                      </button>
                    )}
                    {selectedSchedule.status === 'paused' && (
                      <button 
                        type="button" 
                        className="control-btn start-btn"
                        onClick={handleStartCampaign}
                      >
                        <Play className="btn-icon" />
                        Resume
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="control-btn stop-btn"
                      onClick={handleStopCampaign}
                    >
                      <Square className="btn-icon" />
                      Stop
                    </button>
                    <button 
                      type="button" 
                      className="control-btn reset-btn"
                      onClick={handleResetCampaign}
                    >
                      <RotateCcw className="btn-icon" />
                      Reset
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Panel - Certification Progress & Logs */}
        <div className="job-panel">
          <div className="job-progress-section">
            <h3>CERTIFICATION PROGRESS</h3>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${certificationProgress.percentage}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {certificationProgress.currentCount}/{certificationProgress.totalCount}
              </div>
            </div>
            <div className="fire-times">
              <div className="fire-time">
                <span>prev review time:</span>
                <span>{certificationProgress.prevReviewTime}</span>
              </div>
              <div className="fire-time">
                <span>next review time:</span>
                <span>{certificationProgress.nextReviewTime}</span>
              </div>
              <div className="fire-time">
                <span>final review time:</span>
                <span>{certificationProgress.finalReviewTime}</span>
              </div>
            </div>
          </div>

          <div className="job-logs-section">
            <h3>CERTIFICATION LOGS</h3>
            <div className="logs-container">
              {certificationLogs.map(log => (
                <div key={log.id} className="log-entry">
                  <span className="log-timestamp">[{log.timestamp}]</span>
                  {log.status === 'success' ? (
                    <CheckCircle className="log-icon success" />
                  ) : log.status === 'error' ? (
                    <AlertCircle className="log-icon error" />
                  ) : (
                    <Clock className="log-icon pending" />
                  )}
                  <span className="log-worker">{log.reviewer}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
