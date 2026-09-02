"use client";

import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Phone, 
  Clock, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Download, 
  Search, 
  Filter,
  MessageSquare,
  User,
  Bot,
  Calendar
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

export default function TranscriptsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await apiFetch('/api/v1/calls/');
        const data = await res.json();
        setCalls(data);
        if (data.length > 0) setSelectedCall(data[0]);
      } catch (err) {
        console.error("Failed to fetch calls:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTranscript = (transcriptText: string) => {
    if (!transcriptText) return [];
    
    // Simple parsing for "Role: Text" format
    // Vapi transcripts often look like: 
    // "AI: Hello!\nUser: Hi, I'd like to book an appointment."
    const lines = transcriptText.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(': ');
      if (parts.length < 2) return { role: 'unknown', text: line, id: i };
      return { 
        role: parts[0].toLowerCase().includes('user') ? 'user' : 'ai', 
        text: parts.slice(1).join(': '),
        id: i
      };
    }).filter(l => l.text.trim() !== '');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <MessageSquare size={20} />
          <span>Loading transcripts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      
      {/* Left Pane: Call List */}
      <div className="w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by phone or customer..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {calls.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No calls recorded yet.</div>
          ) : (
            calls.map((call) => (
              <div 
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedCall?.id === call.id ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-900">{call.customer_phone || 'Web Caller'}</p>
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{format(parseISO(call.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      call.status === 'completed' || call.status === 'customer-ended-call' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {call.status?.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} />
                    {formatDuration(call.duration_seconds || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Transcript Detail */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
        {selectedCall ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
              <button className="px-6 py-4 text-sm font-bold text-blue-600 border-b-2 border-blue-600">Transcript</button>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              <div className="max-w-2xl mx-auto space-y-6">
                {parseTranscript(selectedCall.transcript).length === 0 ? (
                  <div className="text-center py-20 text-slate-400 italic">No transcript available for this call.</div>
                ) : (
                  parseTranscript(selectedCall.transcript).map((line) => (
                    <div key={line.id} className={`flex gap-4 ${line.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${line.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}>
                        {line.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`flex flex-col ${line.role === 'user' ? 'items-end' : ''}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {line.role === 'user' ? 'Customer' : 'AI Assistant'}
                        </p>
                        <div className={`p-4 rounded-2xl max-w-lg text-sm leading-relaxed shadow-sm ${
                          line.role === 'user' 
                            ? 'bg-slate-100 text-slate-900 rounded-tr-none' 
                            : 'bg-blue-50 text-slate-900 rounded-tl-none border border-blue-100'
                        }`}>
                          {line.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audio Player Bar */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="max-w-3xl mx-auto flex items-center justify-center">
                {selectedCall.recording_url ? (
                  <audio 
                    src={selectedCall.recording_url} 
                    className="w-full" 
                    controls 
                  />
                ) : (
                  <div className="text-slate-400 text-sm font-medium">No recording available for this call.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="font-bold text-slate-900 mb-1">No Call Selected</p>
            <p className="text-sm max-w-xs">Select a conversation from the left to view the full transcript and listen to the recording.</p>
          </div>
        )}
      </div>
    </div>
  );
}
