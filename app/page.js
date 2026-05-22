import FloorPlanEditor from '@/components/FloorPlanEditor';

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="hero">
        <h1>Floor Plan</h1>
        <p>Draw walls, assign room labels, and apply traditional flooring materials.</p>
      </header>
      <FloorPlanEditor />
    </main>
  );
}
