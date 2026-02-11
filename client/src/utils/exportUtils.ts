// Export utility functions for task list data conversion
import jsPDF from 'jspdf';

// --- Bulletproof PDF text renderer utility ---
type HeaderDrawer = (doc: jsPDF) => void;

interface TextBlockOptions {
  x: number;
  width: number;
  y: number;
  text: string;
  label?: {
    text: string;
    gap?: number; // space below label
  };
  font?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  fontSize?: number;
  lineHeight?: number;
  textColor?: [number, number, number];
  background?: {
    fill: [number, number, number];
    paddingV?: number; // total vertical padding
    minHeight?: number;
  };
  page: {
    topY: number;
    bottomY: number;
    onAddPage: HeaderDrawer;
  };
  marginBottom?: number;
}

function renderTextBlock(doc: jsPDF, opts: TextBlockOptions): { y: number } {
  const {
    x,
    width,
    label,
    page,
    background,
    marginBottom = 5,
  } = opts;

  const font = opts.font ?? 'helvetica';
  const fontStyle = opts.fontStyle ?? 'normal';
  const fontSize = opts.fontSize ?? 10;
  const lineHeight = opts.lineHeight ?? 6;
  const textColor = opts.textColor ?? [0, 0, 0] as [number, number, number];

  let y = opts.y;

  // Ensure styles are set before we start
  doc.setFont(font, label ? 'bold' : fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  // 1) Label
  if (label?.text) {
    ensureSpace(lineHeight + (label.gap ?? 8));
    doc.setFont(font, 'bold');
    doc.text(label.text, x, y);
    doc.setFont(font, fontStyle);
    y += (label.gap ?? 8);
  }

  // 2) Prepare text lines
  const padV = background?.paddingV ?? 8;
  const minH = background?.minHeight ?? 20;
  const textX = x + 5; // slight inset
  const rawText = (opts.text ?? '').toString();
  const lines: string[] = doc.splitTextToSize(rawText, width - 5);

  doc.setFont(font, fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  // 3) Render per-page chunks
  let idx = 0;
  // Special case: if background and no lines (empty text), still draw a minimal box
  if (background && lines.length === 0) {
    ensureSpace(minH);
    doc.setFillColor(background.fill[0], background.fill[1], background.fill[2]);
    doc.rect(x, y - 2, width, minH, 'F');
    y += minH + marginBottom;
    return { y };
  }

  while (idx < lines.length) {
    const minNeeded = background ? minH : lineHeight;
    if (y + minNeeded > page.bottomY) newPage();

    const room = page.bottomY - y;
    const maxLines = background
      ? Math.max(1, Math.floor((room - padV) / lineHeight))
      : Math.max(1, Math.floor(room / lineHeight));

    const end = Math.min(lines.length, idx + maxLines);
    const chunk = lines.slice(idx, end);

    if (background) {
      const boxH = Math.max(minH, chunk.length * lineHeight + padV);
      doc.setFillColor(background.fill[0], background.fill[1], background.fill[2]);
      doc.rect(x, y - 2, width, boxH, 'F');

      let yy = y + 5;
      chunk.forEach((line) => {
        doc.text(line, textX, yy);
        yy += lineHeight;
      });

      y += boxH + marginBottom;
    } else {
      chunk.forEach((line) => {
        doc.text(line, textX, y);
        y += lineHeight;
      });
      y += marginBottom;
    }

    idx = end;

    if (idx < lines.length && y > page.bottomY) newPage();
  }

  return { y };

  function ensureSpace(minSpace: number) {
    if (y + minSpace > page.bottomY) newPage();
  }

  function newPage() {
    doc.addPage();
    page.onAddPage(doc);
    y = page.topY;
    // re-apply styles explicitly
    doc.setFont(font, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  }
}

export interface TaskData {
  id: string;
  task: string;
  person: string;
  status: string;
  date: string;
}

interface ModuleContentItem {
  step: number;
  title: string;
  instructions: string;
  question: string;
  placeholder: string;
}

interface ModuleStepExport {
  stepNumber: number;
  title: string;
  question: string;
  answer: string;
  completed: boolean;
}

// Safe date formatter to avoid "Invalid Date" and normalize common formats
function formatDateSafe(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const d1 = new Date(dateStr);
    if (!isNaN(d1.getTime())) {
      return d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    }
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, y, m, d] = iso;
      const d2 = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(d2.getTime())) {
        return d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      }
    }
    const mdy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (mdy) {
      const [, mm, dd, yy] = mdy;
      const yyyy = yy.length === 2 ? Number(yy) + 2000 : Number(yy);
      const d3 = new Date(yyyy, Number(mm) - 1, Number(dd));
      if (!isNaN(d3.getTime())) {
        return d3.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      }
    }
  } catch { /* noop */ }
  return String(dateStr);
}

/**
 * Convert task list data to Markdown format
 */
export const convertTasksToMarkdown = (tasks: TaskData[]): string => {
  if (tasks.length === 0) {
    return "# Task List\n\nNo tasks available.";
  }

  let markdown = "# Task List\n\n";
  markdown += "| Status | Task | Person | Date |\n";
  markdown += "|--------|------|--------|----- |\n";
  
  tasks.forEach(task => {
    // Escape pipe characters in task data to prevent table formatting issues
    const escapedTask = task.task.replace(/\|/g, '\\|');
    const escapedPerson = task.person.replace(/\|/g, '\\|');
    
    markdown += `| ${task.status} | ${escapedTask} | ${escapedPerson} | ${task.date} |\n`;
  });
  
  markdown += `\n*Exported on ${new Date().toLocaleString()}*`;
  
  return markdown;
};

/**
 * Convert task list data to CSV format
 */
