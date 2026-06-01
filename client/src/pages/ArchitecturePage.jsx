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

      // Automatically compute node coordinates for visual layout
      const computedReport = computeNodePositions(data.report);
      setReport(computedReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick layout generator for nodes in a clean multi-layer stack
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

    // Group nodes by layer
    const layerGroups = {};
    reportData.nodes.forEach((node) => {
      const type = node.type || 'backend';
      const layer = typeLayers[type] !== undefined ? typeLayers[type] : 2;
      if (!layerGroups[layer]) layerGroups[layer] = [];
      layerGroups[layer].push(node);
    });

    const canvasWidth = 600;
    const canvasHeight = 500;
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
      case 'frontend': return '#60A5FA'; // Blue
      case 'backend': return '#A78BFA'; // Purple
      case 'database': return '#34D399'; // Green
      case 'gateway': return '#FB7185'; // Rose
      case 'queue': return '#FBBF24'; // Amber
      default: return '#9CA3AF'; // Gray
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        {/* Monaco Context Panel */}
        <div className="editor-panel">
          <div className="panel-topbar">
            <span className="panel-label">📐 Visual Architecture Generator</span>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
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

          <div className="editor-footer">
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Maps database linkages, backend services, API flows and message buffers.
            </span>
            <button 
              className="btn-explain" 
              onClick={handleGenerate}
              disabled={loading || !context.trim()}
            >
              {loading ? '📐 Designing...' : '📐 Generate Architecture'}
            </button>
          </div>
        </div>

        {/* Dynamic SVG Visual Map Panel */}
        <div className="output-panel" style={{ display: 'flex', flexDirection: 'column', background: '#0B0F19', overflow: 'hidden', position: 'relative' }}>
          
          <div className="panel-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="panel-label">Architecture Board</span>
            {report && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-copy" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleZoomOut}>🔍-</button>
                <button className="btn-copy" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleZoomReset}>Reset</button>
                <button className="btn-copy" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleZoomIn}>🔍+</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {error && <div className="error-banner" style={{ margin: '16px' }}>⚠️ {error}</div>}

            {loading && (
              <div className="output-placeholder">
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
                <p>Llama 3.3 is rendering relationships and designing connection mapping...</p>
              </div>
            )}

            {!report && !loading && !error && (
              <div className="output-placeholder">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📐</div>
                <p>System topology mapping dashboard.</p>
                <p style={{ fontSize: '12px', marginTop: '6px', color: '#64748B' }}>
                  Write your backend service blueprints, route files, or systems descriptions to render a dynamic interactive topology map.
                </p>
              </div>
            )}

            {/* Topology SVG Workspace */}
            {report && !loading && (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                
                {/* SVG Visual Stage */}
                <svg 
                  ref={canvasRef}
                  width="100%" 
                  height="100%" 
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'top left', 
                    transition: 'transform 0.15s ease-out',
                    background: '#0B0F19'
                  }}
                >
                  {/* Arrow markers for edges */}
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                    </marker>
                    <marker id="arrow-selected" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent2)" />
                    </marker>
                  </defs>

                  {/* Draw Connections */}
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
                          stroke={isSelected ? 'var(--accent2)' : '#334155'} 
                          strokeWidth={isSelected ? '2' : '1.5'} 
                          markerEnd={`url(#${isSelected ? 'arrow-selected' : 'arrow'})`}
                        />
                        <text 
                          x={(fromNode.x + toNode.x) / 2 + 60} 
                          y={(fromNode.y + toNode.y) / 2 + 15} 
                          fill={isSelected ? 'var(--accent2)' : '#64748B'} 
                          fontSize="9" 
                          fontFamily="sans-serif"
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
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Node Card Container */}
                        <rect 
                          width="120" 
                          height="40" 
                          rx="6" 
                          fill="#16161D" 
                          stroke={isSelected ? 'var(--accent)' : 'var(--border)'} 
                          strokeWidth={isSelected ? '2' : '1'} 
                        />
                        {/* Side color ribbon */}
                        <rect 
                          width="4" 
                          height="40" 
                          rx="2"
                          fill={color} 
                        />
                        {/* Label text */}
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
                        {/* Type text */}
                        <text 
                          x="12" 
                          y="30" 
                          fill="#64748B" 
                          fontSize="8" 
                          fontFamily="sans-serif"
                        >
                          {node.type.toUpperCase()}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Collapsible Architecture Summary Panel */}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '16px', 
                  left: '16px', 
                  right: '16px', 
                  background: 'rgba(22, 22, 29, 0.95)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  zIndex: 10,
                  transition: 'all 0.15s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📋 Executive Summary
                    </span>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>{isSummaryExpanded ? '▼' : '▲'}</span>
                  </div>
                  {isSummaryExpanded && (
                    <p style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '8px', lineHeight: '1.5' }}>{report.summary}</p>
                  )}
                </div>

                {/* Left Node Detail Sidebar Panel */}
                {selectedNode && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    width: '260px', 
                    background: '#16161D', 
                    border: '1px solid var(--accent)', 
                    borderRadius: '10px', 
                    padding: '16px', 
                    zIndex: 20 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        background: 'rgba(124, 106, 247, 0.15)', 
                        color: 'var(--accent2)', 
                        padding: '2px 8px', 
                        borderRadius: '20px' 
                      }}>
                        {selectedNode.type.toUpperCase()}
                      </span>
                      <button 
                        onClick={() => setSelectedNode(null)} 
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>{selectedNode.label}</h4>
                    <p style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.5' }}>{selectedNode.details}</p>
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
