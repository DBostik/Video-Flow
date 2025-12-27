import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragOverEvent,
  DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Layout, 
  Clapperboard, 
  Shield, 
  Users, 
  CheckCircle2, 
  Circle, 
  Plus, 
  X, 
  Trash2, 
  Calendar, 
  Tag, 
  AlignLeft, 
  CheckSquare, 
  Search, 
  Image as ImageIcon, 
  Type,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getTagColor(tag: string) {
  const colors = [
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// --- TYPES ---
type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  tags: string[];
  subtasks: Subtask[];
  scriptLink?: string;
  footageLink?: string;
  thumbnailALink?: string;
  thumbnailBLink?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  hasOutline: boolean;
  hasScript: boolean;
};

type ColumnType = {
  id: string;
  title: string;
  tasks: Task[];
};

// --- CONSTANTS ---
const DEFAULT_SUBTASKS = [
  "Finalize Script",
  "Create Thumbnails",
  "Create Titles",
  "Create Description",
  "Record Video",
  "Trim/Edit Draft",
  "Publish To YouTube"
];

const DEFAULT_COLUMNS: ColumnType[] = [
  { id: 'Ideation', title: 'Ideation', tasks: [] },
  { id: 'Scripting', title: 'Scripting', tasks: [] },
  { id: 'Filming', title: 'Filming', tasks: [] },
  { id: 'Editing', title: 'Editing', tasks: [] },
  { id: 'Upload', title: 'Ready to Upload', tasks: [] }
];

// --- COMPONENTS ---

// 1. The Draggable Card
const SortableTaskCard = ({ task, onClick, onToggleQuickCheck }: { task: Task; onClick: (t: Task) => void, onToggleQuickCheck: (id: string, field: 'hasOutline' | 'hasScript') => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500 opacity-40 h-[220px] rounded-xl"
      />
    );
  }

  const handleQuickCheck = (e: React.MouseEvent, field: 'hasOutline' | 'hasScript') => {
    e.stopPropagation();
    onToggleQuickCheck(task.id, field);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative touch-manipulation"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-1">
          {task.tags.length > 0 ? task.tags.map(tag => (
            <span key={tag} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide border", getTagColor(tag))}>
              {tag}
            </span>
          )) : <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">NO TAGS</span>}
        </div>
      </div>
      
      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-3 leading-snug">{task.title}</h3>
      
      <div className="space-y-1.5 mb-4">
        <div 
          onClick={(e) => handleQuickCheck(e, 'hasOutline')}
          className={cn("flex items-center gap-2 text-xs font-medium p-1.5 rounded-md transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700", task.hasOutline ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}
        >
           {task.hasOutline ? <CheckCircle2 size={12} /> : <Circle size={12} />} Outline
        </div>
        <div 
          onClick={(e) => handleQuickCheck(e, 'hasScript')}
          className={cn("flex items-center gap-2 text-xs font-medium p-1.5 rounded-md transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700", task.hasScript ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}
        >
           {task.hasScript ? <CheckCircle2 size={12} /> : <Circle size={12} />} Script Draft
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
        {task.dueDate ? (
           <div className={cn("flex items-center gap-1.5 text-xs font-medium", new Date(task.dueDate) < new Date() ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
             <Calendar size={12} className={new Date(task.dueDate) < new Date() ? "text-red-500 dark:text-red-400" : "text-indigo-500 dark:text-indigo-400"}/> 
             Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
           </div>
        ) : <span className="text-[10px] text-slate-300 dark:text-slate-600">No Due Date</span>}

        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
           <CheckSquare size={12} /> {task.subtasks.filter(t => t.completed).length}/{task.subtasks.length}
        </div>
      </div>
    </div>
  );
};

// 2. The Column (Optimized for Snap)
const KanbanColumn = ({ column, onAddTask, onEditTask, onToggleQuickCheck }: { column: ColumnType, onAddTask: () => void, onEditTask: (t: Task) => void, onToggleQuickCheck: (id: string, field: 'hasOutline' | 'hasScript') => void }) => {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  return (
    <div className="flex flex-col min-w-[85vw] md:min-w-[320px] max-w-[85vw] md:max-w-[320px] h-full snap-center shrink-0">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
           <h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{column.title}</h2>
           <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{column.tasks.length}</span>
        </div>
        {column.id === 'Ideation' && (
          <button onClick={onAddTask} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 dark:text-slate-400">
            <Plus size={16} />
          </button>
        )}
      </div>

      <div ref={setNodeRef} className="flex-1 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3 overflow-y-auto">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={onEditTask} onToggleQuickCheck={onToggleQuickCheck} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-medium">
                Empty
            </div>
        )}
      </div>
    </div>
  );
};

// 3. Edit/Create Modal
const TaskModal = ({ task, isOpen, onClose, onSave, onDelete }: { task: Task | null, isOpen: boolean, onClose: () => void, onSave: (t: Task) => void, onDelete: (id: string) => void }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Task>(task || {
    id: crypto.randomUUID(),
    title: '', description: '', dueDate: '', tags: [],
    subtasks: [], hasOutline: false, hasScript: false,
    scriptLink: '', footageLink: '', thumbnailALink: '', thumbnailBLink: '', youtubeTitle: '', youtubeDescription: ''
  });

  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      setFormData({
        id: crypto.randomUUID(), title: '', description: '', dueDate: '', tags: [],
        subtasks: DEFAULT_SUBTASKS.map(title => ({ id: crypto.randomUUID(), title, completed: false })),
        hasOutline: false, hasScript: false, scriptLink: '', footageLink: '', thumbnailALink: '', thumbnailBLink: '', youtubeTitle: '', youtubeDescription: ''
      });
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); onClose(); };
  const addTag = () => { if (newTag.trim() && !formData.tags.includes(newTag.trim())) { setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] }); setNewTag(''); } };
  const addSubtask = () => { if (newSubtask.trim()) { setFormData({ ...formData, subtasks: [...formData.subtasks, { id: crypto.randomUUID(), title: newSubtask.trim(), completed: false }] }); setNewSubtask(''); } };
  const toggleSubtask = (id: string) => { setFormData({ ...formData, subtasks: formData.subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st) }); };
  const deleteSubtask = (id: string) => { setFormData({ ...formData, subtasks: formData.subtasks.filter(st => st.id !== id) }); };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white dark:bg-slate-900 md:rounded-xl w-full max-w-4xl h-[100dvh] md:h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border-none md:border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
           <div className="flex-1 mr-4">
              <input 
                autoFocus
                className="w-full text-xl md:text-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none bg-transparent"
                placeholder="Project Title..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <div className="flex items-center gap-4 mt-2 overflow-x-auto no-scrollbar">
                 <div className="flex items-center gap-2 whitespace-nowrap">
                    <Tag size={12} className="text-slate-400" />
                    {formData.tags.map(tag => (
                      <span key={tag} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border", getTagColor(tag))}>
                        {tag} <button onClick={() => setFormData({...formData, tags: formData.tags.filter(t => t !== tag)})}>&times;</button>
                      </span>
                    ))}
                    <input 
                      className="bg-transparent text-[10px] w-20 outline-none py-0.5 border-b border-transparent focus:border-indigo-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-600 dark:text-slate-400" 
                      placeholder="+ Add Tag"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag()}
                    />
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* LEFT COLUMN */}
             <div className="md:col-span-2 space-y-6 order-2 md:order-1">
                <div>
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      <AlignLeft size={16} /> Notes & Ideas
                   </div>
                   <textarea 
                      className="w-full min-h-[100px] text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                      placeholder="Brainstorming, hooks, and rough notes..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                   <div className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 mb-3">
                      <Type size={16} /> YouTube Metadata
                   </div>
                   <div className="space-y-3">
                      <input 
                        className="w-full text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        placeholder="Final YouTube Title..."
                        value={formData.youtubeTitle || ''}
                        onChange={e => setFormData({...formData, youtubeTitle: e.target.value})}
                      />
                      <textarea 
                        className="w-full min-h-[80px] text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                        placeholder="YouTube Description (Links, timestamps, etc)..."
                        value={formData.youtubeDescription || ''}
                        onChange={e => setFormData({...formData, youtubeDescription: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      <CheckSquare size={16} /> Production Checklist
                   </div>
                   <div className="space-y-2 mb-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      {formData.subtasks.map(st => (
                        <div key={st.id} className="group flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-md transition-all">
                           <button onClick={() => toggleSubtask(st.id)} className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0", st.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-950")}>
                              {st.completed && <CheckCircle2 size={12} />}
                           </button>
                           <span className={cn("flex-1 text-sm font-medium", st.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300")}>{st.title}</span>
                           <button onClick={() => deleteSubtask(st.id)} className="opacity-100 md:opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <Plus size={16} className="text-slate-400" />
                        <input className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent text-slate-700 dark:text-slate-300" placeholder="Add a step..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
                     </div>
                   </div>
                </div>
             </div>

             {/* RIGHT COLUMN */}
             <div className="space-y-6 order-1 md:order-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Due Date</label>
                   <input type="date" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-sm text-slate-600 dark:text-slate-300 outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><ImageIcon size={12}/> Thumbnails</label>
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Thumbnail A Link..." value={formData.thumbnailALink || ''} onChange={e => setFormData({...formData, thumbnailALink: e.target.value})} />
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Thumbnail B Link..." value={formData.thumbnailBLink || ''} onChange={e => setFormData({...formData, thumbnailBLink: e.target.value})} />
                   <div className="flex gap-2">
                     {formData.thumbnailALink && <a href={formData.thumbnailALink} target="_blank" className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] text-center py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">View A</a>}
                     {formData.thumbnailBLink && <a href={formData.thumbnailBLink} target="_blank" className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] text-center py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">View B</a>}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase">Production Files</label>
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Google Doc URL..." value={formData.scriptLink || ''} onChange={e => setFormData({...formData, scriptLink: e.target.value})} />
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Footage Folder URL..." value={formData.footageLink || ''} onChange={e => setFormData({...formData, footageLink: e.target.value})} />
                   <div className="flex gap-2 pt-1">
                      {formData.scriptLink && <a href={formData.scriptLink} target="_blank" className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs text-center py-1.5 rounded font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/60">Open Script</a>}
                      {formData.footageLink && <a href={formData.footageLink} target="_blank" className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs text-center py-1.5 rounded font-bold hover:bg-slate-300 dark:hover:bg-slate-600">Open Footage</a>}
                   </div>
                </div>

                <div className="space-y-2">
                   <div onClick={() => setFormData({...formData, hasOutline: !formData.hasOutline})} className={cn("flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs font-medium transition-all", formData.hasOutline ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                      {formData.hasOutline ? <CheckCircle2 size={14} /> : <Circle size={14} />} Outline Done
                   </div>
                   <div onClick={() => setFormData({...formData, hasScript: !formData.hasScript})} className={cn("flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs font-medium transition-all", formData.hasScript ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                      {formData.hasScript ? <CheckCircle2 size={14} /> : <Circle size={14} />} Script Done
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center pb-8 md:pb-4">
            {task ? (
               <button onClick={() => { if(confirm("Delete task?")) onDelete(task.id); onClose(); }} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
            ) : <div />}
            <div className="flex gap-3">
               <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
               <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-200 dark:shadow-none transition-all">Save</button>
            </div>
        </div>
      </div>
    </div>
  );
};


// --- MAIN APP ---
const App = () => {
  const [columns, setColumns] = useState<ColumnType[]>(() => {
    const saved = localStorage.getItem('vidtracker-data-v5');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vidtracker-theme') === 'dark' || 
             (!localStorage.getItem('vidtracker-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'creator' | 'editor'>('creator');
  const [searchQuery, setSearchQuery] = useState('');

  // LocalStorage & Theme Effects
  useEffect(() => { localStorage.setItem('vidtracker-data-v5', JSON.stringify(columns)); }, [columns]);
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vidtracker-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vidtracker-theme', 'light');
    }
  }, [darkMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSaveTask = (updatedTask: Task) => {
    let newColumns = [...columns];
    const exists = newColumns.some(col => col.tasks.some(t => t.id === updatedTask.id));
    const scriptDone = updatedTask.subtasks.find(s => s.title === "Finalize Script")?.completed;
    const recordDone = updatedTask.subtasks.find(s => s.title === "Record Video")?.completed;

    let targetColId = null;
    const currentCol = newColumns.find(c => c.tasks.some(t => t.id === updatedTask.id));
    
    if (scriptDone && (!currentCol || currentCol.id === 'Ideation' || currentCol.id === 'Scripting')) targetColId = 'Filming';
    if (recordDone && (!currentCol || currentCol.id === 'Filming' || currentCol.id === 'Scripting' || currentCol.id === 'Ideation')) targetColId = 'Editing';

    if (exists) {
      newColumns = newColumns.map(col => {
         if (targetColId && col.id !== targetColId && col.tasks.some(t => t.id === updatedTask.id)) return { ...col, tasks: col.tasks.filter(t => t.id !== updatedTask.id) };
         if (!targetColId && col.tasks.some(t => t.id === updatedTask.id)) return { ...col, tasks: col.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) };
         if (targetColId && col.id === targetColId) return { ...col, tasks: [...col.tasks, updatedTask] };
         return col;
      });
    } else {
      newColumns = newColumns.map(col => col.id === 'Ideation' ? { ...col, tasks: [updatedTask, ...col.tasks] } : col);
    }
    setColumns(newColumns);
  };

  const handleDeleteTask = (taskId: string) => { setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== taskId) }))); };
  const handleToggleQuickCheck = (taskId: string, field: 'hasOutline' | 'hasScript') => { setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.map(t => t.id === taskId ? { ...t, [field]: !t[field] } : t) }))); };
  const openNewTaskModal = () => { setEditingTask(null); setIsModalOpen(true); };
  const openEditTaskModal = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };

  function findColumn(id: string | undefined) { if (!id) return null; return columns.find(c => c.id === id || c.tasks.some(t => t.id === id)); }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    const activeColumn = findColumn(activeId as string);
    const overColumn = findColumn(overId as string);
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setColumns((prev) => {
      const activeItems = activeColumn.tasks;
      const overItems = overColumn.tasks;
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      const overIndex = overItems.findIndex((t) => t.id === overId);
      let newIndex;
      if (overItems.some(t => t.id === overId)) {
        newIndex = overIndex >= 0 ? overIndex + (activeId < overId ? 1 : 0) : overItems.length + 1;
      } else {
        newIndex = overItems.length + 1;
      }
      return prev.map((c) => {
        if (c.id === activeColumn.id) return { ...c, tasks: activeItems.filter((t) => t.id !== activeId) };
        if (c.id === overColumn.id) return { ...c, tasks: [...overItems.slice(0, newIndex), activeItems[activeIndex], ...overItems.slice(newIndex, overItems.length)] };
        return c;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);
    if (!activeColumn || !overColumn) return;
    if (activeColumn.id === overColumn.id) {
        const oldIndex = activeColumn.tasks.findIndex(t => t.id === activeId);
        const newIndex = activeColumn.tasks.findIndex(t => t.id === overId); 
        if (oldIndex !== newIndex) setColumns(prev => prev.map(col => col.id === activeColumn.id ? { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) } : col));
    }
  };

  const filteredColumns = columns.filter(col => {
    if (viewMode === 'editor' && col.id === 'Ideation') return false;
    return true;
  }).map(col => ({
    ...col,
    tasks: col.tasks.filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    })
  }));

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* HEADER (Redesigned for Mobile) */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-50 shadow-sm transition-colors duration-200">
        <div className="flex flex-col gap-4 max-w-[100vw] overflow-hidden">
          
          {/* Top Row: Logo & Mobile Dark Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                <Clapperboard size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">VidTracker</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pipeline v5.3</p>
              </div>
            </div>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-yellow-400"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          {/* Middle Row: Search (Full Width on Mobile) */}
          <div className="relative group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-200 transition-all"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Bottom Row: Controls (Scrollable on small screens) */}
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar pb-1 gap-2">
             <div className="flex items-center gap-2">
                {viewMode === 'creator' && (
                  <button onClick={openNewTaskModal} className="whitespace-nowrap flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all">
                    <Plus size={16} /> New Project
                  </button>
                )}
             </div>

             <div className="flex items-center gap-2">
                {/* Desktop Dark Toggle */}
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="hidden md:block p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setViewMode('creator')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap", viewMode === 'creator' ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}>
                        <Layout size={16} /> Creator
                    </button>
                    <button onClick={() => setViewMode('editor')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap", viewMode === 'editor' ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}>
                        <Shield size={16} /> Editor
                    </button>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* BOARD (Snap Scrolling) */}
      <main className="flex-1 overflow-hidden w-full">
        <div className="h-full w-full overflow-x-auto snap-x snap-mandatory flex gap-4 p-4 md:p-6 md:snap-none">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragStart={(e) => setActiveTask(e.active.data.current?.task)}>
                {filteredColumns.map(col => (
                    <KanbanColumn key={col.id} column={col} onAddTask={openNewTaskModal} onEditTask={openEditTaskModal} onToggleQuickCheck={handleToggleQuickCheck} />
                ))}
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? <SortableTaskCard task={activeTask} onClick={() => {}} onToggleQuickCheck={() => {}} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2 px-6 text-xs text-slate-400 dark:text-slate-500 flex justify-between">
         <span>VidTracker Mobile</span>
         <span className="flex items-center gap-1"><Users size={12}/> {viewMode}</span>
      </footer>

      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSaveTask} onDelete={handleDeleteTask} />
    </div>
  );
};

export default App;