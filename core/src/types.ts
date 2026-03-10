export interface TelemetryEntry {
  rpm: number; // Array index 0
  speed: number; // Array index 2
  gear: number; // Array index 3
  throttle: number; // Array index 4
  brake: boolean; // Array index 5
}

export interface TimingData {
  racingNumber: string;
  gapToLeader: string;
  gapToPassenger: string;
  sector1: string;
  sector2: string;
  sector3: string;
}
