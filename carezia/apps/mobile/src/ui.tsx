import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colores, espacio, radio } from './theme'

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  cargando,
  deshabilitado,
}: {
  titulo: string
  onPress: () => void
  variante?: 'primario' | 'secundario'
  cargando?: boolean
  deshabilitado?: boolean
}) {
  const inactivo = deshabilitado || cargando
  const esPrimario = variante === 'primario'

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.boton,
        esPrimario ? estilos.botonPrimario : estilos.botonSecundario,
        pressed && !inactivo && { opacity: 0.85 },
        inactivo && { opacity: 0.5 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={esPrimario ? colores.blanco : colores.tinta} />
      ) : (
        <Text style={esPrimario ? estilos.textoPrimario : estilos.textoSecundario}>{titulo}</Text>
      )}
    </Pressable>
  )
}

export function Tarjeta({
  children,
  onPress,
  activa,
}: {
  children: React.ReactNode
  onPress?: () => void
  activa?: boolean
}) {
  const contenido = (
    <View style={[estilos.tarjeta, activa && estilos.tarjetaActiva]}>{children}</View>
  )

  if (!onPress) return contenido
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {contenido}
    </Pressable>
  )
}

export function Etiqueta({ texto }: { texto: string }) {
  return (
    <View style={estilos.etiqueta}>
      <Text style={estilos.etiquetaTexto}>{texto}</Text>
    </View>
  )
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: 'error' | 'ok' }) {
  return (
    <View
      style={[
        estilos.aviso,
        { backgroundColor: tono === 'ok' ? colores.salviaClara : '#F6E3DD' },
      ]}
    >
      <Text style={{ color: tono === 'ok' ? colores.salvia : colores.cobreOscuro, fontSize: 14 }}>
        {texto}
      </Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  boton: {
    borderRadius: radio.pastilla,
    paddingVertical: 14,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  botonPrimario: { backgroundColor: colores.cobre },
  botonSecundario: { borderWidth: 1, borderColor: colores.arenaOscura },
  textoPrimario: { color: colores.blanco, fontSize: 15, fontWeight: '600' },
  textoSecundario: { color: colores.tinta, fontSize: 15, fontWeight: '600' },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: colores.arena,
    padding: espacio.md,
  },
  tarjetaActiva: { borderColor: colores.cobre },
  etiqueta: {
    alignSelf: 'flex-start',
    backgroundColor: colores.salviaClara,
    borderRadius: radio.pastilla,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  etiquetaTexto: { color: colores.salvia, fontSize: 12, fontWeight: '600' },
  aviso: {
    borderRadius: radio.suave,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
})
