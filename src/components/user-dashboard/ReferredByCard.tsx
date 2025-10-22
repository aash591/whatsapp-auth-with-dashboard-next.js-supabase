import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReferredByCardProps {
  referredByCode: string;
  referrerName: string | null;
}

export function ReferredByCard({ referredByCode, referrerName }: ReferredByCardProps) {
  return (
    <Card className="shadow-md bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-purple-600">✨</span> You Were Referred!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
          <div>
            <div className="text-xs text-gray-500">Referred by</div>
            <div className="font-semibold text-gray-900">
              {referrerName || 'Loading...'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Code</div>
            <div className="font-mono font-semibold text-purple-600">
              {referredByCode}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

