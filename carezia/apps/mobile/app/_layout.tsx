import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProveedorSesion } from '@/session'
import { colores } from '@/theme'

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colores.crema },
            headerTintColor: colores.tinta,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colores.crema },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ingresar" options={{ title: 'Ingresar', presentation: 'modal' }} />
        </Stack>
      </ProveedorSesion>
    </SafeAreaProvider>
  )
}
