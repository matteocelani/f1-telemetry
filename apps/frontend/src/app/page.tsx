'use client';

import { useEffect } from 'react';
import { useF1Store } from '@/store/useF1Store';

export default function Home() {
  const { isConnected, telemetry, setConnected, setTelemetry } = useF1Store();

  useEffect(() => {
    // Connect to the local Node.js WebSocket backend
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('Connected to F1 Telemetry Backend');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.channel === 'CarData.z' && payload.data) {
        setTelemetry(payload.data);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from F1 Telemetry Backend');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [setConnected, setTelemetry]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600/30">
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header Section */}
        <header className="mb-12 border-b border-white/10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <span className="text-red-600">🏎️</span> F1 Telemetry
            </h1>
            <p className="text-neutral-400 font-medium">
              Live Pit Wall Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 rounded-full border border-white/5 shadow-inner">
            <div className="relative flex h-3 w-3">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              ></span>
            </div>
            <span className="text-sm font-semibold tracking-wide uppercase text-neutral-300">
              {isConnected ? 'Live Data' : 'Disconnected'}
            </span>
          </div>
        </header>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* RPM Card */}
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:bg-neutral-800/80 hover:border-white/10">
            <h3 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">
              Engine Speed
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold tracking-tighter text-white">
                {telemetry ? telemetry.rpm : '----'}
              </span>
              <span className="text-neutral-500 font-medium tracking-wide">
                RPM
              </span>
            </div>
            {telemetry && (
              <div className="mt-6 h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min((telemetry.rpm / 12000) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Speed Card */}
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:bg-neutral-800/80 hover:border-white/10">
            <h3 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">
              Velocity
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold tracking-tighter text-white">
                {telemetry ? telemetry.speed : '---'}
              </span>
              <span className="text-neutral-500 font-medium tracking-wide">
                KM/H
              </span>
            </div>
          </div>

          {/* Inputs Card */}
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:bg-neutral-800/80 hover:border-white/10 md:col-span-2 lg:col-span-1">
            <h3 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-6">
              Driver Inputs
            </h3>
            <div className="space-y-6">
              {/* Throttle */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-neutral-300 font-medium">Throttle</span>
                  <span className="text-xl font-mono font-bold">
                    {telemetry ? telemetry.throttle : '--'}%
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150 ease-out"
                    style={{ width: `${telemetry?.throttle || 0}%` }}
                  />
                </div>
              </div>

              {/* Brake */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-neutral-300 font-medium">Brake</span>
                  <span className="text-xl font-mono font-bold">
                    {telemetry && telemetry.brake ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ease-out ${
                      telemetry?.brake ? 'w-full bg-red-500' : 'w-0'
                    }`}
                  />
                </div>
              </div>

              {/* Gear */}
              <div className="flex justify-between items-end pt-2 border-t border-white/5">
                <span className="text-neutral-300 font-medium">Gear</span>
                <span className="text-2xl font-mono font-bold text-amber-500">
                  {telemetry ? telemetry.gear : '-'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Empty State / Loading */}
        {!isConnected && (
          <div className="mt-12 p-8 text-center bg-neutral-900/50 border border-white/5 rounded-2xl border-dashed">
            <p className="text-neutral-400">
              Waiting for connection to the local SignalR telemetry bridge...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
