import React, { forwardRef } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

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

export const SafeBottomSheet = forwardRef<BottomSheet, SafeBottomSheetProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <BottomSheet ref={ref} {...rest}>
      <BottomSheetView style={{ flex: 1 }}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
});

SafeBottomSheet.displayName = 'SafeBottomSheet';
export default SafeBottomSheet;
