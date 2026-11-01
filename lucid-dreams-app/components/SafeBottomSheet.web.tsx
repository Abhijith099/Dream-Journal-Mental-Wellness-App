import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

interface SafeBottomSheetProps {
  index?: number;
  snapPoints: string[];
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  backgroundStyle?: any;
  handleIndicatorStyle?: any;
  enableContentPanningGesture?: boolean;
  children: React.ReactNode;
}

export interface SafeBottomSheetRef {
  expand: () => void;
  close: () => void;
}

export const SafeBottomSheet = forwardRef<any, SafeBottomSheetProps>((props, ref) => {
  const { children, onClose } = props;
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    expand: () => {
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      if (onClose) onClose();
    }
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        setVisible(false);
        if (onClose) onClose();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
      >
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetContainer}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E2DC',
  },
  content: {
    flex: 1,
  },
});

SafeBottomSheet.displayName = 'SafeBottomSheet';
export default SafeBottomSheet;
