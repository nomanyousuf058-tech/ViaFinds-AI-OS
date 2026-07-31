import React from 'react';
import { startProductPipeline } from './actions';

export default function ProductReview() {
  return (
    <div className="dashboard-card max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-2">Product Pipeline Trigger</h3>
      <p className="text-gray-600 mb-6">Enter an affiliate URL to extract product details, validate them via AI, and save as a draft.</p>
      
      <form action={startProductPipeline} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
            Affiliate URL
          </label>
          <input
            type="url"
            name="url"
            id="url"
            required
            placeholder="https://example.com/product/123"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Start Pipeline
        </button>
      </form>
    </div>
  );
}
