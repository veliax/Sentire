import { RiskLevel } from '../../types';
import { Badge } from '../ui/badge';

interface RiskBadgeProps {
  level: RiskLevel;
}

const variants: Record<RiskLevel, string> = {
  low: 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
};

const labels: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <Badge className={variants[level]}>
      {labels[level]}
    </Badge>
  );
}
