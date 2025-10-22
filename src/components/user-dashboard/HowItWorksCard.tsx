import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function HowItWorksCard() {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">How It Works</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-sm">Share Your Link</h4>
              <p className="text-xs text-gray-600 mt-0.5">Send to friends & family</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-sm">They Sign Up</h4>
              <p className="text-xs text-gray-600 mt-0.5">Using your referral code</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-sm">Earn Rewards</h4>
              <p className="text-xs text-gray-600 mt-0.5">Get points when they verify</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

