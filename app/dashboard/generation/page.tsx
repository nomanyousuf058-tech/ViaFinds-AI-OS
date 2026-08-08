import React from 'react';
import { submitGenerationJob, getJobs } from './actions';
import { ContentType } from '../../../core/generation/types';
import { JobStatus } from '../../../core/generation/queue/GenerationQueue';

// Note: Ensure Next.js does not cache this dynamically rendered page completely
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContentGenerationDashboard() {
  const jobs = await getJobs();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Content Generation Engine</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="dashboard-card bg-white p-6 rounded-lg shadow-md h-fit">
          <h3 className="text-xl font-bold mb-4">New Generation Job</h3>
          
          <form action={submitGenerationJob} className="space-y-4">
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700">Content Type</label>
              <select 
                name="contentType" 
                id="contentType" 
                required 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                {Object.keys(ContentType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sourceContext" className="block text-sm font-medium text-gray-700">Source Context / Facts</label>
              <textarea 
                name="sourceContext" 
                id="sourceContext" 
                required 
                rows={5}
                placeholder="Enter URL, raw facts, JSON, or descriptive text..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div>
              <label htmlFor="targetPlatform" className="block text-sm font-medium text-gray-700">Target Platform (for Social Post only)</label>
              <input 
                type="text" 
                name="targetPlatform" 
                id="targetPlatform" 
                placeholder="e.g. Pinterest, Instagram, X"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div>
              <label htmlFor="additionalInstructions" className="block text-sm font-medium text-gray-700">Additional AI Instructions (Optional)</label>
              <input 
                type="text" 
                name="additionalInstructions" 
                id="additionalInstructions" 
                placeholder="e.g. Focus on eco-friendly aspects"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Generate Content
            </button>
          </form>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Queue Status</h3>
            <form>
              <button type="submit" formAction={async () => {
                'use server';
                // Trigger revalidation to refresh data
              }} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">
                Refresh Queue
              </button>
            </form>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {jobs.length === 0 ? (
              <p className="text-gray-500">No jobs in queue.</p>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="border p-4 rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{job.request.contentType}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      job.status === JobStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                      job.status === JobStatus.FAILED ? 'bg-red-100 text-red-800' :
                      job.status === JobStatus.RUNNING ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2 truncate">
                    ID: {job.id} <br />
                    Created: {new Date(job.createdAt).toLocaleTimeString()}
                    {job.durationMs && ` • ${job.durationMs}ms`}
                    {job.retries > 0 && ` • Retry ${job.retries}/${job.maxRetries}`}
                  </div>

                  {job.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 overflow-auto max-h-24">
                      {job.error}
                    </div>
                  )}

                  {job.result && job.status === JobStatus.COMPLETED && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm max-h-40 overflow-y-auto">
                      <strong>{job.result.title || 'Generated Content'}</strong>
                      <p className="text-gray-700 whitespace-pre-wrap text-xs mt-1">
                        {job.result.body?.substring(0, 150)}{job.result.body && job.result.body.length > 150 ? '...' : ''}
                      </p>
                      
                      <div className="mt-2 text-xs flex gap-2 text-gray-500">
                        <span>Provider: {job.result.provider}</span>
                        <span>Model: {job.result.model}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
