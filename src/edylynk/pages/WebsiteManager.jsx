import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Trash2, Plus, Image, Video, BookOpen, BarChart2, Edit2, Check, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import legoImg from '../../assets/lego-rob.webp';
import ev3Img from '../../assets/ev3-robot.webp';
import scratchImg from '../../assets/scratch-coding.webp';
import quarkyImg from '../../assets/quarky-creator.webp';
import aiKidsImg from '../../assets/ai-for-kids.webp';
import quarkyInnoImg from '../../assets/quarky-innovator.webp';
import appDevImg from '../../assets/app-dev.webp';

const DEFAULT_PROGRAMS = [
  { title: 'Lego Robotics', badge: 'Beginner · Ages 5+', description: 'Build and program LEGO robots in a fun, hands-on environment. Perfect for young learners discovering how engineering and coding work together.', highlights: ['LEGO bricks & sensors', 'Block-based programming', '24 hrs · Beginner'], color: '#1a5fa8', image_url: legoImg, order: 0 },
  { title: 'EV3 Robotics', badge: 'Intermediate · Ages 9+', description: 'Advance to MINDSTORMS EV3 — sensors, motors, and real programming challenges that replicate competition-grade robotics.', highlights: ['EV3 MINDSTORMS kits', 'Sensor & motor control', '24 hrs · Intermediate'], color: '#c0155a', image_url: ev3Img, order: 1 },
  { title: 'Scratch Coding', badge: 'Beginner · Ages 5+', description: 'Introduce programming logic through Scratch — drag-and-drop animations, games, and interactive stories that make code click.', highlights: ['Visual block coding', 'Games & animations', '24 hrs · Beginner'], color: '#f9c929', image_url: scratchImg, order: 2 },
  { title: 'Quarky Creator', badge: 'Beginner · Ages 5+', description: 'Use the Quarky microcontroller to design circuits, write code, and build creative projects with LEDs, buzzers, and sensors.', highlights: ['Quarky microcontroller', 'Physical computing', '24 hrs · Beginner'], color: '#10B981', image_url: quarkyImg, order: 3 },
  { title: 'AI for Kids', badge: 'Intermediate · Ages 9+', description: 'Demystify artificial intelligence — students train ML models, explore computer vision, and build AI-powered projects.', highlights: ['Machine learning basics', 'Image recognition', '24 hrs · Intermediate'], color: '#1a5fa8', image_url: aiKidsImg, order: 4 },
  { title: 'Quarky Innovator', badge: 'Beginner · Ages 5+', description: 'The next step after Creator — tackle more complex Quarky challenges involving automation, IoT concepts, and innovation sprints.', highlights: ['Advanced Quarky projects', 'Automation & IoT', '24 hrs · Beginner'], color: '#c0155a', image_url: quarkyInnoImg, order: 5 },
  { title: 'App Development', badge: 'Intermediate · Ages 9+', description: 'Design and build real mobile applications. Students learn UI/UX principles, logic flows, and publish working apps.', highlights: ['Mobile app design', 'UI/UX fundamentals', '24 hrs · Intermediate'], color: '#f9c929', image_url: appDevImg, order: 6 },
];

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const TABS = ['Gallery', 'Courses', 'Stats'];

