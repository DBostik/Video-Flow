import React, { useState, useEffect, useRef } from 'react';
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
  Layout, Clapperboard, Shield, Users, CheckCircle2, Circle, Plus, X, Trash2, 
  Calendar, Tag, AlignLeft, CheckSquare, Search, Image as ImageIcon, Type, 
  Sun, Moon, LogIn, LogOut, WifiOff, Settings, UserPlus, FileVideo, MessageSquare,
  Eye, EyeOff, ListChecks, PlayCircle, AlertCircle, Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- FIREBASE IMPORTS ---
import { db, auth, googleProvider } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';

// --- CONFIG ---
const DEV_MODE = true; // Set to false for production

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getTagColor(tag: string) {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// --- TYPES ---
type Subtask = { id: string; title: string; completed: boolean; };
type Revision = { id: string; text: string; completed: boolean; };

type Task = {
  id: string; title: string; description: string; dueDate: string; tags: string[];
  subtasks: Subtask[]; 
  revisions: Revision[]; 
  scriptLink?: string; footageLink?: string; draftLink?: string; 
  thumbnailALink?: string; thumbnailBLink?: string; 
  youtubeTitle?: string; youtubeDescription?: string;
  hasOutline: boolean; hasScript: boolean;
};

type ColumnType = { id: string; title: string; tasks: Task[]; };
type SimpleUser = { email: string; uid: string; };

type SettingsData = {
  showPublished: boolean;
  defaultSubtasks: string[];
  allowedUsers: string[];
};

// --- CONSTANTS ---
const DEFAULT_SUBTASKS_LIST = ["📝 Finalize Script", "🎨 Create Thumbnails", "🎬 Create Titles", "📄 Create Description", "🎥 Record Video", "✂️ Trim/Edit Draft", "🚀 Publish To YouTube"];

const DEFAULT_COLUMNS: ColumnType[] = [
  { id: 'Ideation', title: 'Ideation', tasks: [] },
  { id: 'Scripting', title: 'Scripting', tasks: [] },
  { id: 'Filming', title: 'Filming', tasks: [] },
  { id: 'Editing', title: 'Editing', tasks: [] },
  { id: 'Review', title: 'In Review', tasks: [] },
  { id: 'Upload', title: 'Ready to Upload', tasks: [] },
  { id: 'Published', title: 'Published', tasks: [] }
];

// --- COMPONENTS ---

const SortableTaskCard = ({ task, onClick, onToggleQuickCheck }: { task: Task; onClick: (t: Task) => void, onToggleQuickCheck: (id: string, field: 'hasOutline' | 'hasScript') => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task } });
  const style = { transform: CSS.Translate.toString(transform), transition };
  
  if (isDragging) return <div ref={setNodeRef} style={style} className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500 opacity-40 h-[200px] rounded-xl" />;
  
  const handleQuickCheck = (e: React.MouseEvent, field: 'hasOutline' | 'hasScript') => { e.stopPropagation(); onToggleQuickCheck(task.id, field); };
  
  const openRevisions = task.revisions ? task.revisions.filter(r => !r.completed).length : 0;
  const completedSubtasks = task.subtasks.filter(t => t.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  
  // Due Soon Logic (within 3 days)
  const isDueSoon = task.dueDate && new Date(task.dueDate) > new Date() && (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 3;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onClick(task)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative touch-manipulation flex flex-col gap-3">
      
      {/* Header: Tags & Priority */}
      <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {task.tags.length > 0 ? task.tags.map(tag => (<span key={tag} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border", getTagColor(tag))}>{tag}</span>)) : null}
          </div>
          {isOverdue ? (
             <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800"><AlertCircle size={10}/> OVERDUE</span>
          ) : isDueSoon ? (
             <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800"><Clock size={10}/> DUE SOON</span>
          ) : null}
      </div>

      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{task.title}</h3>
      
      {openRevisions > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded border border-amber-100 dark:border-amber-800 font-bold">
            <MessageSquare size={12} className="fill-amber-600 dark:fill-amber-400" /> {openRevisions} Revision{openRevisions > 1 ? 's' : ''} Needed
        </div>
      )}

      {/* Quick Actions (Outline/Script) */}
      <div className="flex gap-2">
        <div onClick={(e) => handleQuickCheck(e, 'hasOutline')} className={cn("flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold py-1 px-2 rounded transition-colors cursor-pointer border", task.hasOutline ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" : "text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700")}>{task.hasOutline ? <CheckCircle2 size={10} /> : <Circle size={10} />} Outline</div>
        <div onClick={(e) => handleQuickCheck(e, 'hasScript')} className={cn("flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold py-1 px-2 rounded transition-colors cursor-pointer border", task.hasScript ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" : "text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700")}>{task.hasScript ? <CheckCircle2 size={10} /> : <Circle size={10} />} Script</div>
      </div>

      {/* Footer: Date & Progress Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
             {task.dueDate ? (
                 <div className={cn("flex items-center gap-1.5 text-xs font-medium", isOverdue ? "text-red-500" : "text-slate-400 dark:text-slate-500")}>
                    <Calendar size={12}/> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                 </div>
             ) : <span className="text-[10px] text-slate-300">No Date</span>}
             {totalSubtasks > 0 && <span className="text-[10px] font-bold text-slate-400">{Math.round(progressPercent)}%</span>}
          </div>
          {totalSubtasks > 0 && (
             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
             </div>
          )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, onAddTask, onEditTask, onToggleQuickCheck }: { column: ColumnType, onAddTask: () => void, onEditTask: (t: Task) => void, onToggleQuickCheck: (id: string, field: 'hasOutline' | 'hasScript') => void }) => {
  const { setNodeRef } = useSortable({ id: column.id, data: { type: 'Column', column } });
  return (
    <div className="flex flex-col min-w-[280px] xl:min-w-0 xl:flex-1 h-full snap-center shrink-0">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2"><h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{column.title}</h2><span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{column.tasks.length}</span></div>
        {column.id === 'Ideation' && (<button onClick={onAddTask} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 dark:text-slate-400"><Plus size={16} /></button>)}
      </div>
      <div ref={setNodeRef} className="flex-1 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>{column.tasks.map((task) => (<SortableTaskCard key={task.id} task={task} onClick={onEditTask} onToggleQuickCheck={onToggleQuickCheck} />))}</SortableContext>
        {column.tasks.length === 0 && (<div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-medium">Empty</div>)}
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, user, boardId, settings, onUpdateSettings, darkMode, setDarkMode, onLogout }: { isOpen: boolean, onClose: () => void, user: SimpleUser | null, boardId: string | null, settings: SettingsData, onUpdateSettings: (s: Partial<SettingsData>) => void, darkMode: boolean, setDarkMode: (v: boolean) => void, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'workflow'>('general');
  const [emailInput, setEmailInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  
  if (!isOpen || !user) return null;

  const handleAddUser = async () => {
    if (!emailInput.includes('@')) return;
    onUpdateSettings({ allowedUsers: [...settings.allowedUsers, emailInput.trim()] });
    setEmailInput('');
  };

  const handleRemoveUser = async (email: string) => {
    if (confirm(`Remove ${email}?`)) {
       onUpdateSettings({ allowedUsers: settings.allowedUsers.filter(u => u !== email) });
    }
  };

  const handleAddDefaultTask = () => {
      if(taskInput.trim()) {
          onUpdateSettings({ defaultSubtasks: [...settings.defaultSubtasks, taskInput.trim()] });
          setTaskInput('');
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl h-[600px] shadow-2xl flex overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Sidebar */}
        <div className="w-48 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Settings</h2>
            <button onClick={() => setActiveTab('general')} className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'general' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900")}>
                <Settings size={16}/> General
            </button>
            <button onClick={() => setActiveTab('team')} className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'team' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900")}>
                <Users size={16}/> Team Access
            </button>
            <button onClick={() => setActiveTab('workflow')} className={cn("text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'workflow' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900")}>
                <ListChecks size={16}/> Defaults
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">General Settings</h2>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Dark Mode</h3>
                            <p className="text-xs text-slate-500">Toggle application theme</p>
                        </div>
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Show Published Column</h3>
                            <p className="text-xs text-slate-500">Keep completed videos visible.</p>
                        </div>
                        <button 
                           onClick={() => onUpdateSettings({ showPublished: !settings.showPublished })}
                           className={cn("w-12 h-6 rounded-full transition-colors relative", settings.showPublished ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700")}
                        >
                            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", settings.showPublished ? "left-7" : "left-1")} />
                        </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                         <button onClick={onLogout} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-2"><LogOut size={16}/> Sign Out</button>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Team Management</h2>
                    <div className="mb-6"><label className="text-xs font-bold text-slate-400 uppercase block mb-2">Invite Editor (By Email)</label><div className="flex gap-2"><input className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-200" placeholder="editor@gmail.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} /><button onClick={handleAddUser} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm"><UserPlus size={18}/></button></div></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase block mb-2">Active Users</label><div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg max-h-[300px] overflow-y-auto">{settings.allowedUsers.length === 0 ? (<div className="p-4 text-center text-slate-400 text-xs">No users invited yet.</div>) : (settings.allowedUsers.map(email => (<div key={email} className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800 last:border-0"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{email}</span><button onClick={() => handleRemoveUser(email)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button></div>)))}</div></div>
                </div>
            )}

            {activeTab === 'workflow' && (
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Default Checklist</h2>
                    <p className="text-sm text-slate-500 mb-4">Every new project will start with these steps.</p>
                    <div className="flex gap-2 mb-4">
                        <input className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Add default step..." value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDefaultTask()} />
                        <button onClick={handleAddDefaultTask} className="bg-slate-200 dark:bg-slate-800 px-3 rounded-lg"><Plus size={18}/></button>
                    </div>
                    <div className="space-y-2">
                        {settings.defaultSubtasks.map((task, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                                <span className="text-sm">{task}</span>
                                <button onClick={() => onUpdateSettings({ defaultSubtasks: settings.defaultSubtasks.filter(t => t !== task) })} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const TaskModal = ({ task, isOpen, onClose, onSave, onDelete, columnId }: { task: Task | null, isOpen: boolean, onClose: () => void, onSave: (t: Task) => void, onDelete: (id: string) => void, columnId: string | undefined }) => {
  const [formData, setFormData] = useState<Task>(task || {
    id: generateId(),
    title: '', description: '', dueDate: '', tags: [],
    subtasks: [], revisions: [], hasOutline: false, hasScript: false,
    scriptLink: '', footageLink: '', draftLink: '', thumbnailALink: '', thumbnailBLink: '', youtubeTitle: '', youtubeDescription: ''
  });

  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newRevision, setNewRevision] = useState('');

  const isEditorPhase = ['Editing', 'Review', 'Upload', 'Published'].includes(columnId || '');

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else if (isOpen) {
      setFormData({
        id: generateId(), 
        title: '', description: '', dueDate: '', tags: [],
        subtasks: DEFAULT_SUBTASKS_LIST.map(title => ({ id: generateId(), title, completed: false })),
        revisions: [],
        hasOutline: false, hasScript: false, scriptLink: '', footageLink: '', draftLink: '', thumbnailALink: '', thumbnailBLink: '', youtubeTitle: '', youtubeDescription: ''
      });
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); onClose(); };
  const addTag = () => { if (newTag.trim() && !formData.tags.includes(newTag.trim())) { setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] }); setNewTag(''); } };
  const addSubtask = () => { if (newSubtask.trim()) { setFormData({ ...formData, subtasks: [...formData.subtasks, { id: generateId(), title: newSubtask.trim(), completed: false }] }); setNewSubtask(''); } };
  const toggleSubtask = (id: string) => { setFormData({ ...formData, subtasks: formData.subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st) }); };
  const deleteSubtask = (id: string) => { setFormData({ ...formData, subtasks: formData.subtasks.filter(st => st.id !== id) }); };

  const addRevision = () => { if(newRevision.trim()) { setFormData({ ...formData, revisions: [...(formData.revisions || []), { id: generateId(), text: newRevision.trim(), completed: false }] }); setNewRevision(''); } };
  const toggleRevision = (id: string) => { setFormData({ ...formData, revisions: formData.revisions.map(r => r.id === id ? { ...r, completed: !r.completed } : r) }); };
  const deleteRevision = (id: string) => { setFormData({ ...formData, revisions: formData.revisions.filter(r => r.id !== id) }); };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white dark:bg-slate-900 md:rounded-xl w-full max-w-4xl h-[100dvh] md:h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border-none md:border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-start p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
           <div className="flex-1 mr-4">
              <input 
                autoFocus
                className="w-full text-xl md:text-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none bg-transparent mb-2"
                placeholder="Project Title..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                 <div className="flex items-center gap-2 whitespace-nowrap">
                    <Tag size={12} className="text-slate-400" />
                    {formData.tags.map(tag => (<span key={tag} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border", getTagColor(tag))}>{tag} <button onClick={() => setFormData({...formData, tags: formData.tags.filter(t => t !== tag)})}>&times;</button></span>))}
                    <input className="bg-transparent text-[10px] w-20 outline-none py-0.5 border-b border-transparent focus:border-indigo-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-600 dark:text-slate-400" placeholder="+ Add Tag" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             
             {/* LEFT COLUMN */}
             <div className="md:col-span-2 space-y-6 order-2 md:order-1">

                {/* Notes - Moved Up */}
                <div>
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><AlignLeft size={16} /> Notes & Ideas</div>
                   <textarea className="w-full min-h-[100px] text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" placeholder="Brainstorming, hooks, and rough notes..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                {/* --- REVISION CHECKLIST (Only in Editor Phase) --- */}
                {isEditorPhase && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
                            <MessageSquare size={16} /> Requested Revisions
                        </div>
                        <div className="space-y-2 mb-3">
                            {(formData.revisions || []).map(rev => (
                                <div key={rev.id} className="group flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded border border-amber-100 dark:border-amber-900/50">
                                    <button onClick={() => toggleRevision(rev.id)} className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0", rev.completed ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-amber-400 bg-white dark:bg-slate-950")}>{rev.completed && <CheckCircle2 size={12} />}</button>
                                    <span className={cn("flex-1 text-sm font-medium", rev.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300")}>{rev.text}</span>
                                    <button onClick={() => deleteRevision(rev.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Plus size={16} className="text-amber-400" />
                            <input className="flex-1 text-sm outline-none placeholder:text-amber-400/50 bg-transparent text-slate-700 dark:text-slate-200" placeholder="Type revision & hit Enter..." value={newRevision} onChange={e => setNewRevision(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRevision()} />
                        </div>
                    </div>
                )}

                {/* --- STANDARD CHECKLIST --- */}
                {!isEditorPhase && (
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3"><CheckSquare size={16} /> Production Checklist</div>
                        <div className="space-y-2 mb-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                {formData.subtasks.map(st => (
                                    <div key={st.id} className="group flex items-center gap-2 p-1 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded transition-all cursor-pointer" onClick={() => toggleSubtask(st.id)}>
                                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0", st.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950")}>
                                            {st.completed && <CheckCircle2 size={10} />}
                                        </div>
                                        <span className={cn("flex-1 text-xs font-medium truncate", st.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300")}>{st.title}</span>
                                        <button onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                <Plus size={14} className="text-slate-400" />
                                <input className="flex-1 text-xs outline-none placeholder:text-slate-400 bg-transparent text-slate-700 dark:text-slate-300" placeholder="Add a step..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Posting Details - Redesigned */}
                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-slate-800 relative group">
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-4"><Type size={16} /> Posting Details</div>
                   <div className="space-y-4">
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Final Title</label>
                          <input className="w-full text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Enter the optimized YouTube title..." value={formData.youtubeTitle || ''} onChange={e => setFormData({...formData, youtubeTitle: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Description & Timestamps</label>
                          <textarea className="w-full min-h-[120px] text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" placeholder="Paste your description, links, and chapters here..." value={formData.youtubeDescription || ''} onChange={e => setFormData({...formData, youtubeDescription: e.target.value})} />
                      </div>
                   </div>
                </div>
             </div>

             {/* RIGHT COLUMN */}
             <div className="space-y-6 order-1 md:order-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Due Date</label>
                   <div className="relative group">
                       <input type="date" className="w-full bg-transparent font-medium text-sm text-slate-700 dark:text-slate-200 outline-none h-8 cursor-pointer" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                   </div>
                </div>

                {/* ASSETS */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase">Production Files</label>
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Link to Script..." value={formData.scriptLink || ''} onChange={e => setFormData({...formData, scriptLink: e.target.value})} />
                   <input className={cn("w-full bg-white dark:bg-slate-950 border rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none transition-all", isEditorPhase ? "border-green-400 ring-1 ring-green-400/20" : "border-slate-200 dark:border-slate-700")} placeholder="Link to Raw Footage..." value={formData.footageLink || ''} onChange={e => setFormData({...formData, footageLink: e.target.value})} />
                   
                   {isEditorPhase && (
                       <input className="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Draft Video Link (Frame.io / Drive)..." value={formData.draftLink || ''} onChange={e => setFormData({...formData, draftLink: e.target.value})} />
                   )}

                   <div className="flex gap-2 pt-1 flex-wrap">
                      {formData.scriptLink && <a href={formData.scriptLink} target="_blank" className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs text-center py-1.5 rounded font-bold hover:bg-slate-300 dark:hover:bg-slate-600">Script</a>}
                      {formData.footageLink && <a href={formData.footageLink} target="_blank" className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs text-center py-1.5 rounded font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/60 flex items-center justify-center gap-2"><FileVideo size={14}/> Footage</a>}
                      {formData.draftLink && <a href={formData.draftLink} target="_blank" className="flex-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs text-center py-1.5 rounded font-bold hover:bg-green-200 dark:hover:bg-green-900/60 flex items-center justify-center gap-2"><PlayCircle size={14}/> Draft</a>}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><ImageIcon size={12}/> Thumbnails</label>
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Thumbnail A Link..." value={formData.thumbnailALink || ''} onChange={e => setFormData({...formData, thumbnailALink: e.target.value})} />
                   <input className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Thumbnail B Link..." value={formData.thumbnailBLink || ''} onChange={e => setFormData({...formData, thumbnailBLink: e.target.value})} />
                </div>

                {!isEditorPhase && (
                    <div className="space-y-2">
                    <div onClick={() => setFormData({...formData, hasOutline: !formData.hasOutline})} className={cn("flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs font-medium transition-all", formData.hasOutline ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                        {formData.hasOutline ? <CheckCircle2 size={14} /> : <Circle size={14} />} Outline Done
                    </div>
                    <div onClick={() => setFormData({...formData, hasScript: !formData.hasScript})} className={cn("flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs font-medium transition-all", formData.hasScript ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                        {formData.hasScript ? <CheckCircle2 size={14} /> : <Circle size={14} />} Script Done
                    </div>
                    </div>
                )}
             </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center pb-8 md:pb-4">
            {task ? (<button onClick={() => { if(confirm("Delete task?")) onDelete(task.id); onClose(); }} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>) : <div />}
            <div className="flex gap-3"><button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button><button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-200 dark:shadow-none transition-all">Save</button></div>
        </div>
      </div>
    </div>
  );
};

// --- LOGIN SCREEN ---
const LoginScreen = ({ onLogin, hasError }: { onLogin: () => void, hasError: boolean }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-500/30"><Clapperboard size={32} /></div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Sign in to access your production pipeline.</p>
        {hasError && (<div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300 flex items-center gap-2 text-left"><WifiOff size={16} className="shrink-0" /><span>Firebase could not connect. Check console for details.</span></div>)}
        <button onClick={onLogin} disabled={hasError} className={cn("w-full flex items-center justify-center gap-3 border font-bold py-3 px-4 rounded-xl transition-all", hasError ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200")}><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className={cn("w-5 h-5", hasError && "opacity-50")} alt="Google" /> Sign in with Google</button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnType[]>(DEFAULT_COLUMNS); 
  const [settings, setSettings] = useState<SettingsData>({ showPublished: false, defaultSubtasks: DEFAULT_SUBTASKS_LIST, allowedUsers: [] });
  const [authError, setAuthError] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vidtracker-theme') === 'dark' || (!localStorage.getItem('vidtracker-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return false;
  });

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'creator' | 'editor'>('creator');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. AUTH LISTENER & DEV MODE
  useEffect(() => {
    if (DEV_MODE) {
        // MOCK USER FOR DEV
        setUser({ email: 'dev@admin.com', uid: 'dev-mode-uid' });
        setBoardId('dev-mode-uid');
        setLoading(false);
        return;
    }

    if (!auth) { setAuthError(true); setLoading(false); return; }
    getRedirectResult(auth).catch(() => setAuthError(true));
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email || '';
        setUser({ email, uid: currentUser.uid });
        const q = query(collection(db, "boards"), where("allowedUsers", "array-contains", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
           setBoardId(querySnapshot.docs[0].id);
           setViewMode('editor');
        } else {
           setBoardId(currentUser.uid);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FIRESTORE SYNC
  useEffect(() => {
    if (!user || !db || !boardId) return;
    const unsub = onSnapshot(doc(db, "boards", boardId), (docSnap) => {
       if (docSnap.exists()) {
         const data = docSnap.data();
         setColumns(data.columns || DEFAULT_COLUMNS);
         setSettings({ 
             showPublished: data.settings?.showPublished ?? false,
             defaultSubtasks: data.settings?.defaultSubtasks ?? DEFAULT_SUBTASKS_LIST,
             allowedUsers: data.allowedUsers || [] 
         });
       } else {
         if (boardId === user.uid) {
            setDoc(docSnap.ref, { columns: DEFAULT_COLUMNS, allowedUsers: [], settings: { showPublished: false, defaultSubtasks: DEFAULT_SUBTASKS_LIST } });
         } else {
            setColumns([]); 
         }
       }
    }, (err) => console.warn("Sync error:", err));
    return () => unsub();
  }, [user, boardId]);

  // 3. THEME
  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('vidtracker-theme', 'dark'); } 
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('vidtracker-theme', 'light'); }
  }, [darkMode]);
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const saveBoardToCloud = async (newCols: ColumnType[], newSettings?: SettingsData) => {
     setColumns(newCols);
     if (newSettings) setSettings(newSettings);
     if (user && db && boardId) {
       try { 
           const payload: any = { columns: newCols };
           if (newSettings) {
               payload.settings = { showPublished: newSettings.showPublished, defaultSubtasks: newSettings.defaultSubtasks };
               payload.allowedUsers = newSettings.allowedUsers;
           }
           await setDoc(doc(db, "boards", boardId), payload, { merge: true }); 
       } catch (e) { console.error("Save failed:", e); }
     }
  };

  const handleLogin = async () => { if (!auth) return; try { await signInWithPopup(auth, googleProvider); } catch (e) { try { await signInWithRedirect(auth, googleProvider); } catch(e2) {} } };
  const handleLogout = async () => { if (!auth) return; await signOut(auth); };

  const handleSaveTask = (updatedTask: Task) => {
    let newColumns = [...columns];
    const exists = newColumns.some(col => col.tasks.some(t => t.id === updatedTask.id));
    
    let targetColId = null;
    const currentCol = newColumns.find(c => c.tasks.some(t => t.id === updatedTask.id));
    const newRevisions = updatedTask.revisions.length > (editingTask?.revisions?.length || 0);
    if (newRevisions && currentCol?.id === 'Review') {
        targetColId = 'Editing';
    }

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
    saveBoardToCloud(newColumns);
  };
  
  const handleDeleteTask = (taskId: string) => { saveBoardToCloud(columns.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== taskId) }))); };
  const handleToggleQuickCheck = (taskId: string, field: 'hasOutline' | 'hasScript') => { saveBoardToCloud(columns.map(col => ({ ...col, tasks: col.tasks.map(t => t.id === taskId ? { ...t, [field]: !t[field] } : t) }))); };
  const openNewTaskModal = () => { setEditingTask(null); setIsModalOpen(true); };
  const openEditTaskModal = (task: Task) => { 
      const colId = columns.find(c => c.tasks.some(t => t.id === task.id))?.id;
      setEditingTask({...task});
      setIsModalOpen(true); 
  };
  
  function findColumn(id: string | undefined) { if (!id) return null; return columns.find(c => c.id === id || c.tasks.some(t => t.id === id)); }
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event; if (!over) return;
    const activeId = active.id; const overId = over.id;
    const activeColumn = findColumn(activeId as string); const overColumn = findColumn(overId as string);
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;
    setColumns((prev) => {
      const activeItems = activeColumn.tasks; const overItems = overColumn.tasks;
      const activeIndex = activeItems.findIndex((t) => t.id === activeId); const overIndex = overItems.findIndex((t) => t.id === overId);
      let newIndex = overItems.some(t => t.id === overId) ? (overIndex >= 0 ? overIndex + (activeId < overId ? 1 : 0) : overItems.length + 1) : overItems.length + 1;
      return prev.map((c) => {
        if (c.id === activeColumn.id) return { ...c, tasks: activeItems.filter((t) => t.id !== activeId) };
        if (c.id === overColumn.id) return { ...c, tasks: [...overItems.slice(0, newIndex), activeItems[activeIndex], ...overItems.slice(newIndex, overItems.length)] };
        return c;
      });
    });
  };
  const handleDragEnd = (event: DragEndEvent) => { setActiveTask(null); };
  const columnsRef = useRef(columns); useEffect(() => { columnsRef.current = columns; }, [columns]);
  const handleDragEndWithSave = (event: DragEndEvent) => { handleDragEnd(event); setTimeout(() => { saveBoardToCloud(columnsRef.current); }, 50); };
  
  const filteredColumns = columns.filter(col => {
    if (viewMode === 'editor') return ['Editing', 'Review', 'Upload', 'Published'].includes(col.id);
    if (!settings.showPublished && col.id === 'Published') return false;
    return true; 
  }).map(col => ({ ...col, tasks: col.tasks.filter(t => { if (!searchQuery) return true; const q = searchQuery.toLowerCase(); return t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)); }) }));
  
  const dropAnimation: DropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5', }, }, }), };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">Loading VidTracker...</div>;
  if (!user) return <LoginScreen onLogin={handleLogin} hasError={authError} />;

  const editingTaskColumnId = editingTask ? columns.find(c => c.tasks.some(t => t.id === editingTask.id))?.id : undefined;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-50 shadow-sm transition-colors duration-200 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md"><Clapperboard size={24} /></div><div><h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">VidTracker</h1><p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Synced • {user.email}</p></div></div></div>
        <div className="w-full md:w-auto md:flex-1 md:max-w-md md:mx-6"><div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} /><input className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-200 transition-all" placeholder="Search videos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0">
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex-shrink-0" title="Settings"><Settings size={20} /></button>
           {viewMode === 'creator' && (<button onClick={openNewTaskModal} className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all whitespace-nowrap"><Plus size={16} /> <span className="hidden sm:inline">New Project</span><span className="sm:hidden">New</span></button>)}
            <div className="flex-shrink-0 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewMode('creator')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap", viewMode === 'creator' ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}><Layout size={16} /> <span className="hidden sm:inline">Creator</span></button>
                <button onClick={() => setViewMode('editor')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap", viewMode === 'editor' ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}><Shield size={16} /> <span className="hidden sm:inline">Editor</span></button>
            </div>
        </div>
      </header>
      <main className="flex-1 w-full flex flex-col overflow-hidden"><div className="flex-1 w-full overflow-x-auto xl:overflow-hidden snap-x snap-mandatory flex gap-4 p-4 md:p-6 md:snap-none dark:[color-scheme:dark]"><DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEndWithSave} onDragStart={(e) => setActiveTask(e.active.data.current?.task)}>{filteredColumns.map(col => (<KanbanColumn key={col.id} column={col} onAddTask={openNewTaskModal} onEditTask={openEditTaskModal} onToggleQuickCheck={handleToggleQuickCheck} />))}<DragOverlay dropAnimation={dropAnimation}>{activeTask ? <SortableTaskCard task={activeTask} onClick={() => {}} onToggleQuickCheck={() => {}} /> : null}</DragOverlay></DndContext></div></main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2 px-6 text-xs text-slate-400 dark:text-slate-500 flex justify-between items-center">
         <div className="flex items-center gap-4">
             <span>{boardId === user.uid ? "My Board" : "Shared Board"} • {user.email}</span>
         </div>
         <span className="flex items-center gap-1"><Users size={12}/> {viewMode}</span>
      </footer>
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSaveTask} onDelete={handleDeleteTask} columnId={editingTaskColumnId} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} boardId={boardId} settings={settings} onUpdateSettings={(s) => saveBoardToCloud(columns, { ...settings, ...s })} darkMode={darkMode} setDarkMode={setDarkMode} onLogout={handleLogout} />
    </div>
  );
};

export default App;