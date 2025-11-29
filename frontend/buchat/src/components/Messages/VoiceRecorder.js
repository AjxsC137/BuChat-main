import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      onRecordingComplete(file, recordingTime);
    }
  };

  const handleCancel = () => {
    if (isRecording) stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
    onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-content">
        {!isRecording && !audioBlob && (
          <button className="record-btn" onClick={startRecording}>
            <Mic size={24} />
            <span>Tap to record</span>
          </button>
        )}

        {isRecording && (
          <div className="recording-active">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span>Recording...</span>
            </div>
            <div className="recording-time">{formatTime(recordingTime)}</div>
            <button className="stop-btn" onClick={stopRecording}>
              <Square size={20} />
              Stop
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="recording-preview">
            <audio src={URL.createObjectURL(audioBlob)} controls />
            <div className="recording-duration">{formatTime(recordingTime)}</div>
            <div className="recording-actions">
              <button className="send-voice-btn" onClick={handleSend}>
                Send
              </button>
              <button className="delete-voice-btn" onClick={handleCancel}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
