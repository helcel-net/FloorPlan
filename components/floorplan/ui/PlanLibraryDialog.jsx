import { useEffect } from 'react';

function formatUpdatedAt(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function PlanLibraryDialog({ open, projects, activeProjectId, onSelect, onDelete, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
            {projects.map((project) => {
              const planName = project.name || 'Untitled Plan';
              return (
                <div
                  key={project.id}
                  className={project.id === activeProjectId ? 'plan-card plan-card-active' : 'plan-card'}
                >
                  <button
                    type="button"
                    className="plan-card-preview"
                    onClick={() => onSelect(project.id)}
                    aria-label={`Load ${planName}`}
                  >
                    {project.preview ? (
                      // project.preview is a locally-generated base64 PNG data URL
                      // (capturePlanPreview), not a static/remote asset next/image's
                      // optimizer can do anything useful with.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.preview} alt="" />
                    ) : (
                      <span className="plan-card-placeholder">No preview</span>
                    )}
                  </button>
                  <div className="plan-card-meta">
                    <span className="plan-card-name">{planName}</span>
                    <span className="plan-card-date">{formatUpdatedAt(project.updatedAt || project.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    className="plan-card-delete"
                    onClick={() => onDelete(project.id, project.name)}
                    aria-label={`Delete ${planName}`}
                    title="Delete this plan"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
