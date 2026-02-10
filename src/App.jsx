import { useState, useMemo } from 'react';
import { useDiscography } from './hooks/useDiscography';
import { applyFilters } from './utils/analytics';
import { VIEW_MODES } from './utils/constants';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import SongGrid from './components/SongGrid';
import SongDetail from './components/SongDetail';
import PersonView from './components/PersonView';
import StatsPanel from './components/StatsPanel';
import TrendChart from './components/TrendChart';
import LyricSearch from './components/LyricSearch';
import ExportPanel from './components/ExportPanel';
import HeatmapView from './components/HeatmapView';
import ArtworkView from './components/ArtworkView';
import SettingsModal from './components/SettingsModal';
import './App.css';

const INITIAL_FILTERS = {
  years: [],
  releases: [],
  categories: [],
  perspectives: [],
  keys: [],
  distributors: [],
  labels: [],
  people: [],
  mixers: [],
  masters: [],
  vocalists: [],
  isPublished: null,
  isExplicit: null,
  hasVideo: null,
  hasFeatured: null,
  keyQuality: 'all',
  searchQuery: '',
  lyricSearch: '',
};

const INITIAL_DISPLAY = {
  colorBy: 'category',
  sizeBy: 'none',
  groupBy: 'year',
};

export default function App() {
  const { db, loading, error, refresh } = useDiscography();
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [display, setDisplay] = useState(INITIAL_DISPLAY);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLyricSearch, setShowLyricSearch] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);

  const filteredSongs = useMemo(() => {
    if (!db) return [];
    return applyFilters(db.songs, filters);
  }, [db, filters]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const updateDisplay = (key, value) => {
    setDisplay((prev) => ({ ...prev, [key]: value }));
  };

  if (loading && !db) {
    return (
      <div className="app-loading">
        <div className="loading-pulse" />
        <p>Loading discography...</p>
      </div>
    );
  }

  if (error && !db) {
    return (
      <div className="app-error">
        <h2>Connection Required</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => setShowSettings(true)}>
          Configure Database URL
        </button>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onSave={() => {
              setShowSettings(false);
              refresh();
            }}
          />
        )}
      </div>
    );
  }

  if (!db) return null;

  return (
    <div className="app">
      <Header
        db={db}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => updateFilter('searchQuery', q)}
        onRefresh={refresh}
        onSettings={() => setShowSettings(true)}
        onExport={() => setShowExport(true)}
        onLyricSearch={() => setShowLyricSearch(true)}
        loading={loading}
        resultCount={filteredSongs.length}
        totalCount={db.songs.length}
      />

      <div className="app-body">
        <FilterPanel
          db={db}
          filters={filters}
          display={display}
          onFilterChange={updateFilter}
          onDisplayChange={updateDisplay}
          onReset={resetFilters}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          filteredCount={filteredSongs.length}
          onPersonSelect={setSelectedPerson}
        />

        <main className="app-main">
          {viewMode === VIEW_MODES.GRID && (
            <SongGrid
              songs={filteredSongs}
              allSongs={db.songs}
              display={display}
              db={db}
              onSongSelect={setSelectedSong}
              onPersonSelect={setSelectedPerson}
            />
          )}
          {viewMode === VIEW_MODES.HEATMAP && (
            <HeatmapView
              songs={filteredSongs}
              allSongs={db.songs}
              display={display}
              db={db}
              onSongSelect={setSelectedSong}
            />
          )}
          {viewMode === VIEW_MODES.STATS && (
            <StatsPanel
              db={db}
              filteredSongs={filteredSongs}
              onSongSelect={setSelectedSong}
              onPersonSelect={setSelectedPerson}
            />
          )}
          {viewMode === VIEW_MODES.TRENDS && (
            <TrendChart db={db} filteredSongs={filteredSongs} />
          )}
          {viewMode === VIEW_MODES.ARTWORK && (
            <ArtworkView db={db} onPersonSelect={setSelectedPerson} />
          )}
        </main>
      </div>

      {selectedSong && (
        <SongDetail
          song={selectedSong}
          db={db}
          onClose={() => setSelectedSong(null)}
          onPersonSelect={(p) => {
            setSelectedSong(null);
            setSelectedPerson(p);
          }}
        />
      )}

      {selectedPerson && (
        <PersonView
          personId={selectedPerson}
          db={db}
          onClose={() => setSelectedPerson(null)}
          onSongSelect={(s) => {
            setSelectedPerson(null);
            setSelectedSong(s);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={() => {
            setShowSettings(false);
            refresh();
          }}
        />
      )}

      {showExport && (
        <ExportPanel
          db={db}
          filteredSongs={filteredSongs}
          onClose={() => setShowExport(false)}
        />
      )}

      {showLyricSearch && (
        <LyricSearch
          db={db}
          onClose={() => setShowLyricSearch(false)}
          onSongSelect={(s) => {
            setShowLyricSearch(false);
            setSelectedSong(s);
          }}
        />
      )}
    </div>
  );
}
