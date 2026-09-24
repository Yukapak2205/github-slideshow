import { Tabs } from 'expo-router'
import { colores } from '@/theme'

export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.crema },
        headerTintColor: colores.tinta,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colores.cobre,
        tabBarInactiveTintColor: colores.tintaTenue,
        tabBarStyle: { backgroundColor: colores.crema, borderTopColor: colores.arena },
        sceneStyle: { backgroundColor: colores.crema },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tratamientos' }} />
      <Tabs.Screen name="reservar" options={{ title: 'Reservar' }} />
      <Tabs.Screen name="cuenta" options={{ title: 'Mi cuenta' }} />
    </Tabs>
  )
}
