import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CATEGORY_COLORS } from '../utils/constants';
import './GraphView.css';

const EDGE_TYPES = {
  collaborator: { color: 'rgba(255,255,255,0.06)', label: 'Shared Collaborator' },
  key: { color: 'rgba(74,123,255,0.08)', label: 'Same Key' },
  category: { color: 'rgba(255,107,138,0.08)', label: 'Same Category' },
};

export default function GraphView({ songs, db, onSongSelect }) {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const simRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [edgeFilter, setEdgeFilter] = useState('all');
  const [dragging, setDragging] = useState(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    if (!songs.length) return { nodes: [], edges: [] };

    const n = songs.map((s, i) => {
      const cat = CATEGORY_COLORS[s.category_name];
      return {
        id: s.song_id,
        song: s,
        label: s.title,
        color: cat?.color || '#555',
        radius: 6,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      };
    });

    const e = [];
    const edgeSet = new Set();

    const addEdge = (a, b, type) => {
      const key = a < b ? `${a}|${b}|${type}` : `${b}|${a}|${type}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      e.push({ source: a, target: b, type });
    };

    // Build lookup maps
    const songCreditsMap = {};
    (songs).forEach((s) => {
      songCreditsMap[s.song_id] = (s.credits || []).map((c) => c.person_id);
    });

    // Collaborator edges
    const personToSongs = {};
    songs.forEach((s) => {
      (s.credits || []).forEach((c) => {
        if (!personToSongs[c.person_id]) personToSongs[c.person_id] = [];
        personToSongs[c.person_id].push(s.song_id);
      });
    });
    Object.values(personToSongs).forEach((songIds) => {
      for (let i = 0; i < songIds.length; i++) {
        for (let j = i + 1; j < songIds.length; j++) {
          addEdge(songIds[i], songIds[j], 'collaborator');
        }
      }
    });

    // Key edges
    const keyToSongs = {};
    songs.forEach((s) => {
      if (s.key) {
        if (!keyToSongs[s.key]) keyToSongs[s.key] = [];
        keyToSongs[s.key].push(s.song_id);
      }
    });
    Object.values(keyToSongs).forEach((songIds) => {
      for (let i = 0; i < songIds.length; i++) {
        for (let j = i + 1; j < songIds.length; j++) {
          addEdge(songIds[i], songIds[j], 'key');
        }
      }
    });

    // Category edges
    const catToSongs = {};
    songs.forEach((s) => {
      if (s.category_name) {
        if (!catToSongs[s.category_name]) catToSongs[s.category_name] = [];
        catToSongs[s.category_name].push(s.song_id);
      }
    });
    Object.values(catToSongs).forEach((songIds) => {
      for (let i = 0; i < songIds.length; i++) {
        for (let j = i + 1; j < songIds.length; j++) {
          addEdge(songIds[i], songIds[j], 'category');
        }
      }
    });

    return { nodes: n, edges: e };
  }, [songs]);

  // Filter edges by type
  const activeEdges = useMemo(() => {
    if (edgeFilter === 'all') return edges;
    return edges.filter((e) => e.type === edgeFilter);
  }, [edges, edgeFilter]);

  // Initialize simulation
  useEffect(() => {
    if (!nodes.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.parentElement.clientWidth;
    const H = canvas.parentElement.clientHeight;
    canvas.width = W;
    canvas.height = H;

    const cx = W / 2;
    const cy = H / 2;

    // Random initial positions in a circle
    nodes.forEach((n) => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.min(W, H) * 0.3;
      n.x = cx + Math.cos(angle) * r;
      n.y = cy + Math.sin(angle) * r;
      n.vx = 0;
      n.vy = 0;
    });

    nodesRef.current = nodes;
    edgesRef.current = activeEdges;

    // Build node index
    const nodeIndex = {};
    nodes.forEach((n) => { nodeIndex[n.id] = n; });

    let alpha = 1;
    let running = true;

    const tick = () => {
      if (!running) return;

      const dt = 0.8;
      const repulsion = 800;
      const attraction = 0.0004;
      const centerGravity = 0.01;
      const damping = 0.85;

      // Repulsion (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (repulsion * alpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Attraction (edges)
      const currentEdges = edgesRef.current;
      currentEdges.forEach((e) => {
        const a = nodeIndex[e.source];
        const b = nodeIndex[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attraction * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // Center gravity
      nodes.forEach((n) => {
        n.vx += (cx - n.x) * centerGravity * alpha;
        n.vy += (cy - n.y) * centerGravity * alpha;
      });

      // Update positions
      nodes.forEach((n) => {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        // Keep in bounds
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y));
      });

      alpha *= 0.995;
      if (alpha < 0.001) alpha = 0.001;

      draw();
      simRef.current = requestAnimationFrame(tick);
    };

    const draw = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const hoveredId = hovered?.id;
      const hoveredNeighbors = new Set();
      if (hoveredId) {
        edgesRef.current.forEach((e) => {
          if (e.source === hoveredId) hoveredNeighbors.add(e.target);
          if (e.target === hoveredId) hoveredNeighbors.add(e.source);
        });
      }

      // Draw edges
      edgesRef.current.forEach((e) => {
        const a = nodeIndex[e.source];
        const b = nodeIndex[e.target];
        if (!a || !b) return;

        const isHighlighted = hoveredId && (e.source === hoveredId || e.target === hoveredId);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (hoveredId && !isHighlighted) {
          ctx.strokeStyle = 'rgba(255,255,255,0.01)';
        } else if (isHighlighted) {
          ctx.strokeStyle = e.type === 'collaborator' ? 'rgba(255,255,255,0.35)'
            : e.type === 'key' ? 'rgba(74,123,255,0.35)'
            : 'rgba(255,107,138,0.35)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = EDGE_TYPES[e.type].color;
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
        ctx.lineWidth = 0.5;
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isHovered = n.id === hoveredId;
        const isNeighbor = hoveredNeighbors.has(n.id);
        const dimmed = hoveredId && !isHovered && !isNeighbor;

        ctx.beginPath();
        ctx.arc(n.x, n.y, isHovered ? 10 : n.radius, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? `${n.color}30` : n.color;
        ctx.fill();

        if (isHovered || isNeighbor) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, isHovered ? 14 : 10, 0, Math.PI * 2);
          ctx.strokeStyle = `${n.color}60`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Labels for hovered and neighbors
        if (isHovered || isNeighbor) {
          ctx.font = isHovered ? '600 11px Inter, sans-serif' : '400 9px Inter, sans-serif';
          ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.7)';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y - (isHovered ? 18 : 14));
        }
      });
    };

    simRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (simRef.current) cancelAnimationFrame(simRef.current);
    };
  }, [nodes, activeEdges]);

  // Update edgesRef when filter changes (without resetting simulation)
  useEffect(() => {
    edgesRef.current = activeEdges;
  }, [activeEdges]);

  // Mouse interactions
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current = { x: mx, y: my };

    if (dragging) {
      const node = nodesRef.current.find((n) => n.id === dragging);
      if (node) {
        node.x = mx;
        node.y = my;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    let found = null;
    for (const n of nodesRef.current) {
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy < 12 * 12) {
        found = n;
        break;
      }
    }
    setHovered(found);
  }, [dragging]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const n of nodesRef.current) {
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy < 12 * 12) {
        setDragging(n.id);
        return;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(null);
    }
  }, [dragging]);

  const handleClick = useCallback((e) => {
    if (dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const n of nodesRef.current) {
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy < 12 * 12) {
        onSongSelect(n.song);
        return;
      }
    }
  }, [dragging, onSongSelect]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const edgeCounts = useMemo(() => {
    const counts = { collaborator: 0, key: 0, category: 0 };
    edges.forEach((e) => { counts[e.type]++; });
    return counts;
  }, [edges]);

  if (!songs.length) {
    return <div className="graph-empty"><p>No songs match the current filters.</p></div>;
  }

  return (
    <div className="graph-view">
      <div className="graph-controls">
        <span className="graph-info">{nodes.length} songs / {activeEdges.length} connections</span>
        <div className="graph-edge-filters">
          <button
            className={`graph-edge-btn ${edgeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setEdgeFilter('all')}
          >
            All
          </button>
          {Object.entries(EDGE_TYPES).map(([type, cfg]) => (
            <button
              key={type}
              className={`graph-edge-btn ${edgeFilter === type ? 'active' : ''}`}
              onClick={() => setEdgeFilter(type)}
            >
              {cfg.label} ({edgeCounts[type]})
            </button>
          ))}
        </div>
        <div className="graph-legend">
          {Object.entries(CATEGORY_COLORS).map(([name, val]) => (
            <span key={name} className="graph-legend-item">
              <span className="graph-legend-dot" style={{ background: val.color }} />
              <span className="graph-legend-label">{val.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="graph-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          style={{ cursor: dragging ? 'grabbing' : hovered ? 'pointer' : 'default' }}
        />
        {hovered && !dragging && (
          <div
            className="graph-tooltip"
            style={{ left: mouseRef.current.x + 16, top: mouseRef.current.y - 10 }}
          >
            <strong>{hovered.song.title}</strong>
            <span>{hovered.song.year} / {hovered.song.release?.title || ''}</span>
            <span>{hovered.song.category_name}</span>
            {hovered.song.key && <span>Key: {hovered.song.key}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
