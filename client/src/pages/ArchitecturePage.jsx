// client/src/pages/ArchitecturePage.jsx
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Sidebar from '../components/Sidebar';

const ArchitecturePage = () => {
  const [context, setContext] = useState('// Describe your system, microservices, or paste codebase logs here\nSystem: Online Shopping Portal\n- Frontend Client (React) calls API Gateway (Express)\n- API Gateway proxies requests to User Service (Go) and Order Service (Python)\n- User Service stores profiles in MongoDB\n- Order Service stores transactions in PostgreSQL and pushes updates to RabbitMQ queue\n- Notification Worker (Node.js) listens to RabbitMQ and triggers SendGrid email gateways');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  const canvasRef = useRef(null);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);
    setSelectedNode(null);

    try {
      const token = localStorage.getItem('cl_token');
      const response = await fetch('/api/architecture/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: context })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      const computedReport = computeNodePositions(data.report);
      setReport(computedReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const computeNodePositions = (reportData) => {
    if (!reportData || !reportData.nodes) return reportData;

    const typeLayers = {
      gateway: 0,
      frontend: 1,
      backend: 2,
      queue: 3,
      database: 4,
      external: 4
    };

    const layerGroups = {};
    reportData.nodes.forEach((node) => {
      const type = node.type || 'backend';
      const layer = typeLayers[type] !== undefined ? typeLayers[type] : 2;
      if (!layerGroups[layer]) layerGroups[layer] = [];
      layerGroups[layer].push(node);
    });

    const canvasWidth = 540;
    const canvasHeight = 440;
    const layers = Object.keys(layerGroups).sort();
    const layerCount = layers.length;

    layers.forEach((layerKey, layerIdx) => {
      const nodesInLayer = layerGroups[layerKey];
      const count = nodesInLayer.length;
      const y = ((layerIdx + 0.5) / layerCount) * canvasHeight;

      nodesInLayer.forEach((node, nodeIdx) => {
        const x = ((nodeIdx + 0.5) / count) * canvasWidth;
        node.x = x;
        node.y = y;
      });
    });

    return reportData;
  };

  const getNodeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'frontend': return '#60A5FA';
      case 'backend': return '#A78BFA';
      case 'database': return '#34D399';
      case 'gateway': return '#FB7185';
      case 'queue': return '#FBBF24';
      default: return '#9CA3AF';
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="h-screen flex overflow-hidden bg-[#0A0A0C] font-body-md">
      <Sidebar />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: Input context */}
        <div className="flex flex-col border-r border-[#1E1E22] overflow-hidden bg-[#0e0e12]">
          
          <div className="flex justify-between items-center px-6 h-14 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
            <span className="font-label-caps text-label-caps text-[#908fa0] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">hub</span> Visual Architecture Designer
            </span>
          </div>

          <div className="flex-1 relative overflow-hidden bg-[#0A0A0C]">
            <Editor
              height="100%"
              theme="vs-dark"
              language="text"
              value={context}
              onChange={(val) => setContext(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 20,
              }}
            />
          </div>

          <div className="px-6 py-3 border-t border-[#1E1E22] bg-[#16161d] shrink-0 flex justify-between items-center">
            <span className="text-[11px] text-[#64748B]">
              Maps databases, microservices, APIs, gateways and dependency flows.
            </span>
            <button 
              onClick={handleGenerate}
              disabled={loading || !context.trim()}
              className="bg-[#8083ff] text-white hover:bg-[#c0c1ff] hover:text-black rounded-lg px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95 shadow-[0_0_20px_rgba(128,131,255,0.2)]"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span> Generate Architecture
            </button>
          </div>
        </div>

        {/* Right: Interactive SVG Topology Board */}
        <div className="flex flex-col bg-[#0B0F19] overflow-hidden relative">
          
          <div className="flex justify-between items-center px-6 h-14 bg-[#16161d] border-b border-[#1E1E22] shrink-0">
            <span className="font-label-caps text-label-caps text-[#908fa0] uppercase tracking-wider">Topology Canvas Map</span>
            {report && (
              <div className="flex gap-1.5">
                <button className="btn-copy py-0.5 px-2 text-xs" onClick={handleZoomOut}>🔍-</button>
                <button className="btn-copy py-0.5 px-2 text-xs" onClick={handleZoomReset}>Reset</button>
                <button className="btn-copy py-0.5 px-2 text-xs" onClick={handleZoomIn}>🔍+</button>
              </div>
            )}
          </div>

          <div className="flex-1 relative overflow-hidden bg-[#0A0A0C] node-line stage-grid">
            {error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-4 text-xs m-4">
                ⚠️ {error}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-4">
                <div className="loading-dots mb-2">
                  <span></span><span></span><span></span>
                </div>
                <p className="text-[13px]">Llama 3.3 is mapping systems, parsing networks, and connecting structures...</p>
              </div>
            )}

            {!report && !loading && !error && (
              <div className="flex flex-col items-center justify-center text-center text-[#64748B] h-full gap-4">
                <span className="material-symbols-outlined text-4xl text-[#908fa0] opacity-30">deployed_code</span>
                <p className="text-[13px] leading-relaxed max-w-sm">
                  Topology and visual layout canvas. Paste your architectural specifications or descriptions in the editor workspace to generate.
                </p>
              </div>
            )}

            {report && !loading && (
              <div className="w-full h-full relative">
                
                {/* SVG Visual Stage */}
                <svg 
                  ref={canvasRef}
                  width="100%" 
                  height="100%" 
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'top left', 
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="select-none"
                >
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                    </marker>
                    <marker id="arrow-selected" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#c0c1ff" />
                    </marker>
                  </defs>

                  {/* Draw Edges */}
                  {report.edges.map((edge, idx) => {
                    const fromNode = report.nodes.find(n => n.id === edge.from);
                    const toNode = report.nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const isSelected = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);

                    return (
                      <g key={idx}>
                        <line 
                          x1={fromNode.x + 60} 
                          y1={fromNode.y + 20} 
                          x2={toNode.x + 60} 
                          y2={toNode.y + 20} 
                          stroke={isSelected ? '#c0c1ff' : '#334155'} 
                          strokeWidth={isSelected ? '2' : '1.5'} 
                          markerEnd={`url(#${isSelected ? 'arrow-selected' : 'arrow'})`}
                        />
                        <text 
                          x={(fromNode.x + toNode.x) / 2 + 60} 
                          y={(fromNode.y + toNode.y) / 2 + 15} 
                          fill={isSelected ? '#c0c1ff' : '#64748B'} 
                          fontSize="9" 
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Nodes */}
                  {report.nodes.map((node) => {
                    const color = getNodeColor(node.type);
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <g 
                        key={node.id} 
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer group"
                      >
                        <rect 
                          width="120" 
                          height="40" 
                          rx="6" 
                          fill="#16161D" 
                          stroke={isSelected ? '#c0c1ff' : '#1E1E22'} 
                          strokeWidth={isSelected ? '2' : '1'} 
                        />
                        <rect 
                          width="4" 
                          height="40" 
                          rx="2"
                          fill={color} 
                        />
                        <text 
                          x="12" 
                          y="18" 
                          fill="#fff" 
                          fontSize="10" 
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {node.label.length > 18 ? node.label.substring(0, 16) + '..' : node.label}
                        </text>
                        <text 
                          x="12" 
                          y="30" 
                          fill="#64748B" 
                          fontSize="8" 
                          fontFamily="monospace"
                        >
                          {node.type.toUpperCase()}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Collapsible Architecture Summary Panel */}
                <div className="absolute bottom-4 left-4 right-4 bg-[#16161D]/95 border border-[#1E1E22] rounded-xl p-4 z-10">
                  <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                    <span className="text-[10px] font-label-caps text-[#c0c1ff] uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">description</span> Executive Summary
                    </span>
                    <span className="text-xs text-[#908fa0]">{isSummaryExpanded ? '▼' : '▲'}</span>
                  </div>
                  {isSummaryExpanded && (
                    <p className="text-[12.5px] text-[#CBD5E1] mt-2 leading-relaxed">{report.summary}</p>
                  )}
                </div>

                {/* Node Detail Drawer Panel */}
                {selectedNode && (
                  <div className="absolute top-4 right-4 w-64 bg-[#16161D] border border-[#c0c1ff]/30 rounded-xl p-4 z-20 shadow-xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-bold bg-[#c0c1ff]/15 text-[#c0c1ff] border border-[#c0c1ff]/30 px-2 py-0.5 rounded-full">
                        {selectedNode.type.toUpperCase()}
                      </span>
                      <button 
                        onClick={() => setSelectedNode(null)} 
                        className="text-[#64748B] hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <h4 className="text-[13.5px] font-bold text-white mb-2">{selectedNode.label}</h4>
                    <p className="text-[12px] text-[#CBD5E1] leading-relaxed">{selectedNode.details}</p>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArchitecturePage;
