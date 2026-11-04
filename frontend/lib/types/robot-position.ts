import type { RobotStatus } from "./robot";

export type RobotPosition = {
  id: number;
  robot_id: number;
  lat: number;
  lon: number;
  status: RobotStatus;
  recorded_at: string;
};
