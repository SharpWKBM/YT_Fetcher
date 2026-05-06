import { useState, useEffect } from 'react';
import styles from './NicheFilter.module.css';

interface Niche {
  name: string;
  count: number;
}

interface NicheFilterProps {
  selectedNiche: string;
  onNicheChange: (niche: string) => void;
}

export default function NicheFilter({ selectedNiche, onNicheChange }: NicheFilterProps) {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNiches();
  }, []);

  const fetchNiches = async () => {
    try {
      const response = await fetch('/api/niches/list');
      const data = await response.json();
      if (data.success) {
        setNiches(data.niches);
      }
    } catch (error) {
      console.error('Error fetching niches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNiches = niches.filter(niche =>
    niche.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectNiche = (nicheName: string) => {
    onNicheChange(nicheName === selectedNiche ? '' : nicheName);
    setIsOpen(false);
  };

  const displayText = selectedNiche || 'All Niches';

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
      >
        {displayText}
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <input
              type="text"
              placeholder="Search niches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.nicheList}>
            <div
              className={`${styles.nicheItem} ${!selectedNiche ? styles.selected : ''}`}
              onClick={() => handleSelectNiche('')}
            >
              <span className={styles.nicheName}>All Niches</span>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading niches...</div>
            ) : filteredNiches.length === 0 ? (
              <div className={styles.empty}>No niches found</div>
            ) : (
              filteredNiches.map((niche) => (
                <div
                  key={niche.name}
                  className={`${styles.nicheItem} ${selectedNiche === niche.name ? styles.selected : ''}`}
                  onClick={() => handleSelectNiche(niche.name)}
                >
                  <span className={styles.nicheName}>{niche.name}</span>
                  <span className={styles.nicheCount}>({niche.count})</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
