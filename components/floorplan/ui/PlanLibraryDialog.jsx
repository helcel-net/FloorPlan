function formatUpdatedAt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
}

export default function PlanLibraryDialog({ open, projects, activeProjectId, onSelect, onDelete, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Saved plans" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Open a saved plan</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {projects.length === 0 ? (
          <p className="modal-empty">No saved plans yet. Save your current plan to see it here.</p>
        ) : (
          <div className="plan-library-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className={project.id === activeProjectId ? 'plan-card plan-card-active' : 'plan-card'}
              >
                <button
                  type="button"
                  className="plan-card-preview"
                  onClick={() => onSelect(project.id)}
                  aria-label={`Load ${project.name || 'Untitled Plan'}`}
                >
                  {project.preview ? (
                    <img src={project.preview} alt="" />
                  ) : (
                    <span className="plan-card-placeholder">No preview</span>
                  )}
                </button>
                <div className="plan-card-meta">
                  <span className="plan-card-name">{project.name || 'Untitled Plan'}</span>
                  <span className="plan-card-date">{formatUpdatedAt(project.updatedAt || project.createdAt)}</span>
                </div>
                <button
                  type="button"
                  className="plan-card-delete"
                  onClick={() => onDelete(project.id, project.name)}
                  aria-label={`Delete ${project.name || 'Untitled Plan'}`}
                  title="Delete this plan"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
