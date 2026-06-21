interface Stat {
  label: string;
  value: number;
  detail?: string;
}

interface StatsGridProps {
  stats: Stat[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="stats" aria-label="Database statistics">
      {stats.map((stat) => (
        <article key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
          {stat.detail && <small title={stat.detail}>{stat.detail}</small>}
        </article>
      ))}
    </section>
  );
}
