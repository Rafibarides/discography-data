import { useState, useMemo } from 'react';
import { getTrendData, getCategoryTrendData } from '../utils/analytics';
import { CATEGORY_COLORS } from '../utils/constants';
import './TrendChart.css';

const METRIC_OPTIONS = [
  { value: 'song_count', label: 'Songs Per Year' },
  { value: 'avg_word_count', label: 'Avg Word Count' },
  { value: 'avg_duration', label: 'Avg Duration (sec)' },
  { value: 'avg_bpm', label: 'Avg BPM' },
  { value: 'featured_count', label: 'Featured Collaborations (%)' },
  { value: 'explicit_count', label: 'Explicit Songs (%)' },
  { value: 'categories', label: 'Categories Over Time' },
];

const PERCENTAGE_METRICS = ['featured_count', 'explicit_count', 'categories'];

const CHART_W = 700;
const CHART_H = 300;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

export default function TrendChart({ db }) {
  const [metric, setMetric] = useState('song_count');

  const singleData = useMemo(() => {
    if (metric === 'categories') return null;
    return getTrendData(db, metric);
  }, [db, metric]);

  const categoryData = useMemo(() => {
    if (metric !== 'categories') return null;
    return getCategoryTrendData(db);
  }, [db, metric]);

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  return (
    <div className="trend-chart-panel">
      <div className="trend-header">
        <h3 className="trend-title">Trends</h3>
        <select
          className="trend-select"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          {METRIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="trend-chart-container">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="trend-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {metric === 'categories' && categoryData
            ? renderCategoryChart(categoryData, innerW, innerH, PAD)
            : singleData && renderSingleChart(singleData, innerW, innerH, PAD, PERCENTAGE_METRICS.includes(metric))
          }
        </svg>
      </div>

      {metric === 'categories' && (
        <div className="trend-legend">
          {Object.entries(CATEGORY_COLORS).map(([name, val]) => (
            <span key={name} className="trend-legend-item">
              <span className="trend-legend-dot" style={{ background: val.color }} />
              {val.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function renderSingleChart(data, w, h, pad, isPercentage = false) {
  if (!data.length) return null;
  const maxVal = isPercentage ? 100 : Math.max(...data.map((d) => d.value), 1);
  const xStep = data.length > 1 ? w / (data.length - 1) : w / 2;
  const suffix = isPercentage ? '%' : '';

  const points = data.map((d, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + h - (d.value / maxVal) * h,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <g>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = pad.top + h - pct * h;
        const val = Math.round(maxVal * pct);
        return (
          <g key={pct}>
            <line x1={pad.left} y1={y} x2={pad.left + w} y2={y} stroke="#222" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#666" fontSize="10">{val}{suffix}</text>
          </g>
        );
      })}

      <path d={pathD} fill="none" stroke="#4A7BFF" strokeWidth="2" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#4A7BFF" />
          <circle cx={p.x} cy={p.y} r="6" fill="none" stroke="#4A7BFF" strokeWidth="1" opacity="0.3" />
          <text x={p.x} y={pad.top + h + 20} textAnchor="middle" fill="#888" fontSize="11">{p.year}</text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#ccc" fontSize="10" fontWeight="500">{p.value}{suffix}</text>
        </g>
      ))}
    </g>
  );
}

function renderCategoryChart(catData, w, h, pad) {
  const { years, series } = catData;
  if (!years.length) return null;

  const maxVal = 100;
  const xStep = years.length > 1 ? w / (years.length - 1) : w / 2;

  return (
    <g>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = pad.top + h - pct * h;
        const val = Math.round(maxVal * pct);
        return (
          <g key={pct}>
            <line x1={pad.left} y1={y} x2={pad.left + w} y2={y} stroke="#222" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#666" fontSize="10">{val}%</text>
          </g>
        );
      })}

      {years.map((year, i) => (
        <text key={year} x={pad.left + i * xStep} y={pad.top + h + 20} textAnchor="middle" fill="#888" fontSize="11">{year}</text>
      ))}

      {Object.entries(series).map(([catName, data]) => {
        const color = CATEGORY_COLORS[catName]?.color || '#666';
        const points = data.map((d, i) => ({
          x: pad.left + i * xStep,
          y: pad.top + h - (d.value / maxVal) * h,
        }));
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
          <g key={catName}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
          </g>
        );
      })}
    </g>
  );
}
