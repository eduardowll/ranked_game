import type { VideoRankingItem } from '../services/api';

interface RankingCardProps {
  video: VideoRankingItem;
  position: number;
}

export default function RankingCard({ video, position }: RankingCardProps) {
  return (
    <article className="ranking-card" style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1.25rem', border: '1px solid #4d3172', borderRadius: 18 }}>
      <strong>#{position}</strong>
      <div>
        <strong>{video.nome || video.video_id}</strong>
        <div>{video.torneios_vencidos} vitórias em torneios</div>
      </div>
      <strong>{video.porcentagem_vitoria}%</strong>
    </article>
  );
}
