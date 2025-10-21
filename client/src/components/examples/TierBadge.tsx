import { TierBadge } from '../TierBadge';

export default function TierBadgeExample() {
  return (
    <div className="p-4 space-x-2">
      <TierBadge tier="basic" />
      <TierBadge tier="pro" />
      <TierBadge tier="pro_plus" />
    </div>
  );
}
