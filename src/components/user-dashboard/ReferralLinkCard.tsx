import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';

interface ReferralLinkCardProps {
  referralLink: string;
  onCopy: () => void;
  onShare: () => void;
}

export function ReferralLinkCard({ referralLink, onCopy, onShare }: ReferralLinkCardProps) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Referral Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="w-full px-3 py-2.5 pr-20 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={onCopy}
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1 h-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={onShare}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          size="lg"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Link
        </Button>
      </CardContent>
    </Card>
  );
}

