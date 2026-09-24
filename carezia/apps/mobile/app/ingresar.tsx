import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/supabase'
import { Aviso, Boton } from '@/ui'
import { colores, espacio, radio } from '@/theme'

/**
 * Ingreso con código de 6 dígitos.
 *
 * En móvil se usa el código en vez del enlace mágico: el enlace obliga a
 * salir al navegador y volver por deep link, y el código funciona igual
 * aunque abran el correo en otro dispositivo.
 */
export default function PantallaIngresar() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pedirCodigo() {
    setCargando(true)
    setError(null)

    const { error: fallo } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setCargando(false)
    if (fallo) {
      setError('No pudimos enviar el código. Revisa el correo.')
      return
    }
    setEtapa('codigo')
  }

  async function verificar() {
    setCargando(true)
    setError(null)

    const { error: fallo } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo.trim(),
      type: 'email',
    })

    setCargando(false)
    if (fallo) {
      setError('El código no es válido o ya venció.')
      return
    }
    router.back()
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      {error && <Aviso texto={error} />}

      {etapa === 'email' ? (
        <>
          <Text style={estilos.titulo}>Ingresa a tu cuenta</Text>
          <Text style={estilos.detalle}>
            Te enviamos un código de 6 dígitos al correo. Sin contraseñas.
          </Text>
          <TextInput
            placeholder="tucorreo@ejemplo.cl"
            placeholderTextColor={colores.tintaTenue}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={estilos.campo}
            accessibilityLabel="Correo"
          />
          <View style={{ marginTop: espacio.md }}>
            <Boton
              titulo="Enviarme el código"
              onPress={pedirCodigo}
              cargando={cargando}
              deshabilitado={!email.includes('@')}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={estilos.titulo}>Revisa tu correo</Text>
          <Text style={estilos.detalle}>Escribe el código que enviamos a {email}.</Text>
          <TextInput
            placeholder="000000"
            placeholderTextColor={colores.tintaTenue}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            style={[estilos.campo, estilos.campoCodigo]}
            accessibilityLabel="Código de verificación"
          />
          <View style={{ marginTop: espacio.md }}>
            <Boton
              titulo="Entrar"
              onPress={verificar}
              cargando={cargando}
              deshabilitado={codigo.length < 6}
            />
          </View>
          <View style={{ marginTop: espacio.sm }}>
            <Boton titulo="Usar otro correo" variante="secundario" onPress={() => setEtapa('email')} />
          </View>
        </>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.lg },
  titulo: { fontSize: 24, fontWeight: '600', color: colores.tinta },
  detalle: { marginTop: espacio.sm, fontSize: 15, color: colores.tintaSuave, lineHeight: 22 },
  campo: {
    marginTop: espacio.lg,
    borderWidth: 1,
    borderColor: colores.arenaOscura,
    backgroundColor: colores.blanco,
    borderRadius: radio.suave,
    paddingHorizontal: espacio.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colores.tinta,
  },
  campoCodigo: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
})
