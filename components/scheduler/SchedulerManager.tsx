'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Clock, CheckCircle, AlertCircle, Pause, Square, RotateCcw, Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { config } from '../../lib/config';
import './SchedulerManager.css';

interface JobSchedule {
  id: string;
  name: string;
  jobClass: string;
  misfireInstruction: string;
  startDate?: string;
  endDate?: string;
  repeatInterval: number;
  repeatCount: number;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  isRunning: boolean;
  currentExecution: number;
  startTime?: Date;
  nextExecutionTime?: Date;
  groupName?: string; // Store the group name from API response
  description?: string; // Job description
  // Trigger fields
  triggerName?: string;
  triggerGroup?: string;
  triggerState?: string;
  type?: string;
  intervalMs?: number;
  previousFireTime?: string;
  nextFireTime?: string;
}

interface JobLog {
  id: string;
  timestamp: string;
  worker: string;
  message: string;
  status: 'success' | 'error' | 'pending';
}

interface JobProgress {
  currentCount: number;
  totalCount: number;
  percentage: number;
  prevFireTime?: string;
  nextFireTime?: string;
  finalFireTime?: string;
}

const MISFIRE_INSTRUCTIONS = [
  'RESCHEDULE NEXT WITH REMAINING COUNT',
  'RESCHEDULE NEXT WITH EXISTING COUNT',
  'RESCHEDULE NOW WITH REMAINING COUNT',
  'RESCHEDULE NOW WITH EXISTING COUNT',
  'DO NOTHING'
];

const JOB_CLASSES = [
  'it.fabioformosa.quartzmanager.jobs.myjobs.SimpleJob',
  'it.fabioformosa.quartzmanager.jobs.myjobs.ComplexJob',
  'it.fabioformosa.quartzmanager.jobs.myjobs.EmailJob',
  'it.fabioformosa.quartzmanager.jobs.myjobs.ReportJob'
];

