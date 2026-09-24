import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  APPOINTMENT_STATUS_LABEL,
  formatLocalTime,
  formatMoney,
  type AppointmentStatus,
} from '@carezia/core'
import { cancelarReserva } from '@/api'
import { useSesion } from '@/session'
import { supabase } from '@/supabase'
import { Aviso, Boton, Etiqueta, Tarjeta } from '@/ui'
import { colores, espacio } from '@/theme'

interface Cita {
  id: string
  starts_at: string
  status: AppointmentStatus
  price_amount: number
  purchase_id: string | null
  servicio: string
}

interface Paquete {
  id: string
  package_name: string
  sessions_total: number
  sessions_used: number
  expires_at: string | null
}

export default function PantallaCuenta() {
  const router = useRouter()
  const { sesion, cargando: cargandoSesion, salir } = useSesion()

  const [citas, setCitas] = useState<Cita[]>([])
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [moneda, setMoneda] = useState('CLP')
  const [zona, setZona] = useState('America/Santiago')
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!sesion?.user) return
    setRefrescando(true)
    setError(null)

    try {
      const [citaRes, paqueteRes, ajusteRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, starts_at, status, price_amount, purchase_id, services(name)')
          .eq('client_id', sesion.user.id)
          .gte('starts_at', new Date().toISOString())
          .neq('status', 'cancelled')
          .order('starts_at'),
        supabase
          .from('package_purchases')
          .select('id, package_name, sessions_total, sessions_used, expires_at')
          .eq('client_id', sesion.user.id)
          .eq('status', 'active'),
        supabase.from('settings').select('value').eq('key', 'business').maybeSingle(),
      ])

      setCitas(
        (citaRes.data ?? []).map((c) => {
          const servicio = Array.isArray(c.services) ? c.services[0] : c.services
          return {
            id: c.id,
            starts_at: c.starts_at,
            status: c.status,
            price_amount: c.price_amount,
            purchase_id: c.purchase_id,
            servicio: servicio?.name ?? 'Sesión',
          }
        }),
      )
      setPaquetes(paqueteRes.data ?? [])

      const negocio = ajusteRes.data?.value as { currency?: string; timezone?: string } | undefined
      setMoneda(negocio?.currency ?? 'CLP')
      setZona(negocio?.timezone ?? 'America/Santiago')
    } catch {
      setError('No pudimos cargar tus datos.')
    } finally {
      setRefrescando(false)
    }
  }, [sesion])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function cancelar(id: string) {
    try {
      await cancelarReserva(id)
      await cargar()
    } catch {
      setError('No se pudo cancelar la reserva.')
    }
  }

  if (cargandoSesion) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.detalle}>Cargando…</Text>
      </View>
    )
  }

  if (!sesion) {
    return (
      <View style={[estilos.centro, { padding: espacio.lg }]}>
        <Text style={estilos.titulo}>Tu cuenta</Text>
        <Text style={[estilos.detalle, { textAlign: 'center', marginVertical: espacio.md }]}>
          Ingresa para ver tus reservas y los paquetes que has comprado.
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Boton titulo="Ingresar" onPress={() => router.push('/ingresar')} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={cargar} />}
    >
      {error && <Aviso texto={error} />}

      <Text style={estilos.titulo}>Hola</Text>
      <Text style={estilos.detalle}>{sesion.user.email}</Text>

      <Text style={estilos.seccion}>MIS PAQUETES</Text>
      {paquetes.length === 0 ? (
        <Text style={estilos.detalle}>Todavía no tienes paquetes.</Text>
      ) : (
        paquetes.map((paquete) => {
          const restantes = paquete.sessions_total - paquete.sessions_used
          return (
            <View key={paquete.id} style={{ marginTop: espacio.sm }}>
              <Tarjeta>
                <Text style={estilos.nombre}>{paquete.package_name}</Text>
                <Text style={estilos.grande}>
                  {restantes}
                  <Text style={estilos.detalle}> / {paquete.sessions_total} sesiones</Text>
                </Text>
                {paquete.expires_at && (
                  <Text style={estilos.detalle}>
                    Vence el {new Date(paquete.expires_at).toLocaleDateString('es-CL')}
                  </Text>
                )}
              </Tarjeta>
            </View>
          )
        })
      )}

      <Text style={estilos.seccion}>PRÓXIMAS RESERVAS</Text>
      {citas.length === 0 ? (
        <Text style={estilos.detalle}>No tienes horas agendadas.</Text>
      ) : (
        citas.map((cita) => (
          <View key={cita.id} style={{ marginTop: espacio.sm }}>
            <Tarjeta>
              <Etiqueta texto={APPOINTMENT_STATUS_LABEL[cita.status]} />
              <Text style={estilos.nombre}>{cita.servicio}</Text>
              <Text style={estilos.detalle}>
                {new Date(cita.starts_at).toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  timeZone: zona,
                })}{' '}
                · {formatLocalTime(new Date(cita.starts_at), zona)} h
              </Text>
              <Text style={estilos.detalle}>
                {cita.purchase_id ? 'Con tu paquete' : formatMoney(cita.price_amount, moneda)}
              </Text>
              <View style={{ marginTop: espacio.md }}>
                <Boton
                  titulo="Cancelar reserva"
                  variante="secundario"
                  onPress={() => cancelar(cita.id)}
                />
              </View>
            </Tarjeta>
          </View>
        ))
      )}

      <View style={{ marginTop: espacio.xl }}>
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} />
      </View>
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.md, paddingBottom: espacio.xl * 2 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 28, fontWeight: '600', color: colores.tinta },
  seccion: {
    marginTop: espacio.xl,
    marginBottom: espacio.xs,
    fontSize: 12,
    letterSpacing: 1,
    color: colores.tintaTenue,
  },
  nombre: { marginTop: espacio.sm, fontSize: 16, fontWeight: '600', color: colores.tinta },
  detalle: { marginTop: 2, fontSize: 14, color: colores.tintaSuave, lineHeight: 20 },
  grande: { marginTop: espacio.sm, fontSize: 24, fontWeight: '600', color: colores.tinta },
})
