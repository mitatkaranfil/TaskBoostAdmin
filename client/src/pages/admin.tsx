import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Task, BoostType } from '@/types';
import { getAllTasks, createTask, updateTask, deleteTask, getAllBoostTypes, createBoostType, updateBoostType, deleteBoostType } from '@/lib/supabase';

export default function Admin() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boosts, setBoosts] = useState<BoostType[]>([]);
  const { toast } = useToast();
  
  // New states for form inputs
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    type: 'daily',
    points: 50,
    requiredAmount: 1,
    isActive: true,
    telegramAction: null,
    telegramTarget: null
  });
  
  const [newBoost, setNewBoost] = useState<Partial<BoostType>>({
    name: '',
    description: '',
    multiplier: 200,
    durationHours: 24,
    price: 100,
    isActive: true,
    iconName: 'rocket',
    colorClass: 'blue',
    isPopular: false
  });

  useEffect(() => {
    loadTasks();
    loadBoosts();
  }, []);
  
  const loadTasks = async () => {
    try {
      const tasks = await getAllTasks();
      setTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    }
  };

  const loadBoosts = async () => {
    try {
      const boosts = await getAllBoostTypes();
      setBoosts(boosts);
    } catch (error) {
      console.error('Error loading boosts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load boosts',
        variant: 'destructive',
      });
    }
  };

  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setNewTask({
        ...newTask,
        [name]: (e.target as HTMLInputElement).checked
      });
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      setNewTask({
        ...newTask,
        [name]: parseInt(value, 10)
      });
          return;
    }
    
    // Handle text inputs
    setNewTask({
      ...newTask,
      [name]: value
    });
  };

  const handleBoostChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setNewBoost({
        ...newBoost,
        [name]: (e.target as HTMLInputElement).checked
      });
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      setNewBoost({
        ...newBoost,
        [name]: parseInt(value, 10)
      });
          return;
    }
    
    // Handle text inputs
    setNewBoost({
      ...newBoost,
      [name]: value
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask(newTask);
      toast({
        title: 'Success',
        description: 'Task added successfully',
      });
      
      // Reset form and reload tasks
      setNewTask({
        title: '',
        description: '',
        type: 'daily',
        points: 50,
        requiredAmount: 1,
        isActive: true,
        telegramAction: null,
        telegramTarget: null
      });
      loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive',
      });
    }
  };
  
  const handleAddBoostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoostType(newBoost);
          toast({
        title: 'Success',
        description: 'Boost added successfully',
      });
      
      // Reset form and reload boosts
      setNewBoost({
        name: '',
        description: '',
        multiplier: 200,
        durationHours: 24,
        price: 100,
        isActive: true,
        iconName: 'rocket',
        colorClass: 'blue',
        isPopular: false
      });
      loadBoosts();
    } catch (error) {
      console.error('Error adding boost:', error);
      toast({
        title: 'Error',
        description: 'Failed to add boost',
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateTask = async (taskId: string, updatedTask: Partial<Task>) => {
    try {
      await updateTask(taskId, updatedTask);
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
          toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleAddBoost = async (newBoost: Partial<BoostType>) => {
    try {
      await createBoostType(newBoost);
      toast({
        title: 'Success',
        description: 'Boost added successfully',
      });
      loadBoosts();
    } catch (error) {
      console.error('Error adding boost:', error);
      toast({
        title: 'Error',
        description: 'Failed to add boost',
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateBoost = async (boostId: string, updatedBoost: Partial<BoostType>) => {
    try {
      await updateBoostType(boostId, updatedBoost);
      toast({
        title: 'Success',
        description: 'Boost updated successfully',
      });
      loadBoosts();
    } catch (error) {
      console.error('Error updating boost:', error);
          toast({
        title: 'Error',
        description: 'Failed to update boost',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBoost = async (boostId: string) => {
    try {
      await deleteBoostType(boostId);
      toast({
        title: 'Success',
        description: 'Boost deleted successfully',
      });
      loadBoosts();
    } catch (error) {
      console.error('Error deleting boost:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete boost',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      
      {/* Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        
        {/* Task Creation Form */}
        <div className="bg-card p-4 rounded-lg mb-6 border border-border">
          <h3 className="font-medium mb-3">Add New Task</h3>
          <form onSubmit={handleAddTask} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input 
                type="text" 
                name="title"
                value={newTask.title}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea 
                name="description"
                value={newTask.description}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select 
                  name="type"
                value={newTask.type}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              >
                <option value="daily">Daily (Günlük)</option>
                <option value="weekly">Weekly (Haftalık)</option>
                <option value="social">Social (Sosyal)</option>
                <option value="referral">Referral (Davet)</option>
                <option value="milestone">Milestone (Kilometre Taşı)</option>
                <option value="special">Special (Özel)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Points</label>
              <input 
                          type="number"
                name="points"
                value={newTask.points}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                min="1"
                required
                />
              </div>
            <div>
              <label className="block text-sm mb-1">Required Amount</label>
              <input 
                          type="number"
                name="requiredAmount"
                value={newTask.requiredAmount}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                min="1"
                required
              />
                      </div>
            <div>
              <label className="block text-sm mb-1">Telegram Action</label>
              <select 
                name="telegramAction"
                value={newTask.telegramAction || ''}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
              >
                <option value="">None</option>
                <option value="open_app">Open App</option>
                <option value="join_channel">Join Channel</option>
                <option value="send_message">Send Message</option>
                <option value="invite_friends">Invite Friends</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Telegram Target (URL or ID)</label>
              <input 
                type="text" 
                name="telegramTarget"
                value={newTask.telegramTarget || ''}
                onChange={handleTaskChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                placeholder="https://t.me/channelname or @username"
              />
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                name="isActive"
                checked={!!newTask.isActive}
                onChange={handleTaskChange}
                className="mr-2"
              />
              <label className="text-sm">Active</label>
            </div>
            <button 
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Add Task
            </button>
            </form>
          
          {/* Bulk Task Creation */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="font-medium mb-3">Bulk Task Creation</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/tasks/telegram', { method: 'POST' });
                    if (response.ok) {
                      const data = await response.json();
                      toast({
                        title: 'Success',
                        description: `Created ${data.count} Telegram tasks`,
                      });
                      loadTasks();
                    } else {
                      throw new Error('Failed to create Telegram tasks');
                    }
                  } catch (error) {
                    console.error(error);
                    toast({
                      title: 'Error',
                      description: 'Failed to create Telegram tasks',
                      variant: 'destructive',
                    });
                  }
                }} 
                className="bg-blue-500 text-white px-3 py-1.5 text-sm rounded"
              >
                Create Telegram Tasks
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/tasks/progress', { method: 'POST' });
                    if (response.ok) {
                      const data = await response.json();
                      toast({
                        title: 'Success',
                        description: `Created ${data.count} Progress tasks`,
                      });
                      loadTasks();
                    } else {
                      throw new Error('Failed to create Progress tasks');
                    }
                  } catch (error) {
                    console.error(error);
                    toast({
                      title: 'Error',
                      description: 'Failed to create Progress tasks',
                      variant: 'destructive',
                    });
                  }
                }} 
                className="bg-green-500 text-white px-3 py-1.5 text-sm rounded"
              >
                Create Progress Tasks
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/tasks/reset-weekly', { method: 'POST' });
                    if (response.ok) {
                      const data = await response.json();
                      toast({
                        title: 'Success',
                        description: `Reset ${data.resetCount} weekly tasks`,
                      });
                      loadTasks();
                    } else {
                      throw new Error('Failed to reset weekly tasks');
                    }
                  } catch (error) {
                    console.error(error);
                    toast({
                      title: 'Error',
                      description: 'Failed to reset weekly tasks',
                      variant: 'destructive',
                    });
                  }
                }} 
                className="bg-amber-500 text-white px-3 py-1.5 text-sm rounded"
              >
                Reset Weekly Tasks
              </button>
            </div>
          </div>
        </div>
        
        {/* Tasks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="border p-4 rounded-lg">
              <h3 className="font-medium">{task.title}</h3>
              <p className="text-sm text-gray-600">{task.description}</p>
              <p className="text-sm mt-1">
                <span className="font-medium">Type:</span> {task.type}
              </p>
              <p className="text-sm">
                <span className="font-medium">Points:</span> {task.points}
              </p>
              <p className="text-sm">
                <span className="font-medium">Required:</span> {task.requiredAmount}
              </p>
              {task.telegramAction && (
                <p className="text-sm">
                  <span className="font-medium">Telegram Action:</span> {task.telegramAction}
                </p>
              )}
              {task.telegramTarget && (
                <p className="text-sm">
                  <span className="font-medium">Telegram Target:</span> <span className="text-blue-500">{task.telegramTarget}</span>
                </p>
              )}
              <div className="mt-2 flex justify-between items-center">
                <span className={`text-xs px-2 py-0.5 rounded ${task.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {task.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boosts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Boosts</h2>
        
        {/* Boost Creation Form */}
        <div className="bg-card p-4 rounded-lg mb-6 border border-border">
          <h3 className="font-medium mb-3">Add New Boost</h3>
          <form onSubmit={handleAddBoostSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input 
                type="text" 
                name="name"
                value={newBoost.name}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea 
                name="description"
                value={newBoost.description}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Multiplier (100 = 1x, 200 = 2x)</label>
              <input 
                          type="number"
                name="multiplier"
                value={newBoost.multiplier}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                min="100"
                required
                />
              </div>
            <div>
              <label className="block text-sm mb-1">Duration (hours)</label>
              <input 
                          type="number"
                name="durationHours"
                value={newBoost.durationHours}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                min="1"
                required
              />
                      </div>
            <div>
              <label className="block text-sm mb-1">Price</label>
              <input 
                type="number" 
                name="price"
                value={newBoost.price}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                min="1"
                required
                />
              </div>
            <div>
              <label className="block text-sm mb-1">Icon Name</label>
              <input 
                type="text" 
                  name="iconName"
                value={newBoost.iconName}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Color Class</label>
              <input 
                type="text" 
                  name="colorClass"
                value={newBoost.colorClass}
                onChange={handleBoostChange}
                className="w-full p-2 border rounded bg-background text-foreground"
                required
                />
              </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                name="isActive"
                checked={!!newBoost.isActive}
                onChange={handleBoostChange}
                className="mr-2"
              />
              <label className="text-sm">Active</label>
                    </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                name="isPopular"
                checked={!!newBoost.isPopular}
                onChange={handleBoostChange}
                className="mr-2"
              />
              <label className="text-sm">Popular</label>
                </div>
            <button 
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Add Boost
            </button>
          </form>
                            </div>
        
        {/* Boosts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boosts.map((boost) => (
            <div key={boost.id} className="border p-4 rounded-lg">
              <h3 className="font-medium">{boost.name}</h3>
              <p className="text-sm text-gray-600">{boost.description}</p>
              <p className="text-sm mt-1">
                <span className="font-medium">Multiplier:</span> {boost.multiplier/100}x
              </p>
              <p className="text-sm">
                <span className="font-medium">Duration:</span> {boost.durationHours} hours
              </p>
              <p className="text-sm">
                <span className="font-medium">Price:</span> {boost.price} points
              </p>
              <div className="mt-2">
                <button
                                onClick={() => handleDeleteBoost(boost.id)}
                  className="text-red-600 text-sm hover:text-red-800"
                              >
                  Delete
                </button>
                            </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
