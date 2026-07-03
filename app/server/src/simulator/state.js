export class SimulatorState {
  BASE_LAT = 42.36317;
  BASE_LON = -3.69882;

  constructor() {
    this.currentLat = this.BASE_LAT;
    this.currentLon = this.BASE_LON;
    this.battery = 100;
    this.isCharging = false;
    this.heading = 0;
    this.speed = 0;
    this.baseIdleCounter = 0;
    this.idleTicksCounter = 0;
    
    this.controlMode = "MANUAL";
    this.manualVelocity = { x: 0, y: 0 };
    
    this.navTarget = null;
    this.navQueue = [];
    this.speedLimitPercent = 50;
    
    this.safeZonePolygon = null;
    this.autoPath = [];
    this.currentPathIndex = 0;
    
    this.isPaused = false;
    this.interruptedState = null;
    
    this.accumulatedConsumed = 0;
    this.accumulatedGenerated = 0;
  }
}

export const state = new SimulatorState();
