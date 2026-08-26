import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Search, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  Cpu, 
  Check, 
  Tag,
  ArrowRight
} from 'lucide-react';
import { KnowledgeMemoryItem } from '../types/nexus';
import { defaultMemoryStore } from '../engine/memoryStore';

export const KnowledgeBase: React.FC = () => {
  const [items, setItems] = useState<KnowledgeMemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ item: KnowledgeMemoryItem; score: number }[]>([]);

  // Add Item Modal / Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Custom Documentation');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    refreshItems();
  }, []);

  const refreshItems = () => {
    setItems(defaultMemoryStore.getAll());
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = defaultMemoryStore.search(query, 5, 0.1);
    setSearchResults(results);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    defaultMemoryStore.addItem(title.trim(), content.trim(), category.trim(), tags);
    setTitle('');
    setContent('');
    setTagsInput('');
    setShowAddForm(false);
    refreshItems();
  };

  const handleDelete = (id: string) => {
    defaultMemoryStore.deleteItem(id);
    refreshItems();
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              On-Device Vector Knowledge Store (RAG)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-mono-code">
                LOCAL COSINE EMBEDDINGS
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ground Nexus AI's local inference in private notes, API manuals, and instructions.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Chunk</span>
        </button>
      </div>

      {/* Add Item Form Modal */}
      {showAddForm && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl animate-in fade-in duration-150">
          <form onSubmit={handleAddItem} className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-cyan-300">Add New Document to Local Vector Store</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Company API Security Guide"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Specifications, Personal, Code"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Text Content (Vectorized on save)</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste the documentation, notes, or instructions here..."
                rows={4}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="api, security, internal, local"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20"
              >
                Save & Vectorize Chunk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Semantic Search Sandbox */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Live Vector Semantic Search Simulator
          </h3>
          <span className="text-[10px] font-mono-code text-slate-500">
            Computes L2-normalized Cosine Similarity scores
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Type a natural language query to test vector recall (e.g. 'What is the privacy policy?')..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 pl-8"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono-code text-cyan-300">Matching Vector Chunks:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchResults.map(({ item, score }, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                    <span className="font-mono-code text-[11px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {(score * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-slate-400 line-clamp-2 text-[11px]">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Memory Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Stored Knowledge Chunks ({items.length})</span>
          <span className="font-mono-code text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Encrypted & Local
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-cyan-400/80 font-mono-code">{item.category}</span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                  title="Delete Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 line-clamp-3 font-sans leading-relaxed">
                {item.content}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono-code">
                <div className="flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{item.tags.join(', ') || 'no-tags'}</span>
                </div>
                <span>Dim: {item.vector.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
