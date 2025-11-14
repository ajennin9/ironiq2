import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import Colors from '@/constants/colors';

// Custom tab bar wrapper to ensure proper centering with absolute positioning
function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tabBarStyles.container}>
      <View style={tabBarStyles.pill}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = isFocused ? '#FEFEFF' : '#6E6E6E';
          const circleColor = isFocused ? '#A79AFF' : '#2C2D2E';

          return (
            <TouchableOpacity
              key={route.key}
              style={tabBarStyles.iconContainer}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <View style={[tabBarStyles.iconCircle, { backgroundColor: circleColor }]}>
                <Image
                  source={route.name === 'index'
                    ? require('@/assets/icons/home.png')
                    : require('@/assets/icons/history.png')
                  }
                  style={[tabBarStyles.icon, { tintColor: iconColor }]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 140,
    height: 75,
    backgroundColor: Colors.navBackground,
    borderRadius: 37.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 59,
    height: 59,
    borderRadius: 29.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 35,
    height: 35,
  },
});

export default function TabsLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  // Don't render tabs while loading or if not authenticated
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.navIconInactive,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
    </Tabs>
  );
}