export default function SchedulerManager() {
  const [selectedSchedule, setSelectedSchedule] = useState<JobSchedule | null>(null);
  const [schedules, setSchedules] = useState<JobSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState<string | null>(null);
  const [jobDetailsData, setJobDetailsData] = useState<any>(null);
  const [jobHistoryLoading, setJobHistoryLoading] = useState(false);
  const [jobHistoryError, setJobHistoryError] = useState<string | null>(null);
  const [jobHistoryData, setJobHistoryData] = useState<any[]>([]);
  const [isJsonDataExpanded, setIsJsonDataExpanded] = useState(false);
  const [editableJsonData, setEditableJsonData] = useState<string>('');
  const [originalJsonData, setOriginalJsonData] = useState<string>('');
  const [isUpdatingJson, setIsUpdatingJson] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    currentCount: 0,
    totalCount: 10,
    percentage: 0,
    prevFireTime: undefined,
    nextFireTime: undefined,
    finalFireTime: undefined
  });
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);

  // API call to fetch jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use local API route to avoid CORS issues
      const response = await fetch(config.api.endpoints.jobs);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched jobs data:', data);
      
      // Handle case where API returns an error object
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      // Map API response to our JobSchedule interface
      // Handle the format: ["groupname:jobname"]
      const mappedJobs: JobSchedule[] = data.map((jobString: string, index: number) => {
        // Parse the "groupname:jobname" format
        const [groupName, jobName] = jobString.includes(':') 
          ? jobString.split(':') 
          : ['Default', jobString];
        
        return {
          id: `job-${index}`,
          name: jobName || `Job ${index + 1}`,
          jobClass: JOB_CLASSES[0], // Default job class
          misfireInstruction: MISFIRE_INSTRUCTIONS[0], // Default misfire instruction
          startDate: '',
          endDate: '',
          repeatInterval: 5000, // Default 5 seconds
          repeatCount: 10, // Default repeat count
          status: 'stopped' as const,
          isRunning: false,
          currentExecution: 0,
          startTime: undefined,
          nextExecutionTime: undefined,
          // Store additional info for reference
          groupName: groupName,
          description: undefined // Will be populated from job details API
        };
      });
      
      setSchedules(mappedJobs);
      
      // If we have jobs and no selected schedule, select the first one
      if (mappedJobs.length > 0 && !selectedSchedule) {
        setSelectedSchedule(mappedJobs[0]);
      }
      
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      
      // No fallback data - only use real API data
      setSchedules([]);
      setSelectedSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch job details when a job is selected
  const fetchJobDetails = async (groupName: string, jobName: string) => {
    try {
      setJobDetailsLoading(true);
      setJobDetailsError(null);
      
      const response = await fetch(`/api/jobs/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched job details:', data);
      
      // Store the raw API response data
      setJobDetailsData(data);
      // Set the editable JSON data and original data
      const formattedJson = JSON.stringify(data.data || data, null, 2);
      setEditableJsonData(formattedJson);
      setOriginalJsonData(formattedJson);
      
      // Handle case where API returns an error object
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      // Update the selected schedule with the detailed information
      if (selectedSchedule) {
        const updatedSchedule: JobSchedule = {
          ...selectedSchedule,
          // Map the detailed job data to our interface
          name: data.name || data.jobName || selectedSchedule.name,
          jobClass: data.jobClass || selectedSchedule.jobClass,
          misfireInstruction: data.misfireInstruction || selectedSchedule.misfireInstruction,
          startDate: data.startDate || selectedSchedule.startDate,
          endDate: data.endDate || selectedSchedule.endDate,
          repeatInterval: data.repeatInterval || selectedSchedule.repeatInterval,
          repeatCount: data.repeatCount || selectedSchedule.repeatCount,
          status: data.status || selectedSchedule.status,
          isRunning: data.isRunning || selectedSchedule.isRunning,
          currentExecution: data.currentExecution || selectedSchedule.currentExecution,
          startTime: data.startTime ? new Date(data.startTime) : selectedSchedule.startTime,
          nextExecutionTime: data.nextExecutionTime ? new Date(data.nextExecutionTime) : selectedSchedule.nextExecutionTime,
          description: data.description || data.jobDescription || selectedSchedule.description,
          // Map trigger fields from API response
          triggerName: data.triggerName || data.triggers?.[0]?.triggerName || selectedSchedule.triggerName,
          triggerGroup: data.triggerGroup || data.triggers?.[0]?.triggerGroup || selectedSchedule.triggerGroup,
          triggerState: data.triggerState || data.triggers?.[0]?.triggerState || selectedSchedule.triggerState,
          type: data.type || data.triggers?.[0]?.type || selectedSchedule.type,
          intervalMs: data.intervalMs || data.triggers?.[0]?.intervalMs || selectedSchedule.intervalMs,
          previousFireTime: data.previousFireTime || data.triggers?.[0]?.previousFireTime || selectedSchedule.previousFireTime,
          nextFireTime: data.nextFireTime || data.triggers?.[0]?.nextFireTime || selectedSchedule.nextFireTime,
        };
        
        setSelectedSchedule(updatedSchedule);
        
        // Update the schedules array with the updated job
        setSchedules(prev => prev.map(schedule => 
          schedule.id === selectedSchedule.id ? updatedSchedule : schedule
        ));
      }
      
    } catch (err) {
      console.error('Error fetching job details:', err);
      setJobDetailsError(err instanceof Error ? err.message : 'Failed to fetch job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  // Fetch job history
  const fetchJobHistory = async (groupName: string, jobName: string) => {
    try {
      setJobHistoryLoading(true);
      setJobHistoryError(null);
      
      const response = await fetch(`/api/jobs/history/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error);
      }
      
      const data = await response.json();
      
      // Check if the response contains an error
      if (data && typeof data === 'object' && (data.message || data.error)) {
        throw new Error(data.message || data.error);
      }
      
      // Set the history data (should be an array)
      setJobHistoryData(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error('Error fetching job history:', err);
      setJobHistoryError(err instanceof Error ? err.message : 'Failed to fetch job history');
      setJobHistoryData([]);
    } finally {
      setJobHistoryLoading(false);
    }
  };

  // Resume job
  const resumeJob = async (groupName: string, jobName: string) => {
    try {
      setIsUpdatingJson(true);
      
      const response = await fetch(`/api/jobs/resume/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to resume job';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let resumeResult;
      try {
        resumeResult = JSON.parse(responseText);
        console.log('Job resumed successfully:', resumeResult);
      } catch (parseError) {
        console.log('Job resumed successfully (non-JSON response):', responseText);
        resumeResult = { message: responseText, success: true };
      }
      
      alert('Job resumed successfully!');
      
    } catch (error) {
      console.error('Error resuming job:', error);
      alert(`Failed to resume job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingJson(false);
    }
  };

  // Pause job
  const pauseJob = async (groupName: string, jobName: string) => {
    try {
      setIsUpdatingJson(true);
      
      const response = await fetch(`/api/jobs/pause/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to pause job';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let pauseResult;
      try {
        pauseResult = JSON.parse(responseText);
        console.log('Job paused successfully:', pauseResult);
      } catch (parseError) {
        console.log('Job paused successfully (non-JSON response):', responseText);
        pauseResult = { message: responseText, success: true };
      }
      
      alert('Job paused successfully!');
      
    } catch (error) {
      console.error('Error pausing job:', error);
      alert(`Failed to pause job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingJson(false);
    }
  };

  // Trigger job manually
  const triggerJobManually = async (groupName: string, jobName: string) => {
    try {
      setIsUpdatingJson(true); // Reuse loading state for now
      
      const response = await fetch(`/api/jobs/trigger/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Read the response body once
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to trigger job';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let triggerResult;
      try {
        triggerResult = JSON.parse(responseText);
        console.log('Job triggered successfully:', triggerResult);
      } catch (parseError) {
        console.log('Job triggered successfully (non-JSON response):', responseText);
        triggerResult = { message: responseText, success: true };
      }
      
      // Show success message
      alert('Job triggered successfully!');
      
    } catch (error) {
      console.error('Error triggering job:', error);
      alert(`Failed to trigger job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingJson(false);
    }
  };

  // Update JSON data
  const updateJsonData = async () => {
    if (!selectedSchedule || !selectedSchedule.groupName) {
      return;
    }

    try {
      setIsUpdatingJson(true);
      
      // Parse the edited JSON to validate it
      let parsedData;
      try {
        parsedData = JSON.parse(editableJsonData);
      } catch (parseError) {
        alert('Invalid JSON format. Please check your syntax.');
        return;
      }

      // Make API call to update the job data
      const response = await fetch(`/api/jobs/${encodeURIComponent(selectedSchedule.groupName)}/${encodeURIComponent(selectedSchedule.name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData)
      });

      // Read the response body once
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to update job data';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use the text as error message
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let updatedData;
      try {
        updatedData = JSON.parse(responseText);
        console.log('Job data updated successfully:', updatedData);
      } catch (parseError) {
        // If response is not JSON, treat as success with the text response
        console.log('Job data updated successfully (non-JSON response):', responseText);
        updatedData = { message: responseText, success: true };
      }
      
      // Update the local state with the response
      setJobDetailsData(updatedData);
      
      // Update the original data to match the new data
      setOriginalJsonData(editableJsonData);
      
      // Show success message
      alert('JSON data updated successfully!');
      
    } catch (error) {
      console.error('Error updating JSON data:', error);
      alert(`Failed to update JSON data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingJson(false);
    }
  };

  // Check if JSON data has been modified
  const isJsonDataModified = editableJsonData !== originalJsonData;

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (schedules.length > 0 && !selectedSchedule) {
      setSelectedSchedule(schedules[0]);
    }
  }, [schedules, selectedSchedule]);

  // Fetch job details when selectedSchedule changes
  useEffect(() => {
    if (selectedSchedule && selectedSchedule.groupName && selectedSchedule.name) {
      fetchJobDetails(selectedSchedule.groupName, selectedSchedule.name);
      fetchJobHistory(selectedSchedule.groupName, selectedSchedule.name);
    }
  }, [selectedSchedule?.id]); // Only fetch when the job ID changes

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
      setJobProgress({
        currentCount: selectedSchedule.currentExecution,
        totalCount: selectedSchedule.repeatCount,
        percentage: Math.round((selectedSchedule.currentExecution / selectedSchedule.repeatCount) * 100),
        prevFireTime: selectedSchedule.currentExecution > 0 ? 
          new Date(Date.now() - selectedSchedule.repeatInterval).toLocaleString() : undefined,
        nextFireTime: selectedSchedule.isRunning && selectedSchedule.currentExecution < selectedSchedule.repeatCount ?
          new Date(Date.now() + selectedSchedule.repeatInterval).toLocaleString() : undefined,
        finalFireTime: selectedSchedule.repeatCount > 0 ?
          new Date(Date.now() + (selectedSchedule.repeatCount - selectedSchedule.currentExecution) * selectedSchedule.repeatInterval).toLocaleString() : undefined
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
            const isCompleted = newExecution >= schedule.repeatCount;
            
            // Add log entry
            const newLog: JobLog = {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString(),
              worker: `example_Worker-${Math.floor(Math.random() * 5) + 1}`,
              message: generateJobMessage(schedule.jobClass, isCompleted),
              status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'error' : 'pending'
            };
            
            setJobLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
            
            return {
              ...schedule,
              currentExecution: newExecution,
              status: isCompleted ? 'completed' : 'active',
              isRunning: !isCompleted,
              nextExecutionTime: !isCompleted ? new Date(Date.now() + schedule.repeatInterval) : undefined
            };
          }
          return schedule;
        }));
      }, selectedSchedule.repeatInterval);
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

  const generateJobMessage = (jobClass: string, isCompleted: boolean): string => {
    const type = jobClass.split('.').pop()?.replace('Job', '') || 'Simple';
    const messages = {
      Simple: ['Hello World!', 'Simple job executed', 'Task completed successfully'],
      Complex: ['Complex processing started', 'Complex job in progress', 'Complex task completed'],
      Email: ['Email sent successfully', 'Email job processed', 'Email notification sent'],
      Report: ['Report generated', 'Report job completed', 'Report processing finished']
    };
    
    const typeMessages = messages[type as keyof typeof messages] || messages.Simple;
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
    const newSchedule: JobSchedule = {
      id: Date.now().toString(),
      name: 'New Job Task',
      jobClass: JOB_CLASSES[0],
      misfireInstruction: MISFIRE_INSTRUCTIONS[0],
      startDate: '',
      endDate: '',
      repeatInterval: 5000,
      repeatCount: 10,
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
      setJobLogs([]);
      console.log('Job stopped successfully!');
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
      setJobLogs([]);
      console.log('Job reset successfully!');
    }
  };

  return (
    <div className="scheduler-manager">
      {/* Header */}
      <div className="scheduler-header">
        <div className="scheduler-title">
          <h1>QUARTZ MANAGER</h1>
        </div>
        <div className="scheduler-nav">
          <div className="nav-item active">
            <Play className="nav-icon" />
            <span>SCHEDULER</span>
          </div>
        </div>
        
        
        <div className="scheduler-info">
          <span>NAME: Example</span>
          <span>INSTANCE ID: NON_CLUSTERED</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="scheduler-content">
        {/* Left Panel - Jobs List Only */}
        <div className="triggers-panel">
          <div className="triggers-header">
            <h3>JOBS</h3>
            <button 
              className="new-trigger-btn" 
              onClick={() => {
                console.log('New trigger button clicked!');
                handleCreateNewSchedule();
              }}
              disabled={loading}
            >
              new
            </button>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">Error: {error}</p>
              <button 
                className="retry-btn"
                onClick={fetchJobs}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="trigger-list">
              {schedules.length === 0 ? (
                <div className="no-jobs">
                  <p>No jobs found</p>
                  <button 
                    className="create-first-job-btn"
                    onClick={handleCreateNewSchedule}
                  >
                    Create First Job
                  </button>
                </div>
              ) : (
                schedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className={`trigger-item ${selectedSchedule?.id === schedule.id ? 'selected' : ''} ${schedule.status}`}
                    onClick={() => {
                      setSelectedSchedule(schedule);
                      // Fetch job details if we have group name
                      if (schedule.groupName) {
                        fetchJobDetails(schedule.groupName, schedule.name);
                      }
                    }}
                  >
                    <div className="trigger-name">{schedule.name}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Middle Panel - Job Details */}
        <div className="details-panel">
          {selectedSchedule && (
            <div className="trigger-details">
              <h3>JOB DETAILS</h3>
              
              {jobDetailsLoading && (
                <div className="job-details-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading job details...</p>
                </div>
              )}
              
              {jobDetailsError && (
                <div className="job-details-error">
                  <p className="error-message">Error: {jobDetailsError}</p>
                  <button 
                    className="retry-btn"
                    onClick={() => {
                      if (selectedSchedule.groupName) {
                        fetchJobDetails(selectedSchedule.groupName, selectedSchedule.name);
                      }
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {!jobDetailsLoading && !jobDetailsError && (
                <div className="job-info-display">
                  <div className="job-info-item">
                    <span className="info-label">Job Name:</span>
                    <span className="info-value">{selectedSchedule.name}</span>
                  </div>
                  <div className="job-info-item">
                    <span className="info-label">Job Group:</span>
                    <span className="info-value">{selectedSchedule.groupName || 'N/A'}</span>
                  </div>
                  <div className="job-info-item">
                    <span className="info-label">Job Class:</span>
                    <span className="info-value">{selectedSchedule.jobClass}</span>
                  </div>
                  <div className="job-info-item">
                    <span className="info-label">Description:</span>
                    <span className="info-value">{selectedSchedule.description || 'No description available'}</span>
                  </div>
                </div>
              )}
              
              {/* JSON Data Display */}
              {!jobDetailsLoading && !jobDetailsError && jobDetailsData && (
                <div className="json-data-display">
                  <div 
                    className="json-data-header"
                    onClick={() => setIsJsonDataExpanded(!isJsonDataExpanded)}
                  >
                    <h4>JSON Data</h4>
                    {isJsonDataExpanded ? (
                      <ChevronDown className="json-toggle-icon" />
                    ) : (
                      <ChevronRight className="json-toggle-icon" />
                    )}
                  </div>
                  {isJsonDataExpanded && (
                    <div className="json-container">
                      <textarea 
                        className="json-content"
                        value={editableJsonData}
                        onChange={(e) => setEditableJsonData(e.target.value)}
                        rows={10}
                        spellCheck={false}
                      />
                      <div className="json-actions">
                        <button 
                          className="update-json-btn"
                          onClick={updateJsonData}
                          disabled={isUpdatingJson || !isJsonDataModified}
                        >
                          {isUpdatingJson ? (
                            <>
                              <div className="loading-spinner-small"></div>
                              Updating...
                            </>
                          ) : (
                            'Update'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trigger Control Buttons */}
              {selectedSchedule && (
                <div className="trigger-controls-section">
                  <div className="trigger-controls">
                    <button 
                      className={`start-btn ${selectedSchedule.isRunning ? 'active' : ''}`}
                      onClick={() => triggerJobManually(selectedSchedule.groupName || '', selectedSchedule.name)}
                      disabled={isUpdatingJson}
                    >
                      {isUpdatingJson ? (
                        <>
                          <div className="loading-spinner-small"></div>
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="btn-icon" />
                          Run
                        </>
                      )}
                    </button>
                    {selectedSchedule.status === 'paused' ? (
                      <button 
                        className="resume-btn"
                        onClick={() => resumeJob(selectedSchedule.groupName || '', selectedSchedule.name)}
                        disabled={isUpdatingJson}
                      >
                        {isUpdatingJson ? (
                          <>
                            <div className="loading-spinner-small"></div>
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="btn-icon" />
                            Resume
                          </>
                        )}
                      </button>
                    ) : (
                      <button 
                        className="pause-btn"
                        onClick={() => pauseJob(selectedSchedule.groupName || '', selectedSchedule.name)}
                        disabled={isUpdatingJson}
                      >
                        {isUpdatingJson ? (
                          <>
                            <div className="loading-spinner-small"></div>
                            Pausing...
                          </>
                        ) : (
                          <>
                            <Pause className="btn-icon" />
                            Pause
                          </>
                        )}
                      </button>
                    )}
                    <button 
                      className="stop-btn"
                      onClick={() => handleStop(selectedSchedule.id)}
                      disabled={!selectedSchedule.isRunning}
                    >
                      <Square className="btn-icon" />
                      Stop
                    </button>
                    <button 
                      className="reset-btn"
                      onClick={() => handleReset(selectedSchedule.id)}
                    >
                      <RotateCcw className="btn-icon" />
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Triggers */}
        <div className="job-panel">
          <div className="jobs-section">
            <h3>TRIGGERS</h3>
            
            {/* Single Trigger Card */}
            <div className="trigger-card-section">
              {selectedSchedule ? (
                <div className="trigger-card">
                  <div className="trigger-card-header">
                    <h4>Trigger: {selectedSchedule.triggerName || 'N/A'}</h4>
                  </div>
                  
                  <div className="trigger-card-content">
                    <div className="trigger-info-grid">
                      <div className="info-item">
                        <span className="info-label">Trigger Group:</span>
                        <span className="info-value">{selectedSchedule.triggerGroup || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Trigger State:</span>
                        <span className={`info-value status-${selectedSchedule.triggerState?.toLowerCase()}`}>
                          {selectedSchedule.triggerState || 'N/A'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Type:</span>
                        <span className="info-value">{selectedSchedule.type || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Interval (ms):</span>
                        <span className="info-value">{selectedSchedule.intervalMs || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Repeat Count:</span>
                        <span className="info-value">{selectedSchedule.repeatCount || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Previous Fire Time:</span>
                        <span className="info-value">{selectedSchedule.previousFireTime || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Next Fire Time:</span>
                        <span className="info-value">{selectedSchedule.nextFireTime || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-trigger-selected">
                  <p>Select a job to view its trigger details</p>
                </div>
              )}
            </div>
          </div>

          {/* Job History Section */}
          <div className="history-section">
            <h3>JOB HISTORY</h3>
            
            {jobHistoryLoading ? (
              <div className="history-loading">
                <div className="loading-spinner"></div>
                <p>Loading job history...</p>
              </div>
            ) : jobHistoryError ? (
              <div className="history-error">
                <p>Error: {jobHistoryError}</p>
              </div>
            ) : jobHistoryData.length === 0 ? (
              <div className="no-history">
                <p>No job history available</p>
              </div>
            ) : (
              <div className="history-list">
                {jobHistoryData.map((historyItem, index) => (
                  <div key={historyItem.id || index} className="history-item">
                    <div className="history-header">
                      <span className="history-timestamp">
                        {historyItem.firedAt ? new Date(historyItem.firedAt).toLocaleString() : 'N/A'}
                      </span>
                      <span className={`history-status status-${historyItem.status?.toLowerCase() || 'unknown'}`}>
                        {historyItem.status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="history-details">
                      <div className="history-info-grid">
                        <div className="history-info-item">
                          <span className="history-info-label">Job Name:</span>
                          <span className="history-info-value">{historyItem.jobName || 'N/A'}</span>
                        </div>
                        <div className="history-info-item">
                          <span className="history-info-label">Job Group:</span>
                          <span className="history-info-value">{historyItem.jobGroup || 'N/A'}</span>
                        </div>
                        <div className="history-info-item">
                          <span className="history-info-label">Trigger Name:</span>
                          <span className="history-info-value">{historyItem.triggerName || 'N/A'}</span>
                        </div>
                        <div className="history-info-item">
                          <span className="history-info-label">Trigger Group:</span>
                          <span className="history-info-value">{historyItem.triggerGroup || 'N/A'}</span>
                        </div>
                        <div className="history-info-item">
                          <span className="history-info-label">Finished At:</span>
                          <span className="history-info-value">
                            {historyItem.finishedAt ? new Date(historyItem.finishedAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        {historyItem.firedAt && historyItem.finishedAt && (
                          <div className="history-info-item">
                            <span className="history-info-label">Duration:</span>
                            <span className="history-info-value">
                              {new Date(historyItem.finishedAt).getTime() - new Date(historyItem.firedAt).getTime()}ms
                            </span>
                          </div>
                        )}
                      </div>
                      {historyItem.message && (
                        <div className="history-message-section">
                          <span className="history-message-label">Message:</span>
                          <p className="history-message">{historyItem.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
