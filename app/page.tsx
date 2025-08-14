"use client";
import React, { useState } from 'react';

// Sample dataset with anomaly scoring
const sampleData = [
  { user: 'Alice', dept: 'Finance', title: 'Analyst', entitlements: ['Read', 'Write'], risk: 12, anomalies: ['Rare entitlement'] },
  { user: 'Bob', dept: 'Finance', title: 'Manager', entitlements: ['Read', 'Write', 'Approve'], risk: 30, anomalies: ['SoD Conflict'] },
  { user: 'Charlie', dept: 'HR', title: 'Analyst', entitlements: ['Read'], risk: 5, anomalies: [] },
  { user: 'Diana', dept: 'IT', title: 'Admin', entitlements: ['Root Access', 'Approve'], risk: 80, anomalies: ['High privilege', 'Dormant'] },
  { user: 'Eve', dept: 'Finance', title: 'Analyst', entitlements: ['Read', 'Write', 'Approve'], risk: 28, anomalies: ['Excess privilege'] },
];

export default function Home() {
  const [view, setView] = useState('matrix');

  const anomalyColors = {
    'Rare entitlement': 'orange',
    'SoD Conflict': 'red',
    'High privilege': 'purple',
    'Dormant': 'gray',
    'Excess privilege': 'blue'
  };

  const renderMatrix = () => (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-bold mb-2">Option A: Matrix + Treemap</h2>
      <div className="grid grid-cols-3 gap-2">
        {['Finance', 'HR', 'IT'].map(dept => (
          ['Analyst', 'Manager', 'Admin'].map(title => {
            const cluster = sampleData.filter(d => d.dept === dept && d.title === title);
            const avgRisk = cluster.length ? (cluster.reduce((a, b) => a + b.risk, 0) / cluster.length).toFixed(1) : 0;
            return (
              <div key={`${dept}-${title}`} className="border border-gray-200 p-2 rounded hover:bg-gray-100 cursor-pointer">
                <div className="font-semibold">{dept} - {title}</div>
                <div>Users: {cluster.length}</div>
                <div>Avg Risk: {avgRisk}</div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );

  const renderCards = () => (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-bold mb-2">Option B: Peer Cohorts Cards</h2>
      <div className="grid grid-cols-3 gap-4">
        {[...new Set(sampleData.map(d => `${d.dept}-${d.title}`))].map(clusterName => {
          const cluster = sampleData.filter(d => `${d.dept}-${d.title}` === clusterName);
          const outliers = cluster.filter(c => c.anomalies.length);
          return (
            <div key={clusterName} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              <div className="font-semibold">{clusterName}</div>
              <div>Users: {cluster.length}</div>
              <div>Outliers: {outliers.length}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {outliers.flatMap(o => o.anomalies).map((anom, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: anomalyColors[anom] || 'lightgray' }}>{anom}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGraph = () => (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-bold mb-2">Option C: Graph Communities</h2>
      <p className="text-sm mb-2">(Placeholder: would render bipartite network graph)</p>
      <div className="p-4 border border-gray-200 rounded bg-gray-50">Graph visualization placeholder</div>
    </div>
  );

  const renderEmbedding = () => (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-bold mb-2">Option D: Embedding Map</h2>
      <p className="text-sm mb-2">(Placeholder: would render UMAP scatter plot)</p>
      <div className="p-4 border border-gray-200 rounded bg-gray-50">Scatter plot placeholder</div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('matrix')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Matrix + Treemap
        </button>
        <button
          onClick={() => setView('cards')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Peer Cohorts Cards
        </button>
        <button
          onClick={() => setView('graph')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Graph Communities
        </button>
        <button
          onClick={() => setView('embedding')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Embedding Map
        </button>
      </div>
      {view === 'matrix' && renderMatrix()}
      {view === 'cards' && renderCards()}
      {view === 'graph' && renderGraph()}
      {view === 'embedding' && renderEmbedding()}
    </div>
  );
}