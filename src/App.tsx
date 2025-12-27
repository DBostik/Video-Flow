import React, { useState } from 'react';
import { 
  Check, 
  FileText, 
  Folder, 
  Video, 
  UploadCloud, 
  MoreVertical, 
  UserCircle, 
  CheckSquare, 
  Coffee, 
  Clapperboard, 
  Users, 
  Shield, 
  Layout,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// --- TYPES ---

export type Role = 'creator' | 'editor';
export type Stage = 'Ideation' | 'Scripting' | 'Filming' | 'Editing' | 'Published';

export interface Task {
  id: string;
  label: string;
  completed: boolean;
  role: Role;
}

export interface VideoProject {
  id: string;
  title: string;
  stage: Stage;
  driveFolderUrl: string;
  scriptUrl: string;
  thumbnailUrl: string;
  assignedEditor: string;
  description: string;
  tasks: Task[];
}

export const COLUMNS: Stage[] = ['Ideation', 'Scripting', 'Filming', 'Editing', 'Published'];

// --- CONSTANTS & MOCK DATA ---

export const INITIAL_PROJECTS: VideoProject[] = [
  {
    id: 'proj-1',
    title: 'Tech Review: iPhone 16 Pro',
    stage: 'Ideation',
    driveFolderUrl: '#',
    scriptUrl: '#',
    thumbnailUrl: 'https://picsum.photos/400/225?random=1',
    assignedEditor: 'Alex Editor',
    description: 'Deep dive into the camera system and new button features.',
    tasks: [
      { id: 't1', label: 'Outline Key Features', completed: true, role: 'creator' },
      { id: 't2', label: 'Draft Script', completed: false, role: 'creator' },
    ],
  },
  {
    id: 'proj-2',
    title: 'Vlog: Day in the Life',
    stage: 'Filming',
    driveFolderUrl: '#',
    scriptUrl: '#',
    thumbnailUrl: 'https://picsum.photos/400/225?random=2',
    assignedEditor: 'Sarah Cuts',
    description: 'Behind the scenes at the studio.',
    tasks: [
      { id: 't3', label: 'Charge Batteries', completed: true, role: 'creator' },
      { id: 't4', label: 'Format SD Cards', completed: true, role: 'creator' },
      { id: 't5', label: 'Film A-Roll', completed: false, role: 'creator' },
    ],
  },
  {
    id: 'proj-3',
    title: 'Tutorial: React Hooks 2024',
    stage: 'Editing',
    driveFolderUrl: '#',
    scriptUrl: '#',
    thumbnailUrl: 'https://picsum.photos/400/225?random=3',
    assignedEditor: 'Mike Post',
    description: 'Comprehensive guide to useTransition and useOptimistic.',
    tasks: [
      { id: 't6', label: 'Record Screen Capture', completed: true, role: 'creator' },
      { id: 't7', label: 'Sync Audio/Video', completed: false, role: 'editor' },
      { id: 't8', label: 'Cut A-Roll', completed: false, role: 'editor' },
      { id: 't9', label: 'Add B-Roll', completed: false, role: 'editor' },
      { id: 't10', label: 'Color Grade', completed: false, role: 'editor' },
      { id: 't11', label: 'Export & Upload', completed: false, role: 'editor' },
    ],
  },
  {
    id: 'proj-4',
    title: 'Podcast Ep #5: Future of AI',
    stage: 'Published',
    driveFolderUrl: '#',
    scriptUrl: '#',
    thumbnailUrl: 'https://picsum.photos/400/225?random=4',
    assignedEditor: 'Mike Post',
    description: 'Interview with Gemini lead engineer.',
    tasks: [
      { id: 't12', label: 'Review Analytics', completed: false, role: 'creator' },
    ],
  },
  {
    id: 'proj-5',
    title: 'Short: Coffee B-Roll',
    stage: 'Editing',
    driveFolderUrl: '#',
    scriptUrl: '#',
    thumbnailUrl: 'https://picsum.photos/400/225?random=5',
    assignedEditor: 'Alex Editor',
    description: 'Cinematic coffee pouring shots for Instagram.',
    tasks: [
      { id: 't13', label: 'Sync Audio/Video', completed: true, role: 'editor' },
      { id: 't14', label: 'Color Grade', completed: false, role: 'editor' },
      { id: 't15', label: 'Export & Upload', completed: false, role: 'editor' },
    ],
  },
];

export const DEFAULT_EDITOR_TASKS = [
  { label: 'Sync Audio/Video', role: 'editor' },
  { label: 'Cut A-Roll', role: 'editor' },
  { label: 'Add B-Roll', role: 'editor' },
  { label: 'Color Grade', role: 'editor' },
  { label: 'Export & Upload', role: 'editor' },
];

// --- COMPONENTS ---

// 1. TaskCheckbox
const TaskCheckbox: React.FC<{
  task: Task;
  onToggle: (taskId: string) => void;
  disabled?: boolean;
}> = ({ task, onToggle, disabled }) => (
  <div 
    className={`flex items-center gap-2 py-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
    onClick={() => !disabled && onToggle(task.id)}
  >
    <div className={`
      flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors
      ${task.completed 
        ? 'bg-emerald-500 border-emerald-500 text-white' 
        : 'bg-white border-gray-300 text-transparent hover:border-emerald-400'}
    `}>
      <Check size={14} strokeWidth={3} />
    </div>
    <span className={`text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
      {task.label}
    </span>
  </div>
);

// 2. ProjectCard (Static Version - No DnD)
interface ProjectCardProps {
  project: VideoProject;
  currentRole: Role;
  onTaskToggle: (projectId: string, taskId: string) => void;
  onSendToEditor?: (projectId: string) => void;
  onMoveStage?: (projectId: string, direction: 'prev' | 'next') => void;
  isEditorView?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  currentRole, 
  onTaskToggle, 
  onSendToEditor,
  onMoveStage,
  isEditorView
}) => {
  const visibleTasks = project.tasks.filter(t => {
    if (currentRole === 'creator') return true; 
    return t.role === 'editor';
  });

  const completedTasks = visibleTasks.filter(t => t.completed).length;
  const progress = visibleTasks.length > 0 ? (completedTasks / visibleTasks.length) * 100 : 0;

  const showSendToEditor = 
    currentRole === 'creator' && 
    project.stage === 'Filming' && 
    !project.tasks.some(t => t.label === 'Ready for Edit' && t.completed);

  const stageIndex = COLUMNS.indexOf(project.stage);
  const canMovePrev = stageIndex > 0;
  const canMoveNext = stageIndex < COLUMNS.length - 1;

  return (
    <div className={`
        bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all
        ${isEditorView ? 'mb-4 border-l-4 border-l-emerald-500' : 'mb-3 hover:shadow-md'}
      `}
    >
      <div className="flex gap-4">
        {isEditorView && (
            <div className="w-48 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 hidden sm:block">
              <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
            </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1 block">
                {project.id} • {isEditorView ? 'PRIORITY' : project.stage}
              </span>
              <h3 className="font-semibold text-gray-900 leading-tight">{project.title}</h3>
            </div>
            
            <div className="flex items-center gap-1">
              {!isEditorView && onMoveStage && (
                <>
                  <button 
                    disabled={!canMovePrev}
                    onClick={() => onMoveStage(project.id, 'prev')}
                    className={`p-1 rounded hover:bg-gray-100 ${!canMovePrev ? 'opacity-20 pointer-events-none' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Move to previous stage"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    disabled={!canMoveNext}
                    onClick={() => onMoveStage(project.id, 'next')}
                    className={`p-1 rounded hover:bg-gray-100 ${!canMoveNext ? 'opacity-20 pointer-events-none' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Move to next stage"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
              <button className="text-gray-400 hover:text-gray-600 p-1">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {isEditorView && <p className="text-sm text-gray-500 mb-3">{project.description}</p>}

          <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${isEditorView ? 'bg-emerald-500' : 'bg-blue-500'}`} 
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
             <UserCircle size={16} className="text-gray-400" />
             <span className="text-xs text-gray-500">{project.assignedEditor}</span>
          </div>

          <div className="space-y-1">
             {visibleTasks.slice(0, isEditorView ? undefined : 2).map(task => (
               <TaskCheckbox 
                 key={task.id} 
                 task={task} 
                 onToggle={(tid) => onTaskToggle(project.id, tid)} 
                 disabled={currentRole !== 'editor' && task.role === 'editor'}
               />
             ))}
             {!isEditorView && visibleTasks.length > 2 && (
               <p className="text-xs text-gray-400 pl-7">+{visibleTasks.length - 2} more tasks</p>
             )}
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <a href={project.scriptUrl} onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200">
              <FileText size={14} /> Script
            </a>
            <a href={project.driveFolderUrl} onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-gray-200">
              <Folder size={14} /> Footage
            </a>
            {project.stage === 'Editing' && (
              <a href={project.driveFolderUrl} onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors border border-purple-200">
                <UploadCloud size={14} /> Upload Final
              </a>
            )}
          </div>

          {showSendToEditor && onSendToEditor && (
            <button
              onClick={() => onSendToEditor(project.id)}
              className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              Send to Editor <Video size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. KanbanColumn (Static Version)
const KanbanColumn: React.FC<{
  id: Stage;
  projects: VideoProject[];
  onTaskToggle: (pid: string, tid: string) => void;
  onSendToEditor: (pid: string) => void;
  onMoveStage: (pid: string, dir: 'prev' | 'next') => void;
}> = ({ id, projects, onTaskToggle, onSendToEditor, onMoveStage }) => {
  return (
    <div className="flex-shrink-0 w-80 flex flex-col h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          {id}
          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{projects.length}</span>
        </h2>
      </div>
      <div className="flex-1 rounded-xl p-2 transition-colors overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="flex flex-col min-h-[100px]">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              currentRole="creator" 
              onTaskToggle={onTaskToggle} 
              onSendToEditor={onSendToEditor}
              onMoveStage={onMoveStage}
            />
          ))}
          {projects.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">Empty Stage</div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. KanbanBoard (Static Version)
const KanbanBoard: React.FC<{
  projects: VideoProject[];
  onTaskToggle: (pid: string, tid: string) => void;
  onSendToEditor: (pid: string) => void;
  onMoveStage: (pid: string, dir: 'prev' | 'next') => void;
}> = ({ projects, onTaskToggle, onSendToEditor, onMoveStage }) => {
  return (
    <div className="flex h-full gap-6 overflow-x-auto pb-4 px-6 items-start">
      {COLUMNS.map((stage) => (
        <KanbanColumn 
          key={stage} 
          id={stage} 
          projects={projects.filter(p => p.stage === stage)} 
          onTaskToggle={onTaskToggle} 
          onSendToEditor={onSendToEditor}
          onMoveStage={onMoveStage}
        />
      ))}
    </div>
  );
};

// 5. EditorDashboard
const EditorDashboard: React.FC<{
  projects: VideoProject[];
  onTaskToggle: (pid: string, tid: string) => void;
}> = ({ projects, onTaskToggle }) => {
  const activeProjects = projects.filter(p => p.stage === 'Editing');
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <CheckSquare className="text-emerald-500" /> Editor Priority Queue
        </h1>
        <p className="text-slate-500 mt-1">
          {activeProjects.length > 0 ? `You have ${activeProjects.length} videos waiting for your magic touch.` : "Queue is empty. Time for a coffee break!"}
        </p>
      </div>
      {activeProjects.length > 0 ? (
        <div className="space-y-6">
          {activeProjects.map(project => (
            <ProjectCard key={project.id} project={project} currentRole="editor" onTaskToggle={onTaskToggle} isEditorView={true} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Coffee size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">All Caught Up!</h3>
          <p className="text-slate-400">No videos currently in the editing stage.</p>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<VideoProject[]>(INITIAL_PROJECTS);
  const [currentRole, setCurrentRole] = useState<Role>('creator');

  const updateProjectStage = (projectId: string, newStage: Stage) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        let updatedTasks = [...p.tasks];
        // If moving to Editing, ensure editor tasks exist
        if (newStage === 'Editing') {
            const hasEditorTasks = updatedTasks.some(t => t.role === 'editor');
            if (!hasEditorTasks) {
                const newTasks: Task[] = DEFAULT_EDITOR_TASKS.map((t, idx) => ({
                    id: `${projectId}-e-${Date.now()}-${idx}`,
                    label: t.label,
                    role: 'editor',
                    completed: false
                }));
                updatedTasks = [...updatedTasks, ...newTasks];
            }
        }
        return { ...p, stage: newStage, tasks: updatedTasks };
      }
      return p;
    }));
  };

  const moveProjectManual = (projectId: string, direction: 'prev' | 'next') => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const currentIndex = COLUMNS.indexOf(project.stage);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < COLUMNS.length) {
      updateProjectStage(projectId, COLUMNS[newIndex]);
    }
  };

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      };
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md"><Clapperboard size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CineFlow</h1>
            <p className="text-xs text-slate-500 font-medium">Production Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
           <button onClick={() => setCurrentRole('creator')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentRole === 'creator' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Layout size={16} /> Creator</button>
           <button onClick={() => setCurrentRole('editor')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentRole === 'editor' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Shield size={16} /> Editor</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col pt-6">
        {currentRole === 'creator' ? (
          <KanbanBoard 
            projects={projects} 
            onTaskToggle={toggleTask} 
            onSendToEditor={(pid) => updateProjectStage(pid, 'Editing')}
            onMoveStage={moveProjectManual}
          />
        ) : (
          <div className="flex-1 overflow-y-auto"><EditorDashboard projects={projects} onTaskToggle={toggleTask} /></div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-2 px-6 text-xs text-slate-400 flex justify-between">
        <span>CineFlow v2.0 (No-Drag Mode)</span>
        <span className="flex items-center gap-1"><Users size={12}/> Logged in as: {currentRole === 'creator' ? 'Admin' : 'Sarah Cuts'}</span>
      </footer>
    </div>
  );
};

export default App;