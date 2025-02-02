import { CloudLightning, CloudOff } from "react-feather";
import Button from "./Button";

function SessionStopped({ startSession, isActivating }) {
  function handleStartSession() {
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-red-600"}
        icon={<CloudLightning height={16} />}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex items-center justify-center w-full gap-4">
      <Button onClick={stopSession} icon={<CloudOff height={16} />}>
        disconnect
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  isSessionActive,
  isActivating,
}) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 pt-4 rounded-md">
      {isSessionActive ? (
        <SessionActive stopSession={stopSession} />
      ) : (
        <SessionStopped
          isActivating={isActivating}
          startSession={startSession}
        />
      )}
    </div>
  );
}