export const convertTasksToCSV = (tasks: TaskData[]): string => {
  if (tasks.length === 0) {
    return "Status,Task,Person,Date\n";
  }

  let csv = "Status,Task,Person,Date\n";
  
  tasks.forEach(task => {
    // Escape commas and quotes in CSV data
    const escapedTask = `"${task.task.replace(/"/g, '""')}"`;
    const escapedPerson = `"${task.person.replace(/"/g, '""')}"`;
    
    csv += `"${task.status}",${escapedTask},${escapedPerson},"${task.date}"\n`;
  });
  
  return csv;
};

/**
 * Copy text to clipboard with error handling
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Download data as a file
 */
export const downloadFile = (data: string, filename: string, mimeType: string = 'text/plain'): void => {
  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download file:', error);
  }
};

/**
 * Convert task list data to JSON format
 */
export const convertTasksToJSON = (tasks: TaskData[]): string => {
  const exportData = {
    exportType: 'taskList',
    exportDate: new Date().toISOString(),
    tasks: tasks,
    summary: {
      totalTasks: tasks.length,
      statusBreakdown: tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Generate full project export data (tasks + module data)
 */
export const generateFullProjectData = (tasks: TaskData[]): string => {
  // For now, we'll include task data and placeholder module data
  // This will be enhanced when we implement module data retrieval
  const fullProjectData = {
    exportType: 'fullProject',
    exportDate: new Date().toISOString(),
    project: {
      name: 'Arrowhead Project Export',
      description: 'Complete project export including all tasks and module data'
    },
    tasks: {
      totalTasks: tasks.length,
      data: tasks
    },
    modules: {
      brainstorm: {
        completed: false,
        steps: 5,
        data: 'Module data will be implemented in Phase 3'
      },
      choose: {
        completed: false,
        steps: 5,
        data: 'Module data will be implemented in Phase 3'
      },
      objectives: {
        completed: false,
        steps: 7,
        data: 'Module data will be implemented in Phase 3'
      }
    },
    summary: {
      tasksCount: tasks.length,
      modulesCount: 3,
      exportVersion: '1.0'
    }
  };
  
  return JSON.stringify(fullProjectData, null, 2);
};

/**
 * Generate module-specific export data
 */
export const generateModuleExportData = (moduleId: string): string => {
  // For now, we'll create placeholder module data
  // This will be enhanced when we implement actual module data retrieval
  const moduleData = {
    exportType: 'module',
    moduleId: moduleId,
    exportDate: new Date().toISOString(),
    module: {
      name: getModuleDisplayName(moduleId),
      description: getModuleDescription(moduleId),
      totalSteps: getModuleStepCount(moduleId),
      completed: false
    },
    steps: generateModuleSteps(moduleId),
    summary: {
      moduleType: moduleId,
      stepCount: getModuleStepCount(moduleId),
      exportVersion: '1.0'
    }
  };
  
  return JSON.stringify(moduleData, null, 2);
};

/**
 * Helper functions for module data
 */
const getModuleDisplayName = (moduleId: string): string => {
  switch (moduleId) {
    case 'brainstorm': return 'Brainstorm Module';
    case 'choose': return 'Decision Making Module';
    case 'objectives': return 'Objectives Planning Module';
    default: return 'Unknown Module';
  }
};

const getModuleDescription = (moduleId: string): string => {
  switch (moduleId) {
    case 'brainstorm': return "Explore the competitive landscape and generate a wide range of creative solutions. This module is for when you need to innovate and discover new possibilities.";
    case 'choose': return 'Compare your options against clear, defined criteria. This structured process helps you make a confident, well-reasoned decision and gain team buy-in.';
    case 'objectives': return 'Transform your strategic decision into a concrete action plan. Define the steps, allocate resources, and establish clear accountability to ensure your objective is achieved.';
    default: return 'Module description not available';
  }
};

const getModuleStepCount = (moduleId: string): number => {
  switch (moduleId) {
    case 'brainstorm': return 5;
    case 'choose': return 5;
    case 'objectives': return 7;
    default: return 0;
  }
};

const generateModuleSteps = (moduleId: string): ModuleStepExport[] => {
  const stepCount = getModuleStepCount(moduleId);
  const steps: ModuleStepExport[] = [];
  
  for (let i = 1; i <= stepCount; i++) {
    steps.push({
      stepNumber: i,
      title: `Step ${i}`,
      question: 'Step content will be populated when module data retrieval is implemented',
      answer: 'User answer will be retrieved from session data',
      completed: false
    });
  }
  
  return steps;
};

/**
 * Generate professional PDF for task list
 */
export const generateTaskListPDF = (tasks: TaskData[]): void => {
  const doc = new jsPDF();
  
  // Professional header with logo area
  doc.setFillColor(41, 128, 185); // Professional blue
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Task List Report', 20, 25);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 20, 35);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary
  doc.setFontSize(16);
  doc.text('Executive Summary', 20, 60);
  
  doc.setFontSize(11);
  doc.text(`Total Tasks: ${tasks.length}`, 25, 75);
  
  // Status breakdown with better formatting
  const statusBreakdown = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let yPos = 85;
  Object.entries(statusBreakdown).forEach(([status, count]) => {
    const percentage = ((count / tasks.length) * 100).toFixed(1);
    doc.text(`• ${status}: ${count} tasks (${percentage}%)`, 25, yPos);
    yPos += 8;
  });
  
  // Professional table with proper formatting
  yPos += 15;
  doc.setFontSize(16);
  doc.text('Task Details', 20, yPos);
  yPos += 15;
  
  // Professional table with fixed column structure
  const tableStartX = 15;
  const tableWidth = 180;
  const colWidths = [35, 80, 40, 25]; // Status, Task, Person, Date
  const baseRowHeight = 14;
  
  // Table header with proper borders
  doc.setFillColor(240, 240, 240);
  doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight, 'F');
  
  // Header borders
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight);
  
  // Column separators for header
  let currentX = tableStartX;
  for (let i = 0; i < colWidths.length - 1; i++) {
    currentX += colWidths[i];
    doc.line(currentX, yPos - 5, currentX, yPos + 9);
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Status', tableStartX + 2, yPos + 4);
  doc.text('Task Description', tableStartX + colWidths[0] + 2, yPos + 4);
  doc.text('Person', tableStartX + colWidths[0] + colWidths[1] + 2, yPos + 4);
  doc.text('Date', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4);
  
  doc.setFont('helvetica', 'normal');
  yPos += 15;
  
  // Task rows with dynamic text wrapping and row heights
  // Force-wrap long, unbroken strings so they don't bleed into adjacent cells
  const wrapCell = (text: string, maxWidth: number): string[] => {
    const originalSize = doc.getFontSize();
    // ensure measurement matches row font size
    doc.setFontSize(9);
    const src = (text ?? '').toString();
    const tokens = src.split(/\s+/);
    const softened: string[] = [];
    const fits = (s: string) => doc.getTextWidth(s) <= maxWidth;
    tokens.forEach(tok => {
      if (!tok) return;
      if (fits(tok)) {
        softened.push(tok);
      } else {
        // binary-search chunk size to fit width
        let rem = tok;
        while (rem.length > 0) {
          let lo = 1, hi = rem.length, best = 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const piece = rem.slice(0, mid);
            if (fits(piece)) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
          }
          softened.push(rem.slice(0, best));
          rem = rem.slice(best);
        }
      }
    });
    const textForSplit = softened.join(' ');
    const lines = doc.splitTextToSize(textForSplit, maxWidth);
    doc.setFontSize(originalSize);
    return lines;
  };

  tasks.forEach((task, index) => {
    doc.setFontSize(9);
    const cellPadding = 2;
    const dateText = formatDateSafe(task.date);
    // Pre-compute wrapped lines for each cell
    const statusLines = wrapCell(task.status, colWidths[0] - cellPadding * 2);
    const taskLines = wrapCell(task.task, colWidths[1] - cellPadding * 2);
    const personLines = wrapCell(task.person, colWidths[2] - cellPadding * 2);
    const dateLines = wrapCell(dateText, colWidths[3] - cellPadding * 2);
    const maxLines = Math.max(statusLines.length, taskLines.length, personLines.length, dateLines.length);
    const dynamicRowHeight = Math.max(baseRowHeight, maxLines * 6 + 4);
    // New page if this row won't fit
    if (yPos + dynamicRowHeight > 250) {
      doc.addPage();
      // Add header to new page
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('Task List Report (continued)', 20, 13);
      doc.setTextColor(0, 0, 0);
      yPos = 35;
      // Recreate table header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight);
      currentX = tableStartX;
      for (let i = 0; i < colWidths.length - 1; i++) {
        currentX += colWidths[i];
        doc.line(currentX, yPos - 5, currentX, yPos + 9);
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Status', tableStartX + 2, yPos + 4);
      doc.text('Task Description', tableStartX + colWidths[0] + 2, yPos + 4);
      doc.text('Person', tableStartX + colWidths[0] + colWidths[1] + 2, yPos + 4);
      doc.text('Date', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9); // reset row font size after using larger header font
      yPos += 15;
    }
    // Row background (alternating)
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight, 'F');
    }
    // Row borders
    doc.setDrawColor(230, 230, 230);
    doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight);
    // Column separators
    currentX = tableStartX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      currentX += colWidths[i];
      doc.line(currentX, yPos - 2, currentX, yPos - 2 + dynamicRowHeight);
    }
    // Status with color coding
    let statusColor = [0, 0, 0] as [number, number, number];
    if (task.status.toLowerCase().includes('complete')) statusColor = [0, 128, 0];
    else if (task.status.toLowerCase().includes('progress')) statusColor = [255, 140, 0];
    else if (task.status.toLowerCase().includes('pending')) statusColor = [255, 0, 0];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    statusLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + cellPadding, yPos + 7 + i * 6);
    });
    doc.setTextColor(0, 0, 0);
    // Task description
    taskLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + cellPadding, yPos + 7 + i * 6);
    });
    // Person
    personLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + cellPadding, yPos + 7 + i * 6);
    });
    // Date
    dateLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + cellPadding, yPos + 7 + i * 6);
    });
    yPos += dynamicRowHeight;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
    doc.text('Arrowhead Solution - Task Management System', 20, 285);
  }
  
  // Download
  const filename = `task-list-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Retrieve user answers from localStorage
 */
const DEBUG_PDF = false;
const dbg = (...args: unknown[]) => { if (DEBUG_PDF) console.log(...args); };
const getUserAnswers = (moduleId: string): Record<string, string> => {
  const answers: Record<string, string> = {};
  
  try {
    // DEBUG: Log all localStorage keys to understand the actual structure
    dbg('=== DEBUGGING getUserAnswers ===');
    dbg('Module ID:', moduleId);
    
    const allKeys = Object.keys(localStorage);
    const journeyKeys = allKeys.filter(key => key.includes('journey'));
    dbg('All localStorage keys:', allKeys);
    dbg('Journey-related keys:', journeyKeys);
    
    // Strict step key matcher to avoid '_2' erroneously matching '_12'
    const keyMatchesStep = (key: string, stepNum: number) => {
      // Match '...step_<n>' not followed by another digit OR boundary '_<n>' not followed by a digit
      // Also allow start-boundaries (^) or separators '_'/'-'
      const re = new RegExp(`(?:^|[_-])step_${stepNum}(?!\\d)|(?:^|[_-])${stepNum}(?!\\d)(?:$|[^\\d])`);
      return re.test(key);
    };
    
    // Get session ID from localStorage
    const sessionId = localStorage.getItem('journey_session_id') || 'default';
    dbg('Session ID:', sessionId);
    
    // Get step count for the module
    const stepCount = getModuleStepCount(moduleId);
    dbg('Step count for', moduleId, ':', stepCount);
    
    // Try only session-scoped journey key patterns to find the data (avoid legacy/non-session keys)
    const possibleKeyPatterns = [
      `journey_${sessionId}_${moduleId}_step_`
    ];
    
    // Narrow journey keys to current session to prevent cross-session leakage
    const sessionScopedJourneyKeys = journeyKeys.filter(key => key.includes(`journey_${sessionId}_`));

    // Retrieve answers for each step
    for (let step = 1; step <= stepCount; step++) {
      let savedData = null;
      let foundKey = null;
      
      // Try different key patterns
      for (const pattern of possibleKeyPatterns) {
        const key = `${pattern}${step}`;
        savedData = localStorage.getItem(key);
        if (savedData) {
          foundKey = key;
          dbg(`Step ${step} found data with key:`, key);
          break;
        }
      }
      
      // If no direct key found, search through session-scoped journey keys only (avoid cross-session)
      if (!savedData) {
        const stepKeys = sessionScopedJourneyKeys.filter(key => 
          key.includes(moduleId) && keyMatchesStep(key, step)
        );
        
        if (stepKeys.length > 0) {
          foundKey = stepKeys[0];
          savedData = localStorage.getItem(foundKey);
          dbg(`Step ${step} found via search with key:`, foundKey);
        }
      }
      
      dbg(`Step ${step} raw data:`, savedData);
      
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          dbg(`Step ${step} parsed data:`, parsedData);
          dbg(`Step ${step} parsed data type:`, typeof parsedData);
          // keys only when object
          if (typeof parsedData === 'object' && parsedData !== null) {
            dbg(`Step ${step} parsed data keys:`, Object.keys(parsedData as Record<string, unknown>));
          }
          // Associate candidate values strictly to current step
          const keyHasStep = !!foundKey && keyMatchesStep(foundKey, step);

          // Enhanced answer extraction logic
          let userAnswer = '';
          
          if (typeof parsedData === 'object' && parsedData !== null) {
            const obj = parsedData as Record<string, unknown>;
            dbg(`Step ${step} analyzing object structure:`, Object.keys(obj));
            
            // Strategy 1: Direct field access for common patterns
            const directFields = [
              'answer', 'response', 'value', 'text', 'content', 'userInput',
              'input', 'result', 'data'
            ];

            const isStepMatch =
              (typeof obj.step === 'number' && obj.step === step) ||
              (typeof obj.currentStep === 'number' && obj.currentStep === step) ||
              keyHasStep;
            
            for (const field of directFields) {
              const val = obj[field];
              if (isStepMatch && typeof val === 'string' && val.trim() !== '') {
                userAnswer = val.trim();
                dbg(`Step ${step} found step-scoped answer in field '${field}':`, userAnswer.substring(0, 100) + '...');
                break;
              }
            }
            
            // Strategy 2: Check for nested answer objects
            if (!userAnswer && typeof obj.answers === 'object' && obj.answers !== null) {
              const answersObj = obj.answers as Record<string, unknown>;
              dbg(`Step ${step} checking nested answers object:`, Object.keys(answersObj));
              // Prefer explicit step keys only
              const stepKey = `step${step}`;
              const ansByKey = answersObj[stepKey];
              if (typeof ansByKey === 'string') {
                userAnswer = ansByKey.trim();
                dbg(`Step ${step} found answer in answers.${stepKey}:`, userAnswer.substring(0, 100) + '...');
              } else {
                const ansByIndex = answersObj[String(step)];
                if (typeof ansByIndex === 'string') {
                  userAnswer = ansByIndex.trim();
                  dbg(`Step ${step} found answer in answers[${step}]:`, userAnswer.substring(0, 100) + '...');
                }
              }
            }
            
            // Strategy 3: Check for form data structure
            if (!userAnswer && typeof obj.formData === 'object' && obj.formData !== null) {
              const formData = obj.formData as Record<string, unknown>;
              dbg(`Step ${step} checking formData structure:`, Object.keys(formData));
              const stepMatch =
                (typeof formData.step === 'number' && formData.step === step) ||
                (typeof formData.currentStep === 'number' && formData.currentStep === step) ||
                keyHasStep;
              if (stepMatch) {
                for (const field of directFields) {
                  const val = formData[field];
                  if (typeof val === 'string' && val.trim() !== '') {
                    userAnswer = val.trim();
                    dbg(`Step ${step} found answer in formData.${field}:`, userAnswer.substring(0, 100) + '...');
                    break;
                  }
                }
              }
              if (!userAnswer) {
                const stepKey = `step${step}`;
                const val = formData[stepKey];
                if (typeof val === 'string' && val.trim() !== '') {
                  userAnswer = val.trim();
                  dbg(`Step ${step} found answer in formData.${stepKey}:`, userAnswer.substring(0, 100) + '...');
                }
              }
            }
            
            // Strategy 4: Look for textarea/input element IDs (e.g., brainstormStep5Input)
            const inputId = `${moduleId}Step${step}Input`;
            const dynVal = obj[inputId];
            if (!userAnswer && typeof dynVal === 'string') {
              userAnswer = dynVal.trim();
              dbg(`Step ${step} found answer via input ID '${inputId}':`, userAnswer.substring(0, 100) + '...');
            }
            
            // Strategy 5 removed: do not fallback to unrelated values to prevent cross-step data leakage
            
            answers[step] = userAnswer || '';
            dbg(`Step ${step} final extracted answer:`, userAnswer);
          } else {
            // If it's not an object, only accept direct string when key is step-specific
            answers[step] = (foundKey && keyMatchesStep(foundKey, step)) ? String(parsedData) : '';
            if (answers[step]) {
              dbg(`Step ${step} direct string answer:`, String(parsedData));
            } else {
              dbg(`Step ${step} non-object value ignored due to non step-specific key`);
            }
          }
        } catch (_parseError) {
          // If JSON parsing fails, only use the raw string if key maps to this step
          const keyIsStepSpecific = !!foundKey && keyMatchesStep(foundKey, step);
          answers[step] = keyIsStepSpecific ? savedData : '';
          dbg(`Step ${step} parse error, ${keyIsStepSpecific ? 'using' : 'ignoring'} raw data:`, savedData);
        }
      } else {
        dbg(`Step ${step} no data found - tried all patterns`);
        answers[step] = '';
      }
    }
    
    dbg('Final answers object:', answers);
    dbg('=== END DEBUGGING getUserAnswers ===');
  } catch (error) {
    console.warn('Error retrieving user answers from localStorage:', error);
  }
  
  return answers;
};

/**
 * Get real module content from journeyContent.json structure
 */
const getModuleContent = (moduleId: string) => {
  // This would normally be imported from journeyContent.json
  // For now, we'll include the content directly to ensure it works
  const journeyContent: Record<string, ModuleContentItem[]> = {
    "brainstorm": [
      {
        "step": 1,
        "title": "Imitate / Trends",
        "instructions": "The first step to innovation is understanding the landscape. Look at what competitors, industry leaders, and even successful entities in other fields are doing. Identifying current trends is key to seeing the opportunities.",
        "question": "How are others doing it? Have you figured out best practices, talked to experts, and followed the trends so you can keep up with what's going on? Provide examples.",
        "placeholder": "List current trends, competitor strategies, and best practices you've observed..."
      },
      {
        "step": 2,
        "title": "Ideate",
        "instructions": "Now that you've done your research, it's time to think outside the box. Don't limit yourself to what's already been done. Generate completely new, creative, and innovative concepts.",
        "question": "Now that you've done benchmarking, if we're going to get ahead we need to 'think outside the box'. What other ideas do we have?",
        "placeholder": "List all new ideas, no matter how unconventional. What if we tried a subscription model? What if we targeted a completely different customer segment?..."
      },
      {
        "step": 3,
        "title": "Ignore",
        "instructions": "Learning from failure is crucial. Some ideas didn't work, won't work, or are a waste of time. Identifying these 'anti-patterns' prevents you from repeating the mistakes of others.",
        "question": "There are things that didn't work, won't work, and are wasting our time. Can we list some 'don't do that' ideas? At least figure out what other people have tried and failed.",
        "placeholder": "List ideas to avoid, lessons from past failures, and common industry pitfalls..."
      },
      {
        "step": 4,
        "title": "Integrate",
        "instructions": "The most powerful solutions often come from combining existing ideas. How can you synthesize the examples you've found to create something more effective and efficient for your customers, providers, or internal teams?",
        "question": "How can you take the above examples and find ways to shorten the distance and speed things up regarding connections with customers, providers, and internal clients? How can we [do this] better?",
        "placeholder": "e.g., 'We can combine our competitor's pricing model with the customer support system from industry X...'"
      },
      {
        "step": 5,
        "title": "Interfere",
        "instructions": "A strong strategy includes building a competitive 'moat.' Once you're doing better, think about how you can create a sustainable advantage and make it harder for competitors to keep up.",
        "question": "Now that you're doing better, what are you going to do to slow down competitors? It's easier to pass cars going in slow motion. How can we slow them down?",
        "placeholder": "Consider strategies like securing exclusive partnerships, building a strong brand community, or creating unique technology..."
      }
    ],
    "choose": [
      {
        "step": 1,
        "title": "Scenarios",
        "instructions": "To make a good decision, you must first clearly define your options. List the different scenarios or paths you are considering. Clear definitions are the foundation of a sound decision.",
        "question": "What scenarios are being considered?",
        "placeholder": "List each option clearly. e.g., 'Option A: Develop the feature in-house. Option B: Partner with Company X. Option C: Acquire a smaller company...'"
      },
      {
        "step": 2,
        "title": "Similarities/Differences",
        "instructions": "Compare and contrast your scenarios. Understanding what they have in common and how they differ will help clarify your choices and identify the most important decision factors.",
        "question": "What are the similarities and differences between these scenarios?",
        "placeholder": "Create a comparison table or list highlighting key similarities and differences..."
      },
      {
        "step": 3,
        "title": "Stakeholders",
        "instructions": "Every decision affects multiple stakeholders. Identify who will be impacted by each scenario and how they might react. This helps you anticipate challenges and build support.",
        "question": "Who are the stakeholders and how will each scenario affect them?",
        "placeholder": "List stakeholders (customers, employees, partners, etc.) and their likely reactions to each scenario..."
      },
      {
        "step": 4,
        "title": "Success Metrics",
        "instructions": "Define what success looks like for each scenario. Clear metrics help you evaluate options objectively and track progress after implementation.",
        "question": "How will you measure success for each scenario?",
        "placeholder": "Define specific, measurable outcomes for each option (revenue targets, user growth, cost savings, etc.)..."
      },
      {
        "step": 5,
        "title": "Decision",
        "instructions": "Based on your analysis, make your decision. Document your reasoning so you can learn from this process and explain your choice to stakeholders.",
        "question": "Which scenario do you choose and why?",
        "placeholder": "State your decision clearly and provide the key reasons that led to this choice..."
      }
    ],
    "objectives": [
      {
        "step": 1,
        "title": "Objective",
        "instructions": "Start with a clear, specific objective. What exactly do you want to achieve? A well-defined goal is the foundation of any successful plan.",
        "question": "What is your main objective?",
        "placeholder": "State your objective clearly and specifically. e.g., 'Increase customer retention by 15% within 6 months'..."
      },
      {
        "step": 2,
        "title": "Key Results",
        "instructions": "Define measurable outcomes that indicate you've achieved your objective. These should be specific, time-bound metrics that clearly show progress.",
        "question": "What are the key results that will indicate success?",
        "placeholder": "List 3-5 specific, measurable outcomes with deadlines..."
      },
      {
        "step": 3,
        "title": "Activities",
        "instructions": "Break down your objective into specific activities and tasks. What concrete actions will you take to achieve your key results?",
        "question": "What activities and tasks will you complete?",
        "placeholder": "List all the specific actions, projects, and tasks needed to achieve your objective..."
      },
      {
        "step": 4,
        "title": "Resources",
        "instructions": "Identify what resources you'll need to complete your activities. This includes people, budget, tools, time, and any other requirements.",
        "question": "What resources do you need?",
        "placeholder": "List required resources: team members, budget, tools, technology, training, etc..."
      },
      {
        "step": 5,
        "title": "Timeline",
        "instructions": "Create a realistic timeline for your activities. When will each task be completed? What are the key milestones and deadlines?",
        "question": "What is your timeline and what are the key milestones?",
        "placeholder": "Create a timeline with specific dates for major milestones and task completion..."
      },
      {
        "step": 6,
        "title": "Risks",
        "instructions": "Identify potential risks and obstacles that could prevent you from achieving your objective. What could go wrong and how will you address these challenges?",
        "question": "What are the potential risks and how will you mitigate them?",
        "placeholder": "List potential risks and your mitigation strategies for each..."
      },
      {
        "step": 7,
        "title": "Accountability",
        "instructions": "Define who is responsible for what and how you'll track progress. Regular check-ins and clear ownership ensure your plan stays on track.",
        "question": "Who is accountable for each part and how will you track progress?",
        "placeholder": "Assign ownership for each activity and define your progress tracking system..."
      }
    ]
  };
  
  return journeyContent[moduleId] || [];
};

/**
 * Generate professional PDF for individual module with real content
 */
export const generateModulePDF = (moduleId: string): void => {
  const doc = new jsPDF();
  const moduleName = getModuleDisplayName(moduleId);
  const moduleDescription = getModuleDescription(moduleId);
  const moduleSteps = getModuleContent(moduleId);
  const userAnswers = getUserAnswers(moduleId);
  
  // Layout constants used for consistent pagination and measurements
  const PAGE_BOTTOM = 270; // keep clear of footer (rendered at y=285)
  const PAGE_TOP = 60;     // content start on continued pages (after header)
  const LINE_HEIGHT = 6;   // per-line vertical spacing
  const CONTENT_X = 20;    // left x for boxes/labels
  const _TEXT_X = 25;       // left x for paragraph text (unused placeholder)
  const CONTENT_WIDTH = 170; // width of content boxes
  const _BOX_PADDING = 8;   // total top+bottom padding for background boxes (unused placeholder)
  
  // Professional header with module-specific colors
  let headerColor = [41, 128, 185]; // Default blue
  if (moduleId === 'brainstorm') headerColor = [255, 193, 7]; // Yellow
  else if (moduleId === 'choose') headerColor = [0, 123, 255]; // Blue
  else if (moduleId === 'objectives') headerColor = [40, 167, 69]; // Green
  
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(moduleName, 20, 25);
  
  doc.setFontSize(14);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 20, 38);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Continued-page header drawer for this module PDF
  const onAddPage = (d: jsPDF) => {
    d.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    d.rect(0, 0, 210, 45, 'F');
    d.setTextColor(255, 255, 255);
    d.setFontSize(24);
    d.text(moduleName, 20, 25);
    d.setTextColor(0, 0, 0);
  };
  
  // Module overview
  // Descriptive copy only (no heading)
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(moduleDescription, CONTENT_WIDTH);
  let yPos = 65;
  descLines.forEach((line: string) => {
    doc.text(line, CONTENT_X, yPos);
    yPos += LINE_HEIGHT;
  });
  
  yPos += 10;
  // Simplified layout: metrics removed (Total Steps, Status)
  
  // Steps content - this is the critical missing piece!
  yPos += 20;
  doc.setFontSize(16);
  doc.text('Step-by-Step Content', 20, yPos);
  yPos += 15;
  
  moduleSteps.forEach((step: ModuleContentItem, _index: number) => {
    // Check if we need a new page before step header
    if (yPos > PAGE_BOTTOM - 30) {
      doc.addPage();
      onAddPage(doc);
      yPos = PAGE_TOP;
    }
    
    // Step header with background
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos - 5, 180, 15, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Step ${step.step}: ${step.title}`, 20, yPos + 5);
    doc.setFont('helvetica', 'normal');
    yPos += 20;
    
    // Instructions (bulletproof renderer)
    {
      const res = renderTextBlock(doc, {
        x: CONTENT_X,
        width: CONTENT_WIDTH,
        y: yPos,
        text: step.instructions,
        label: { text: 'Instructions:' },
        font: 'helvetica',
        fontStyle: 'normal',
        fontSize: 10,
        lineHeight: LINE_HEIGHT,
        page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
        marginBottom: 5,
      });
      yPos = res.y;
    }
    
    // Question (bulletproof renderer)
    {
      const res = renderTextBlock(doc, {
        x: CONTENT_X,
        width: CONTENT_WIDTH,
        y: yPos,
        text: step.question,
        label: { text: 'Question:' },
        font: 'helvetica',
        fontStyle: 'normal',
        fontSize: 10,
        lineHeight: LINE_HEIGHT,
        page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
        marginBottom: 5,
      });
      yPos = res.y;
    }
    
    // User Response Area with real answers (bulletproof renderer)
    {
      const userAnswer = userAnswers[step.step];
      const hasAnswer = !!(userAnswer && userAnswer.trim() !== '');
      const responseText = hasAnswer
        ? userAnswer
        : `[No response provided yet]\nGuidance: ${step.placeholder}`;

      const res = renderTextBlock(doc, {
        x: CONTENT_X,
        width: CONTENT_WIDTH,
        y: yPos,
        text: responseText,
        label: { text: 'Your Response:' },
        font: 'helvetica',
        fontStyle: 'normal',
        fontSize: 9,
        lineHeight: LINE_HEIGHT,
        background: {
          fill: hasAnswer ? [245, 255, 245] as [number, number, number] : [255, 245, 245] as [number, number, number],
          paddingV: 8,
          minHeight: 20,
        },
        page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
        marginBottom: 10,
      });
      yPos = res.y;
    }
    
    doc.setFontSize(10);
    
    // Add some spacing between steps
    yPos += 10;
  });
  
  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
    doc.text(`${moduleName} - Arrowhead Solution`, 20, 285);
  }
  
  // Download
  const filename = `${moduleId}-module-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Generate professional PDF for full project (tasks + all modules) with real content
 */
export const generateFullProjectPDF = (tasks: TaskData[]): void => {
  const doc = new jsPDF();
  
  // Professional cover page with gradient-style header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Arrowhead Project Report', 20, 35);
  
  doc.setFontSize(16);
  doc.text('Complete Project Export', 20, 50);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 20, 65);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Start Task List on the first page (remove blank page); place section header below cover
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Task Management Dashboard', 20, 95);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 110;
  // Proceed directly to task table
  
  // Professional task table with consistent formatting
  const tableStartX = 15;
  const tableWidth = 180;
  const colWidths = [35, 80, 40, 25]; // Status, Task, Person, Date
  const baseRowHeight = 14;
  
  // Table header with proper borders
  doc.setFillColor(240, 240, 240);
  doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight, 'F');
  
  // Header borders
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight);
  
  // Column separators for header
  let currentX = tableStartX;
  for (let i = 0; i < colWidths.length - 1; i++) {
    currentX += colWidths[i];
    doc.line(currentX, yPos - 5, currentX, yPos + 9);
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Status', tableStartX + 2, yPos + 4);
  doc.text('Task Description', tableStartX + colWidths[0] + 2, yPos + 4);
  doc.text('Person', tableStartX + colWidths[0] + colWidths[1] + 2, yPos + 4);
  doc.text('Date', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4);
  
  doc.setFont('helvetica', 'normal');
  yPos += 15;
  
  // Task rows with dynamic text wrapping and row heights
  // Local helper to force-wrap long, unbroken strings to avoid overflow
  const wrapCell = (text: string, maxWidth: number): string[] => {
    const prev = doc.getFontSize();
    doc.setFontSize(9);
    const src = (text ?? '').toString();
    const tokens = src.split(/\s+/);
    const softened: string[] = [];
    const fits = (s: string) => doc.getTextWidth(s) <= maxWidth;
    tokens.forEach(tok => {
      if (!tok) return;
      if (fits(tok)) softened.push(tok);
      else {
        let rem = tok;
        while (rem.length > 0) {
          let lo = 1, hi = rem.length, best = 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const piece = rem.slice(0, mid);
            if (fits(piece)) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
          }
          softened.push(rem.slice(0, best));
          rem = rem.slice(best);
        }
      }
    });
    const lines = doc.splitTextToSize(softened.join(' '), maxWidth);
    doc.setFontSize(prev);
    return lines;
  };

  tasks.forEach((task, index) => {
    doc.setFontSize(9);
    const cellPadding = 2;
    const dateText = formatDateSafe(task.date);
    // Pre-compute wrapped lines for each cell
    const statusLines = wrapCell(task.status, colWidths[0] - cellPadding * 2);
    const taskLines = wrapCell(task.task, colWidths[1] - cellPadding * 2);
    const personLines = wrapCell(task.person, colWidths[2] - cellPadding * 2);
    const dateLines = wrapCell(dateText, colWidths[3] - cellPadding * 2);
    const maxLines = Math.max(statusLines.length, taskLines.length, personLines.length, dateLines.length);
    const dynamicRowHeight = Math.max(baseRowHeight, maxLines * 6 + 4);
    // New page if this row won't fit
    if (yPos + dynamicRowHeight > 250) {
      doc.addPage();
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('Task Management Dashboard (continued)', 20, 13);
      doc.setTextColor(0, 0, 0);
      yPos = 35;
      // Recreate table header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(tableStartX, yPos - 5, tableWidth, baseRowHeight);
      currentX = tableStartX;
      for (let i = 0; i < colWidths.length - 1; i++) {
        currentX += colWidths[i];
        doc.line(currentX, yPos - 5, currentX, yPos + 9);
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Status', tableStartX + 2, yPos + 4);
      doc.text('Task Description', tableStartX + colWidths[0] + 2, yPos + 4);
      doc.text('Person', tableStartX + colWidths[0] + colWidths[1] + 2, yPos + 4);
      doc.text('Date', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9); // ensure body font size after page break
      yPos += 15;
    }
    // Row background (alternating)
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight, 'F');
    }
    // Row borders
    doc.setDrawColor(230, 230, 230);
    doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight);
    // Column separators
    currentX = tableStartX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      currentX += colWidths[i];
      doc.line(currentX, yPos - 2, currentX, yPos - 2 + dynamicRowHeight);
    }
    // Status with color coding
    let statusColor = [0, 0, 0] as [number, number, number];
    if (task.status.toLowerCase().includes('complete')) statusColor = [0, 128, 0];
    else if (task.status.toLowerCase().includes('progress')) statusColor = [255, 140, 0];
    else if (task.status.toLowerCase().includes('pending')) statusColor = [255, 0, 0];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    statusLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + cellPadding, yPos + 7 + i * 6);
    });
    doc.setTextColor(0, 0, 0);
    // Task description
    taskLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + cellPadding, yPos + 7 + i * 6);
    });
    // Person
    personLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + cellPadding, yPos + 7 + i * 6);
    });
    // Date
    dateLines.forEach((line: string, i: number) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + cellPadding, yPos + 7 + i * 6);
    });
    yPos += dynamicRowHeight;
  });
  
  // Add each module with full content
  const modules = [
    { id: 'brainstorm', name: 'Brainstorm Module', color: [255, 193, 7] },
    { id: 'choose', name: 'Decision Making Module', color: [0, 123, 255] },
    { id: 'objectives', name: 'Objectives Planning Module', color: [40, 167, 69] }
  ];
  
  modules.forEach((module) => {
    doc.addPage();
    
    // Module header
    doc.setFillColor(module.color[0], module.color[1], module.color[2]);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(`${module.name}`, 20, 22);
    doc.setTextColor(0, 0, 0);

    // Layout constants and continued-page header
    const PAGE_BOTTOM = 270;
    const PAGE_TOP = 40; // after continued header
    const LINE_HEIGHT = 6;
    const CONTENT_X = 20;
    const CONTENT_WIDTH = 170;

    const onAddPage = (d: jsPDF) => {
      d.setFillColor(module.color[0], module.color[1], module.color[2]);
      d.rect(0, 0, 210, 25, 'F');
      d.setTextColor(255, 255, 255);
      d.setFontSize(16);
      d.text(`${module.name} (continued)`, 20, 16);
      d.setTextColor(0, 0, 0);
      d.setFont('helvetica', 'normal');
    };

    // Module description (Direction text for Brainstorm; standard descriptions for others)
    yPos = 50;
    doc.setFontSize(11);
    const moduleDescription = getModuleDescription(module.id);
    const descLines = doc.splitTextToSize(moduleDescription, CONTENT_WIDTH);
    descLines.forEach((line: string) => {
      // Ensure we don't overflow the page while printing overview lines
      if (yPos > PAGE_BOTTOM - 10) {
        doc.addPage();
        onAddPage(doc);
        yPos = PAGE_TOP;
      }
      doc.text(line, CONTENT_X, yPos);
      yPos += LINE_HEIGHT;
    });
    yPos += 8;

    // Module steps with full content and user answers
    const moduleSteps = getModuleContent(module.id);
    const moduleUserAnswers = getUserAnswers(module.id);
    moduleSteps.forEach((step: ModuleContentItem) => {
      // Ensure room for step header
      if (yPos > PAGE_BOTTOM - 30) {
        doc.addPage();
        onAddPage(doc);
        yPos = PAGE_TOP;
      }

      // Step header
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos - 5, 180, 15, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Step ${step.step}: ${step.title}`, 20, yPos + 5);
      doc.setFont('helvetica', 'normal');
      yPos += 20;

      // Instructions (bulletproof renderer)
      {
        const res = renderTextBlock(doc, {
          x: CONTENT_X,
          width: CONTENT_WIDTH,
          y: yPos,
          text: step.instructions,
          label: { text: 'Instructions:' },
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: 10,
          lineHeight: LINE_HEIGHT,
          page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
          marginBottom: 5,
        });
        yPos = res.y;
      }

      // Question (bulletproof renderer)
      {
        const res = renderTextBlock(doc, {
          x: CONTENT_X,
          width: CONTENT_WIDTH,
          y: yPos,
          text: step.question,
          label: { text: 'Question:' },
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: 10,
          lineHeight: LINE_HEIGHT,
          page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
          marginBottom: 5,
        });
        yPos = res.y;
      }

      // User Response Area with real answers (bulletproof renderer)
      {
        const userAnswer = moduleUserAnswers[step.step];
        const hasAnswer = !!(userAnswer && userAnswer.trim() !== '');
        const responseText = hasAnswer
          ? userAnswer
          : `[No response provided yet]\nGuidance: ${step.placeholder}`;

        const res = renderTextBlock(doc, {
          x: CONTENT_X,
          width: CONTENT_WIDTH,
          y: yPos,
          text: responseText,
          label: { text: 'Your Response:' },
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: 9,
          lineHeight: LINE_HEIGHT,
          background: {
            fill: hasAnswer ? [245, 255, 245] as [number, number, number] : [255, 245, 245] as [number, number, number],
            paddingV: 8,
            minHeight: 20,
          },
          page: { topY: PAGE_TOP, bottomY: PAGE_BOTTOM, onAddPage },
          marginBottom: 10,
        });
        yPos = res.y;
      }

      doc.setFontSize(10);
      // Spacing between steps
      yPos += 10;
    });
  });
  
  // Professional footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    if (i === 1) continue; // Skip footer on the cover page to avoid overlap with TOC
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
    doc.text('Arrowhead Solution - Complete Project Report', 20, 285);
  }
  
  // Download
  const filename = `arrowhead-project-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
