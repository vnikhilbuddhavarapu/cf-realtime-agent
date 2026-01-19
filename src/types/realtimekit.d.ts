// Type declarations for @cloudflare/realtimekit
declare module "@cloudflare/realtimekit" {
  export interface RTKConfigOptions {
    authToken: string;
    roomName?: string;
    defaults?: {
      audio?: boolean;
      video?: boolean;
    };
  }

  export interface RTKSelf {
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    roomJoined: boolean;
  }

  export interface RTKClient {
    self: RTKSelf;
    leave(): Promise<void>;
    join(): Promise<void>;
  }

  export default RTKClient;
}

// Type declarations for @cloudflare/realtimekit-react
declare module "@cloudflare/realtimekit-react" {
  import type { RTKClient, RTKConfigOptions } from "@cloudflare/realtimekit";

  export function useRealtimeKitClient(params?: {
    resetOnLeave?: boolean;
  }): readonly [
    RTKClient | undefined,
    (options: RTKConfigOptions) => Promise<RTKClient | undefined>,
  ];

  export function useRealtimeKitSelector<T>(
    selector: (state: RTKClient) => T,
  ): T;
}

// Type declarations for @cloudflare/realtimekit-react-ui
declare module "@cloudflare/realtimekit-react-ui" {
  import type { RTKClient } from "@cloudflare/realtimekit";

  export interface RtkMeetingProps {
    meeting: RTKClient;
    showSetupScreen?: boolean;
  }

  export function RtkMeeting(props: RtkMeetingProps): JSX.Element;
}
