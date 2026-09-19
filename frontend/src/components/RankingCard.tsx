import type { VideoRankingItem } from '../services/api';

interface RankingCardProps {
  video: VideoRankingItem;
  position: number;
}

export default function RankingCard({ video, position }: RankingCardProps) {
  return (
    <article style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10 }}>
      <strong>#{position}</strong>
      <div>
        <strong>{video.nome || video.video_id}</strong>
        <div>{video.torneios_vencidos} vitórias em torneios</div>
      </div>
      <strong>{video.porcentagem_vitoria}%</strong>
    </article>
  );
}
