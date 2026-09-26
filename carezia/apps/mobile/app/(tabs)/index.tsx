import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { formatMoney } from '@carezia/core'
import { supabase } from '@/supabase'
import { Aviso, Boton, Etiqueta, Tarjeta } from '@/ui'
import { colores, espacio } from '@/theme'

interface Servicio {
  id: string
  name: string
  description: string | null
  price_amount: number
  duration_min: number
  category_id: string | null
}

interface Categoria {
  id: string
  name: string
}

export default function PantallaServicios() {
  const router = useRouter()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [moneda, setMoneda] = useState('CLP')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const [servicioRes, categoriaRes, ajusteRes] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, description, price_amount, duration_min, category_id')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('service_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('settings').select('value').eq('key', 'business').maybeSingle(),
      ])

      if (servicioRes.error) throw servicioRes.error
      setServicios(servicioRes.data ?? [])
      setCategorias(categoriaRes.data ?? [])
      setMoneda((ajusteRes.data?.value as { currency?: string })?.currency ?? 'CLP')
    } catch {
      setError('No pudimos cargar los tratamientos. Revisa tu conexión.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
    >
      {error && <Aviso texto={error} />}

      <Text style={estilos.titulo}>Nuestros tratamientos</Text>
      <Text style={estilos.bajada}>
        Precios y duraciones reales. Reserva en un par de toques.
      </Text>

      {categorias.map((categoria) => {
        const items = servicios.filter((s) => s.category_id === categoria.id)
        if (items.length === 0) return null

        return (
          <View key={categoria.id} style={{ marginTop: espacio.xl }}>
            <Text style={estilos.categoria}>{categoria.name.toUpperCase()}</Text>

            {items.map((servicio) => (
              <View key={servicio.id} style={{ marginTop: espacio.sm }}>
                <Tarjeta>
                  <Etiqueta texto={`${servicio.duration_min} min`} />
                  <Text style={estilos.nombre}>{servicio.name}</Text>
                  {servicio.description && (
                    <Text style={estilos.descripcion}>{servicio.description}</Text>
                  )}
                  <Text style={estilos.precio}>
                    {formatMoney(servicio.price_amount, moneda)}
                  </Text>
                  <View style={{ marginTop: espacio.md }}>
                    <Boton
                      titulo="Reservar"
                      onPress={() =>
                        router.push({ pathname: '/reservar', params: { servicio: servicio.id } })
                      }
                    />
                  </View>
                </Tarjeta>
              </View>
            ))}
          </View>
        )
      })}

      {!cargando && servicios.length === 0 && !error && (
        <Text style={estilos.descripcion}>Todavía no hay tratamientos publicados.</Text>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.md, paddingBottom: espacio.xl * 2 },
  titulo: { fontSize: 28, fontWeight: '600', color: colores.tinta },
  bajada: { marginTop: espacio.sm, fontSize: 15, color: colores.tintaSuave, lineHeight: 22 },
  categoria: {
    fontSize: 12,
    letterSpacing: 1,
    color: colores.tintaTenue,
    marginBottom: espacio.xs,
  },
  nombre: { marginTop: espacio.sm, fontSize: 18, fontWeight: '600', color: colores.tinta },
  descripcion: { marginTop: espacio.xs, fontSize: 14, color: colores.tintaSuave, lineHeight: 20 },
  precio: { marginTop: espacio.sm, fontSize: 17, fontWeight: '600', color: colores.cobre },
})
