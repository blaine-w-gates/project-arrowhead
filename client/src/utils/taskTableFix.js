// Task Table Text Wrapping Fix for PDF Export
// This file contains the improved logic for proper text wrapping in task tables

function renderTaskTableWithWrapping(doc, tasks, tableStartX, tableWidth, colWidths, baseRowHeight, yPos) {
  const cellPadding = 2;
  
  tasks.forEach((task, index) => {
    // Calculate text wrapping for each column BEFORE rendering
    doc.setFontSize(9);
    
    // Split text to fit in each column width
    const statusLines = doc.splitTextToSize(task.status, colWidths[0] - 4);
    const taskLines = doc.splitTextToSize(task.task, colWidths[1] - 4);
    const personLines = doc.splitTextToSize(task.person, colWidths[2] - 4);
    const dateText = new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const dateLines = doc.splitTextToSize(dateText, colWidths[3] - 4);
    
    // Calculate required row height based on maximum lines in any column
    const maxLines = Math.max(statusLines.length, taskLines.length, personLines.length, dateLines.length);
    const dynamicRowHeight = Math.max(baseRowHeight, maxLines * 10 + 4);
    
    // Row background (alternating) with dynamic height
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight, 'F');
    }
    
    // Row borders with dynamic height
    doc.setDrawColor(230, 230, 230);
    doc.rect(tableStartX, yPos - 2, tableWidth, dynamicRowHeight);
    
    // Column separators with dynamic height
    let currentX = tableStartX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      currentX += colWidths[i];
      doc.line(currentX, yPos - 2, currentX, yPos - 2 + dynamicRowHeight);
    }
    
    // Status with color coding and proper text wrapping
    let statusColor = [0, 0, 0];
    if (task.status.toLowerCase().includes('complete')) statusColor = [0, 128, 0];
    else if (task.status.toLowerCase().includes('progress')) statusColor = [255, 140, 0];
    else if (task.status.toLowerCase().includes('pending')) statusColor = [255, 0, 0];
    
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    statusLines.forEach((line, lineIndex) => {
      doc.text(line, tableStartX + cellPadding, yPos + 7 + (lineIndex * 10));
    });
    doc.setTextColor(0, 0, 0);
    
    // Task description with proper text wrapping
    taskLines.forEach((line, lineIndex) => {
      doc.text(line, tableStartX + colWidths[0] + cellPadding, yPos + 7 + (lineIndex * 10));
    });
    
    // Person with proper text wrapping
    personLines.forEach((line, lineIndex) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + cellPadding, yPos + 7 + (lineIndex * 10));
    });
    
    // Date with proper text wrapping
    dateLines.forEach((line, lineIndex) => {
      doc.text(line, tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + cellPadding, yPos + 7 + (lineIndex * 10));
    });
    
    // Move to next row with dynamic spacing
    yPos += dynamicRowHeight;
  });
  
  return yPos;
}

export { renderTaskTableWithWrapping };
