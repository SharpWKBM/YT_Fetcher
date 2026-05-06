import { useState, useEffect } from 'react';
import styles from './TagManager.module.css';

interface TagManagerProps {
  channelId: string;
  initialTags?: string[];
}

export default function TagManager({ channelId, initialTags = [] }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTags();
    fetchPopularTags();
  }, [channelId]);

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/channels/${channelId}/tags`);
      const data = await response.json();
      if (data.success) {
        setTags(data.tags);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/tags?popular=true');
      const data = await response.json();
      if (data.success) {
        setPopularTags(data.tags);
      }
    } catch (err) {
      console.error('Failed to fetch popular tags:', err);
    }
  };

  const addTag = async (tag: string) => {
    if (!tag.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/channels/${channelId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tag.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setTags([...tags, data.tag]);
        setNewTag('');
      } else {
        setError(data.error || 'Failed to add tag');
      }
    } catch (err) {
      setError('Failed to add tag');
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tag: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/channels/${channelId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });

      const data = await response.json();

      if (data.success) {
        setTags(tags.filter(t => t !== tag));
      } else {
        setError(data.error || 'Failed to remove tag');
      }
    } catch (err) {
      setError('Failed to remove tag');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTag(newTag);
  };

  const handlePopularTagClick = (tag: string) => {
    if (!tags.includes(tag)) {
      addTag(tag);
    }
  };

  return (
    <div className={styles.tagManager}>
      <div className={styles.currentTags}>
        <h3>Tags</h3>
        <div className={styles.tagList}>
          {tags.length === 0 ? (
            <p className={styles.noTags}>No tags yet</p>
          ) : (
            tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  disabled={loading}
                  className={styles.removeBtn}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.addTagForm}>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a tag..."
          maxLength={50}
          disabled={loading}
          className={styles.input}
        />
        <button type="submit" disabled={loading || !newTag.trim()} className={styles.addBtn}>
          Add
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {popularTags.length > 0 && (
        <div className={styles.popularTags}>
          <h4>Popular Tags</h4>
          <div className={styles.tagList}>
            {popularTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => handlePopularTagClick(tag)}
                disabled={loading || tags.includes(tag)}
                className={`${styles.tag} ${styles.popularTag} ${tags.includes(tag) ? styles.disabled : ''}`}
              >
                {tag} ({count})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
