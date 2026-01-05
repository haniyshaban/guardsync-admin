import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { SystemConfig } from '@/types';
import { defaultSystemConfig } from '@/data/mockData';
import { 
  Settings, 
  Sparkles, 
  MapPin, 
  Camera, 
  Clock, 
  Wifi,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const updateConfig = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated successfully.",
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setConfig(defaultSystemConfig);
    setHasChanges(false);
    toast({
      title: "Settings reset",
      description: "Configuration has been restored to defaults.",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">System Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Configure API providers and system settings
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="w-full sm:w-auto">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="glow" onClick={handleSave} disabled={!hasChanges} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Premium Toggle */}
        <Card variant="glow" className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-lg">Premium API Mode</CardTitle>
                  <CardDescription>
                    Enable paid API services for enhanced accuracy and features
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={config.usePremiumAPIs}
                onCheckedChange={(checked) => {
                  updateConfig('usePremiumAPIs', checked);
                  if (checked) {
                    updateConfig('faceRecognition', 'aws-rekognition');
                    updateConfig('mapProvider', 'google-maps');
                  } else {
                    updateConfig('faceRecognition', 'local');
                    updateConfig('mapProvider', 'openstreetmap');
                  }
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={config.usePremiumAPIs ? 'warning' : 'secondary'}>
                {config.usePremiumAPIs ? 'Premium Active' : 'Free Tier'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {config.usePremiumAPIs 
                  ? 'Using AWS Rekognition & Google Maps APIs' 
                  : 'Using open-source face-api.js & OpenStreetMap'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Face Recognition Settings */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Face Recognition</CardTitle>
                <CardDescription>
                  Configure facial recognition provider for attendance verification
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => updateConfig('faceRecognition', 'local')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.faceRecognition === 'local'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Local Processing</h4>
                  <Badge variant="success">Free</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Uses face-api.js for on-device facial matching
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    No API costs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Privacy-focused
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    ~85% accuracy
                  </li>
                </ul>
              </div>

              <div
                onClick={() => updateConfig('faceRecognition', 'aws-rekognition')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.faceRecognition === 'aws-rekognition'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">AWS Rekognition</h4>
                  <Badge variant="warning">Premium</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Cloud-based facial recognition with high accuracy
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    99.9% accuracy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Liveness detection
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    ~$0.001 per face
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Provider Settings */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Map Provider</CardTitle>
                <CardDescription>
                  Select the map tiles and geocoding service
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => updateConfig('mapProvider', 'openstreetmap')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.mapProvider === 'openstreetmap'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">OpenStreetMap</h4>
                  <Badge variant="success">Free</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Open-source map tiles with Nominatim geocoding
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    No API key needed
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Unlimited requests
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    Basic styling
                  </li>
                </ul>
              </div>

              <div
                onClick={() => updateConfig('mapProvider', 'google-maps')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.mapProvider === 'google-maps'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Google Maps</h4>
                  <Badge variant="warning">Premium</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Premium maps with Places & Geocoding APIs
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Precise geocoding
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Street View support
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    ~$7/1000 requests
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Settings */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Operational Settings</CardTitle>
                <CardDescription>
                  Configure timing and thresholds for guard operations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="wakeup-interval">Wake-up Alert Interval (hours)</Label>
                <Input
                  id="wakeup-interval"
                  type="number"
                  value={config.wakeUpIntervalHours}
                  onChange={(e) => updateConfig('wakeUpIntervalHours', parseInt(e.target.value) || 2)}
                  min={1}
                  max={8}
                />
                <p className="text-xs text-muted-foreground">
                  How often guards receive wake-up notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geofence-radius">Default Geofence Radius (meters)</Label>
                <Input
                  id="geofence-radius"
                  type="number"
                  value={config.geofenceDefaultRadius}
                  onChange={(e) => updateConfig('geofenceDefaultRadius', parseInt(e.target.value) || 100)}
                  min={50}
                  max={500}
                />
                <p className="text-xs text-muted-foreground">
                  Default radius for new site geofences
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-interval">Offline Sync Interval (minutes)</Label>
                <Input
                  id="sync-interval"
                  type="number"
                  value={config.offlineSyncInterval}
                  onChange={(e) => updateConfig('offlineSyncInterval', parseInt(e.target.value) || 5)}
                  min={1}
                  max={30}
                />
                <p className="text-xs text-muted-foreground">
                  How often the mobile app syncs offline data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
