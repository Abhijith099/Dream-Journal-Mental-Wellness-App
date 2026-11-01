const React = require('react');
const { View } = require('react-native');

const Camera = React.forwardRef((props, ref) => React.createElement(View, props));
const useCameraDevice = () => null;
const useCameraFormat = () => null;
const useFrameProcessor = () => () => {};
const useCameraPermission = () => ({ hasPermission: true, requestPermission: async () => true });
const VisionCameraProxy = {
  initFrameProcessorPlugin: () => null,
};

module.exports = {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  useCameraPermission,
  VisionCameraProxy,
};
