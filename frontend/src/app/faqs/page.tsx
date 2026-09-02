"use client";

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFaq, setNewFaq] = useState({ question_key: '', answer: '' });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await apiFetch('/api/v1/faqs/');
      if (res.ok) setFaqs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaq.question_key || !newFaq.answer) return;
    try {
      const res = await apiFetch('/api/v1/faqs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFaq)
      });
      if (res.ok) {
        setNewFaq({ question_key: '', answer: '' });
        fetchFaqs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/faqs/${id}`, { method: 'DELETE' });
      if (res.ok) fetchFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base & FAQs</h1>
        <p className="text-slate-500">Train your AI with specific answers to common questions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900">Add New FAQ</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic / Keyword</label>
              <input 
                type="text" 
                value={newFaq.question_key}
                onChange={(e) => setNewFaq({...newFaq, question_key: e.target.value})}
                placeholder="e.g. parking, insurance"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                required
              />
              <p className="text-[10px] text-slate-400">The AI will look for these keywords.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Answer</label>
              <textarea 
                value={newFaq.answer}
                onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                placeholder="We have free parking at the back of the building."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm min-h-[120px]"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Add FAQ
            </button>
          </form>
        </div>
        
        <div className="md:col-span-2">
          {loading ? (
            <div className="animate-pulse bg-white border border-slate-200 rounded-xl h-64"></div>
          ) : (
            <div className="space-y-4">
              {faqs.length > 0 ? faqs.map(faq => (
                <div key={faq.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="flex gap-4">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-fit">
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-2 uppercase tracking-wide">{faq.question_key}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                  <button aria-label={`Delete ${faq.question_key} FAQ`} onClick={() => handleDelete(faq.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                  No FAQs added yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
