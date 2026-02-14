import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/shared/ErrorBoundary';
import { configurePushNotifications } from './src/services/notification/notification.service';
import { logger } from './src/utils/logger';

import { SocketListener } from './src/components/shared/SocketListener';

import * as NavigationService from './src/services/navigation/NavigationService';

// Initialize push notifications early
configurePushNotifications((data) => {
  logger.log('Notification opened with data:', data);
  if (!data) return;

  if (data.type === 'new_order') {
    NavigationService.navigate('PartnerTabs', { screen: 'PartnerHome' });
  } else if (['order_picked_up', 'order_delivered', 'order_accepted', 'order_confirmed'].includes(data.type)) {
    NavigationService.navigate('OrderTracking', { orderId: data.orderId });
  }
});

const App = () => {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SocketListener />
        <RootNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

export default App;
