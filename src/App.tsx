import React, { useState } from 'react';
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
// --- FIX: Separate imports for Types to satisfy strict mode ---
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
  FileVideo, 
  CheckCircle2, 
  Circle, 
  MoreVertical
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
type Task = {
  id: string;
  title: string;
  project: string;
  editor: string;
};

type ColumnType = {
  id: string;
  title: string;
  tasks: Task[];
};

// --- MOCK DATA ---
const INITIAL_COLUMNS: ColumnType[] = [
  {
    id: 'Ideation',
    title: 'Ideation',
    tasks: [
      { id: 't1', title: 'Tech Review: iPhone 16 Pro', project: 'PROJ-1', editor: 'Alex Editor' },
      { id: 't2', title: 'Vlog: Day in Life', project: 'PROJ-2', editor: 'Sarah Cuts' }
    ]
  },
  {
    id: 'Scripting',
    title: 'Scripting',
    tasks: []
  },
  {
    id: 'Filming',
    title: 'Filming',
    tasks: [
      { id: 't3', title: 'Coffee B-Roll', project: 'PROJ-3', editor: 'Mike Lens' }
    ]
  },
  {
    id: 'Editing',
    title: 'Editing',
    tasks: []
  },
  {
    id: 'Upload',
    title: 'Ready to Upload',
    tasks: []
  }
];

// --- COMPONENTS ---

// 1. The Draggable Card
const SortableTaskCard = ({ task }: { task: Task }) => {
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
        className="bg-indigo-50 border-2 border-indigo-500 opacity-40 h-[180px] rounded-xl"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.project} • {task.project === 'PROJ-1' ? 'IDEATION' : 'FILMING'}</span>
        <div className="flex gap-2">
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={14} /></button>
        </div>
      </div>
      
      <h3 className="font-bold text-slate-800 text-base mb-1 leading-snug">{task.title}</h3>
      <div className="h-1 w-12 bg-indigo-500 rounded-full mb-4"></div>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
            <Users size={10} />
        </div>
        <span className="text-xs text-slate-500 font-medium">{task.editor}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 p-2 rounded-md">
           <CheckCircle2 size={12} /> Outline Key Features
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium p-2">
           <Circle size={12} /> Draft Script
        </div>
      </div>

       <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
        <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
           <FileVideo size={12} /> Script
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 rounded-md hover:bg-slate-100">
           <FileVideo size={12} /> Footage
        </button>
      </div>
    </div>
  );
};

// 2. The Column
const KanbanColumn = ({ column }: { column: ColumnType }) => {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
           <h2 className="font-bold text-slate-700">{column.title}</h2>
           <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{column.tasks.length}</span>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 bg-slate-50/50 rounded-2xl p-3 border border-slate-200/50 flex flex-col gap-3 overflow-y-auto">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                Empty Stage
            </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [columns, setColumns] = useState<ColumnType[]>(INITIAL_COLUMNS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // SENSORS
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function findColumn(id: string | undefined) {
    if (!id) return null;
    return columns.find(c => c.id === id || c.tasks.some(t => t.id === id));
  }

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
        if (c.id === activeColumn.id) {
          return { ...c, tasks: activeItems.filter((t) => t.id !== activeId) };
        }
        if (c.id === overColumn.id) {
          return {
            ...c,
            tasks: [
              ...overItems.slice(0, newIndex),
              activeItems[activeIndex],
              ...overItems.slice(newIndex, overItems.length),
            ],
          };
        }
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
        
        if (oldIndex !== newIndex) {
            setColumns(prev => prev.map(col => {
                if (col.id === activeColumn.id) {
                    return {
                        ...col,
                        tasks: arrayMove(col.tasks, oldIndex, newIndex)
                    };
                }
                return col;
            }));
        }
    }
  };

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <Clapperboard size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CineFlow</h1>
            <p className="text-xs text-slate-500 font-medium">Production Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-white text-indigo-700 shadow-sm">
                <Layout size={16} /> Creator
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-slate-500 hover:text-slate-700">
                <Shield size={16} /> Editor
            </button>
        </div>
      </header>

      {/* BOARD */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full p-6 flex gap-6 w-max mx-auto min-w-full">
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragStart={(e) => setActiveTask(e.active.data.current?.task)}
            >
                {columns.map(col => (
                    <KanbanColumn key={col.id} column={col} />
                ))}

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? <SortableTaskCard task={activeTask} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-2 px-6 text-xs text-slate-400 flex justify-between">
         <span>CineFlow v2.5 (Drag & Drop Active)</span>
         <span className="flex items-center gap-1"><Users size={12}/> Logged in as: Admin</span>
      </footer>
    </div>
  );
};

export default App;