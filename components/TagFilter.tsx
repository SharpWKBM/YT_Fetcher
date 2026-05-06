import { useState, useEffect } from 'react';
import styles from './TagFilter.module.css';

interface Tag {
  name: string;
  count: number;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags/list');
      const data = await response.json();
      if (data.success) {
        setTags(data.tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
      >
        Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {selectedTags.length > 0 && (
              <button onClick={handleClearAll} className={styles.clearBtn}>
                Clear all
              </button>
            )}
          </div>

          <div className={styles.tagList}>
            {loading ? (
              <div className={styles.loading}>Loading tags...</div>
            ) : filteredTags.length === 0 ? (
              <div className={styles.empty}>No tags found</div>
            ) : (
              filteredTags.map((tag) => (
                <label key={tag.name} className={styles.tagItem}>
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={() => handleToggleTag(tag.name)}
                  />
                  <span className={styles.tagName}>{tag.name}</span>
                  <span className={styles.tagCount}>({tag.count})</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
