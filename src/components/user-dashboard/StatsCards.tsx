import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  totalReferrals: number;
  referralPoints: number;
  availablePoints: number;
}

export function StatsCards({ totalReferrals, referralPoints, availablePoints }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="shadow-md">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalReferrals}</div>
          <div className="text-xs text-gray-600 mt-1">Referrals</div>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{referralPoints}</div>
          <div className="text-xs text-gray-600 mt-1">Points</div>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{availablePoints}</div>
          <div className="text-xs text-gray-600 mt-1">Available</div>
        </CardContent>
      </Card>
    </div>
  );
}

