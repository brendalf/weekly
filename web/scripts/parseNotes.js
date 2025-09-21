const fs = require('fs');
const path = require('path');

// Task status enum - matching TypeScript enum values
const TaskStatus = {
  PENDING: 'TaskStatus.PENDING',
  IN_PROGRESS: 'TaskStatus.IN_PROGRESS', 
  COMPLETED: 'TaskStatus.COMPLETED'
};

// Helper function to extract week number from filename
function getWeekNumber(filename) {
  const match = filename.match(/Week (\d+)\.md/);
  return match ? parseInt(match[1]) : null;
}

// Helper function to determine task status from markdown checkbox
function getTaskStatus(line) {
  let status = TaskStatus.PENDING;
  if (line.includes('- [x]') || line.includes('- [X]')) {
    status = TaskStatus.COMPLETED;
  } else if (line.includes('- [-]')) {
    status = TaskStatus.IN_PROGRESS;
  }
  return status;
}

// Helper function to extract task title from markdown line
function extractTaskTitle(line) {
  // Remove markdown checkbox syntax and clean up
  return line
    .replace(/^\s*-\s*\[[x\s]\]\s*/, '') // Remove checkbox
    .replace(/\[Week \d+\]\s*/, '') // Remove week references
    .replace(/\[Hold\]\s*/, '') // Remove hold markers
    .replace(/\[\d+\]\s*$/, '') // Remove streak numbers at end
    .replace(/\s*\[\d+\]/, '') // Remove streak numbers in middle
    .replace(/\s*\(\d+[^)]*\)/, '') // Remove progress indicators like (147 => 176)
    .trim();
}

// Helper function to detect if a task is recurring/has streak
function hasStreak(line) {
  const streakMatch = line.match(/\[(\d+)\]/);
  return streakMatch ? parseInt(streakMatch[1]) : 0;
}

// Helper function to detect if task is from previous week
function isFromPreviousWeek(line) {
  return line.includes('[Week ') && !line.includes('[Hold]');
}

