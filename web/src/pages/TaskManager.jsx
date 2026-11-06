import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  Edit2,
  X,
  Filter,
  Check,
} from 'lucide-react';

export const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  // Edit Task State
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filter === 'pending') params.status = 'pending';
      if (filter === 'completed') params.status = 'completed';

      const res = await api.get('/tasks', { params });
      setTasks(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    setSubmitting(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        deadline,
        priority,
      });
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority('medium');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const res = await api.patch(`/tasks/${task._id}/complete`, {
        completed: !task.completed,
      });
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? res.data.data : t))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await api.put(`/tasks/${editingTask._id}`, {
        title: editingTask.title,
        description: editingTask.description,
        deadline: editingTask.deadline,
        priority: editingTask.priority,
      });
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      alert('Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      } catch (err) {
        alert('Failed to delete task.');
      }
    }
  };

  // Helper for overdue / due-soon highlighting
  const getDeadlineStatus = (deadlineStr, completed) => {
    if (completed) return 'completed';
    const now = new Date();
    const d = new Date(deadlineStr);
    const diffMs = d - now;

    if (diffMs < 0) return 'overdue';
    if (diffMs <= 24 * 60 * 60 * 1000) return 'due-soon';
    return 'normal';
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={26} color="#0284c7" /> Academic Task Manager (FR-S06)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Track homework, lab milestones, and exam revisions. Hourly automated alerts notify you 24 hours prior to due dates.
        </p>
      </div>

      <div className="grid-2">
        {/* Add Task Form */}
        <div className="card">
          <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add New Academic Task
          </h2>
          <form onSubmit={handleCreateTask}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Task Title
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement Dijkstra Algorithm in C++"
                required
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Description (Optional)
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific lab guidelines, chapter notes, or deliverables..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Deadline Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Priority
                </label>
                <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-accent" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              <span>{submitting ? 'Saving Task...' : 'Save Academic Task'}</span>
            </button>
          </form>
        </div>

        {/* Task List */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', color: '#0b3954', margin: 0 }}>My Task List</h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setFilter('all')}
                  className="btn-outline"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px', background: filter === 'all' ? '#e2e8f0' : 'transparent' }}
                >
                  All ({tasks.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className="btn-outline"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px', background: filter === 'pending' ? '#e2e8f0' : 'transparent' }}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className="btn-outline"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px', background: filter === 'completed' ? '#e2e8f0' : 'transparent' }}
                >
                  Completed
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                <CheckSquare size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No tasks found in this view.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map((task) => {
                  const status = getDeadlineStatus(task.deadline, task.completed);
                  const isOverdue = status === 'overdue';
                  const isDueSoon = status === 'due-soon';

                  return (
                    <div
                      key={task._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: isOverdue
                          ? '1px solid #fca5a5'
                          : isDueSoon
                          ? '1px solid #fde047'
                          : '1px solid #e2e8f0',
                        backgroundColor: task.completed
                          ? '#f8fafc'
                          : isOverdue
                          ? '#fef2f2'
                          : isDueSoon
                          ? '#fffbeb'
                          : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleComplete(task)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          aria-label={`Toggle task completion for ${task.title}`}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontWeight: '600',
                                fontSize: '14px',
                                color: task.completed ? '#94a3b8' : '#0f172a',
                                textDecoration: task.completed ? 'line-through' : 'none',
                              }}
                            >
                              {task.title}
                            </span>
                            {isOverdue && (
                              <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                OVERDUE
                              </span>
                            )}
                            {isDueSoon && (
                              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                DUE SOON (&lt; 24h)
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {task.description}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            <Clock size={12} />
                            <span>Due: {new Date(task.deadline).toLocaleString()}</span>
                            <span style={{ textTransform: 'capitalize', color: task.priority === 'high' ? '#dc2626' : '#64748b', fontWeight: 'bold' }}>
                              • {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setEditingTask(task)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                          title="Edit task"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          title="Delete task"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>Edit Task</h2>
              <button onClick={() => setEditingTask(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTask}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Deadline</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={editingTask.deadline ? new Date(editingTask.deadline).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Priority</label>
                  <select
                    className="input-field"
                    value={editingTask.priority || 'medium'}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingTask(null)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
