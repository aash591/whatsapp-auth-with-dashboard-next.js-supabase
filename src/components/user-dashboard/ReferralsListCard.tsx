import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Clock, Users } from 'lucide-react';

interface Referral {
  id: string;
  name: string;
  phone: string;
  verified: boolean;
  joinedAt: string;
  verifiedAt?: string;
}

interface ReferralsListCardProps {
  referrals: Referral[];
  loading: boolean;
}

export function ReferralsListCard({ referrals, loading }: ReferralsListCardProps) {
  const verifiedCount = referrals.filter(r => r.verified).length;
  const pendingCount = referrals.filter(r => !r.verified).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Your Referrals
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {verifiedCount}
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              {pendingCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Users className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">No referrals yet</p>
            <p className="text-xs text-gray-400 mt-1">Share your link to get started!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`text-white ${referral.verified ? 'bg-green-500' : 'bg-orange-500'}`}>
                      {referral.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{referral.name}</div>
                    <div className="text-xs text-gray-500">{referral.phone}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Joined {formatDate(referral.joinedAt)}
                    </div>
                  </div>
                </div>
                <div>
                  {referral.verified ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

