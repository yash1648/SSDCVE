import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ChainStatusCard } from '../components/verifier/ChainStatusCard';
import { RecentAnchorsList } from '../components/verifier/RecentAnchorsList';
import { FileDropzone } from '../components/common/FileDropzone';
import { VerificationResultHero } from '../components/verifier/VerificationResultHero';
import { BatchVerifySection } from '../components/verifier/BatchVerifySection';
import { AnchorLookupSection } from '../components/verifier/AnchorLookupSection';
import { VerifierHistoryPage } from './VerifierHistoryPage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  LayoutDashboard,
  FileCheck2,
  Layers,
  Search,
  History,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { verifierApi } from '../lib/api';
import { toast } from 'sonner';
import type { VerificationResult } from '../types';

type VerifierTab = 'overview' | 'verify' | 'batch' | 'anchor' | 'history';

const tabFromPath = (pathname: string): VerifierTab => {
  const seg = pathname.replace(/^\/verifier\/?/, '');
  if (seg === 'verify') return 'verify';
  if (seg === 'batch') return 'batch';
  if (seg === 'anchor') return 'anchor';
  if (seg === 'history') return 'history';
  return 'overview';
};

export const VerifierLanding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VerifierTab>(() => tabFromPath(location.pathname));

  // Sidebar links point at these subpaths, so the tab follows the URL.
  React.useEffect(() => {
    setActiveTab(tabFromPath(location.pathname));
  }, [location.pathname]);

  const showTab = (tab: VerifierTab) => {
    setActiveTab(tab);
    navigate(tab === 'overview' ? '/verifier' : `/verifier/${tab}`);
  };

  // Single verify state
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [isVerifyingSingle, setIsVerifyingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<VerificationResult | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');

  const handleSingleDrop = async (files: File[]) => {
    setSelectedFile(files);
    if (files.length === 0) return;
    setIsVerifyingSingle(true);
    setSingleResult(null);
    setSingleError(null);

    try {
      const res = await verifierApi.verifyFile(files[0]);
      setSingleResult(res);
      if (res.status === 'VALID') {
        toast.success('This certificate is genuine.');
      }
    } catch {
      setSingleError('Could not check that file. Make sure it is a certificate file, then try again.');
    } finally {
      setIsVerifyingSingle(false);
    }
  };

  const handleResetSingle = () => {
    setSingleResult(null);
    setSelectedFile([]);
    setSingleError(null);
  };

  // By-ID lookup stays public: hand off to the public /verify/:id route.
  const handleManualIdLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualId.trim();
    if (!trimmed) return;
    navigate(`/verify/${trimmed}`);
  };

  return (
    <AppShell title="Checker home">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => showTab(v as VerifierTab)}
          className="space-y-6"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl">
            <TabsTrigger value="overview" className="gap-2 text-xs font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Network Overview
            </TabsTrigger>
            <TabsTrigger value="verify" className="gap-2 text-xs font-semibold">
              <FileCheck2 className="w-3.5 h-3.5" />
              Verify Single
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              Batch Verification
            </TabsTrigger>
            <TabsTrigger value="anchor" className="gap-2 text-xs font-semibold">
              <Search className="w-3.5 h-3.5" />
              Anchor Lookup
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
              <History className="w-3.5 h-3.5" />
              Audit History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ChainStatusCard />

            {/* Quick Action Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card
                onClick={() => showTab('verify')}
                className="border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              >
                <CardHeader className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold">Check a certificate</CardTitle>
                  <CardDescription className="text-xs">
                    Check one certificate file and get a clear answer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:underline">
                    Open Single Verifier <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>

              <Card
                onClick={() => showTab('batch')}
                className="border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              >
                <CardHeader className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold">Check many at once</CardTitle>
                  <CardDescription className="text-xs">
                    Check many certificate files at once.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:underline">
                    Start checking <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>

              <Card
                onClick={() => showTab('anchor')}
                className="border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              >
                <CardHeader className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Search className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold">Ledger lookup</CardTitle>
                  <CardDescription className="text-xs">
                    Find the independent ledger entry for any certificate reference.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:underline">
                    Look up <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Recently recorded */}
            <RecentAnchorsList />
          </TabsContent>

          {/* Single Verify Tab */}
          <TabsContent value="verify" className="space-y-6">
            {singleResult ? (
              <VerificationResultHero
                result={singleResult}
                onReset={handleResetSingle}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                  <FileDropzone
                    accept=".json,application/json"
                    label="Drop a certificate file (.json) here"
                    description="Checking starts as soon as the file is added"
                    selectedFiles={selectedFile}
                    onFileSelect={handleSingleDrop}
                    onClear={() => setSelectedFile([])}
                    disabled={isVerifyingSingle}
                  />

                  {isVerifyingSingle && (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center text-xs text-primary font-semibold flex items-center justify-center gap-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking the certificate…</span>
                    </div>
                  )}

                  {singleError && (
                    <div
                      role="alert"
                      className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive"
                    >
                      {singleError}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Search className="w-4 h-4" />
                        <CardTitle className="text-sm font-semibold">Check by reference</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Type the reference number from a printed certificate.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleManualIdLookup} className="space-y-3">
                        <Input
                          placeholder="e.g. 123e4567-e89b..."
                          value={manualId}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualId(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="submit"
                          disabled={!manualId.trim()}
                          className="w-full font-semibold gap-1.5 text-xs h-9"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Lookup & Verify
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Batch Verify Tab */}
          <TabsContent value="batch" className="space-y-6">
            <BatchVerifySection />
          </TabsContent>

          {/* Anchor Lookup Tab */}
          <TabsContent value="anchor" className="space-y-6">
            <AnchorLookupSection />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <VerifierHistoryPage />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};