// ── Gallery Tab ──────────────────────────────────────────────────────────────
function GalleryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ url: '', type: 'photo', caption: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.getGallery();
      setItems(res.data);
    } catch { toast.error('Failed to load gallery'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.url.trim()) return toast.error('URL is required');
    setAdding(true);
    try {
      await api.addGalleryItem(form);
      toast.success('Item added');
      setForm({ url: '', type: 'photo', caption: '' });
      fetchItems();
    } catch { toast.error('Failed to add item'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.deleteGalleryItem(id);
      toast.success('Deleted');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Add Photo / Video</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label>URL</Label>
            <Input placeholder="https://..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Caption</Label>
            <Input placeholder="Optional caption" value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} />
          </div>
          <Button type="submit" disabled={adding} className="md:col-span-4 md:w-auto md:justify-self-start">
            <Plus size={16} className="mr-1" /> Add Item
          </Button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-sm">No gallery items yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
              {item.type === 'video' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
                  <Video size={32} className="text-slate-400" />
                  <span className="text-xs text-slate-500 break-all">{item.url}</span>
                </div>
              ) : (
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
              )}
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                  {item.caption}
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="absolute top-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full capitalize">
                  {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Courses Tab ───────────────────────────────────────────────────────────────
const EMPTY_PROGRAM = { title: '', description: '', badge: '', image_url: '', highlights: '', color: '#1a5fa8', order: 0 };

const COURSE_CARD_STYLES = `
  .course-admin-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .course-admin-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--card-accent, #1a5fa8);
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 1;
  }
  .course-admin-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 40px var(--card-shadow, rgba(26,95,168,0.15));
    border-color: var(--card-border, rgba(26,95,168,0.4));
  }
  .course-admin-card:hover::before { opacity: 1; }
  .course-admin-card .ca-img {
    width: 100%; height: 180px;
    object-fit: cover;
    transition: transform 0.4s ease;
    display: block;
  }
  .course-admin-card:hover .ca-img { transform: scale(1.05); }
  .course-admin-card .ca-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .course-admin-card:hover .ca-actions { opacity: 1; }
`;

function CoursesTab() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PROGRAM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => { fetchPrograms(); }, []);

  const fetchPrograms = async () => {
    try {
      const res = await api.getWebsitePrograms();
      setPrograms(res.data);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_PROGRAM); setEditId(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ ...p, highlights: Array.isArray(p.highlights) ? p.highlights.join('\n') : p.highlights });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    const payload = {
      ...form,
      highlights: form.highlights.split('\n').map(h => h.trim()).filter(Boolean),
      order: Number(form.order) || 0,
    };
    try {
      if (editId) {
        await api.updateWebsiteProgram(editId, payload);
        toast.success('Course updated');
      } else {
        await api.createWebsiteProgram(payload);
        toast.success('Course added');
      }
      setShowForm(false);
      fetchPrograms();
    } catch { toast.error('Failed to save course'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await api.deleteWebsiteProgram(id);
      toast.success('Deleted');
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleImportDefaults = async () => {
    if (!window.confirm(`Import all ${DEFAULT_PROGRAMS.length} default STEMXplore courses? They will be added to the existing list.`)) return;
    setImporting(true);
    let added = 0;
    for (const prog of DEFAULT_PROGRAMS) {
      try {
        await api.createWebsiteProgram(prog);
        added++;
      } catch { /* skip failed */ }
    }
    toast.success(`Imported ${added} course${added !== 1 ? 's' : ''}`);
    setImporting(false);
    fetchPrograms();
  };

  return (
    <div className="space-y-6">
      <style>{COURSE_CARD_STYLES}</style>

      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-slate-500">{programs.length} course(s) in database — shown on the STEMXplore website when at least one exists.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportDefaults} disabled={importing}>
            <Download size={16} className="mr-1" />
            {importing ? 'Importing…' : 'Import Defaults'}
          </Button>
          <Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Course</Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{editId ? 'Edit Course' : 'New Course'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Lego Robotics" />
            </div>
            <div className="space-y-1">
              <Label>Badge</Label>
              <Input value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} placeholder="e.g. Beginner · Ages 5+" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short course description" />
            </div>
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Accent Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-9 w-12 rounded border border-slate-300 cursor-pointer p-0.5" />
                <Input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="flex-1" placeholder="#1a5fa8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Highlights (one per line)</Label>
              <Textarea rows={3} value={form.highlights} onChange={e => setForm(p => ({ ...p, highlights: e.target.value }))} placeholder={"LEGO bricks & sensors\nBlock-based programming\n24 hrs · Beginner"} />
            </div>
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} placeholder="0" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add Course'}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium mb-1">No courses yet</p>
          <p className="text-slate-400 text-sm mb-4">The website shows its built-in defaults until you add at least one here.</p>
          <Button variant="outline" onClick={handleImportDefaults} disabled={importing}>
            <Download size={16} className="mr-1" />
            {importing ? 'Importing…' : 'Import STEMXplore Defaults'}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
          {programs.map(p => (
            <div
              key={p.id}
              className="course-admin-card"
              style={{
                '--card-accent': p.color,
                '--card-shadow': hexAlpha(p.color || '#1a5fa8', 0.15),
                '--card-border': hexAlpha(p.color || '#1a5fa8', 0.4),
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden', flexShrink: 0 }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="ca-img" />
                ) : (
                  <div className="ca-img" style={{ background: hexAlpha(p.color || '#1a5fa8', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={32} style={{ color: p.color || '#1a5fa8', opacity: 0.5 }} />
                  </div>
                )}
                {p.badge && (
                  <span style={{
                    position: 'absolute', bottom: 10, left: 12,
                    fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px',
                    background: 'rgba(255,255,255,0.9)', color: p.color,
                    borderRadius: 100, border: `1px solid ${hexAlpha(p.color || '#1a5fa8', 0.4)}`,
                    backdropFilter: 'blur(6px)',
                  }}>
                    {p.badge}
                  </span>
                )}
                {/* Edit / Delete overlay */}
                <div className="ca-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => openEdit(p)}
                    style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Edit2 size={13} style={{ color: '#475569' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={13} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{p.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.65, marginBottom: 14, flex: 1 }}>{p.description}</p>
                {p.highlights?.length > 0 && (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.highlights.map(h => (
                      <li key={h} style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ color: p.color, fontWeight: 700 }}>✓</span> {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats Tab ─────────────────────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await api.getWebsiteStats();
      setStats(res.data);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const startEdit = (s) => { setEditingId(s.id); setEditBuf({ ...s }); };
  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };

  const saveEdit = async () => {
    const updated = stats.map(s => s.id === editingId ? { ...editBuf, value: Number(editBuf.value) } : s);
    setSaving(true);
    try {
      await api.updateWebsiteStats(updated);
      setStats(updated);
      setEditingId(null);
      toast.success('Stat updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const addStat = () => {
    const newStat = { id: `stat-${Date.now()}`, value: 0, suffix: '+', label: 'New Stat' };
    setStats(prev => [...prev, newStat]);
    startEdit(newStat);
  };

  const removeStat = async (id) => {
    const updated = stats.filter(s => s.id !== id);
    setSaving(true);
    try {
      await api.updateWebsiteStats(updated);
      setStats(updated);
      toast.success('Stat removed');
    } catch { toast.error('Failed to remove'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">These numbers appear in the stats section of the STEMXplore website.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
            {editingId === s.id ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input type="number" value={editBuf.value} onChange={e => setEditBuf(p => ({ ...p, value: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Suffix</Label>
                  <Input value={editBuf.suffix} onChange={e => setEditBuf(p => ({ ...p, suffix: e.target.value }))} placeholder="+ or  Age Groups" />
                </div>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={editBuf.label} onChange={e => setEditBuf(p => ({ ...p, label: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-black text-primary mb-1">{s.value}{s.suffix}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => startEdit(s)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => removeStat(s.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        <button onClick={addStat} className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary hover:text-primary transition-colors min-h-[120px]">
          <Plus size={24} />
          <span className="text-sm font-medium">Add Stat</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WebsiteManager() {
  const [activeTab, setActiveTab] = useState('Gallery');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Website Manager</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage gallery, courses, and stats displayed on the STEMXplore public website.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Gallery' && <Image size={15} />}
              {tab === 'Courses' && <BookOpen size={15} />}
              {tab === 'Stats' && <BarChart2 size={15} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Gallery' && <GalleryTab />}
        {activeTab === 'Courses' && <CoursesTab />}
        {activeTab === 'Stats' && <StatsTab />}
      </div>
    </DashboardLayout>
  );
}
