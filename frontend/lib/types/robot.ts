export type RobotStatus = "idle" | "moving";

export type Robot = {
  id: number;
  name: string;
  status: RobotStatus;
  lat: number;
  lon: number;
  updated_at: string;
};
