import { useRef, useState, ComponentRef } from 'react';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export function useCamera() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<ComponentRef<typeof Camera>>(null);
  const [isActive, setIsActive] = useState(false);

  return {
    device,
    hasPermission,
    requestPermission,
    cameraRef,
    isActive,
    setIsActive,
  };
}
