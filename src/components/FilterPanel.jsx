import { CATEGORY_COLORS, COLOR_BY_OPTIONS, SIZE_BY_OPTIONS, GROUP_BY_OPTIONS } from '../utils/constants';
import './FilterPanel.css';

export default function FilterPanel({
  db,
  filters,
  display,
  onFilterChange,
  onDisplayChange,
  onReset,
  isOpen,
  onToggle,
  filteredCount,
  onPersonSelect,
}) {
  if (!db) return null;

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    if (current.includes(value)) {
      onFilterChange(key, current.filter((v) => v !== value));
    } else {
      onFilterChange(key, [...current, value]);
    }
  };

  const toggleBoolFilter = (key, value) => {
    if (filters[key] === value) {
      onFilterChange(key, null);
    } else {
      onFilterChange(key, value);
    }
  };

  const featuredVocalists = db.people.filter((p) => {
    return db.songCredits.some(
      (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'featured_vocals'
    );
  });

  const mixers = db.people.filter((p) => {
    return db.songCredits.some(
      (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'mixing'
    );
  });

  const masters = db.people.filter((p) => {
    return db.songCredits.some(
      (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'mastering'
    );
  });

  const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'searchQuery' || key === 'lyricSearch') return val && val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (val === null || val === undefined) return false;
    if (val === 'all') return false;
    return true;
  });

  return (
    <aside className={`filter-panel ${isOpen ? 'open' : 'closed'}`}>
      <button className="filter-toggle" onClick={onToggle} title={isOpen ? 'Close filters' : 'Open filters'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <polyline points="15 18 9 12 15 6" />
          ) : (
            <polyline points="9 18 15 12 9 6" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="filter-content">
          <div className="filter-header">
            <span className="filter-title">Filters</span>
            {hasActiveFilters && (
              <button className="btn-ghost filter-reset" onClick={onReset}>
                Reset
              </button>
            )}
          </div>

          <Section title="Display">
            <div className="filter-row">
              <label className="filter-label">Color</label>
              <select
                value={display.colorBy}
                onChange={(e) => onDisplayChange('colorBy', e.target.value)}
              >
                {COLOR_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <label className="filter-label">Size</label>
              <select
                value={display.sizeBy}
                onChange={(e) => onDisplayChange('sizeBy', e.target.value)}
              >
                {SIZE_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <label className="filter-label">Group</label>
              <select
                value={display.groupBy}
                onChange={(e) => onDisplayChange('groupBy', e.target.value)}
              >
                {GROUP_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </Section>

          <Section title="Year">
            <div className="filter-chips">
              {db.meta.years.map((year) => (
                <Chip
                  key={year}
                  label={String(year)}
                  active={filters.years.includes(year)}
                  onClick={() => toggleArrayFilter('years', year)}
                  count={db.songs.filter((s) => s.year === year).length}
                />
              ))}
            </div>
          </Section>

          <Section title="Category">
            <div className="filter-chips">
              {db.lyricCategories.map((cat) => (
                <Chip
                  key={cat.name}
                  label={CATEGORY_COLORS[cat.name]?.label || cat.name}
                  active={filters.categories.includes(cat.name)}
                  onClick={() => toggleArrayFilter('categories', cat.name)}
                  color={CATEGORY_COLORS[cat.name]?.color}
                  count={db.songs.filter((s) => s.category_name === cat.name).length}
                />
              ))}
            </div>
          </Section>

          <Section title="Release">
            <div className="filter-chips scrollable">
              {db.releases.map((r) => (
                <Chip
                  key={r.release_id}
                  label={r.title}
                  active={filters.releases.includes(r.release_id)}
                  onClick={() => toggleArrayFilter('releases', r.release_id)}
                  count={db.songs.filter((s) => s.release_id === r.release_id).length}
                  sub={r.release_type}
                />
              ))}
            </div>
          </Section>

          <Section title="Distributor">
            <div className="filter-chips">
              {db.distributors.map((d) => (
                <Chip
                  key={d.distributor_id}
                  label={d.name}
                  active={filters.distributors.includes(d.distributor_id)}
                  onClick={() => toggleArrayFilter('distributors', d.distributor_id)}
                  count={db.songs.filter((s) => s.distributor_id === d.distributor_id).length}
                />
              ))}
            </div>
          </Section>

          <Section title="Label / Independent">
            <div className="filter-chips">
              <Chip
                label="Independent"
                active={filters.labels.includes('__independent__')}
                onClick={() => toggleArrayFilter('labels', '__independent__')}
                count={db.songs.filter((s) => !s.label_id).length}
              />
              {db.labels.map((l) => (
                <Chip
                  key={l.label_id}
                  label={l.name}
                  active={filters.labels.includes(l.label_id)}
                  onClick={() => toggleArrayFilter('labels', l.label_id)}
                  count={db.songs.filter((s) => s.label_id === l.label_id).length}
                />
              ))}
            </div>
          </Section>

          <Section title="Featured Vocalist">
            <div className="filter-chips scrollable">
              {featuredVocalists.map((p) => {
                const count = db.songCredits.filter(
                  (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'featured_vocals'
                ).length;
                return (
                  <Chip
                    key={p.person_id}
                    label={p.name}
                    active={(filters.vocalists || []).includes(p.person_id)}
                    onClick={() => toggleArrayFilter('vocalists', p.person_id)}
                    onNameClick={() => onPersonSelect(p.person_id)}
                    count={count}
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Mixed By">
            <div className="filter-chips scrollable">
              {mixers.map((p) => {
                const count = db.songCredits.filter(
                  (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'mixing'
                ).length;
                return (
                  <Chip
                    key={p.person_id}
                    label={p.name}
                    active={(filters.mixers || []).includes(p.person_id)}
                    onClick={() => toggleArrayFilter('mixers', p.person_id)}
                    onNameClick={() => onPersonSelect(p.person_id)}
                    count={count}
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Mastered By">
            <div className="filter-chips scrollable">
              {masters.map((p) => {
                const count = db.songCredits.filter(
                  (c) => c.person_id === p.person_id && getRoleName(db, c.credit_role_id) === 'mastering'
                ).length;
                return (
                  <Chip
                    key={p.person_id}
                    label={p.name}
                    active={(filters.masters || []).includes(p.person_id)}
                    onClick={() => toggleArrayFilter('masters', p.person_id)}
                    onNameClick={() => onPersonSelect(p.person_id)}
                    count={count}
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Properties">
            <div className="filter-toggles">
              <ToggleRow
                label="Published"
                value={filters.isPublished}
                onToggle={(v) => toggleBoolFilter('isPublished', v)}
              />
              <ToggleRow
                label="Explicit"
                value={filters.isExplicit}
                onToggle={(v) => toggleBoolFilter('isExplicit', v)}
              />
              <ToggleRow
                label="Has Video"
                value={filters.hasVideo}
                onToggle={(v) => toggleBoolFilter('hasVideo', v)}
              />
              <ToggleRow
                label="Has Featured"
                value={filters.hasFeatured}
                onToggle={(v) => toggleBoolFilter('hasFeatured', v)}
              />
            </div>
          </Section>

          <Section title="Key">
            <div className="filter-row">
              <select
                value={filters.keyQuality}
                onChange={(e) => onFilterChange('keyQuality', e.target.value)}
              >
                <option value="all">All</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            <div className="filter-chips scrollable">
              {db.meta.allKeys.map((k) => (
                <Chip
                  key={k}
                  label={k}
                  active={filters.keys.includes(k)}
                  onClick={() => toggleArrayFilter('keys', k)}
                  count={db.songs.filter((s) => s.key === k).length}
                  small
                />
              ))}
            </div>
          </Section>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div className="filter-section">
      <h4 className="filter-section-title">{title}</h4>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick, count, color, sub, small, onNameClick }) {
  return (
    <button
      className={`filter-chip ${active ? 'active' : ''} ${small ? 'small' : ''}`}
      onClick={onClick}
      style={color && active ? { borderColor: color, boxShadow: `0 0 6px ${color}40` } : undefined}
    >
      {color && <span className="chip-dot" style={{ background: color }} />}
      <span
        className={`chip-label ${onNameClick ? 'clickable-name' : ''}`}
        onClick={onNameClick ? (e) => { e.stopPropagation(); onNameClick(); } : undefined}
      >
        {label}
      </span>
      {sub && <span className="chip-sub">{sub}</span>}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  );
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <div className="toggle-btns">
        <button
          className={`toggle-btn ${value === true ? 'active yes' : ''}`}
          onClick={() => onToggle(true)}
        >
          Yes
        </button>
        <button
          className={`toggle-btn ${value === false ? 'active no' : ''}`}
          onClick={() => onToggle(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

function getRoleName(db, roleId) {
  const role = db.indexes.roleIndex[roleId];
  return role ? role.name : roleId;
}
