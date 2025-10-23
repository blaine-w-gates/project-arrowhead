#!/usr/bin/env bash
# Add SUPERSEDED banner to archived markdown files

add_banner() {
    local file="$1"
    local current_doc="$2"
    local date="October 23, 2025"
    
    # Create temp file with banner
    cat > "${file}.tmp" << EOF
---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** $current_doc  
**Archived:** $date  
---

EOF
    
    # Append original content
    cat "$file" >> "${file}.tmp"
    
    # Replace original
    mv "${file}.tmp" "$file"
    
    echo "✓ Added banner to $(basename $file)"
}

# Sprint Plans
for file in docs/archive/sprint-plans/*.md; do
    add_banner "$file" "Sprint_Plan_v8.0.md"
done

# SLADs
for file in docs/archive/slad/*.md; do
    add_banner "$file" "SLAD_v5.2_Final.md"
done

# PRDs
for file in docs/archive/prd/*.md; do
    add_banner "$file" "PRD_v4.2_Draft.md (will become PRD_v5.0)"
done

# OMDLs
for file in docs/archive/omdl/*.md; do
    add_banner "$file" "OMDL_v11.2_Draft.md (will become Final)"
done

# Process Docs
add_banner "docs/archive/process-docs/Phoenix_Protocol_Charter_v7.3_Final.md" "OMDL_v11.2_Draft.md (Appendix C)"
add_banner "docs/archive/process-docs/Cascade_Prompting_Guide_v1.0.md" "OMDL_v11.2_Draft.md (Appendix B)"
add_banner "docs/archive/process-docs/Cascade_Calibration_v4.0.md" "OMDL_v11.2_Draft.md"
add_banner "docs/archive/process-docs/Cascade_Calibration_v4.0_Final.md" "OMDL_v11.2_Draft.md"
add_banner "docs/archive/process-docs/Cascade_Calibration_PDF_System_Addendum_v1.0.md" "N/A (historical feature)"
add_banner "docs/archive/process-docs/Manual_Testing_Protocol_v1.0.md" "TESTING_STRATEGY.md"

# Operations
add_banner "docs/archive/operations/Project_Arrowhead_OS_v1.md" "OMDL_v11.2_Draft.md"
add_banner "docs/archive/operations/rls-apply.md" "docs/data-health-runbook.md"

echo ""
echo "✓ All banners added successfully"