// Main parsing function
function parseNotesDirectory(notesDir) {
  const tasks = [];
  let taskId = 1;

  // Get all markdown files recursively
  function getMarkdownFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getMarkdownFiles(fullPath));
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  const markdownFiles = getMarkdownFiles(notesDir);
  
  // Sort files by week number
  markdownFiles.sort((a, b) => {
    const weekA = getWeekNumber(path.basename(a));
    const weekB = getWeekNumber(path.basename(b));
    return (weekA || 0) - (weekB || 0);
  });

  console.log(`Found ${markdownFiles.length} markdown files`);

  for (const filePath of markdownFiles) {
    const filename = path.basename(filePath);
    const weekNumber = getWeekNumber(filename);
    
    if (!weekNumber) continue;

    console.log(`Processing ${filename}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Detect sections
      if (trimmedLine.match(/^(Goals?|Tasks?|Health|Living abroad|Become interesting person|Be a great father|House|Have fun|Work|.*):$/)) {
        currentSection = trimmedLine.replace(':', '');
        continue;
      }
      
      // Skip non-task lines (headers, sub-bullets without checkboxes, etc.)
      if (!trimmedLine.match(/^\s*-\s*\[[x\s]\]/)) {
        continue;
      }
      
      // Extract task information
      const status = getTaskStatus(trimmedLine);
      const title = extractTaskTitle(trimmedLine);
      const streak = hasStreak(trimmedLine);
      const fromPreviousWeek = isFromPreviousWeek(trimmedLine);
      
      // Skip if title is too short or empty
      if (!title || title.length < 3) continue;
      
      // Calculate weeks open (how many weeks since created)
      const currentWeek = 37; // Current week based on your latest file
      const createdWeek = fromPreviousWeek ? 
        (weekNumber - 1) : weekNumber; // If from previous week, assume created week before
      const weeksOpen = Math.max(0, currentWeek - createdWeek);
      
      // Calculate dates based on week numbers
      const weekStartDate = new Date(2025, 0, 1); // January 1, 2025
      const taskCreatedDate = new Date(weekStartDate);
      taskCreatedDate.setDate(weekStartDate.getDate() + (createdWeek - 1) * 7);
      
      const task = {
        id: taskId.toString(),
        title: title,
        status: status,
        weekId: 'current-week', // Simplified for now
        createdAt: taskCreatedDate,
        updatedAt: taskCreatedDate,
        completedAt: status === TaskStatus.COMPLETED ? taskCreatedDate : undefined,
        createdWeek: createdWeek,
        weeksOpen: weeksOpen,
        weekStreak: streak > 1 ? streak : undefined,
        category: currentSection || 'General',
        originalWeek: weekNumber, // Week where this task appeared
        isRecurring: streak > 0,
        fromPreviousWeek: fromPreviousWeek
      };
      
      tasks.push(task);
    }
  }

  return tasks;
}

// Generate the JSON data
function generateTasksJSON() {
  const notesDir = path.join(__dirname, '../notes');
  
  if (!fs.existsSync(notesDir)) {
    console.error('Notes directory not found:', notesDir);
    return;
  }

  console.log('Parsing notes from:', notesDir);
  const tasks = parseNotesDirectory(notesDir);
  
  // Filter out duplicates (same title and similar creation week)
  const uniqueTasks = [];
  const seenTasks = new Set();
  
  for (const task of tasks) {
    const key = `${task.title.toLowerCase()}-${Math.floor(task.createdWeek / 2)}`; // Group by 2-week periods
    if (!seenTasks.has(key)) {
      seenTasks.add(key);
      uniqueTasks.push(task);
    }
  }
  
  console.log(`\nParsed ${tasks.length} total tasks`);
  console.log(`After deduplication: ${uniqueTasks.length} unique tasks`);
  
  // Sort by creation week (newest first) and then by status
  uniqueTasks.sort((a, b) => {
    if (a.createdWeek !== b.createdWeek) {
      return b.createdWeek - a.createdWeek;
    }
    // Completed tasks last
    if (a.status !== b.status) {
      if (a.status === TaskStatus.COMPLETED) return 1;
      if (b.status === TaskStatus.COMPLETED) return -1;
    }
    return 0;
  });
  
  // Generate statistics
  const stats = {
    totalTasks: uniqueTasks.length,
    completedTasks: uniqueTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    todoTasks: uniqueTasks.filter(t => t.status === TaskStatus.PENDING).length,
    inProgressTasks: uniqueTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    recurringTasks: uniqueTasks.filter(t => t.isRecurring).length,
    oldTasks: uniqueTasks.filter(t => t.weeksOpen > 4).length,
    categories: [...new Set(uniqueTasks.map(t => t.category))].sort(),
    weekRange: {
      earliest: Math.min(...uniqueTasks.map(t => t.createdWeek)),
      latest: Math.max(...uniqueTasks.map(t => t.createdWeek))
    }
  };
  
  console.log('\nStatistics:');
  console.log(`- Total tasks: ${stats.totalTasks}`);
  console.log(`- Completed: ${stats.completedTasks}`);
  console.log(`- Todo: ${stats.todoTasks}`);
  console.log(`- In Progress: ${stats.inProgressTasks}`);
  console.log(`- Recurring: ${stats.recurringTasks}`);
  console.log(`- Old (>4 weeks): ${stats.oldTasks}`);
  console.log(`- Categories: ${stats.categories.join(', ')}`);
  console.log(`- Week range: ${stats.weekRange.earliest} - ${stats.weekRange.latest}`);
  
  // Write to file
  const outputPath = path.join(__dirname, '../src/utils/parsedNotesData.ts');
  const output = `// Auto-generated from notes parsing script
// Generated on: ${new Date().toISOString()}

import { Task, TaskStatus } from '@/types';

export const parsedNotesStats = ${JSON.stringify(stats, null, 2)};

export const parsedNotesTasks: Task[] = ${JSON.stringify(uniqueTasks, null, 2)
    .replace(/"TaskStatus\.(PENDING|IN_PROGRESS|COMPLETED)"/g, 'TaskStatus.$1')
    .replace(/"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"/g, 'new Date("$1")')};

// Helper function to get tasks by status
export const getTasksByStatus = (status: TaskStatus): Task[] => {
  return parsedNotesTasks.filter(task => task.status === status);
};

// Helper function to get tasks by category
export const getTasksByCategory = (category: string): Task[] => {
  return parsedNotesTasks.filter(task => task.category === category);
};

// Helper function to get old tasks (>4 weeks)
export const getOldTasks = (): Task[] => {
  return parsedNotesTasks.filter(task => task.weeksOpen > 4);
};

// Helper function to get recurring tasks
export const getRecurringTasks = (): Task[] => {
  return parsedNotesTasks.filter(task => task.isRecurring);
};
`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`\nGenerated TypeScript file: ${outputPath}`);
  
  return uniqueTasks;
}

// Run the script
if (require.main === module) {
  generateTasksJSON();
}

module.exports = { generateTasksJSON, parseNotesDirectory };
