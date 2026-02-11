import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  createdAt: string;
}

export default function FreeTool() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const { toast } = useToast();

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("project-arrowhead-tasks");
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error("Failed to parse saved tasks:", error);
      }
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("project-arrowhead-tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.trim(),
      completed: false,
      dueDate: newDueDate,
      createdAt: new Date().toISOString(),
    };

    setTasks([...tasks, task]);
    setNewTask("");
    setNewDueDate("");
    
    toast({
      title: "Task Added",
      description: "Your task has been added to the list.",
    });
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
    toast({
      title: "Task Deleted",
      description: "Task has been removed from your list.",
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Title", "Status", "Due Date", "Created"],
      ...tasks.map(task => [
        task.title,
        task.completed ? "Completed" : "Pending",
        task.dueDate || "No due date",
        new Date(task.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-arrowhead-tasks.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Your tasks have been exported to CSV.",
    });
  };

  const exportToMarkdown = () => {
    const markdownContent = [
      "# Project Arrowhead Tasks",
      "",
      "## Pending Tasks",
      ...tasks.filter(task => !task.completed).map(task => 
        `- [ ] ${task.title}${task.dueDate ? ` (Due: ${task.dueDate})` : ""}`
      ),
      "",
      "## Completed Tasks",
      ...tasks.filter(task => task.completed).map(task => 
        `- [x] ${task.title}${task.dueDate ? ` (Due: ${task.dueDate})` : ""}`
      ),
    ].join("\n");

    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-arrowhead-tasks.md";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Your tasks have been exported to Markdown.",
    });
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="py-24 bg-secondary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Free Project Arrowhead Tool</h1>
          <p className="text-xl text-muted-foreground">
            Create and manage your tasks with due dates and status tracking
          </p>
          <div className="mt-4">
            <Badge variant="outline" className="mr-2">
              {completedTasks} / {totalTasks} Completed
            </Badge>
            <Badge variant="outline">
              {totalTasks - completedTasks} Pending
            </Badge>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Add New Task</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addTask} className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Enter task title..."
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-40"
                    />
                    <Button type="submit" size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Add your first task above!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          task.completed ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="w-5 h-5 text-primary"
                        />
                        <div className="flex-1">
                          <h4 className={`font-medium ${task.completed ? "line-through text-gray-500" : ""}`}>
                            {task.title}
                          </h4>
                          {task.dueDate && (
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge variant={task.completed ? "default" : "secondary"}>
                          {task.completed ? "Completed" : "Pending"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={exportToCSV}
                  className="w-full"
                  variant="outline"
                  disabled={tasks.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>
                <Button
                  onClick={exportToMarkdown}
                  className="w-full"
                  variant="outline"
                  disabled={tasks.length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export to Markdown
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Upgrade for More</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get unlimited projects, cloud sync, and advanced modules with our Pro plan.
                </p>
                <Button asChild className="w-full">
                  <a href="/pricing">View Pricing</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
