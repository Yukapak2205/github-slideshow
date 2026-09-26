import { useCallback, useEffect, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  addDaysISO,
  formatLocalTime,
  formatMoney,
  toLocalDateISO,
} from '@carezia/core'
import { ErrorApi, crearReserva, obtenerDisponibilidad, type DiaDisponible } from '@/api'
import { useSesion } from '@/session'
import { supabase } from '@/supabase'
import { Aviso, Boton, Etiqueta, Tarjeta } from '@/ui'
import { colores, espacio, radio } from '@/theme'

interface Servicio {
  id: string
  name: string
  price_amount: number
  duration_min: number
}

interface Credito {
  id: string
  package_name: string
  restantes: number
  serviceIds: string[]
}

const NOMBRE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export default function PantallaReservar() {
  const router = useRouter()
  const { sesion } = useSesion()
  const params = useLocalSearchParams<{ servicio?: string }>()

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [creditos, setCreditos] = useState<Credito[]>([])
  const [moneda, setMoneda] = useState('CLP')
  const [zona, setZona] = useState('America/Santiago')

  const [servicioId, setServicioId] = useState<string | null>(params.servicio ?? null)
  const [dias, setDias] = useState<DiaDisponible[]>([])
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [inicio, setInicio] = useState<string | null>(null)
  const [creditoId, setCreditoId] = useState<string | null>(null)
  const [semana, setSemana] = useState(() => toLocalDateISO(new Date(), 'America/Santiago'))

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  const [buscandoHoras, setBuscandoHoras] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const servicio = servicios.find((s) => s.id === servicioId) ?? null
  const credito = creditos.find((c) => c.id === creditoId) ?? null
  const creditosAplicables = servicioId
    ? creditos.filter((c) => c.serviceIds.includes(servicioId))
    : []

  // ---------- catálogo y créditos ----------
  useEffect(() => {
    async function cargar() {
      const [servicioRes, ajusteRes] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, price_amount, duration_min')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('settings').select('value').eq('key', 'business').maybeSingle(),
      ])

      setServicios(servicioRes.data ?? [])
      const negocio = ajusteRes.data?.value as { currency?: string; timezone?: string } | undefined
      setMoneda(negocio?.currency ?? 'CLP')
      setZona(negocio?.timezone ?? 'America/Santiago')

      if (!sesion?.user) {
        setCreditos([])
        return
      }

      setEmail(sesion.user.email ?? '')
      const { data: compras } = await supabase
        .from('package_purchases')
        .select('id, package_name, sessions_total, sessions_used, expires_at, packages(package_services(service_id))')
        .eq('client_id', sesion.user.id)
        .eq('status', 'active')

      setCreditos(
        (compras ?? [])
          .filter((c) => c.sessions_used < c.sessions_total)
          .filter((c) => !c.expires_at || new Date(c.expires_at) > new Date())
          .map((c) => {
            const paquete = Array.isArray(c.packages) ? c.packages[0] : c.packages
            const vinculos = paquete?.package_services ?? []
            return {
              id: c.id,
              package_name: c.package_name,
              restantes: c.sessions_total - c.sessions_used,
              serviceIds: vinculos.map((v: { service_id: string }) => v.service_id),
            }
          }),
      )
    }

    void cargar()
  }, [sesion])

  // ---------- disponibilidad ----------
  useEffect(() => {
    if (!servicioId) return
    let vigente = true

    async function cargarHoras() {
      setBuscandoHoras(true)
      setError(null)
      try {
        const datos = await obtenerDisponibilidad({ servicioId: servicioId!, desde: semana })
        if (!vigente) return
        setDias(datos.days)
        const primero = datos.days.find((d) => d.slots.length > 0)
        setDiaActivo(primero?.date ?? datos.days[0]?.date ?? null)
      } catch {
        if (vigente) setError('No pudimos cargar las horas disponibles.')
      } finally {
        if (vigente) setBuscandoHoras(false)
      }
    }

    void cargarHoras()
    return () => {
      vigente = false
    }
  }, [servicioId, semana])

  const elegirServicio = useCallback((id: string) => {
    setServicioId(id)
    setInicio(null)
    setCreditoId(null)
  }, [])

  async function confirmar() {
    if (!servicio || !inicio) return
    setEnviando(true)
    setError(null)

    try {
      const respuesta = await crearReserva({
        serviceId: servicio.id,
        startsAt: inicio,
        purchaseId: creditoId ?? undefined,
        guestName: nombre || undefined,
        guestEmail: email || undefined,
        guestPhone: telefono || undefined,
      })

      if (respuesta.checkoutUrl) {
        // El pago se abre en el navegador del sistema: nunca dentro de la app.
        await Linking.openURL(respuesta.checkoutUrl)
        return
      }

      setExito('¡Listo! Tu hora quedó agendada. Te llega la confirmación al correo.')
      setInicio(null)
      setSemana(toLocalDateISO(new Date(), zona))
    } catch (causa) {
      if (causa instanceof ErrorApi && causa.code === 'AUTH_REQUIRED') {
        router.push('/ingresar')
        return
      }
      if (causa instanceof ErrorApi && causa.code === 'SLOT_TAKEN') {
        setInicio(null)
        setError('Esa hora acaba de ser tomada. Elige otra.')
        return
      }
      setError(causa instanceof Error ? causa.message : 'No se pudo confirmar la reserva.')
    } finally {
      setEnviando(false)
    }
  }

  const horas = dias.find((d) => d.date === diaActivo)?.slots ?? []
  const hoy = toLocalDateISO(new Date(), zona)

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      {error && <Aviso texto={error} />}
      {exito && <Aviso texto={exito} tono="ok" />}

      {/* ---------- 1. servicio ---------- */}
      <Text style={estilos.paso}>1 · Tratamiento</Text>
      {servicios.map((item) => (
        <View key={item.id} style={{ marginTop: espacio.sm }}>
          <Tarjeta onPress={() => elegirServicio(item.id)} activa={servicioId === item.id}>
            <Text style={estilos.nombre}>{item.name}</Text>
            <Text style={estilos.detalle}>
              {item.duration_min} min · {formatMoney(item.price_amount, moneda)}
            </Text>
          </Tarjeta>
        </View>
      ))}

      {/* ---------- 2. día y hora ---------- */}
      {servicio && (
        <>
          <Text style={[estilos.paso, { marginTop: espacio.xl }]}>2 · Día y hora</Text>

          <View style={estilos.navegacionSemana}>
            <Pressable
              onPress={() => {
                const anterior = addDaysISO(semana, -7)
                setSemana(anterior < hoy ? hoy : anterior)
              }}
              disabled={semana <= hoy}
              accessibilityRole="button"
            >
              <Text style={[estilos.enlace, semana <= hoy && { opacity: 0.4 }]}>← Semana anterior</Text>
            </Pressable>
            <Pressable onPress={() => setSemana(addDaysISO(semana, 7))} accessibilityRole="button">
              <Text style={estilos.enlace}>Semana siguiente →</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: espacio.sm }}>
            {dias.map((dia) => {
              const fecha = new Date(`${dia.date}T12:00:00Z`)
              const disponible = dia.slots.length > 0
              const activo = dia.date === diaActivo

              return (
                <Pressable
                  key={dia.date}
                  onPress={() => setDiaActivo(dia.date)}
                  disabled={!disponible}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo, disabled: !disponible }}
                  style={[
                    estilos.dia,
                    activo && estilos.diaActivo,
                    !disponible && estilos.diaInactivo,
                  ]}
                >
                  <Text style={[estilos.diaNombre, activo && { color: colores.blanco }]}>
                    {NOMBRE_DIA[fecha.getUTCDay()]}
                  </Text>
                  <Text style={[estilos.diaNumero, activo && { color: colores.blanco }]}>
                    {fecha.getUTCDate()}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={estilos.horas}>
            {buscandoHoras && <Text style={estilos.detalle}>Buscando horas…</Text>}
            {!buscandoHoras && horas.length === 0 && (
              <Text style={estilos.detalle}>
                No quedan horas este día. Prueba otro o la semana siguiente.
              </Text>
            )}
            {!buscandoHoras &&
              horas.map((hora) => {
                const elegida = inicio === hora.start
                return (
                  <Pressable
                    key={hora.start}
                    onPress={() => setInicio(hora.start)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: elegida }}
                    style={[estilos.hora, elegida && estilos.horaElegida]}
                  >
                    <Text style={[estilos.horaTexto, elegida && { color: colores.blanco }]}>
                      {formatLocalTime(new Date(hora.start), zona)}
                    </Text>
                  </Pressable>
                )
              })}
          </View>
        </>
      )}

      {/* ---------- 3. datos ---------- */}
      {servicio && inicio && (
        <>
          <Text style={[estilos.paso, { marginTop: espacio.xl }]}>3 · Tus datos</Text>

          {creditosAplicables.length > 0 && (
            <View style={{ marginTop: espacio.sm }}>
              <Tarjeta>
                <Text style={estilos.nombre}>Cómo quieres pagar</Text>
                <Pressable onPress={() => setCreditoId(null)} style={estilos.opcion}>
                  <View style={[estilos.radio, creditoId === null && estilos.radioActivo]} />
                  <Text style={estilos.detalle}>
                    Pagar esta sesión · {formatMoney(servicio.price_amount, moneda)}
                  </Text>
                </Pressable>
                {creditosAplicables.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setCreditoId(item.id)}
                    style={estilos.opcion}
                  >
                    <View style={[estilos.radio, creditoId === item.id && estilos.radioActivo]} />
                    <Text style={estilos.detalle}>
                      {item.package_name} · te quedan {item.restantes}
                    </Text>
                  </Pressable>
                ))}
              </Tarjeta>
            </View>
          )}

          <View style={{ marginTop: espacio.md, gap: espacio.sm }}>
            <TextInput
              placeholder="Nombre y apellido"
              placeholderTextColor={colores.tintaTenue}
              value={nombre}
              onChangeText={setNombre}
              style={estilos.campo}
              accessibilityLabel="Nombre y apellido"
            />
            <TextInput
              placeholder="Correo"
              placeholderTextColor={colores.tintaTenue}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={estilos.campo}
              accessibilityLabel="Correo"
            />
            <TextInput
              placeholder="Teléfono"
              placeholderTextColor={colores.tintaTenue}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              style={estilos.campo}
              accessibilityLabel="Teléfono"
            />
          </View>

          <View style={{ marginTop: espacio.md }}>
            <Etiqueta
              texto={
                credito
                  ? 'Se descuenta de tu paquete'
                  : `Total ${formatMoney(servicio.price_amount, moneda)}`
              }
            />
          </View>

          <View style={{ marginTop: espacio.md }}>
            <Boton
              titulo="Confirmar reserva"
              onPress={confirmar}
              cargando={enviando}
              deshabilitado={!nombre || !email}
            />
          </View>

          {!sesion && (
            <Pressable onPress={() => router.push('/ingresar')} style={{ marginTop: espacio.md }}>
              <Text style={[estilos.enlace, { textAlign: 'center' }]}>
                ¿Tienes cuenta? Ingresa para usar tus paquetes
              </Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.md, paddingBottom: espacio.xl * 2 },
  paso: { fontSize: 13, letterSpacing: 1, color: colores.tintaTenue, textTransform: 'uppercase' },
  nombre: { fontSize: 16, fontWeight: '600', color: colores.tinta },
  detalle: { marginTop: 2, fontSize: 14, color: colores.tintaSuave },
  enlace: { fontSize: 14, color: colores.cobre, fontWeight: '500' },
  navegacionSemana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacio.md,
  },
  dia: {
    width: 56,
    paddingVertical: espacio.sm,
    marginRight: espacio.sm,
    borderRadius: radio.suave,
    borderWidth: 1,
    borderColor: colores.arenaOscura,
    alignItems: 'center',
  },
  diaActivo: { backgroundColor: colores.cobre, borderColor: colores.cobre },
  diaInactivo: { borderColor: 'transparent', backgroundColor: colores.arena, opacity: 0.6 },
  diaNombre: { fontSize: 11, color: colores.tintaSuave, textTransform: 'uppercase' },
  diaNumero: { fontSize: 17, fontWeight: '600', color: colores.tinta },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.md },
  hora: {
    paddingVertical: 10,
    paddingHorizontal: espacio.md,
    borderRadius: radio.suave,
    borderWidth: 1,
    borderColor: colores.arenaOscura,
  },
  horaElegida: { backgroundColor: colores.cobre, borderColor: colores.cobre },
  horaTexto: { fontSize: 15, color: colores.tinta },
  campo: {
    borderWidth: 1,
    borderColor: colores.arenaOscura,
    backgroundColor: colores.blanco,
    borderRadius: radio.suave,
    paddingHorizontal: espacio.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colores.tinta,
  },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.sm },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colores.arenaOscura,
  },
  radioActivo: { borderColor: colores.cobre, backgroundColor: colores.cobre },
})
