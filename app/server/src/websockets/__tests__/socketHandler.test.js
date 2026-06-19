import { jest } from '@jest/globals';

describe("Capa de Transporte WebSocket", () => {
  let setupSockets, mockSimulator;
  
  beforeEach(async () => {
    jest.resetModules();
    
    mockSimulator = {
      setSimulationZone: jest.fn(), clearSimulationZone: jest.fn(),
      setRobotMode: jest.fn(), setManualVelocity: jest.fn(),
      setSpeedLimit: jest.fn(), queueNavPoint: jest.fn(),
      setNavigationTarget: jest.fn(), pauseSimulation: jest.fn(),
      resumeSimulation: jest.fn(), cancelSimulation: jest.fn(),
    };

    jest.unstable_mockModule('../../simulator.js', () => mockSimulator);
    const module = await import('../socketHandler.js');
    setupSockets = module.setupSockets;
  });

  it("Debería registrar oyentes y propagar cargas al simulador", () => {
    const socketEvents = {};
    const mockSocket = {
      id: "mock-123",
      on: jest.fn((event, callback) => { socketEvents[event] = callback; })
    };
    
    const mockIo = {
      on: jest.fn((event, callback) => {
        if (event === "connection") callback(mockSocket);
      })
    };

    setupSockets(mockIo); 

    socketEvents["client:update_zone"]({ points: [] });
    expect(mockSimulator.setSimulationZone).toHaveBeenCalledWith({ points: [] });

    socketEvents["client:clear_zone"]();
    expect(mockSimulator.clearSimulationZone).toHaveBeenCalled();

    socketEvents["client:change_mode"]("auto");
    expect(mockSimulator.setRobotMode).toHaveBeenCalledWith("auto");

    socketEvents["client:manual_control"]({ x: 1, y: 2 });
    expect(mockSimulator.setManualVelocity).toHaveBeenCalledWith(1, 2);

    socketEvents["client:set_speed_limit"](5);
    expect(mockSimulator.setSpeedLimit).toHaveBeenCalledWith(5);

    socketEvents["client:queue_point"]({ lat: 0, lon: 0 });
    expect(mockSimulator.queueNavPoint).toHaveBeenCalledWith({ lat: 0, lon: 0 });

    socketEvents["client:navigate_to"]({ lat: 1, lon: 2, clearQueue: true });
    expect(mockSimulator.setNavigationTarget).toHaveBeenCalledWith(1, 2, true);

    socketEvents["client:pause_mission"]();
    expect(mockSimulator.pauseSimulation).toHaveBeenCalled();

    socketEvents["client:resume_mission"]();
    expect(mockSimulator.resumeSimulation).toHaveBeenCalled();

    socketEvents["client:cancel_mission"]();
    expect(mockSimulator.cancelSimulation).toHaveBeenCalled();

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    socketEvents["disconnect"]();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("desconectado"));
    consoleSpy.mockRestore();
  });
});
