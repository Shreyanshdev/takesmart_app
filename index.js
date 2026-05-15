import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

// Ignore InteractionManager deprecation warnings coming from third-party libraries (e.g. React Navigation)
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

enableScreens(true);

AppRegistry.registerComponent(appName, () => App);
