import { useState } from 'react';
import styles from '@/styles/effects.module.css';
import animations from '@/styles/animations.module.css';

interface FilterPanelProps {
  onFilterChange: (filters: ChannelFilters) => void;
}

interface ChannelFilters {
  minSubs: number;
  maxSubs: number;
  inactiveMonths: number;
  niche?: string;
  tags?: string[];
  minVideoCount?: number;
  hasSocialLinks?: boolean;
  excludeBlacklisted?: boolean;
  lastActivityRange?: '1-3mo' | '3-6mo' | '6-12mo' | '12-24mo' | '24+mo';
}

const NICHES = [
  'Gaming', 'Tech & Science', 'Education', 'Entertainment', 'Music',
  'Sports & Fitness', 'News & Politics', 'Cooking & Food', 'Travel & Adventure',
  'Fashion & Beauty', 'DIY & Crafts', 'Business & Finance', 'Health & Wellness',
  'Comedy', 'Animation', 'Documentary', 'Vlog', 'Review & Unboxing',
  'Kids & Family', 'Pets & Animals'
];

export default function AdvancedFilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<ChannelFilters>({
    minSubs: 0,
    maxSubs: 10000000,
    inactiveMonths: 12,
    excludeBlacklisted: true,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleFilterUpdate = (updates: Partial<ChannelFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const addTag = () => {
    if (tagInput.trim() && (!filters.tags || !filters.tags.includes(tagInput.trim()))) {
      const newTags = [...(filters.tags || []), tagInput.trim()];
      handleFilterUpdate({ tags: newTags });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = (filters.tags || []).filter(t => t !== tag);
    handleFilterUpdate({ tags: newTags.length > 0 ? newTags : undefined });
  };

  return (
    <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-6 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Advanced Filters</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
          <svg
            className={`w-5 h-5 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Subscriber Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subscriber Range
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={filters.minSubs}
              onChange={(e) => handleFilterUpdate({ minSubs: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Min"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              value={filters.maxSubs}
              onChange={(e) => handleFilterUpdate({ maxSubs: parseInt(e.target.value) || 10000000 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Max"
            />
          </div>
        </div>

        {/* Last Activity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Activity
          </label>
          <select
            value={filters.lastActivityRange || ''}
            onChange={(e) => handleFilterUpdate({ lastActivityRange: e.target.value as any || undefined })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Any time</option>
            <option value="1-3mo">1-3 months ago</option>
            <option value="3-6mo">3-6 months ago</option>
            <option value="6-12mo">6-12 months ago</option>
            <option value="12-24mo">12-24 months ago</option>
            <option value="24+mo">24+ months ago</option>
          </select>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className={`${animations.fadeInUp} space-y-6`}>
          {/* Niche Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niche
            </label>
            <select
              value={filters.niche || ''}
              onChange={(e) => handleFilterUpdate({ niche: e.target.value || undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Niches</option>
              {NICHES.map(niche => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Add tag..."
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
            {filters.tags && filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Video Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Video Count
            </label>
            <input
              type="number"
              value={filters.minVideoCount || ''}
              onChange={(e) => handleFilterUpdate({ minVideoCount: parseInt(e.target.value) || undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Any"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasSocialLinks || false}
                onChange={(e) => handleFilterUpdate({ hasSocialLinks: e.target.checked || undefined })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-gray-700">Has social media links</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.excludeBlacklisted !== false}
                onChange={(e) => handleFilterUpdate({ excludeBlacklisted: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-gray-700">Exclude blacklisted channels</span>
            </label>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            const defaultFilters: ChannelFilters = {
              minSubs: 0,
              maxSubs: 10000000,
              inactiveMonths: 12,
              excludeBlacklisted: true,
            };
            setFilters(defaultFilters);
            onFilterChange(defaultFilters);
          }}
          className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
