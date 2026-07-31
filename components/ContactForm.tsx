'use client';

import React, { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      if (!formData.name || !formData.email || !formData.message) {
        throw new Error('Please fill out all required fields.');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-primary mb-6">Send a Message</h2>

      {status === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6" role="alert" aria-live="polite">
          <p className="font-body text-green-700 font-bold">Message Sent!</p>
          <p className="font-body text-green-600 text-sm">Thank you for reaching out. We will get back to you shortly.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6" role="alert" aria-live="assertive">
          <p className="font-body text-red-700 font-bold">Error</p>
          <p className="font-body text-red-600 text-sm">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="contact-name" className="block font-body text-sm font-bold text-primary mb-2 uppercase tracking-wide">
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="contact-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            aria-required="true"
            className="w-full bg-surface-container border-none px-4 py-3 font-body text-primary focus:ring-2 focus:ring-gold-accent outline-none transition-shadow"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block font-body text-sm font-bold text-primary mb-2 uppercase tracking-wide">
            Email Address <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-required="true"
            className="w-full bg-surface-container border-none px-4 py-3 font-body text-primary focus:ring-2 focus:ring-gold-accent outline-none transition-shadow"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="contact-subject" className="block font-body text-sm font-bold text-primary mb-2 uppercase tracking-wide">
            Subject
          </label>
          <select
            id="contact-subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full bg-surface-container border-none px-4 py-3 font-body text-primary focus:ring-2 focus:ring-gold-accent outline-none transition-shadow"
          >
            <option value="">Select a topic...</option>
            <option value="support">General Support</option>
            <option value="partnership">Partnership / PR</option>
            <option value="feedback">Feedback</option>
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className="block font-body text-sm font-bold text-primary mb-2 uppercase tracking-wide">
            Message <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            aria-required="true"
            rows={5}
            className="w-full bg-surface-container border-none px-4 py-3 font-body text-primary focus:ring-2 focus:ring-gold-accent outline-none transition-shadow resize-y"
            placeholder="How can we help you?"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-body font-bold uppercase tracking-widest px-8 py-4 hover:bg-gold-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {status === 'submitting' ? 'Sending...' : 'Send Message'}
          {status !== 'submitting' && <span className="material-symbols-outlined" aria-hidden="true">send</span>}
        </button>
      </form>
    </div>
  );
}
